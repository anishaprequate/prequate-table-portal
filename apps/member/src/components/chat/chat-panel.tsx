"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { sendChatMessage } from "@/lib/actions/messages";
import { useToast } from "@/components/toast";
import { shortSlot } from "@/lib/stable-date";

const POLL_INTERVAL_MS = 15_000;

type Message = { id: string; senderRole: string; body: string; createdAt: string; read: boolean };

// Sent and read ticks, on this member's own messages only.
function ReadTicks({ read }: { read: boolean }) {
  return (
    <svg width="16" height="11" viewBox="0 0 16 11" className={`inline-block ${read ? "text-foil" : "text-taupe"}`}>
      <path d="M1 5.5L4 8.5L10 1.5" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {read && <path d="M6 5.5L9 8.5L15 1.5" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />}
    </svg>
  );
}

const stamp = (iso: string) => shortSlot(new Date(iso));

// The whole conversation. On a phone it fills exactly the visible screen under
// the top bar: the thread scrolls, the box stays at the bottom, and when the
// keyboard rises the box rides up on top of it. iPhone Safari does not shrink the
// page for the keyboard, so the height is taken from the visual viewport.
// On a computer it sits in the page as before.
export function ChatPanel({
  title,
  subtitle,
  placeholder,
  partnerKey,
  initialMessages,
}: {
  title: string;
  subtitle: string;
  placeholder: string;
  partnerKey: string; // "rm" or a partner's id
  initialMessages: Message[];
}) {
  const toast = useToast();
  const frame = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLTextAreaElement>(null);
  const lastCreatedAt = useRef(initialMessages.at(-1)?.createdAt ?? new Date(0).toISOString());
  const [messages, setMessages] = useState(initialMessages);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const toBottom = useCallback(() => {
    const el = list.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  // Fit the frame to the visible screen, and keep it fitted as the keyboard comes
  // and goes. Only on phones: from 768px up the CSS layout does the work.
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const fit = () => {
      const el = frame.current;
      if (!el) return;
      if (!mq.matches) {
        el.removeAttribute("style");
        return;
      }
      const vv = window.visualViewport;
      const bar = document.getElementById("mobile-bar")?.offsetHeight ?? 0;
      const top = (vv?.offsetTop ?? 0) + bar;
      const height = (vv?.height ?? window.innerHeight) - bar;
      el.style.position = "fixed";
      el.style.left = "0";
      el.style.right = "0";
      el.style.top = `${top}px`;
      el.style.height = `${Math.max(height, 200)}px`;
      toBottom();
    };
    fit();
    const vv = window.visualViewport;
    vv?.addEventListener("resize", fit);
    vv?.addEventListener("scroll", fit);
    window.addEventListener("resize", fit);
    mq.addEventListener("change", fit);
    // iPhone can nudge the page up when the box takes focus; put it back.
    const reset = () => window.scrollTo(0, 0);
    box.current?.addEventListener("focus", reset);
    const textarea = box.current;
    return () => {
      vv?.removeEventListener("resize", fit);
      vv?.removeEventListener("scroll", fit);
      window.removeEventListener("resize", fit);
      mq.removeEventListener("change", fit);
      textarea?.removeEventListener("focus", reset);
    };
  }, [toBottom]);

  // The latest message is always in view: on open, and whenever one arrives or is sent.
  useLayoutEffect(() => {
    toBottom();
  }, [messages.length, toBottom]);

  // New messages from the team, every 15 seconds while the screen is showing.
  useEffect(() => {
    const poll = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch(
          `/api/messages/poll?partnerId=${encodeURIComponent(partnerKey)}&since=${encodeURIComponent(lastCreatedAt.current)}`,
        );
        if (!res.ok) return;
        const { messages: fresh } = (await res.json()) as { messages: Message[] };
        if (fresh.length > 0) {
          setMessages((prev) => [...prev, ...fresh.filter((f) => !prev.some((p) => p.id === f.id))]);
          lastCreatedAt.current = fresh.at(-1)!.createdAt;
        }
      } catch {
        // Offline or a blip: the next poll picks it back up.
      }
    };
    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [partnerKey]);

  // The box grows with what is typed, up to about five lines.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 132)}px`;
  }, [text]);

  async function send() {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setText("");
    // Keep the keyboard up: focus is held inside this tap.
    box.current?.focus();
    const temp: Message = { id: `tmp-${Date.now()}`, senderRole: "MEMBER", body, createdAt: new Date().toISOString(), read: false };
    setMessages((prev) => [...prev, temp]);
    const res = await sendChatMessage(partnerKey, body);
    if (res.ok) {
      lastCreatedAt.current = res.createdAt > lastCreatedAt.current ? res.createdAt : lastCreatedAt.current;
      setMessages((prev) => prev.map((m) => (m.id === temp.id ? { ...m, id: res.id, createdAt: res.createdAt } : m)));
    } else {
      setMessages((prev) => prev.filter((m) => m.id !== temp.id));
      setText(body);
      toast("That did not send. Try again.");
    }
    setSending(false);
  }

  return (
    <div
      ref={frame}
      className="z-30 flex flex-col bg-bone md:relative md:z-auto md:h-[calc(100dvh-12rem)] md:max-w-lg"
      style={{ height: "calc(100dvh - 4.75rem)" }}
    >
      <div className="flex flex-shrink-0 items-center gap-2 border-b border-taupe/10 px-4 pb-3 pt-3 md:items-start md:border-0 md:px-0 md:pt-0">
        <Link
          href="/messages"
          aria-label="Back to messages"
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-md text-taupe transition-colors duration-300 hover:bg-ink/5 hover:text-ink md:-ml-2"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12.5 4.5L6 10l6.5 5.5" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <div className="min-w-0">
          <h1 className="truncate font-display text-2xl italic leading-tight text-ink md:text-5xl">{title}</h1>
          <p className="hidden text-sm text-taupe md:block">{subtitle}</p>
        </div>
      </div>

      <div ref={list} className="flex flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-4 py-4 md:px-0">
        {messages.length === 0 && <p className="text-sm text-taupe">Nothing here yet. Say hello.</p>}
        {messages.map((m) => {
          const mine = m.senderRole === "MEMBER";
          return (
            <div key={m.id} className={mine ? "text-right" : ""}>
              <p
                className={`inline-block max-w-[85%] whitespace-pre-wrap break-words rounded-lg px-3.5 py-2.5 text-left text-sm shadow-sm ${
                  mine ? "bg-ink text-bone" : "bg-foil/10 text-ink"
                }`}
              >
                {m.body}
              </p>
              <p className={`mt-1 flex items-center gap-1 text-xs text-taupe ${mine ? "justify-end" : ""}`}>
                {mine && <ReadTicks read={m.read} />}
                {stamp(m.createdAt)}
              </p>
            </div>
          );
        })}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex flex-shrink-0 items-end gap-2 border-t border-taupe/10 bg-bone px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 md:border-0 md:px-0 md:pb-0"
      >
        <textarea
          ref={box}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={1}
          maxLength={4000}
          enterKeyHint="send"
          placeholder={placeholder}
          aria-label="Your message"
          className="input-field max-h-[132px] min-h-[44px] w-full flex-1 resize-none !py-2.5"
          onKeyDown={(e) => {
            // A computer sends on Enter. On a phone, Return makes a new line and the button sends.
            if (e.key === "Enter" && !e.shiftKey && window.matchMedia("(pointer: fine)").matches) {
              e.preventDefault();
              send();
            }
          }}
        />
        <button
          type="submit"
          aria-label="Send"
          disabled={!text.trim()}
          onMouseDown={(e) => e.preventDefault()}
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-foil text-night shadow-sm transition-all duration-300 ease-out hover:bg-clay hover:text-bone disabled:opacity-40"
        >
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
            <path d="M10 15.5V4.5M10 4.5L4.5 10M10 4.5L15.5 10" stroke="currentColor" strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </form>
    </div>
  );
}
