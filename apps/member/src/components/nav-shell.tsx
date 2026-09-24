"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { signOut } from "@/lib/actions/auth";

const POLL_INTERVAL_MS = 30_000;

const NAV_ITEMS = [
  { href: "/home", label: "Home" },
  { href: "/the-hour", label: "The Hour" },
  { href: "/events", label: "Events" },
  { href: "/concierge", label: "Concierge" },
  { href: "/directory", label: "Directory" },
  { href: "/insight", label: "Insight" },
  { href: "/messages", label: "Messages" },
  { href: "/notifications", label: "Notifications" },
  { href: "/settings", label: "Settings" },
];

export function NavShell({
  children,
  memberName,
  unreadMessages = 0,
  unreadNotifications = 0,
}: {
  children: React.ReactNode;
  memberName: string;
  unreadMessages?: number;
  unreadNotifications?: number;
}) {
  const pathname = usePathname();
  const [unread, setUnread] = useState(unreadMessages);
  const [unreadNotifs, setUnreadNotifs] = useState(unreadNotifications);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const poll = async () => {
      try {
        const [messagesRes, notificationsRes] = await Promise.all([
          fetch("/api/messages/unread-count"),
          fetch("/api/notifications/unread-count"),
        ]);
        if (messagesRes.ok) setUnread((await messagesRes.json()).count);
        if (notificationsRes.ok) setUnreadNotifs((await notificationsRes.json()).count);
      } catch {
        // Offline or a blip — next poll will pick it back up.
      }
    };
    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  // Close the drawer on every route change (a nav click, or the browser
  // back/forward button), not just an explicit tap on a link.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
    return (
      <>
        {NAV_ITEMS.map((item) => {
          const active =
            pathname === item.href || (item.href !== "/home" && pathname.startsWith(`${item.href}/`));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
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
              {item.href === "/notifications" && unreadNotifs > 0 && (
                <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-deep-orange px-1 text-[10px] font-medium text-paper">
                  {unreadNotifs}
                </span>
              )}
            </Link>
          );
        })}
      </>
    );
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Mobile top bar */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-grey/15 bg-paper px-6 py-4 md:hidden">
        <span className="font-display text-lg italic text-ink">
          PRE<span className="text-orange">QUATE</span>
        </span>
        <button
          type="button"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          onClick={() => setMenuOpen((v) => !v)}
          className="relative flex h-9 w-9 flex-shrink-0 items-center justify-center text-ink"
        >
          {(unread > 0 || unreadNotifs > 0) && !menuOpen && (
            <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-deep-orange" />
          )}
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            {menuOpen ? (
              <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            ) : (
              <path d="M2.5 5h15M2.5 10h15M2.5 15h15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="fixed inset-0 top-[57px] z-30 flex flex-col justify-between overflow-y-auto bg-paper px-6 py-8 md:hidden">
          <nav className="flex flex-col gap-5 text-base">
            <NavLinks onNavigate={() => setMenuOpen(false)} />
          </nav>
          <div className="mt-10">
            <p className="mb-2 text-xs text-grey">{memberName}</p>
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-md border border-grey/30 px-3 py-1.5 text-xs font-medium text-ink transition hover:border-grey/60"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Desktop sidebar — unchanged */}
      <aside className="hidden flex-shrink-0 border-grey/15 bg-paper px-6 pb-6 pt-24 md:fixed md:inset-y-0 md:left-0 md:block md:w-56 md:overflow-y-auto md:border-r">
        <nav className="flex flex-col gap-2">
          <NavLinks />
        </nav>

        <div className="mt-10">
          <p className="mb-2 text-xs text-grey">{memberName}</p>
          <form action={signOut}>
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
