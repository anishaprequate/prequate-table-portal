import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@prequate/db";
import { getCurrentUser } from "@/lib/session";
import { submitConciergeRequest } from "@/lib/actions/concierge";
import { CONCIERGE_STATUS_LABELS, type ConciergeStatus } from "@prequate/core";
import { formatDateOnly } from "@/lib/format";
import { PageHero } from "@/components/page-hero";

export default async function ConciergePage({
  searchParams,
}: {
  searchParams: { tab?: string; submitted?: string; error?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const tab = searchParams.tab === "new" ? "new" : "requests";

  const [categories, requests] = await Promise.all([
    prisma.conciergeCategory.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.conciergeRequest.findMany({
      where: { memberId: user.id },
      include: { category: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const groups = Array.from(new Set(categories.map((c) => c.group)));

  return (
    <div className="max-w-2xl">
      <div className="mb-8 flex items-start justify-between gap-6">
        <PageHero title="Concierge" subtitle="Anything you need, handled." />
        <p className="flex-shrink-0 text-sm text-grey">{user.points} points</p>
      </div>

      <div className="mb-8 flex gap-6 border-b border-grey/15">
        <Link
          href="/concierge?tab=requests"
          className={`pb-3 text-sm font-medium transition ${
            tab === "requests" ? "border-b-2 border-orange text-ink" : "text-grey hover:text-ink"
          }`}
        >
          Your Requests
        </Link>
        <Link
          href="/concierge?tab=new"
          className={`pb-3 text-sm font-medium transition ${
            tab === "new" ? "border-b-2 border-orange text-ink" : "text-grey hover:text-ink"
          }`}
        >
          New Request
        </Link>
      </div>

      {searchParams.submitted && (
        <p className="mb-6 rounded-md bg-orange/10 px-3 py-2 text-sm text-ink">
          Sent. We'll route it and keep you posted.
        </p>
      )}
      {searchParams.error === "incomplete" && (
        <p className="mb-6 text-sm text-deep-orange">
          Choose a category, or describe what you need under "Something else."
        </p>
      )}

      {tab === "requests" ? (
        <div>
          {requests.length === 0 && (
            <div>
              <p className="mb-4 text-sm text-grey">Nothing sent yet.</p>
              <Link
                href="/concierge?tab=new"
                className="inline-block w-fit rounded-md bg-ink px-5 py-3 text-sm font-medium text-paper transition hover:bg-ink/90"
              >
                Send a request
              </Link>
            </div>
          )}
          <ul className="flex flex-col divide-y divide-grey/15">
            {requests.map((request) => {
              const chosen = request.selectedExamples
                ? (JSON.parse(request.selectedExamples) as string[])
                : [];
              return (
                <li key={request.id} className="py-4">
                  <Link href={`/concierge/${request.id}`} className="block">
                    <p className="font-display text-xl italic leading-tight text-ink">
                      {request.category?.category ?? request.customText}
                    </p>
                    {chosen.length > 0 && (
                      <p className="text-xs text-grey">{chosen.join(", ")}</p>
                    )}
                    {request.detail && (
                      <p className="mt-1 text-xs text-grey">{request.detail}</p>
                    )}
                    <p className="text-sm text-grey">
                      {formatDateOnly(request.createdAt)} ·{" "}
                      {CONCIERGE_STATUS_LABELS[request.status as ConciergeStatus] ?? request.status}
                      {request.dueAt &&
                        request.status !== "FULFILLED" &&
                        ` · expected by ${formatDateOnly(request.dueAt)}`}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <form action={submitConciergeRequest} className="flex flex-col gap-6">
          {groups.map((group) => (
            <div key={group}>
              <p className="mb-2 text-xs uppercase tracking-wide text-grey">{group}</p>
              <div className="flex flex-col gap-2">
                {categories
                  .filter((c) => c.group === group)
                  .map((category) => {
                    const examples = JSON.parse(category.examples) as string[];
                    return (
                      <div
                        key={category.id}
                        className="group rounded-md border border-grey/30 has-[:checked]:border-orange has-[:checked]:bg-orange/10"
                      >
                        <label className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm">
                          <input type="checkbox" name="categoryId" value={category.id} />
                          {category.category}
                        </label>
                        <div className="hidden flex-col gap-1.5 border-t border-grey/15 px-3 py-2 pl-8 group-has-[:checked]:flex">
                          <p className="text-xs text-grey">Which of these, specifically?</p>
                          {examples.map((example) => (
                            <label key={example} className="flex items-center gap-2 text-xs">
                              <input
                                type="checkbox"
                                name={`subitems.${category.id}`}
                                value={example}
                              />
                              {example}
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          ))}

          <div className="group rounded-md border border-grey/30 has-[:checked]:border-orange has-[:checked]:bg-orange/10">
            <label className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm">
              <input type="checkbox" name="categoryId" value="other" />
              Something else
            </label>
            <div className="hidden flex-col gap-1.5 border-t border-grey/15 px-3 py-2 group-has-[:checked]:flex">
              <textarea
                name="customText"
                rows={2}
                placeholder="Describe what you need."
                className="w-full rounded-md border border-grey/30 bg-paper px-3 py-2 text-sm text-ink"
              />
            </div>
          </div>

          <label className="flex flex-col gap-1.5 text-sm">
            Anything specific to add
            <textarea
              name="detail"
              rows={3}
              placeholder="Dates, preferences, anything that helps."
              className="rounded-md border border-grey/30 bg-paper px-3 py-2 text-ink"
            />
          </label>

          <button
            type="submit"
            className="w-fit rounded-md bg-ink px-5 py-3 text-sm font-medium text-paper transition hover:bg-ink/90"
          >
            Send request
          </button>
        </form>
      )}
    </div>
  );
}
