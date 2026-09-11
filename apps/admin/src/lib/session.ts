import { cookies } from "next/headers";
import { prisma } from "@prequate/db";

const COOKIE_NAME = "prequate_admin_session";
const SESSION_DAYS = 14;

export async function createAdminSession(userId: string) {
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  const session = await prisma.session.create({ data: { userId, expiresAt } });
  cookies().set(COOKIE_NAME, session.id, {
    httpOnly: true,
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });
}

export async function getCurrentAdmin() {
  const sessionId = cookies().get(COOKIE_NAME)?.value;
  if (!sessionId) return null;

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date()) return null;
  const allowedRoles = ["ADMIN_OWNER", "ADMIN_RM", "PARTNER", "ADMIN_ASSOCIATE"];
  if (!allowedRoles.includes(session.user.role)) return null;

  return session.user;
}

export function isFullAdmin(role: string): boolean {
  return role === "ADMIN_OWNER" || role === "ADMIN_RM";
}

// Associates get the same breadth of view as a full admin (members,
// bookings, events, concierge, insight, messages, settings) but can't
// change anything — use this for page-level read access instead of
// isFullAdmin wherever an associate should be let in to look.
export function canView(role: string): boolean {
  return role === "ADMIN_OWNER" || role === "ADMIN_RM" || role === "ADMIN_ASSOCIATE";
}

// Everyone except a read-only associate can perform a write. Guard every
// mutating server action with this in addition to its existing
// role-specific checks.
export function canWrite(role: string): boolean {
  return role !== "ADMIN_ASSOCIATE";
}

// Reports is the one deliberate exception to partners otherwise only
// seeing their own calendar, Insight, and Messages — they get read access
// to this specific view alongside the full-admin roles.
export function canViewReports(role: string): boolean {
  return canView(role) || role === "PARTNER";
}

export async function destroyAdminSession() {
  const sessionId = cookies().get(COOKIE_NAME)?.value;
  if (sessionId) {
    await prisma.session.delete({ where: { id: sessionId } }).catch(() => {});
  }
  cookies().delete(COOKIE_NAME);
}
