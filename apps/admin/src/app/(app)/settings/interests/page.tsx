import { redirect } from "next/navigation";
import { prisma } from "@prequate/db";
import { getCurrentAdmin, isFullAdmin } from "@/lib/session";
import { createInterestCategory, renameInterestCategory, deleteInterestCategory } from "@/lib/actions/interests";
import { BackLink } from "@/components/back-link";
import { PageHero } from "@/components/page-hero";

export default async function InterestCategoriesPage() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/login");
  const manage = isFullAdmin(admin.role);

  const categories = await prisma.interestCategory.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { members: true } } },
  });

  return (
    <div className="max-w-md">
      <PageHero
        title="Profile"
        accent="interests"
        subtitle="The fixed list of interests members choose from on their Profile."
      />

      {!manage && <p className="mb-6 text-sm text-grey">Only the Owner or RM can edit this list.</p>}

      <ul className="mb-8 flex flex-col divide-y divide-grey/15">
        {categories.map((category) => (
          <li key={category.id} className="flex items-center justify-between gap-3 py-3">
            {manage ? (
              <form action={renameInterestCategory} className="flex flex-1 items-center gap-2">
                <input type="hidden" name="id" value={category.id} />
                <input
                  type="text"
                  name="label"
                  defaultValue={category.label}
                  className="flex-1 rounded-md border border-grey/30 bg-paper px-2 py-1.5 text-sm text-ink"
                />
                <button type="submit" className="text-xs font-medium text-ink underline">
                  Save
                </button>
              </form>
            ) : (
              <p className="text-sm text-ink">{category.label}</p>
            )}
            <p className="flex-shrink-0 text-xs text-grey">{category._count.members} member(s)</p>
            {manage && (
              <form action={deleteInterestCategory}>
                <input type="hidden" name="id" value={category.id} />
                <button type="submit" className="flex-shrink-0 text-xs text-grey underline hover:text-ink">
                  Remove
                </button>
              </form>
            )}
          </li>
        ))}
        {categories.length === 0 && <p className="py-4 text-sm text-grey">No categories yet.</p>}
      </ul>

      {manage && (
        <form action={createInterestCategory} className="mb-8 flex items-end gap-3">
          <label className="flex flex-1 flex-col gap-1.5 text-sm">
            Add a category
            <input
              type="text"
              name="label"
              required
              placeholder="e.g. Philanthropy"
              className="rounded-md border border-grey/30 bg-paper px-3 py-2 text-ink"
            />
          </label>
          <button
            type="submit"
            className="rounded-md bg-orange px-4 py-2 text-sm font-medium text-ink transition hover:bg-deep-orange hover:text-paper"
          >
            Add
          </button>
        </form>
      )}

      <BackLink href="/settings" />
    </div>
  );
}
