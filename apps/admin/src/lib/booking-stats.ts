import { prisma } from "@prequate/db";

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;
const LATE_CANCELLATION_WINDOW_MS = 24 * 60 * 60 * 1000;

// No-show: a confirmed booking marked NO_SHOW. Late cancellation:
// cancelled less than 24 hours before the scheduled start. Both counted
// over the trailing 90 days.
export async function getMemberBookingStats(memberId: string): Promise<{
  noShows: number;
  lateCancellations: number;
}> {
  const since = new Date(Date.now() - NINETY_DAYS_MS);

  const [noShows, cancelled] = await Promise.all([
    prisma.booking.count({
      where: { memberId, status: "NO_SHOW", startTime: { gte: since } },
    }),
    prisma.booking.findMany({
      where: { memberId, status: "CANCELLED", cancelledAt: { not: null, gte: since } },
      select: { startTime: true, cancelledAt: true },
    }),
  ]);

  const lateCancellations = cancelled.filter(
    (b) => b.cancelledAt && b.startTime.getTime() - b.cancelledAt.getTime() < LATE_CANCELLATION_WINDOW_MS,
  ).length;

  return { noShows, lateCancellations };
}
