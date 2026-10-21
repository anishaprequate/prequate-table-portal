import { NextResponse } from "next/server";
import { runScheduledNotifications } from "@prequate/core";

// The time-driven notifications, all in one call: held pushes, "Hour in an hour",
// the day before and the morning of an event, "Hour still open", the daily digest
// and the place nudge. Meant to be hit every few minutes by a scheduler (see
// docs/integration-readiness.md); every step marks what it has sent, so hitting it
// more often is safe. Same ?secret= as the other cron routes.
export async function GET(request: Request) {
  const secret = new URL(request.url).searchParams.get("secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return new NextResponse("Not authorized", { status: 401 });
  }
  return NextResponse.json(await runScheduledNotifications());
}
