import { NextResponse } from "next/server";
import { prisma } from "@prequate/db";
import { getCurrentAdmin, canView } from "@/lib/session";

// Admin's unread count stays Message-based (not Notification-based like
// the member side) — the RM inbox is shared across every full admin, and
// there's no single "recipient" to fan a Notification out to without also
// covering read-only associates, so this just mirrors the layout's own
// count instead of introducing that complexity.
export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ count: 0 }, { status: 401 });

  const fullAdmin = canView(admin.role);
  const count = await prisma.message.count({
    where: { senderRole: "MEMBER", read: false, partnerId: fullAdmin ? null : admin.id },
  });
  return NextResponse.json({ count });
}
