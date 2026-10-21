import { prisma } from "@prequate/db";
import { availability } from "@prequate/core";

type CalendarSlot = availability.CalendarSlot;

// Open Hours for one partner. All the work (windows, busy time, bookings,
// lead time) lives in @prequate/core, so the member calendar, Home and the
// admin reschedule page can never disagree.
export async function getOpenSlots(partnerId: string, excludeBookingId?: string): Promise<CalendarSlot[]> {
  const partner = await prisma.user.findUnique({
    where: { id: partnerId },
    select: { id: true, email: true, tableHoursCalendarId: true },
  });
  if (!partner) return [];
  return availability.getOpenSlots(partner, { excludeBookingId });
}
