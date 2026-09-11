import { NextResponse } from "next/server";
import { prisma } from "@prequate/db";
import { mailer, emailTemplates, createNotification } from "@prequate/core";

// Meant to be hit periodically by a real scheduler in production (see
// docs/integration-readiness.md) — same shape as /api/cron/hour-reminders.
// Two passes in one job: (1) the initial survey, sent 24 hours after the
// event ends to confirmed (joined) attendees; (2) one reminder at 3 days
// if still unanswered, and never again after that (surveyReminderSentAt
// gates it, same convention as Booking.reminderSentAt).
export async function GET(request: Request) {
  const secret = new URL(request.url).searchParams.get("secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return new NextResponse("Not authorized", { status: 401 });
  }

  const memberAppUrl = process.env.MEMBER_APP_URL ?? "http://localhost:3000";
  const now = Date.now();

  const initialWindowStart = new Date(now - 25 * 60 * 60 * 1000);
  const initialWindowEnd = new Date(now - 23 * 60 * 60 * 1000);
  const toSend = await prisma.eventAttendance.findMany({
    where: {
      joined: true,
      surveySentAt: null,
      event: { endTime: { gte: initialWindowStart, lte: initialWindowEnd } },
    },
    include: { event: true, member: true },
  });

  let sent = 0;
  for (const attendance of toSend) {
    const link = `${memberAppUrl}/events/${attendance.eventId}/survey`;
    await createNotification({
      recipientId: attendance.memberId,
      type: "event_survey",
      message: `How would you rate ${attendance.event.title}?`,
      relatedEntityType: "event",
      relatedEntityId: attendance.eventId,
    });
    if (attendance.member.email) {
      const { subject, text } = emailTemplates.eventSurveyEmail({ eventTitle: attendance.event.title, link });
      await mailer.sendEmail({ to: attendance.member.email, subject, text });
    }
    await prisma.eventAttendance.update({ where: { id: attendance.id }, data: { surveySentAt: new Date() } });
    sent++;
  }

  const reminderWindowStart = new Date(now - 75 * 60 * 60 * 1000);
  const reminderWindowEnd = new Date(now - 71 * 60 * 60 * 1000);
  const toRemind = await prisma.eventAttendance.findMany({
    where: {
      surveyRespondedAt: null,
      surveyReminderSentAt: null,
      surveySentAt: { gte: reminderWindowStart, lte: reminderWindowEnd },
    },
    include: { event: true, member: true },
  });

  let reminded = 0;
  for (const attendance of toRemind) {
    const link = `${memberAppUrl}/events/${attendance.eventId}/survey`;
    await createNotification({
      recipientId: attendance.memberId,
      type: "event_survey",
      message: `Still time to rate ${attendance.event.title}`,
      relatedEntityType: "event",
      relatedEntityId: attendance.eventId,
    });
    if (attendance.member.email) {
      const { subject, text } = emailTemplates.eventSurveyReminderEmail({
        eventTitle: attendance.event.title,
        link,
      });
      await mailer.sendEmail({ to: attendance.member.email, subject, text });
    }
    await prisma.eventAttendance.update({
      where: { id: attendance.id },
      data: { surveyReminderSentAt: new Date() },
    });
    reminded++;
  }

  return NextResponse.json({ sent, reminded });
}
