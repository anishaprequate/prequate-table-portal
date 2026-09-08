import { NextRequest, NextResponse } from "next/server";
import { googleOAuth } from "@prequate/core";
import { getCurrentAdmin, isFullAdmin } from "@/lib/session";

export async function GET(request: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin || !isFullAdmin(admin.role)) {
    return NextResponse.redirect(new URL("/bookings", request.url));
  }

  const redirectUri = process.env.GOOGLE_REDIRECT_URI ?? new URL("/api/google/callback", request.url).toString();
  const authUrl = googleOAuth.buildGoogleAuthUrl(redirectUri);

  return NextResponse.redirect(authUrl);
}
