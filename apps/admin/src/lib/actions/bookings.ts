"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@prequate/db";
import { googleCalendar, createAlternativeOffer } from "@prequate/core";
import { getCurrentAdmin, isFullAdmin, canView, canWrite } from "@/lib/session";
import { findBookingInMonth, formatMonthLabel } from "@/lib/monthly-cap";

async function requireBookingAccess(bookingId: string) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/login");

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) redirect("/bookings");

  const canAccess = canView(admin.role) || booking.partnerId === admin.id;
  if (!canAccess) redirect("/bookings");

  return { admin, booking };
}

// Who may change an Hour: a full admin who can write, or the partner whose
// Hour it is. An associate (read only) cannot.
function canManageBooking(admin: { id: string; role: string }, booking: { partnerId: string }) {
  if (isFullAdmin(admin.role) && canWrite(admin.role)) return true;
  return admin.role === "PARTNER" && booking.partnerId === admin.id;
}

export async function adminCancelBooking(formData: FormData) {
  const bookingId = String(formData.get("bookingId") ?? "");
  const { admin, booking } = await requireBookingAccess(bookingId);
  if (!canManageBooking(admin, booking)) redirect(`/bookings/${bookingId}`);

  const reason = String(formData.get("reason") ?? "").trim() || null;

  if (booking.googleCalendarEventId) {
    await googleCalendar.cancelCalendarEvent(booking.googleCalendarEventId);
  }

  await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "CANCELLED", cancelledAt: new Date(), cancellationReason: reason },
  });

  // The member is offered three other times with the same partner.
  await createAlternativeOffer({ bookingId, reason: "CANCELLED" });

  revalidatePath("/bookings");
  redirect("/bookings");
}

// The partner needs to move an Hour: the member is offered three other times
// and takes one with a tap. The Hour stays as it is until they do.
export async function adminOfferNewTimes(formData: FormData) {
  const bookingId = String(formData.get("bookingId") ?? "");
  const { admin, booking } = await requireBookingAccess(bookingId);
  if (!canManageBooking(admin, booking)) redirect(`/bookings/${bookingId}`);
  if (booking.status === "CANCELLED" || booking.startTime < new Date()) redirect(`/bookings/${bookingId}`);

  await prisma.booking.update({ where: { id: bookingId }, data: { status: "RESCHEDULE_REQUESTED" } });
  const offer = await createAlternativeOffer({ bookingId, reason: "RESCHEDULE" });

  revalidatePath("/bookings");
  redirect(`/bookings/${bookingId}?offered=${offer ? "1" : "none"}`);
}

export async function adminRescheduleBooking(formData: FormData) {
  const bookingId = String(formData.get("bookingId") ?? "");
  const { admin, booking } = await requireBookingAccess(bookingId);
  if (!isFullAdmin(admin.role) || !canWrite(admin.role)) redirect(`/bookings/${bookingId}`);

  const startTime = new Date(String(formData.get("startTime") ?? ""));
  const endTime = new Date(String(formData.get("endTime") ?? ""));

  if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
    redirect(`/bookings/${bookingId}/reschedule?error=no-slot`);
  }

  const monthConflict = await findBookingInMonth(booking.memberId, startTime, bookingId);
  if (monthConflict) {
    const month = encodeURIComponent(formatMonthLabel(startTime));
    redirect(`/bookings/${bookingId}/reschedule?error=month-used&month=${month}`);
  }

  if (booking.googleCalendarEventId) {
    await googleCalendar.rescheduleCalendarEvent({
      googleCalendarEventId: booking.googleCalendarEventId,
      startTime,
      endTime,
    });
  }

  await prisma.booking.update({
    where: { id: bookingId },
    data: { startTime, endTime, status: "CONFIRMED" },
  });

  revalidatePath("/bookings");
  redirect(`/bookings/${bookingId}?rescheduled=1`);
}

export async function setBookingOutcome(formData: FormData) {
  const bookingId = String(formData.get("bookingId") ?? "");
  const { admin, booking } = await requireBookingAccess(bookingId);
  if (!isFullAdmin(admin.role) || !canWrite(admin.role)) redirect(`/bookings/${bookingId}`);

  const outcome = String(formData.get("outcome") ?? "");
  if (outcome !== "COMPLETED" && outcome !== "NO_SHOW") redirect(`/bookings/${bookingId}`);
  if (booking.startTime >= new Date()) redirect(`/bookings/${bookingId}`);

  await prisma.booking.update({ where: { id: bookingId }, data: { status: outcome } });

  revalidatePath("/bookings");
  revalidatePath(`/bookings/${bookingId}`);
  redirect(`/bookings/${bookingId}?saved=1`);
}
