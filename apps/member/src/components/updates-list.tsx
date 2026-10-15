import Link from "next/link";
import { Countdown } from "@/components/countdown";
import type { UpdateItem, UpdateKind } from "@/lib/updates";

const ICONS: Record<UpdateKind, React.ReactNode> = {
  hour: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  event: (
    <>
      <rect x="4" y="5.5" width="16" height="14.5" rx="1.5" />
      <path d="M4 10h16M8 3.5v3M16 3.5v3" />
    </>
  ),
  intro: (
    <>
      <circle cx="9" cy="9" r="3" />
      <path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
      <circle cx="17" cy="8.5" r="2.4" />
      <path d="M15.8 14.2c2.4.3 4.2 2.1 4.2 4.8" />
    </>
  ),
  message: <path d="M4 5.5h16v11H9l-4 3.5v-3.5H4Z" />,
  insight: (
    <>
      <path d="M12 3.5c-3 0-5.5 2.3-5.5 5.5 0 2 1 3.2 2 4.2.6.6 1 1.1 1 1.8v1h5v-1c0-.7.4-1.2 1-1.8 1-1 2-2.2 2-4.2 0-3.2-2.5-5.5-5.5-5.5Z" />
      <path d="M9.75 19.5h4.5M10.5 21.5h3" />
    </>
  ),
};

export function UpdatesList({ items }: { items: UpdateItem[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-taupe">You're all caught up.</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {items.map((item, i) => (
        <li key={item.key} className="animate-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
          <Link
            href={item.href}
            className={`card-interactive tap flex items-start gap-4 px-5 py-4 ${
              item.tone === "nudge" ? "!border-foil/40" : ""
            }`}
          >
            <span
              className={`mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${
                item.tone === "nudge" ? "bg-foil/20 text-clay" : "bg-taupe/10 text-ink"
              }`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                {ICONS[item.kind]}
              </svg>
            </span>

            <span className="min-w-0 flex-1">
              {item.tag && (
                <span className="mb-1 inline-block rounded-full bg-foil/15 px-2.5 py-0.5 text-[11px] text-clay">
                  {item.tag}
                </span>
              )}
              <span className="block font-display text-lg italic leading-snug text-ink">{item.title}</span>
              <span className="mt-0.5 block text-sm text-taupe">{item.detail}</span>
            </span>

            {item.startsAt && item.whenText && (
              <span className="mt-1 flex-shrink-0 text-right text-sm font-medium text-clay">
                <Countdown startsAt={item.startsAt} fallback={item.whenText} />
              </span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
