"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@prequate/db";
import { googleCalendar, notifyDinnerQuestion } from "@prequate/core";
import { getCurrentUser } from "@/lib/session";

export type JoinResult = "joined" | "waitlisted" | "pending";

// The form on the event page uses this one (no return value needed).
export async function joinEvent(formData: FormData) {
  await performJoin(formData);
}

// The one-tap RSVP on the Events list uses this one, so the card can show
// what actually happened (a spot, the waitlist, or a pending approval).
export async function joinEventQuick(formData: FormData): Promise<JoinResult> {
  const result = await performJoin(formData);
  revalidatePath("/events");
  revalidatePath("/home");
  return result;
}

async function performJoin(formData: FormData): Promise<JoinResult> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const eventId = String(formData.get("eventId") ?? "");

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { ticketTypes: true },
  });
  if (!event || event.archivedAt) redirect("/events");

  const existing = await prisma.eventAttendance.findUnique({
    where: { eventId_memberId: { eventId, memberId: user.id } },
  });
  // A closed event can only be joined from a sent invitation (or by someone
  // already on it). Anyone else is sent away without learning it exists.
  if (event.inviteOnly) {
    const allowed =
      (existing?.invited && existing.invitationSentAt) ||
      existing?.joined ||
      existing?.waitlisted ||
      existing?.pendingApproval;
    if (!allowed) redirect("/events");
  }

  let guestNames: string | null = null;
  let guestCount = 0;
  if (event.allowPlusOne) {
    const guestNamesRaw = String(formData.get("guestNames") ?? "").trim();
    const guestNamesList = guestNamesRaw
      ? guestNamesRaw.split(",").map((n) => n.trim()).filter(Boolean)
      : [];
    guestNames = guestNamesList.length > 0 ? JSON.stringify(guestNamesList) : null;
    guestCount = guestNamesList.length;
  }

  const dietaryNotes = String(formData.get("dietaryNotes") ?? "").trim() || null;
  const travelNotes = String(formData.get("travelNotes") ?? "").trim() || null;
  const arrivalDateRaw = String(formData.get("arrivalDate") ?? "").trim();
  const arrivalDate = arrivalDateRaw ? new Date(arrivalDateRaw) : null;

  const ticketTypeIdRaw = String(formData.get("ticketTypeId") ?? "").trim();
  const ticketTypeId = event.ticketTypes.some((t) => t.id === ticketTypeIdRaw) ? ticketTypeIdRaw : null;

  const questions: string[] = event.registrationQuestions ? JSON.parse(event.registrationQuestions) : [];
  const registrationAnswers = questions.length
    ? JSON.stringify(
        questions.map((question, i) => ({
          question,
          answer: String(formData.get(`question_${i}`) ?? "").trim(),
        })),
      )
    : null;

  const rsvpData = {
    guestCount,
    dietaryNotes,
    travelNotes,
    arrivalDate,
    guestNames,
    ticketTypeId,
    registrationAnswers,
  };

  if (event.approvalRequired) {
    await prisma.eventAttendance.upsert({
      where: { eventId_memberId: { eventId, memberId: user.id } },
      create: { eventId, memberId: user.id, pendingApproval: true, ...rsvpData },
      update: { pendingApproval: true, joined: false, waitlisted: false, declinedAt: null, ...rsvpData },
    });
    revalidatePath(`/events/${eventId}`);
    return "pending";
  }

  let waitlisted = false;
  if (ticketTypeId) {
    const ticketType = event.ticketTypes.find((t) => t.id === ticketTypeId)!;
    if (ticketType.capacity != null) {
      const joined = await prisma.eventAttendance.findMany({
        where: { eventId, ticketTypeId, joined: true },
        select: { guestCount: true },
      });
      const takenSpots = joined.reduce((sum, a) => sum + 1 + a.guestCount, 0);
      waitlisted = takenSpots + 1 + guestCount > ticketType.capacity;
    }
  }
  if (!waitlisted && event.capacity != null) {
    const joined = await prisma.eventAttendance.findMany({
      where: { eventId, joined: true },
      select: { guestCount: true },
    });
    const takenSpots = joined.reduce((sum, a) => sum + 1 + a.guestCount, 0);
    waitlisted = takenSpots + 1 + guestCount > event.capacity;
  }

  let googleCalendarEventId = existing?.googleCalendarEventId ?? null;
  if (!waitlisted && !googleCalendarEventId) {
    // The place on the list matters more than the calendar entry: if Google
    // refuses, the member is still in, and the entry is simply missing.
    try {
      const ref = await googleCalendar.createEventCalendarEntry({
        eventId: event.id,
        title: event.title,
        description: event.description,
        location: event.location,
        memberName: user.name,
        memberEmail: user.email,
        startTime: event.startTime,
        endTime: event.endTime,
      });
      googleCalendarEventId = ref.googleCalendarEventId;
    } catch (err) {
      console.error("Calendar entry failed for event RSVP", err);
    }
  }

  await prisma.eventAttendance.upsert({
    where: { eventId_memberId: { eventId, memberId: user.id } },
    create: { eventId, memberId: user.id, joined: !waitlisted, waitlisted, googleCalendarEventId, ...rsvpData },
    update: { joined: !waitlisted, waitlisted, pendingApproval: false, declinedAt: null, googleCalendarEventId, ...rsvpData },
  });

  // Someone who has just got a place hears the dinner question, if there is one.
  if (!waitlisted) await notifyDinnerQuestion(eventId, user.id);

  revalidatePath(`/events/${eventId}`);
  return waitlisted ? "waitlisted" : "joined";
}

