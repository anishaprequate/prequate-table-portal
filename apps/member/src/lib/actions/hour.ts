"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@prequate/db";
import { availability, googleCalendar, mailer, emailTemplates } from "@prequate/core";
import { getCurrentUser } from "@/lib/session";
import { findBookingInMonth, formatMonthLabel } from "@/lib/monthly-cap";
import { formatSlot } from "@/lib/format";
import { getDayView, type DayPartner } from "@/lib/hour-calendar";

// Booking returns its result instead of redirecting, so a failed booking keeps
// what the member typed and the sheet stays where it is.

export interface Confirmation {
  bookingId: string;
  partnerName: string;
  partnerPhotoUrl: string | null;
  start: string;
  end: string;
  mode: "IN_PERSON" | "ONLINE";
  // Online only: the Google Meet link, when Google has returned one.
  meetLink: string | null;
  note: string | null;
  inviteTo: string | null; // the email the calendar invite goes to
}

export type BookState =
  | { status: "idle" }
  | { status: "error"; message: string; refresh?: boolean }
  | { status: "ok"; confirmation: Confirmation };

const fail = (message: string, refresh = false): BookState => ({ status: "error", message, refresh });

export async function loadDay(key: string): Promise<{ partners: DayPartner[]; used: boolean } | { error: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in again." };
  return getDayView(user.id, key);
}

export async function bookHour(_prev: BookState, formData: FormData): Promise<BookState> {
  const user = await getCurrentUser();
  if (!user) return fail("Please sign in again.");

  const partnerId = String(formData.get("partnerId") ?? "");
  const startTime = new Date(String(formData.get("startTime") ?? ""));
  const memberContext = String(formData.get("memberContext") ?? "").trim().slice(0, 1000) || null;
  const mode: "IN_PERSON" | "ONLINE" = String(formData.get("mode") ?? "") === "ONLINE" ? "ONLINE" : "IN_PERSON";
  const parentBookingId = String(formData.get("parentBookingId") ?? "") || null;

  if (Number.isNaN(startTime.getTime())) return fail("Choose a time first.");

  const partner = await prisma.user.findFirst({
    where: { id: partnerId, role: "PARTNER" },
    select: { id: true, name: true, email: true, photoUrl: true, tableHoursCalendarId: true },
  });
  if (!partner) return fail("That partner is not available. Choose another.", true);

  // One Hour each calendar month.
  const conflict = await findBookingInMonth(user.id, startTime);
  if (conflict) {
    const prior = await prisma.user.findUnique({ where: { id: conflict.partnerId }, select: { name: true } });
    return fail(
      `You already have your ${formatMonthLabel(startTime)} Hour, with ${(prior?.name ?? "a partner").split(" ")[0]} on ${formatSlot(conflict.startTime)}.`,
    );
  }

  // The last check before it is real: is this exact time still open, right now?
  const open = await availability.getOpenSlots(partner, {
    from: new Date(startTime.getTime() - 1),
    to: new Date(startTime.getTime() + 1),
  });
  const slot = open.find((s) => s.startTime.getTime() === startTime.getTime());
  if (!slot) return fail("That time was just taken. Here are the times still open.", true);

  if (parentBookingId) {
    const parent = await prisma.booking.findFirst({ where: { id: parentBookingId, memberId: user.id }, select: { id: true } });
    if (!parent) return fail("That earlier Hour could not be found.");
  }

  // Reserve the slot first, so two members tapping at once cannot both get it.
  let booking;
  try {
    booking = await prisma.$transaction(async (tx) => {
      const clash = await tx.booking.findFirst({
        where: { partnerId, status: { not: "CANCELLED" }, startTime: { lt: slot.endTime }, endTime: { gt: slot.startTime } },
        select: { id: true },
      });
      if (clash) throw new Error("TAKEN");
      return tx.booking.create({
        data: {
          memberId: user.id,
          partnerId,
          startTime: slot.startTime,
          endTime: slot.endTime,
          memberContext,
          mode,
          status: "CONFIRMED",
          ...(parentBookingId ? { parentBookingId } : {}),
        },
      });
    });
  } catch (e) {
    if ((e as Error).message === "TAKEN") return fail("That time was just taken. Here are the times still open.", true);
    return fail("Something went wrong and nothing was booked. Your note is kept, so try again.");
  }

  // Then the calendar. If it fails, undo the booking so nothing is half made.
  // An online Hour has a Google Meet link added to the event.
  let meetLink: string | null = null;
  try {
    const created = await googleCalendar.createCalendarEvent({
      partnerId,
      partnerName: partner.name,
      partnerEmail: partner.email,
      memberName: user.name,
      memberEmail: user.email,
      memberContext,
      online: mode === "ONLINE",
      startTime: slot.startTime,
      endTime: slot.endTime,
    });
    meetLink = created.meetLink ?? null;
    await prisma.booking.update({
      where: { id: booking.id },
      data: { googleCalendarEventId: created.googleCalendarEventId, location: meetLink },
    });
  } catch {
    await prisma.booking.delete({ where: { id: booking.id } }).catch(() => {});
    return fail("The calendar could not be updated, so nothing was booked. Your note is kept, so try again.");
  }

  if (user.email) {
    const { subject, text } = emailTemplates.bookingConfirmedEmail({
      partnerName: partner.name,
      whenLabel: formatSlot(slot.startTime),
      memberContext,
    });
    await mailer.sendEmail({ to: user.email, subject, text }).catch(() => {});
  }

  revalidatePath("/the-hour");
  revalidatePath("/home");
  return {
    status: "ok",
    confirmation: {
      bookingId: booking.id,
      partnerName: partner.name,
      partnerPhotoUrl: partner.photoUrl,
      start: slot.startTime.toISOString(),
      end: slot.endTime.toISOString(),
      mode,
      meetLink,
      note: memberContext,
      inviteTo: user.email,
    },
  };
}

