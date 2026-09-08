import { notFound, redirect } from "next/navigation";
import { prisma } from "@prequate/db";
import { getCurrentAdmin, isFullAdmin, canWrite } from "@/lib/session";
import { getOpenSlots } from "@/lib/availability";
import { adminRescheduleBooking } from "@/lib/actions/bookings";
import { formatDateOnly } from "@/lib/format";
import { SlotPicker, type SlotOption } from "@/components/slot-picker";
import { BackLink } from "@/components/back-link";
import { PageHero } from "@/components/page-hero";

export default async function AdminReschedulePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string; month?: string };
}) {
  const admin = await getCurrentAdmin();
  if (!admin || !isFullAdmin(admin.role) || !canWrite(admin.role)) redirect("/bookings");

  const booking = await prisma.booking.findUnique({
    where: { id: params.id },
    include: { member: true, partner: true },
  });
  if (!booking) notFound();

  const slots = await getOpenSlots(booking.partnerId, booking.id);
  const slotOptions: SlotOption[] = slots.map((slot) => ({
    startTime: slot.startTime.toISOString(),
    endTime: slot.endTime.toISOString(),
    day: formatDateOnly(slot.startTime),
    label: new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" }).format(
      slot.startTime,
    ),
  }));

  return (
    <div className="max-w-md">
      <PageHero
        title="Reschedule"
        accent={booking.member.name}
        subtitle={`Pick a new time on ${booking.partner.name}'s calendar.`}
      />

      {searchParams.error === "no-slot" && (
        <p className="mb-6 text-sm text-deep-orange">Pick a time before confirming.</p>
      )}
      {searchParams.error === "month-used" && (
        <p className="mb-6 text-sm text-deep-orange">
          {booking.member.name} already has a session booked for{" "}
          {searchParams.month ?? "that month"}. Pick a different month.
        </p>
      )}

      <form action={adminRescheduleBooking} className="flex flex-col gap-8">
        <input type="hidden" name="bookingId" value={booking.id} />

        <SlotPicker slots={slotOptions} />

        <button
          type="submit"
          className="w-fit rounded-md bg-ink px-5 py-3 text-sm font-medium text-paper transition hover:bg-ink/90"
        >
          Confirm new time
        </button>
      </form>

      <BackLink href={`/bookings/${booking.id}`} />
    </div>
  );
}
