import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@prequate/db";
import { getCurrentAdmin, isFullAdmin, canWrite } from "@/lib/session";
import { updateInsightPost, approveInsightPost, rejectInsightPost } from "@/lib/actions/insight";
import { INSIGHT_STATUS_LABELS, type InsightPostStatus } from "@prequate/core";
import { formatDateOnly } from "@/lib/format";
import { BackLink } from "@/components/back-link";
import { RichTextEditor } from "@/components/rich-text-editor";

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
    include: { author: true },
  });
  if (!post) notFound();

  const fullAdmin = isFullAdmin(admin.role);
  const canEdit = canWrite(admin.role) && (post.authorId === admin.id || fullAdmin);
  const editing = canEdit && searchParams.edit === "1";
  const status = post.status as InsightPostStatus;
  const canReview = fullAdmin && canWrite(admin.role) && status === "IN_REVIEW";
  const rejecting = canReview && searchParams.reject === "1";

  return (
    <div className="max-w-2xl">
      {searchParams.saved && !editing && (
        <p className="mb-6 rounded-md bg-orange/10 px-3 py-2 text-sm text-ink">Saved.</p>
      )}

      <div className="mb-1 flex items-start justify-between gap-4">
        <p className="text-sm text-grey">
          {post.author.name} · {formatDateOnly(post.createdAt)}
          {status !== "PUBLISHED" && (
            <span className="ml-2 text-deep-orange">{INSIGHT_STATUS_LABELS[status] ?? status}</span>
          )}
        </p>
        {canEdit && !editing && (
          <Link
            href={`/insight/${post.id}?edit=1`}
            className="flex-shrink-0 rounded-md border border-grey/30 px-4 py-2 text-sm font-medium text-ink transition hover:border-grey/60"
          >
            Edit
          </Link>
        )}
      </div>

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
          <h1 className="mb-1 font-display text-4xl italic leading-tight text-ink sm:text-5xl">{post.title}</h1>
          {post.subheading && <p className="mb-6 text-sm text-grey">{post.subheading}</p>}
          {post.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.imageUrl}
              alt=""
              className="mb-6 w-full rounded-md object-cover"
            />
          )}
          {post.tags && (
            <div className="mb-6 flex flex-wrap gap-2">
              {(JSON.parse(post.tags) as string[]).map((tag) => (
                <span key={tag} className="rounded-full bg-orange/10 px-2.5 py-1 text-xs text-deep-orange">
                  {tag}
                </span>
              ))}
            </div>
          )}
          <div className="prose-editor text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: post.body }} />
        </>
      )}

      {editing && (
        <form action={updateInsightPost} className="mt-6 flex flex-col gap-4">
          <input type="hidden" name="id" value={post.id} />

          <label className="flex flex-col gap-1.5 text-sm">
            Title
            <input
              type="text"
              name="title"
              defaultValue={post.title}
              className="rounded-md border border-grey/30 bg-paper px-3 py-2 text-ink"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            Subheading
            <input
              type="text"
              name="subheading"
              defaultValue={post.subheading ?? ""}
              placeholder="One line, under the title."
              className="rounded-md border border-grey/30 bg-paper px-3 py-2 text-ink"
            />
          </label>

          {post.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.imageUrl} alt="" className="w-full rounded-md object-cover" />
          )}
          <label className="flex flex-col gap-1.5 text-sm">
            {post.imageUrl ? "Replace image" : "Add an image"}
            <input type="file" name="image" accept="image/*" className="text-sm" />
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            Tags
            <input
              type="text"
              name="tags"
              defaultValue={post.tags ? (JSON.parse(post.tags) as string[]).join(", ") : ""}
              placeholder="Comma-separated, e.g. Fundraising, Hiring"
              className="rounded-md border border-grey/30 bg-paper px-3 py-2 text-ink"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            Body
            <RichTextEditor name="body" initialContent={post.body} />
          </label>

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
