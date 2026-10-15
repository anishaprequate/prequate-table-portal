import { prisma } from "@prequate/db";
import { availability } from "@prequate/core";
import { findBookingInMonth, formatMonthLabel } from "./monthly-cap";

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
  partnerFirstName: string;
  startTime: string; // ISO
  bookingId: string;
}

export interface MonthView {
  months: MonthChoice[];
  current: MonthChoice;
  // Days (YYYY-MM-DD) with at least one open Hour. Empty when the month is used.
  openDays: string[];
  used: UsedMonth | null;
  today: string;
}

export async function getMonthView(userId: string, param?: string): Promise<MonthView> {
  const now = new Date();
  const months = bookableMonths(now);
  const current = months.find((m) => m.param === param) ?? months[0];

  const monthStart = new Date(current.year, current.month, 1);
  const monthEnd = new Date(current.year, current.month + 1, 1);

  const [existing, partners] = await Promise.all([
    findBookingInMonth(userId, monthStart),
    prisma.user.findMany({
      where: { role: "PARTNER" },
      select: { id: true, email: true, tableHoursCalendarId: true },
    }),
  ]);

  let used: UsedMonth | null = null;
  if (existing) {
    const partner = await prisma.user.findUnique({ where: { id: existing.partnerId }, select: { name: true } });
    used = {
      label: formatMonthLabel(monthStart),
      partnerFirstName: (partner?.name ?? "your partner").split(" ")[0],
      startTime: existing.startTime.toISOString(),
      bookingId: existing.id,
    };
  }

  const open = new Set<string>();
  if (!used) {
    const perPartner = await Promise.all(
      partners.map((p) => availability.getOpenSlots(p, { from: monthStart, to: monthEnd })),
    );
    for (const slots of perPartner) for (const s of slots) open.add(dayKey(s.startTime));
  }

  return { months, current, openDays: [...open].sort(), used, today: dayKey(now) };
}

export interface DaySlot {
  start: string; // ISO
  end: string;
}

export interface DayPartner {
  id: string;
  name: string;
  photoUrl: string | null;
  morning: DaySlot[];
  afternoon: DaySlot[];
}

// One day, every partner who has an open Hour, split into morning and afternoon.
export async function getDayView(userId: string, key: string): Promise<{ partners: DayPartner[]; used: boolean }> {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) return { partners: [], used: false };
  const from = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const to = new Date(from.getFullYear(), from.getMonth(), from.getDate() + 1);

  if (await findBookingInMonth(userId, from)) return { partners: [], used: true };

  const partners = await prisma.user.findMany({
    where: { role: "PARTNER" },
    orderBy: { name: "asc" },
    select: { id: true, name: true, photoUrl: true, email: true, tableHoursCalendarId: true },
  });

  const out: DayPartner[] = [];
  for (const p of partners) {
    const slots = await availability.getOpenSlots(p, { from, to });
    if (!slots.length) continue;
    const toSlot = (s: { startTime: Date; endTime: Date }): DaySlot => ({
      start: s.startTime.toISOString(),
      end: s.endTime.toISOString(),
    });
    out.push({
      id: p.id,
      name: p.name,
      photoUrl: p.photoUrl,
      morning: slots.filter((s) => s.startTime.getHours() < 12).map(toSlot),
      afternoon: slots.filter((s) => s.startTime.getHours() >= 12).map(toSlot),
    });
  }
  return { partners: out, used: false };
}
