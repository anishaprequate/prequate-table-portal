"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@prequate/db";
import {
  logTimelineEntry,
  summarizeLifecycleChange,
  summarizeProfileChanges,
  summarizeToggleChange,
  googleCalendar,
  MEMBER_LIFECYCLE_STATUSES,
  type MemberLifecycleStatus,
} from "@prequate/core";
import { getCurrentAdmin, isFullAdmin, canWrite } from "@/lib/session";

// "chipUid" is excluded here too — it's managed by the dedicated Provision/
// Deactivate card actions below, which log their own specific audit entry.
const PROFILE_DIFF_FIELDS = [
  "name",
  "seatType",
  "seatNumber",
  "email",
  "phone",
  "bio",
  "longBio",
  "linkedinUrl",
  "sector",
  "archetype",
  "company",
  "city",
  "foundingCohort",
];

function formatSeatNumber(n: number): string {
  return String(n).padStart(3, "0");
}

async function nextSeatNumber(): Promise<number> {
  const members = await prisma.user.findMany({
    where: { seatNumber: { not: null } },
    select: { seatNumber: true },
  });
  const max = members.reduce((acc, m) => {
    const n = Number(m.seatNumber);
    return Number.isFinite(n) && n > acc ? n : acc;
  }, 0);
  return max + 1;
}

function parseLifecycleStatus(raw: FormDataEntryValue | null): MemberLifecycleStatus {
  const value = String(raw ?? "");
  return (MEMBER_LIFECYCLE_STATUSES as string[]).includes(value)
    ? (value as MemberLifecycleStatus)
    : "ACTIVE";
}

export async function createMember(formData: FormData) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/login");
  if (!isFullAdmin(admin.role) || !canWrite(admin.role)) redirect("/bookings");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirect("/members/new?error=missing-name");

  const seatType = String(formData.get("seatType") ?? "").trim() || null;
  const email = String(formData.get("email") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const bio = String(formData.get("bio") ?? "").trim() || null;
  const lifecycleStatus = parseLifecycleStatus(formData.get("lifecycleStatus"));

  const seatNumber = formatSeatNumber(await nextSeatNumber());

  try {
    await prisma.user.create({
      data: {
        role: "MEMBER",
        name,
        seatType,
        seatNumber,
        email,
        phone,
        bio,
        lifecycleStatus,
        chipUid: `CHIP-${seatNumber}`,
      },
    });
  } catch {
    redirect("/members/new?error=create-failed");
  }

  revalidatePath("/members");
  redirect("/members?added=1");
}

