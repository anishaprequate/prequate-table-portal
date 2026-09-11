import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@prequate/db";
import { getCurrentAdmin, isFullAdmin, canWrite } from "@/lib/session";
import { updateInsightPost, approveInsightPost, rejectInsightPost } from "@/lib/actions/insight";
import { INSIGHT_STATUS_LABELS, type InsightPostStatus } from "@prequate/core";
import { formatDateOnly } from "@/lib/format";
import { BackLink } from "@/components/back-link";
import { InsightFormFields } from "@/components/insight-form-fields";

export default async function InsightDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { saved?: string; edit?: string; reject?: string };
}) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/login");

  const post = await prisma.insightPost.findUnique({
    where: { id: params.id },
    include: { author: true, _count: { select: { views: true } } },
  });
  if (!post) notFound();

  const fullAdmin = isFullAdmin(admin.role);
  const canEdit = canWrite(admin.role) && (post.authorId === admin.id || fullAdmin);
  const editing = canEdit && searchParams.edit === "1";
  const status = post.status as InsightPostStatus;
  const canReview = fullAdmin && canWrite(admin.role) && status === "IN_REVIEW";
  const rejecting = canReview && searchParams.reject === "1";

  return (
    <div className="mx-auto max-w-2xl">
      {searchParams.saved && !editing && (
        <p className="mb-6 rounded-md bg-orange/10 px-3 py-2 text-sm text-ink">Saved.</p>
      )}

      {status !== "PUBLISHED" && !editing && (
        <p className="mb-4 text-sm text-deep-orange">{INSIGHT_STATUS_LABELS[status] ?? status}</p>
      )}

      {status === "REJECTED" && post.reviewNote && (
        <p className="mb-6 rounded-md bg-orange/10 px-3 py-2 text-sm text-ink">
          Sent back: {post.reviewNote}
        </p>
      )}

      {canReview && !editing && !rejecting && (
        <div className="mb-6 flex gap-3">
          <form action={approveInsightPost}>
            <input type="hidden" name="id" value={post.id} />
            <button
              type="submit"
              className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper transition hover:bg-ink/90"
            >
              Approve
            </button>
          </form>
          <Link
            href={`/insight/${post.id}?reject=1`}
            className="flex items-center rounded-md border border-grey/30 px-4 py-2 text-sm font-medium text-ink transition hover:border-grey/60"
          >
            Send back
          </Link>
        </div>
      )}

      {rejecting && (
        <form action={rejectInsightPost} className="mb-6 flex flex-col gap-3">
          <input type="hidden" name="id" value={post.id} />
          <label className="flex flex-col gap-1.5 text-sm">
            What needs to change before this can publish
            <textarea
              name="reviewNote"
              rows={3}
              className="rounded-md border border-grey/30 bg-paper px-3 py-2 text-ink"
            />
          </label>
          <div className="flex gap-3">
            <button
              type="submit"
              className="w-fit rounded-md bg-ink px-5 py-3 text-sm font-medium text-paper transition hover:bg-ink/90"
            >
              Send back
            </button>
            <Link
              href={`/insight/${post.id}`}
              className="flex w-fit items-center rounded-md border border-grey/30 px-5 py-3 text-sm font-medium text-ink transition hover:border-grey/60"
            >
              Cancel
            </Link>
          </div>
        </form>
      )}

      {!editing && (
        <>
          <div className="mb-3 flex items-start justify-between gap-4">
            <h1 className="font-display text-5xl italic leading-[1.05] text-ink sm:text-6xl">{post.title}</h1>
            {canEdit && (
              <Link
                href={`/insight/${post.id}?edit=1`}
                className="mt-2 flex-shrink-0 rounded-md border border-grey/30 px-4 py-2 text-sm font-medium text-ink transition hover:border-grey/60"
              >
                Edit
              </Link>
            )}
          </div>
          {post.subheading && <p className="mb-6 text-xl leading-snug text-grey">{post.subheading}</p>}

          <div className="mb-8 flex items-center gap-3">
            {post.author.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={post.author.photoUrl}
                alt=""
                className="h-10 w-10 rounded-full object-cover"
                draggable={false}
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange/10 font-display text-sm text-ink">
                {post.author.name.charAt(0)}
              </div>
            )}
            <div className="text-sm">
              <p className="font-medium text-ink">{post.author.name}</p>
              <p className="text-grey">
                {formatDateOnly(post.createdAt)} · {post._count.views} view
                {post._count.views === 1 ? "" : "s"}
              </p>
            </div>
          </div>

          {post.tags && (
            <div className="mb-6 flex flex-wrap gap-2">
              {(JSON.parse(post.tags) as string[]).map((tag) => (
                <span key={tag} className="rounded-full bg-orange/10 px-2.5 py-1 text-xs text-deep-orange">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {post.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.imageUrl}
              alt=""
              className="mb-10 h-[280px] w-full rounded-md object-cover md:h-[420px]"
              draggable={false}
            />
          )}

          <div className="prose-post text-lg leading-loose" dangerouslySetInnerHTML={{ __html: post.body }} />
        </>
      )}

      {editing && (
        <form action={updateInsightPost} className="mt-6 flex flex-col gap-4">
          <input type="hidden" name="id" value={post.id} />

          <InsightFormFields
            authorName={post.author.name}
            defaultTitle={post.title}
            defaultSubheading={post.subheading ?? ""}
            defaultTags={post.tags ? (JSON.parse(post.tags) as string[]).join(", ") : ""}
            defaultImageUrl={post.imageUrl}
            initialBody={post.body}
          />

          <div className="flex gap-3">
            <button
              type="submit"
              className="w-fit rounded-md bg-ink px-5 py-3 text-sm font-medium text-paper transition hover:bg-ink/90"
            >
              Save
            </button>
            <Link
              href={`/insight/${post.id}`}
              className="flex w-fit items-center rounded-md border border-grey/30 px-5 py-3 text-sm font-medium text-ink transition hover:border-grey/60"
            >
              Cancel
            </Link>
          </div>
        </form>
      )}

      <BackLink href="/insight" />
    </div>
  );
}
