"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@prequate/db";
import { notifyMember } from "@prequate/core";
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

  // Every message pushes, so a live conversation keeps going. The Messages badge is
  // the in-app signal, so no notification row is written.
  // From the person who wrote it, by first name: Anisha, not "the team".
  const snippet = body.length > 120 ? `${body.slice(0, 117).trim()}…` : body;
  const sender = admin.name.split(" ")[0];
  await notifyMember({
    memberId,
    type: "message",
    title: `Message from ${sender}`,
    message: `${sender}: ${snippet}`,
    entityType: "message_thread",
    entityId: fullAdmin ? "rm" : admin.id,
    tag: `thread-${fullAdmin ? "rm" : admin.id}`,
  });

  revalidatePath("/messages");
  revalidatePath(`/messages/${memberId}`);
  redirect(`/messages/${memberId}`);
}
