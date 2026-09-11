"use client";

import { useState } from "react";

export function DeleteEventButton({
  eventId,
  needsConfirmation,
  rsvpCount,
  action,
}: {
  eventId: string;
  needsConfirmation: boolean;
  rsvpCount: number;
  action: (formData: FormData) => void;
}) {
  const [confirming, setConfirming] = useState(false);

  if (needsConfirmation && confirming) {
    return (
      <div className="rounded-md border border-grey/30 p-4">
        <p className="mb-3 text-sm text-ink">
          {rsvpCount} member{rsvpCount === 1 ? "" : "s"} are RSVP&apos;d for this event. Delete anyway? This
          cannot be undone.
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="rounded-md border border-grey/30 px-4 py-2 text-sm font-medium text-ink transition hover:border-grey/60"
          >
            Cancel
          </button>
          <form action={action}>
            <input type="hidden" name="eventId" value={eventId} />
            <button
              type="submit"
              className="rounded-md bg-deep-orange px-4 py-2 text-sm font-medium text-paper transition hover:bg-ink"
            >
              Delete Event
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (needsConfirmation) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="rounded-md border border-grey/30 px-4 py-2 text-sm font-medium text-ink transition hover:border-grey/60"
      >
        Delete
      </button>
    );
  }

  return (
    <form action={action}>
      <input type="hidden" name="eventId" value={eventId} />
      <button
        type="submit"
        className="rounded-md border border-grey/30 px-4 py-2 text-sm font-medium text-ink transition hover:border-grey/60"
      >
        Delete
      </button>
    </form>
  );
}
