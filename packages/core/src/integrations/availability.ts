// When can a partner give an Hour? One place answers that, for the member
// calendar, the old booking pages, Home and the admin reschedule page.
//
// Slots come from two inputs:
//   windows  when the partner offers Hours (their Table hours), and
//   busy     what already fills them (their other calendar commitments).
// Existing portal bookings are subtracted too. Today the windows are a fixed
// weekday pattern (the mock provider). Google Calendar plugs in by providing
// real windows and busy time from free/busy, see google-availability.ts. The
// calendar reads this live on every request: there is no cache, so a slot
// that is taken disappears the next time anyone opens the day, and booking
// re-checks it once more at the moment of confirming.
import { prisma } from "@prequate/db";

export interface Range {
  start: Date;
  end: Date;
}

export interface CalendarSlot {
  startTime: Date;
  endTime: Date;
}

export interface PartnerRef {
  id: string;
  email?: string | null;
  tableHoursCalendarId?: string | null;
}

export interface AvailabilityProvider {
  name: string;
  fetch(partner: PartnerRef, from: Date, to: Date): Promise<{ windows: Range[]; busy: Range[] }>;
}

export const SLOT_MINUTES = 60;
// A member proposes a start time on the hour or the half hour.
export const START_STEP_MINUTES = 30;
// An Hour cannot be booked closer than this to its start.
export const LEAD_HOURS = 12;

// Hours run between 10 am and 8 pm, and the last one must end by 8 pm, so the
// latest start is 7 pm.
export const DAY_START_HOUR = 10;
export const DAY_END_HOUR = 20;

const BUSINESS_HOUR_START = DAY_START_HOUR;
const BUSINESS_HOUR_END = DAY_END_HOUR;

const overlaps = (a: Range, b: Range) => a.start < b.end && b.start < a.end;

// Is this a time an Hour may start? On the hour or half hour, from 10:00 to
// 19:00 local time, so that it ends by 20:00.
export function isHourStart(d: Date): boolean {
  if (Number.isNaN(d.getTime())) return false;
  if (d.getSeconds() !== 0 || d.getMilliseconds() !== 0) return false;
  if (d.getMinutes() % START_STEP_MINUTES !== 0) return false;
  const minutes = d.getHours() * 60 + d.getMinutes();
  return minutes >= DAY_START_HOUR * 60 && minutes + SLOT_MINUTES <= DAY_END_HOUR * 60;
}

// Every start time of one day, 10:00, 10:30 ... 19:00. `day` is any moment in
// that day.
export function hourStartsOfDay(day: Date): Date[] {
  const out: Date[] = [];
  const last = DAY_END_HOUR * 60 - SLOT_MINUTES;
  for (let m = DAY_START_HOUR * 60; m <= last; m += START_STEP_MINUTES) {
    out.push(new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, m, 0, 0));
  }
  return out;
}

// Round a time up to the next step, on the local clock.
function alignUp(d: Date, stepMinutes: number): Date {
  const out = new Date(d);
  out.setSeconds(0, 0);
  if (d.getSeconds() || d.getMilliseconds()) out.setMinutes(out.getMinutes() + 1);
  const rem = out.getMinutes() % stepMinutes;
  if (rem) out.setMinutes(out.getMinutes() + (stepMinutes - rem));
  return out;
}

// Pure: cut windows into slots, drop any that start too soon, fall outside
// 10 am to 8 pm, or touch busy time. With `stepMinutes` smaller than the slot,
// slots overlap (a 10:30 start and a 10:00 start), which is how a member can
// propose a half hour start.
export function computeSlots(params: {
  windows: Range[];
  busy: Range[];
  slotMinutes?: number;
  stepMinutes?: number;
  earliest: Date;
}): CalendarSlot[] {
  const length = (params.slotMinutes ?? SLOT_MINUTES) * 60_000;
  const slots: CalendarSlot[] = [];
  for (const w of params.windows) {
    if (params.stepMinutes) {
      const step = params.stepMinutes * 60_000;
      for (let t = alignUp(w.start, params.stepMinutes).getTime(); t + length <= w.end.getTime(); t += step) {
        const range = { start: new Date(t), end: new Date(t + length) };
        if (!inDay(range)) continue;
        if (range.start < params.earliest) continue;
        if (params.busy.some((b) => overlaps(range, b))) continue;
        slots.push({ startTime: range.start, endTime: range.end });
      }
    } else {
      for (let t = w.start.getTime(); t + length <= w.end.getTime(); t += length) {
        const range = { start: new Date(t), end: new Date(t + length) };
        if (!inDay(range)) continue;
        if (range.start < params.earliest) continue;
        if (params.busy.some((b) => overlaps(range, b))) continue;
        slots.push({ startTime: range.start, endTime: range.end });
      }
    }
  }
  return slots.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
}

// Inside 10 am to 8 pm on one local day.
function inDay(r: Range): boolean {
  const start = r.start.getHours() * 60 + r.start.getMinutes();
  const length = (r.end.getTime() - r.start.getTime()) / 60_000;
  return start >= DAY_START_HOUR * 60 && start + length <= DAY_END_HOUR * 60;
}