// Release a member's seat. A plain RSVP row is deleted. A row that came from
// an invitation is kept, because deleting it would also delete the invitation:
// the member steps back to "declined" and can accept again.
async function releaseRsvp(attendance: { id: string; invited: boolean; googleCalendarEventId: string | null }) {
  if (attendance.googleCalendarEventId) {
    await googleCalendar.cancelCalendarEvent(attendance.googleCalendarEventId);
  }
  if (attendance.invited) {
    await prisma.eventAttendance.update({
      where: { id: attendance.id },
      data: {
        joined: false,
        waitlisted: false,
        pendingApproval: false,
        googleCalendarEventId: null,
        declinedAt: new Date(),
      },
    });
  } else {
    await prisma.eventAttendance.delete({ where: { id: attendance.id } });
  }
}

// Member-initiated. The freed seat does not auto-promote the next person
// on the waitlist — an admin handles that manually, same as an admin-side
// cancellation.
export async function cancelEventRsvp(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const eventId = String(formData.get("eventId") ?? "");
  const attendance = await prisma.eventAttendance.findUnique({
    where: { eventId_memberId: { eventId, memberId: user.id } },
  });
  if (!attendance) redirect(`/events/${eventId}`);

  await releaseRsvp(attendance);

  revalidatePath(`/events/${eventId}`);
  redirect(`/events/${eventId}`);
}

// Same as cancelEventRsvp but stays on the page it was called from.
export async function cancelEventRsvpQuick(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const eventId = String(formData.get("eventId") ?? "");
  const attendance = await prisma.eventAttendance.findUnique({
    where: { eventId_memberId: { eventId, memberId: user.id } },
  });
  if (!attendance) return;

  await releaseRsvp(attendance);

  revalidatePath(`/events/${eventId}`);
  revalidatePath("/events");
  revalidatePath("/home");
}

// Decline an invitation to a closed event. The invitation stays (so the
// member can change their mind); the card shows "Declined".
export async function declineInvitationQuick(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const eventId = String(formData.get("eventId") ?? "");
  const attendance = await prisma.eventAttendance.findUnique({
    where: { eventId_memberId: { eventId, memberId: user.id } },
  });
  if (!attendance?.invited || !attendance.invitationSentAt) return;

  await releaseRsvp(attendance);

  revalidatePath(`/events/${eventId}`);
  revalidatePath("/events");
  revalidatePath("/home");
}

export async function submitEventSurvey(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const eventId = String(formData.get("eventId") ?? "");
  const rating = Number(formData.get("rating") ?? "0");
  const feedback = String(formData.get("feedback") ?? "").trim() || null;
  if (!rating || rating < 1 || rating > 5) redirect(`/events/${eventId}/survey?error=rating`);

  const attendance = await prisma.eventAttendance.findUnique({
    where: { eventId_memberId: { eventId, memberId: user.id } },
  });
  if (!attendance) redirect(`/events/${eventId}`);

  await prisma.eventAttendance.update({
    where: { id: attendance.id },
    data: { surveyRating: rating, surveyFeedback: feedback, surveyRespondedAt: new Date() },
  });

  redirect(`/events/${eventId}/survey?saved=1`);
}