export async function bulkCreateMembers(formData: FormData) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/login");
  if (!isFullAdmin(admin.role) || !canWrite(admin.role)) redirect("/bookings");

  const raw = String(formData.get("bulk") ?? "");
  const lines = raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) redirect("/members/new?error=empty-bulk");

  let nextNumber = await nextSeatNumber();

  const rows = lines
    .map((line) => {
      const [namePart, emailPart] = line.split(",").map((s) => s.trim());
      if (!namePart) return null;
      const seatNumber = formatSeatNumber(nextNumber++);
      return {
        role: "MEMBER",
        name: namePart,
        email: emailPart || null,
        seatNumber,
        chipUid: `CHIP-${seatNumber}`,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  if (rows.length === 0) redirect("/members/new?error=empty-bulk");

  try {
    await prisma.user.createMany({ data: rows });
  } catch {
    redirect("/members/new?error=create-failed");
  }

  revalidatePath("/members");
  redirect(`/members?added=${rows.length}`);
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

export async function bulkImportMembersCsv(formData: FormData) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/login");
  if (!isFullAdmin(admin.role) || !canWrite(admin.role)) redirect("/bookings");

  const file = formData.get("csv");
  if (!(file instanceof File) || file.size === 0) redirect("/members/new?error=empty-csv");

  const text = await file.text();
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) redirect("/members/new?error=empty-csv");

  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
  const nameIdx = headers.indexOf("name");
  if (nameIdx === -1) redirect("/members/new?error=csv-missing-name-column");

  const emailIdx = headers.indexOf("email");
  const phoneIdx = headers.indexOf("phone");
  const seatTypeIdx = headers.findIndex((h) => h === "seat type" || h === "seattype");
  const bioIdx = headers.indexOf("bio");

  let nextNumber = await nextSeatNumber();
  let skipped = 0;

  const rows = lines
    .slice(1)
    .map((line) => {
      const cells = parseCsvLine(line);
      const name = cells[nameIdx]?.trim();
      if (!name) {
        skipped++;
        return null;
      }
      const seatNumber = formatSeatNumber(nextNumber++);
      return {
        role: "MEMBER",
        name,
        email: emailIdx !== -1 ? cells[emailIdx]?.trim() || null : null,
        phone: phoneIdx !== -1 ? cells[phoneIdx]?.trim() || null : null,
        seatType: seatTypeIdx !== -1 ? cells[seatTypeIdx]?.trim() || null : null,
        bio: bioIdx !== -1 ? cells[bioIdx]?.trim() || null : null,
        seatNumber,
        chipUid: `CHIP-${seatNumber}`,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  if (rows.length === 0) redirect("/members/new?error=empty-csv");

  // SQLite's Prisma connector doesn't support createMany's `skipDuplicates`
  // — insert one row at a time instead, counting anything that collides
  // on a unique field (email, phone, seatNumber) as skipped rather than
  // failing the whole import.
  let added = 0;
  let duplicates = 0;
  for (const row of rows) {
    try {
      await prisma.user.create({ data: row });
      added++;
    } catch {
      duplicates++;
    }
  }

  revalidatePath("/members");
  redirect(`/members?added=${added}${duplicates > 0 || skipped > 0 ? `&skipped=${duplicates + skipped}` : ""}`);
}

export async function adminUpdateMember(formData: FormData) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/login");
  if (!isFullAdmin(admin.role) || !canWrite(admin.role)) redirect("/bookings");

  const id = String(formData.get("id") ?? "");
  const before = await prisma.user.findUnique({ where: { id } });
  if (!before) redirect("/members");

  const name = String(formData.get("name") ?? "").trim();
  const seatType = String(formData.get("seatType") ?? "").trim();
  const seatNumber = String(formData.get("seatNumber") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();
  const longBio = String(formData.get("longBio") ?? "").trim();
  const linkedinUrl = String(formData.get("linkedinUrl") ?? "").trim();
  const directoryOptOut = formData.get("showInDirectory") !== "on";
  const sector = String(formData.get("sector") ?? "").trim();
  const archetype = String(formData.get("archetype") ?? "").trim();
  const company = String(formData.get("company") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const seatingDateRaw = String(formData.get("seatingDate") ?? "").trim();
  const seatingDate = seatingDateRaw ? new Date(seatingDateRaw) : null;
  const foundingCohort = formData.get("foundingCohort") === "on";
  const lifecycleStatus = parseLifecycleStatus(formData.get("lifecycleStatus"));

  const after = {
    name,
    seatType: seatType || null,
    seatNumber: seatNumber || null,
    email: email || null,
    phone: phone || null,
    bio: bio || null,
    longBio: longBio || null,
    linkedinUrl: linkedinUrl || null,
    sector: sector || null,
    archetype: archetype || null,
    company: company || null,
    city: city || null,
    foundingCohort,
  };

  await prisma.user.update({
    where: { id },
    data: { ...after, directoryOptOut, lifecycleStatus, seatingDate },
  });

  if (after.email !== before.email) {
    await googleCalendar.syncMemberEmailOnCalendarEvents({
      memberId: id,
      memberName: after.name,
      memberEmail: after.email,
    });
  }

  const statusNote = summarizeLifecycleChange(
    before.lifecycleStatus as MemberLifecycleStatus,
    lifecycleStatus,
  );
  const directoryNote = summarizeToggleChange("Directory visibility", !before.directoryOptOut, !directoryOptOut);
  const profileNote = summarizeProfileChanges(before, after, PROFILE_DIFF_FIELDS);

  const notes = [statusNote, directoryNote, profileNote].filter((n): n is string => Boolean(n));
  if (notes.length > 0) {
    await logTimelineEntry({
      memberId: id,
      authorId: admin.id,
      type: "SYSTEM",
      body: notes.join(" "),
    });
  }

  revalidatePath("/members");
  revalidatePath(`/members/${id}`);
  redirect(`/members/${id}?saved=1`);
}

export async function addMemberNote(formData: FormData) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/login");
  if (!isFullAdmin(admin.role) || !canWrite(admin.role)) redirect("/bookings");

  const memberId = String(formData.get("memberId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!body) redirect(`/members/${memberId}/timeline`);

  await logTimelineEntry({ memberId, authorId: admin.id, type: "NOTE", body });

  revalidatePath(`/members/${memberId}/timeline`);
  redirect(`/members/${memberId}/timeline`);
}

// One member has exactly one active card at a time — provisioning a new
// one automatically deactivates whatever card they had before.
export async function provisionCard(formData: FormData) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/login");
  if (!isFullAdmin(admin.role) || !canWrite(admin.role)) redirect("/bookings");

  const memberId = String(formData.get("memberId") ?? "");
  const uid = String(formData.get("uid") ?? "").trim();
  if (!uid) redirect(`/members/${memberId}/activity?error=missing-uid`);

  const member = await prisma.user.findUnique({ where: { id: memberId } });
  if (!member) redirect("/members");

  const heldByOther = await prisma.user.findFirst({ where: { chipUid: uid, id: { not: memberId } } });
  if (heldByOther) redirect(`/members/${memberId}/activity?error=uid-taken`);

  const previousUid = member.chipUid;
  await prisma.user.update({ where: { id: memberId }, data: { chipUid: uid } });

  const notes = previousUid
    ? [`Card ${previousUid} deactivated.`, `Card ${uid} provisioned.`]
    : [`Card ${uid} provisioned.`];
  await logTimelineEntry({ memberId, authorId: admin.id, type: "SYSTEM", body: notes.join(" ") });

  revalidatePath(`/members/${memberId}/activity`);
  redirect(`/members/${memberId}/activity?saved=1`);
}

export async function deactivateCard(formData: FormData) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/login");
  if (!isFullAdmin(admin.role) || !canWrite(admin.role)) redirect("/bookings");

  const memberId = String(formData.get("memberId") ?? "");
  const member = await prisma.user.findUnique({ where: { id: memberId } });
  if (!member) redirect("/members");

  await prisma.user.update({ where: { id: memberId }, data: { chipUid: null } });

  if (member.chipUid) {
    await logTimelineEntry({
      memberId,
      authorId: admin.id,
      type: "SYSTEM",
      body: `Card ${member.chipUid} deactivated.`,
    });
  }

  revalidatePath(`/members/${memberId}/activity`);
  redirect(`/members/${memberId}/activity?saved=1`);
}
