import { prisma } from "@prequate/db";
import { getMemberBookingStats } from "@/lib/booking-stats";

// Shared by every /members/[id]/* page — one fetch of the member plus
// whatever else that specific page needs is still per-page, but the
// member row itself and the not-found check happen once here.
export async function getMemberOrNull(id: string) {
  const member = await prisma.user.findUnique({ where: { id } });
  if (!member || member.role !== "MEMBER") return null;
  return member;
}

export async function getMemberActivity(memberId: string) {
  const [hoursUsed, conciergeUsed, bookingStats] = await Promise.all([
    prisma.booking.count({ where: { memberId, status: "COMPLETED" } }),
    prisma.conciergeRequest.count({ where: { memberId } }),
    getMemberBookingStats(memberId),
  ]);
  return { hoursUsed, conciergeUsed, bookingStats };
}
