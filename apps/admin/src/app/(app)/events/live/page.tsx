import { redirect } from "next/navigation";
import { getCurrentAdmin, canView, canWrite } from "@/lib/session";
import { getEventsLists } from "@/lib/events-list";
import { PageHero } from "@/components/page-hero";
import { EventsSectionNav } from "@/components/events/events-section-nav";
import { EventsFilterBar } from "@/components/events-filter-bar";
import { EventRow } from "@/components/events/event-row";

export default async function LiveEventsPage({
  searchParams,
}: {
  searchParams: { tier?: string; sort?: string; from?: string; to?: string };
}) {
  const admin = await getCurrentAdmin();
  if (!admin || !canView(admin.role)) redirect("/bookings");
  const writable = canWrite(admin.role);

  const { liveUpcoming, livePast, rsvpCountByEventId } = await getEventsLists(searchParams);

  return (
    <div className="max-w-3xl">
      <PageHero title="Events" subtitle="Pulled in from Luma, plus anything added directly here." />
      <EventsSectionNav active="/events/live" />
      <EventsFilterBar
        tier={searchParams.tier ?? ""}
        from={searchParams.from ?? ""}
        to={searchParams.to ?? ""}
        sort={searchParams.sort ?? "date-desc"}
      />

      {liveUpcoming.length === 0 && livePast.length === 0 && (
        <p className="mb-10 text-sm text-grey">No live events match these filters.</p>
      )}
      {liveUpcoming.length > 0 && (
        <div className="mb-10">
          <p className="mb-2 text-xs uppercase tracking-wide text-grey">Upcoming</p>
          <ul className="flex flex-col divide-y divide-grey/15">
            {liveUpcoming.map((event) => (
              <EventRow
                key={event.id}
                event={event}
                rsvpCount={rsvpCountByEventId.get(event.id) ?? 0}
                showRsvpCount
                showArchiveLabel={false}
                showPublish={false}
                canWrite={writable}
              />
            ))}
          </ul>
        </div>
      )}
      {livePast.length > 0 && (
        <div className="mb-10">
          <p className="mb-2 text-xs uppercase tracking-wide text-grey">Past</p>
          <ul className="flex flex-col divide-y divide-grey/15">
            {livePast.map((event) => (
              <EventRow
                key={event.id}
                event={event}
                rsvpCount={rsvpCountByEventId.get(event.id) ?? 0}
                showRsvpCount
                showArchiveLabel={false}
                showPublish={false}
                canWrite={writable}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
