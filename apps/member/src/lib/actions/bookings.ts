"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@prequate/db";
import { googleCalendar, mailer, emailTemplates } from "@prequate/core";
import { getCurrentUser } from "@/lib/session";
import { findBookingInMonth, formatMonthLabel } from "@/lib/monthly-cap";
import { formatSlot } from "@/lib/format";

export async function createBooking(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const partnerId = String(formData.get("partnerId") ?? "");
  const startTime = new Date(String(formData.get("startTime") ?? ""));
  const endTime = new Date(String(formData.get("endTime") ?? ""));
  const memberContext = String(formData.get("memberContext") ?? "").trim() || null;
  const parentBookingId = String(formData.get("parentBookingId") ?? "") || null;

  const parentQuery = parentBookingId ? `&parentBookingId=${parentBookingId}` : "";
  if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
    redirect(`/the-hour/book/slot?partnerId=${partnerId}${parentQuery}&error=no-slot`);
  }

  const partner = await prisma.user.findFirst({ where: { id: partnerId, role: "PARTNER" } });
  if (!partner) redirect("/the-hour/book?error=partner-not-found");

  const monthConflict = await findBookingInMonth(user.id, startTime);
  if (monthConflict) {
    const month = encodeURIComponent(formatMonthLabel(startTime));
    redirect(`/the-hour/book/slot?partnerId=${partnerId}${parentQuery}&error=month-used&month=${month}`);
  }

  const { googleCalendarEventId } = await googleCalendar.createCalendarEvent({
    partnerId,
    partnerName: partner.name,
    partnerEmail: partner.email,
    memberName: user.name,
    memberEmail: user.email,
    memberContext,
    startTime,
    endTime,
  });

  await prisma.booking.create({
    data: {
      memberId: user.id,
      partnerId,
      startTime,
      endTime,
      memberContext,
      parentBookingId,
      status: "CONFIRMED",
      googleCalendarEventId,
    },
  });

  if (user.email) {
    const { subject, text } = emailTemplates.bookingConfirmedEmail({
      partnerName: partner.name,
      whenLabel: formatSlot(startTime),
      memberContext,
    });
    await mailer.sendEmail({ to: user.email, subject, text });
  }

  revalidatePath("/the-hour");
  redirect(`/the-hour?confirmed=1`);
}

export async function cancelBooking(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const bookingId = String(formData.get("bookingId") ?? "");
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, memberId: user.id },
  });
  if (!booking) redirect("/the-hour");

  if (booking.googleCalendarEventId) {
    await googleCalendar.cancelCalendarEvent(booking.googleCalendarEventId);
  }

  await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "CANCELLED", cancelledAt: new Date() },
  });

  revalidatePath("/the-hour");
  redirect("/the-hour");
}

export async function rescheduleBooking(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const bookingId = String(formData.get("bookingId") ?? "");
  const startTime = new Date(String(formData.get("startTime") ?? ""));
  const endTime = new Date(String(formData.get("endTime") ?? ""));

  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, memberId: user.id },
  });
  if (!booking) redirect("/the-hour");

  if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
    redirect(`/the-hour/${bookingId}/reschedule?error=no-slot`);
  }

  const monthConflict = await findBookingInMonth(user.id, startTime, bookingId);
  if (monthConflict) {
    const month = encodeURIComponent(formatMonthLabel(startTime));
    redirect(`/the-hour/${bookingId}/reschedule?error=month-used&month=${month}`);
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

  revalidatePath("/the-hour");
  redirect(`/the-hour/${bookingId}?rescheduled=1`);
}
