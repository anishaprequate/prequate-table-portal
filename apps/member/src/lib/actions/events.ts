"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@prequate/db";
import { googleCalendar } from "@prequate/core";
import { getCurrentUser } from "@/lib/session";

export async function joinEvent(formData: FormData) {
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
  if (event.inviteOnly && !existing?.invited && !existing?.joined) {
    redirect(`/events/${eventId}`);
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
      update: { pendingApproval: true, joined: false, waitlisted: false, ...rsvpData },
    });
    revalidatePath(`/events/${eventId}`);
    return;
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
  }

  await prisma.eventAttendance.upsert({
    where: { eventId_memberId: { eventId, memberId: user.id } },
    create: { eventId, memberId: user.id, joined: !waitlisted, waitlisted, googleCalendarEventId, ...rsvpData },
    update: { joined: !waitlisted, waitlisted, pendingApproval: false, googleCalendarEventId, ...rsvpData },
  });

  revalidatePath(`/events/${eventId}`);
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

  if (attendance.googleCalendarEventId) {
    await googleCalendar.cancelCalendarEvent(attendance.googleCalendarEventId);
  }

  await prisma.eventAttendance.delete({ where: { id: attendance.id } });

  revalidatePath(`/events/${eventId}`);
  redirect(`/events/${eventId}`);
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
