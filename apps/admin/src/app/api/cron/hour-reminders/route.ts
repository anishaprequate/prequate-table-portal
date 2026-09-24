import { NextResponse } from "next/server";
import { prisma } from "@prequate/db";
import { mailer, emailTemplates } from "@prequate/core";
import { formatSlot } from "@/lib/format";

// Meant to be hit daily (or more often) by a real scheduler in production
// (Vercel Cron, a crontab) — see docs/integration-readiness.md. Finds
// every confirmed booking starting 23-25 hours from now that hasn't had
// its reminder sent yet, emails the member, and marks it sent so a more
// frequent cron schedule never double-sends.
export async function GET(request: Request) {
  const secret = new URL(request.url).searchParams.get("secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return new NextResponse("Not authorized", { status: 401 });
  }

  const now = Date.now();
  const windowStart = new Date(now + 23 * 60 * 60 * 1000);
  const windowEnd = new Date(now + 25 * 60 * 60 * 1000);

  const bookings = await prisma.booking.findMany({
    where: {
      status: "CONFIRMED",
      reminderSentAt: null,
      startTime: { gte: windowStart, lte: windowEnd },
    },
    include: { member: true, partner: true },
  });

  let sent = 0;
  let skipped = 0;

  for (const booking of bookings) {
    if (!booking.member.email || !booking.member.emailHourReminders) {
      skipped++;
      continue;
    }

    const { subject, text } = emailTemplates.bookingReminderEmail({
      partnerName: booking.partner.name,
      whenLabel: formatSlot(booking.startTime),
    });
    await mailer.sendEmail({ to: booking.member.email, subject, text });

    await prisma.booking.update({
      where: { id: booking.id },
      data: { reminderSentAt: new Date() },
    });
    sent++;
  }

  return NextResponse.json({ sent, skipped });
}
