"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

// Scoped to just name + sector (+ the disabled archetype placeholder) —
// the person-centric fields, which is all that's meaningful on the
// Members report. Same instant-navigation pattern as the other filter bars.
export function MembersReportFilterBar({
  q,
  sector,
  sectorOptions,
}: {
  q: string;
  sector: string;
  sectorOptions: string[];
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

  const hasFilter = Boolean(q || sector);

  return (
    <div className="mb-8 flex flex-wrap items-end gap-3 text-sm">
      <label className="flex flex-col gap-1 text-xs text-grey">
        Name
        <input
          type="text"
          defaultValue={q}
          onChange={(e) => navigate({ q: e.target.value })}
          placeholder="Search by name"
          className="rounded-md border border-grey/30 bg-paper px-2 py-1.5 text-sm text-ink"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-grey">
        Sector
        <select
          value={sector}
          onChange={(e) => navigate({ sector: e.target.value })}
          className="rounded-md border border-grey/30 bg-paper px-2 py-1.5 text-sm text-ink"
        >
          <option value="">All sectors</option>
          {sectorOptions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-grey">
        Archetype
        <select
          disabled
          className="cursor-not-allowed rounded-md border border-grey/20 bg-grey/5 px-2 py-1.5 text-sm text-grey"
        >
          <option>Archetype (coming soon)</option>
        </select>
      </label>
      {hasFilter && (
        <button
          type="button"
          onClick={() => navigate({ q: "", sector: "" })}
          className="text-xs text-grey underline hover:text-ink"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
