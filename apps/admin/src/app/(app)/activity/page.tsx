import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@prequate/db";
import { getCurrentAdmin } from "@/lib/session";
import { formatSlot } from "@/lib/format";
import { PageHero } from "@/components/page-hero";

const PAGE_SIZE = 50;

// Owner-only: every SYSTEM-type change across every member's timeline, in
// one place, newest first. RM and Associate don't get this view — Stage 1
// of pipeline 1 scopes it to the Owner specifically.
export default async function ActivityPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const admin = await getCurrentAdmin();
  if (!admin || admin.role !== "ADMIN_OWNER") redirect("/members");

  const page = Math.max(1, Number(searchParams.page) || 1);

  const [entries, total] = await Promise.all([
    prisma.memberTimelineEntry.findMany({
      where: { type: "SYSTEM" },
      include: { member: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.memberTimelineEntry.count({ where: { type: "SYSTEM" } }),
  ]);

  const hasNext = page * PAGE_SIZE < total;
  const hasPrev = page > 1;

  return (
    <div className="max-w-2xl">
      <PageHero eyebrow="Owner only" title="Activity" subtitle="Every system-recorded change across every member, newest first." />

      <div className="flex flex-col gap-4">
        {entries.length === 0 && <p className="text-sm text-grey">Nothing recorded yet.</p>}
        {entries.map((entry) => (
          <div key={entry.id} className="border-l-2 border-grey/20 pl-3">
            <p className="text-sm text-grey">{entry.body}</p>
            <p className="mt-1 text-xs text-grey">
              <Link href={`/members/${entry.memberId}`} className="text-deep-orange hover:underline">
                {entry.member.name}
              </Link>{" "}
              · {formatSlot(entry.createdAt)}
            </p>
          </div>
        ))}
      </div>

      {(hasPrev || hasNext) && (
        <div className="mt-8 flex gap-3">
          {hasPrev && (
            <Link
              href={`/activity?page=${page - 1}`}
              className="rounded-md border border-grey/30 px-4 py-2 text-sm font-medium text-ink transition hover:border-grey/60"
            >
              Newer
            </Link>
          )}
          {hasNext && (
            <Link
              href={`/activity?page=${page + 1}`}
              className="rounded-md border border-grey/30 px-4 py-2 text-sm font-medium text-ink transition hover:border-grey/60"
            >
              Older
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
