"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useFocusTrap } from "@/lib/use-focus-trap";
import { signOut } from "@/lib/actions/auth";
import { LogoMark } from "@/components/wordmark";
import { UnreadBadge } from "@/components/unread-badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar } from "@/components/avatar";

const POLL_INTERVAL_MS = 30_000;

const NAV_ITEMS = [
  { href: "/home", label: "Home" },
  { href: "/the-hour", label: "The Hour" },
  { href: "/events", label: "Events" },
  { href: "/members", label: "Members" },
  { href: "/insight", label: "Insight" },
  { href: "/messages", label: "Messages" },
  { href: "/notifications", label: "Notifications" },
  { href: "/settings", label: "Settings" },
];

// Behind the profile picture: everything that is not one of the five tabs.
const PROFILE_ITEMS = [
  {
    href: "/notifications",
    label: "Notifications",
    icon: (
      <>
        <path d="M6 10a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5h-15S6 14 6 10Z" />
        <path d="M10 19a2 2 0 0 0 4 0" />
      </>
    ),
  },
  {
    href: "/members",
    label: "Members",
    icon: (
      <>
        <circle cx="9" cy="9" r="3" />
        <path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
        <circle cx="17" cy="8.5" r="2.4" />
        <path d="M15.8 14.2c2.4.3 4.2 2.1 4.2 4.8" />
      </>
    ),
  },
  {
    href: "/settings",
    label: "Settings",
    icon: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 3.5v2.3M12 18.2v2.3M20.5 12h-2.3M5.8 12H3.5M17.7 6.3l-1.6 1.6M7.9 16.1l-1.6 1.6M17.7 17.7l-1.6-1.6M7.9 7.9 6.3 6.3" />
      </>
    ),
  },
];

// The five places a member goes most, in the bar at the bottom of a phone.
const TABS = [
  {
    href: "/the-hour",
    label: "Hour",
    icon: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7.5V12l3 2" />
      </>
    ),
  },
  {
    href: "/events",
    label: "Events",
    icon: (
      <>
        <rect x="4" y="5.5" width="16" height="14.5" rx="1.5" />
        <path d="M4 10h16M8 3.5v3M16 3.5v3" />
      </>
    ),
  },
  {
    href: "/home",
    label: "Home",
    icon: <path d="M4 11 12 4l8 7v8.5a.5.5 0 0 1-.5.5H15v-5H9v5H4.5a.5.5 0 0 1-.5-.5Z" />,
  },
  { href: "/messages", label: "Messages", icon: <path d="M4 5.5h16v11H9l-4 3.5v-3.5H4Z" /> },
  {
    href: "/insight",
    label: "Insight",
    icon: (
      <>
        <path d="M12 3.5c-3 0-5.5 2.3-5.5 5.5 0 2 1 3.2 2 4.2.6.6 1 1.1 1 1.8v1h5v-1c0-.7.4-1.2 1-1.8 1-1 2-2.2 2-4.2 0-3.2-2.5-5.5-5.5-5.5Z" />
        <path d="M9.75 19.5h4.5M10.5 21.5h3" />
      </>
    ),
  },
];

