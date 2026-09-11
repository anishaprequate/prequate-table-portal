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
  };
}

export type EventDetail = NonNullable<Awaited<ReturnType<typeof getEventDetail>>>;
