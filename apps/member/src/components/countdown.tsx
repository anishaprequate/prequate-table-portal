"use client";

import { useEffect, useState } from "react";
import { formatRelative } from "@/lib/relative-time";

// "in 2 days", refreshed every minute. The server passes its own reading as
// the starting text, so the first paint matches and nothing jumps.
export function Countdown({ startsAt, fallback }: { startsAt: string; fallback: string }) {
  const [text, setText] = useState(fallback);

  useEffect(() => {
    const target = new Date(startsAt).getTime();
    const tick = () => setText(formatRelative(target));
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [startsAt]);

  return <>{text}</>;
}
