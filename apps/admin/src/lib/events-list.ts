import { prisma } from "@prequate/db";
import { luma } from "@prequate/core";

export type LocalEvent = Awaited<ReturnType<typeof prisma.event.findMany>>[number];

export type EventListFilters = {
  tier?: string;
  sort?: string;
  from?: string;
  to?: string;
};

// Shared by the Events hub (for counts) and each of the Live/Draft/Archive
// pages (for their filtered, sorted list) — one query, one filter/sort
// implementation, instead of three copies drifting apart.
export async function getEventsLists(filters: EventListFilters) {
  const tierFilter = filters.tier ?? "";
  const sort = filters.sort ?? "date-desc";
  const fromDate = filters.from ? new Date(filters.from) : null;
  const toDate = filters.to ? new Date(filters.to) : null;

  const [allEvents, rsvpCounts] = await Promise.all([
    prisma.event.findMany(),
    prisma.eventAttendance.groupBy({ by: ["eventId"], where: { joined: true }, _count: true }),
  ]);

  const rsvpCountByEventId = new Map(rsvpCounts.map((r) => [r.eventId, r._count]));

  function applyFiltersAndSort(events: LocalEvent[]): LocalEvent[] {
    let result = events;
    if (tierFilter) result = result.filter((e) => e.tier === tierFilter);
    if (fromDate) result = result.filter((e) => e.startTime >= fromDate);
    if (toDate) result = result.filter((e) => e.startTime <= toDate);
    return [...result].sort((a, b) => {
      if (sort === "date-asc") return a.startTime.getTime() - b.startTime.getTime();
      if (sort === "rsvp-desc") return (rsvpCountByEventId.get(b.id) ?? 0) - (rsvpCountByEventId.get(a.id) ?? 0);
      return b.startTime.getTime() - a.startTime.getTime();
    });
  }

  const liveEvents = applyFiltersAndSort(allEvents.filter((e) => e.publishedAt && !e.archivedAt && !e.cancelledAt));
  const draftEvents = applyFiltersAndSort(allEvents.filter((e) => !e.publishedAt && !e.archivedAt && !e.cancelledAt));
  const archivedEvents = applyFiltersAndSort(allEvents.filter((e) => e.archivedAt || e.cancelledAt));

  const now = new Date();
  const liveUpcoming = liveEvents.filter((e) => e.startTime >= now);
  const livePast = liveEvents.filter((e) => e.startTime < now);

  return { liveEvents, liveUpcoming, livePast, draftEvents, archivedEvents, rsvpCountByEventId };
}

// Raw Luma events with no local record yet — nothing to categorize into
// Live/Draft/Archive until an admin actually publishes them. Shared by the
// Events hub (for the Import card's count) and the Import page itself.
export async function getUnimportedLumaEvents() {
  const [upcoming, past, allEvents] = await Promise.all([
    luma.getUpcomingEvents(),
    luma.getPastEvents(),
    prisma.event.findMany({ select: { lumaEventId: true } }),
  ]);
  const localLumaIds = new Set(allEvents.filter((e) => e.lumaEventId).map((e) => e.lumaEventId as string));
  return [...upcoming, ...past]
    .filter((e) => !localLumaIds.has(e.lumaEventId))
    .sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
}
