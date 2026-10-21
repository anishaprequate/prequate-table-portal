"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { acceptAdvisorTime, withdrawAdvisorRequest } from "@/lib/actions/advisors";
import { useToast } from "@/components/toast";
import type { AdvisorRequestView } from "@/lib/advisors";
import { shortSlot, longDay } from "@/lib/stable-date";

const when = (iso: string) => shortSlot(new Date(iso));
const dayOnly = (iso: string) => longDay(new Date(iso));

// One advisor request, wherever it stands: waiting for times, times to choose
// from, confirmed. Withdraw is there while it is still open.
export function AdvisorRequestCard({ request }: { request: AdvisorRequestView }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [taken, setTaken] = useState<string | null>(null);
  const first = request.advisorName.split(" ")[0];

  function run(fn: () => Promise<{ status: string; message?: string }>, after?: (m: string) => void) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (res.status === "ok") {
        if (res.message) toast(res.message);
        router.refresh();
        after?.(res.message ?? "");
      } else {
        setTaken(null);
        setError(res.message ?? "Something went wrong. Try again.");
      }
    });
  }

  function take(start: string) {
    const fd = new FormData();
    fd.set("requestId", request.id);
    fd.set("start", start);
    setTaken(start);
    run(() => acceptAdvisorTime(fd));
  }

  function withdraw() {
    const fd = new FormData();
    fd.set("requestId", request.id);
    run(() => withdrawAdvisorRequest(fd));
  }

  const open = request.status === "REQUESTED" || request.status === "OFFERED";

  return (
    <div className={`rounded-lg border p-5 ${request.status === "OFFERED" ? "border-foil/30 bg-foil/5 shadow-sm" : "border-taupe/15"}`}>
      <p className="font-display text-xl italic leading-tight text-ink">{request.advisorName}</p>

      {request.status === "REQUESTED" && (
        <p className="mt-1 text-sm text-taupe">You proposed {dayOnly(request.proposedDate)}. We will come back with times.</p>
      )}
      {request.status === "OFFERED" && (
        <>
          <p className="mt-1 text-sm text-ink">{first} can do these times. Tap one to take it.</p>
          <div className="mt-4 flex flex-col gap-2">
            {request.slots.map((s) => (
              <button
                key={s.start}
                type="button"
                disabled={pending}
                onClick={() => take(s.start)}
                aria-pressed={taken === s.start}
                className={`tap flex min-h-[52px] items-center justify-between rounded-md border px-4 text-left text-sm transition-colors duration-200 disabled:opacity-60 ${
                  taken === s.start ? "border-ink bg-ink text-bone" : "border-taupe/25 bg-bone text-ink hover:border-foil"
                }`}
              >
                <span>{when(s.start)}</span>
                <span className="text-xs opacity-70">{taken === s.start && pending ? "Booking…" : "Take this"}</span>
              </button>
            ))}
          </div>
        </>
      )}
      {request.status === "CONFIRMED" && request.confirmedStart && (
        <p className="mt-1 text-sm text-ink">
          {when(request.confirmedStart)}. The team will share the details.
        </p>
      )}
      {request.status === "DECLINED" && (
        <p className="mt-1 text-sm text-taupe">
          {first} is not available for {dayOnly(request.proposedDate)}.{request.declineReason ? ` ${request.declineReason}` : ""} Your month is free to book again.
        </p>
      )}
      {request.status === "WITHDRAWN" && <p className="mt-1 text-sm text-taupe">Withdrawn.</p>}

      {request.note && request.status !== "WITHDRAWN" && (
        <p className="mt-2 text-sm text-ink">
          <span className="text-xs uppercase tracking-[0.2em] text-taupe">You </span>
          {request.note}
        </p>
      )}

      {open && (
        <button type="button" onClick={withdraw} disabled={pending} className="btn-ghost tap mt-2 !px-0 disabled:opacity-60">
          Withdraw request
        </button>
      )}
      {error && <p className="mt-3 text-xs text-gold" role="alert">{error}</p>}
    </div>
  );
}
