"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// The seat mark: the ring is the table, the eight dots are the seats, the
// gold seat is the member's. Per The Table's identity spec — on paper it
// would be blind-embossed, on ink gold-foiled; on screen the seven "empty"
// seats stay currentColor and only the member's seat carries foil gold.
const SEATS = [
  { cx: 50, cy: 18 }, // N
  { cx: 72.6, cy: 27.4 }, // NE
  { cx: 82, cy: 50 }, // E
  { cx: 72.6, cy: 72.6 }, // SE
  { cx: 50, cy: 82 }, // S
  { cx: 27.4, cy: 72.6 }, // SW
  { cx: 18, cy: 50 }, // W
  { cx: 27.4, cy: 27.4 }, // NW — the member's seat, in foil
];

export function LogoMark({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="20" stroke="currentColor" strokeWidth="2" />
      {SEATS.map((seat, i) => (
        <circle
          key={i}
          cx={seat.cx}
          cy={seat.cy}
          r="3.6"
          fill={i === SEATS.length - 1 ? "#C9A455" : "currentColor"}
        />
      ))}
    </svg>
  );
}

// Fixed to the corner on a wide screen. Inside the app it sits on the dark
// sidebar; on the sign-in screens there is no sidebar, so it sits on the page.
export function Wordmark() {
  const pathname = usePathname();
  const outside = pathname === "/" || pathname.startsWith("/login") || pathname.startsWith("/arrive");
  return (
    <Link
      href="/"
      className={`pointer-events-auto fixed left-0 top-0 z-50 hidden min-h-[48px] items-center gap-2.5 px-6 py-4 transition-opacity duration-300 hover:opacity-70 md:flex ${
        outside ? "bg-paper/80 backdrop-blur-md" : "panel-night !rounded-none !border-0 !shadow-none md:w-60"
      }`}
    >
      <span className="text-ink">
        <LogoMark />
      </span>
      <span className="h-4 w-px bg-taupe/30" />
      <span className="font-display text-lg text-ink">The Table</span>
    </Link>
  );
}
