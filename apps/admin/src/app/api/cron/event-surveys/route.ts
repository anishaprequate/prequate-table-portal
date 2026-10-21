import { NextResponse } from "next/server";
import { prisma } from "@prequate/db";
import { emailTemplates, notifyMember } from "@prequate/core";

// Meant to be hit periodically by a real scheduler in production (see
// docs/integration-readiness.md) — same shape as /api/cron/hour-reminders.
// Finds confirmed attendees whose event ended 23-25 hours ago and sends the
// two-question survey: one bell notification and one email, nothing more. There
// is no reminder email any more; Home keeps a quiet nudge until it is answered
// (surveySentAt gates it, so a repeat run never sends twice).
export async function GET(request: Request) {
  const secret = new URL(request.url).searchParams.get("secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return new NextResponse("Not authorized", { status: 401 });
  }

  const memberAppUrl = (process.env.MEMBER_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const now = Date.now();

  const toSend = await prisma.eventAttendance.findMany({
    where: {
      joined: true,
      surveySentAt: null,
      event: { endTime: { gte: new Date(now - 25 * 60 * 60 * 1000), lte: new Date(now - 23 * 60 * 60 * 1000) } },
    },
    include: { event: true },
  });

  let sent = 0;
  for (const attendance of toSend) {
    await prisma.eventAttendance.update({ where: { id: attendance.id }, data: { surveySentAt: new Date() } });
    const link = `${memberAppUrl}/events/${attendance.eventId}/survey`;
    await notifyMember({
      memberId: attendance.memberId,
      type: "event_survey",
      message: `How would you rate ${attendance.event.title}?`,
      entityType: "event",
      entityId: attendance.eventId,
      email: emailTemplates.eventSurveyEmail({ eventTitle: attendance.event.title, link }),
    });
    sent++;
  }

  return NextResponse.json({ sent });
}
