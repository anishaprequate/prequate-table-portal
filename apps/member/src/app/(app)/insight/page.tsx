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
          className="input-field"
        />
        <button type="submit" className="btn-secondary flex-shrink-0 !px-4 !py-2">
          Search
        </button>
      </form>

      <div className="-ml-3 mb-6 flex gap-1 text-sm">
        <Link
          href={q ? `/insight?q=${encodeURIComponent(q)}` : "/insight"}
          className={`tap flex min-h-[44px] items-center rounded-md px-3 transition-colors duration-300 ${!bookmarkedOnly ? "font-medium text-ink" : "text-taupe hover:text-ink"}`}
        >
          All
        </Link>
        <Link
          href={q ? `/insight?filter=bookmarked&q=${encodeURIComponent(q)}` : "/insight?filter=bookmarked"}
          className={`tap flex min-h-[44px] items-center rounded-md px-3 transition-colors duration-300 ${bookmarkedOnly ? "font-medium text-ink" : "text-taupe hover:text-ink"}`}
        >
          Bookmarked
        </Link>
      </div>

      <ul className="flex flex-col divide-y divide-taupe/15">
        {filtered.map((post) => {
          const tags: string[] = post.tags ? JSON.parse(post.tags) : [];
          return (
            <li key={post.id}>
              <Link
                href={`/insight/${post.id}`}
                className="-mx-3 block rounded-md px-3 py-5 transition-colors duration-300 hover:bg-ink/[0.03]"
              >
                <p className="font-display text-2xl italic leading-tight text-ink">{post.title}</p>
                {post.subheading && <p className="mt-1 text-sm text-taupe">{post.subheading}</p>}
                <p className="text-xs text-taupe">
                  {post.author.name} · {formatDateOnly(post.createdAt)}
                </p>
                {tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-foil/10 px-2.5 py-1 text-xs text-clay"
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
          <p className="py-4 text-sm text-taupe">
            {bookmarkedOnly ? "No bookmarked posts yet." : "Nothing here yet."}
          </p>
        )}
      </ul>
    </div>
  );
}
