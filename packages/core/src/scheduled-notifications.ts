// The time-driven notifications. One function runs them all, and each step is
// safe to run again and again: a marker on the row says it has gone out. A
// scheduler calls it every few minutes (see /api/cron/notifications in admin).
import { prisma } from "@prequate/db";
import { notifyMember, notifyTeam, sendHeldPushes, isQuietTime, appUrl } from "./notify";
import { sendEmail } from "./integrations/mailer";

const HOUR = 3_600_000;
const dayTime = (d: Date) =>
  new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(d);
const clock = (d: Date) => new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" }).format(d);
const pad = (n: number) => String(n).padStart(2, "0");

export interface RunResult {
  heldPushes: number;
  hourSoon: number;
  eventTomorrow: number;
  eventToday: number;
  hourOpenEmails: number;
  digests: number;
  placeNudges: number;
}

// 1. Pushes held through quiet hours go out at 8 am.
// 2. Your Hour starts in an hour.
async function hourSoon(now: Date): Promise<number> {
  const bookings = await prisma.booking.findMany({
    where: {
      status: "CONFIRMED",
      hourSoonPushedAt: null,
      startTime: { gte: new Date(now.getTime() + 50 * 60_000), lte: new Date(now.getTime() + 70 * 60_000) },
    },
    include: { partner: { select: { name: true } } },
  });
  for (const b of bookings) {
    await prisma.booking.update({ where: { id: b.id }, data: { hourSoonPushedAt: now } });
    const first = b.partner.name.split(" ")[0];
    const where = b.mode === "ONLINE" ? "Online, the Meet link is on your Hour." : b.location ? `At ${b.location}.` : "";
    await notifyMember({
      memberId: b.memberId,
      type: "hour_soon",
      message: `Your Hour with ${first} starts at ${clock(b.startTime)}. ${where}`.trim(),
      entityType: "booking",
      entityId: b.id,
    });
  }
  return bookings.length;
}

// 3. An event is tomorrow: 24 hours before, to members who are going.
async function eventTomorrow(now: Date): Promise<number> {
  const rows = await prisma.eventAttendance.findMany({
    where: {
      joined: true,
      dayBeforeSentAt: null,
      event: {
        publishedAt: { not: null },
        cancelledAt: null,
        startTime: { gte: new Date(now.getTime() + 23 * HOUR), lte: new Date(now.getTime() + 25 * HOUR) },
      },
    },
    include: { event: true },
  });
  for (const a of rows) {
    await prisma.eventAttendance.update({ where: { id: a.id }, data: { dayBeforeSentAt: now } });
    const e = a.event;
    await notifyMember({
      memberId: a.memberId,
      type: "event_tomorrow",
      message: `${e.title} is tomorrow, ${clock(e.startTime)}${e.location ? `, ${e.location}` : ""}.`,
      entityType: "event",
      entityId: e.id,
      email: {
        subject: `${e.title} is tomorrow`,
        text: `A reminder that ${e.title} is tomorrow.\n\n${dayTime(e.startTime)}${e.location ? `\n${e.location}` : ""}${
          e.arrivalNote ? `\n\n${e.arrivalNote}` : ""
        }\n\n${appUrl()}/events/${e.id}`,
      },
    });
  }
  return rows.length;
}

// 4. The morning of an event, with place and time. Sent from 8 am, only for events
// later today, and not if the day-before reminder went out in the last six hours.
async function eventToday(now: Date): Promise<number> {
  if (isQuietTime(now)) return 0;
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayEnd = new Date(dayStart.getTime() + 24 * HOUR);
  const rows = await prisma.eventAttendance.findMany({
    where: {
      joined: true,
      morningSentAt: null,
      OR: [{ dayBeforeSentAt: null }, { dayBeforeSentAt: { lt: new Date(now.getTime() - 6 * HOUR) } }],
      event: { publishedAt: { not: null }, cancelledAt: null, startTime: { gt: now, gte: dayStart, lt: dayEnd } },
    },
    include: { event: true },
  });
  for (const a of rows) {
    await prisma.eventAttendance.update({ where: { id: a.id }, data: { morningSentAt: now } });
    const e = a.event;
    await notifyMember({
      memberId: a.memberId,
      type: "event_today",
      message: `${e.title} is today, ${clock(e.startTime)}${e.location ? `, ${e.location}` : ""}.`,
      entityType: "event",
      entityId: e.id,
      email: {
        subject: `${e.title} is today`,
        text: `${e.title} is today.\n\n${clock(e.startTime)}${e.location ? `\n${e.location}` : ""}${
          e.arrivalNote ? `\n\n${e.arrivalNote}` : ""
        }\n\n${appUrl()}/events/${e.id}`,
      },
    });
  }
  return rows.length;
}

