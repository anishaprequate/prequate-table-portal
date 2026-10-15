"use client";

import { useState, useTransition } from "react";
import { saveQuestionReply } from "@/lib/actions/home";
import { useToast } from "@/components/toast";

// A private reply to the dinner's question. Goes to the host partner only.
export function QuestionReply({
  eventId,
  hostFirstName,
  initial,
}: {
  eventId: string;
  hostFirstName: string;
  initial: string | null;
}) {
  const [body, setBody] = useState(initial ?? "");
  const [saved, setSaved] = useState(initial ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData();
    fd.set("eventId", eventId);
    fd.set("body", body);
    setError(null);
    startTransition(async () => {
      const result = await saveQuestionReply(fd);
      if (result.ok) {
        setSaved(body.trim());
        toast(`Sent to ${hostFirstName}.`);
      } else {
        setError(result.error);
      }
    });
  }

  const unchanged = body.trim() === saved.trim();

  return (
    <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
      <label className="sr-only" htmlFor={`reply-${eventId}`}>
        Your reply
      </label>
      <textarea
        id={`reply-${eventId}`}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={4}
        maxLength={2000}
        placeholder="A story from your business."
        className="input-field"
      />
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-taupe">Only {hostFirstName} reads this.</p>
        <button type="submit" disabled={pending || !body.trim() || unchanged} className="btn-primary tap flex-shrink-0 whitespace-nowrap !py-2.5 disabled:opacity-40">
          {saved ? "Update reply" : "Send reply"}
        </button>
      </div>
      {error && <p className="text-xs text-clay" role="alert">{error}</p>}
    </form>
  );
}
