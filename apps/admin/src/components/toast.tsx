"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

// A brief confirmation pop-up triggered by a query-string flag (e.g.
// ?blasted=1) — shows, then clears the flag from the URL so it doesn't
// reappear on refresh or back-navigation.
export function Toast({ param, message }: { param: string; message: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!searchParams.has(param)) return;
    setVisible(true);
    const timeout = setTimeout(() => {
      setVisible(false);
      const params = new URLSearchParams(searchParams.toString());
      params.delete(param);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    }, 3000);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.has(param)]);

  if (!visible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 rounded-md bg-ink px-4 py-3 text-sm text-paper shadow-lg">
      {message}
    </div>
  );
}
