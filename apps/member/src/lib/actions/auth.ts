"use server";

import { randomBytes } from "crypto";
import { redirect } from "next/navigation";
import { prisma } from "@prequate/db";
import { mailer, emailTemplates } from "@prequate/core";
import { createSession, destroySession, getCurrentUser } from "@/lib/session";
import { generateOtpCode, otpExpiry, magicLinkExpiry } from "@/lib/otp";

export async function landingRouteFor(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return "/login?error=not-found";
  return user.firstLoginAt ? "/home" : "/arrive";
}

// The dev-only "pick a plate" dropdown just routes through the same real
// card-login page a physical tap opens, rather than duplicating the lookup
// and session logic.
export async function simulateTap(formData: FormData) {
  const chipUid = String(formData.get("chipUid") ?? "").trim();
  if (!chipUid) redirect("/login/tap?error=missing");
  redirect(`/login/nfc/${encodeURIComponent(chipUid)}`);
}

export async function requestOtp(formData: FormData) {
  const phone = String(formData.get("phone") ?? "").trim();
  if (!phone) redirect("/login/phone?error=missing");

  const user = await prisma.user.findFirst({ where: { phone, role: "MEMBER" } });
  if (!user) redirect("/login/phone?error=not-found");

  const code = generateOtpCode();
  await prisma.otpCode.create({
    data: { userId: user.id, code, channel: "phone", expiresAt: otpExpiry() },
  });

  redirect(`/login/phone/verify?phone=${encodeURIComponent(phone)}&demoCode=${code}`);
}

export async function requestMagicLink(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) redirect("/login/email?error=missing");

  const user = await prisma.user.findFirst({ where: { email, role: "MEMBER" } });
  // Same "check your email" redirect whether or not the address matched —
  // doesn't confirm to a visitor which emails are registered members.
  if (!user) redirect("/login/email/check");

  const token = randomBytes(32).toString("hex");
  await prisma.otpCode.create({
    data: { userId: user.id, code: token, channel: "email", expiresAt: magicLinkExpiry() },
  });

  const link = `${process.env.MEMBER_APP_URL ?? "http://localhost:3000"}/login/email/verify/${token}`;
  const { subject, text } = emailTemplates.magicLinkEmail({ link });
  await mailer.sendEmail({ to: email, subject, text });

  redirect("/login/email/check");
}

export async function verifyOtp(formData: FormData) {
  const phone = String(formData.get("phone") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim();

  const user = await prisma.user.findFirst({ where: { phone, role: "MEMBER" } });
  if (!user) redirect("/login/phone?error=not-found");

  const otp = await prisma.otpCode.findFirst({
    where: { userId: user.id, code, channel: "phone", consumedAt: null },
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
