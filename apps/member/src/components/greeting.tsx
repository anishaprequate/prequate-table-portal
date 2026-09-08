"use client";

import { useEffect, useState } from "react";

function greetingForHour(hour: number): string {
  if (hour < 12) return "Good morning,";
  if (hour < 17) return "Good afternoon,";
  return "Good evening,";
}

// Renders with the server's best guess first (avoids a layout jump), then
// corrects to the visitor's own device clock right after mount — since the
// server has no idea what timezone the member is actually in.
export function Greeting({ fallback }: { fallback: string }) {
  const [text, setText] = useState(fallback);

  useEffect(() => {
    setText(greetingForHour(new Date().getHours()));
  }, []);

  return <>{text}</>;
}
