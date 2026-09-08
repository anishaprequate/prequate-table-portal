import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@prequate/db";
import { luma, EVENT_TIER_LABELS, type EventTier } from "@prequate/core";
import { getCurrentAdmin, canView, canWrite } from "@/lib/session";
import { publishEvent, publishEventDraft } from "@/lib/actions/events";
import { formatSlot } from "@/lib/format";
import { PageHero } from "@/components/page-hero";

export default async function EventsPage() {
  const admin = await getCurrentAdmin();
  if (!admin || !canView(admin.role)) redirect("/bookings");

  const [upcoming, past, published] = await Promise.all([
    luma.getUpcomingEvents(),
    luma.getPastEvents(),
    prisma.event.findMany(),
  ]);

  const publishedByLumaId = new Map(
    published.filter((e) => e.lumaEventId).map((e) => [e.lumaEventId as string, e]),
  );
  const manualEvents = published
    .filter((e) => !e.lumaEventId && e.publishedAt)
    .sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
  const drafts = published
    .filter((e) => !e.lumaEventId && !e.publishedAt)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const sourceEvents = [...upcoming, ...past].sort(
    (a, b) => b.startTime.getTime() - a.startTime.getTime(),
  );

  return (
    <div className="max-w-3xl">
      <div className="flex items-start justify-between gap-6">
        <PageHero
          title="Events"
          subtitle="Pulled in from Luma, plus anything added directly here."
        />
        {canWrite(admin.role) && (
          <Link
            href="/events/new"
            className="flex-shrink-0 rounded-md bg-orange px-5 py-3 text-sm font-medium text-ink transition hover:bg-deep-orange hover:text-paper"
          >
            New event
          </Link>
        )}
      </div>

      {drafts.length > 0 && (
        <div className="mb-10">
          <h2 className="mb-2 text-xs uppercase tracking-wide text-deep-orange">Drafts ({drafts.length})</h2>
          <ul className="flex flex-col divide-y divide-grey/15">
            {drafts.map((event) => (
              <li key={event.id} className="flex items-center justify-between gap-4 py-4">
                <div>
                  <p className="font-display text-2xl italic leading-tight text-ink">{event.title}</p>
                  <p className="text-sm text-grey">
                    {formatSlot(event.startTime)}
                    {event.location && ` · ${event.location}`}
                  </p>
                </div>
                <div className="flex flex-shrink-0 gap-2">
                  {canWrite(admin.role) && (
                    <form action={publishEventDraft}>
                      <input type="hidden" name="eventId" value={event.id} />
                      <button
                        type="submit"
                        className="rounded-md bg-orange px-4 py-2 text-sm font-medium text-ink transition hover:bg-deep-orange hover:text-paper"
                      >
                        Publish
                      </button>
                    </form>
                  )}
                  <Link
                    href={`/events/${event.id}`}
                    className="rounded-md border border-grey/30 px-4 py-2 text-sm font-medium text-ink transition hover:border-grey/60"
                  >
                    {canWrite(admin.role) ? "Manage" : "View"}
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {manualEvents.length > 0 && (
        <div className="mb-10">
          <h2 className="mb-2 text-xs uppercase tracking-wide text-grey">Added here</h2>
          <ul className="flex flex-col divide-y divide-grey/15">
            {manualEvents.map((event) => (
              <li key={event.id} className="flex items-center justify-between gap-4 py-4">
                <div>
                  <p className="font-display text-2xl italic leading-tight text-ink">
                    {event.title}
                    <span className="ml-2 align-middle rounded-full bg-orange/10 px-2 py-0.5 text-xs font-sans not-italic text-deep-orange">
                      {EVENT_TIER_LABELS[event.tier as EventTier] ?? event.tier}
                    </span>
                  </p>
                  <p className="text-sm text-grey">
                    {formatSlot(event.startTime)}
                    {event.location && ` · ${event.location}`}
                  </p>
                </div>
                <Link
                  href={`/events/${event.id}`}
                  className="flex-shrink-0 rounded-md border border-grey/30 px-4 py-2 text-sm font-medium text-ink transition hover:border-grey/60"
                >
                  {canWrite(admin.role) ? "Manage" : "View"}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h2 className="mb-2 text-xs uppercase tracking-wide text-grey">From Luma</h2>
        <ul className="flex flex-col divide-y divide-grey/15">
          {sourceEvents.map((event) => {
            const publishedEvent = publishedByLumaId.get(event.lumaEventId);
            return (
              <li key={event.lumaEventId} className="flex items-center justify-between gap-4 py-4">
                <div>
                  <p className="font-display text-2xl italic leading-tight text-ink">
                    {event.title}
                    {publishedEvent && (
                      <span className="ml-2 align-middle rounded-full bg-orange/10 px-2 py-0.5 text-xs font-sans not-italic text-deep-orange">
                        {EVENT_TIER_LABELS[publishedEvent.tier as EventTier] ?? publishedEvent.tier}
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-grey">
                    {formatSlot(event.startTime)}
                    {event.location && ` · ${event.location}`}
                  </p>
                </div>
                {publishedEvent ? (
                  <Link
                    href={`/events/${publishedEvent.id}`}
                    className="flex-shrink-0 rounded-md border border-grey/30 px-4 py-2 text-sm font-medium text-ink transition hover:border-grey/60"
                  >
                    {canWrite(admin.role) ? "Manage" : "View"}
                  </Link>
                ) : (
                  canWrite(admin.role) && (
                    <form action={publishEvent}>
                      <input type="hidden" name="lumaEventId" value={event.lumaEventId} />
                      <button
                        type="submit"
                        className="flex-shrink-0 rounded-md border border-grey/30 px-4 py-2 text-sm font-medium text-ink transition hover:border-grey/60"
                      >
                        Publish
                      </button>
                    </form>
                  )
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
