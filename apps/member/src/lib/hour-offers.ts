import { prisma } from "@prequate/db";

export interface OfferView {
  id: string;
  bookingId: string;
  reason: "CANCELLED" | "RESCHEDULE" | "COUNTER";
  partnerFirstName: string;
  slots: { start: string; end: string }[];
}

// Open offers of new times, for a member. Optionally for one booking only.
export async function getOpenOffers(memberId: string, bookingId?: string): Promise<OfferView[]> {
  const now = new Date();
  const offers = await prisma.bookingOffer.findMany({
    where: {
      acceptedAt: null,
      expiresAt: { gt: now },
      booking: { memberId, ...(bookingId ? { id: bookingId } : {}) },
    },
    orderBy: { createdAt: "desc" },
    include: { booking: { include: { partner: { select: { name: true } } } } },
  });

  return offers
    .map((o) => ({
      id: o.id,
      bookingId: o.bookingId,
      reason: o.reason as "CANCELLED" | "RESCHEDULE" | "COUNTER",
      partnerFirstName: o.booking.partner.name.split(" ")[0],
      slots: (JSON.parse(o.slots) as { start: string; end: string }[]).filter((s) => new Date(s.start) > now),
    }))
    .filter((o) => o.slots.length > 0);
}
