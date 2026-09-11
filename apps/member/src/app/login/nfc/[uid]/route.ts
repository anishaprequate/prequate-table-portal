import { NextResponse } from "next/server";
import { prisma } from "@prequate/db";
import { logTimelineEntry } from "@prequate/core";
import { createSession } from "@/lib/session";
import { landingRouteFor } from "@/lib/actions/auth";

// The real NFC card login — an NDEF URL tag on the physical card points
// here (https://<memberapp>/login/nfc/<uid>), no app required. A Route
// Handler rather than a page, since setting the session cookie can only
// happen in a Server Action or Route Handler, not during a page render.
export async function GET(request: Request, { params }: { params: { uid: string } }) {
  const user = await prisma.user.findFirst({ where: { chipUid: params.uid, role: "MEMBER" } });

  if (!user) {
    return new NextResponse(
      `<!doctype html><html><body style="font-family: sans-serif; text-align: center; padding-top: 20vh; color: #161616;">
        <h1 style="font-style: italic;">Card not recognized</h1>
        <p style="color: #707070;">This card isn't linked to a Table membership yet. Contact your relationship manager.</p>
      </body></html>`,
      { status: 404, headers: { "Content-Type": "text/html" } },
    );
  }

  await createSession(user.id);
  await logTimelineEntry({
    memberId: user.id,
    authorId: user.id,
    type: "SYSTEM",
    body: "Logged in via NFC card tap.",
  });

  const landingRoute = await landingRouteFor(user.id);
  return NextResponse.redirect(new URL(landingRoute, request.url));
}
