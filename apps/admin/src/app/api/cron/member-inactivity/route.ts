import { NextResponse } from "next/server";
import { prisma } from "@prequate/db";
import { createNotification } from "@prequate/core";
import { getLastTouchByMember, INACTIVE_THRESHOLD_DAYS } from "@/lib/member-inactivity";

// Meant to run daily via a real scheduler (see docs/integration-readiness.md
// and /api/cron/hour-reminders for the same pattern). Flags a member whose
// status is active or at_risk once their last touch (Hour booking, event
// attendance, or message either direction — see member-inactivity.ts) is
// 60+ days old. Dedup: User.lastInactivityNotifiedAt/...Touch record the
// last-touch value at the moment of flagging, so the same still-open gap
// never re-notifies — only a fresh touch followed by a new 60-day gap does.
//
// pipeline 1 Stage 1's lifecycleStatus enum has no "renewal_due" value
// (only PROSPECT / ACTIVE / AT_RISK / PAUSED / ALUMNI exist) — this job
// checks ACTIVE and AT_RISK only. See the stage report for this gap.
export async function GET(request: Request) {
  const secret = new URL(request.url).searchParams.get("secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return new NextResponse("Not authorized", { status: 401 });
  }

  const now = new Date();
  const members = await prisma.user.findMany({
    where: { role: "MEMBER", lifecycleStatus: { in: ["ACTIVE", "AT_RISK"] } },
    select: { id: true, name: true, lastInactivityNotifiedAt: true, lastInactivityNotifiedTouch: true },
  });

  const recipients = await prisma.user.findMany({ where: { role: "ADMIN_RM" } });
  const notifyTargets = recipients.length
    ? recipients
    : await prisma.user.findMany({ where: { role: "ADMIN_OWNER" } });

  const lastTouchMap = await getLastTouchByMember(members.map((m) => m.id));

  let flagged = 0;
  let skippedSameGap = 0;

  for (const member of members) {
    const lastTouch = lastTouchMap.get(member.id) ?? null;
    const daysSince = lastTouch
      ? Math.floor((now.getTime() - lastTouch.getTime()) / (24 * 60 * 60 * 1000))
      : null;
    const isStale = daysSince === null || daysSince >= INACTIVE_THRESHOLD_DAYS;
    if (!isStale) continue;

    const alreadyFlaggedForThisGap =
      member.lastInactivityNotifiedAt !== null &&
      (member.lastInactivityNotifiedTouch?.getTime() ?? null) === (lastTouch?.getTime() ?? null);
    if (alreadyFlaggedForThisGap) {
      skippedSameGap++;
      continue;
    }

    await Promise.all(
      notifyTargets.map((rm) =>
        createNotification({
          recipientId: rm.id,
          type: "member_inactive",
          message: `${member.name} has gone quiet — no touch in ${daysSince ?? "60+"} days.`,
          relatedEntityType: "member",
          relatedEntityId: member.id,
        }),
      ),
    );

    await prisma.user.update({
      where: { id: member.id },
      data: { lastInactivityNotifiedAt: now, lastInactivityNotifiedTouch: lastTouch },
    });
    flagged++;
  }

  return NextResponse.json({ flagged, skippedSameGap });
}
