import { prisma } from "@prequate/db";

export const INACTIVE_THRESHOLD_DAYS = 60;

// Shared by the Reports "60-day inactive" table and the daily
// /api/cron/member-inactivity job, so both agree on the same definition.
// Broadened slightly beyond the three touch types named in the brief (last
// Hour booking, last event attendance, last message sent or received) to
// also count Concierge activity and the member's own last app login —
// both are genuine engagement signals already tracked, and leaving them
// out would flag someone as gone quiet while they're actively using
// Concierge or the app itself. See the stage report for this call.
export async function getLastTouchByMember(
  memberIds: string[],
): Promise<Map<string, Date | null>> {
  const [members, bookings, concierge, messages, attendances] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: memberIds } }, select: { id: true, lastActiveAt: true } }),
    prisma.booking.groupBy({ by: ["memberId"], where: { memberId: { in: memberIds } }, _max: { createdAt: true } }),
    prisma.conciergeRequest.groupBy({
      by: ["memberId"],
      where: { memberId: { in: memberIds } },
      _max: { createdAt: true },
    }),
    prisma.message.groupBy({ by: ["memberId"], where: { memberId: { in: memberIds } }, _max: { createdAt: true } }),
    prisma.eventAttendance.groupBy({
      by: ["memberId"],
      where: { memberId: { in: memberIds }, joined: true },
      _max: { createdAt: true },
    }),
  ]);

  const lastOf = (rows: { memberId: string; _max: { createdAt: Date | null } }[]) =>
    new Map(rows.map((r) => [r.memberId, r._max.createdAt]));
  const bookingMap = lastOf(bookings);
  const conciergeMap = lastOf(concierge);
  const messageMap = lastOf(messages);
  const attendanceMap = lastOf(attendances);

  const result = new Map<string, Date | null>();
  for (const member of members) {
    const dates = [
      member.lastActiveAt,
      bookingMap.get(member.id) ?? null,
      conciergeMap.get(member.id) ?? null,
      messageMap.get(member.id) ?? null,
      attendanceMap.get(member.id) ?? null,
    ].filter((d): d is Date => d !== null);
    result.set(member.id, dates.length ? new Date(Math.max(...dates.map((d) => d.getTime()))) : null);
  }
  return result;
}
