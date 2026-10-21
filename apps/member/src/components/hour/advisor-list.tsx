"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import { Sheet } from "@/components/sheet";
import { Avatar } from "@/components/avatar";
import { useToast } from "@/components/toast";
import { requestAdvisorHour, type AdvisorState } from "@/lib/actions/advisors";
import type { AdvisorView } from "@/lib/advisors";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const pad = (n: number) => String(n).padStart(2, "0");

function Send({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={disabled || pending} className="btn-primary tap w-full disabled:opacity-40">
      {pending ? "Sending…" : "Propose this date"}
    </button>
  );
}

// An advisor has no calendar here. Pick a weekday, add a note, send. The team
// comes back with times.
function ProposeSheet({
  advisor,
  months,
  used,
  onClose,
}: {
  advisor: AdvisorView;
  months: { year: number; month: number; label: string }[];
  used: string | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const [m, setM] = useState(0);
  const [date, setDate] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [state, action] = useFormState<AdvisorState, FormData>(async (prev, fd) => {
    const res = await requestAdvisorHour(prev, fd);
    if (res.status === "ok") {
      onClose();
      router.refresh();
      toast(res.message);
    }
    return res;
  }, { status: "idle" });

  const cur = months[m];
  const first = new Date(cur.year, cur.month, 1);
  const daysInMonth = new Date(cur.year, cur.month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(first.getDay()).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);
  const now = new Date();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  const arrow = "tap flex h-11 w-11 items-center justify-center rounded-md transition-colors duration-300";

  return (
    <Sheet open onClose={onClose} title={advisor.name}>
      {used ? (
        <p className="text-sm text-ink">{used}</p>
      ) : (
        <form action={action} className="flex flex-col gap-5">
          <p className="text-sm text-taupe">Propose a day. We will come back to you with times.</p>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <button type="button" disabled={m === 0} onClick={() => { setM(m - 1); setDate(null); }} className={`${arrow} text-taupe hover:text-ink disabled:text-taupe/25`} aria-label="Previous month">
                ←
              </button>
              <h3 className="font-display text-xl italic text-ink" aria-live="polite">
                {cur.label}
              </h3>
              <button type="button" disabled={m === months.length - 1} onClick={() => { setM(m + 1); setDate(null); }} className={`${arrow} text-taupe hover:text-ink disabled:text-taupe/25`} aria-label="Next month">
                →
              </button>
            </div>
            <div className="card grid grid-cols-7 gap-px overflow-hidden bg-taupe/10 text-sm" role="grid" aria-label={cur.label}>
              {WEEKDAYS.map((d, i) => (
                <div key={i} className="bg-bone py-2 text-center text-xs text-taupe" role="columnheader">
                  {d}
                </div>
              ))}
              {cells.map((day, i) => {
                if (day === null) return <div key={i} className="min-h-[44px] bg-bone" aria-hidden />;
                const d = new Date(cur.year, cur.month, day);
                const key = `${cur.year}-${pad(cur.month + 1)}-${pad(day)}`;
                const ok = d >= tomorrow && d.getDay() !== 0 && d.getDay() !== 6;
                const on = date === key;
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={!ok}
                    aria-pressed={on}
                    aria-label={d.toDateString()}
                    onClick={() => setDate(key)}
                    className={`tap flex min-h-[44px] items-center justify-center transition-colors duration-200 ${
                      on ? "bg-ink text-bone" : ok ? "bg-bone text-ink hover:bg-foil/10" : "bg-bone text-taupe/35"
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          <input type="hidden" name="advisorId" value={advisor.id} />
          {date && <input type="hidden" name="date" value={date} />}

          <label className="flex flex-col gap-1.5 text-sm">
            What would you like to bring?
            <textarea name="memberContext" rows={3} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} className="input-field" />
          </label>

          {state.status === "error" && (
            <p className="text-sm text-gold" role="alert">
              {state.message}
            </p>
          )}
          <Send disabled={!date} />
        </form>
      )}
    </Sheet>
  );
}

// The Advisors tab: who they are, and a way to ask for an Hour.
export function AdvisorList({
  advisors,
  months,
  used,
}: {
  advisors: AdvisorView[];
  months: { year: number; month: number; label: string }[];
  // When the member already has this month's Hour, the sentence to show instead.
  used: string | null;
}) {
  const [open, setOpen] = useState<AdvisorView | null>(null);

  if (advisors.length === 0) return <p className="text-sm text-taupe">No advisors are listed yet.</p>;

  return (
    <>
      <ul className="flex flex-col gap-4">
        {advisors.map((a) => (
          <li key={a.id} className="card flex flex-col gap-4 p-4">
            <div className="flex items-start gap-4">
              <Avatar name={a.name} photoUrl={a.photoUrl} size="lg" />
              <div className="min-w-0">
                <p className="font-display text-xl italic leading-tight text-ink">{a.name}</p>
                {a.headline && <p className="mt-1 text-sm text-taupe">{a.headline}</p>}
                {a.linkedinUrl && (
                  <a
                    href={a.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-[44px] items-center text-sm text-gold underline decoration-clay/40 underline-offset-2"
                  >
                    LinkedIn
                  </a>
                )}
              </div>
            </div>
            <button type="button" onClick={() => setOpen(a)} className="btn-secondary tap w-full">
              Propose a date
            </button>
          </li>
        ))}
      </ul>
      {open && <ProposeSheet advisor={open} months={months} used={used} onClose={() => setOpen(null)} />}
    </>
  );
}
