"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

// A brief confirmation pop-up triggered by a query-string flag (e.g.
// ?blasted=1) — shows, then clears the flag from the URL so it doesn't
// reappear on refresh or back-navigation.
//
// With `actionLabel` and `actionHref`, the toast also carries one link. In
// `actionHref`, "{value}" is replaced by the flag's own value (for example
// ?duplicate=abc123 gives "/events/abc123"). Toasts with a link stay longer.
export function Toast({
  param,
  message,
  actionLabel,
  actionHref,
}: {
  param: string;
  message: string;
  actionLabel?: string;
  actionHref?: string;
}) {
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
    }, actionLabel ? 8000 : 3000);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.has(param)]);

  if (!visible) return null;

  const value = searchParams.get(param) ?? "";
  const href = actionHref?.replace("{value}", encodeURIComponent(value));

  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-6 z-50 flex items-center justify-between gap-4 rounded-md bg-ink px-4 py-3 text-sm text-paper shadow-lg md:inset-x-auto md:right-6 md:max-w-md"
    >
      <span>{message}</span>
      {actionLabel && href && (
        <a href={href} className="flex min-h-[44px] flex-shrink-0 items-center font-medium text-orange underline underline-offset-2">
          {actionLabel}
        </a>
      )}
    </div>
  );
}
