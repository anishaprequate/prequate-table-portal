"use server";

import { redirect } from "next/navigation";
import { prisma } from "@prequate/db";
import { createAdminSession, destroyAdminSession } from "@/lib/session";

// PRODUCTION NOTE: this is a shared passphrase for two known admins, not a
// real password system — no hashing, no per-user credentials, no lockout.
// Replace with proper authentication before production.
const ADMIN_PASSPHRASE = process.env.ADMIN_PASSPHRASE ?? "prequate2026";

export async function adminLogin(formData: FormData) {
  const userId = String(formData.get("userId") ?? "");
  const passphrase = String(formData.get("passphrase") ?? "");

  if (passphrase !== ADMIN_PASSPHRASE) {
    redirect("/login?error=invalid");
  }

  const user = await prisma.user.findFirst({
    where: { id: userId, role: { in: ["ADMIN_OWNER", "ADMIN_RM", "PARTNER", "ADMIN_ASSOCIATE"] } },
  });

  if (!user) redirect("/login?error=invalid");

  await createAdminSession(user.id);
  redirect("/bookings");
}

export async function adminSignOut() {
  await destroyAdminSession();
  redirect("/login");
}
