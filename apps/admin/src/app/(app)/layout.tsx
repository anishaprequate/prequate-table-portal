import { redirect } from "next/navigation";
import { prisma } from "@prequate/db";
import { getCurrentAdmin, canView, canWrite } from "@/lib/session";
import { navFor, ROLE_LABELS } from "@/lib/access";
import { NavShell } from "@/components/nav-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/login");

  const fullAdmin = canView(admin.role);
  // Hours waiting for an answer: a partner sees their own, a full admin sees all.
  // A read-only associate cannot answer, so is not nagged.
  const answers = admin.role !== "ADMIN_ASSOCIATE";
  const [unreadMessages, unreadNotifications, toConfirm] = await Promise.all([
    prisma.message.count({
      where: {
        senderRole: "MEMBER",
        read: false,
        partnerId: fullAdmin ? null : admin.id,
      },
    }),
    prisma.notification.count({ where: { recipientId: admin.id, readAt: null } }),
    answers
      ? prisma.booking.count({
          where: {
            ...(fullAdmin ? {} : { partnerId: admin.id }),
            status: { not: "CANCELLED" },
            startTime: { gte: new Date() },
            OR: [{ status: "REQUESTED" }, { pendingStart: { not: null } }],
          },
        })
      : Promise.resolve(0),
  ]);

  return (
    <NavShell
      items={navFor(admin.role, { hostsHours: admin.hostsHours, advisorDesk: admin.advisorDesk }).map(({ href, label }) => ({ href, label }))}
      adminName={admin.name}
      roleLabel={ROLE_LABELS[admin.role] ?? admin.role}
      canChangePassword={admin.role !== "ADMIN_ASSOCIATE"}
      readOnly={!canWrite(admin.role)}
      unreadMessages={unreadMessages}
      unreadNotifications={unreadNotifications}
      toConfirm={toConfirm}
    >
      {children}
    </NavShell>
  );
}
