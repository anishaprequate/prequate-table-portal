"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@prequate/db";
import { availability, googleCalendar, notifyMember } from "@prequate/core";
import { getCurrentAdmin, canWrite, isFullAdmin } from "@/lib/session";
import { formatSlot } from "@/lib/format";
import type { AdvisorFormState } from "@/lib/actions/advisors";

// A member asks for an Hour (or to move one) and the partner answers: confirm,
// suggest up to three other times, or decline. Nothing reaches a calendar until
// it is confirmed. The partner whose Hour it is, and full admins, can answer.

const fail = (message: string): AdvisorFormState => ({ status: "error", message });

async function loadRequest(bookingId: string) {
  const admin = await getCurrentAdmin();
  if (!admin || !canWrite(admin.role)) return null;
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      member: { select: { id: true, name: true, email: true } },
      partner: { select: { id: true, name: true, email: true, tableHoursCalendarId: true } },
    },
  });
  if (!booking) return null;
  if (booking.partnerId !== admin.id && !isFullAdmin(admin.role)) return null;
  const isNew = booking.status === "REQUESTED";
  const isMove = booking.status === "CONFIRMED" && Boolean(booking.pendingStart && booking.pendingEnd);
  if (!isNew && !isMove) return null;
  return { admin, booking, isNew, isMove };
}

// Back to where the answer was given: the partner's Hours or the booking page.
function backTo(formData: FormData, bookingId: string) {
  const to = String(formData.get("returnTo") ?? "");
  return to === "/hours" ? "/hours" : `/bookings/${bookingId}`;
}

function refresh(bookingId: string) {
  revalidatePath("/hours");
  revalidatePath("/bookings");
  revalidatePath(`/bookings/${bookingId}`);
}

export async function approveHourRequest(formData: FormData) {
  const bookingId = String(formData.get("bookingId") ?? "");
  const back = backTo(formData, bookingId);
  const found = await loadRequest(bookingId);
  if (!found) redirect(`${back}?requestError=gone`);
  const { booking, isNew } = found;

  const start = isNew ? booking.startTime : booking.pendingStart!;
  const end = isNew ? booking.endTime : booking.pendingEnd!;

  // Nobody else holds this time.
  const clash = await prisma.booking.findFirst({
    where: {
      partnerId: booking.partnerId,
      status: { not: "CANCELLED" },
      id: { not: booking.id },
      OR: [{ startTime: { lt: end }, endTime: { gt: start } }, { pendingStart: { lt: end }, pendingEnd: { gt: start } }],
    },
    select: { id: true },
  });
  if (clash) redirect(`${back}?requestError=clash`);

  // Confirming and the place happen together. Online: Google makes the event and
  // the Meet link, and its invite is the confirmation. In person: the partner
  // gives the place in the same step (the member may have suggested one, and the
  // box starts with it), and the event is made with that place, so one invitation
  // and one notification say it all. If the partner leaves the place empty, the
  // Hour is confirmed without it and the place follows later (setBookingPlace).
  // If an event already exists, it moves with the Hour.
  const online = booking.mode === "ONLINE";
  const place = isNew && !online ? String(formData.get("place") ?? "").trim().slice(0, 200) : "";
  let googleCalendarEventId = booking.googleCalendarEventId;
  let meetLink: string | null | undefined;
  try {
    if (googleCalendarEventId) {
      await googleCalendar.rescheduleCalendarEvent({ googleCalendarEventId, startTime: start, endTime: end });
    } else if (online || place) {
      const created = await googleCalendar.createCalendarEvent({
        partnerId: booking.partnerId,
        partnerName: booking.partner.name,
        partnerEmail: booking.partner.email,
        memberName: booking.member.name,
        memberEmail: booking.member.email,
        memberContext: booking.memberContext,
        online,
        ...(place ? { location: place } : {}),
        startTime: start,
        endTime: end,
      });
      googleCalendarEventId = created.googleCalendarEventId;
      if (online) meetLink = created.meetLink ?? null;
    }
  } catch {
    redirect(`${back}?requestError=calendar`);
  }

  await prisma.$transaction([
    prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: "CONFIRMED",
        startTime: start,
        endTime: end,
        pendingStart: null,
        pendingEnd: null,
        googleCalendarEventId,
        ...(meetLink !== undefined ? { location: meetLink } : {}),
        // In person: the place agreed now, or none yet (a suggestion from the
        // member that the partner cleared does not stay as if it were agreed).
        ...(isNew && !online ? { location: place || null } : {}),
        reminderSentAt: null,
      },
    }),
    prisma.bookingOffer.updateMany({
      where: { bookingId: booking.id, acceptedAt: null, expiresAt: { gt: new Date() } },
      data: { expiresAt: new Date() },
    }),
  ]);

  const first = booking.partner.name.split(" ")[0];
  // With a place, Google's invitation is the confirmation and the portal sends no
  // email. In person without one yet, a single portal email carries the news.
  // Online and moved Hours get none.
  const inPersonEmail =
    isNew && !online && !place
      ? {
          subject: `Your Hour with ${booking.partner.name} is confirmed`,
          text: [
            `Your Hour with ${booking.partner.name} is confirmed for ${formatSlot(start)}, in person.`,
            "",
            "We will confirm the place shortly. It will arrive as a calendar invitation.",
            ...(booking.memberContext ? ["", `What you shared ahead of the session: "${booking.memberContext}"`] : []),
            "",
            "You can move or cancel it from The Prequate Table.",
          ].join("\n"),
        }
      : null;
  await notifyMember({
    memberId: booking.memberId,
    type: "hour_confirmed",
    message: isNew
      ? `${first} confirmed your Hour: ${formatSlot(start)}${place ? `, at ${place}. A calendar invitation is on its way.` : online ? "." : ". The place will follow."}`
      : `${first} confirmed the move: your Hour is now ${formatSlot(start)}.`,
    entityType: "booking",
    entityId: booking.id,
    email: inPersonEmail,
  });

  refresh(booking.id);
  redirect(`${back}?requestDone=confirmed`);
}

