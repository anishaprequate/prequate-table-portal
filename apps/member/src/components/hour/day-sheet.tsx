"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import { Sheet } from "@/components/sheet";
import { Avatar } from "@/components/avatar";
import { useToast } from "@/components/toast";
import { bookHour, rescheduleHour, loadDay, loadPartnerDay, type BookState } from "@/lib/actions/hour";
import type { DayCell, DayPartner } from "@/lib/hour-calendar";
import { longDay, shortSlot } from "@/lib/stable-date";

const dayTitle = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  return longDay(new Date(y, m - 1, d));
};

function ConfirmButton({ disabled, moving }: { disabled: boolean; moving: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={disabled || pending} className="btn-primary tap w-full disabled:opacity-40">
      {pending ? "Sending…" : moving ? "Request this time" : "Send request"}
    </button>
  );
}

// Tap a day, pick a partner, then see their day like a calendar. Every time
// looks the same: nothing is marked busy. Tap a time to propose it. If the
// partner is busy then, a toast says so at once. Otherwise the time is selected,
// and Confirm sends it as a request to the partner, who confirms it, suggests
// other times, or declines.
// Moving an Hour works the same way: the partner is fixed, so only the time is
// asked, the note and the way of meeting carry over, and the current time stands
// until the partner confirms the new one.
export function DaySheet({
  dayKey,
  parentBookingId,
  rescheduleBookingId = null,
  onClose,
}: {
  dayKey: string;
  parentBookingId: string | null;
  rescheduleBookingId?: string | null;
  onClose: () => void;
}) {
  const moving = Boolean(rescheduleBookingId);
  const router = useRouter();
  const toast = useToast();
  const [partners, setPartners] = useState<DayPartner[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [cells, setCells] = useState<DayCell[] | null>(null);
  const [picked, setPicked] = useState<string | null>(null); // "14:30"
  const [note, setNote] = useState("");
  const [mode, setMode] = useState<"IN_PERSON" | "ONLINE">("IN_PERSON");
  const [place, setPlace] = useState("");
  const [state, action] = useFormState<BookState, FormData>(moving ? rescheduleHour : bookHour, { status: "idle" });

  const load = useCallback(async () => {
    const res = await loadDay(dayKey, rescheduleBookingId ?? undefined);
    if ("error" in res) {
      setLoadError(res.error);
      return;
    }
    setLoadError(null);
    setPartners(res.partners);
    // One partner free that day: no need to ask. A chosen partner who has since
    // gone is dropped.
    setPartnerId((p) => (res.partners.length === 1 ? res.partners[0].id : res.partners.some((x) => x.id === p) ? p : null));
  }, [dayKey, rescheduleBookingId]);

  useEffect(() => {
    load();
  }, [load]);

  // The chosen partner's day. Read again every 15 seconds while the screen is
  // showing, so a time taken elsewhere turns busy without the member doing anything.
  const loadCells = useCallback(
    async (quiet: boolean) => {
      if (!partnerId) return;
      const res = await loadPartnerDay(dayKey, partnerId, rescheduleBookingId ?? undefined);
      if ("error" in res) {
        if (!quiet) setLoadError(res.error);
        return;
      }
      setLoadError(null);
      setCells(res.cells);
      setPicked((p) => {
        if (!p) return p;
        const still = res.cells.some((c) => c.hhmm === p && c.canStart);
        if (!still) toast("This hour is already taken. Please choose another time.");
        return still ? p : null;
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dayKey, partnerId, rescheduleBookingId],
  );

  useEffect(() => {
    setCells(null);
    setPicked(null);
    loadCells(false);
  }, [loadCells]);

  useEffect(() => {
    const id = setInterval(() => document.visibilityState === "visible" && loadCells(true), 15_000);
    return () => clearInterval(id);
  }, [loadCells]);

  // The result of a booking: a toast either way. Success goes straight to the
  // member's booked Hours, with no prompt to book another.
  useEffect(() => {
    if (state.status === "ok") {
      const c = state.confirmation;
      const when = shortSlot(new Date(c.start));
      onClose();
      router.push("/the-hour");
      const first = c.partnerName.split(" ")[0];
      toast(moving ? `Move requested: ${when}. Your current time stands until ${first} confirms.` : `Requested: ${when}. ${first} will confirm.`);
    } else if (state.status === "error") {
      toast(state.message);
      loadCells(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  function tap(i: number) {
    if (!cells) return;
    const c = cells[i];
    if (c.canStart) {
      setPicked(c.hhmm);
      return;
    }
    // Said at once, with no round trip.
    if (c.state === "busy") toast("This hour is already taken. Please choose another time.");
    else if (c.state === "soon") toast("An Hour needs 12 hours' notice. Choose a later time.");
    else if (i === cells.length - 1) toast("An Hour must end by 8 pm, so the last start is 7:00 pm.");
    else toast("This hour is already taken. Please choose another time.");
  }

  const pickedIndex = cells && picked ? cells.findIndex((c) => c.hhmm === picked) : -1;
  const pickedEnd = cells && pickedIndex >= 0 ? (cells[pickedIndex + 2]?.label ?? "8:00 pm") : null;
  const partner = partners?.find((p) => p.id === partnerId) ?? null;

  return (
    <Sheet open onClose={onClose} title={dayTitle(dayKey)}>
      <form action={action} className="flex flex-col gap-5">
        {partners === null && !loadError && (
          <div className="flex flex-col gap-3" aria-busy>
            <div className="skeleton h-14 rounded-md" />
            <div className="skeleton h-14 rounded-md" />
          </div>
        )}
        {loadError && <p className="text-sm text-gold" role="alert">{loadError}</p>}
        {partners && partners.length === 0 && <p className="text-sm text-taupe">That day has just filled. Choose another.</p>}

        {partners && partners.length > 0 && !moving && (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-[11px] uppercase tracking-[0.2em] text-taupe">Choose a partner</legend>
            {partners.map((p) => {
              const on = partnerId === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  aria-label={p.name}
                  onClick={() => setPartnerId(p.id)}
                  className={`tap flex min-h-[64px] items-center gap-3 rounded-lg border px-3 text-left transition-colors duration-200 ${
                    on ? "border-ink bg-ink text-bone" : "border-taupe/25 text-ink hover:border-foil"
                  }`}
                >
                  <Avatar name={p.name} photoUrl={p.photoUrl} size="md" className={on ? "!bg-bone" : ""} />
                  <span className="font-display text-xl italic leading-tight">{p.name}</span>
                </button>
              );
            })}
          </fieldset>
        )}
        {moving && partner && (
          <p className="text-sm text-taupe">
            With <span className="text-ink">{partner.name}</span>. Tap the new time you would like.
          </p>
        )}

        {partnerId && (
          <div className="flex flex-col gap-5 border-t border-taupe/12 pt-5">
            <input type="hidden" name="partnerId" value={partnerId} />
            <input type="hidden" name="date" value={dayKey} />
            {picked && <input type="hidden" name="time" value={picked} />}
            {parentBookingId && <input type="hidden" name="parentBookingId" value={parentBookingId} />}
            {rescheduleBookingId && <input type="hidden" name="bookingId" value={rescheduleBookingId} />}

            <div>
              <p className="mb-2 text-[11px] uppercase tracking-[0.2em] text-taupe">
                {moving ? "Their day" : `${partner?.name.split(" ")[0] ?? "Their"}'s day`}
              </p>
              {cells === null ? (
                <div className="flex flex-col gap-1" aria-busy>
                  {Array.from({ length: 6 }, (_, i) => (
                    <div key={i} className="skeleton h-11 rounded-md" />
                  ))}
                </div>
              ) : (
                <ul className="overflow-hidden rounded-lg border border-taupe/20" aria-label="Day view, half hour by half hour">
                  {cells.map((c, i) => {
                    const inPick = pickedIndex >= 0 && (i === pickedIndex || i === pickedIndex + 1);
                    return (
                      <li key={c.hhmm} className={`flex ${c.hhmm.endsWith(":00") && i > 0 ? "border-t border-taupe/20" : i > 0 ? "border-t border-dashed border-taupe/10" : ""}`}>
                        <span className="flex w-[4.5rem] flex-shrink-0 items-center justify-end pr-2 text-xs text-taupe">{c.label}</span>
                        <button
                          type="button"
                          onClick={() => tap(i)}
                          aria-label={c.label}
                          aria-pressed={i === pickedIndex}
                          className={`tap flex min-h-[44px] flex-1 items-center px-3 text-left text-xs transition-colors duration-150 ${
                            inPick ? "bg-ink text-bone" : "bg-bone text-ink hover:bg-foil/10"
                          }`}
                        >
                          {i === pickedIndex && `${c.label} to ${pickedEnd}`}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
              <p className="mt-2 text-xs text-taupe" aria-live="polite">
                {picked && pickedEnd
                  ? `${cells?.[pickedIndex].label} to ${pickedEnd}. Every Hour is 60 minutes.`
                  : "Tap a start time. Every Hour is 60 minutes, on the hour or half hour, ending by 8 pm."}
              </p>
            </div>

            {!moving && (
              <>
                <label className="flex flex-col gap-1.5 text-sm">
                  What would you like to bring?
                  <textarea name="memberContext" rows={3} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} className="input-field" />
                </label>

                <div className="flex flex-col gap-2">
                  <div className="flex gap-1 rounded-lg border border-taupe/25 p-1" role="radiogroup" aria-label="How would you like to meet?">
                    {([["IN_PERSON", "In person"], ["ONLINE", "Online"]] as const).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={mode === value}
                        onClick={() => setMode(value)}
                        className={`tap min-h-[44px] flex-1 rounded-md px-3 text-sm transition-colors duration-200 ${
                          mode === value ? "bg-ink text-bone" : "text-taupe hover:text-ink"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <input type="hidden" name="mode" value={mode} />
                  {mode === "ONLINE" && (
                    <p className="text-xs text-taupe" aria-live="polite">
                      You will receive a Google Meet link.
                    </p>
                  )}
                  {mode === "IN_PERSON" && (
                    <label className="mt-1 flex flex-col gap-1.5 text-sm">
                      Where would you like to meet?
                      <input
                        type="text"
                        name="place"
                        value={place}
                        onChange={(e) => setPlace(e.target.value)}
                        maxLength={200}
                        placeholder="A place you suggest. Optional."
                        autoComplete="off"
                        className="input-field"
                      />
                      <span className="text-xs text-taupe">Leave it empty and your partner will suggest one.</span>
                    </label>
                  )}
                </div>
              </>
            )}

            <ConfirmButton disabled={!picked} moving={moving} />
            <p className="-mt-2 text-xs text-taupe">
              {partner ? partner.name.split(" ")[0] : "Your partner"} will confirm your time, and we will let you know straight away.
            </p>
          </div>
        )}
      </form>
    </Sheet>
  );
}
