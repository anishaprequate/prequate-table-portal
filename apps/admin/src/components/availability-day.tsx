"use client";

import { useState, useTransition } from "react";
import { toggleSlot, setDay } from "@/lib/actions/partner";

export interface DaySlotView {
  start: string; // ISO
  state: "open" | "blocked" | "booked";
  editable: boolean; // false when the block comes from the calendar itself
}

const timeLabel = (iso: string) =>
  new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" }).format(new Date(iso));

// One day of a partner's availability. Tap a time to mark it unavailable, tap
// it again to open it. Changes show at once and are saved in the background.
export function AvailabilityDay({
  dayKey,
  label,
  slots: initial,
  partnerId,
}: {
  dayKey: string;
  label: string;
  slots: DaySlotView[];
  // Set when an admin is changing a partner's availability.
  partnerId?: string;
}) {
  const [slots, setSlots] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const anyOpen = slots.some((s) => s.state === "open");
  const anyBlocked = slots.some((s) => s.state === "blocked" && s.editable);

  function flip(start: string) {
    const before = slots;
    setError(null);
    setSlots((all) => all.map((s) => (s.start === start && s.state !== "booked" ? { ...s, state: s.state === "open" ? "blocked" : "open" } : s)));
    startTransition(async () => {
      const res = await toggleSlot(start, partnerId);
      if (res.status === "error") {
        setSlots(before);
        setError(res.message);
      }
    });
  }

  function wholeDay(available: boolean) {
    const before = slots;
    setError(null);
    setSlots((all) => all.map((s) => (s.state === "booked" || !s.editable ? s : { ...s, state: available ? "open" : "blocked" })));
    startTransition(async () => {
      const res = await setDay(dayKey, available, partnerId);
      if (res.status === "error") {
        setSlots(before);
        setError(res.message);
      }
    });
  }

  return (
    <li className="rounded-lg border border-grey/20 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="font-display text-xl italic text-ink">{label}</p>
        {anyOpen ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => wholeDay(false)}
            className="min-h-[44px] rounded-md px-3 text-sm text-grey transition hover:text-ink disabled:opacity-50"
          >
            Mark day unavailable
          </button>
        ) : anyBlocked ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => wholeDay(true)}
            className="min-h-[44px] rounded-md px-3 text-sm text-deep-orange transition hover:text-ink disabled:opacity-50"
          >
            Restore day
          </button>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {slots.map((s) => {
          const base = "min-h-[44px] min-w-[84px] rounded-md border px-3 text-sm transition";
          if (s.state === "booked") {
            return (
              <span key={s.start} className={`${base} flex items-center justify-center border-orange/40 bg-orange/10 text-ink`}>
                {timeLabel(s.start)} · booked
              </span>
            );
          }
          if (!s.editable) {
            return (
              <span key={s.start} className={`${base} flex items-center justify-center border-grey/20 text-grey/60 line-through`}>
                {timeLabel(s.start)}
              </span>
            );
          }
          const open = s.state === "open";
          return (
            <button
              key={s.start}
              type="button"
              aria-pressed={!open}
              onClick={() => flip(s.start)}
              className={`${base} ${
                open ? "border-grey/30 text-ink hover:border-grey/60" : "border-grey/20 bg-grey/10 text-grey line-through"
              }`}
            >
              {timeLabel(s.start)}
            </button>
          );
        })}
      </div>
      {error && <p className="mt-3 text-sm text-deep-orange" role="alert">{error}</p>}
    </li>
  );
}
