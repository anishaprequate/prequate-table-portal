import { redirect } from "next/navigation";
import { prisma } from "@prequate/db";
import { getCurrentAdmin, canView, canWrite } from "@/lib/session";
import { navFor, ROLE_LABELS } from "@/lib/access";
import { NavShell } from "@/components/nav-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/login");

  const fullAdmin = canView(admin.role);
  const [unreadMessages, unreadNotifications] = await Promise.all([
    prisma.message.count({
      where: {
        senderRole: "MEMBER",
        read: false,
        partnerId: fullAdmin ? null : admin.id,
      },
    }),
    prisma.notification.count({ where: { recipientId: admin.id, readAt: null } }),
  ]);

  return (
    <NavShell
      items={navFor(admin.role).map(({ href, label }) => ({ href, label }))}
      adminName={admin.name}
      roleLabel={ROLE_LABELS[admin.role] ?? admin.role}
      canChangePassword={admin.role !== "ADMIN_ASSOCIATE"}
      readOnly={!canWrite(admin.role)}
      unreadMessages={unreadMessages}
      unreadNotifications={unreadNotifications}
    >
      {children}
    </NavShell>
  );
}
