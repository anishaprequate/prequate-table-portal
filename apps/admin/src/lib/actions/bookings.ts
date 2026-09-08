"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { prisma } from "@prequate/db";
import { googleCalendar, UPLOADS_DIR } from "@prequate/core";
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

export async function adminCancelBooking(formData: FormData) {
  const bookingId = String(formData.get("bookingId") ?? "");
  const { admin, booking } = await requireBookingAccess(bookingId);
  if (!isFullAdmin(admin.role) || !canWrite(admin.role)) redirect(`/bookings/${bookingId}`);

  if (booking.googleCalendarEventId) {
    await googleCalendar.cancelCalendarEvent(booking.googleCalendarEventId);
  }

  await prisma.booking.update({ where: { id: bookingId }, data: { status: "CANCELLED" } });

  revalidatePath("/bookings");
  redirect("/bookings");
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

export async function uploadBrief(formData: FormData) {
  const bookingId = String(formData.get("bookingId") ?? "");
  const { admin } = await requireBookingAccess(bookingId);
  if (!canWrite(admin.role)) redirect(`/bookings/${bookingId}`);

  const content = String(formData.get("content") ?? "").trim() || null;
  const file = formData.get("file");

  let fileName: string | null = null;
  let fileUrl: string | null = null;

  if (file instanceof File && file.size > 0) {
    await mkdir(UPLOADS_DIR, { recursive: true });
    const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, "_");
    const storedName = `${bookingId}-${Date.now()}-${safeName}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(UPLOADS_DIR, storedName), buffer);
    fileName = file.name;
    fileUrl = `/api/briefs/${storedName}`;
  }

  if (!content && !fileUrl) redirect(`/bookings/${bookingId}?error=empty-brief`);

  await prisma.brief.create({
    data: { bookingId, authorId: admin.id, content, fileName, fileUrl },
  });

  revalidatePath(`/bookings/${bookingId}`);
  redirect(`/bookings/${bookingId}?briefAdded=1`);
}
