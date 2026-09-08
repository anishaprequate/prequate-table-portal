import { prisma } from "@prequate/db";
import { googleCalendar } from "@prequate/core";

type CalendarSlot = { startTime: Date; endTime: Date };

export async function getOpenSlots(
  partnerId: string,
  excludeBookingId?: string,
): Promise<CalendarSlot[]> {
  const allSlots = googleCalendar.getPartnerAvailability(partnerId);

  const existing = await prisma.booking.findMany({
    where: {
      partnerId,
      status: { not: "CANCELLED" },
      ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
    },
    select: { startTime: true },
  });

  const taken = new Set(existing.map((b) => b.startTime.getTime()));

  return allSlots.filter((slot) => !taken.has(slot.startTime.getTime()));
}
