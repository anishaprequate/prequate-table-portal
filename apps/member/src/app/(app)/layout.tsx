import { redirect } from "next/navigation";
import { prisma } from "@prequate/db";
import { getCurrentUser } from "@/lib/session";
import { NavShell } from "@/components/nav-shell";
import { ToastProvider } from "@/components/toast";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.firstLoginAt) redirect("/arrive");

  const [unreadMessages, unreadNotifications] = await Promise.all([
    prisma.message.count({
      where: { memberId: user.id, senderRole: { not: "MEMBER" }, read: false },
    }),
    prisma.notification.count({
      where: { recipientId: user.id, readAt: null, type: { not: "new_message" } },
    }),
  ]);

  return (
    <ToastProvider>
      <NavShell memberName={user.name} unreadMessages={unreadMessages} unreadNotifications={unreadNotifications}>
        {children}
      </NavShell>
    </ToastProvider>
  );
}
