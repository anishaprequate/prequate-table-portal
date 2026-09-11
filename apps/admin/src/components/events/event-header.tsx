import Link from "next/link";
import { EVENT_TIER_LABELS, type EventTier } from "@prequate/core";
import { formatSlot } from "@/lib/format";
import {
  cloneEvent,
  publishEventDraft,
  unpublishEvent,
  deleteEvent,
  restoreEvent,
  cancelEvent,
  uncancelEvent,
} from "@/lib/actions/events";
import { DeleteEventButton } from "@/components/delete-event-button";
import { CancelEventForm } from "@/components/cancel-event-form";
import type { EventDetail } from "@/lib/event-detail";

// The persistent parent context shown at the top of every /events/[id]/*
// page — title, status, and the actions that apply regardless of which
// sub-page (Overview/Edit/Registration/Guests/Blasts) is open.
export function EventHeader({ detail, writable }: { detail: EventDetail; writable: boolean }) {
  const { event, isDraft, isArchived, isCancelled, joined } = detail;

  return (
    <div className="mb-8">
      {event.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={event.imageUrl} alt="" className="mb-6 h-[200px] w-full rounded-md object-cover" />
      )}

      <div className="mb-1 flex items-start justify-between gap-4">
        <h1 className="font-display text-[2.5rem] italic leading-[1.05] tracking-[-0.01em] text-ink">
          {event.title}
        </h1>
        {writable && isArchived && (
          <form action={restoreEvent}>
            <input type="hidden" name="eventId" value={event.id} />
            <button
              type="submit"
              className="flex-shrink-0 rounded-md bg-orange px-4 py-2 text-sm font-medium text-ink transition hover:bg-deep-orange hover:text-paper"
            >
              Restore
            </button>
          </form>
        )}
        {writable && !isArchived && isCancelled && (
          <div className="flex flex-shrink-0 gap-2">
            <form action={uncancelEvent}>
              <input type="hidden" name="eventId" value={event.id} />
              <button
                type="submit"
                className="rounded-md bg-orange px-4 py-2 text-sm font-medium text-ink transition hover:bg-deep-orange hover:text-paper"
              >
                Un-cancel
              </button>
            </form>
            <DeleteEventButton
              eventId={event.id}
              needsConfirmation={joined.length > 0}
              rsvpCount={joined.length}
              action={deleteEvent}
            />
          </div>
        )}
        {writable && !isArchived && !isCancelled && (
          <div className="flex flex-shrink-0 gap-2">
            {isDraft && (
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
            <form action={cloneEvent}>
              <input type="hidden" name="eventId" value={event.id} />
              <button
                type="submit"
                className="rounded-md border border-grey/30 px-4 py-2 text-sm font-medium text-ink transition hover:border-grey/60"
              >
                Clone
              </button>
            </form>
            <Link
              href={`/events/${event.id}/edit`}
              className="rounded-md border border-grey/30 px-4 py-2 text-sm font-medium text-ink transition hover:border-grey/60"
            >
              Edit
            </Link>
            {!isDraft && (
              <Link
                href={`/events/${event.id}/checkin`}
                className="rounded-md border border-grey/30 px-4 py-2 text-sm font-medium text-ink transition hover:border-grey/60"
              >
                Check in
              </Link>
            )}
            {!isDraft && (
              <form action={unpublishEvent}>
                <input type="hidden" name="eventId" value={event.id} />
                <button
                  type="submit"
                  className="rounded-md border border-grey/30 px-4 py-2 text-sm font-medium text-ink transition hover:border-grey/60"
                >
                  Revert to draft
                </button>
              </form>
            )}
            <DeleteEventButton
              eventId={event.id}
              needsConfirmation={!isDraft && joined.length > 0}
              rsvpCount={joined.length}
              action={deleteEvent}
            />
          </div>
        )}
      </div>
      <p className="mb-6 text-sm text-grey">
        {isArchived && !isCancelled && <span className="text-deep-orange">Archived · </span>}
        {isCancelled && <span className="text-deep-orange">Cancelled · </span>}
        {!isArchived && !isCancelled && isDraft && <span className="text-deep-orange">Draft · </span>}
        {formatSlot(event.startTime)}
        {event.location && ` · ${event.location}`}
        {" · "}
        {EVENT_TIER_LABELS[event.tier as EventTier] ?? event.tier}
      </p>

      {isCancelled && event.cancellationReason && (
        <p className="mb-6 rounded-md bg-orange/10 px-3 py-2 text-sm text-ink">Reason: {event.cancellationReason}</p>
      )}

      {writable && !isArchived && !isCancelled && !isDraft && (
        <div className="mb-6">
          <CancelEventForm eventId={event.id} action={cancelEvent} />
        </div>
      )}
    </div>
  );
}
