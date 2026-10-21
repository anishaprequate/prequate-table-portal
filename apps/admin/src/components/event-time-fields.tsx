"use client";

import { useRef, useState } from "react";

const pad = (n: number) => String(n).padStart(2, "0");
const toInput = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

const FIELD = "rounded-md border border-grey/30 bg-paper px-3 py-2 text-sm text-ink";

// Start and end of an event. The end cannot be before the start: the end
// field's earliest value follows the start, moving the start carries the end
// along, and the form will not submit while the end is earlier.
export function EventTimeFields({ defaultStart = "", defaultEnd = "" }: { defaultStart?: string; defaultEnd?: string }) {
  const [start, setStart] = useState(defaultStart);
  const [end, setEnd] = useState(defaultEnd);
  const endRef = useRef<HTMLInputElement>(null);

  function check(s: string, e: string) {
    const bad = Boolean(s && e && new Date(e).getTime() <= new Date(s).getTime());
    endRef.current?.setCustomValidity(bad ? "The end time has to be after the start time." : "");
    return bad;
  }

  function onStart(value: string) {
    setStart(value);
    let nextEnd = end;
    const s = new Date(value);
    if (value && !Number.isNaN(s.getTime()) && (!end || new Date(end).getTime() <= s.getTime())) {
      nextEnd = toInput(new Date(s.getTime() + 2 * 3_600_000));
      setEnd(nextEnd);
    }
    check(value, nextEnd);
  }

  function onEnd(value: string) {
    setEnd(value);
    check(start, value);
  }

  const bad = Boolean(start && end && new Date(end).getTime() <= new Date(start).getTime());

  return (
    <div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-xs uppercase tracking-wide text-grey">Starts</span>
          <input type="datetime-local" name="startTime" required value={start} onChange={(e) => onStart(e.target.value)} className={FIELD} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-xs uppercase tracking-wide text-grey">Ends</span>
          <input
            ref={endRef}
            type="datetime-local"
            name="endTime"
            required
            min={start || undefined}
            value={end}
            onChange={(e) => onEnd(e.target.value)}
            className={FIELD}
          />
        </label>
      </div>
      {bad && (
        <p className="mt-2 text-sm text-deep-orange" role="alert">
          The end time has to be after the start time.
        </p>
      )}
    </div>
  );
}
