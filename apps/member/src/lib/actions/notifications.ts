"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@prequate/db";
import { getCurrentUser } from "@/lib/session";

export async function markAllNotificationsRead() {
  const user = await getCurrentUser();
  if (!user) return;
  await prisma.notification.updateMany({
    where: { recipientId: user.id, readAt: null, type: { not: "new_message" } },
    data: { readAt: new Date() },
  });
  revalidatePath("/notifications");
  revalidatePath("/home");
}