export function NavShell({
  children,
  memberName,
  memberPhotoUrl = null,
  unreadMessages = 0,
  unreadNotifications = 0,
}: {
  children: React.ReactNode;
  memberName: string;
  memberPhotoUrl?: string | null;
  unreadMessages?: number;
  unreadNotifications?: number;
}) {
  const pathname = usePathname();
  const [unread, setUnread] = useState(unreadMessages);
  const [unreadNotifs, setUnreadNotifs] = useState(unreadNotifications);
  const [menuOpen, setMenuOpen] = useState(false);
  const drawer = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  // A conversation fills the screen down to the keyboard, so it has no tab bar.
  const inChat = /^\/messages\/[^/]+/.test(pathname);

  useFocusTrap(drawer, menuOpen, [toggle], true);

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

  // While the profile menu is open, Escape closes it.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

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
              className={`tap group relative flex min-h-[44px] items-center gap-2 rounded-md px-3 py-2 text-sm transition-all duration-300 ease-out ${
                active ? "bg-foil/10 text-ink" : "text-taupe hover:bg-ink/[0.04] hover:text-ink"
              }`}
            >
              <span
                className={`absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-foil transition-all duration-300 ease-out ${
                  active ? "opacity-100" : "opacity-0 group-hover:opacity-30"
                }`}
              />
              <span className="flex-1">{item.label}</span>
              {item.href === "/messages" && <UnreadBadge count={unread} />}
              {item.href === "/notifications" && <UnreadBadge count={unreadNotifs} />}
            </Link>
          );
        })}
      </>
    );
  }

  return (
    <div className="flex min-h-app flex-col md:flex-row">
      {/* Mobile top bar: the wordmark, and the member's own menu at the right. */}
      <div id="mobile-bar" className="sticky top-0 z-40 flex items-center justify-between border-b border-taupe/15 bg-paper/90 px-6 py-2.5 backdrop-blur-md transition-shadow duration-300 md:hidden">
        <Link href="/home" className="flex min-h-[44px] items-center gap-2.5">
          <span className="text-ink">
            <LogoMark className="h-8 w-8" />
          </span>
          <span className="h-4 w-px bg-taupe/30" />
          <span className="font-display text-2xl text-ink">The Table</span>
        </Link>
        <button
          ref={toggle}
          type="button"
          aria-label={menuOpen ? "Close your menu" : "Open your menu"}
          aria-expanded={menuOpen}
          aria-haspopup="true"
          onClick={() => setMenuOpen((v) => !v)}
          className="tap relative -mr-1 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full outline-none focus-visible:outline-none"
        >
          <Avatar name={memberName} photoUrl={memberPhotoUrl} size="md" className="!ring-0 hover:!ring-0" />
          {unreadNotifs > 0 && !menuOpen && (
            <span className="absolute right-0.5 top-1 h-2.5 w-2.5 animate-scale-in rounded-full bg-clay ring-2 ring-paper" />
          )}
        </button>

        {menuOpen && (
          <>
            <div
              ref={drawer}
              role="menu"
              tabIndex={-1}
              className="panel-night outline-none absolute right-4 top-full mt-2 w-[min(18rem,calc(100vw-2rem))] animate-fade-in overflow-hidden !border-0 !shadow-lg"
            >
              <p className="px-5 pb-1 pt-4 text-xs text-taupe">{memberName}</p>
              <nav className="flex flex-col gap-0.5 px-2 pb-2 text-base">
                {PROFILE_ITEMS.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      role="menuitem"
                      onClick={() => setMenuOpen(false)}
                      className={`tap flex min-h-[48px] items-center gap-3 rounded-md px-3 text-sm transition-colors duration-300 ${
                        active ? "bg-foil/10 text-ink" : "text-taupe hover:bg-ink/[0.06] hover:text-ink"
                      }`}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden>
                        {item.icon}
                      </svg>
                      <span className="flex-1">{item.label}</span>
                      {item.href === "/notifications" && <UnreadBadge count={unreadNotifs} />}
                    </Link>
                  );
                })}
                <ThemeToggle className="!min-h-[48px]" />
              </nav>
              <form action={signOut} className="border-t border-taupe/20 p-2">
                <button type="submit" className="tap flex min-h-[48px] w-full items-center gap-3 rounded-md px-3 text-sm text-taupe transition-colors duration-300 hover:bg-ink/[0.06] hover:text-ink">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden>
                    <path d="M14 4.5h4.5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H14M10 8l-4 4 4 4M6 12h9" />
                  </svg>
                  Sign out
                </button>
              </form>
            </div>
          </>
        )}
      </div>

      {menuOpen && <div className="fixed inset-0 z-[35] animate-fade-in backdrop-blur-md md:hidden" onClick={() => setMenuOpen(false)} aria-hidden />}

      {/* The tab bar: five places, always one tap away. Not shown inside a
          conversation, where the message box takes the bottom of the screen. */}
      {!inChat && (
        <nav
          aria-label="Main"
          className="fixed inset-x-0 bottom-0 z-30 rounded-t-xl border-t border-taupe/15 bg-paper/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_24px_rgba(22,22,22,0.06)] backdrop-blur-md md:hidden"
        >
          <ul className="mx-auto flex max-w-md">
            {TABS.map((tab) => {
              const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
              return (
                <li key={tab.href} className="flex-1">
                  <Link
                    href={tab.href}
                    aria-current={active ? "page" : undefined}
                    className={`tap relative flex h-[4.5rem] flex-col items-center justify-center gap-1 text-xs transition-colors duration-300 ${
                      active ? "font-medium text-ink" : "text-taupe"
                    }`}
                  >
                    <span
                      className={`absolute top-0 h-[2px] w-8 rounded-full bg-foil transition-opacity duration-300 ${active ? "opacity-100" : "opacity-0"}`}
                    />
                    <span className="relative">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 1.9 : 1.6} strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7" aria-hidden>
                        {tab.icon}
                      </svg>
                      {tab.href === "/messages" && unread > 0 && (
                        <span className="absolute -right-2 -top-1.5">
                          <UnreadBadge count={unread} />
                        </span>
                      )}
                    </span>
                    {tab.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}

      {/* Desktop sidebar */}
      <aside className="panel-night !rounded-none !border-0 !shadow-none hidden flex-shrink-0 px-4 pb-6 pt-24 md:fixed md:inset-y-0 md:left-0 md:block md:w-60 md:overflow-y-auto">
        <nav className="flex flex-col gap-1">
          <NavLinks />
        </nav>

        <div className="mt-10 border-t border-taupe/12 px-3 pt-5">
          <ThemeToggle className="-ml-3 mb-2" />
          <p className="mb-2 text-xs text-taupe">{memberName}</p>
          <form action={signOut}>
            <button type="submit" className="btn-ghost -ml-3 border border-taupe/20 px-3 py-1.5">
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <main className={`flex-1 px-6 py-10 md:ml-60 md:px-12 md:py-24 ${inChat ? "" : "pb-[calc(6.5rem+env(safe-area-inset-bottom))] md:pb-24"}`}>
        {/* The chat is positioned fixed to the screen, and a transform on an
            ancestor would make it fixed to this wrapper instead (iPhone Safari
            included), so a conversation fades in without moving. */}
        <div key={pathname} className={/^\/messages\/[^/]+/.test(pathname) ? "animate-fade-in" : "animate-fade-up"}>
          {children}
        </div>
      </main>
    </div>
  );
}
