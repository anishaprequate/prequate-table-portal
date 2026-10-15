import { prisma } from "@prequate/db";
import { hashAccessCode, isRetiredMarker } from "@prequate/core";
import {
  ACTIVITY_DATA_SOURCE,
  MASTER_DATA_SOURCE,
  createPage,
  prop,
  queryAll,
  updatePage,
} from "./client";
import {
  newerDate,
  parseEdited,
  readActivityRow,
  readMasterRow,
  type ActivityRow,
  type MasterRow,
} from "./map";

export interface SyncReport {
  created: number;
  updated: number;
  flagged: number;
  unflagged: number;
  codesRetiredInNotion: number;
  activityWritten: number;
  errors: string[];
}

const shortDate = (d: Date) =>
  new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(d);

// Notion decides who is a member; the portal decides activity.
//
// Pull: a row whose Status is "Active Member" gets a portal account (created
// once, then kept up to date). A row that moves to "Declined" is only
// flagged for admin review, never deactivated. A member's own edits to name
// or email in the portal are never overwritten.
//
// Push: last login, hours used, events attended and last activity go to the
// separate "Portal Activity" database; "Last Touch Date" in the master is only
// moved forward, never back. A used access code is marked "USED" in Notion.
//
// Safe to run repeatedly: every step is an upsert or a comparison.
export async function runNotionSync(): Promise<SyncReport> {
  const report: SyncReport = {
    created: 0,
    updated: 0,
    flagged: 0,
    unflagged: 0,
    codesRetiredInNotion: 0,
    activityWritten: 0,
    errors: [],
  };

  const [masterPages, activityPages] = await Promise.all([
    queryAll(MASTER_DATA_SOURCE),
    queryAll(ACTIVITY_DATA_SOURCE),
  ]);
  const rows = masterPages.map(readMasterRow);
  const activityRows = activityPages.map(readActivityRow);
  const activityByMaster = new Map<string, ActivityRow>();
  for (const a of activityRows) if (a.masterPageId) activityByMaster.set(a.masterPageId, a);

  const linked = await prisma.user.findMany({ where: { notionPageId: { not: null } } });
  const userByPage = new Map(linked.map((u) => [u.notionPageId!, u]));

  for (const row of rows) {
    try {
      const existing = userByPage.get(row.pageId);
      const activity = activityByMaster.get(row.pageId);

      if (row.status === "Active Member") {
        if (!existing) {
          const created = await createAccount(row, activity, report);
          if (created) userByPage.set(row.pageId, created);
        } else {
          await updateAccount(existing, row, activity, report);
        }
      } else if (existing && row.status === "Declined" && existing.notionFlag !== "DECLINED") {
        await prisma.user.update({ where: { id: existing.id }, data: { notionFlag: "DECLINED" } });
        report.flagged++;
      }
    } catch (err) {
      report.errors.push(`${row.name || row.pageId}: ${(err as Error).message}`);
    }
  }

  // Push activity for every linked account.
  const fresh = await prisma.user.findMany({ where: { notionPageId: { not: null } } });
  const rowByPage = new Map(rows.map((r) => [r.pageId, r]));
  for (const user of fresh) {
    const row = rowByPage.get(user.notionPageId!);
    if (!row) continue;
    try {
      await pushActivity(user, row, activityByMaster.get(row.pageId), report);
    } catch (err) {
      report.errors.push(`${user.name} (activity): ${(err as Error).message}`);
    }
  }

  const summary =
    `${report.created} created, ${report.updated} updated, ${report.flagged} flagged, ` +
    `${report.activityWritten} activity rows written, ${report.errors.length} errors`;
  await prisma.appSettings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", notionLastSyncAt: new Date(), notionLastSyncSummary: summary },
    update: { notionLastSyncAt: new Date(), notionLastSyncSummary: summary },
  });

  return report;
}

async function createAccount(row: MasterRow, activity: ActivityRow | undefined, report: SyncReport) {
  const missing: string[] = [];
  if (!row.name) missing.push("name");
  if (!row.seatNumber) missing.push("seat number");
  if (!row.email && !row.phone) missing.push("email or phone");
  if (!row.accessCode) missing.push("access code");
  else if (isRetiredMarker(row.accessCode)) missing.push("a live access code (this one is marked used)");
  if (missing.length) {
    report.errors.push(`${row.name || row.pageId}: not created, missing ${missing.join(", ")}`);
    return null;
  }

  const hash = hashAccessCode(row.accessCode!);
  const clash = await prisma.user.findFirst({
    where: {
      OR: [
        { seatNumber: row.seatNumber! },
        ...(row.email ? [{ email: row.email }] : []),
        ...(row.phone ? [{ phone: row.phone }] : []),
        { accessCodeHash: hash },
      ],
    },
    select: { name: true, seatNumber: true },
  });
  if (clash) {
    report.errors.push(
      `${row.name}: not created, seat, email, phone or code already belongs to ${clash.name} (seat ${clash.seatNumber}). Link it manually if it is the same person.`,
    );
    return null;
  }

  const user = await prisma.user.create({
    data: {
      role: "MEMBER",
      name: row.name,
      email: row.email,
      phone: row.phone,
      seatNumber: row.seatNumber,
      company: row.company,
      sector: row.sector,
      archetype: row.archetype,
      city: activity?.city ?? null,
      seatingDate: activity?.seatedOn ? new Date(activity.seatedOn) : new Date(),
      lifecycleStatus: "ACTIVE",
      notionPageId: row.pageId,
      accessCodeHash: hash,
      notionSyncedAt: new Date(),
    },
  });
  report.created++;
  return user;
}

