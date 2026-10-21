"use client";

import { useState, useTransition } from "react";
import { acceptOffer } from "@/lib/actions/hour";
import { useToast } from "@/components/toast";
import type { OfferView } from "@/lib/hour-offers";
import { shortSlot } from "@/lib/stable-date";

const label = (iso: string) => shortSlot(new Date(iso));

// A partner cancelled or asked to move an Hour: three other times, one tap.
export function OfferCard({ offer }: { offer: OfferView }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [taken, setTaken] = useState<string | null>(null);
  const toast = useToast();

  function take(start: string) {
    const fd = new FormData();
    fd.set("offerId", offer.id);
    fd.set("start", start);
    setError(null);
    setTaken(start);
    startTransition(async () => {
      const res = await acceptOffer(fd);
      if (res.status === "ok") toast(res.message);
      else {
        setTaken(null);
        setError(res.status === "error" ? res.message : "Something went wrong. Try again.");
      }
    });
  }

  return (
    <div className="rounded-lg border border-foil/30 bg-foil/5 p-5 shadow-sm">
      <p className="text-sm text-ink">
        {offer.reason === "CANCELLED"
          ? `${offer.partnerFirstName} cannot make your Hour.`
          : offer.reason === "COUNTER"
            ? `${offer.partnerFirstName} suggests other times.`
            : `${offer.partnerFirstName} needs to move your Hour.`}{" "}
        Tap a time that suits you.
      </p>
      <div className="mt-4 flex flex-col gap-2">
        {offer.slots.map((s) => (
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
            <span>{label(s.start)}</span>
            <span className="text-xs opacity-70">{taken === s.start && pending ? "Booking…" : "Take this"}</span>
          </button>
        ))}
      </div>
      {error && <p className="mt-3 text-xs text-gold" role="alert">{error}</p>}
    </div>
  );
}
