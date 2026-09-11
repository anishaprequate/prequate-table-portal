"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@prequate/db";
import { getCurrentAdmin, isFullAdmin, canWrite } from "@/lib/session";

// RM and Owner manage one shared "ADMIN" set; a Partner manages their own
// separate "PARTNER" set. Associates can't manage either (read-only).
function canManageCannedResponses(role: string): boolean {
  return (isFullAdmin(role) || role === "PARTNER") && canWrite(role);
}

function audienceFor(role: string): "ADMIN" | "PARTNER" {
  return role === "PARTNER" ? "PARTNER" : "ADMIN";
}

export async function createCannedResponse(formData: FormData) {
  const admin = await getCurrentAdmin();
  if (!admin || !canManageCannedResponses(admin.role)) redirect("/bookings");

  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (!title || !body) redirect("/settings/canned-responses/new?error=incomplete");

  await prisma.cannedResponse.create({ data: { title, body, audience: audienceFor(admin.role) } });

  revalidatePath("/settings/canned-responses");
  redirect("/settings/canned-responses");
}

export async function updateCannedResponse(formData: FormData) {
  const admin = await getCurrentAdmin();
  if (!admin || !canManageCannedResponses(admin.role)) redirect("/bookings");

  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (!title || !body) redirect(`/settings/canned-responses/${id}?error=incomplete`);

  const existing = await prisma.cannedResponse.findFirst({ where: { id, audience: audienceFor(admin.role) } });
  if (!existing) redirect("/settings/canned-responses");

  await prisma.cannedResponse.update({ where: { id }, data: { title, body } });

  revalidatePath("/settings/canned-responses");
  revalidatePath(`/settings/canned-responses/${id}`);
  redirect(`/settings/canned-responses/${id}?saved=1`);
}

export async function deleteCannedResponse(formData: FormData) {
  const admin = await getCurrentAdmin();
  if (!admin || !canManageCannedResponses(admin.role)) redirect("/bookings");

  const id = String(formData.get("id") ?? "");
  const existing = await prisma.cannedResponse.findFirst({ where: { id, audience: audienceFor(admin.role) } });
  if (!existing) redirect("/settings/canned-responses");

  await prisma.cannedResponse.delete({ where: { id } });

  revalidatePath("/settings/canned-responses");
  redirect("/settings/canned-responses");
}