// The stand-in until Google is connected: every partner is open on weekdays,
// 10:00 to 17:00, with nothing else busy.
export const mockProvider: AvailabilityProvider = {
  name: "mock",
  async fetch(_partner, from, to) {
    const windows: Range[] = [];
    const day = new Date(from);
    day.setHours(0, 0, 0, 0);
    while (day < to) {
      const weekend = day.getDay() === 0 || day.getDay() === 6;
      if (!weekend) {
        const start = new Date(day);
        start.setHours(BUSINESS_HOUR_START, 0, 0, 0);
        const end = new Date(day);
        end.setHours(BUSINESS_HOUR_END, 0, 0, 0);
        windows.push({ start, end });
      }
      day.setDate(day.getDate() + 1);
    }
    return { windows, busy: [] };
  },
};

let googleProvider: AvailabilityProvider | null = null;

// Switch to Google by registering its provider at startup, once the approach
// is confirmed and set up. Until then, everything runs on the mock.
export function registerAvailabilityProvider(provider: AvailabilityProvider) {
  googleProvider = provider;
}

function providerFor(partner: PartnerRef): AvailabilityProvider {
  return googleProvider && partner.tableHoursCalendarId ? googleProvider : mockProvider;
}

// The end of next calendar month: the furthest an Hour can be booked.
export function bookingHorizon(now = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth() + 2, 1);
}

export async function getOpenSlots(
  partner: PartnerRef,
  options: { from?: Date; to?: Date; excludeBookingId?: string; stepMinutes?: number; slotMinutes?: number } = {},
): Promise<CalendarSlot[]> {
  const now = new Date();
  const earliest = new Date(now.getTime() + LEAD_HOURS * 3_600_000);
  const from = options.from && options.from > earliest ? options.from : earliest;
  const to = options.to ?? bookingHorizon(now);
  if (from >= to) return [];

  const [{ windows, busy }, blocks, bookings] = await Promise.all([
    providerFor(partner).fetch(partner, from, to),
    prisma.availabilityBlock.findMany({
      where: { partnerId: partner.id, startTime: { lt: to }, endTime: { gt: from } },
      select: { startTime: true, endTime: true },
    }),
    // A request waiting for the partner holds its time too, whether it is a new
    // Hour or a member's proposed move.
    prisma.booking.findMany({
      where: {
        partnerId: partner.id,
        status: { not: "CANCELLED" },
        OR: [
          { startTime: { lt: to }, endTime: { gt: from } },
          { pendingStart: { lt: to }, pendingEnd: { gt: from } },
        ],
        ...(options.excludeBookingId ? { id: { not: options.excludeBookingId } } : {}),
      },
      select: { startTime: true, endTime: true, pendingStart: true, pendingEnd: true },
    }),
  ]);

  return computeSlots({
    windows,
    busy: [
      ...busy,
      ...blocks.map((b) => ({ start: b.startTime, end: b.endTime })),
      ...bookings.flatMap((b) => [
        { start: b.startTime, end: b.endTime },
        ...(b.pendingStart && b.pendingEnd ? [{ start: b.pendingStart, end: b.pendingEnd }] : []),
      ]),
    ],
    stepMinutes: options.stepMinutes,
    slotMinutes: options.slotMinutes,
    earliest: from,
  });
}

export interface SlotState {
  start: Date;
  end: Date;
  // open: members can book it. blocked: the partner marked it unavailable (or
  // their calendar is busy). booked: a member has it.
  state: "open" | "blocked" | "booked";
  blockId?: string;
}

// Every slot the partner offers in a range, with its state, for the partner's
// own Availability screen. Unlike getOpenSlots it keeps the slots that are
// taken, so the partner can see and undo what they changed.
export async function getSlotStates(
  partner: PartnerRef,
  from: Date,
  to: Date,
  options: { includePast?: boolean } = {},
): Promise<SlotState[]> {
  const earliest = options.includePast ? from : new Date(Math.max(from.getTime(), Date.now()));
  const [{ windows, busy }, blocks, bookings] = await Promise.all([
    providerFor(partner).fetch(partner, from, to),
    prisma.availabilityBlock.findMany({
      where: { partnerId: partner.id, startTime: { lt: to }, endTime: { gt: from } },
    }),
    prisma.booking.findMany({
      where: { partnerId: partner.id, status: { not: "CANCELLED" }, startTime: { lt: to }, endTime: { gt: from } },
      select: { startTime: true, endTime: true },
    }),
  ]);

  return computeSlots({ windows, busy: [], earliest }).map((slot) => {
    const range = { start: slot.startTime, end: slot.endTime };
    if (bookings.some((b) => overlaps(range, { start: b.startTime, end: b.endTime }))) {
      return { start: slot.startTime, end: slot.endTime, state: "booked" as const };
    }
    const block = blocks.find((b) => overlaps(range, { start: b.startTime, end: b.endTime }));
    if (block) return { start: slot.startTime, end: slot.endTime, state: "blocked" as const, blockId: block.id };
    if (busy.some((b) => overlaps(range, b))) return { start: slot.startTime, end: slot.endTime, state: "blocked" as const };
    return { start: slot.startTime, end: slot.endTime, state: "open" as const };
  });
}
