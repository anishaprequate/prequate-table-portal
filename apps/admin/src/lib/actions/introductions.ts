"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@prequate/db";
import { getCurrentAdmin, isFullAdmin, canWrite } from "@/lib/session";

export async function updateIntroductionRequest(formData: FormData) {
  const admin = await getCurrentAdmin();
  if (!admin || !isFullAdmin(admin.role) || !canWrite(admin.role)) redirect("/bookings");

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "SENT");
  const adminNote = String(formData.get("adminNote") ?? "").trim() || null;
  const routed = formData.get("routed") === "on";

  const existing = await prisma.introductionRequest.findUnique({ where: { id } });
  if (!existing) redirect("/introductions");

  await prisma.introductionRequest.update({
    where: { id },
    data: {
      status,
      adminNote,
      routedAt: routed ? existing.routedAt ?? new Date() : null,
    },
  });

  revalidatePath("/introductions");
  revalidatePath(`/introductions/${id}`);
  redirect(`/introductions/${id}?saved=1`);
}
