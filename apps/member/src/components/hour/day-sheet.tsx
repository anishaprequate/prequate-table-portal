"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import { Sheet } from "@/components/sheet";
import { Avatar } from "@/components/avatar";
import { useToast } from "@/components/toast";
import { bookHour, loadDay, type BookState } from "@/lib/actions/hour";
import type { DayPartner, DaySlot } from "@/lib/hour-calendar";

const timeLabel = (iso: string) =>
  new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" }).format(new Date(iso));

const dayTitle = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long" }).format(new Date(y, m - 1, d));
};

interface Picked {
  partnerId: string;
  slot: DaySlot;
}

function ConfirmButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={disabled || pending} className="btn-primary tap w-full disabled:opacity-40">
      {pending ? "Booking…" : "Confirm"}
    </button>
  );
}

// Tap a day, pick a time, say what you would like to bring, confirm. Nothing
// else: no bios, no extra text.
export function DaySheet({
  dayKey,
  parentBookingId,
  onClose,
}: {
  dayKey: string;
  parentBookingId: string | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const [partners, setPartners] = useState<DayPartner[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string | null>(null);
  const [picked, setPicked] = useState<Picked | null>(null);
  const [note, setNote] = useState("");
  const [mode, setMode] = useState<"IN_PERSON" | "ONLINE">("IN_PERSON");
  const [state, action] = useFormState<BookState, FormData>(bookHour, { status: "idle" });

  const load = useCallback(async () => {
    const res = await loadDay(dayKey);
    if ("error" in res) {
      setLoadError(res.error);
      return;
    }
    setLoadError(null);
    setPartners(res.partners);
    // A picked time that has since gone is dropped; the note stays.
    setPicked((p) =>
      p && res.partners.some((x) => x.id === p.partnerId && [...x.morning, ...x.afternoon].some((s) => s.start === p.slot.start)) ? p : null,
    );
  }, [dayKey]);

  useEffect(() => {
    load();
  }, [load]);

  // A booking that failed because the time went: read the day again, so the
  // member sees what is still open. Their note is kept.
  useEffect(() => {
    if (state.status === "error" && state.refresh) load();
  }, [state, load]);

  const done = state.status === "ok" ? state.confirmation : null;

  function finish() {
    onClose();
    router.refresh();
    toast("Your Hour is booked.");
  }

  const visible = (partners ?? []).filter((p) => !filter || p.id === filter);

  return (
    <Sheet open onClose={done ? finish : onClose} title={done ? "Booked" : dayTitle(dayKey)}>
      {done ? (
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-4">
            <Avatar name={done.partnerName} photoUrl={done.partnerPhotoUrl} size="lg" />
            <div className="min-w-0">
              <p className="font-display text-xl italic leading-tight text-ink">{done.partnerName}</p>
              <p className="text-sm text-taupe">
                {new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short" }).format(new Date(done.start))},{" "}
                {timeLabel(done.start)} to {timeLabel(done.end)}
              </p>
            </div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-taupe">{done.mode === "ONLINE" ? "Online" : "In person"}</p>
            {done.mode === "ONLINE" ? (
              done.meetLink ? (
                <a href={done.meetLink} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[44px] items-center break-all text-sm text-clay underline decoration-clay/40 underline-offset-2">
                  {done.meetLink}
                </a>
              ) : (
                <p className="text-sm text-ink">You will receive a Google Meet link.</p>
              )
            ) : null}
          </div>
          <p className="text-xs text-taupe">
            {done.inviteTo ? `The calendar invite is on its way to ${done.inviteTo}.` : "Add your email in Settings to receive the calendar invite."}
          </p>
          <div className="flex gap-3">
            <button type="button" onClick={finish} className="btn-primary tap flex-1">
              Done
            </button>
            <Link href={`/the-hour/${done.bookingId}`} className="btn-secondary tap flex-1">
              See it
            </Link>
          </div>
        </div>
      ) : (
        <form action={action} className="flex flex-col gap-5">
          {partners === null && !loadError && (
            <div className="flex flex-col gap-3" aria-busy>
              <div className="skeleton h-12 rounded-md" />
              <div className="skeleton h-12 rounded-md" />
            </div>
          )}
          {loadError && <p className="text-sm text-clay" role="alert">{loadError}</p>}
          {partners && partners.length === 0 && (
            <p className="text-sm text-taupe">That day has just filled. Choose another.</p>
          )}

          {partners && partners.length > 1 && (
            <div className="-mx-1 flex flex-wrap gap-2" role="group" aria-label="Partner">
              {[{ id: null as string | null, label: "All" }, ...partners.map((p) => ({ id: p.id as string | null, label: p.name.split(" ")[0] }))].map((c) => (
                <button
                  key={c.id ?? "all"}
                  type="button"
                  aria-pressed={filter === c.id}
                  onClick={() => setFilter(c.id)}
                  className={`tap min-h-[44px] rounded-full border px-4 text-sm transition-colors duration-200 ${
                    filter === c.id ? "border-ink bg-ink text-bone" : "border-taupe/25 text-ink hover:border-foil"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          )}

          {visible.map((p) => (
            <section key={p.id} className="flex flex-col gap-3" aria-label={p.name}>
              <div className="flex items-center gap-3">
                <Avatar name={p.name} photoUrl={p.photoUrl} size="md" />
                <p className="font-display text-xl italic leading-tight text-ink">{p.name}</p>
              </div>
              {([["Morning", p.morning], ["Afternoon", p.afternoon]] as const).map(
                ([name, slots]) =>
                  slots.length > 0 && (
                    <div key={name}>
                      <p className="mb-2 text-[11px] uppercase tracking-[0.2em] text-taupe">{name}</p>
                      <div className="flex flex-wrap gap-2">
                        {slots.map((s) => {
                          const on = picked?.partnerId === p.id && picked.slot.start === s.start;
                          return (
                            <button
                              key={s.start}
                              type="button"
                              aria-pressed={on}
                              onClick={() => setPicked({ partnerId: p.id, slot: s })}
                              className={`tap min-h-[44px] min-w-[84px] rounded-md border px-3 text-sm transition-colors duration-200 ${
                                on ? "border-ink bg-ink text-bone" : "border-taupe/25 text-ink hover:border-foil"
                              }`}
                            >
                              {timeLabel(s.start)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ),
              )}
            </section>
          ))}

          {picked && (
            <>
              <input type="hidden" name="partnerId" value={picked.partnerId} />
              <input type="hidden" name="startTime" value={picked.slot.start} />
              <input type="hidden" name="endTime" value={picked.slot.end} />
              {parentBookingId && <input type="hidden" name="parentBookingId" value={parentBookingId} />}
            </>
          )}

          <div className="flex flex-col gap-3 border-t border-taupe/12 pt-5">
            <label className="flex flex-col gap-1.5 text-sm">
              What would you like to bring?
              <textarea
                name="memberContext"
                rows={3}
                maxLength={1000}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="input-field"
              />
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
            </div>

            {state.status === "error" && (
              <p className="text-sm text-clay" role="alert">
                {state.message}
              </p>
            )}
            <ConfirmButton disabled={!picked} />
          </div>
        </form>
      )}
    </Sheet>
  );
}
