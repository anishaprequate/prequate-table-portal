"use client";

import { useFormState, useFormStatus } from "react-dom";
import { offerAdvisorTimes, type AdvisorFormState } from "@/lib/actions/advisors";

type OfferAction = (prev: AdvisorFormState, formData: FormData) => Promise<AdvisorFormState>;

// 10:00, 10:30 ... 19:00. The last Hour must end by 8 pm.
const TIMES = Array.from({ length: 19 }, (_, i) => {
  const m = 10 * 60 + i * 30;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  const label = `${h > 12 ? h - 12 : h}:${String(mm).padStart(2, "0")} ${h >= 12 ? "pm" : "am"}`;
  return { value: `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`, label };
});

function Send({ again }: { again: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="min-h-[44px] rounded-md bg-ink px-5 py-2 text-sm font-medium text-paper transition hover:bg-ink/90 disabled:opacity-50">
      {pending ? "Sending…" : again ? "Send new times" : "Send times"}
    </button>
  );
}

// Up to three times, one per row: a date and a start time. The first row opens
// on the day the member proposed. Used for advisor requests and, with another
// action, for suggesting other times on a partner Hour.
export function AdvisorOfferForm({
  requestId,
  proposedDay,
  again,
  offer = offerAdvisorTimes,
  idName = "requestId",
  place,
}: {
  requestId: string;
  proposedDay: string;
  again: boolean;
  offer?: OfferAction;
  idName?: string;
  // Adds a place box, for an in person Hour.
  place?: { defaultValue: string };
}) {
  const [state, action] = useFormState<AdvisorFormState, FormData>(offer, { status: "idle" });
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name={idName} value={requestId} />
      {[1, 2, 3].map((n) => (
        <div key={n} className="flex flex-wrap items-center gap-2">
          <span className="w-12 text-xs uppercase tracking-[0.2em] text-grey">Time {n}</span>
          <input
            type="date"
            name={`date${n}`}
            defaultValue={n === 1 ? proposedDay : ""}
            aria-label={`Date for time ${n}`}
            className="min-h-[44px] rounded-md border border-grey/30 bg-paper px-3 text-ink"
          />
          <select name={`time${n}`} defaultValue="" aria-label={`Start time for time ${n}`} className="min-h-[44px] rounded-md border border-grey/30 bg-paper px-3 text-ink">
            <option value="">Start time</option>
            {TIMES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      ))}
      {place && (
        <label className="flex flex-col gap-1 text-sm text-ink">
          Place, if you already know it
          <input
            type="text"
            name="place"
            defaultValue={place.defaultValue}
            maxLength={200}
            placeholder="Optional"
            className="min-h-[44px] rounded-md border border-grey/30 bg-paper px-3 text-ink"
          />
        </label>
      )}
      <p className="text-xs text-grey">Each is a 60 minute Hour, on the hour or half hour, ending by 8 pm. Leave a row empty to offer fewer.</p>
      {state.status !== "idle" && (
        <p className={`text-sm ${state.status === "error" ? "text-deep-orange" : "text-ink"}`} role={state.status === "error" ? "alert" : "status"}>
          {state.message}
        </p>
      )}
      <div>
        <Send again={again} />
      </div>
    </form>
  );
}
