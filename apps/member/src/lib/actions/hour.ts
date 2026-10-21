"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@prequate/db";
import { availability, googleCalendar, createNotification, notifyTeam, mailer } from "@prequate/core";
import { getCurrentUser } from "@/lib/session";
import { findHourInMonth, formatMonthLabel } from "@/lib/monthly-cap";
import { formatSlot } from "@/lib/format";
import { getDayView, getPartnerDay, type DayPartner, type DayCell } from "@/lib/hour-calendar";

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
const timeText = (d: Date) => new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" }).format(d);

// `rescheduleBookingId` is set when an Hour is being moved: the view is then
// for that Hour's partner only, and that Hour does not count against the month.
export async function loadDay(
  key: string,
  rescheduleBookingId?: string,
): Promise<{ partners: DayPartner[]; used: boolean } | { error: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in again." };
  if (!rescheduleBookingId) return getDayView(user.id, key);
  const booking = await prisma.booking.findFirst({
    where: { id: rescheduleBookingId, memberId: user.id },
    select: { id: true, partnerId: true },
  });
  if (!booking) return { error: "That Hour could not be found." };
  return getDayView(user.id, key, { partnerId: booking.partnerId, excludeBookingId: booking.id });
}

// One partner's day as half hours, free or busy, for the day view.
export async function loadPartnerDay(
  key: string,
  partnerId: string,
  rescheduleBookingId?: string,
): Promise<{ cells: DayCell[] } | { error: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in again." };
  if (!rescheduleBookingId) return getPartnerDay(user.id, key, partnerId);
  const booking = await prisma.booking.findFirst({
    where: { id: rescheduleBookingId, memberId: user.id },
    select: { id: true, partnerId: true },
  });
  if (!booking) return { error: "That Hour could not be found." };
  return getPartnerDay(user.id, key, booking.partnerId, { partnerId: booking.partnerId, excludeBookingId: booking.id });
}

export async function bookHour(_prev: BookState, formData: FormData): Promise<BookState> {
  const user = await getCurrentUser();
  if (!user) return fail("Please sign in again.");

  const partnerId = String(formData.get("partnerId") ?? "");
  // The member picks a day and a time from the list; both arrive as plain text
  // and are put together here.
  const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(formData.get("date") ?? ""));
  const tm = /^(\d{2}):(\d{2})$/.exec(String(formData.get("time") ?? ""));
  if (!partnerId) return fail("Choose a partner first.");
  if (!tm) return fail("Choose a start time.");
  if (!dm) return fail("Choose a day first.");
  const startTime = new Date(Number(dm[1]), Number(dm[2]) - 1, Number(dm[3]), Number(tm[1]), Number(tm[2]), 0, 0);
  const memberContext = String(formData.get("memberContext") ?? "").trim().slice(0, 1000) || null;
  const mode: "IN_PERSON" | "ONLINE" = String(formData.get("mode") ?? "") === "ONLINE" ? "ONLINE" : "IN_PERSON";
  const parentBookingId = String(formData.get("parentBookingId") ?? "") || null;
  // For an in person Hour, a place the member suggests. Held on the request; it
  // becomes the agreed place only when the partner confirms it.
  const place = mode === "IN_PERSON" ? String(formData.get("place") ?? "").trim().slice(0, 200) || null : null;

  // On the hour or the half hour, from 10 am, and over by 8 pm.
  if (!availability.isHourStart(startTime)) return fail("Choose a start time on the hour or half hour, between 10 am and 7 pm.");

  const partner = await prisma.user.findFirst({
    where: { id: partnerId, hostsHours: true },
    select: { id: true, name: true, email: true, photoUrl: true, tableHoursCalendarId: true },
  });
  if (!partner) return fail("That partner is not available on this day. Choose another.", true);

  // One Hour each calendar month, with a partner or an advisor.
  const conflict = await findHourInMonth(user.id, startTime);
  if (conflict) {
    return fail(
      `You already have your ${formatMonthLabel(startTime)} Hour, with ${conflict.firstName}${conflict.hasTime ? ` on ${formatSlot(conflict.at)}` : ""}.`,
    );
  }

  // The last check before it is real: is this exact time still open, right now?
  // The whole day is read, so a calendar that returns only the day's windows
  // still answers.
  const dayStart = new Date(startTime.getFullYear(), startTime.getMonth(), startTime.getDate());
  const open = await availability.getOpenSlots(partner, {
    from: dayStart,
    to: new Date(dayStart.getFullYear(), dayStart.getMonth(), dayStart.getDate() + 1),
    stepMinutes: availability.START_STEP_MINUTES,
  });
  const slot = open.find((s) => s.startTime.getTime() === startTime.getTime());
  if (!slot) {
    if (startTime.getTime() < Date.now() + availability.LEAD_HOURS * 3_600_000) {
      return fail(`An Hour needs at least ${availability.LEAD_HOURS} hours' notice. Choose a later time.`);
    }
    return fail("This hour is already taken. Please choose another time.");
  }

  if (parentBookingId) {
    const parent = await prisma.booking.findFirst({ where: { id: parentBookingId, memberId: user.id }, select: { id: true } });
    if (!parent) return fail("That earlier Hour could not be found.");
  }

  // Reserve the time first, so two members tapping at once cannot both get it.
  // This is a request: it holds the time and waits for the partner to confirm.
  // Nothing goes on a calendar until they do.
  let booking;
  try {
    booking = await prisma.$transaction(async (tx) => {
      const clash = await tx.booking.findFirst({
        where: {
          partnerId,
          status: { not: "CANCELLED" },
          OR: [
            { startTime: { lt: slot.endTime }, endTime: { gt: slot.startTime } },
            { pendingStart: { lt: slot.endTime }, pendingEnd: { gt: slot.startTime } },
          ],
        },
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
          location: place,
          status: "REQUESTED",
          ...(parentBookingId ? { parentBookingId } : {}),
        },
      });
    });
  } catch (e) {
    if ((e as Error).message === "TAKEN") return fail("This hour is already taken. Please choose another time.");
    return fail("Something went wrong and nothing was requested. Your note is kept, so try again.");
  }

  await notifyTeam({
    userId: partner.id,
    type: "hour_request",
    message: `${user.name} asks for an Hour on ${formatSlot(slot.startTime)}, ${mode === "ONLINE" ? "online" : `in person${place ? `, at ${place}` : ""}`}. Confirm it, suggest other times, or decline.`,
    entityType: "booking",
    entityId: booking.id,
    emailSubject: `${user.name} asks for an Hour`,
    emailPath: `/bookings/${booking.id}`,
  });

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
      meetLink: null,
      note: memberContext,
      inviteTo: user.email,
    },
  };
}