async function updateAccount(
  user: Awaited<ReturnType<typeof prisma.user.findMany>>[number],
  row: MasterRow,
  activity: ActivityRow | undefined,
  report: SyncReport,
) {
  const edited = parseEdited(user.profileEditedFields);
  const data: Record<string, unknown> = { notionSyncedAt: new Date() };

  if (!edited.has("name") && row.name && row.name !== user.name) data.name = row.name;
  if (!edited.has("email") && row.email && row.email !== user.email) data.email = row.email;
  if (row.phone && row.phone !== user.phone) data.phone = row.phone;
  if (row.seatNumber && row.seatNumber !== user.seatNumber) data.seatNumber = row.seatNumber;
  if (row.company !== null && row.company !== user.company) data.company = row.company;
  if (row.sector !== null && row.sector !== user.sector) data.sector = row.sector;
  if (row.archetype !== null && row.archetype !== user.archetype) data.archetype = row.archetype;
  if (activity?.city && activity.city !== user.city) data.city = activity.city;
  if (activity?.seatedOn) {
    const seated = new Date(activity.seatedOn);
    if (!user.seatingDate || seated.getTime() !== user.seatingDate.getTime()) data.seatingDate = seated;
  }
  if (user.notionFlag) {
    data.notionFlag = null;
    report.unflagged++;
  }

  // Access code: a new live code in Notion reissues access (this is also the
  // lost-phone reset). The same code after it was retired stays retired.
  if (row.accessCode && !isRetiredMarker(row.accessCode)) {
    const hash = hashAccessCode(row.accessCode);
    if (hash !== user.accessCodeHash) {
      data.accessCodeHash = hash;
      data.accessCodeRetiredAt = null;
    } else if (user.accessCodeRetiredAt) {
      // Retired in the portal but Notion still shows the code: mark it used.
      await updatePage(row.pageId, {
        "Access Code": prop.text(`USED ${shortDate(user.accessCodeRetiredAt)}`),
      });
      report.codesRetiredInNotion++;
    }
  }

  await prisma.user.update({ where: { id: user.id }, data });
  report.updated++;
}

async function pushActivity(
  user: Awaited<ReturnType<typeof prisma.user.findMany>>[number],
  row: MasterRow,
  activity: ActivityRow | undefined,
  report: SyncReport,
) {
  const now = new Date();
  const [hoursUsed, eventsAttended, lastHour, lastEvent] = await Promise.all([
    prisma.booking.count({
      where: { memberId: user.id, status: { in: ["CONFIRMED", "COMPLETED"] }, startTime: { lt: now } },
    }),
    prisma.eventAttendance.count({
      where: { memberId: user.id, joined: true, event: { startTime: { lt: now }, cancelledAt: null } },
    }),
    prisma.booking.findFirst({
      where: { memberId: user.id, status: { in: ["CONFIRMED", "COMPLETED"] }, startTime: { lt: now } },
      orderBy: { startTime: "desc" },
      select: { startTime: true },
    }),
    prisma.eventAttendance.findFirst({
      where: { memberId: user.id, joined: true, event: { startTime: { lt: now }, cancelledAt: null } },
      orderBy: { event: { startTime: "desc" } },
      select: { event: { select: { startTime: true } } },
    }),
  ]);

  const candidates = [user.lastActiveAt, lastHour?.startTime, lastEvent?.event.startTime].filter(
    (d): d is Date => Boolean(d),
  );
  const lastActivity = candidates.length ? new Date(Math.max(...candidates.map((d) => d.getTime()))) : null;

  const status = user.notionFlag === "DECLINED" ? "Flagged: declined" : user.accessCodeRetiredAt ? "Code used" : "Account created";
  const properties: Record<string, unknown> = {
    "Portal Status": prop.select(status),
    "Hours Used": prop.number(hoursUsed),
    "Events Attended": prop.number(eventsAttended),
    "Portal Account ID": prop.text(user.id),
    "Synced At": prop.date(now.toISOString()),
    ...(user.lastActiveAt ? { "Last Portal Login": prop.date(user.lastActiveAt.toISOString()) } : {}),
    ...(lastActivity ? { "Last Activity": prop.date(lastActivity.toISOString()) } : {}),
  };

  if (activity) {
    await updatePage(activity.pageId, properties);
  } else {
    await createPage(ACTIVITY_DATA_SOURCE, {
      Name: prop.title(user.name),
      Member: prop.relation([row.pageId]),
      ...properties,
    });
  }
  report.activityWritten++;

  // Keep "Last Touch Date" in the master current, moving it forward only.
  const forward = newerDate(row.lastTouch, lastActivity);
  if (forward) await updatePage(row.pageId, { "Last Touch Date": prop.date(forward) });
}

