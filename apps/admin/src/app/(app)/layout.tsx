import { redirect } from "next/navigation";
import { prisma } from "@prequate/db";
import { getCurrentAdmin, canView, canWrite } from "@/lib/session";
import { NavShell } from "@/components/nav-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/login");

  const fullAdmin = canView(admin.role);
  const unreadMessages = await prisma.message.count({
    where: {
      senderRole: "MEMBER",
      read: false,
      partnerId: fullAdmin ? null : admin.id,
    },
  });

  return (
    <NavShell
      adminName={admin.name}
      isFullAdmin={canView(admin.role)}
      isOwner={admin.role === "ADMIN_OWNER"}
      readOnly={!canWrite(admin.role)}
      unreadMessages={unreadMessages}
    >
      {children}
    </NavShell>
  );
}
