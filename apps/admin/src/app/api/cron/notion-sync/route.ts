import { NextResponse } from "next/server";
import { notionConfigured } from "@/lib/notion/client";
import { runNotionSync } from "@/lib/notion/sync";

// Meant to be hit every 15 minutes by a real scheduler (see
// docs/integration-readiness.md), same shape as the other /api/cron routes.
// The admin "Sync now" button runs the same function.
export async function GET(request: Request) {
  const secret = new URL(request.url).searchParams.get("secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return new NextResponse("Not authorized", { status: 401 });
  }
  if (!notionConfigured()) {
    return NextResponse.json({ error: "NOTION_TOKEN is not set" }, { status: 503 });
  }
  const report = await runNotionSync();
  return NextResponse.json(report);
}
