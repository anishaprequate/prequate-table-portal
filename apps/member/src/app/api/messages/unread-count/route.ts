import { NextResponse } from "next/server";
import { prisma } from "@prequate/db";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ count: 0 }, { status: 401 });

  const count = await prisma.message.count({
    where: { memberId: user.id, senderRole: { not: "MEMBER" }, read: false },
  });
  return NextResponse.json({ count });
}
