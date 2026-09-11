import { notFound, redirect } from "next/navigation";
import { prisma } from "@prequate/db";
import { getCurrentUser } from "@/lib/session";
import { formatDateOnly } from "@/lib/format";
import { BackLink } from "@/components/back-link";
import { toggleBookmark } from "@/lib/actions/insight";

function estimateReadTime(html: string): number {
  const words = html.replace(/<[^>]+>/g, " ").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export default async function InsightDetailPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const post = await prisma.insightPost.findFirst({
    where: { id: params.id, status: "PUBLISHED" },
    include: { author: true },
  });
  if (!post) notFound();

  const bookmark = await prisma.insightBookmark.findUnique({
    where: { memberId_postId: { memberId: user.id, postId: post.id } },
  });

  // Counts once per member per post — a no-op update if this member has
  // already opened it before, so re-reading never inflates the count.
  await prisma.insightView.upsert({
    where: { memberId_postId: { memberId: user.id, postId: post.id } },
    create: { memberId: user.id, postId: post.id },
    update: {},
  });

  const readMinutes = estimateReadTime(post.body);
  const tags: string[] = post.tags ? JSON.parse(post.tags) : [];

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-3 flex items-start justify-between gap-4">
        <h1 className="font-display text-5xl italic leading-[1.05] text-ink sm:text-6xl">{post.title}</h1>
        <form action={toggleBookmark} className="mt-2 flex-shrink-0">
          <input type="hidden" name="postId" value={post.id} />
          <button
            type="submit"
            aria-label={bookmark ? "Remove bookmark" : "Bookmark this post"}
            className={`transition ${bookmark ? "text-deep-orange hover:text-ink" : "text-grey hover:text-ink"}`}
          >
            <svg width="24" height="24" viewBox="0 0 24 24">
              {bookmark ? (
                <path fill="currentColor" d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z" />
              ) : (
                <path
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"
                />
              )}
            </svg>
          </button>
        </form>
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
            {formatDateOnly(post.createdAt)} · {readMinutes} min read
          </p>
        </div>
      </div>

      {tags.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {tags.map((tag) => (
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

      <div
        className="prose-post text-lg leading-loose"
        dangerouslySetInnerHTML={{ __html: post.body }}
      />

      <BackLink href="/insight" />
    </div>
  );
}
