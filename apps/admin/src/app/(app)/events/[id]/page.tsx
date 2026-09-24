import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { EVENT_TIER_LABELS, type EventTier } from "@prequate/core";
import { getCurrentAdmin, canView, canWrite } from "@/lib/session";
import { getEventDetail } from "@/lib/event-detail";
import { EventHeader } from "@/components/events/event-header";
import { EventDetailNav } from "@/components/events/event-detail-nav";
import { EventStatsBar } from "@/components/events/event-stats-bar";
import { BackLink } from "@/components/back-link";

export default async function EventOverviewPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { saved?: string };
}) {
  const admin = await getCurrentAdmin();
  if (!admin || !canView(admin.role)) redirect("/bookings");
  const writable = canWrite(admin.role);

  const detail = await getEventDetail(params.id);
  if (!detail) notFound();
  const { event, isPast, takenSpots, joined, totalJoined, totalWaitlist, totalPending, checkedInCount } = detail;

  return (
    <div className="max-w-md">
      {searchParams.saved && <p className="mb-6 rounded-md bg-orange/10 px-3 py-2 text-sm text-ink">Saved.</p>}

      <EventHeader detail={detail} writable={writable} />
      <EventDetailNav eventId={event.id} active="overview" showEdit={writable} />

      <EventStatsBar
        capacity={event.capacity}
        takenSpots={takenSpots}
        joinedCount={totalJoined}
        waitlistCount={totalWaitlist}
        pendingCount={totalPending}
        checkedInCount={checkedInCount}
      />

      {isPast && (
        <div className="mb-6 rounded-md border border-grey/15 p-4">
          <p className="mb-2 text-xs uppercase tracking-wide text-grey">Event recap</p>
          <p className="text-sm text-ink">
            {checkedInCount} attended of {joined.length} registered
            {joined.length > 0 && ` (${Math.round((checkedInCount / joined.length) * 100)}%)`}
          </p>
          <Link href={`/events/${event.id}/insights`} className="mt-2 inline-block text-sm text-grey underline hover:text-ink">
            See full breakdown →
          </Link>
        </div>
      )}

      {event.description && (
        <div className="mb-6 rounded-md border border-grey/15 p-4">
          <div
            className="prose-editor text-sm leading-relaxed"
            dangerouslySetInnerHTML={{ __html: event.description }}
          />
        </div>
      )}

      <div className="mb-6 rounded-md border border-grey/15 p-4">
        <p className="mb-3 text-xs uppercase tracking-wide text-grey">At a glance</p>
        <dl className="flex flex-col gap-2 text-sm">
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-grey">Tier</dt>
            <dd className="text-ink">{EVENT_TIER_LABELS[event.tier as EventTier] ?? event.tier}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-grey">Capacity</dt>
            <dd className="text-ink">
              {event.capacity != null ? `${takenSpots} of ${event.capacity}` : "Uncapped"}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-grey">Attendee list</dt>
            <dd className="text-ink">
              {event.attendeeVisibility === "VISIBLE_TO_ALL" ? "Visible to all invitees" : "Hidden from members"}
            </dd>
          </div>
          {event.inviteOnly && (
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-grey">Access</dt>
              <dd className="text-ink">Invite-only</dd>
            </div>
          )}
          {event.approvalRequired && (
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-grey">Registration</dt>
              <dd className="text-ink">Approval required</dd>
            </div>
          )}
          {event.allowPlusOne && (
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-grey">Guests</dt>
              <dd className="text-ink">Plus-ones allowed</dd>
            </div>
          )}
          {event.sponsorName && (
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-grey">Sponsor</dt>
              <dd className="text-ink">{event.sponsorName}</dd>
            </div>
          )}
        </dl>
      </div>

      {event.externalGuests && (
        <div className="mb-6 rounded-md border border-grey/15 p-4">
          <p className="mb-2 text-xs uppercase tracking-wide text-grey">Non-member guests</p>
          <p className="text-sm text-ink">
            {(JSON.parse(event.externalGuests) as { name: string; email: string }[])
              .map((g) => g.name)
              .join(", ")}
          </p>
        </div>
      )}

      {event.ticketTypes.length > 0 && (
        <div className="mb-6 rounded-md border border-grey/15 p-4">
          <p className="mb-2 text-xs uppercase tracking-wide text-grey">Ticket types</p>
          <ul className="flex flex-col gap-1 text-sm text-ink">
            {event.ticketTypes.map((t) => (
              <li key={t.id}>
                {t.name} {t.capacity != null && <span className="text-grey">· cap {t.capacity}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {isPast && event.adminNote && (
        <div className="mb-6 rounded-md border border-grey/15 p-4">
          <p className="mb-2 text-xs uppercase tracking-wide text-grey">Note for attendees</p>
          <p className="text-sm text-ink">{event.adminNote}</p>
        </div>
      )}

      <BackLink href="/events" />
    </div>
  );
}
