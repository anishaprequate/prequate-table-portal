"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@prequate/db";
import { getCurrentUser } from "@/lib/session";

export async function submitConciergeRequest(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const selected = formData.getAll("categoryId").map(String);
  const categoryIds = selected.filter((id) => id !== "other");
  const wantsOther = selected.includes("other");
  const customText = String(formData.get("customText") ?? "").trim();
  const detail = String(formData.get("detail") ?? "").trim() || null;

  if (categoryIds.length === 0 && !(wantsOther && customText)) {
    redirect("/concierge?error=incomplete");
  }

  const categories = await prisma.conciergeCategory.findMany({
    where: { id: { in: categoryIds } },
    select: { id: true, slaDays: true },
  });
  const slaDaysById = new Map(categories.map((c) => [c.id, c.slaDays]));
  const now = new Date();

  await prisma.$transaction([
    ...categoryIds.map((categoryId) => {
      const chosenExamples = formData.getAll(`subitems.${categoryId}`).map(String);
      const slaDays = slaDaysById.get(categoryId);
      const dueAt = slaDays ? new Date(now.getTime() + slaDays * 24 * 60 * 60 * 1000) : null;
      return prisma.conciergeRequest.create({
        data: {
          memberId: user.id,
          categoryId,
          selectedExamples: chosenExamples.length ? JSON.stringify(chosenExamples) : null,
          detail,
          status: "SUBMITTED",
          dueAt,
        },
      });
    }),
    ...(wantsOther && customText
      ? [
          prisma.conciergeRequest.create({
            data: { memberId: user.id, customText, detail, status: "SUBMITTED" },
          }),
        ]
      : []),
  ]);

  revalidatePath("/concierge");
  redirect("/concierge?tab=requests&submitted=1");
}

export async function respondToConciergeProposal(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const id = String(formData.get("id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  if (decision !== "ACCEPTED" && decision !== "DECLINED") redirect(`/concierge/${id}`);

  const request = await prisma.conciergeRequest.findUnique({ where: { id } });
  if (!request || request.memberId !== user.id || request.status !== "AWAITING_APPROVAL") {
    redirect(`/concierge/${id}`);
  }

  await prisma.conciergeRequest.update({ where: { id }, data: { status: decision } });

  revalidatePath(`/concierge/${id}`);
  revalidatePath("/concierge");
  redirect(`/concierge/${id}?responded=1`);
}
