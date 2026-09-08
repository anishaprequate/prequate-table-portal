import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@prequate/db";
import { getCurrentUser } from "@/lib/session";
import { CONCIERGE_STATUS_LABELS, type ConciergeStatus } from "@prequate/core";
import { formatSlot, formatDateOnly } from "@/lib/format";
import { PageHero } from "@/components/page-hero";
import { Greeting } from "@/components/greeting";
import { SeatBadge } from "@/components/seat-badge";

function greeting(hour: number): string {
  if (hour < 12) return "Good morning,";
  if (hour < 17) return "Good afternoon,";
  return "Good evening,";
}

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const now = new Date();

  const [nextBooking, upcomingEvents, conciergeRequests, latestInsight, latestMessages] =
    await Promise.all([
      prisma.booking.findFirst({
        where: { memberId: user.id, startTime: { gte: now }, status: { not: "CANCELLED" } },
        orderBy: { startTime: "asc" },
        include: { partner: true },
      }),
      prisma.eventAttendance.findMany({
        where: { memberId: user.id, joined: true, event: { startTime: { gte: now } } },
        include: { event: true },
        orderBy: { event: { startTime: "asc" } },
        take: 2,
      }),
      prisma.conciergeRequest.findMany({
        where: { memberId: user.id, status: { in: ["SUBMITTED", "AWAITING_APPROVAL", "ACCEPTED"] } },
        include: { category: true },
        orderBy: { createdAt: "desc" },
        take: 2,
      }),
      prisma.insightPost.findFirst({
        where: { publishedAt: { not: null } },
        orderBy: { publishedAt: "desc" },
      }),
      prisma.message.findMany({
        where: { memberId: user.id, senderRole: { not: "MEMBER" } },
        orderBy: { createdAt: "desc" },
        take: 1,
      }),
    ]);

  const latestMessage = latestMessages[0];

  const hoursToNextBooking = nextBooking
    ? (nextBooking.startTime.getTime() - now.getTime()) / (60 * 60 * 1000)
    : null;
  const bookingIsSoon = hoursToNextBooking !== null && hoursToNextBooking <= 24;

  const firstName = user.name.split(" ")[0];

  return (
    <div className="max-w-2xl">
      <div className="mb-12 flex items-start justify-between gap-6">
        <PageHero title={<Greeting fallback={greeting(now.getHours())} />} accent={firstName} />
        <div className="flex flex-shrink-0 flex-col items-center gap-3">
          <SeatBadge seatNumber={user.seatNumber} />
          <Link href="/profile">
            {user.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.photoUrl}
                alt=""
                className="h-12 w-12 rounded-full object-cover"
                draggable={false}
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange/10 font-display text-base text-ink">
                {user.name.charAt(0)}
              </div>
            )}
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <Link
          href="/the-hour"
          className="block rounded-md border border-grey/30 px-5 py-4 transition hover:border-orange"
        >
          <p className="mb-1 text-xs uppercase tracking-wide text-grey">The Hour</p>
          {nextBooking ? (
            <p className="text-sm">
              {formatSlot(nextBooking.startTime)} with {nextBooking.partner.name} · {nextBooking.status}
              {bookingIsSoon && <span className="ml-1 text-deep-orange">· Starting soon</span>}
            </p>
          ) : (
            <p className="text-sm">No upcoming session. Book one.</p>
          )}
        </Link>

        <Link
          href="/events"
          className="block rounded-md border border-grey/30 px-5 py-4 transition hover:border-orange"
        >
          <p className="mb-1 text-xs uppercase tracking-wide text-grey">Events</p>
          {upcomingEvents.length === 0 ? (
            <p className="text-sm">Nothing on your calendar yet.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {upcomingEvents.map((attendance) => (
                <li key={attendance.id} className="text-sm">
                  {attendance.event.title} · {formatDateOnly(attendance.event.startTime)}
                </li>
              ))}
            </ul>
          )}
        </Link>

        <Link
          href="/concierge"
          className="block rounded-md border border-grey/30 px-5 py-4 transition hover:border-orange"
        >
          <p className="mb-1 text-xs uppercase tracking-wide text-grey">Concierge</p>
          {conciergeRequests.length === 0 ? (
            <p className="text-sm">No open requests.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {conciergeRequests.map((request) => (
                <li key={request.id} className="text-sm">
                  {request.category?.category ?? "General request"} ·{" "}
                  {CONCIERGE_STATUS_LABELS[request.status as ConciergeStatus] ?? request.status}
                </li>
              ))}
            </ul>
          )}
        </Link>

        <Link
          href="/insight"
          className="block rounded-md border border-grey/30 px-5 py-4 transition hover:border-orange"
        >
          <p className="mb-1 text-xs uppercase tracking-wide text-grey">Insight</p>
          {latestInsight ? (
            <p className="text-sm">{latestInsight.title}</p>
          ) : (
            <p className="text-sm">Nothing published yet.</p>
          )}
        </Link>

        <Link
          href="/messages"
          className="block rounded-md border border-grey/30 px-5 py-4 transition hover:border-orange"
        >
          <p className="mb-1 text-xs uppercase tracking-wide text-grey">Messages</p>
          {latestMessage ? (
            <p className="text-sm">
              {latestMessage.body.slice(0, 60)} · {formatSlot(latestMessage.createdAt)}
            </p>
          ) : (
            <p className="text-sm">No messages yet.</p>
          )}
        </Link>
      </div>
    </div>
  );
}
