import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@prequate/db";
import { getCurrentUser } from "@/lib/session";
import { cancelBooking } from "@/lib/actions/bookings";
import { formatSlot } from "@/lib/format";
import { BackLink } from "@/components/back-link";
import { CancelBookingForm } from "@/components/cancel-booking-form";

export default async function BookingDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { confirmed?: string; rescheduled?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const booking = await prisma.booking.findFirst({
    where: { id: params.id, memberId: user.id },
    include: { partner: true, briefs: true },
  });
  if (!booking) notFound();

  const isPast = booking.startTime < new Date();
  const isCancelled = booking.status === "CANCELLED";
  const isUpcoming = !isPast && !isCancelled;

  return (
    <div className="max-w-md">
      {searchParams.confirmed && (
        <p className="mb-6 rounded-md bg-orange/10 px-3 py-2 text-sm text-ink">
          Session confirmed.
        </p>
      )}
      {searchParams.rescheduled && (
        <p className="mb-6 rounded-md bg-orange/10 px-3 py-2 text-sm text-ink">
          Session moved to its new time.
        </p>
      )}

      <h1 className="mb-1 font-display text-4xl italic leading-tight text-ink sm:text-5xl">
        {booking.partner.name}
      </h1>
      <p className="mb-10 text-sm text-grey">
        {formatSlot(booking.startTime)}
        {isCancelled && " — cancelled"}
      </p>

      {booking.memberContext && (
        <div className="mb-8">
          <p className="mb-1 text-xs uppercase tracking-wide text-grey">What you shared</p>
          <p className="text-sm">{booking.memberContext}</p>
        </div>
      )}

      {booking.briefs.length > 0 && (
        <div className="mb-8">
          <p className="mb-2 text-xs uppercase tracking-wide text-grey">Brief</p>
          {booking.briefs.map((brief) => (
            <div key={brief.id} className="mb-3 text-sm">
              {brief.content && <p className="whitespace-pre-wrap">{brief.content}</p>}
              {brief.fileUrl && (
                <a
                  href={brief.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 flex items-center gap-3 rounded-md border border-orange/30 bg-orange/10 px-4 py-3 transition hover:border-orange"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="flex-shrink-0 text-deep-orange">
                    <path d="M14 3v5a2 2 0 0 0 2 2h5" />
                    <path d="M6 2h8l6 6v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z" />
                  </svg>
                  <span className="text-sm font-medium text-ink">{brief.fileName ?? "Attached file"}</span>
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {isUpcoming && (
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/the-hour/${booking.id}/reschedule`}
            className="rounded-md border border-grey/30 px-5 py-3 text-sm font-medium text-ink transition hover:border-grey/60"
          >
            Reschedule
          </Link>
          <CancelBookingForm bookingId={booking.id} action={cancelBooking} />
        </div>
      )}

      <BackLink href="/the-hour" />
    </div>
  );
}
