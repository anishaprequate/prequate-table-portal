"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@prequate/db";
import { getCurrentUser } from "@/lib/session";

export async function sendMessage(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const partnerId = String(formData.get("partnerId") ?? "").trim() || null;
  const body = String(formData.get("body") ?? "").trim();
  const backTo = partnerId ? `/messages/${partnerId}` : "/messages/rm";
  if (!body) redirect(backTo);

  await prisma.message.create({
    data: {
      memberId: user.id,
      partnerId,
      senderRole: "MEMBER",
      authorId: user.id,
      body,
    },
  });

  revalidatePath("/messages");
  revalidatePath(backTo);
  redirect(backTo);
}
