import { NextResponse } from "next/server";
import { prisma } from "@prequate/db";
import { logTimelineEntry } from "@prequate/core";
import { createSession } from "@/lib/session";
import { landingRouteFor } from "@/lib/actions/auth";

// The magic link a member taps from their email. A Route Handler, not a
// page — setting the session cookie can only happen in a Server Action or
// Route Handler, not during a page render (same reason /login/nfc/[uid]
// is a route rather than a page).
export async function GET(request: Request, { params }: { params: { token: string } }) {
  const otp = await prisma.otpCode.findFirst({
    where: { code: params.token, channel: "email", consumedAt: null },
  });

  if (!otp || otp.expiresAt < new Date()) {
    return NextResponse.redirect(new URL("/login/email?error=invalid", request.url));
  }

  await prisma.otpCode.update({ where: { id: otp.id }, data: { consumedAt: new Date() } });
  await createSession(otp.userId);
  await logTimelineEntry({
    memberId: otp.userId,
    authorId: otp.userId,
    type: "SYSTEM",
    body: "Logged in via email link.",
  });

  const landingRoute = await landingRouteFor(otp.userId);
  return NextResponse.redirect(new URL(landingRoute, request.url));
}
