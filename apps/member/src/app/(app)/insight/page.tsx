import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@prequate/db";
import { getCurrentUser } from "@/lib/session";
import { formatDateOnly } from "@/lib/format";
import { PageHero } from "@/components/page-hero";

export default async function InsightPage({
  searchParams,
}: {
  searchParams: { q?: string; filter?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const q = (searchParams.q ?? "").trim();
  const bookmarkedOnly = searchParams.filter === "bookmarked";

  const bookmarks = await prisma.insightBookmark.findMany({
    where: { memberId: user.id },
    select: { postId: true },
  });
  const bookmarkedIds = new Set(bookmarks.map((b) => b.postId));

  const posts = await prisma.insightPost.findMany({
    where: { status: "PUBLISHED" },
    include: { author: true },
    orderBy: { publishedAt: "desc" },
  });

  const filtered = posts.filter((post) => {
    if (bookmarkedOnly && !bookmarkedIds.has(post.id)) return false;
    if (!q) return true;
    const tags: string[] = post.tags ? JSON.parse(post.tags) : [];
    const haystack = `${post.title} ${post.subheading ?? ""} ${tags.join(" ")}`.toLowerCase();
    return haystack.includes(q.toLowerCase());
  });

  return (
    <div className="max-w-2xl">
      <PageHero
        eyebrow={`${posts.length} note${posts.length === 1 ? "" : "s"} from the room`}
        title="The"
        accent="Insight."
        subtitle="Partner notes and sector observations."
      />

      <form className="mb-4 flex gap-2" action="/insight">
        {bookmarkedOnly && <input type="hidden" name="filter" value="bookmarked" />}
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Search by title or tag"
          className="w-full rounded-md border border-grey/30 bg-paper px-3 py-2 text-sm text-ink"
        />
        <button
          type="submit"
          className="flex-shrink-0 rounded-md border border-grey/30 px-4 py-2 text-sm font-medium text-ink transition hover:border-grey/60"
        >
          Search
        </button>
      </form>

      <div className="mb-8 flex gap-4 text-sm">
        <Link
          href={q ? `/insight?q=${encodeURIComponent(q)}` : "/insight"}
          className={!bookmarkedOnly ? "font-medium text-ink" : "text-grey hover:text-ink"}
        >
          All
        </Link>
        <Link
          href={q ? `/insight?filter=bookmarked&q=${encodeURIComponent(q)}` : "/insight?filter=bookmarked"}
          className={bookmarkedOnly ? "font-medium text-ink" : "text-grey hover:text-ink"}
        >
          Bookmarked
        </Link>
      </div>

      <ul className="flex flex-col divide-y divide-grey/15">
        {filtered.map((post) => {
          const tags: string[] = post.tags ? JSON.parse(post.tags) : [];
          return (
            <li key={post.id} className="py-5">
              <Link href={`/insight/${post.id}`} className="block">
                <p className="font-display text-2xl italic leading-tight text-ink">{post.title}</p>
                {post.subheading && <p className="mt-1 text-sm text-grey">{post.subheading}</p>}
                <p className="text-xs text-grey">
                  {post.author.name} · {formatDateOnly(post.createdAt)}
                </p>
                {tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-orange/10 px-2.5 py-1 text-xs text-deep-orange"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </Link>
            </li>
          );
        })}
        {filtered.length === 0 && (
          <p className="py-4 text-sm text-grey">
            {bookmarkedOnly ? "No bookmarked posts yet." : "Nothing here yet."}
          </p>
        )}
      </ul>
    </div>
  );
}
