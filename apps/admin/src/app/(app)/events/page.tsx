import { redirect } from "next/navigation";
import { getCurrentAdmin, canView, canWrite } from "@/lib/session";
import { getEventsLists, getUnimportedLumaEvents } from "@/lib/events-list";
import { PageHero } from "@/components/page-hero";
import { EventsSectionNav } from "@/components/events/events-section-nav";
import { HubCard } from "@/components/hub-card";
import Link from "next/link";

export default async function EventsHubPage() {
  const admin = await getCurrentAdmin();
  if (!admin || !canView(admin.role)) redirect("/bookings");

  const [{ liveUpcoming, livePast, draftEvents, archivedEvents }, unimportedFromLuma] = await Promise.all([
    getEventsLists({}),
    getUnimportedLumaEvents(),
  ]);

  return (
    <div className="max-w-3xl">
      <div className="flex items-start justify-between gap-6">
        <PageHero title="Events" subtitle="Pulled in from Luma, plus anything added directly here." />
        {canWrite(admin.role) && (
          <Link
            href="/events/new"
            className="flex-shrink-0 rounded-md bg-orange px-5 py-3 text-sm font-medium text-ink transition hover:bg-deep-orange hover:text-paper"
          >
            New event
          </Link>
        )}
      </div>

      <EventsSectionNav active="/events" />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <HubCard
          href="/events/live"
          title="Live"
          facts={[
            { label: "Upcoming", value: liveUpcoming.length },
            { label: "Past", value: livePast.length },
          ]}
        />
        <HubCard
          href="/events/draft"
          title="Draft"
          facts={[{ label: "Drafts", value: draftEvents.length }]}
        />
        <HubCard
          href="/events/archive"
          title="Archive"
          facts={[{ label: "Archived or cancelled", value: archivedEvents.length }]}
        />
        <HubCard
          href="/events/import"
          title="Import from Luma"
          facts={[{ label: "Available to import", value: unimportedFromLuma.length }]}
        />
      </div>
    </div>
  );
}
