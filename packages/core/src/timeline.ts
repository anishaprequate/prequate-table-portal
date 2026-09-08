import { prisma } from "@prequate/db";
import { MEMBER_LIFECYCLE_LABELS, type MemberLifecycleStatus } from "./types";

// Shared by both apps: the admin console logs profile edits and status
// changes an admin makes, the member app logs a member's own settings
// changes. Both land in the same MemberTimelineEntry feed.
export async function logTimelineEntry(params: {
  memberId: string;
  authorId: string;
  type: "NOTE" | "SYSTEM";
  body: string;
}) {
  await prisma.memberTimelineEntry.create({ data: params });
}

const PROFILE_FIELD_LABELS: Record<string, string> = {
  name: "name",
  seatType: "seat type",
  seatNumber: "seat number",
  email: "email",
  phone: "phone",
  bio: "bio",
  longBio: "detailed bio",
  linkedinUrl: "LinkedIn",
  points: "points",
  chipUid: "chip ID",
  sector: "sector",
  archetype: "archetype",
};

// Compares the given fields between two snapshots of a member record and
// returns a human-readable summary of what changed, or null if nothing did.
export function summarizeProfileChanges(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  fields: string[],
): string | null {
  const changed = fields.filter((field) => String(before[field] ?? "") !== String(after[field] ?? ""));
  if (changed.length === 0) return null;
  return `Updated ${changed.map((field) => PROFILE_FIELD_LABELS[field] ?? field).join(", ")}.`;
}

export function summarizeLifecycleChange(
  before: MemberLifecycleStatus,
  after: MemberLifecycleStatus,
): string | null {
  if (before === after) return null;
  return `Status changed from ${MEMBER_LIFECYCLE_LABELS[before]} to ${MEMBER_LIFECYCLE_LABELS[after]}.`;
}

export function summarizeToggleChange(
  label: string,
  before: boolean,
  after: boolean,
): string | null {
  if (before === after) return null;
  return `${label} turned ${after ? "on" : "off"}.`;
}

// Points edits get their own summary (rather than folding into
// summarizeProfileChanges) so the delta is always spelled out — the log
// should never require the reader to do the subtraction themselves.
export function summarizePointsChange(before: number, after: number): string | null {
  if (before === after) return null;
  const delta = after - before;
  const sign = delta > 0 ? "+" : "";
  return `Points changed from ${before} to ${after} (${sign}${delta}).`;
}
