import { notFound, redirect } from "next/navigation";
import { prisma } from "@prequate/db";
import { getCurrentUser } from "@/lib/session";
import { getOpenSlots } from "@/lib/availability";
import { rescheduleBooking } from "@/lib/actions/bookings";
import { formatDateOnly } from "@/lib/format";
import { SlotPicker, type SlotOption } from "@/components/slot-picker";
import { BackLink } from "@/components/back-link";

export default async function ReschedulePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string; month?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const booking = await prisma.booking.findFirst({
    where: { id: params.id, memberId: user.id },
    include: { partner: true },
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
      <h1 className="mb-1 font-display text-3xl italic leading-tight text-ink sm:text-4xl">
        Reschedule with <span className="text-deep-orange">{booking.partner.name}</span>
      </h1>
      <p className="mb-10 text-sm text-grey">Pick a new time. Your context carries over.</p>

      {searchParams.error === "no-slot" && (
        <p className="mb-6 text-sm text-deep-orange">Pick a time before confirming.</p>
      )}
      {searchParams.error === "month-used" && (
        <p className="mb-6 text-sm text-deep-orange">
          You've already got a session booked for {searchParams.month ?? "that month"}. Pick a
          different month.
        </p>
      )}

      <form action={rescheduleBooking} className="flex flex-col gap-8">
        <input type="hidden" name="bookingId" value={booking.id} />

        <SlotPicker slots={slotOptions} />

        <button
          type="submit"
          className="w-fit rounded-md bg-ink px-5 py-3 text-sm font-medium text-paper transition hover:bg-ink/90"
        >
          Confirm new time
        </button>
      </form>

      <BackLink href={`/the-hour/${booking.id}`} />
    </div>
  );
}
