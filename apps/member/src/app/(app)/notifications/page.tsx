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

      <ul className="flex flex-col divide-y divide-taupe/15">
        {notifications.length === 0 && <p className="py-4 text-sm text-taupe">Nothing yet.</p>}
        {notifications.map((n) => (
          <li key={n.id}>
            {/* A plain anchor, not next/link's <Link> — this target is a
                Route Handler whose whole job is to redirect elsewhere, not
                a page to client-transition to, and a full navigation here
                keeps the browser's back button behaving predictably. */}
            <a
              href={`/api/notifications/${n.id}/open`}
              className="-mx-3 flex items-start justify-between gap-3 rounded-md px-3 py-4 transition-colors duration-300 hover:bg-ink/[0.03]"
            >
              <div>
                <p className={`text-sm ${n.readAt ? "text-taupe" : "text-ink"}`}>{n.message}</p>
                <p className="mt-1 text-xs text-taupe">{formatSlot(n.createdAt)}</p>
              </div>
              {!n.readAt && <span className="mt-1 h-2 w-2 flex-shrink-0 animate-scale-in rounded-full bg-clay" />}
            </a>
          </li>
        ))}
      </ul>

      <BackLink href="/home" />
    </div>
  );
}