export type SimpleState = { status: "idle" } | { status: "ok"; message: string } | { status: "error"; message: string };

// One tap on one of the three offered times.
export async function acceptOffer(formData: FormData): Promise<SimpleState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "Please sign in again." };

  const offerId = String(formData.get("offerId") ?? "");
  const start = new Date(String(formData.get("start") ?? ""));
  if (Number.isNaN(start.getTime())) return { status: "error", message: "Choose one of the times." };

  const now = new Date();
  const offer = await prisma.bookingOffer.findFirst({
    where: { id: offerId, acceptedAt: null, expiresAt: { gt: now }, booking: { memberId: user.id } },
    include: { booking: { include: { partner: true } } },
  });
  if (!offer) return { status: "error", message: "These times are no longer on offer. Choose a new one." };

  const slots = JSON.parse(offer.slots) as { start: string; end: string }[];
  const picked = slots.find((s) => new Date(s.start).getTime() === start.getTime());
  if (!picked) return { status: "error", message: "Choose one of the times offered." };

  const booking = offer.booking;
  const open = await availability.getOpenSlots(booking.partner, {
    from: new Date(start.getTime() - 1),
    to: new Date(start.getTime() + 1),
    excludeBookingId: booking.id,
  });
  const slot = open.find((s) => s.startTime.getTime() === start.getTime());
  if (!slot) return { status: "error", message: "That time was just taken. Choose another of the three." };

  const conflict = await findBookingInMonth(user.id, start, booking.id);
  if (conflict) return { status: "error", message: `You already have your ${formatMonthLabel(start)} Hour.` };

  let googleCalendarEventId = booking.googleCalendarEventId;
  let meetLink: string | null | undefined; // set only when a new event is made
  try {
    if (offer.reason === "CANCELLED" || !googleCalendarEventId) {
      // The old event was deleted when the Hour was cancelled: make a new one.
      const created = await googleCalendar.createCalendarEvent({
        partnerId: booking.partnerId,
        partnerName: booking.partner.name,
        partnerEmail: booking.partner.email,
        memberName: user.name,
        memberEmail: user.email,
        memberContext: booking.memberContext,
        online: booking.mode === "ONLINE",
        startTime: slot.startTime,
        endTime: slot.endTime,
      });
      googleCalendarEventId = created.googleCalendarEventId;
      meetLink = created.meetLink ?? null;
    } else {
      await googleCalendar.rescheduleCalendarEvent({ googleCalendarEventId, startTime: slot.startTime, endTime: slot.endTime });
    }
  } catch {
    return { status: "error", message: "The calendar could not be updated, so nothing changed. Try again." };
  }

  await prisma.$transaction([
    prisma.booking.update({
      where: { id: booking.id },
      data: {
        startTime: slot.startTime,
        endTime: slot.endTime,
        status: "CONFIRMED",
        cancelledAt: null,
        cancellationReason: null,
        googleCalendarEventId,
        // A new event means a new Meet link, for an online Hour.
        ...(meetLink !== undefined ? { location: meetLink } : {}),
        reminderSentAt: null,
      },
    }),
    prisma.bookingOffer.update({ where: { id: offer.id }, data: { acceptedAt: now, acceptedStart: slot.startTime } }),
  ]);

  revalidatePath("/the-hour");
  revalidatePath("/home");
  revalidatePath(`/the-hour/${booking.id}`);
  return { status: "ok", message: `Booked: ${formatSlot(slot.startTime)}.` };
}
