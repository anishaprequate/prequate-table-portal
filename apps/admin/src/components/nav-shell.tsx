"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { adminSignOut } from "@/lib/actions/auth";

const POLL_INTERVAL_MS = 30_000;

interface Item {
  href: string;
  label: string;
}

// One shell for every login. On a phone it is a slim top bar with a menu;
// from tablet width up it is the sidebar. Every tap target is 44px or more.
export function NavShell({
  children,
  items,
  adminName,
  roleLabel,
  canChangePassword,
  readOnly,
  unreadMessages = 0,
  unreadNotifications = 0,
}: {
  children: React.ReactNode;
  items: Item[];
  adminName: string;
  roleLabel: string;
  canChangePassword: boolean;
  readOnly?: boolean;
  unreadMessages?: number;
  unreadNotifications?: number;
}) {
  const pathname = usePathname();
  const [unread, setUnread] = useState(unreadMessages);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch("/api/notifications/unread-count");
        if (res.ok) setUnread((await res.json()).count);
      } catch {
        // Offline or a blip: the next poll picks it back up.
      }
    };
    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  // Close the menu on navigation and on Escape; keep the page still behind it.
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  const links = (
    <nav className="flex flex-col gap-1" aria-label="Main">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex min-h-[44px] items-center gap-2 rounded-md px-3 text-sm transition ${
              active ? "bg-ink/[0.04] text-ink" : "text-grey hover:text-ink"
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
  );

  const account = (
    <div className="border-t border-grey/15 pt-4">
      <p className="mb-1 px-3 text-sm text-ink">{adminName}</p>
      <p className="mb-3 px-3 text-xs text-grey">
        {roleLabel}
        {readOnly && <span className="ml-2 rounded-full bg-grey/15 px-2 py-0.5 text-[10px] uppercase tracking-wide">Read only</span>}
      </p>
      {canChangePassword && (
        <Link href="/account" className="flex min-h-[44px] items-center rounded-md px-3 text-sm text-grey hover:text-ink">
          Change password
        </Link>
      )}
      <form action={adminSignOut}>
        <button
          type="submit"
          className="flex min-h-[44px] w-full items-center rounded-md px-3 text-left text-sm text-grey hover:text-ink"
        >
          Sign out
        </button>
      </form>
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Phone: a slim top bar. */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-grey/15 bg-paper/95 px-4 backdrop-blur md:hidden">
        <Link href="/" className="flex min-h-[56px] items-center font-display text-lg italic text-ink">
          Admin
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          aria-expanded={open}
          className="flex h-11 w-11 items-center justify-center rounded-md text-ink"
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
            <path d="M3 6h16M3 11h16M3 16h16" />
          </svg>
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" aria-label="Close menu" onClick={() => setOpen(false)} className="absolute inset-0 bg-ink/30" />
          <div className="absolute inset-y-0 right-0 flex w-[min(20rem,88vw)] flex-col gap-6 overflow-y-auto overscroll-contain bg-paper px-4 pb-8 pt-3 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="font-display text-lg italic text-ink">Menu</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="flex h-11 w-11 items-center justify-center rounded-md text-ink"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
                  <path d="M4 4l12 12M16 4L4 16" />
                </svg>
              </button>
            </div>
            {links}
            {account}
          </div>
        </div>
      )}

      {/* Tablet and desktop: the sidebar. */}
      <aside className="hidden flex-shrink-0 border-grey/15 bg-paper px-4 pb-6 pt-24 md:fixed md:inset-y-0 md:left-0 md:flex md:w-60 md:flex-col md:justify-between md:overflow-y-auto md:border-r">
        {links}
        <div className="mt-10">{account}</div>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-6 md:ml-60 md:px-12 md:py-24">{children}</main>
    </div>
  );
}
