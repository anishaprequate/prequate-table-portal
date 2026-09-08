import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@prequate/db";
import { getCurrentAdmin, isFullAdmin, canWrite } from "@/lib/session";
import { setCategorySla } from "@/lib/actions/concierge";
import { BackLink } from "@/components/back-link";
import { PageHero } from "@/components/page-hero";

export default async function ConciergeCategoriesPage({
  searchParams,
}: {
  searchParams: { saved?: string; edit?: string };
}) {
  const admin = await getCurrentAdmin();
  if (!admin || !isFullAdmin(admin.role) || !canWrite(admin.role)) redirect("/bookings");
  const editing = searchParams.edit === "1";

  const categories = await prisma.conciergeCategory.findMany({
    orderBy: [{ group: "asc" }, { sortOrder: "asc" }],
  });

  return (
    <div className="max-w-md">
      <div className="flex items-start justify-between gap-6">
        <PageHero
          title="Concierge"
          accent="SLA settings"
          subtitle="Target turnaround, in days, for each category. Leave blank for no SLA."
        />
        {!editing && (
          <Link
            href="/concierge/categories?edit=1"
            className="mt-2 flex-shrink-0 rounded-md border border-grey/30 px-4 py-2 text-sm font-medium text-ink transition hover:border-grey/60"
          >
            Edit
          </Link>
        )}
      </div>

      {searchParams.saved && !editing && (
        <p className="mb-6 rounded-md bg-orange/10 px-3 py-2 text-sm text-ink">Saved.</p>
      )}

      {editing ? (
        <form action={setCategorySla} className="flex flex-col gap-4">
          {categories.map((category) => (
            <label key={category.id} className="flex items-center justify-between gap-4 text-sm">
              <span>
                {category.category}
                <span className="ml-2 text-xs text-grey">{category.group}</span>
              </span>
              <input
                type="number"
                name={`slaDays.${category.id}`}
                defaultValue={category.slaDays ?? ""}
                min={0}
                placeholder="days"
                className="w-24 rounded-md border border-grey/30 bg-paper px-3 py-2 text-ink"
              />
            </label>
          ))}
          <div className="mt-4 flex gap-3">
            <button
              type="submit"
              className="w-fit rounded-md bg-ink px-5 py-3 text-sm font-medium text-paper transition hover:bg-ink/90"
            >
              Save
            </button>
            <Link
              href="/concierge/categories"
              className="flex w-fit items-center rounded-md border border-grey/30 px-5 py-3 text-sm font-medium text-ink transition hover:border-grey/60"
            >
              Cancel
            </Link>
          </div>
        </form>
      ) : (
        <ul className="flex flex-col gap-4">
          {categories.map((category) => (
            <li key={category.id} className="flex items-center justify-between gap-4 text-sm">
              <span>
                {category.category}
                <span className="ml-2 text-xs text-grey">{category.group}</span>
              </span>
              <span className="text-grey">
                {category.slaDays != null ? `${category.slaDays} day${category.slaDays === 1 ? "" : "s"}` : "No SLA"}
              </span>
            </li>
          ))}
        </ul>
      )}

      <BackLink href="/concierge" />
    </div>
  );
}
