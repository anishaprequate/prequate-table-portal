import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@prequate/db";
import { getCurrentAdmin, isFullAdmin, canView, canWrite } from "@/lib/session";
import { adminCancelBooking, adminOfferNewTimes, setBookingOutcome } from "@/lib/actions/bookings";
import { PostComposer } from "@/components/post-composer";
import { BOOKING_STATUS_LABELS, type BookingStatus } from "@prequate/core";
import { formatSlot } from "@/lib/format";
import { BackLink } from "@/components/back-link";
import { CancelBookingForm } from "@/components/cancel-booking-form";
import { Toast } from "@/components/toast";
import { HourRequestCard, REQUEST_ERRORS } from "@/components/hour-request-card";
import { setBookingPlace } from "@/lib/actions/hour-requests";

const KIND_LABELS: Record<string, string> = {
  NOTES: "Meeting notes",
  BRIEF: "Brief",
  OBSERVATION: "Follow-up",
  FILE: "File",
};

export default async function BookingDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { rescheduled?: string; briefAdded?: string; error?: string; offered?: string; requestDone?: string; requestError?: string; placeDone?: string; placeError?: string };
}) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/login");

  const booking = await prisma.booking.findUnique({
    where: { id: params.id },
    include: { member: true, partner: true, briefs: true },
  });
  if (!booking) notFound();

  const fullAdmin = isFullAdmin(admin.role);
  const canAccess = canView(admin.role) || booking.partnerId === admin.id;
  if (!canAccess) redirect("/bookings");
  const writable = canWrite(admin.role);

  const isUpcoming = booking.startTime >= new Date() && booking.status !== "CANCELLED";
  // The partner whose Hour it is can also cancel it, ask to move it, and set the place.
  const canManage = (fullAdmin && writable) || (admin.role === "PARTNER" && booking.partnerId === admin.id);
  const needsOutcome =
    !isUpcoming && booking.status !== "CANCELLED" && booking.status !== "COMPLETED" && booking.status !== "NO_SHOW";

  const hasRequest = isUpcoming && (booking.status === "REQUESTED" || Boolean(booking.pendingStart));

  return (
    <div className="max-w-md">
      <Toast param="placeDone" message="Place confirmed. The member has been told and the calendar invitation is sent." />
      {searchParams.placeError && (
        <p className="mb-6 text-sm text-deep-orange" role="alert">
          {searchParams.placeError === "empty" ? "Type the place first." : "The calendar could not be updated, so nothing changed. Try again."}
        </p>
      )}
      <Toast param="requestDone" message={searchParams.requestDone === "declined" ? "Declined. The member has been told." : "Confirmed. The member has been told."} />
      {searchParams.requestError && (
        <p className="mb-6 text-sm text-deep-orange" role="alert">
          {REQUEST_ERRORS[searchParams.requestError] ?? "Something went wrong."}
        </p>
      )}
      {searchParams.rescheduled && (
        <p className="mb-6 rounded-md bg-orange/10 px-3 py-2 text-sm text-ink">
          Moved to its new time.
        </p>
      )}
      {searchParams.offered === "1" && (
        <p className="mb-6 rounded-md bg-orange/10 px-3 py-2 text-sm text-ink">
          The member has been offered three other times.
        </p>
      )}
      {searchParams.offered === "none" && (
        <p className="mb-6 text-sm text-deep-orange">
          No other times are open in the next week. The member has been asked to choose a new time themselves.
        </p>
      )}
      {searchParams.briefAdded && (
        <p className="mb-6 rounded-md bg-orange/10 px-3 py-2 text-sm text-ink">Brief added.</p>
      )}
      {searchParams.error === "empty-brief" && (
        <p className="mb-6 text-sm text-deep-orange">Add text or a file before saving.</p>
      )}

      <h1 className="mb-1 font-display text-[2.5rem] italic leading-[1.05] tracking-[-0.01em] text-ink">
        {booking.member.name}
      </h1>
      <p className="mb-10 text-sm text-grey">
        {formatSlot(booking.startTime)} · with {booking.partner.name}
        {booking.status !== "REQUESTED" && booking.status !== "CONFIRMED" &&
          ` — ${BOOKING_STATUS_LABELS[booking.status as BookingStatus] ?? booking.status}`}
      </p>

      {hasRequest && canManage && (
        <div className="mb-8">
          <HourRequestCard booking={booking} returnTo={`/bookings/${booking.id}`} showMember={false} />
        </div>
      )}

      {canManage && isUpcoming && booking.status === "CONFIRMED" && booking.mode === "IN_PERSON" && (
        <form action={setBookingPlace} className="mb-8 flex flex-col gap-2">
          <input type="hidden" name="bookingId" value={booking.id} />
          <label className="flex flex-col gap-1 text-sm text-ink">
            Place
            <input
              type="text"
              name="place"
              defaultValue={booking.location ?? ""}
              maxLength={200}
              placeholder="For example, the partner's office, or a restaurant and branch"
              className="min-h-[44px] rounded-md border border-grey/30 bg-paper px-3 text-ink"
            />
          </label>
          <p className="text-xs text-grey">
            {booking.location
              ? "Changing it updates the calendar invitation and tells the member."
              : "Until you confirm the place, the Hour is not on a calendar. Confirming it sends the invitation and tells the member."}
          </p>
          <div>
            <button type="submit" className="min-h-[44px] rounded-md bg-ink px-5 text-sm font-medium text-paper transition hover:bg-ink/90">
              {booking.location ? "Update the place" : "Confirm the place"}
            </button>
          </div>
        </form>
      )}

      {booking.memberContext && (
        <div className="mb-8">
          <p className="mb-1 text-xs uppercase tracking-wide text-grey">Member shared</p>
          <p className="text-sm">{booking.memberContext}</p>
        </div>
      )}

      <div className="mb-8">
        <p className="mb-1 text-xs uppercase tracking-wide text-grey">Format</p>
        <p className="text-sm">{booking.mode === "ONLINE" ? "Online" : "In person"}</p>
        {booking.mode === "ONLINE" && booking.location && (
          <a
            href={booking.location}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all text-sm text-deep-orange underline"
          >
            {booking.location}
          </a>
        )}
      </div>

      {canManage && isUpcoming && (
        <div className="mb-8 flex flex-wrap gap-3">
          {fullAdmin && (
            <Link
              href={`/bookings/${booking.id}/reschedule`}
              className="rounded-md border border-grey/30 px-5 py-3 text-sm font-medium text-ink transition hover:border-grey/60"
            >
              Reschedule
            </Link>
          )}
          <form action={adminOfferNewTimes}>
            <input type="hidden" name="bookingId" value={booking.id} />
            <button
              type="submit"
              className="rounded-md border border-grey/30 px-5 py-3 text-sm font-medium text-ink transition hover:border-grey/60"
            >
              Offer new times
            </button>
          </form>
          <CancelBookingForm bookingId={booking.id} action={adminCancelBooking} />
        </div>
      )}

      {fullAdmin && writable && needsOutcome && (
        <div className="mb-8 flex flex-wrap gap-3">
          <form action={setBookingOutcome}>
            <input type="hidden" name="bookingId" value={booking.id} />
            <input type="hidden" name="outcome" value="COMPLETED" />
            <button
              type="submit"
              className="rounded-md border border-grey/30 px-5 py-3 text-sm font-medium text-ink transition hover:border-grey/60"
            >
              Mark completed
            </button>
          </form>
          <form action={setBookingOutcome}>
            <input type="hidden" name="bookingId" value={booking.id} />
            <input type="hidden" name="outcome" value="NO_SHOW" />
            <button
              type="submit"
              className="rounded-md border border-grey/30 px-5 py-3 text-sm font-medium text-ink transition hover:border-grey/60"
            >
              Mark no-show
            </button>
          </form>
        </div>
      )}

      <div className="mb-4">
        <p className="mb-2 text-xs uppercase tracking-wide text-grey">Shared with the member so far</p>
        {booking.briefs.length === 0 && <p className="text-sm text-grey">None yet.</p>}
        {booking.briefs.map((brief) => (
          <div key={brief.id} className="mb-3 text-sm">
            <p className="mb-0.5 text-xs uppercase tracking-wide text-grey">{KIND_LABELS[brief.kind] ?? "Notes"}</p>
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

      {writable && (
        <div className="mb-8 rounded-lg border border-grey/20 p-4">
          <p className="mb-3 text-xs uppercase tracking-wide text-grey">Post to the member</p>
          <PostComposer bookingId={booking.id} startOpen />
        </div>
      )}

      <BackLink href="/bookings" />
    </div>
  );
}
