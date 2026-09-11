"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@prequate/db";
import { getCurrentAdmin, isFullAdmin } from "@/lib/session";

export async function createInterestCategory(formData: FormData) {
  const admin = await getCurrentAdmin();
  if (!admin || !isFullAdmin(admin.role)) redirect("/settings");

  const label = String(formData.get("label") ?? "").trim();
  if (!label) redirect("/settings/interests");

  const last = await prisma.interestCategory.findFirst({ orderBy: { sortOrder: "desc" } });
  await prisma.interestCategory.create({
    data: { label, sortOrder: (last?.sortOrder ?? -1) + 1 },
  });

  revalidatePath("/settings/interests");
  redirect("/settings/interests");
}

export async function renameInterestCategory(formData: FormData) {
  const admin = await getCurrentAdmin();
  if (!admin || !isFullAdmin(admin.role)) redirect("/settings");

  const id = String(formData.get("id") ?? "");
  const label = String(formData.get("label") ?? "").trim();
  if (!id || !label) redirect("/settings/interests");

  await prisma.interestCategory.update({ where: { id }, data: { label } });

  revalidatePath("/settings/interests");
  redirect("/settings/interests");
}

export async function deleteInterestCategory(formData: FormData) {
  const admin = await getCurrentAdmin();
  if (!admin || !isFullAdmin(admin.role)) redirect("/settings");

  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/settings/interests");

  await prisma.memberInterest.deleteMany({ where: { categoryId: id } });
  await prisma.interestCategory.delete({ where: { id } });

  revalidatePath("/settings/interests");
  revalidatePath("/profile");
  redirect("/settings/interests");
}
