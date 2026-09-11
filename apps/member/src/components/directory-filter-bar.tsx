"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

// Same instant-navigation pattern used on Admin > Events — every control
// writes straight to the query string, no separate Apply click.
export function DirectoryFilterBar({
  q,
  sector,
  eventId,
  sectorOptions,
  eventOptions,
  hasActiveFilter,
}: {
  q: string;
  sector: string;
  eventId: string;
  sectorOptions: string[];
  eventOptions: { id: string; title: string }[];
  hasActiveFilter: boolean;
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

  return (
    <div className="mb-6 flex items-center gap-3 border-b border-grey/30 pb-2">
      <input
        type="text"
        defaultValue={q}
        onChange={(e) => navigate({ q: e.target.value })}
        placeholder="Search by name"
        className="flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-grey/70"
      />
      <details className="relative flex-shrink-0">
        <summary
          aria-label="Filter"
          className="flex cursor-pointer list-none items-center text-grey transition hover:text-ink [&::-webkit-details-marker]:hidden"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 2.5h14M4 8h8M6.5 13.5h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
        </summary>
        <div className="absolute right-0 top-full z-10 mt-3 w-56 rounded-md border border-grey/20 bg-paper p-3 shadow-md">
          <label className="mb-1 block text-xs uppercase tracking-wide text-grey">Sector</label>
          <select
            value={sector}
            onChange={(e) => navigate({ sector: e.target.value })}
            className="mb-3 w-full rounded-md border border-grey/30 bg-paper px-2 py-1.5 text-sm text-ink"
          >
            <option value="">All sectors</option>
            {sectorOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <label className="mb-1 block text-xs uppercase tracking-wide text-grey">Event attended</label>
          <select
            value={eventId}
            onChange={(e) => navigate({ eventId: e.target.value })}
            className="mb-3 w-full rounded-md border border-grey/30 bg-paper px-2 py-1.5 text-sm text-ink"
          >
            <option value="">All events</option>
            {eventOptions.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title}
              </option>
            ))}
          </select>
          <label className="mb-1 block text-xs uppercase tracking-wide text-grey">Archetype</label>
          <select
            disabled
            className="w-full cursor-not-allowed rounded-md border border-grey/20 bg-grey/5 px-2 py-1.5 text-sm text-grey"
          >
            <option>Archetype (coming soon)</option>
          </select>
        </div>
      </details>
      {hasActiveFilter && (
        <button
          type="button"
          onClick={() => navigate({ q: "", sector: "", eventId: "" })}
          className="flex-shrink-0 text-xs text-grey underline hover:text-ink"
        >
          Clear
        </button>
      )}
    </div>
  );
}
