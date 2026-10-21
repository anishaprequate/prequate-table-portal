"use client";

import { useFormStatus } from "react-dom";

// Save as draft and Publish. Once either is tapped, both lock until the page
// moves on, so a slow phone connection and a second tap cannot create the
// event twice.
export function EventSubmitButtons() {
  const { pending, data } = useFormStatus();
  const chosen = data?.get("intent");

  return (
    <div className="flex flex-wrap gap-3">
      <button
        type="submit"
        name="intent"
        value="draft"
        disabled={pending}
        className="min-h-[44px] rounded-md border border-grey/30 px-5 py-3 text-sm font-medium text-ink transition hover:border-grey/60 disabled:opacity-50"
      >
        {pending && chosen === "draft" ? "Saving…" : "Save as draft"}
      </button>
      <button
        type="submit"
        name="intent"
        value="publish"
        disabled={pending}
        className="min-h-[44px] rounded-md bg-ink px-5 py-3 text-sm font-medium text-paper transition hover:bg-ink/90 disabled:opacity-50"
      >
        {pending && chosen === "publish" ? "Publishing…" : "Publish"}
      </button>
    </div>
  );
}
