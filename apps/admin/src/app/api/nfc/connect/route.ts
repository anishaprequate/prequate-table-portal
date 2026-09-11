import { NextResponse } from "next/server";
import { prisma } from "@prequate/db";
import { getCurrentAdmin, canView } from "@/lib/session";

// Two different members' cards tapped in sequence within a short window
// (tracked client-side by the kiosk page, see checkin-kiosk.tsx) — creates
// an IntroductionRequest between them, routed to the same admin queue a
// directory-initiated request lands in.
export async function POST(request: Request) {
  const admin = await getCurrentAdmin();
  if (!admin || !canView(admin.role)) return NextResponse.json({ ok: false }, { status: 401 });

  const body = await request.json();
  const memberAId = String(body.memberAId ?? "");
  const memberBId = String(body.memberBId ?? "");
  if (!memberAId || !memberBId || memberAId === memberBId) {
    return NextResponse.json({ ok: false, message: "Need two different members" });
  }

  const existing = await prisma.introductionRequest.findFirst({
    where: {
      status: "SENT",
      OR: [
        { requesterId: memberAId, targetId: memberBId },
        { requesterId: memberBId, targetId: memberAId },
      ],
    },
  });
  if (existing) return NextResponse.json({ ok: true, message: "Already requested" });

  await prisma.introductionRequest.create({
    data: {
      requesterId: memberAId,
      targetId: memberBId,
      status: "SENT",
      message: "Requested by tapping cards together.",
    },
  });

  return NextResponse.json({ ok: true, message: "Introduction requested" });
}
