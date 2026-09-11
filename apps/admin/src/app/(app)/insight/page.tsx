import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@prequate/db";
import { getCurrentAdmin, isFullAdmin, canWrite } from "@/lib/session";
import { INSIGHT_STATUS_LABELS, type InsightPostStatus } from "@prequate/core";
import { formatDateOnly } from "@/lib/format";
import { PageHero } from "@/components/page-hero";

export default async function InsightPage({
  searchParams,
}: {
  searchParams: { published?: string; submitted?: string };
}) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/login");
  const fullAdmin = isFullAdmin(admin.role);

  const posts = await prisma.insightPost.findMany({
    include: { author: true, _count: { select: { views: true } } },
    orderBy: { createdAt: "desc" },
  });

  const pending = fullAdmin ? posts.filter((p) => p.status === "IN_REVIEW") : [];
  const rest = posts.filter((p) => !pending.includes(p));

  return (
    <div className="max-w-2xl">
      {searchParams.published && (
        <p className="mb-6 rounded-md bg-orange/10 px-3 py-2 text-sm text-ink">Published.</p>
      )}
      {searchParams.submitted && (
        <p className="mb-6 rounded-md bg-orange/10 px-3 py-2 text-sm text-ink">
          Sent for review. A full admin will approve or send it back.
        </p>
      )}

      <div className="flex items-start justify-between gap-6">
        <PageHero
          eyebrow={`${posts.length} post${posts.length === 1 ? "" : "s"} in this room`}
          title="Insight"
          subtitle="Notes written for this room."
        />
        {canWrite(admin.role) && (
          <Link
            href="/insight/new"
            className="mt-2 flex-shrink-0 rounded-md bg-orange px-5 py-3 text-sm font-medium text-ink transition hover:bg-deep-orange hover:text-paper"
          >
            New post
          </Link>
        )}
      </div>

      {pending.length > 0 && (
        <div className="mb-10">
          <p className="mb-2 text-xs uppercase tracking-wide text-deep-orange">
            Pending review ({pending.length})
          </p>
          <ul className="flex flex-col divide-y divide-grey/15">
            {pending.map((post) => (
              <li key={post.id} className="py-4">
                <Link href={`/insight/${post.id}`} className="block">
                  <p className="font-display text-2xl italic leading-tight text-ink">{post.title}</p>
                  {post.subheading && <p className="mt-1 text-sm text-grey">{post.subheading}</p>}
                  <p className="text-xs text-grey">
                    {post.author.name} · {formatDateOnly(post.createdAt)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ul className="flex flex-col divide-y divide-grey/15">
        {rest.map((post) => {
          const status = post.status as InsightPostStatus;
          return (
            <li key={post.id} className="py-4">
              <Link href={`/insight/${post.id}`} className="block">
                <p className="font-display text-2xl italic leading-tight text-ink">
                  {post.title}
                  {status !== "PUBLISHED" && (
                    <span className="ml-2 text-xs font-sans not-italic font-normal text-grey">
                      {INSIGHT_STATUS_LABELS[status] ?? status}
                    </span>
                  )}
                </p>
                {post.subheading && <p className="mt-1 text-sm text-grey">{post.subheading}</p>}
                <p className="text-xs text-grey">
                  {post.author.name} · {formatDateOnly(post.createdAt)} · {post._count.views} view
                  {post._count.views === 1 ? "" : "s"}
                </p>
              </Link>
            </li>
          );
        })}
        {rest.length === 0 && pending.length === 0 && (
          <p className="py-4 text-sm text-grey">Nothing published yet.</p>
        )}
      </ul>
    </div>
  );
}
