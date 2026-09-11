import { redirect } from "next/navigation";
import { EVENT_TIER_LABELS, type EventTier } from "@prequate/core";
import { getCurrentAdmin, canView, canWrite } from "@/lib/session";
import { getUnimportedLumaEvents } from "@/lib/events-list";
import { publishEvent } from "@/lib/actions/events";
import { formatSlot } from "@/lib/format";
import { PageHero } from "@/components/page-hero";
import { EventsSectionNav } from "@/components/events/events-section-nav";

export default async function ImportEventsPage() {
  const admin = await getCurrentAdmin();
  if (!admin || !canView(admin.role)) redirect("/bookings");

  const unimportedFromLuma = await getUnimportedLumaEvents();

  return (
    <div className="max-w-3xl">
      <PageHero title="Import from Luma" subtitle="Events pulled from Luma that don't have a local record yet." />
      <EventsSectionNav active="/events/import" />

      {unimportedFromLuma.length === 0 ? (
        <p className="text-sm text-grey">Nothing new available from Luma.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-grey/15">
          {unimportedFromLuma.map((event) => (
            <li key={event.lumaEventId} className="flex items-center justify-between gap-4 py-4">
              <div>
                <p className="font-display text-2xl italic leading-tight text-ink">{event.title}</p>
                <p className="text-sm text-grey">
                  {formatSlot(event.startTime)}
                  {event.location && ` · ${event.location}`}
                </p>
              </div>
              {canWrite(admin.role) && (
                <form action={publishEvent} className="flex flex-shrink-0 items-center gap-2">
                  <input type="hidden" name="lumaEventId" value={event.lumaEventId} />
                  <select
                    name="tier"
                    defaultValue="DINNER"
                    className="rounded-md border border-grey/30 bg-paper px-2 py-2 text-sm text-ink"
                  >
                    {(Object.keys(EVENT_TIER_LABELS) as EventTier[]).map((t) => (
                      <option key={t} value={t}>
                        {EVENT_TIER_LABELS[t]}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="rounded-md border border-grey/30 px-4 py-2 text-sm font-medium text-ink transition hover:border-grey/60"
                  >
                    Publish
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
