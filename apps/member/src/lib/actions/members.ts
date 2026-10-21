"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@prequate/db";
import { notifyMember } from "@prequate/core";
import { getCurrentUser } from "@/lib/session";

export async function requestIntroduction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const targetId = String(formData.get("targetId") ?? "");
  if (!targetId || targetId === user.id) redirect("/members");

  const message = String(formData.get("message") ?? "").trim() || null;
  const preferredChannel = String(formData.get("preferredChannel") ?? "").trim() || null;
  const contactDetails = String(formData.get("contactDetails") ?? "").trim() || null;

  const existing = await prisma.introductionRequest.findFirst({
    where: { requesterId: user.id, targetId },
  });
  if (!existing) {
    await prisma.introductionRequest.create({
      data: { requesterId: user.id, targetId, message, preferredChannel, contactDetails },
    });
  }

  revalidatePath(`/members/${targetId}`);
  revalidatePath("/members");
  redirect(`/members/${targetId}?requested=1`);
}

export async function respondToIntroduction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const id = String(formData.get("id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  if (decision !== "ACCEPTED" && decision !== "DECLINED") redirect("/members?tab=received");

  const request = await prisma.introductionRequest.findUnique({ where: { id } });
  if (!request || request.targetId !== user.id || !request.routedAt) redirect("/members?tab=received");

  await prisma.introductionRequest.update({ where: { id }, data: { status: decision } });

  // The member who asked hears the answer: a push when accepted, only the
  // Notifications page when declined.
  await notifyMember({
    memberId: request.requesterId,
    type: decision === "ACCEPTED" ? "intro_accepted" : "intro_declined",
    message:
      decision === "ACCEPTED"
        ? `${user.name} accepted your introduction.`
        : `${user.name} is not able to take the introduction right now.`,
    entityType: "intro_request",
    entityId: id,
  });

  revalidatePath("/members");
  redirect("/members?tab=received&responded=1");
}
