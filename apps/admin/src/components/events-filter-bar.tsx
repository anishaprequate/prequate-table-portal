"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

const TIER_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "All tiers" },
  { value: "DINNER", label: "Dinner" },
  { value: "QUARTERLY", label: "Quarterly" },
  { value: "ANNUAL", label: "Annual Gathering" },
];

// Filters navigate instantly on change — no separate Apply click.
// Live/Draft/Archive used to be tabs on this same bar; they're now real
// routes (see EventsSectionNav), so this only handles tier/date/sort.
export function EventsFilterBar({
  tier,
  from,
  to,
  sort,
}: {
  tier: string;
  from: string;
  to: string;
  sort: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function navigate(overrides: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(overrides)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  const hasFilter = Boolean(tier || from || to || sort !== "date-desc");

  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-end gap-3 text-sm">
        <label className="flex flex-col gap-1 text-xs text-grey">
          Tier
          <select
            value={tier}
            onChange={(e) => navigate({ tier: e.target.value })}
            className="rounded-md border border-grey/30 bg-paper px-2 py-1.5 text-sm text-ink"
          >
            {TIER_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-grey">
          From
          <input
            type="date"
            value={from}
            onChange={(e) => navigate({ from: e.target.value })}
            className="rounded-md border border-grey/30 bg-paper px-2 py-1.5 text-sm text-ink"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-grey">
          To
          <input
            type="date"
            value={to}
            onChange={(e) => navigate({ to: e.target.value })}
            className="rounded-md border border-grey/30 bg-paper px-2 py-1.5 text-sm text-ink"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-grey">
          Sort
          <select
            value={sort}
            onChange={(e) => navigate({ sort: e.target.value })}
            className="rounded-md border border-grey/30 bg-paper px-2 py-1.5 text-sm text-ink"
          >
            <option value="date-desc">Date, newest first</option>
            <option value="date-asc">Date, soonest first</option>
            <option value="rsvp-desc">RSVP count, most first</option>
          </select>
        </label>
        {hasFilter && (
          <button
            type="button"
            onClick={() => navigate({ tier: "", from: "", to: "", sort: "" })}
            className="text-xs text-grey underline hover:text-ink"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
