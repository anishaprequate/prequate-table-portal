import { cookies } from "next/headers";
import { prisma } from "@prequate/db";

const COOKIE_NAME = "prequate_session";
const SESSION_DAYS = 30;

export async function createSession(userId: string) {
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  const session = await prisma.session.create({ data: { userId, expiresAt } });
  await prisma.user.update({ where: { id: userId }, data: { lastActiveAt: new Date() } });
  cookies().set(COOKIE_NAME, session.id, {
    httpOnly: true,
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });
}

export async function getCurrentUser() {
  const sessionId = cookies().get(COOKIE_NAME)?.value;
  if (!sessionId) return null;

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date()) return null;
  if (session.user.role !== "MEMBER") return null;

  return session.user;
}

export async function destroySession() {
  const sessionId = cookies().get(COOKIE_NAME)?.value;
  if (sessionId) {
    await prisma.session.delete({ where: { id: sessionId } }).catch(() => {});
  }
  cookies().delete(COOKIE_NAME);
}
