"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatSeatDisplay } from "@/lib/format";
import { Countdown } from "@/components/countdown";
import type { Satellite, SatelliteKey } from "@/lib/room";

// The wheel scales to the screen: 320px on anything wide enough, smaller on
// narrow phones (never wider than the content area). Everything inside is
// sized as a fraction of --wheel, so the layout holds at any size.
const WHEEL = "min(320px, calc(100vw - 3rem))";
const ORBIT = "calc(var(--wheel) * -0.4)"; // distance of each satellite from the centre

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
  nextUp = null,
}: {
  seatNumber: number | null;
  seatingDate: Date | null;
  satellites: Satellite[];
  // The nearest commitment, shown on the hub under the seat number.
  nextUp?: { title: string; startsAt: string; whenText: string } | null;
}) {
  const router = useRouter();
  const [flipped, setFlipped] = useState(false);
  const [selected, setSelected] = useState<SatelliteKey | null>(null);

  const selectedSat = satellites.find((s) => s.key === selected) ?? null;
  const playState = selected ? "paused" : "running";

  // First tap selects (and shows its live detail below); a second tap on the
  // same one opens it. Works the same with a mouse or a finger.
  function onSatelliteTap(sat: Satellite) {
    if (selected === sat.key) {
      router.push(sat.href);
      return;
    }
    setSelected(sat.key);
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(8);
  }
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
    <>
    <div
      className="relative mx-auto"
      style={{ ["--wheel" as string]: WHEEL, width: "var(--wheel)", height: "var(--wheel)" }}
    >
      {/* The ring — rotates continuously; each satellite's own content
          counter-rotates at the same rate so it stays upright while it
          orbits. Both animations pause together while a satellite is selected. */}
      <div
        className="absolute inset-0"
        style={{ animation: "room-spin 100s linear infinite", animationPlayState: playState }}
      >
        {satellites.map((sat, i) => {
          const angle = (360 / satellites.length) * i;
          return (
            <div
              key={sat.key}
              className="absolute left-1/2 top-1/2 h-0 w-0 focus-within:z-20"
              style={{ transform: `rotate(${angle}deg) translateY(${ORBIT})` }}
            >
              {/* Cancels this satellite's own fixed placement angle — the
                  animated counter-rotation below only cancels the ring's
                  continuous spin, not each item's static offset around it. */}
              <div style={{ transform: `rotate(${-angle}deg)` }}>
                <div style={{ animation: "room-spin-reverse 100s linear infinite", animationPlayState: playState }}>
                  <button
                    type="button"
                    onClick={() => onSatelliteTap(sat)}
                    aria-label={`${sat.label}. ${sat.detail}`}
                    aria-pressed={selected === sat.key}
                    className={`room-seat-filled tap relative -ml-7 -mt-7 flex h-14 w-14 items-center justify-center rounded-full text-ink transition-transform duration-300 ${
                      selected === sat.key ? "z-10 scale-[1.15] !border-foil shadow-glow" : ""
                    }`}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                      {ICONS[sat.key]}
                    </svg>
                    {sat.badge != null && (
                      <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] animate-scale-in items-center justify-center rounded-full bg-clay px-1 text-[10px] font-medium text-bone shadow-sm">
                        {sat.badge}
                      </span>
                    )}
                  </button>
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
          className="tap block"
          style={{ width: "calc(var(--wheel) * 0.47)", height: "calc(var(--wheel) * 0.47)" }}
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
                <span
                  className={`font-display not-italic leading-none text-clay ${nextUp ? "text-4xl" : "text-5xl"}`}
                >
                  {formatSeatDisplay(String(seatNumber))}
                </span>
              )}
              {nextUp && (
                <span className="mt-1.5 flex max-w-[82%] flex-col items-center text-center leading-tight">
                  <span className="line-clamp-2 text-[10px] text-ink">{nextUp.title}</span>
                  <span className="mt-0.5 text-[10px] uppercase tracking-[0.14em] text-clay">
                    <Countdown startsAt={nextUp.startsAt} fallback={nextUp.whenText} />
                  </span>
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

    {/* Tap (or keyboard) readout: the selected section's live detail. */}
    <div className="mx-auto max-w-sm" aria-live="polite">
      {selectedSat && (
        <div key={selectedSat.key} className="card animate-fade-up mt-8 flex items-center justify-between gap-4 px-5 py-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-taupe">{selectedSat.label}</p>
            <p className="mt-1 font-display text-xl italic leading-tight text-ink">{selectedSat.detail}</p>
          </div>
          <Link href={selectedSat.href} className="btn-primary tap flex-shrink-0 !px-4 !py-2">
            Open
          </Link>
        </div>
      )}
    </div>
    </>
  );
}
