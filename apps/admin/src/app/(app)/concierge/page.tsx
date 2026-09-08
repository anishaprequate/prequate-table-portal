import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@prequate/db";
import { getCurrentAdmin, canView, canWrite } from "@/lib/session";
import { CONCIERGE_STATUS_LABELS, type ConciergeStatus } from "@prequate/core";
import { formatDateOnly } from "@/lib/format";
import { PageHero } from "@/components/page-hero";

export default async function ConciergePage() {
  const admin = await getCurrentAdmin();
  if (!admin || !canView(admin.role)) redirect("/bookings");

  const requests = await prisma.conciergeRequest.findMany({
    include: { member: true, category: true },
    orderBy: { createdAt: "desc" },
  });

  const now = new Date();
  const isOpen = (status: string) => status !== "FULFILLED" && status !== "DECLINED";
  const isOverdue = (r: (typeof requests)[number]) => isOpen(r.status) && r.dueAt !== null && r.dueAt < now;

  const sorted = [...requests].sort((a, b) => {
    const rank = (r: (typeof requests)[number]) => {
      if (isOverdue(r)) return 0;
      if (isOpen(r.status) && r.dueAt) return 1;
      if (isOpen(r.status)) return 2;
      return 3;
    };
    const rankDiff = rank(a) - rank(b);
    if (rankDiff !== 0) return rankDiff;
    if (rank(a) <= 1 && a.dueAt && b.dueAt) return a.dueAt.getTime() - b.dueAt.getTime();
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  return (
    <div className="max-w-3xl">
      <div className="flex items-start justify-between gap-6">
        <PageHero title="Concierge" subtitle="Every request, and where it stands." />
        {canWrite(admin.role) && (
          <Link
            href="/concierge/categories"
            className="mt-2 flex-shrink-0 rounded-md border border-grey/30 px-4 py-2 text-sm font-medium text-ink transition hover:border-grey/60"
          >
            SLA settings
          </Link>
        )}
      </div>

      <ul className="flex flex-col divide-y divide-grey/15">
        {sorted.map((request) => {
          const overdue = isOverdue(request);
          const daysOverdue = overdue && request.dueAt
            ? Math.ceil((now.getTime() - request.dueAt.getTime()) / (24 * 60 * 60 * 1000))
            : 0;
          return (
            <li key={request.id} className="py-4">
              <Link href={`/concierge/${request.id}`} className="block">
                <p className="font-display text-2xl italic leading-tight text-ink">
                  {request.category?.category ?? request.customText}
                </p>
                <p className="text-sm text-grey">
                  {request.member.name} · {formatDateOnly(request.createdAt)} ·{" "}
                  {CONCIERGE_STATUS_LABELS[request.status as ConciergeStatus] ?? request.status}
                  {request.dueAt && isOpen(request.status) && !overdue &&
                    ` · due ${formatDateOnly(request.dueAt)}`}
                  {overdue && (
                    <span className="text-deep-orange">
                      {" "}
                      · {daysOverdue} day{daysOverdue === 1 ? "" : "s"} overdue
                    </span>
                  )}
                </p>
              </Link>
            </li>
          );
        })}
        {sorted.length === 0 && <p className="py-4 text-sm text-grey">Nothing yet.</p>}
      </ul>
    </div>
  );
}
