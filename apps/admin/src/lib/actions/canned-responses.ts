"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@prequate/db";
import { getCurrentAdmin, isFullAdmin, canWrite } from "@/lib/session";

export async function createCannedResponse(formData: FormData) {
  const admin = await getCurrentAdmin();
  if (!admin || !isFullAdmin(admin.role) || !canWrite(admin.role)) redirect("/bookings");

  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (!title || !body) redirect("/settings/canned-responses/new?error=incomplete");

  await prisma.cannedResponse.create({ data: { title, body } });

  revalidatePath("/settings/canned-responses");
  redirect("/settings/canned-responses");
}

export async function updateCannedResponse(formData: FormData) {
  const admin = await getCurrentAdmin();
  if (!admin || !isFullAdmin(admin.role) || !canWrite(admin.role)) redirect("/bookings");

  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (!title || !body) redirect(`/settings/canned-responses/${id}?error=incomplete`);

  await prisma.cannedResponse.update({ where: { id }, data: { title, body } });

  revalidatePath("/settings/canned-responses");
  revalidatePath(`/settings/canned-responses/${id}`);
  redirect(`/settings/canned-responses/${id}?saved=1`);
}

export async function deleteCannedResponse(formData: FormData) {
  const admin = await getCurrentAdmin();
  if (!admin || !isFullAdmin(admin.role) || !canWrite(admin.role)) redirect("/bookings");

  const id = String(formData.get("id") ?? "");
  await prisma.cannedResponse.delete({ where: { id } });

  revalidatePath("/settings/canned-responses");
  redirect("/settings/canned-responses");
}
