import { notFound, redirect } from "next/navigation";
import { getCurrentAdmin, canView, canWrite } from "@/lib/session";
import { getEventDetail, getEventInsights } from "@/lib/event-detail";
import { EventHeader } from "@/components/events/event-header";
import { EventDetailNav } from "@/components/events/event-detail-nav";
import { EventStatsBar } from "@/components/events/event-stats-bar";
import {
  RegistrationsOverTimeChart,
  TicketTypeBreakdownChart,
  StatusBreakdownChart,
} from "@/components/events/event-insights-charts";
import { BackLink } from "@/components/back-link";

export default async function EventInsightsPage({ params }: { params: { id: string } }) {
  const admin = await getCurrentAdmin();
  if (!admin || !canView(admin.role)) redirect("/bookings");
  const writable = canWrite(admin.role);

  const detail = await getEventDetail(params.id);
  if (!detail) notFound();
  const { event, takenSpots, totalJoined, totalWaitlist, totalPending, checkedInCount } = detail;
  const insights = getEventInsights(detail);

  return (
    <div className="max-w-md">
      <EventHeader detail={detail} writable={writable} />
      <EventDetailNav eventId={event.id} active="insights" showEdit={writable} />

      <EventStatsBar
        capacity={event.capacity}
        takenSpots={takenSpots}
        joinedCount={totalJoined}
        waitlistCount={totalWaitlist}
        pendingCount={totalPending}
        checkedInCount={checkedInCount}
      />

      <div className="mb-6 rounded-md border border-grey/15 p-4">
        <p className="mb-2 text-xs uppercase tracking-wide text-grey">Registrations over time</p>
        {insights.registrationsByDay.length === 0 ? (
          <p className="text-sm text-grey">No registrations yet.</p>
        ) : (
          <RegistrationsOverTimeChart data={insights.registrationsByDay} />
        )}
      </div>

      {event.ticketTypes.length > 0 && (
        <div className="mb-6 rounded-md border border-grey/15 p-4">
          <p className="mb-2 text-xs uppercase tracking-wide text-grey">Ticket types</p>
          <TicketTypeBreakdownChart data={insights.ticketTypeBreakdown} />
        </div>
      )}

      <div className="mb-6 rounded-md border border-grey/15 p-4">
        <p className="mb-2 text-xs uppercase tracking-wide text-grey">Status breakdown</p>
        <StatusBreakdownChart data={insights.statusBreakdown} />
      </div>

      <BackLink href={`/events/${event.id}`} />
    </div>
  );
}
