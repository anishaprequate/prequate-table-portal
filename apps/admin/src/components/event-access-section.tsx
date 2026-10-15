"use client";

import { useState } from "react";

// Open or Closed, chosen when an event is created (and editable after).
// Closed means members see the event only once they hold a sent invitation.
// The hidden field keeps the "inviteOnly" form value the actions already read.
export function EventAccessSection({
  formId,
  defaultClosed,
  children,
}: {
  // Set when this control sits outside the form it belongs to (the edit page).
  formId?: string;
  defaultClosed: boolean;
  children: React.ReactNode;
}) {
  const [closed, setClosed] = useState(defaultClosed);

  const option = (active: boolean) =>
    `flex-1 rounded-md px-3 py-2 text-sm transition ${
      active ? "bg-ink text-paper" : "text-grey hover:text-ink"
    }`;

  return (
    <div className="flex flex-col gap-3">
      <span className="text-xs uppercase tracking-wide text-grey">Who can see this event</span>
      <div className="flex gap-1 rounded-lg border border-grey/30 p-1" role="radiogroup" aria-label="Event access">
        <button type="button" role="radio" aria-checked={!closed} onClick={() => setClosed(false)} className={option(!closed)}>
          Open
        </button>
        <button type="button" role="radio" aria-checked={closed} onClick={() => setClosed(true)} className={option(closed)}>
          Closed
        </button>
      </div>
      <p className="text-xs text-grey">
        {closed
          ? "Closed: only members you invite can see it. They accept or decline. No spots-left count is shown."
          : "Open: every member sees it and can RSVP, with spots left shown."}
      </p>
      {closed && <input type="hidden" name="inviteOnly" value="on" form={formId} />}
      {closed && children}
    </div>
  );
}
