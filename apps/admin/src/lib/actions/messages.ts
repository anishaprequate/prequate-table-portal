"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@prequate/db";
import { getCurrentAdmin, isFullAdmin, canWrite } from "@/lib/session";

export async function sendReply(formData: FormData) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/login");
  if (!canWrite(admin.role)) redirect("/messages");

  const memberId = String(formData.get("memberId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!body) redirect(`/messages/${memberId}`);

  const fullAdmin = isFullAdmin(admin.role);

  if (!fullAdmin) {
    const member = await prisma.user.findUnique({ where: { id: memberId } });
    if (!member?.allowPartnerMessages) redirect(`/messages/${memberId}?error=blocked`);
  }

  await prisma.message.create({
    data: {
      memberId,
      partnerId: fullAdmin ? null : admin.id,
      senderRole: fullAdmin ? "RM" : "PARTNER",
      authorId: admin.id,
      body,
    },
  });

  revalidatePath("/messages");
  revalidatePath(`/messages/${memberId}`);
  redirect(`/messages/${memberId}`);
}
