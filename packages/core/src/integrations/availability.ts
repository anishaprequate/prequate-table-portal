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
// An Hour cannot be booked closer than this to its start.
export const LEAD_HOURS = 12;

const BUSINESS_HOUR_START = 10;
const BUSINESS_HOUR_END = 17;

const overlaps = (a: Range, b: Range) => a.start < b.end && b.start < a.end;

// Pure: cut windows into slots, drop any that start too soon or touch busy time.
export function computeSlots(params: {
  windows: Range[];
  busy: Range[];
  slotMinutes?: number;
  earliest: Date;
}): CalendarSlot[] {
  const step = (params.slotMinutes ?? SLOT_MINUTES) * 60_000;
  const slots: CalendarSlot[] = [];
  for (const w of params.windows) {
    for (let t = w.start.getTime(); t + step <= w.end.getTime(); t += step) {
      const range = { start: new Date(t), end: new Date(t + step) };
      if (range.start < params.earliest) continue;
      if (params.busy.some((b) => overlaps(range, b))) continue;
      slots.push({ startTime: range.start, endTime: range.end });
    }
  }
  return slots.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
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
  options: { from?: Date; to?: Date; excludeBookingId?: string } = {},
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
    prisma.booking.findMany({
      where: {
        partnerId: partner.id,
        status: { not: "CANCELLED" },
        startTime: { lt: to },
        endTime: { gt: from },
        ...(options.excludeBookingId ? { id: { not: options.excludeBookingId } } : {}),
      },
      select: { startTime: true, endTime: true },
    }),
  ]);

  return computeSlots({
    windows,
    busy: [
      ...busy,
      ...blocks.map((b) => ({ start: b.startTime, end: b.endTime })),
      ...bookings.map((b) => ({ start: b.startTime, end: b.endTime })),
    ],
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
