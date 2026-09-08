"use server";

import { redirect } from "next/navigation";
import { prisma } from "@prequate/db";
import { createSession, destroySession, getCurrentUser } from "@/lib/session";
import { generateOtpCode, otpExpiry } from "@/lib/otp";

async function landingRouteFor(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return "/login?error=not-found";
  return user.firstLoginAt ? "/home" : "/arrive";
}

export async function simulateTap(formData: FormData) {
  const chipUid = String(formData.get("chipUid") ?? "").trim();
  if (!chipUid) redirect("/login/tap?error=missing");

  const user = await prisma.user.findFirst({ where: { chipUid, role: "MEMBER" } });
  if (!user) redirect("/login/tap?error=not-found");

  await createSession(user.id);
  redirect(await landingRouteFor(user.id));
}

export async function requestOtp(formData: FormData) {
  const phone = String(formData.get("phone") ?? "").trim();
  if (!phone) redirect("/login/phone?error=missing");

  const user = await prisma.user.findFirst({ where: { phone, role: "MEMBER" } });
  if (!user) redirect("/login/phone?error=not-found");

  const code = generateOtpCode();
  await prisma.otpCode.create({
    data: { userId: user.id, code, expiresAt: otpExpiry() },
  });

  redirect(`/login/phone/verify?phone=${encodeURIComponent(phone)}&demoCode=${code}`);
}

export async function verifyOtp(formData: FormData) {
  const phone = String(formData.get("phone") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim();

  const user = await prisma.user.findFirst({ where: { phone, role: "MEMBER" } });
  if (!user) redirect("/login/phone?error=not-found");

  const otp = await prisma.otpCode.findFirst({
    where: { userId: user.id, code, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (!otp || otp.expiresAt < new Date()) {
    redirect(`/login/phone/verify?phone=${encodeURIComponent(phone)}&error=invalid`);
  }

  await prisma.otpCode.update({ where: { id: otp.id }, data: { consumedAt: new Date() } });
  await createSession(user.id);
  redirect(await landingRouteFor(user.id));
}

export async function completeArrival() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  await prisma.user.update({
    where: { id: user.id },
    data: { firstLoginAt: new Date() },
  });

  redirect("/home");
}

export async function signOut() {
  await destroySession();
  redirect("/login");
}
