import { prisma } from "@prequate/db";

// Shared by every /events/[id]/* page — one fetch and one set of derived
// lists (joined/waitlist/pending/invited), instead of each page
// recomputing them from a re-fetched event.
export async function getEventDetail(id: string, q?: string) {
  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      attendances: { include: { member: true }, orderBy: { createdAt: "asc" } },
      ticketTypes: { orderBy: { sortOrder: "asc" } },
      blasts: { include: { author: true }, orderBy: { createdAt: "desc" } },
      photos: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!event) return null;

  const isPast = event.startTime < new Date();
  const isDraft = !event.publishedAt;
  const isArchived = Boolean(event.archivedAt);
  const isCancelled = Boolean(event.cancelledAt);

  const qLower = (q ?? "").trim().toLowerCase();
  const matches = (name: string) => !qLower || name.toLowerCase().includes(qLower);

  const joined = event.attendances.filter((a) => a.joined && matches(a.member.name));
  const waitlist = event.attendances.filter((a) => a.waitlisted && matches(a.member.name));
  const pending = event.attendances.filter((a) => a.pendingApproval && matches(a.member.name));
  const invitedOnly = event.attendances.filter((a) => a.invited && !a.joined && !a.waitlisted && !a.pendingApproval);
  const takenSpots = event.attendances.filter((a) => a.joined).reduce((sum, a) => sum + 1 + a.guestCount, 0);
  const ticketTypeName = (ttId: string | null) => event.ticketTypes.find((t) => t.id === ttId)?.name ?? null;

  // Unfiltered totals for the stats bar — `joined`/`waitlist`/`pending` above
  // are search-narrowed on the Guests page (via `q`), but the stats bar
  // should always show the real totals regardless of an in-page search.
  const totalJoined = event.attendances.filter((a) => a.joined).length;
  const totalWaitlist = event.attendances.filter((a) => a.waitlisted).length;
  const totalPending = event.attendances.filter((a) => a.pendingApproval).length;
  const checkedInCount = event.attendances.filter((a) => a.checkedInAt).length;

  return {
    event,
    isPast,
    isDraft,
    isArchived,
    isCancelled,
    joined,
    waitlist,
    pending,
    invitedOnly,
    takenSpots,
    ticketTypeName,
    totalJoined,
    totalWaitlist,
    totalPending,
    checkedInCount,
  };
}

export type EventDetail = NonNullable<Awaited<ReturnType<typeof getEventDetail>>>;

// Per-event insight aggregates for the Insights tab — pure derivations over
// data `getEventDetail` already fetched, no new Prisma queries. Only counts
// EventAttendance already tracks (registration timestamps, ticket type,
// join/waitlist/pending/checked-in status) — there is no pageview/traffic
// model for events, so this never shows anything beyond real attendance data.
export function getEventInsights(detail: EventDetail) {
  const { event, totalJoined, totalWaitlist, totalPending, checkedInCount } = detail;

  const dayCounts = new Map<string, number>();
  for (const a of event.attendances) {
    if (!a.joined) continue;
    const day = a.createdAt.toISOString().slice(0, 10);
    dayCounts.set(day, (dayCounts.get(day) ?? 0) + 1);
  }
  const registrationsByDay = Array.from(dayCounts.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));

  const ticketCounts = new Map<string, number>();
  for (const a of event.attendances) {
    if (!a.joined) continue;
    const name = detail.ticketTypeName(a.ticketTypeId) ?? "General";
    ticketCounts.set(name, (ticketCounts.get(name) ?? 0) + 1);
  }
  const ticketTypeBreakdown = Array.from(ticketCounts.entries()).map(([name, count]) => ({ name, count }));

  const statusBreakdown = [
    { status: "Going", count: totalJoined },
    { status: "Checked in", count: checkedInCount },
    { status: "Waitlisted", count: totalWaitlist },
    { status: "Pending", count: totalPending },
  ];

  return { registrationsByDay, ticketTypeBreakdown, statusBreakdown };
}
