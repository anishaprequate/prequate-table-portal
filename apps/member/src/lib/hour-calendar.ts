import { prisma } from "@prequate/db";
import { availability } from "@prequate/core";
import { findHourInMonth, formatMonthLabel } from "./monthly-cap";

// Data behind the Hour calendar. Everything is read live on each call.

export const pad = (n: number) => String(n).padStart(2, "0");
export const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export interface MonthChoice {
  year: number;
  month: number; // 0 to 11
  param: string; // "2026-10"
  label: string;
}

// An Hour can be booked this month or next, nothing further out.
export function bookableMonths(now = new Date()): MonthChoice[] {
  return [0, 1].map((offset) => {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    return {
      year: d.getFullYear(),
      month: d.getMonth(),
      param: `${d.getFullYear()}-${pad(d.getMonth() + 1)}`,
      label: new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(d),
    };
  });
}

export interface UsedMonth {
  label: string;
  // First name of the partner, or of the advisor.
  partnerFirstName: string;
  kind: "partner" | "advisor";
  startTime: string; // ISO; for an advisor request without a time, the day proposed
  hasTime: boolean;
  bookingId: string | null;
}

export interface MonthView {
  months: MonthChoice[];
  current: MonthChoice;
  // Days (YYYY-MM-DD) with at least one open Hour. Empty when the month is used.
  openDays: string[];
  used: UsedMonth | null;
  today: string;
}

// Moving an Hour: only that Hour's partner, and the Hour being moved does not
// count against the member's month.
export interface ViewScope {
  partnerId?: string;
  excludeBookingId?: string;
}

export async function getMonthView(userId: string, param?: string, scope: ViewScope = {}): Promise<MonthView> {
  const now = new Date();
  const months = bookableMonths(now);
  const current = months.find((m) => m.param === param) ?? months[0];

  const monthStart = new Date(current.year, current.month, 1);
  const monthEnd = new Date(current.year, current.month + 1, 1);

  const [existing, partners] = await Promise.all([
    findHourInMonth(userId, monthStart, scope.excludeBookingId),
    prisma.user.findMany({
      where: { hostsHours: true, ...(scope.partnerId ? { id: scope.partnerId } : {}) },
      select: { id: true, email: true, tableHoursCalendarId: true },
    }),
  ]);

  const used: UsedMonth | null = existing
    ? {
        label: formatMonthLabel(monthStart),
        partnerFirstName: existing.firstName,
        kind: existing.kind,
        startTime: existing.at.toISOString(),
        hasTime: existing.hasTime,
        bookingId: existing.bookingId,
      }
    : null;

  const open = new Set<string>();
  if (!used) {
    const perPartner = await Promise.all(
      partners.map((p) => availability.getOpenSlots(p, { from: monthStart, to: monthEnd, excludeBookingId: scope.excludeBookingId })),
    );
    for (const slots of perPartner) for (const s of slots) open.add(dayKey(s.startTime));
  }

  return { months, current, openDays: [...open].sort(), used, today: dayKey(now) };
}

export interface DayPartner {
  id: string;
  name: string;
  photoUrl: string | null;
}

// One day: the partners who have something open, nothing more. The member
// picks a partner and proposes a time; the time itself is checked when they
// confirm, so no slots are shown.
export async function getDayView(userId: string, key: string, scope: ViewScope = {}): Promise<{ partners: DayPartner[]; used: boolean }> {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) return { partners: [], used: false };
  const from = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const to = new Date(from.getFullYear(), from.getMonth(), from.getDate() + 1);

  if (await findHourInMonth(userId, from, scope.excludeBookingId)) return { partners: [], used: true };

  const partners = await prisma.user.findMany({
    where: { hostsHours: true, ...(scope.partnerId ? { id: scope.partnerId } : {}) },
    orderBy: { name: "asc" },
    select: { id: true, name: true, photoUrl: true, email: true, tableHoursCalendarId: true },
  });

  const out: DayPartner[] = [];
  for (const p of partners) {
    const slots = await availability.getOpenSlots(p, { from, to, stepMinutes: availability.START_STEP_MINUTES, excludeBookingId: scope.excludeBookingId });
    if (slots.length) out.push({ id: p.id, name: p.name, photoUrl: p.photoUrl });
  }
  return { partners: out, used: false };
}

export interface DayCell {
  hhmm: string; // "14:30", in the Table's time
  label: string; // "2:30 pm"
  // free: nothing there. busy: the partner is busy, or it is outside their
  // hours. soon: too close to now to book.
  state: "free" | "busy" | "soon";
  // An Hour can start here: this half hour and the next are both free.
  canStart: boolean;
}

const labelOf = (d: Date) => new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" }).format(d);
const hhmmOf = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

// One partner's day, like the day view of a calendar: every half hour from
// 10:00 to 20:00, free or busy. Busy shows no detail: not who, not what.
export async function getPartnerDay(
  userId: string,
  key: string,
  partnerId: string,
  scope: ViewScope = {},
): Promise<{ cells: DayCell[] } | { error: string }> {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) return { error: "That day is not valid." };
  const from = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const to = new Date(from.getFullYear(), from.getMonth(), from.getDate() + 1);

  if (await findHourInMonth(userId, from, scope.excludeBookingId)) return { error: "You already have your Hour this month." };

  const partner = await prisma.user.findFirst({
    where: { id: partnerId, hostsHours: true, ...(scope.partnerId ? { id: scope.partnerId } : {}) },
    select: { id: true, email: true, tableHoursCalendarId: true },
  });
  if (!partner) return { error: "That partner is not available." };

  const [halves, hours] = await Promise.all([
    availability.getOpenSlots(partner, { from, to, stepMinutes: 30, slotMinutes: 30, excludeBookingId: scope.excludeBookingId }),
    availability.getOpenSlots(partner, { from, to, stepMinutes: 30, excludeBookingId: scope.excludeBookingId }),
  ]);
  const free = new Set(halves.map((s) => s.startTime.getTime()));
  const canStart = new Set(hours.map((s) => s.startTime.getTime()));
  const earliest = Date.now() + availability.LEAD_HOURS * 3_600_000;

  // Half hours from 10:00 to 19:30.
  const cells: DayCell[] = [];
  for (let m = availability.DAY_START_HOUR * 60; m < availability.DAY_END_HOUR * 60; m += 30) {
    const d = new Date(from.getFullYear(), from.getMonth(), from.getDate(), 0, m, 0, 0);
    const t = d.getTime();
    cells.push({
      hhmm: hhmmOf(d),
      label: labelOf(d),
      state: free.has(t) ? "free" : t < earliest ? "soon" : "busy",
      canStart: canStart.has(t),
    });
  }
  return { cells };
}
