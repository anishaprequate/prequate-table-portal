import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@prequate/db";
import { getCurrentUser } from "@/lib/session";
import { formatSlot } from "@/lib/format";
import { PageHero } from "@/components/page-hero";
import { BackLink } from "@/components/back-link";

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const notifications = await prisma.notification.findMany({
    where: { recipientId: user.id, type: { not: "new_message" } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="max-w-lg">
      <PageHero title="Notifications" subtitle="Everything sent your way, newest first." />

      <ul className="flex flex-col divide-y divide-grey/15">
        {notifications.length === 0 && <p className="py-4 text-sm text-grey">Nothing yet.</p>}
        {notifications.map((n) => (
          <li key={n.id} className="py-4">
            <Link href={`/api/notifications/${n.id}/open`} className="flex items-start justify-between gap-3">
              <div>
                <p className={`text-sm ${n.readAt ? "text-grey" : "text-ink"}`}>{n.message}</p>
                <p className="mt-1 text-xs text-grey">{formatSlot(n.createdAt)}</p>
              </div>
              {!n.readAt && <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-deep-orange" />}
            </Link>
          </li>
        ))}
      </ul>

      <BackLink href="/home" />
    </div>
  );
}
