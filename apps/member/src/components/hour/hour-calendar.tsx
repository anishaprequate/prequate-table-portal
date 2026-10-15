"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { MonthView } from "@/lib/hour-calendar";
import { DaySheet } from "./day-sheet";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const pad = (n: number) => String(n).padStart(2, "0");

// A clean month. A small green dot marks a day with an open Hour; no dot, no
// availability. Tap a dotted day and a sheet rises with the times.
export function HourCalendar({ view, parentBookingId }: { view: MonthView; parentBookingId: string | null }) {
  const router = useRouter();
  const [openDay, setOpenDay] = useState<string | null>(null);
  const { current, months, openDays, used, today } = view;

  // Times change in the partner's calendar at any moment. Whenever the member
  // comes back to this screen, read availability again.
  useEffect(() => {
    const onVisible = () => document.visibilityState === "visible" && router.refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [router]);

  const first = new Date(current.year, current.month, 1);
  const daysInMonth = new Date(current.year, current.month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(first.getDay()).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);

  const idx = months.findIndex((m) => m.param === current.param);
  const prev = months[idx - 1];
  const next = months[idx + 1];
  const extra = parentBookingId ? `&parentBookingId=${parentBookingId}` : "";
  const open = new Set(openDays);

  const arrow = "tap flex h-11 w-11 items-center justify-center rounded-md transition-colors duration-300";

  return (
    <>
      <div className="mb-3 flex items-center justify-between">
        {prev ? (
          <Link href={`/the-hour/book?m=${prev.param}${extra}`} className={`${arrow} text-taupe hover:text-ink`} aria-label={`Show ${prev.label}`}>
            ←
          </Link>
        ) : (
          <span className={`${arrow} text-taupe/25`} aria-hidden>
            ←
          </span>
        )}
        <h2 className="font-display text-xl italic text-ink" aria-live="polite">
          {current.label}
        </h2>
        {next ? (
          <Link href={`/the-hour/book?m=${next.param}${extra}`} className={`${arrow} text-taupe hover:text-ink`} aria-label={`Show ${next.label}`}>
            →
          </Link>
        ) : (
          <span className={`${arrow} text-taupe/25`} aria-hidden>
            →
          </span>
        )}
      </div>

      <div className="card grid grid-cols-7 gap-px overflow-hidden bg-taupe/10 text-sm" role="grid" aria-label={current.label}>
        {WEEKDAYS.map((d, i) => (
          <div key={i} className="bg-bone py-2 text-center text-xs text-taupe" role="columnheader">
            {d}
          </div>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <div key={i} className="min-h-[52px] bg-bone" aria-hidden />;
          const key = `${current.year}-${pad(current.month + 1)}-${pad(day)}`;
          const isOpen = open.has(key);
          const isToday = key === today;
          const label = new Date(current.year, current.month, day).toDateString();
          const common = "flex min-h-[52px] flex-col items-center justify-center gap-1 bg-bone";
          return isOpen ? (
            <button
              key={i}
              type="button"
              onClick={() => setOpenDay(key)}
              aria-label={`${label}, times available`}
              className={`${common} tap transition-colors duration-300 hover:bg-foil/10`}
            >
              <span className={isToday ? "font-medium text-clay" : "text-ink"}>{day}</span>
              <span className="h-1.5 w-1.5 rounded-full bg-[#4F8A5B]" aria-hidden />
            </button>
          ) : (
            <div key={i} className={`${common} ${key < today ? "text-taupe/35" : "text-taupe"}`} aria-label={label}>
              <span className={isToday ? "font-medium text-clay" : ""}>{day}</span>
              <span className="h-1.5 w-1.5" aria-hidden />
            </div>
          );
        })}
      </div>

      {used && (
        <p className="mt-5 text-sm text-taupe">
          Your {used.label.split(" ")[0]} Hour is booked with {used.partnerFirstName},{" "}
          {new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(used.startTime))}.{" "}
          <Link href={`/the-hour/${used.bookingId}`} className="text-clay underline decoration-clay/40 underline-offset-2">
            See it
          </Link>
        </p>
      )}
      {!used && openDays.length === 0 && (
        <p className="mt-5 text-sm text-taupe">No Hours are open in {current.label.split(" ")[0]}. Try the next month.</p>
      )}

      <footer className="mt-6 flex items-center gap-2 text-xs text-taupe">
        <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#4F8A5B]" aria-hidden />
        Green dots indicate availability.
      </footer>

      {openDay && (
        <DaySheet dayKey={openDay} parentBookingId={parentBookingId} onClose={() => setOpenDay(null)} />
      )}
    </>
  );
}
