"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@prequate/db";
import { logTimelineEntry, summarizeToggleChange } from "@prequate/core";
import { getCurrentUser } from "@/lib/session";

export async function updateSettings(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const directoryOptOut = formData.get("showInDirectory") !== "on";
  const allowPartnerMessages = formData.get("allowPartnerMessages") === "on";

  await prisma.user.update({
    where: { id: user.id },
    data: { directoryOptOut, allowPartnerMessages },
  });

  const directoryNote = summarizeToggleChange("Directory visibility", !user.directoryOptOut, !directoryOptOut);
  const messagingNote = summarizeToggleChange(
    "Partner messaging",
    user.allowPartnerMessages,
    allowPartnerMessages,
  );
  const notes = [directoryNote, messagingNote].filter((n): n is string => Boolean(n));
  if (notes.length > 0) {
    await logTimelineEntry({ memberId: user.id, authorId: user.id, type: "SYSTEM", body: notes.join(" ") });
  }

  revalidatePath("/settings");
  revalidatePath("/directory");
  redirect("/settings?saved=1");
}
