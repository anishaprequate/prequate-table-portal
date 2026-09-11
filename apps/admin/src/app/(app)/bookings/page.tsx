import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@prequate/db";
import { getCurrentAdmin, canView } from "@/lib/session";
import { BOOKING_STATUS_LABELS, type BookingStatus } from "@prequate/core";
import { formatSlot } from "@/lib/format";
import { PageHero } from "@/components/page-hero";

export default async function BookingsPage() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/login");

  const viewAll = canView(admin.role);

  const bookings = await prisma.booking.findMany({
    where: viewAll ? {} : { partnerId: admin.id },
    include: { member: true, partner: true },
    orderBy: { startTime: "desc" },
  });

  const now = new Date();
  const upcoming = bookings
    .filter((b) => b.status !== "CANCELLED" && b.startTime >= now)
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  const past = bookings.filter((b) => b.startTime < now || b.status === "CANCELLED");

  // Per partner, last 90 days — a simple watch list, not a full report
  // (the fuller reporting dashboard is its own later stage).
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const LATE_CANCELLATION_WINDOW_MS = 24 * 60 * 60 * 1000;
  const partnerStats = viewAll
    ? Object.values(
        bookings.reduce<Record<string, { name: string; noShows: number; lateCancellations: number }>>(
          (acc, b) => {
            if (b.startTime < ninetyDaysAgo) return acc;
            acc[b.partnerId] ??= { name: b.partner.name, noShows: 0, lateCancellations: 0 };
            if (b.status === "NO_SHOW") acc[b.partnerId].noShows++;
            if (b.status === "CANCELLED" && b.cancelledAt && b.startTime.getTime() - b.cancelledAt.getTime() < LATE_CANCELLATION_WINDOW_MS) {
              acc[b.partnerId].lateCancellations++;
            }
            return acc;
          },
          {},
        ),
      ).filter((p) => p.noShows > 0 || p.lateCancellations > 0)
    : [];

  return (
    <div className="max-w-3xl">
      <div className="flex items-start justify-between gap-6">
        <PageHero
          title={viewAll ? "Bookings" : "My bookings"}
          subtitle={
            viewAll
              ? "Across every partner's calendar."
              : "Sessions on your calendar, with what each member shared."
          }
        />
        {viewAll && (
          <Link
            href="/checkin/hour"
            className="mt-2 flex-shrink-0 rounded-md border border-grey/30 px-4 py-2 text-sm font-medium text-ink transition hover:border-grey/60"
          >
            Check in
          </Link>
        )}
      </div>

      {partnerStats.length > 0 && (
        <div className="mb-10 rounded-md border border-grey/20 p-4">
          <p className="mb-2 text-xs uppercase tracking-wide text-grey">
            No-shows and late cancellations by partner (last 90 days)
          </p>
          <ul className="flex flex-col gap-1 text-sm text-grey">
            {partnerStats.map((p) => (
              <li key={p.name}>
                {p.name} — {p.noShows} no-show{p.noShows === 1 ? "" : "s"}, {p.lateCancellations} late cancellation
                {p.lateCancellations === 1 ? "" : "s"}
              </li>
            ))}
          </ul>
        </div>
      )}

      <section className="mb-12">
        <h2 className="mb-4 text-xs uppercase tracking-wide text-grey">Upcoming</h2>
        {upcoming.length === 0 && <p className="text-sm text-grey">Nothing on the calendar.</p>}
        <BookingTable bookings={upcoming} showPartner={viewAll} />
      </section>

      <section>
        <h2 className="mb-4 text-xs uppercase tracking-wide text-grey">Past</h2>
        {past.length === 0 && <p className="text-sm text-grey">No sessions yet.</p>}
        <BookingTable bookings={past} showPartner={viewAll} />
      </section>
    </div>
  );
}

function BookingTable({
  bookings,
  showPartner,
}: {
  bookings: Array<{
    id: string;
    startTime: Date;
    status: string;
    member: { name: string };
    partner: { name: string };
  }>;
  showPartner: boolean;
}) {
  if (bookings.length === 0) return null;

  return (
    <ul className="flex flex-col divide-y divide-grey/15">
      {bookings.map((booking) => (
        <li key={booking.id} className="py-4">
          <Link href={`/bookings/${booking.id}`} className="block">
            <p className="font-display text-xl italic leading-tight text-ink">
              {booking.member.name}
              {showPartner && (
                <span className="font-sans text-sm not-italic text-grey"> · {booking.partner.name}</span>
              )}
            </p>
            <p className="text-sm text-grey">
              {formatSlot(booking.startTime)}
              {booking.status !== "REQUESTED" && booking.status !== "CONFIRMED" &&
                ` — ${BOOKING_STATUS_LABELS[booking.status as BookingStatus] ?? booking.status}`}
              {booking.status !== "CANCELLED" &&
                booking.startTime.getTime() - Date.now() <= 24 * 60 * 60 * 1000 &&
                booking.startTime.getTime() > Date.now() && (
                  <span className="text-deep-orange"> · Starting soon</span>
                )}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
