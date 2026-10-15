import { prisma } from "@prequate/db";
import { getOpenSlots, LEAD_HOURS } from "./integrations/availability";
import { createNotification } from "./notifications";

const OFFER_DAYS = 7;

export interface OfferSlot {
  start: string; // ISO
  end: string;
}

const dayOf = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

// Pick up to three times, spread over different days where possible, so the
// member is choosing between real alternatives and not three neighbouring
// slots on one afternoon.
export function pickAlternatives<T extends { startTime: Date }>(slots: T[], count = 3): T[] {
  const sorted = [...slots].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  const chosen: T[] = [];
  const seenDays = new Set<string>();
  for (const s of sorted) {
    if (chosen.length >= count) break;
    const key = dayOf(s.startTime);
    if (seenDays.has(key)) continue;
    seenDays.add(key);
    chosen.push(s);
  }
  for (const s of sorted) {
    if (chosen.length >= count) break;
    if (!chosen.includes(s)) chosen.push(s);
  }
  return chosen.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
}

// A partner cancelled, or asked to move, an Hour: offer the member up to three
// other times with the same partner inside the next seven days. One tap on the
// member's side takes one of them. Returns null when nothing is open, in which
// case the member is told to choose a new time themselves.
export async function createAlternativeOffer(params: {
  bookingId: string;
  reason: "CANCELLED" | "RESCHEDULE";
}) {
  const booking = await prisma.booking.findUnique({
    where: { id: params.bookingId },
    include: { partner: { select: { id: true, name: true, email: true, tableHoursCalendarId: true } } },
  });
  if (!booking) return null;

  const now = new Date();
  const to = new Date(now.getTime() + OFFER_DAYS * 24 * 3_600_000);
  const open = await getOpenSlots(booking.partner, { from: new Date(now.getTime() + LEAD_HOURS * 3_600_000), to, excludeBookingId: booking.id });
  // Never offer the time that was just given up.
  const candidates = open.filter((s) => s.startTime.getTime() !== booking.startTime.getTime());
  const picks = pickAlternatives(candidates);

  // Close any older open offer for this booking.
  await prisma.bookingOffer.updateMany({
    where: { bookingId: booking.id, acceptedAt: null, expiresAt: { gt: now } },
    data: { expiresAt: now },
  });

  const first = booking.partner.name.split(" ")[0];
  if (picks.length === 0) {
    await createNotification({
      recipientId: booking.memberId,
      type: "hour_offer",
      message:
        params.reason === "CANCELLED"
          ? `${first} cannot make your Hour. There are no other times open in the next week, so please choose a new one.`
          : `${first} needs to move your Hour. There are no other times open in the next week, so please choose a new one.`,
      relatedEntityType: "booking",
      relatedEntityId: booking.id,
    });
    return null;
  }

  const offer = await prisma.bookingOffer.create({
    data: {
      bookingId: booking.id,
      reason: params.reason,
      slots: JSON.stringify(picks.map((s) => ({ start: s.startTime.toISOString(), end: s.endTime.toISOString() }) satisfies OfferSlot)),
      expiresAt: to,
    },
  });

  await createNotification({
    recipientId: booking.memberId,
    type: "hour_offer",
    message:
      params.reason === "CANCELLED"
        ? `${first} cannot make your Hour. Here are ${picks.length} other time${picks.length === 1 ? "" : "s"}. Tap one to take it.`
        : `${first} needs to move your Hour. Here are ${picks.length} other time${picks.length === 1 ? "" : "s"}. Tap one to take it.`,
    relatedEntityType: "booking",
    relatedEntityId: booking.id,
  });

  return offer;
}
