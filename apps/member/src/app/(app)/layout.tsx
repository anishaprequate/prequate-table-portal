import { redirect } from "next/navigation";
import { prisma } from "@prequate/db";
import { getCurrentUser } from "@/lib/session";
import { NavShell } from "@/components/nav-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.firstLoginAt) redirect("/arrive");

  const unreadMessages = await prisma.message.count({
    where: { memberId: user.id, senderRole: { not: "MEMBER" }, read: false },
  });

  return (
    <NavShell memberName={user.name} unreadMessages={unreadMessages}>
      {children}
    </NavShell>
  );
}
