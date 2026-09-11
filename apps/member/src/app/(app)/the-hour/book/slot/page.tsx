import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@prequate/db";
import { getOpenSlots } from "@/lib/availability";
import { createBooking } from "@/lib/actions/bookings";
import { getCurrentUser } from "@/lib/session";
import { findBookingInMonth } from "@/lib/monthly-cap";
import { formatDateOnly } from "@/lib/format";
import { SlotPicker, type SlotOption } from "@/components/slot-picker";
import { BackLink } from "@/components/back-link";

const MONTH_NAME = new Intl.DateTimeFormat("en-IN", { month: "long" });

export default async function BookSlotPage({
  searchParams,
}: {
  searchParams: {
    partnerId?: string;
    parentBookingId?: string;
    error?: string;
    month?: string;
  };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const partnerId = searchParams.partnerId;
  if (!partnerId) notFound();

  const partner = await prisma.user.findFirst({ where: { id: partnerId, role: "PARTNER" } });
  if (!partner) notFound();

  const now = new Date();
  const monthOffset = searchParams.month === "1" ? 1 : 0;
  const targetMonth = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);

  const [slots, targetMonthBooking] = await Promise.all([
    getOpenSlots(partnerId),
    findBookingInMonth(user.id, targetMonth),
  ]);

  const slotOptions: SlotOption[] = slots
    .filter((slot) => slot.startTime.getFullYear() === targetMonth.getFullYear() && slot.startTime.getMonth() === targetMonth.getMonth())
    .map((slot) => ({
      startTime: slot.startTime.toISOString(),
      endTime: slot.endTime.toISOString(),
      day: formatDateOnly(slot.startTime),
      label: new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" }).format(
        slot.startTime,
      ),
    }));

  return (
    <div className="max-w-md">
      <h1 className="mb-1 font-display text-4xl italic leading-tight text-ink sm:text-5xl">
        {partner.name}
      </h1>
      <p className="mb-10 text-sm text-grey">
        Booking for {MONTH_NAME.format(targetMonth)}. Pick a time, then tell them what to expect.
      </p>

      {searchParams.error === "no-slot" && (
        <p className="mb-6 text-sm text-deep-orange">Pick a time before confirming.</p>
      )}
      {searchParams.error === "month-used" && (
        <p className="mb-6 text-sm text-deep-orange">
          You've already booked your Hour for {searchParams.month ?? "this month"}. Cancel that
          session first, or pick a different month.
        </p>
      )}

      {targetMonthBooking ? (
        <p className="mb-8 text-sm text-grey">
          You've already booked your Hour for {MONTH_NAME.format(targetMonth)}.{" "}
          <Link href={`/the-hour/${targetMonthBooking.id}`} className="text-ink underline hover:no-underline">
            View that session
          </Link>
          .
        </p>
      ) : (
        <form action={createBooking} className="flex flex-col gap-8">
          <input type="hidden" name="partnerId" value={partnerId} />
          {searchParams.parentBookingId && (
            <input type="hidden" name="parentBookingId" value={searchParams.parentBookingId} />
          )}

          {slotOptions.length === 0 ? (
            <p className="text-sm text-grey">No open slots left with {partner.name} in {MONTH_NAME.format(targetMonth)}.</p>
          ) : (
            <SlotPicker slots={slotOptions} />
          )}

          <label className="flex flex-col gap-1.5 text-sm">
            What do you want to cover?
            <textarea
              name="memberContext"
              rows={4}
              placeholder="A word on what's on your mind for this session."
              className="rounded-md border border-grey/30 bg-paper px-3 py-2 text-ink"
            />
          </label>

          <button
            type="submit"
            className="w-fit rounded-md bg-ink px-5 py-3 text-sm font-medium text-paper transition hover:bg-ink/90"
          >
            Confirm session
          </button>
        </form>
      )}

      <BackLink href="/the-hour/book" />
    </div>
  );
}
