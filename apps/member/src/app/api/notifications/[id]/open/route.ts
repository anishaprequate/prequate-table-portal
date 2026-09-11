import { NextResponse } from "next/server";
import { prisma } from "@prequate/db";
import { getCurrentUser } from "@/lib/session";
import { notificationLink } from "@/lib/notification-link";

// Marks a notification read, then redirects to the page it's about — the
// single "open" action behind every notification row.
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const notification = await prisma.notification.findFirst({
    where: { id: params.id, recipientId: user.id },
  });
  if (!notification) return NextResponse.redirect(new URL("/notifications", request.url));

  if (!notification.readAt) {
    await prisma.notification.update({ where: { id: notification.id }, data: { readAt: new Date() } });
  }

  return NextResponse.redirect(new URL(notificationLink(notification), request.url));
}
