import { NextResponse } from "next/server";
import { prisma } from "@prequate/db";
import { getCurrentAdmin } from "@/lib/session";
import { notificationLink } from "@/lib/notification-link";

// Marks a notification read, then redirects to the page it's about —
// mirrors the member app's /api/notifications/[id]/open.
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.redirect(new URL("/login", request.url));

  const notification = await prisma.notification.findFirst({
    where: { id: params.id, recipientId: admin.id },
  });
  if (!notification) return NextResponse.redirect(new URL("/notifications", request.url));

  if (!notification.readAt) {
    await prisma.notification.update({ where: { id: notification.id }, data: { readAt: new Date() } });
  }

  return NextResponse.redirect(new URL(notificationLink(notification), request.url));
}