// 5. "Your Hour is still open": one email a month, from the first of the last ten
// days, to a member with no Hour or request that month. Email only.
async function hourOpenEmails(now: Date): Promise<number> {
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  if (now.getDate() < daysInMonth - 9 || now.getHours() < 10) return 0;
  const monthKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const monthName = new Intl.DateTimeFormat("en-IN", { month: "long" }).format(now);

  const members = await prisma.user.findMany({
    where: {
      role: "MEMBER",
      firstLoginAt: { not: null },
      lifecycleStatus: { in: ["ACTIVE", "AT_RISK"] },
      emailHourReminders: true,
      email: { not: null },
      OR: [{ hourOpenEmailMonth: null }, { hourOpenEmailMonth: { not: monthKey } }],
    },
    select: { id: true, name: true, email: true },
  });

  let sent = 0;
  for (const m of members) {
    const [booking, request] = await Promise.all([
      prisma.booking.findFirst({
        where: { memberId: m.id, status: { not: "CANCELLED" }, startTime: { gte: monthStart, lt: monthEnd } },
        select: { id: true },
      }),
      prisma.advisorRequest.findFirst({
        where: {
          memberId: m.id,
          OR: [
            { status: { in: ["REQUESTED", "OFFERED"] }, proposedDate: { gte: monthStart, lt: monthEnd } },
            { status: "CONFIRMED", confirmedStart: { gte: monthStart, lt: monthEnd } },
          ],
        },
        select: { id: true },
      }),
    ]);
    // Settled for the month either way, so it is looked at once.
    await prisma.user.update({ where: { id: m.id }, data: { hourOpenEmailMonth: monthKey } });
    if (booking || request || !m.email) continue;
    await sendEmail({
      to: m.email,
      subject: `Your ${monthName} Hour is still open`,
      text: `Your ${monthName} Hour is still open. Take time with a partner or an advisor while the month lasts.\n\n${appUrl()}/the-hour/book`,
    }).catch((e) => console.log(`[email] hour-open failed for ${m.id}: ${(e as Error).message}`));
    sent++;
  }
  return sent;
}

// 6. New at the Table, once a day at 10 am: new open events and insight posts
// since the last one, in one push. Closed events are not here: a member hears
// of those only by invitation.
async function digests(now: Date): Promise<number> {
  if (now.getHours() < 10) return 0;
  const today10 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0, 0);
  const members = await prisma.user.findMany({
    where: {
      role: "MEMBER",
      firstLoginAt: { not: null },
      OR: [{ lastDigestAt: null }, { lastDigestAt: { lt: today10 } }],
    },
    select: { id: true, lastDigestAt: true },
  });

  let sent = 0;
  for (const m of members) {
    // The first run only sets the starting point, so no one is sent the backlog.
    if (!m.lastDigestAt) {
      await prisma.user.update({ where: { id: m.id }, data: { lastDigestAt: now } });
      continue;
    }
    const since = m.lastDigestAt;
    const [events, posts] = await Promise.all([
      prisma.event.findMany({
        where: {
          publishedAt: { gt: since },
          cancelledAt: null,
          archivedAt: null,
          inviteOnly: false,
          startTime: { gt: now },
          // Not an event they have already been told about by invitation.
          attendances: { none: { memberId: m.id, invitationNotifiedAt: { not: null } } },
        },
        select: { id: true },
        orderBy: { publishedAt: "asc" },
      }),
      prisma.insightPost.count({ where: { status: "PUBLISHED", publishedAt: { gt: since, lte: now } } }),
    ]);
    await prisma.user.update({ where: { id: m.id }, data: { lastDigestAt: now } });
    if (events.length === 0 && posts === 0) continue;

    const parts: string[] = [];
    if (events.length) parts.push(`${events.length} new event${events.length === 1 ? "" : "s"}`);
    if (posts) parts.push(`${posts} insight post${posts === 1 ? "" : "s"}`);
    await notifyMember({
      memberId: m.id,
      type: "digest",
      message: `${parts.join(" and ")} at the Table.`,
      // One event opens that event; several open the list; only posts open Insight.
      entityType: events.length === 1 ? "event" : undefined,
      entityId: events.length === 1 ? events[0].id : undefined,
      tag: "digest",
    });
    sent++;
  }
  return sent;
}

// 7. A partner who has confirmed an in person Hour but not entered the place, with
// the Hour less than 48 hours away, is nudged once.
async function placeNudges(now: Date): Promise<number> {
  const bookings = await prisma.booking.findMany({
    where: {
      status: "CONFIRMED",
      mode: "IN_PERSON",
      location: null,
      placeNudgeSentAt: null,
      startTime: { gt: now, lte: new Date(now.getTime() + 48 * HOUR) },
    },
    include: { member: { select: { name: true } } },
  });
  for (const b of bookings) {
    await prisma.booking.update({ where: { id: b.id }, data: { placeNudgeSentAt: now } });
    await notifyTeam({
      userId: b.partnerId,
      type: "hour_place_needed",
      message: `${b.member.name}'s Hour on ${dayTime(b.startTime)} has no place yet. Confirm it so the invitation goes out.`,
      entityType: "booking",
      entityId: b.id,
      emailSubject: "An Hour still needs a place",
      emailPath: `/bookings/${b.id}`,
    });
  }
  return bookings.length;
}

export async function runScheduledNotifications(now = new Date()): Promise<RunResult> {
  return {
    heldPushes: await sendHeldPushes(),
    hourSoon: await hourSoon(now),
    eventTomorrow: await eventTomorrow(now),
    eventToday: await eventToday(now),
    hourOpenEmails: await hourOpenEmails(now),
    digests: await digests(now),
    placeNudges: await placeNudges(now),
  };
}
