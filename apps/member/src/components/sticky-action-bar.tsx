"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

// A bar fixed to the bottom of the screen on a phone. It renders into
// document.body because the page content sits inside an animated wrapper,
// and a transform on an ancestor makes `position: fixed` stick to that
// wrapper instead of the screen.
export function StickyActionBar({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-x-0 bottom-0 z-20 rounded-t-xl border-t border-taupe/15 bg-bone/95 px-5 pb-3 pt-3 max-md:bottom-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
      <div className="mx-auto max-w-2xl">{children}</div>
    </div>,
    document.body,
  );
}
