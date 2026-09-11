import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@prequate/db";
import { getCurrentUser } from "@/lib/session";
import { formatSlot } from "@/lib/format";
import { findBookingInMonth, formatMonthLabel } from "@/lib/monthly-cap";
import { PageHero } from "@/components/page-hero";

export default async function TheHourPage({
  searchParams,
}: {
  searchParams: { confirmed?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const bookings = await prisma.booking.findMany({
    where: { memberId: user.id },
    include: { partner: true },
    orderBy: { startTime: "desc" },
  });

  const now = new Date();
  const upcoming = bookings
    .filter((b) => b.status !== "CANCELLED" && b.startTime >= now)
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  const past = bookings.filter((b) => b.startTime < now || b.status === "CANCELLED");

  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const [currentMonthBooking, nextMonthBooking] = await Promise.all([
    findBookingInMonth(user.id, now),
    findBookingInMonth(user.id, nextMonthStart),
  ]);

  // Book a session always stays available as long as either month still
  // has room — it just skips straight to whichever month is still open,
  // or asks which one when both are.
  const bookHref = currentMonthBooking && nextMonthBooking
    ? null
    : currentMonthBooking
      ? "/the-hour/book?month=1"
      : nextMonthBooking
        ? "/the-hour/book?month=0"
        : "/the-hour/book/month";

  return (
    <div className="max-w-2xl">
      {searchParams.confirmed && (
        <p className="mb-6 rounded-md bg-orange/10 px-3 py-2 text-sm text-ink">
          Session confirmed.
        </p>
      )}

      <div className="mb-10 flex items-start justify-between gap-6">
        <PageHero title="The" accent="Hour." subtitle="Time with a partner, on your terms." />
        {bookHref ? (
          <Link
            href={bookHref}
            className="flex-shrink-0 rounded-md bg-orange px-5 py-3 text-sm font-medium text-ink transition hover:bg-deep-orange hover:text-paper"
          >
            Book a session
          </Link>
        ) : (
          <p className="flex-shrink-0 text-sm text-grey">
            You've booked your Hour for {formatMonthLabel(now)} and {formatMonthLabel(nextMonthStart)}.
          </p>
        )}
      </div>

      <section className="mb-12">
        <h2 className="mb-4 text-xs uppercase tracking-wide text-grey">Upcoming</h2>
        {upcoming.length === 0 && (
          <p className="text-sm text-grey">Nothing booked. Start with the button above.</p>
        )}
        <ul className="flex flex-col divide-y divide-grey/15">
          {upcoming.map((booking) => (
            <li key={booking.id} className="py-4">
              <Link href={`/the-hour/${booking.id}`} className="block">
                <p className="font-display text-xl italic leading-tight text-ink">{booking.partner.name}</p>
                <p className="text-sm text-grey">{formatSlot(booking.startTime)}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-4 text-xs uppercase tracking-wide text-grey">Past</h2>
        {past.length === 0 && <p className="text-sm text-grey">No sessions yet.</p>}
        <ul className="flex flex-col divide-y divide-grey/15">
          {past.map((booking) => (
            <li key={booking.id} className="py-4">
              <Link href={`/the-hour/${booking.id}`} className="block">
                <p className="font-display text-xl italic leading-tight text-ink">{booking.partner.name}</p>
                <p className="text-sm text-grey">
                  {formatSlot(booking.startTime)}
                  {booking.status === "CANCELLED" && " — cancelled"}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
