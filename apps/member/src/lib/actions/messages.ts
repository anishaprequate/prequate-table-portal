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

// Sending from the open chat: no redirect, so the box keeps its focus and the
// phone keyboard stays up. Returns the saved message so the chat can show it.
export async function sendChatMessage(
  partnerKey: string,
  body: string,
): Promise<{ ok: true; id: string; createdAt: string } | { ok: false }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false };
  const text = body.trim().slice(0, 4000);
  if (!text) return { ok: false };

  const partnerId = partnerKey === "rm" ? null : partnerKey;
  if (partnerId) {
    const partner = await prisma.user.findFirst({ where: { id: partnerId, role: "PARTNER" }, select: { id: true } });
    if (!partner) return { ok: false };
  }

  const message = await prisma.message.create({
    data: { memberId: user.id, partnerId, senderRole: "MEMBER", authorId: user.id, body: text },
  });
  revalidatePath("/messages");
  return { ok: true, id: message.id, createdAt: message.createdAt.toISOString() };
}
