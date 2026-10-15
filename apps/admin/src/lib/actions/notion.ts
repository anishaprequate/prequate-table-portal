"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentAdmin, isFullAdmin, canWrite } from "@/lib/session";
import { notionConfigured } from "@/lib/notion/client";
import { runNotionSync } from "@/lib/notion/sync";

export async function syncFromNotion() {
  const admin = await getCurrentAdmin();
  if (!admin || !isFullAdmin(admin.role) || !canWrite(admin.role)) redirect("/bookings");
  if (!notionConfigured()) redirect("/settings?notion=not-configured");

  let outcome = "ok";
  try {
    const report = await runNotionSync();
    outcome = report.errors.length ? "errors" : "ok";
  } catch {
    outcome = "failed";
  }
  revalidatePath("/settings");
  redirect(`/settings?notion=${outcome}`);
}
