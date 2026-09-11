import { NextResponse } from "next/server";
import { prisma } from "@prequate/db";
import { logTimelineEntry } from "@prequate/core";
import { getCurrentAdmin, canView } from "@/lib/session";

// Resolves a single NFC tap at a staffed kiosk — event check-in or Hour
// check-in. Kept as one endpoint (mode-switched) rather than two, since
// both are the same "look up by chipUid, mark attendance" shape.
export async function POST(request: Request) {
  const admin = await getCurrentAdmin();
  if (!admin || !canView(admin.role)) return NextResponse.json({ ok: false, message: "Not authorized" }, { status: 401 });

  const body = await request.json();
  const uid = String(body.uid ?? "").trim();
  const mode = body.mode === "hour" ? "hour" : "event";

  if (!uid) return NextResponse.json({ ok: false, message: "No card UID given" });

  const member = await prisma.user.findFirst({ where: { chipUid: uid, role: "MEMBER" } });
  if (!member) {
    return NextResponse.json({
      ok: false,
      message: mode === "event" ? "Card not recognized for this event" : "Card not recognized",
      memberId: null,
    });
  }

  if (mode === "event") {
    const eventId = String(body.eventId ?? "");
    const attendance = await prisma.eventAttendance.findUnique({
      where: { eventId_memberId: { eventId, memberId: member.id } },
    });

    if (!attendance || !attendance.joined) {
      return NextResponse.json({
        ok: false,
        message: `${member.name} isn't on the guest list for this event`,
        memberId: member.id,
      });
    }

    if (!attendance.checkedInAt) {
      await prisma.eventAttendance.update({ where: { id: attendance.id }, data: { checkedInAt: new Date() } });
      await logTimelineEntry({
        memberId: member.id,
        authorId: admin.id,
        type: "SYSTEM",
        body: "Checked in at an event via NFC tap.",
      });
    }

    return NextResponse.json({
      ok: true,
      message: "Checked in",
      memberId: member.id,
      memberName: member.name,
      memberPhotoUrl: member.photoUrl,
    });
  }

  // Hour check-in: find a booking for this member starting within the
  // surrounding hour. If none exists, do nothing silently — per the build
  // note, don't create a spurious booking record, just log it.
  const now = Date.now();
  const booking = await prisma.booking.findFirst({
    where: {
      memberId: member.id,
      status: { in: ["CONFIRMED", "REQUESTED"] },
      startTime: { gte: new Date(now - 30 * 60 * 1000), lte: new Date(now + 30 * 60 * 1000) },
    },
    include: { partner: true },
  });

  if (!booking) {
    await logTimelineEntry({
      memberId: member.id,
      authorId: admin.id,
      type: "SYSTEM",
      body: "Tapped in for an Hour session, but no booking was found for this time.",
    });
    return NextResponse.json({
      ok: false,
      message: `No Hour session found for ${member.name} right now`,
      memberId: member.id,
    });
  }

  if (!booking.checkedInAt) {
    await prisma.booking.update({ where: { id: booking.id }, data: { checkedInAt: new Date() } });
    await logTimelineEntry({
      memberId: member.id,
      authorId: admin.id,
      type: "SYSTEM",
      body: `Checked in via NFC tap for the Hour with ${booking.partner.name}.`,
    });
  }

  return NextResponse.json({
    ok: true,
    message: `Checked in with ${booking.partner.name}`,
    memberId: member.id,
    memberName: member.name,
    memberPhotoUrl: member.photoUrl,
  });
}
