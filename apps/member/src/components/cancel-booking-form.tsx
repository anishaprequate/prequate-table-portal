"use client";

import { useState } from "react";

export function CancelBookingForm({
  bookingId,
  action,
}: {
  bookingId: string;
  action: (formData: FormData) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="rounded-md border border-grey/30 px-5 py-3 text-sm font-medium text-ink transition hover:border-grey/60"
      >
        Cancel
      </button>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-3 rounded-md border border-grey/30 p-4">
      <input type="hidden" name="bookingId" value={bookingId} />
      <label className="flex flex-col gap-1.5 text-sm">
        Reason for cancelling
        <textarea
          name="reason"
          rows={2}
          required
          className="rounded-md border border-grey/30 bg-paper px-3 py-2 text-sm text-ink"
        />
      </label>
      <div className="flex gap-3">
        <button
          type="submit"
          className="rounded-md bg-deep-orange px-4 py-2 text-sm font-medium text-paper transition hover:bg-ink"
        >
          Cancel session
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
