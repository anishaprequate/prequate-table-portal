"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { prisma } from "@prequate/db";
import { UPLOADS_DIR, googleCalendar } from "@prequate/core";
import { getCurrentUser } from "@/lib/session";

export async function updateProfile(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const name = String(formData.get("name") ?? "").trim();
  const seatType = String(formData.get("seatType") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();
  const interestIds = formData.getAll("interests").map(String);

  let photoUrl: string | undefined;
  const photo = formData.get("photo");
  if (photo instanceof File && photo.size > 0 && photo.type.startsWith("image/")) {
    await mkdir(UPLOADS_DIR, { recursive: true });
    const safeName = photo.name.replace(/[^a-zA-Z0-9_.-]/g, "_");
    const storedName = `${user.id}-${Date.now()}-${safeName}`;
    const buffer = Buffer.from(await photo.arrayBuffer());
    await writeFile(path.join(UPLOADS_DIR, storedName), buffer);
    photoUrl = `/api/briefs/${storedName}`;
  }

  const newEmail = email || null;

  await prisma.user.update({
    where: { id: user.id },
    data: {
      name: name || user.name,
      seatType: seatType || null,
      email: newEmail,
      bio: bio || null,
      ...(photoUrl ? { photoUrl } : {}),
    },
  });

  if (newEmail !== user.email) {
    await googleCalendar.syncMemberEmailOnCalendarEvents({
      memberId: user.id,
      memberName: name || user.name,
      memberEmail: newEmail,
    });
  }

  await prisma.memberInterest.deleteMany({
    where: { memberId: user.id, categoryId: { notIn: interestIds } },
  });
  await Promise.all(
    interestIds.map((categoryId) =>
      prisma.memberInterest.upsert({
        where: { memberId_categoryId: { memberId: user.id, categoryId } },
        update: {},
        create: { memberId: user.id, categoryId },
      }),
    ),
  );

  revalidatePath("/profile");
  revalidatePath("/directory");
  redirect("/profile?saved=1");
}
