import { redirect } from "next/navigation";
import { prisma } from "@prequate/db";
import { getCurrentAdmin, canView } from "@/lib/session";
import { BOOKING_STATUS_LABELS, type BookingStatus } from "@prequate/core";
import { formatDateOnly } from "@/lib/format";
import { PageHero } from "@/components/page-hero";

const INACTIVE_THRESHOLD_DAYS = 60;

export default async function ReportsPage() {
  const admin = await getCurrentAdmin();
  if (!admin || !canView(admin.role)) redirect("/bookings");

  const now = new Date();

  const [
    bookings,
    partners,
    events,
    conciergeRequests,
    members,
    lastBookingByMember,
    lastConciergeByMember,
    lastMessageByMember,
    lastAttendanceByMember,
  ] = await Promise.all([
    prisma.booking.findMany({ select: { status: true, partnerId: true } }),
    prisma.user.findMany({ where: { role: "PARTNER" }, orderBy: { name: "asc" } }),
    prisma.event.findMany({
      where: { publishedAt: { not: null } },
      include: { attendances: true },
      orderBy: { startTime: "desc" },
    }),
    prisma.conciergeRequest.findMany({ select: { status: true, dueAt: true, createdAt: true, updatedAt: true } }),
    prisma.user.findMany({ where: { role: "MEMBER" }, select: { id: true, name: true, lastActiveAt: true } }),
    prisma.booking.groupBy({ by: ["memberId"], _max: { createdAt: true } }),
    prisma.conciergeRequest.groupBy({ by: ["memberId"], _max: { createdAt: true } }),
    prisma.message.groupBy({ by: ["memberId"], where: { senderRole: "MEMBER" }, _max: { createdAt: true } }),
    prisma.eventAttendance.groupBy({ by: ["memberId"], _max: { createdAt: true } }),
  ]);

  // 1. Hour utilization
  const bookingsByStatus = new Map<string, number>();
  for (const b of bookings) bookingsByStatus.set(b.status, (bookingsByStatus.get(b.status) ?? 0) + 1);
  const bookingsByPartner = partners.map((partner) => {
    const own = bookings.filter((b) => b.partnerId === partner.id);
    return {
      name: partner.name,
      total: own.length,
      completed: own.filter((b) => b.status === "COMPLETED").length,
      noShow: own.filter((b) => b.status === "NO_SHOW").length,
    };
  });

  // 2. Event attendance
  const eventStats = events.map((event) => {
    const joined = event.attendances.filter((a) => a.joined);
    const waitlist = event.attendances.filter((a) => a.waitlisted);
    const takenSpots = joined.reduce((sum, a) => sum + 1 + a.guestCount, 0);
    const fillRate = event.capacity ? Math.round((takenSpots / event.capacity) * 100) : null;
    return { id: event.id, title: event.title, startTime: event.startTime, takenSpots, capacity: event.capacity, fillRate, waitlist: waitlist.length };
  });

  // 3. Concierge time-to-fulfillment
  const fulfilled = conciergeRequests.filter((r) => r.status === "FULFILLED");
  const avgDays = fulfilled.length
    ? fulfilled.reduce((sum, r) => sum + (r.updatedAt.getTime() - r.createdAt.getTime()), 0) /
      fulfilled.length /
      (24 * 60 * 60 * 1000)
    : null;
  const fulfilledWithSla = fulfilled.filter((r) => r.dueAt !== null);
  const onTime = fulfilledWithSla.filter((r) => r.updatedAt <= r.dueAt!).length;
  const onTimePct = fulfilledWithSla.length ? Math.round((onTime / fulfilledWithSla.length) * 100) : null;
  const openOverdue = conciergeRequests.filter(
    (r) => r.status !== "FULFILLED" && r.status !== "DECLINED" && r.dueAt !== null && r.dueAt < now,
  ).length;

  // 4. 60-day-inactive
  const lastOf = (rows: { memberId: string; _max: { createdAt: Date | null } }[]) =>
    new Map(rows.map((r) => [r.memberId, r._max.createdAt]));
  const bookingMap = lastOf(lastBookingByMember);
  const conciergeMap = lastOf(lastConciergeByMember);
  const messageMap = lastOf(lastMessageByMember);
  const attendanceMap = lastOf(lastAttendanceByMember);

  const inactivity = members
    .map((member) => {
      const dates = [
        member.lastActiveAt,
        bookingMap.get(member.id) ?? null,
        conciergeMap.get(member.id) ?? null,
        messageMap.get(member.id) ?? null,
        attendanceMap.get(member.id) ?? null,
      ].filter((d): d is Date => d !== null);
      const lastTouch = dates.length ? new Date(Math.max(...dates.map((d) => d.getTime()))) : null;
      const daysSince = lastTouch ? Math.floor((now.getTime() - lastTouch.getTime()) / (24 * 60 * 60 * 1000)) : null;
      return { name: member.name, lastTouch, daysSince };
    })
    .filter((m) => m.daysSince === null || m.daysSince >= INACTIVE_THRESHOLD_DAYS)
    .sort((a, b) => (b.daysSince ?? Infinity) - (a.daysSince ?? Infinity));

  return (
    <div className="max-w-3xl">
      <PageHero title="Reports" subtitle="Where things stand, across the room." />

      <section className="mb-12">
        <h2 className="mb-4 text-xs uppercase tracking-wide text-grey">The Hour</h2>
        <div className="mb-4 flex flex-wrap gap-x-6 gap-y-1 text-sm">
          {(Object.keys(BOOKING_STATUS_LABELS) as BookingStatus[]).map((status) => (
            <span key={status}>
              {BOOKING_STATUS_LABELS[status]}: {bookingsByStatus.get(status) ?? 0}
            </span>
          ))}
        </div>
        {bookingsByPartner.length > 0 && (
          <ul className="flex flex-col divide-y divide-grey/15 text-sm">
            {bookingsByPartner.map((p) => (
              <li key={p.name} className="py-2">
                {p.name} · {p.total} total, {p.completed} completed, {p.noShow} no-show
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mb-12">
        <h2 className="mb-4 text-xs uppercase tracking-wide text-grey">Events</h2>
        {eventStats.length === 0 && <p className="text-sm text-grey">No published events.</p>}
        <ul className="flex flex-col divide-y divide-grey/15 text-sm">
          {eventStats.map((e) => (
            <li key={e.id} className="py-2">
              {e.title} ({formatDateOnly(e.startTime)}) ·{" "}
              {e.capacity != null ? `${e.takenSpots} of ${e.capacity} (${e.fillRate}%)` : `${e.takenSpots} joined, uncapped`}
              {e.waitlist > 0 && ` · ${e.waitlist} waitlisted`}
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-12">
        <h2 className="mb-4 text-xs uppercase tracking-wide text-grey">Concierge</h2>
        <p className="text-sm">
          Average time to fulfillment: {avgDays !== null ? `${avgDays.toFixed(1)} days` : "No fulfilled requests yet"}
        </p>
        <p className="text-sm">
          On-time against SLA: {onTimePct !== null ? `${onTimePct}%` : "No SLA-tracked fulfillments yet"}
        </p>
        <p className="text-sm">Currently overdue and still open: {openOverdue}</p>
      </section>

      <section>
        <h2 className="mb-4 text-xs uppercase tracking-wide text-grey">
          60-day inactive ({inactivity.length})
        </h2>
        {inactivity.length === 0 && <p className="text-sm text-grey">Everyone's had a touch within 60 days.</p>}
        <ul className="flex flex-col divide-y divide-grey/15 text-sm">
          {inactivity.map((m) => (
            <li key={m.name} className="py-2">
              {m.name} ·{" "}
              {m.lastTouch ? `last touch ${formatDateOnly(m.lastTouch)} (${m.daysSince} days ago)` : "never touched"}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
