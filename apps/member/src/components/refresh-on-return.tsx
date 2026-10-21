"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Home shows live counts (the badges on the dial). The browser's back button
// and the app's own navigation can bring Home back from a saved copy, so a
// badge cleared on another screen would still show. Arriving here again in the
// same session, or returning to the tab, fetches Home afresh.
let hasMountedOnce = false;

export function RefreshOnReturn() {
  const router = useRouter();

  useEffect(() => {
    if (hasMountedOnce) router.refresh();
    hasMountedOnce = true;

    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) router.refresh();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    window.addEventListener("pageshow", onShow);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("pageshow", onShow);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router]);

  return null;
}
