import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@prequate/db";
import { googleOAuth } from "@prequate/core";
import { getCurrentAdmin, isFullAdmin } from "@/lib/session";

export async function GET(request: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin || !isFullAdmin(admin.role)) {
    return NextResponse.redirect(new URL("/bookings", request.url));
  }

  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(new URL("/settings?error=no-code", request.url));
  }

  const redirectUri = process.env.GOOGLE_REDIRECT_URI ?? new URL("/api/google/callback", request.url).toString();

  try {
    const tokens = await googleOAuth.exchangeCodeForTokens(code, redirectUri);
    const accountEmail = await googleOAuth.getConnectedEmail(tokens.accessToken);

    // Only one connection is supported at a time — clear any existing ones
    // before storing the new one, rather than accumulating stale rows.
    await prisma.googleCalendarConnection.deleteMany();
    await prisma.googleCalendarConnection.create({
      data: {
        accountEmail,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
        connectedById: admin.id,
      },
    });

    return NextResponse.redirect(new URL("/settings?connected=1", request.url));
  } catch (error) {
    console.error("Google Calendar connect failed:", error);
    return NextResponse.redirect(new URL("/settings?error=connect-failed", request.url));
  }
}
