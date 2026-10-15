"use client";

import { useState, useTransition } from "react";
import { Sheet } from "@/components/sheet";
import { useToast } from "@/components/toast";
import { createTableRequest, requestIntroductionQuick } from "@/lib/actions/home";
import { PlaceSearch, type PickedPlace } from "./place-search";

type Kind = "INTRODUCTION" | "BRIEF" | "PEER_HOUR" | "RESTAURANT";

const KINDS: { kind: Kind; label: string; hint: string; title: string; toast: string }[] = [
  { kind: "INTRODUCTION", label: "An introduction", hint: "To a member", title: "Ask for an introduction", toast: "Your introduction request is with us." },
  { kind: "BRIEF", label: "A brief", hint: "For a partner", title: "Send a brief", toast: "Your brief is with us." },
  { kind: "PEER_HOUR", label: "A peer Hour", hint: "With another member", title: "Ask for a peer Hour", toast: "Your request is with us." },
  { kind: "RESTAURANT", label: "A reservation", hint: "A table somewhere good", title: "Ask for a reservation", toast: "Your request is with us." },
];

// Four things a member can ask the table for. Each opens a short sheet and
// lands with the team: introductions in Introductions, the rest in Requests.
export function AskTheTable({ people }: { people: { id: string; name: string }[] }) {
  const [open, setOpen] = useState<Kind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [place, setPlace] = useState<PickedPlace | null>(null);
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  const current = KINDS.find((k) => k.kind === open) ?? null;

  function close() {
    setOpen(null);
    setError(null);
    setPlace(null);
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!current) return;
    const fd = new FormData(e.currentTarget);
    if (current.kind === "RESTAURANT" && !place?.name) {
      setError("Choose a place from the suggestions, or tap \"Can't find it? Type it in\".");
      return;
    }
    setError(null);
    startTransition(async () => {
      let result;
      if (current.kind === "INTRODUCTION") {
        result = await requestIntroductionQuick(fd);
      } else {
        fd.set("type", current.kind);
        if (current.kind === "RESTAURANT") {
          fd.set("place", place?.name ?? "");
          fd.set("branch", place?.address ?? "");
          fd.set("placeId", place?.placeId ?? "");
        }
        result = await createTableRequest(fd);
      }
      if (result.ok) {
        close();
        toast(current.toast);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        {KINDS.map((k) => (
          <button
            key={k.kind}
            type="button"
            onClick={() => setOpen(k.kind)}
            className="tap flex min-h-[64px] flex-col items-start justify-center rounded-lg border border-taupe/15 px-4 py-3 text-left transition-colors duration-300 hover:border-foil/50 hover:bg-foil/5"
          >
            <span className="text-sm text-ink">{k.label}</span>
            <span className="text-[11px] text-taupe">{k.hint}</span>
          </button>
        ))}
      </div>

      <Sheet open={current !== null} onClose={close} title={current?.title}>
        {current && (
          <form onSubmit={submit} className="flex flex-col gap-4">
            {current.kind === "INTRODUCTION" && (
              <label className="flex flex-col gap-1.5 text-sm">
                Who would you like to meet?
                <select name="targetId" required defaultValue="" className="input-field">
                  <option value="" disabled>
                    Choose a member
                  </option>
                  {people.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {current.kind === "RESTAURANT" && (
              <>
                <PlaceSearch value={place} onChange={setPlace} />
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1.5 text-sm">
                    When
                    <input type="text" name="when" placeholder="Friday, 8 pm" className="input-field" />
                  </label>
                  <label className="flex flex-col gap-1.5 text-sm">
                    People
                    <input type="text" name="people" placeholder="4" inputMode="numeric" className="input-field" />
                  </label>
                </div>
              </>
            )}

            <label className="flex flex-col gap-1.5 text-sm">
              {current.kind === "INTRODUCTION"
                ? "Why this person (optional)"
                : current.kind === "BRIEF"
                  ? "What should the partner know?"
                  : current.kind === "PEER_HOUR"
                    ? "Who, or what would you like to work through?"
                    : "Anything else we should know (optional)"}
              <textarea
                name={current.kind === "INTRODUCTION" ? "message" : "details"}
                rows={4}
                maxLength={2000}
                required={current.kind === "BRIEF" || current.kind === "PEER_HOUR"}
                className="input-field"
              />
            </label>

            {error && <p className="text-xs text-clay" role="alert">{error}</p>}
            <button type="submit" disabled={pending} className="btn-primary tap w-full disabled:opacity-50">
              {pending ? "Sending…" : "Send"}
            </button>
          </form>
        )}
      </Sheet>
    </>
  );
}
