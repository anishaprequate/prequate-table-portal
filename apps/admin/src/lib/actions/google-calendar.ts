"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@prequate/db";
import { getCurrentAdmin, isFullAdmin } from "@/lib/session";

export async function disconnectGoogleCalendar() {
  const admin = await getCurrentAdmin();
  if (!admin || !isFullAdmin(admin.role)) redirect("/bookings");

  await prisma.googleCalendarConnection.deleteMany();

  revalidatePath("/settings");
  redirect("/settings?disconnected=1");
}
