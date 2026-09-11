"use client";

import { useState } from "react";

export function CancelEventForm({
  eventId,
  action,
}: {
  eventId: string;
  action: (formData: FormData) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="rounded-md border border-grey/30 px-4 py-2 text-sm font-medium text-ink transition hover:border-grey/60"
      >
        Cancel event
      </button>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-3 rounded-md border border-grey/30 p-4">
      <input type="hidden" name="eventId" value={eventId} />
      <label className="flex flex-col gap-1.5 text-sm">
        Reason (optional, sent to everyone RSVP&apos;d)
        <textarea
          name="reason"
          rows={2}
          className="rounded-md border border-grey/30 bg-paper px-3 py-2 text-sm text-ink"
        />
      </label>
      <div className="flex gap-3">
        <button
          type="submit"
          className="rounded-md bg-deep-orange px-4 py-2 text-sm font-medium text-paper transition hover:bg-ink"
        >
          Cancel event
        </button>
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="rounded-md border border-grey/30 px-4 py-2 text-sm font-medium text-ink transition hover:border-grey/60"
        >
          Never mind
        </button>
      </div>
    </form>
  );
}
