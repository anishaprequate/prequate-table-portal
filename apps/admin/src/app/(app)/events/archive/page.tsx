import { redirect } from "next/navigation";
import { getCurrentAdmin, canView, canWrite } from "@/lib/session";
import { getEventsLists } from "@/lib/events-list";
import { PageHero } from "@/components/page-hero";
import { EventsSectionNav } from "@/components/events/events-section-nav";
import { EventsFilterBar } from "@/components/events-filter-bar";
import { EventRow } from "@/components/events/event-row";

export default async function ArchiveEventsPage({
  searchParams,
}: {
  searchParams: { tier?: string; sort?: string; from?: string; to?: string };
}) {
  const admin = await getCurrentAdmin();
  if (!admin || !canView(admin.role)) redirect("/bookings");
  const writable = canWrite(admin.role);

  const { archivedEvents } = await getEventsLists(searchParams);

  return (
    <div className="max-w-3xl">
      <PageHero title="Archive" subtitle="Deleted and cancelled events — history is kept, not removed." />
      <EventsSectionNav active="/events/archive" />
      <EventsFilterBar
        tier={searchParams.tier ?? ""}
        from={searchParams.from ?? ""}
        to={searchParams.to ?? ""}
        sort={searchParams.sort ?? "date-desc"}
      />

      {archivedEvents.length === 0 ? (
        <p className="mb-10 text-sm text-grey">Nothing archived matches these filters.</p>
      ) : (
        <ul className="mb-10 flex flex-col divide-y divide-grey/15">
          {archivedEvents.map((event) => (
            <EventRow
              key={event.id}
              event={event}
              rsvpCount={0}
              showRsvpCount={false}
              showArchiveLabel
              showPublish={false}
              canWrite={writable}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
