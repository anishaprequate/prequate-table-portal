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
      <button type="button" onClick={() => setExpanded(true)} className="btn-secondary">
        Cancel
      </button>
    );
  }

  return (
    <form action={action} className="card flex animate-fade-up flex-col gap-3 p-5">
      <input type="hidden" name="bookingId" value={bookingId} />
      <label className="flex flex-col gap-1.5 text-sm">
        Reason for cancelling
        <textarea name="reason" rows={2} required className="input-field" />
      </label>
      <div className="flex gap-3">
        <button type="submit" className="btn-primary !bg-clay !px-4 !py-2 hover:!bg-ink">
          Cancel session
        </button>
        <button type="button" onClick={() => setExpanded(false)} className="btn-secondary !px-4 !py-2">
          Never mind
        </button>
      </div>
    </form>
  );
}
