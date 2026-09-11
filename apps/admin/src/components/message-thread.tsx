"use client";

import { useEffect, useRef, useState } from "react";

const POLL_INTERVAL_MS = 15_000;

type Message = { id: string; senderRole: string; body: string; createdAt: string; read: boolean };

// WhatsApp-style sent/read ticks, shown only on this side's own outgoing
// messages — a single grey check once sent, a double orange check once
// the member has actually opened the thread.
function ReadTicks({ read }: { read: boolean }) {
  return (
    <svg width="16" height="11" viewBox="0 0 16 11" className={`inline-block ${read ? "text-orange" : "text-grey"}`}>
      <path d="M1 5.5L4 8.5L10 1.5" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {read && (
        <path d="M6 5.5L9 8.5L15 1.5" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
}

export function MessageThread({
  initialMessages,
  memberId,
}: {
  initialMessages: Message[];
  memberId: string;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const lastCreatedAt = useRef(initialMessages.at(-1)?.createdAt ?? new Date(0).toISOString());
  const bottomRef = useRef<HTMLDivElement>(null);

  // Jump to the latest message on open, and again whenever the list grows
  // (a poll landing, or the page refreshing after this member sends one).
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(
          `/api/messages/poll?memberId=${encodeURIComponent(memberId)}&since=${encodeURIComponent(lastCreatedAt.current)}`,
        );
        if (!res.ok) return;
        const { messages: fresh } = (await res.json()) as { messages: Message[] };
        if (fresh.length > 0) {
          setMessages((prev) => [...prev, ...fresh]);
          lastCreatedAt.current = fresh.at(-1)!.createdAt;
        }
      } catch {
        // Offline or a blip — next poll will pick it back up.
      }
    };
    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [memberId]);

  return (
    <div className="mb-8 flex flex-col gap-4">
      {messages.length === 0 && <p className="text-sm text-grey">No messages yet.</p>}
      {messages.map((message) => (
        <div key={message.id} className={message.senderRole !== "MEMBER" ? "text-right" : ""}>
          <p
            className={`inline-block max-w-sm rounded-md px-3 py-2 text-left text-sm ${
              message.senderRole !== "MEMBER" ? "bg-ink text-paper" : "bg-orange/10 text-ink"
            }`}
          >
            {message.body}
          </p>
          <p
            className={`mt-1 flex items-center gap-1 text-xs text-grey ${
              message.senderRole !== "MEMBER" ? "justify-end" : ""
            }`}
          >
            {message.senderRole !== "MEMBER" && <ReadTicks read={message.read} />}
            {new Intl.DateTimeFormat("en-IN", {
              weekday: "short",
              day: "numeric",
              month: "short",
              hour: "numeric",
              minute: "2-digit",
            }).format(new Date(message.createdAt))}
          </p>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
