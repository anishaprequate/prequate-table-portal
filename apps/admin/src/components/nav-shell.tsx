"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { adminSignOut } from "@/lib/actions/auth";

const POLL_INTERVAL_MS = 30_000;

const FULL_ADMIN_NAV = [
  { href: "/members", label: "Members" },
  { href: "/bookings", label: "Bookings" },
  { href: "/events", label: "Events" },
  { href: "/concierge", label: "Concierge" },
  { href: "/introductions", label: "Introductions" },
  { href: "/insight", label: "Insight" },
  { href: "/messages", label: "Messages" },
  { href: "/notifications", label: "Notifications" },
  { href: "/reports", label: "Reports" },
  { href: "/settings", label: "Settings" },
];

// Owner-only, appended to FULL_ADMIN_NAV when isOwner is true.
const OWNER_ONLY_NAV = [{ href: "/activity", label: "Activity" }];

const PARTNER_NAV = [
  { href: "/bookings", label: "My bookings" },
  { href: "/insight", label: "Insight" },
  { href: "/messages", label: "Messages" },
  { href: "/reports", label: "Reports" },
  { href: "/settings/canned-responses", label: "Canned responses" },
];

export function NavShell({
  children,
  adminName,
  isFullAdmin,
  isOwner,
  readOnly,
  unreadMessages = 0,
  unreadNotifications = 0,
}: {
  children: React.ReactNode;
  adminName: string;
  isFullAdmin: boolean;
  isOwner?: boolean;
  readOnly?: boolean;
  unreadMessages?: number;
  unreadNotifications?: number;
}) {
  const pathname = usePathname();
  const NAV_ITEMS = isFullAdmin ? [...FULL_ADMIN_NAV, ...(isOwner ? OWNER_ONLY_NAV : [])] : PARTNER_NAV;
  const [unread, setUnread] = useState(unreadMessages);

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch("/api/notifications/unread-count");
        if (res.ok) setUnread((await res.json()).count);
      } catch {
        // Offline or a blip — next poll will pick it back up.
      }
    };
    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="sticky top-0 z-40 flex-shrink-0 border-b border-grey/15 bg-paper px-6 pb-6 pt-20 md:fixed md:inset-y-0 md:left-0 md:w-56 md:overflow-y-auto md:border-b-0 md:border-r md:pt-24">
        <nav className="flex flex-row flex-wrap gap-x-5 gap-y-2 md:flex-col md:gap-2">
          {NAV_ITEMS.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 text-sm transition ${
                  active ? "text-ink" : "text-grey hover:text-ink"
                }`}
              >
                {active && <span className="h-1.5 w-1.5 rounded-full bg-orange" />}
                {item.label}
                {item.href === "/messages" && unread > 0 && (
                  <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-deep-orange px-1 text-[10px] font-medium text-paper">
                    {unread}
                  </span>
                )}
                {item.href === "/notifications" && unreadNotifications > 0 && (
                  <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-deep-orange px-1 text-[10px] font-medium text-paper">
                    {unreadNotifications}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="mt-10 hidden md:block">
          <p className="mb-2 text-xs text-grey">
            {adminName}
            {readOnly && (
              <span className="ml-2 rounded-full bg-grey/15 px-2 py-0.5 text-[10px] uppercase tracking-wide text-grey">
                Read only
              </span>
            )}
          </p>
          <form action={adminSignOut}>
            <button
              type="submit"
              className="rounded-md border border-grey/30 px-3 py-1.5 text-xs font-medium text-ink transition hover:border-grey/60"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 px-6 py-10 md:ml-56 md:px-12 md:py-24">{children}</main>
    </div>
  );
}
