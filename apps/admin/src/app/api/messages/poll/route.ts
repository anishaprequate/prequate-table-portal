import { NextResponse } from "next/server";
import { prisma } from "@prequate/db";
import { getCurrentAdmin, canView } from "@/lib/session";

// Polled every 15s by an open thread — returns messages newer than `since`
// and marks incoming ones read, since the thread being open and visible is
// exactly what "read" means here.
export async function GET(request: Request) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ messages: [] }, { status: 401 });

  const url = new URL(request.url);
  const memberId = url.searchParams.get("memberId") ?? "";
  const since = url.searchParams.get("since");
  const sinceDate = since ? new Date(since) : new Date(0);

  const fullAdmin = canView(admin.role);
  const partnerId = fullAdmin ? null : admin.id;

  await prisma.message.updateMany({
    where: { memberId, partnerId, senderRole: "MEMBER", read: false },
    data: { read: true },
  });

  const messages = await prisma.message.findMany({
    where: { memberId, partnerId, createdAt: { gt: sinceDate } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ messages });
}
