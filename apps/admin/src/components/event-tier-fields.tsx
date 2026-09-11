"use client";

import { useState } from "react";
// Type-only: erased at compile time, so importing it here never pulls the
// rest of @prequate/core's barrel (which includes server-only integrations
// like nodemailer) into the client bundle. EVENT_TIER_LABELS is a runtime
// value from that same barrel, so it's duplicated below instead of imported
// — importing it here previously broke this page (nodemailer's Node-only
// internals ending up in a client bundle).
import type { EventTier } from "@prequate/core";

const TIER_LABELS: Record<EventTier, string> = {
  DINNER: "Dinner",
  QUARTERLY: "Quarterly",
  ANNUAL: "Annual Gathering",
};

// Renders the Tier select itself (each caller places it in its own layout
// alongside Capacity) plus the Annual Gathering-only fields — sponsor and
// a non-member guest list — which appear the moment that tier is picked,
// no page reload. Mirrors the InviteOnlySection pattern used elsewhere in
// Events.
export function EventTierFields({
  defaultTier,
  defaultSponsorName,
  defaultSponsorLogoUrl,
  defaultExternalGuests,
  labelClassName,
  selectClassName,
}: {
  defaultTier: EventTier;
  defaultSponsorName?: string | null;
  defaultSponsorLogoUrl?: string | null;
  defaultExternalGuests?: string | null;
  labelClassName?: string;
  selectClassName?: string;
}) {
  const [tier, setTier] = useState<EventTier>(defaultTier);

  return (
    <>
      <label className="flex flex-col gap-1.5 text-sm">
        {labelClassName ? <span className={labelClassName}>Tier</span> : "Tier"}
        <select
          name="tier"
          value={tier}
          onChange={(e) => setTier(e.target.value as EventTier)}
          className={selectClassName ?? "rounded-md border border-grey/30 bg-paper px-3 py-2 text-ink"}
        >
          {(Object.keys(TIER_LABELS) as EventTier[]).map((t) => (
            <option key={t} value={t}>
              {TIER_LABELS[t]}
            </option>
          ))}
        </select>
      </label>

      {tier === "ANNUAL" && (
        <div className="flex flex-col gap-4 rounded-md border border-grey/20 p-4">
          <p className="text-xs uppercase tracking-wide text-grey">Annual Gathering details</p>
          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5 text-sm">
              Sponsor name (optional)
              <input
                type="text"
                name="sponsorName"
                defaultValue={defaultSponsorName ?? ""}
                className="rounded-md border border-grey/30 bg-paper px-3 py-2 text-ink"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              Sponsor logo URL (optional)
              <input
                type="text"
                name="sponsorLogoUrl"
                defaultValue={defaultSponsorLogoUrl ?? ""}
                placeholder="https://…"
                className="rounded-md border border-grey/30 bg-paper px-3 py-2 text-ink"
              />
            </label>
          </div>
          <label className="flex flex-col gap-1.5 text-sm">
            Guests beyond the membership (one per line, "Name, email")
            <textarea
              name="externalGuests"
              rows={3}
              defaultValue={defaultExternalGuests ?? ""}
              placeholder={"e.g. Jane Doe, jane@example.com"}
              className="rounded-md border border-grey/30 bg-paper px-3 py-2 text-ink"
            />
          </label>
        </div>
      )}
    </>
  );
}
