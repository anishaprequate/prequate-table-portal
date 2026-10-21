import { prisma } from "@prequate/db";

// One Hour per calendar month per member. Cancelled bookings don't count —
// cancelling frees the month back up for a fresh booking.

export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

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

// An advisor request uses the month too, so one Hour a month covers partners
// and advisors together. A request waiting for times or with times offered
// counts in the month of the date proposed; a confirmed one counts in the
// month it is confirmed for. Declined and withdrawn requests free the month.
export async function findAdvisorRequestInMonth(memberId: string, referenceDate: Date, excludeRequestId?: string) {
  const monthStart = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
  const monthEnd = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 1);

  return prisma.advisorRequest.findFirst({
    where: {
      memberId,
      ...(excludeRequestId ? { id: { not: excludeRequestId } } : {}),
      OR: [
        { status: { in: ["REQUESTED", "OFFERED"] }, proposedDate: { gte: monthStart, lt: monthEnd } },
        { status: "CONFIRMED", confirmedStart: { gte: monthStart, lt: monthEnd } },
      ],
    },
    include: { advisor: { select: { name: true } } },
  });
}

export interface MonthHour {
  kind: "partner" | "advisor";
  // First name of the partner or advisor.
  firstName: string;
  // When the Hour is, or, for an advisor request without a time yet, the day proposed.
  at: Date;
  hasTime: boolean;
  // The booking to open; advisor requests open The Hour page.
  bookingId: string | null;
}

// The member's Hour in this month, with a partner or an advisor, if any.
export async function findHourInMonth(
  memberId: string,
  referenceDate: Date,
  excludeBookingId?: string,
): Promise<MonthHour | null> {
  const [booking, request] = await Promise.all([
    findBookingInMonth(memberId, referenceDate, excludeBookingId),
    findAdvisorRequestInMonth(memberId, referenceDate),
  ]);
  if (booking) {
    const partner = await prisma.user.findUnique({ where: { id: booking.partnerId }, select: { name: true } });
    return {
      kind: "partner",
      firstName: (partner?.name ?? "your partner").split(" ")[0],
      at: booking.startTime,
      hasTime: true,
      bookingId: booking.id,
    };
  }
  if (request) {
    return {
      kind: "advisor",
      firstName: request.advisor.name.split(" ")[0],
      at: request.status === "CONFIRMED" && request.confirmedStart ? request.confirmedStart : request.proposedDate,
      hasTime: request.status === "CONFIRMED" && Boolean(request.confirmedStart),
      bookingId: null,
    };
  }
  return null;
}