// Moving an Hour the member already has: they propose a new time, and the
// partner confirms it. The Hour keeps its current time until then; the proposed
// time holds the slot. A taken time is refused and nothing changes.
export async function rescheduleHour(_prev: BookState, formData: FormData): Promise<BookState> {
  const user = await getCurrentUser();
  if (!user) return fail("Please sign in again.");

  const bookingId = String(formData.get("bookingId") ?? "");
  const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(formData.get("date") ?? ""));
  const tm = /^(\d{2}):(\d{2})$/.exec(String(formData.get("time") ?? ""));
  if (!tm) return fail("Choose a start time.");
  if (!dm) return fail("Choose a day first.");
  const startTime = new Date(Number(dm[1]), Number(dm[2]) - 1, Number(dm[3]), Number(tm[1]), Number(tm[2]), 0, 0);
  if (!availability.isHourStart(startTime)) return fail("Choose a start time on the hour or half hour, between 10 am and 7 pm.");

  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, memberId: user.id },
    include: { partner: { select: { id: true, name: true, email: true, photoUrl: true, tableHoursCalendarId: true } } },
  });
  if (!booking || booking.status === "CANCELLED") return fail("That Hour can no longer be moved.");
  if (booking.startTime <= new Date()) return fail("That Hour has already happened.");
  if (booking.startTime.getTime() === startTime.getTime()) return fail("That is already the time of this Hour. Choose a different one.");

  const conflict = await findHourInMonth(user.id, startTime, booking.id);
  if (conflict) {
    return fail(
      `You already have your ${formatMonthLabel(startTime)} Hour, with ${conflict.firstName}${conflict.hasTime ? ` on ${formatSlot(conflict.at)}` : ""}.`,
    );
  }

  const dayStart = new Date(startTime.getFullYear(), startTime.getMonth(), startTime.getDate());
  const open = await availability.getOpenSlots(booking.partner, {
    from: dayStart,
    to: new Date(dayStart.getFullYear(), dayStart.getMonth(), dayStart.getDate() + 1),
    stepMinutes: availability.START_STEP_MINUTES,
    excludeBookingId: booking.id,
  });
  const slot = open.find((s) => s.startTime.getTime() === startTime.getTime());
  if (!slot) {
    if (startTime.getTime() < Date.now() + availability.LEAD_HOURS * 3_600_000) {
      return fail(`An Hour needs at least ${availability.LEAD_HOURS} hours' notice. Choose a later time.`);
    }
    return fail("This hour is already taken. Please choose another time.");
  }

  try {
    await prisma.$transaction(async (tx) => {
      const clash = await tx.booking.findFirst({
        where: {
          partnerId: booking.partnerId,
          status: { not: "CANCELLED" },
          id: { not: booking.id },
          OR: [
            { startTime: { lt: slot.endTime }, endTime: { gt: slot.startTime } },
            { pendingStart: { lt: slot.endTime }, pendingEnd: { gt: slot.startTime } },
          ],
        },
        select: { id: true },
      });
      if (clash) throw new Error("TAKEN");
      await tx.booking.update({ where: { id: booking.id }, data: { pendingStart: slot.startTime, pendingEnd: slot.endTime } });
      // Times a partner had offered for this Hour are replaced by this proposal.
      await tx.bookingOffer.updateMany({
        where: { bookingId: booking.id, acceptedAt: null, expiresAt: { gt: new Date() } },
        data: { expiresAt: new Date() },
      });
    });
  } catch (e) {
    if ((e as Error).message === "TAKEN") return fail("This hour is already taken. Please choose another time.");
    return fail("Something went wrong and nothing was changed. Try again.");
  }

  await notifyTeam({
    userId: booking.partnerId,
    type: "hour_request",
    message: `${user.name} asks to move their Hour from ${formatSlot(booking.startTime)} to ${formatSlot(slot.startTime)}. Confirm it, suggest other times, or decline.`,
    entityType: "booking",
    entityId: booking.id,
    emailSubject: `${user.name} asks to move an Hour`,
    emailPath: `/bookings/${booking.id}`,
  });

  revalidatePath("/the-hour");
  revalidatePath("/home");
  revalidatePath(`/the-hour/${booking.id}`);
  return {
    status: "ok",
    confirmation: {
      bookingId: booking.id,
      partnerName: booking.partner.name,
      partnerPhotoUrl: booking.partner.photoUrl,
      start: slot.startTime.toISOString(),
      end: slot.endTime.toISOString(),
      mode: booking.mode === "ONLINE" ? "ONLINE" : "IN_PERSON",
      meetLink: booking.location,
      note: booking.memberContext,
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
  const dayStart = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const open = await availability.getOpenSlots(booking.partner, {
    from: dayStart,
    to: new Date(dayStart.getFullYear(), dayStart.getMonth(), dayStart.getDate() + 1),
    stepMinutes: availability.START_STEP_MINUTES,
    excludeBookingId: booking.id,
  });
  const slot = open.find((s) => s.startTime.getTime() === start.getTime());
  if (!slot) return { status: "error", message: "That time was just taken. Choose another of the three." };

  const conflict = await prisma.booking.findFirst({
    where: {
      memberId: user.id,
      status: { not: "CANCELLED" },
      id: { not: booking.id },
      startTime: { gte: new Date(start.getFullYear(), start.getMonth(), 1), lt: new Date(start.getFullYear(), start.getMonth() + 1, 1) },
    },
    select: { id: true },
  });
  if (conflict) return { status: "error", message: `You already have your ${formatMonthLabel(start)} Hour.` };

  // Online: an event with a Meet link is made (a cancelled Hour's old event was
  // deleted, a new request never had one). In person: an event is made only once
  // there is a place; until then, taking a time puts nothing on a calendar. An
  // event that already exists moves with the Hour.
  const online = booking.mode === "ONLINE";
  const wasRequest = booking.status === "REQUESTED";
  let googleCalendarEventId = booking.googleCalendarEventId;
  let meetLink: string | null | undefined; // set only when a new event is made
  try {
    if (googleCalendarEventId && offer.reason !== "CANCELLED") {
      await googleCalendar.rescheduleCalendarEvent({ googleCalendarEventId, startTime: slot.startTime, endTime: slot.endTime });
    } else if (online || booking.location) {
      const created = await googleCalendar.createCalendarEvent({
        partnerId: booking.partnerId,
        partnerName: booking.partner.name,
        partnerEmail: booking.partner.email,
        memberName: user.name,
        memberEmail: user.email,
        memberContext: booking.memberContext,
        online,
        ...(!online && booking.location ? { location: booking.location } : {}),
        startTime: slot.startTime,
        endTime: slot.endTime,
      });
      googleCalendarEventId = created.googleCalendarEventId;
      if (online) meetLink = created.meetLink ?? null;
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
        pendingStart: null,
        pendingEnd: null,
        googleCalendarEventId,
        // A new event means a new Meet link, for an online Hour.
        ...(meetLink !== undefined ? { location: meetLink } : {}),
        reminderSentAt: null,
      },
    }),
    prisma.bookingOffer.update({ where: { id: offer.id }, data: { acceptedAt: now, acceptedStart: slot.startTime } }),
  ]);

  // The partner hears that their suggestion was taken.
  await createNotification({
    recipientId: booking.partnerId,
    type: "hour_confirmed",
    message: `${user.name} took ${formatSlot(slot.startTime)}. The Hour is confirmed.`,
    relatedEntityType: "booking",
    relatedEntityId: booking.id,
  });

  // An in person Hour with no place yet has no calendar invitation, so the member
  // gets the one confirmation email. (Their own action: no push to themselves.)
  if (wasRequest && !online && !booking.location && user.email) {
    await mailer
      .sendEmail({
        to: user.email,
        subject: `Your Hour with ${booking.partner.name} is confirmed`,
        text: [
          `Your Hour with ${booking.partner.name} is confirmed for ${formatSlot(slot.startTime)}, in person.`,
          "",
          "We will confirm the place shortly. It will arrive as a calendar invitation.",
          "",
          "You can move or cancel it from The Prequate Table.",
        ].join("\n"),
      })
      .catch(() => {});
  }

  revalidatePath("/the-hour");
  revalidatePath("/home");
  revalidatePath(`/the-hour/${booking.id}`);
  return { status: "ok", message: `Booked: ${formatSlot(slot.startTime)}.` };
}