export async function declineHourRequest(formData: FormData) {
  const bookingId = String(formData.get("bookingId") ?? "");
  const back = backTo(formData, bookingId);
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 300) || null;
  const found = await loadRequest(bookingId);
  if (!found) redirect(`${back}?requestError=gone`);
  const { booking, isNew } = found;
  const first = booking.partner.name.split(" ")[0];

  if (isNew) {
    // Ended with no cancelledAt, so a declined request never counts as a late cancellation.
    await prisma.booking.update({
      where: { id: booking.id },
      data: { status: "CANCELLED", cancelledAt: null, cancellationReason: `Declined${reason ? `: ${reason}` : ""}` },
    });
  } else {
    await prisma.booking.update({ where: { id: booking.id }, data: { pendingStart: null, pendingEnd: null } });
  }
  await prisma.bookingOffer.updateMany({
    where: { bookingId: booking.id, acceptedAt: null, expiresAt: { gt: new Date() } },
    data: { expiresAt: new Date() },
  });

  await notifyMember({
    memberId: booking.memberId,
    type: "hour_declined",
    message: isNew
      ? `${first} cannot do ${formatSlot(booking.startTime)}.${reason ? ` ${reason}` : ""} You can propose another time.`
      : `${first} cannot do the new time.${reason ? ` ${reason}` : ""} Your Hour stays at ${formatSlot(booking.startTime)}.`,
    entityType: "booking",
    entityId: booking.id,
  });

  refresh(booking.id);
  redirect(`${back}?requestDone=declined`);
}

