"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@prequate/db";
import { hashPassword, verifyPassword, normalizeUsername, PASSWORD_MIN_LENGTH } from "@prequate/core";
import { createAdminSession, destroyAdminSession, getCurrentAdmin } from "@/lib/session";

const ADMIN_ROLES = ["ADMIN_OWNER", "ADMIN_RM", "PARTNER", "ADMIN_ASSOCIATE"];

// A gentle limit on wrong guesses: five misses on one username in ten
// minutes pauses sign-in for that username. Kept in memory, so it resets when
// the server restarts. Enough to stop idle guessing; not a security system.
const WINDOW_MS = 10 * 60_000;
const MAX_MISSES = 5;
const misses = new Map<string, number[]>();

function recentMisses(key: string): number[] {
  const now = Date.now();
  const list = (misses.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  misses.set(key, list);
  return list;
}

export async function adminLogin(formData: FormData) {
  const username = normalizeUsername(String(formData.get("username") ?? ""));
  const password = String(formData.get("password") ?? "");
  if (!username || !password) redirect("/login?error=invalid");

  if (recentMisses(username).length >= MAX_MISSES) redirect("/login?error=wait");

  const user = await prisma.user.findUnique({ where: { username } });
  // Same message whether the username or the password was wrong.
  if (!user || !ADMIN_ROLES.includes(user.role) || !verifyPassword(password, user.passwordHash)) {
    recentMisses(username).push(Date.now());
    redirect("/login?error=invalid");
  }

  misses.delete(username);
  await createAdminSession(user.id);
  redirect("/");
}

export async function adminSignOut() {
  await destroyAdminSession();
  redirect("/login");
}

export type PasswordState = { status: "idle" } | { status: "ok"; message: string } | { status: "error"; message: string };

function checkNewPassword(next: string, confirm: string): string | null {
  if (next.length < PASSWORD_MIN_LENGTH) return `Use at least ${PASSWORD_MIN_LENGTH} characters.`;
  if (next !== confirm) return "The two new passwords do not match.";
  return null;
}

// Change your own password. The shared Associate login cannot change its own:
// only the owner sets that one, so nobody can lock the others out.
export async function changeOwnPassword(_prev: PasswordState, formData: FormData): Promise<PasswordState> {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/login");
  if (admin.role === "ADMIN_ASSOCIATE") return { status: "error", message: "The Associate password is set by the owner." };

  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!verifyPassword(current, admin.passwordHash)) return { status: "error", message: "Your current password is not right." };
  const problem = checkNewPassword(next, confirm);
  if (problem) return { status: "error", message: problem };

  await prisma.user.update({ where: { id: admin.id }, data: { passwordHash: hashPassword(next) } });
  return { status: "ok", message: "Password changed." };
}

// The owner sets or resets anyone's password from the Team logins page.
export async function setTeamPassword(_prev: PasswordState, formData: FormData): Promise<PasswordState> {
  const admin = await getCurrentAdmin();
  if (!admin || admin.role !== "ADMIN_OWNER") redirect("/");

  const userId = String(formData.get("userId") ?? "");
  const next = String(formData.get("next") ?? "");
  const problem = checkNewPassword(next, next);
  if (problem) return { status: "error", message: problem };

  const user = await prisma.user.findFirst({ where: { id: userId, username: { not: null }, role: { in: ADMIN_ROLES } } });
  if (!user) return { status: "error", message: "That login was not found." };

  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: hashPassword(next) } });
  revalidatePath("/team");
  return { status: "ok", message: `Password set for ${user.username}.` };
}
