"use client";

import { useEffect, useState } from "react";

// The one-Hour-a-month rule, said once and quietly, not as a warning.
export function HourRule() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem("table.hourRuleSeen")) return;
      localStorage.setItem("table.hourRuleSeen", "1");
    } catch {
      // Storage blocked: showing it every time is fine.
    }
    setShow(true);
  }, []);

  if (!show) return null;
  return (
    <p className="mb-6 text-xs leading-relaxed text-taupe animate-fade-in">
      One Hour each calendar month. An Hour not taken by the end of the month does not carry over.
    </p>
  );
}
