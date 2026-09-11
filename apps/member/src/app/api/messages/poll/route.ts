import { NextResponse } from "next/server";
import { prisma } from "@prequate/db";
import { getCurrentUser } from "@/lib/session";

// Polled every 15s by an open thread — returns messages newer than `since`
// and marks them (and the matching notifications) read, since the thread
// being open and visible is exactly what "read" means here.
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ messages: [] }, { status: 401 });

  const url = new URL(request.url);
  const partnerParam = url.searchParams.get("partnerId");
  const partnerId = partnerParam === "rm" ? null : partnerParam;
  const since = url.searchParams.get("since");
  const sinceDate = since ? new Date(since) : new Date(0);

  const relatedEntityId = partnerParam === "rm" ? "rm" : partnerId;

  await Promise.all([
    prisma.message.updateMany({
      where: { memberId: user.id, partnerId, senderRole: { not: "MEMBER" }, read: false },
      data: { read: true },
    }),
    prisma.notification.updateMany({
      where: {
        recipientId: user.id,
        type: "new_message",
        relatedEntityId: relatedEntityId ?? undefined,
        readAt: null,
      },
      data: { readAt: new Date() },
    }),
  ]);

  const messages = await prisma.message.findMany({
    where: { memberId: user.id, partnerId, createdAt: { gt: sinceDate } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ messages });
}
