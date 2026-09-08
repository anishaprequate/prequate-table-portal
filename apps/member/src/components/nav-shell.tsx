"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/lib/actions/auth";

const NAV_ITEMS = [
  { href: "/home", label: "Home" },
  { href: "/the-hour", label: "The Hour" },
  { href: "/events", label: "Events" },
  { href: "/concierge", label: "Concierge" },
  { href: "/directory", label: "Directory" },
  { href: "/insight", label: "Insight" },
  { href: "/messages", label: "Messages" },
  { href: "/profile", label: "Profile" },
  { href: "/settings", label: "Settings" },
];

export function NavShell({
  children,
  memberName,
  unreadMessages = 0,
}: {
  children: React.ReactNode;
  memberName: string;
  unreadMessages?: number;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="sticky top-0 z-40 flex-shrink-0 border-b border-grey/15 bg-paper px-6 pb-6 pt-20 md:fixed md:inset-y-0 md:left-0 md:w-56 md:overflow-y-auto md:border-b-0 md:border-r md:pt-24">
        <nav className="flex flex-row flex-wrap gap-x-5 gap-y-2 md:flex-col md:gap-2">
          {NAV_ITEMS.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/home" && pathname.startsWith(`${item.href}/`));
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
                {item.href === "/messages" && unreadMessages > 0 && (
                  <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-deep-orange px-1 text-[10px] font-medium text-paper">
                    {unreadMessages}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="mt-10 hidden md:block">
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
