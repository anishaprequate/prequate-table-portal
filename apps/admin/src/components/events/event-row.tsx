import Link from "next/link";
import { EVENT_TIER_LABELS, type EventTier } from "@prequate/core";
import { formatSlot } from "@/lib/format";
import { publishEventDraft } from "@/lib/actions/events";
import type { LocalEvent } from "@/lib/events-list";

export function EventRow({
  event,
  rsvpCount,
  showRsvpCount,
  showArchiveLabel,
  showPublish,
  canWrite,
}: {
  event: LocalEvent;
  rsvpCount: number;
  showRsvpCount: boolean;
  showArchiveLabel: boolean;
  showPublish: boolean;
  canWrite: boolean;
}) {
  return (
    <li className="flex items-center justify-between gap-4 py-4">
      <div>
        <p className="font-display text-2xl italic leading-tight text-ink">
          {event.title}
          <span className="ml-2 align-middle rounded-full bg-orange/10 px-2 py-0.5 text-xs font-sans not-italic text-deep-orange">
            {EVENT_TIER_LABELS[event.tier as EventTier] ?? event.tier}
          </span>
          {event.lumaEventId && (
            <span className="ml-2 align-middle text-xs font-sans not-italic text-grey">via Luma</span>
          )}
          {showArchiveLabel && (
            <span className="ml-2 align-middle rounded-full bg-grey/10 px-2 py-0.5 text-xs font-sans not-italic text-grey">
              {event.cancelledAt ? "Cancelled" : "Archived"}
            </span>
          )}
        </p>
        <p className="text-sm text-grey">
          {formatSlot(event.startTime)}
          {event.location && ` · ${event.location}`}
          {showRsvpCount && ` · ${rsvpCount} RSVP'd`}
        </p>
      </div>
      <div className="flex flex-shrink-0 gap-2">
        {showPublish && canWrite && (
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
          {canWrite ? "Manage" : "View"}
        </Link>
      </div>
    </li>
  );
}