// Suggest up to three other times. The member takes one with a tap, and that
// confirms the Hour. The partner's calendar must be free at each.
export async function offerHourTimes(_prev: AdvisorFormState, formData: FormData): Promise<AdvisorFormState> {
  const bookingId = String(formData.get("bookingId") ?? "");
  const found = await loadRequest(bookingId);
  if (!found) return fail("That request is no longer open.");
  const { booking } = found;

  const now = new Date();
  const slots: { start: string; end: string }[] = [];
  const seen = new Set<number>();
  for (const n of [1, 2, 3]) {
    const date = String(formData.get(`date${n}`) ?? "");
    const time = String(formData.get(`time${n}`) ?? "");
    if (!date && !time) continue;
    const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
    const tm = /^(\d{2}):(\d{2})$/.exec(time);
    if (!dm || !tm) return fail(`Time ${n} needs both a date and a start time.`);
    const start = new Date(Number(dm[1]), Number(dm[2]) - 1, Number(dm[3]), Number(tm[1]), Number(tm[2]), 0, 0);
    if (!availability.isHourStart(start)) return fail(`Time ${n} must start on the hour or half hour, between 10 am and 7 pm.`);
    if (start <= now) return fail(`Time ${n} has already passed.`);
    if (seen.has(start.getTime())) return fail("Two of the times are the same.");

    const dayStart = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const open = await availability.getOpenSlots(booking.partner, {
      from: dayStart,
      to: new Date(dayStart.getFullYear(), dayStart.getMonth(), dayStart.getDate() + 1),
      stepMinutes: availability.START_STEP_MINUTES,
      excludeBookingId: booking.id,
    });
    if (!open.some((s) => s.startTime.getTime() === start.getTime())) {
      return fail(`${formatSlot(start)} is not free in the calendar. Choose another.`);
    }
    seen.add(start.getTime());
    slots.push({ start: start.toISOString(), end: new Date(start.getTime() + availability.SLOT_MINUTES * 60_000).toISOString() });
  }
  if (slots.length === 0) return fail("Add at least one time.");
  slots.sort((a, b) => a.start.localeCompare(b.start));

  // For a new in person request, the partner may suggest a place along with the
  // times. It is held on the Hour and becomes the agreed place when the member
  // takes a time.
  if (found.isNew && booking.mode === "IN_PERSON") {
    const place = String(formData.get("place") ?? "").trim().slice(0, 200);
    await prisma.booking.update({ where: { id: booking.id }, data: { location: place || null } });
  }

  await prisma.bookingOffer.updateMany({
    where: { bookingId: booking.id, acceptedAt: null, expiresAt: { gt: now } },
    data: { expiresAt: now },
  });
  await prisma.bookingOffer.create({
    data: {
      bookingId: booking.id,
      reason: "COUNTER",
      slots: JSON.stringify(slots),
      expiresAt: new Date(now.getTime() + 7 * 24 * 3_600_000),
    },
  });
  const first = booking.partner.name.split(" ")[0];
  await notifyMember({
    memberId: booking.memberId,
    type: "hour_offer",
    message: `${first} suggests ${slots.length === 1 ? "another time" : `${slots.length} other times`}: ${slots.map((s) => formatSlot(new Date(s.start))).join("; ")}${
      found.isNew && booking.mode === "IN_PERSON" && String(formData.get("place") ?? "").trim() ? `, at ${String(formData.get("place")).trim().slice(0, 200)}` : ""
    }. Tap one to take it.`,
    entityType: "booking",
    entityId: booking.id,
  });

  refresh(booking.id);
  return { status: "ok", message: `Sent to the member: ${slots.length} time${slots.length === 1 ? "" : "s"}.` };
}

// The place of an in person Hour, once it is final. This is the step that puts the
// Hour on the calendar: Google's invitation, with the place, is the confirmation,
// so the portal sends no separate email. The member gets a push.
export async function setBookingPlace(formData: FormData) {
  const bookingId = String(formData.get("bookingId") ?? "");
  const place = String(formData.get("place") ?? "").trim().slice(0, 200);
  const back = `/bookings/${bookingId}`;

  const admin = await getCurrentAdmin();
  if (!admin || !canWrite(admin.role)) redirect(back);
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      member: { select: { name: true, email: true } },
      partner: { select: { id: true, name: true, email: true } },
    },
  });
  if (!booking) redirect("/bookings");
  if (booking.partnerId !== admin.id && !isFullAdmin(admin.role)) redirect(back);
  if (booking.mode !== "IN_PERSON" || booking.status !== "CONFIRMED" || booking.startTime < new Date()) redirect(back);
  if (!place) redirect(`${back}?placeError=empty`);

  let googleCalendarEventId = booking.googleCalendarEventId;
  try {
    if (googleCalendarEventId) {
      await googleCalendar.setCalendarEventLocation({ googleCalendarEventId, location: place });
    } else {
      const created = await googleCalendar.createCalendarEvent({
        partnerId: booking.partnerId,
        partnerName: booking.partner.name,
        partnerEmail: booking.partner.email,
        memberName: booking.member.name,
        memberEmail: booking.member.email,
        memberContext: booking.memberContext,
        online: false,
        location: place,
        startTime: booking.startTime,
        endTime: booking.endTime,
      });
      googleCalendarEventId = created.googleCalendarEventId;
    }
  } catch {
    redirect(`${back}?placeError=calendar`);
  }

  const changed = Boolean(booking.location) && booking.location !== place;
  await prisma.booking.update({ where: { id: booking.id }, data: { location: place, googleCalendarEventId } });

  await notifyMember({
    memberId: booking.memberId,
    type: "hour_place",
    message: `${changed ? "The place has changed" : "The place is confirmed"} for your Hour with ${booking.partner.name.split(" ")[0]} on ${formatSlot(booking.startTime)}: ${place}. A calendar invitation is on its way.`,
    entityType: "booking",
    entityId: booking.id,
    email: null,
  });

  refresh(booking.id);
  redirect(`${back}?placeDone=1`);
}
