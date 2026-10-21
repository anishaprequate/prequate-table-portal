import { notFound, redirect } from "next/navigation";
import { prisma } from "@prequate/db";
import { getCurrentUser } from "@/lib/session";
import { getMonthView } from "@/lib/hour-calendar";
import { formatSlot } from "@/lib/format";
import { PageHero } from "@/components/page-hero";
import { BackLink } from "@/components/back-link";
import { HourCalendar } from "@/components/hour/hour-calendar";

// Move an Hour. Same as booking: a calendar of green dots for this partner, a
// day, a time from the list. If the time is free the Hour moves at once.
export default async function ReschedulePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { m?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const booking = await prisma.booking.findFirst({
    where: { id: params.id, memberId: user.id },
    include: { partner: { select: { name: true } } },
  });
  if (!booking) notFound();
  if (booking.status === "CANCELLED" || booking.startTime < new Date()) redirect(`/the-hour/${booking.id}`);

  const scope = { partnerId: booking.partnerId, excludeBookingId: booking.id };
  let view = await getMonthView(user.id, searchParams.m, scope);
  // No month chosen, and this one has nothing open: open on the next one.
  if (!searchParams.m && (view.used || view.openDays.length === 0) && view.months[1]) {
    const next = await getMonthView(user.id, view.months[1].param, scope);
    if (!next.used && next.openDays.length > 0) view = next;
  }

  return (
    <div className="max-w-md">
      <PageHero title="Move your" accent="Hour." subtitle={`With ${booking.partner.name}. Now ${formatSlot(booking.startTime)}.`} />
      <HourCalendar view={view} parentBookingId={null} reschedule={{ bookingId: booking.id }} />
      <div className="mt-10">
        <BackLink href={`/the-hour/${booking.id}`} />
      </div>
    </div>
  );
}
