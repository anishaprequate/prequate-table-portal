"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@prequate/db";
import { getCurrentAdmin, isFullAdmin } from "@/lib/session";

export async function updateRoomSettings(formData: FormData) {
  const admin = await getCurrentAdmin();
  if (!admin || !isFullAdmin(admin.role)) redirect("/bookings");

  const roomPulseEnabled = formData.get("roomPulseEnabled") === "on";

  await prisma.appSettings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", roomPulseEnabled },
    update: { roomPulseEnabled },
  });

  revalidatePath("/settings");
  redirect("/settings?roomSaved=1");
}
