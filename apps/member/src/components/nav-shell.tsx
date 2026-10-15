"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useFocusTrap } from "@/lib/use-focus-trap";
import { signOut } from "@/lib/actions/auth";
import { LogoMark } from "@/components/wordmark";
import { UnreadBadge } from "@/components/unread-badge";

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
  const drawer = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);

  // A closed drawer must not be reachable by keyboard or screen reader. This
  // runs before the focus trap so the drawer is no longer inert when the
  // trap moves focus into it.
  useEffect(() => {
    drawer.current?.toggleAttribute("inert", !menuOpen);
  }, [menuOpen]);
  useFocusTrap(drawer, menuOpen, [toggle]);

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

  // While the drawer is open: Escape closes it, and the page behind it
  // stops scrolling.
  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
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
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Mobile top bar */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-taupe/12 bg-bone/90 px-6 py-4 backdrop-blur-md transition-shadow duration-300 md:hidden">
        <Link href="/" className="flex min-h-[44px] items-center gap-2.5">
          <span className="text-ink">
            <LogoMark className="h-4 w-4" />
          </span>
          <span className="h-3.5 w-px bg-taupe/30" />
          <span className="font-display text-base text-ink">The Table</span>
        </Link>
        <button
          ref={toggle}
          type="button"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
          className="tap relative -mr-2 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-md text-ink transition-colors duration-300 hover:bg-ink/5"
        >
          {(unread > 0 || unreadNotifs > 0) && !menuOpen && (
            <span className="absolute right-1.5 top-1.5 h-2 w-2 animate-scale-in rounded-full bg-clay" />
          )}
          <span className="relative block h-3.5 w-5" aria-hidden="true">
            <span
              className={`absolute left-0 block h-[1.6px] w-5 rounded-full bg-current transition-all duration-[250ms] ease-out ${
                menuOpen ? "top-1/2 -translate-y-1/2 rotate-45" : "top-0"
              }`}
            />
            <span
              className={`absolute left-0 top-1/2 block h-[1.6px] w-5 -translate-y-1/2 rounded-full bg-current transition-all duration-[250ms] ease-out ${
                menuOpen ? "scale-x-0 opacity-0" : "opacity-100"
              }`}
            />
            <span
              className={`absolute left-0 block h-[1.6px] w-5 rounded-full bg-current transition-all duration-[250ms] ease-out ${
                menuOpen ? "bottom-1/2 translate-y-1/2 -rotate-45" : "bottom-0"
              }`}
            />
          </span>
        </button>
      </div>

      {/* Mobile drawer */}
      <div
        className={`fixed inset-0 z-30 md:hidden ${menuOpen ? "" : "pointer-events-none"}`}
        aria-hidden={!menuOpen}
      >
        <div
          className={`absolute inset-0 bg-ink/20 backdrop-blur-sm transition-opacity duration-300 ease-out ${
            menuOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setMenuOpen(false)}
        />
        <div
          ref={drawer}
          className={`absolute inset-y-0 left-0 flex w-[82%] max-w-xs flex-col justify-between overflow-y-auto bg-bone px-6 pb-8 pt-[73px] shadow-lg transition-transform duration-[300ms] ease-out ${
            menuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <nav className="flex flex-col gap-1 pt-4 text-base">
            <NavLinks onNavigate={() => setMenuOpen(false)} />
          </nav>
          <div className="mt-10 border-t border-taupe/12 pt-5">
            <p className="mb-2 text-xs text-taupe">{memberName}</p>
            <form action={signOut}>
              <button type="submit" className="btn-secondary w-full text-xs">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden flex-shrink-0 border-taupe/12 bg-bone px-4 pb-6 pt-24 md:fixed md:inset-y-0 md:left-0 md:block md:w-60 md:overflow-y-auto md:border-r">
        <nav className="flex flex-col gap-1">
          <NavLinks />
        </nav>

        <div className="mt-10 border-t border-taupe/12 px-3 pt-5">
          <p className="mb-2 text-xs text-taupe">{memberName}</p>
          <form action={signOut}>
            <button type="submit" className="btn-ghost -ml-3 border border-taupe/20 px-3 py-1.5">
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 px-6 py-10 md:ml-60 md:px-12 md:py-24">
        <div key={pathname} className="animate-fade-up">
          {children}
        </div>
      </main>
    </div>
  );
}
