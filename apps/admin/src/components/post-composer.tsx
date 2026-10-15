"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { postHourNote, type PostState } from "@/lib/actions/partner";

// A line under the chips says what each one is for.
const KINDS = [
  { value: "NOTES", label: "Meeting notes", hint: "What was discussed and what was decided." },
  { value: "BRIEF", label: "Brief", hint: "A summary or briefing for the member to keep." },
  { value: "OBSERVATION", label: "Follow-up", hint: "A short observation or next step after the Hour." },
  { value: "FILE", label: "File", hint: "A document for the member. Add a line about it if you like." },
] as const;

function PostButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-[44px] w-full rounded-md bg-ink px-5 py-3 text-sm font-medium text-paper transition hover:bg-ink/90 disabled:opacity-50"
    >
      {pending ? "Posting…" : "Post"}
    </button>
  );
}

// Post after an Hour: pick what it is, write or attach, post. Opens in place,
// so a partner can do it from a phone in under a minute.
export function PostComposer({ bookingId, startOpen = false }: { bookingId: string; startOpen?: boolean }) {
  const [open, setOpen] = useState(startOpen);
  const [state, action] = useFormState<PostState, FormData>(postHourNote, { status: "idle" });
  const [kind, setKind] = useState<string>("NOTES");
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // After a successful post, clear the form but leave the confirmation showing.
  useEffect(() => {
    if (state.status === "ok") {
      formRef.current?.reset();
      setFileName(null);
      setKind("NOTES");
      if (!startOpen) setOpen(false);
    }
  }, [state]);

  if (!open) {
    return (
      <div className="flex flex-col gap-2">
        {state.status === "ok" && <p className="text-sm text-ink" role="status">{state.message}</p>}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="min-h-[44px] w-full rounded-md border border-grey/30 px-4 py-2 text-sm font-medium text-ink transition hover:border-grey/60"
        >
          {state.status === "ok" ? "Post something else" : "Post notes"}
        </button>
      </div>
    );
  }

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-3">
      {state.status === "ok" && (
        <p className="text-sm text-ink" role="status">
          {state.message}
        </p>
      )}
      <input type="hidden" name="bookingId" value={bookingId} />

      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="What are you posting?">
        {KINDS.map((k) => (
          <label
            key={k.value}
            className={`flex min-h-[44px] cursor-pointer items-center rounded-full border px-4 text-sm transition ${
              kind === k.value ? "border-ink bg-ink text-paper" : "border-grey/30 text-ink hover:border-grey/60"
            }`}
          >
            <input
              type="radio"
              name="kind"
              value={k.value}
              checked={kind === k.value}
              onChange={() => setKind(k.value)}
              className="sr-only"
            />
            {k.label}
          </label>
        ))}
      </div>

      <p className="text-xs text-grey" aria-live="polite">
        {KINDS.find((k) => k.value === kind)?.hint}
      </p>

      <label className="sr-only" htmlFor={`note-${bookingId}`}>
        What would you like the member to see?
      </label>
      <textarea
        id={`note-${bookingId}`}
        name="content"
        rows={5}
        maxLength={8000}
        placeholder={kind === "FILE" ? "A line about the file (optional)" : "What would you like the member to see?"}
        className="w-full rounded-md border border-grey/30 bg-paper px-3 py-3 text-base text-ink md:text-sm"
      />

      <div className="flex items-center gap-3">
        <input
          ref={fileInput}
          type="file"
          name="file"
          className="sr-only"
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
        />
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          className="min-h-[44px] flex-shrink-0 rounded-md border border-grey/30 px-4 py-2 text-sm text-ink transition hover:border-grey/60"
        >
          {fileName ? "Change file" : "Attach a file"}
        </button>
        <span className="min-w-0 truncate text-xs text-grey">{fileName ?? "Optional"}</span>
      </div>

      {state.status === "error" && (
        <p className="text-sm text-deep-orange" role="alert">
          {state.message}
        </p>
      )}
      <PostButton />
    </form>
  );
}
