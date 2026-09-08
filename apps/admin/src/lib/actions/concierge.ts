"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@prequate/db";
import { getCurrentAdmin, isFullAdmin, canWrite } from "@/lib/session";

export async function updateConciergeRequest(formData: FormData) {
  const admin = await getCurrentAdmin();
  if (!admin || !isFullAdmin(admin.role) || !canWrite(admin.role)) redirect("/bookings");

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "SUBMITTED");
  const vendorNote = String(formData.get("vendorNote") ?? "").trim() || null;
  const pointsRaw = Number(formData.get("pointsAwarded"));
  const pointsAwarded = Number.isFinite(pointsRaw) ? Math.max(0, Math.trunc(pointsRaw)) : 0;

  const request = await prisma.conciergeRequest.findUnique({ where: { id } });
  if (!request) redirect("/concierge");

  const pointsDelta = pointsAwarded - request.pointsAwarded;
  if (pointsDelta !== 0) {
    await prisma.user.update({
      where: { id: request.memberId },
      data: { points: { increment: pointsDelta } },
    });
  }

  await prisma.conciergeRequest.update({
    where: { id },
    data: { status, vendorNote, pointsAwarded },
  });

  revalidatePath("/concierge");
  revalidatePath(`/concierge/${id}`);
  redirect(`/concierge/${id}?saved=1`);
}

export async function setCategorySla(formData: FormData) {
  const admin = await getCurrentAdmin();
  if (!admin || !isFullAdmin(admin.role) || !canWrite(admin.role)) redirect("/bookings");

  const categories = await prisma.conciergeCategory.findMany({ select: { id: true } });

  await Promise.all(
    categories.map((category) => {
      const raw = String(formData.get(`slaDays.${category.id}`) ?? "").trim();
      const slaDays = raw === "" ? null : Math.max(0, Math.trunc(Number(raw)));
      return prisma.conciergeCategory.update({
        where: { id: category.id },
        data: { slaDays: Number.isFinite(slaDays) ? slaDays : null },
      });
    }),
  );

  revalidatePath("/concierge/categories");
  redirect("/concierge/categories?saved=1");
}
