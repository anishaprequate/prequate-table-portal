import { prisma } from "@prequate/db";

// One Hour per calendar month per member. Cancelled bookings don't count —
// cancelling frees the month back up for a fresh booking. Mirrors
// apps/member/src/lib/monthly-cap.ts since admin can also reschedule a
// booking on a member's behalf and must respect the same rule.

export function formatMonthLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(date);
}

export async function findBookingInMonth(
  memberId: string,
  referenceDate: Date,
  excludeBookingId?: string,
) {
  const monthStart = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
  const monthEnd = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 1);

  return prisma.booking.findFirst({
    where: {
      memberId,
      status: { not: "CANCELLED" },
      startTime: { gte: monthStart, lt: monthEnd },
      ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
    },
  });
}
