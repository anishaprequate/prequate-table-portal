"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@prequate/db";
import { getCurrentUser } from "@/lib/session";

export async function toggleBookmark(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const postId = String(formData.get("postId") ?? "");

  const existing = await prisma.insightBookmark.findUnique({
    where: { memberId_postId: { memberId: user.id, postId } },
  });

  if (existing) {
    await prisma.insightBookmark.delete({ where: { id: existing.id } });
  } else {
    await prisma.insightBookmark.create({ data: { memberId: user.id, postId } });
  }

  revalidatePath(`/insight/${postId}`);
  revalidatePath("/insight");
}
