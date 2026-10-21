"use client";

import { useState, useTransition } from "react";
import { saveTableLine } from "@/lib/actions/home";
import { useToast } from "@/components/toast";

// The member's own sentence about what the table means to them.
export function TableLine({ initial }: { initial: string | null }) {
  const [saved, setSaved] = useState(initial ?? "");
  const [value, setValue] = useState(initial ?? "");
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData();
    fd.set("line", value);
    setError(null);
    startTransition(async () => {
      const result = await saveTableLine(fd);
      if (result.ok) {
        setSaved(value.trim());
        setEditing(false);
        toast("Saved.");
      } else {
        setError(result.error);
      }
    });
  }

  if (!editing) {
    return (
      <div>
        {saved ? (
          <p className="font-display text-xl italic leading-snug text-ink">&ldquo;{saved}&rdquo;</p>
        ) : (
          <p className="text-sm text-taupe">What does the table mean to you? A sentence is enough.</p>
        )}
        <button type="button" onClick={() => setEditing(true)} className="btn-ghost tap -ml-3 mt-1 min-w-[44px]">
          {saved ? "Edit" : "Write it"}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <label className="sr-only" htmlFor="table-line">
        What the table means to you
      </label>
      <textarea
        id="table-line"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={3}
        maxLength={240}
        autoFocus
        className="input-field"
        placeholder="What the table means to you"
      />
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="btn-primary tap !py-2.5 disabled:opacity-50">
          Save
        </button>
        <button
          type="button"
          onClick={() => {
            setValue(saved);
            setEditing(false);
            setError(null);
          }}
          className="btn-ghost tap"
        >
          Cancel
        </button>
        <span className="ml-auto text-[11px] text-taupe">{value.length}/240</span>
      </div>
      {error && <p className="text-xs text-gold" role="alert">{error}</p>}
    </form>
  );
}
