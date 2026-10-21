import { redirect } from "next/navigation";
import { prisma } from "@prequate/db";
import { NOTIFICATION_TYPES } from "@prequate/core";
import { getCurrentUser } from "@/lib/session";
import { markAllNotificationsRead } from "@/lib/actions/notifications";
import { PageHero } from "@/components/page-hero";
import { BackLink } from "@/components/back-link";
import { NotificationGlyph } from "@/components/notification-icon";

const timeOf = (d: Date) => new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" }).format(d);

const dayLabel = (d: Date, now: Date) => {
  const start = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((start(now) - start(d)) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long" }).format(d);
};

// Everything sent to the member, newest first, grouped by day. Each row opens the
// screen it is about, and marks itself read on the way.
export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const notifications = await prisma.notification.findMany({
    where: { recipientId: user.id, type: { not: "new_message" } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const now = new Date();
  const unread = notifications.filter((n) => !n.readAt).length;
  const groups: { label: string; items: typeof notifications }[] = [];
  for (const n of notifications) {
    const label = dayLabel(n.createdAt, now);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(n);
    else groups.push({ label, items: [n] });
  }

  return (
    <div className="max-w-lg">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-3">
        <PageHero title="Notifications" subtitle="Everything sent your way, newest first." />
        {unread > 0 && (
          <form action={markAllNotificationsRead}>
            <button type="submit" className="btn-secondary tap">
              Mark all read
            </button>
          </form>
        )}
      </div>

      {notifications.length === 0 && <p className="py-4 text-sm text-taupe">Nothing yet.</p>}

      <div className="flex flex-col gap-8">
        {groups.map((g) => (
          <section key={g.label}>
            <h2 className="mb-2 text-xs uppercase tracking-[0.28em] text-taupe">{g.label}</h2>
            <ul className="flex flex-col divide-y divide-taupe/15">
              {g.items.map((n) => {
                const cfg = NOTIFICATION_TYPES[n.type];
                return (
                  <li key={n.id}>
                    {/* A plain anchor, not next/link's <Link>: this target is a Route
                        Handler whose job is to redirect, and a full navigation keeps
                        the back button predictable. */}
                    <a
                      href={`/api/notifications/${n.id}/open`}
                      className="-mx-3 flex min-h-[64px] items-start gap-3 rounded-md px-3 py-4 transition-colors duration-300 hover:bg-ink/[0.03]"
                    >
                      <span className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-foil/10 text-foil">
                        <NotificationGlyph icon={cfg?.icon ?? "alert"} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs text-taupe">
                          {cfg?.title ?? "Notification"} · {timeOf(n.createdAt)}
                        </span>
                        <span className={`mt-0.5 block text-sm ${n.readAt ? "text-taupe" : "text-ink"}`}>{n.message}</span>
                      </span>
                      {!n.readAt && <span className="mt-2 h-2 w-2 flex-shrink-0 animate-scale-in rounded-full bg-clay" aria-label="Unread" />}
                    </a>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      <BackLink href="/home" />
    </div>
  );
}
