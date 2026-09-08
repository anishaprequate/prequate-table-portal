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

  return (
    <div className="max-w-3xl">
      <PageHero
        title={viewAll ? "Bookings" : "My bookings"}
        subtitle={
          viewAll
            ? "Across every partner's calendar."
            : "Sessions on your calendar, with what each member shared."
        }
      />

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
