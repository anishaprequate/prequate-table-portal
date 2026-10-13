"use client";

import { useState } from "react";
import Link from "next/link";
import { formatSeatDisplay } from "@/lib/format";
import type { Satellite, SatelliteKey } from "@/lib/room";

const WHEEL_SIZE = 320; // px, fixed regardless of viewport — see room-wheel notes below
const ORBIT_RADIUS = 128; // px, distance of each satellite's center from the wheel's center

const ICONS: Record<SatelliteKey, React.ReactNode> = {
  hour: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  events: (
    <>
      <rect x="4" y="5.5" width="16" height="14.5" rx="1.5" />
      <path d="M4 10h16M8 3.5v3M16 3.5v3" />
    </>
  ),
  members: (
    <>
      <circle cx="9" cy="9" r="3" />
      <path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
      <circle cx="17" cy="8.5" r="2.4" />
      <path d="M15.8 14.2c2.4.3 4.2 2.1 4.2 4.8" />
    </>
  ),
  introductions: (
    <>
      <path d="M9 8a3 3 0 1 0-3 3" />
      <path d="M15 16a3 3 0 1 0 3-3" />
      <path d="M8.5 13.5 6.5 9M15.5 10.5l2 4.5" />
    </>
  ),
  insight: (
    <>
      <path d="M12 3.5c-3 0-5.5 2.3-5.5 5.5 0 2 1 3.2 2 4.2.6.6 1 1.1 1 1.8v1h5v-1c0-.7.4-1.2 1-1.8 1-1 2-2.2 2-4.2 0-3.2-2.5-5.5-5.5-5.5Z" />
      <path d="M9.75 19.5h4.5M10.5 21.5h3" />
    </>
  ),
  messages: (
    <>
      <path d="M4 5.5h16v11H9l-4 3.5v-3.5H4Z" />
    </>
  ),
  notifications: (
    <>
      <path d="M6 10a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5h-15S6 14 6 10Z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5v2.3M12 18.2v2.3M20.5 12h-2.3M5.8 12H3.5M17.7 6.3l-1.6 1.6M7.9 16.1l-1.6 1.6M17.7 17.7l-1.6-1.6M7.9 7.9 6.3 6.3" />
    </>
  ),
};

export function RoomWheel({
  seatNumber,
  seatingDate,
  satellites,
}: {
  seatNumber: number | null;
  seatingDate: Date | null;
  satellites: Satellite[];
}) {
  const [paused, setPaused] = useState(false);
  const [flipped, setFlipped] = useState(false);

  const playState = paused ? "paused" : "running";
  const seatingDateLabel = seatingDate
    ? new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", year: "numeric" }).format(seatingDate)
    : null;

  function toggleFlip() {
    if (!flipped && typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(10);
    }
    setFlipped((v) => !v);
  }

  return (
    <div
      className="relative mx-auto"
      style={{ width: WHEEL_SIZE, height: WHEEL_SIZE }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* The ring — rotates continuously; each satellite's own content
          counter-rotates at the same rate so it stays upright while it
          orbits. Both animations pause together on hover. */}
      <div
        className="absolute inset-0"
        style={{ animation: "room-spin 100s linear infinite", animationPlayState: playState }}
      >
        {satellites.map((sat, i) => {
          const angle = (360 / satellites.length) * i;
          return (
            <div
              key={sat.key}
              className="absolute left-1/2 top-1/2 h-0 w-0"
              style={{ transform: `rotate(${angle}deg) translateY(${-ORBIT_RADIUS}px)` }}
            >
              {/* Cancels this satellite's own fixed placement angle — the
                  animated counter-rotation below only cancels the ring's
                  continuous spin, not each item's static offset around it. */}
              <div style={{ transform: `rotate(${-angle}deg)` }}>
                <div style={{ animation: "room-spin-reverse 100s linear infinite", animationPlayState: playState }}>
                  <Link
                    href={sat.href}
                    title={`${sat.label} — ${sat.detail}`}
                    className="room-seat-filled group relative -ml-7 -mt-7 flex h-14 w-14 items-center justify-center rounded-full text-ink transition-transform duration-300 hover:z-10 hover:scale-[1.15] hover:shadow-lg"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                      {ICONS[sat.key]}
                    </svg>
                    {sat.badge != null && (
                      <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] animate-scale-in items-center justify-center rounded-full bg-clay px-1 text-[10px] font-medium text-bone shadow-sm">
                        {sat.badge}
                      </span>
                    )}
                    <span className="pointer-events-none absolute top-[calc(100%+0.4rem)] w-max max-w-[7rem] text-center text-[10px] leading-tight text-taupe opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                      {sat.label}
                    </span>
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Center hub — the member's own seat. Fixed, never orbits. A tap
          flips it, same 600ms weighted flip as before. */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 [perspective:1000px]">
        <button
          type="button"
          onClick={toggleFlip}
          aria-label={flipped ? "Show your seat number" : "Show your seating story"}
          className="block h-[150px] w-[150px]"
        >
          <div
            className="relative h-full w-full [transform-style:preserve-3d]"
            style={{
              transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
              transition: "transform 600ms cubic-bezier(0.65, -0.15, 0.35, 1.15)",
            }}
          >
            <div className="room-plate grain absolute inset-0 flex flex-col items-center justify-center rounded-full [backface-visibility:hidden]">
              {seatNumber != null && (
                <span className="font-display text-5xl not-italic leading-none text-clay">
                  {formatSeatDisplay(String(seatNumber))}
                </span>
              )}
            </div>
            <div
              className="room-plate absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-full bg-ink px-6 text-center [backface-visibility:hidden]"
              style={{ transform: "rotateY(180deg)" }}
            >
              <p className="font-display text-base italic leading-snug text-bone">Chosen, not sold to.</p>
              {seatingDateLabel && (
                <p className="text-[9px] uppercase tracking-[0.2em] text-foil">Seated {seatingDateLabel}</p>
              )}
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
