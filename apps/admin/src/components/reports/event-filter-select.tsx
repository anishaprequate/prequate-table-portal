"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

// Same instant-navigation pattern as the other filter bars — scoped down
// to just the one field that's meaningful on the Events report (an event
// isn't a person/sector concern, so this stays separate from the Members
// report's filter bar rather than one bar with unused fields on each page).
export function EventFilterSelect({
  eventId,
  eventOptions,
}: {
  eventId: string;
  eventOptions: { id: string; title: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function navigate(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("eventId", value);
    else params.delete("eventId");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="mb-6 flex items-end gap-3 text-sm">
      <label className="flex flex-col gap-1 text-xs text-grey">
        Event
        <select
          value={eventId}
          onChange={(e) => navigate(e.target.value)}
          className="rounded-md border border-grey/30 bg-paper px-2 py-1.5 text-sm text-ink"
        >
          <option value="">All events</option>
          {eventOptions.map((e) => (
            <option key={e.id} value={e.id}>
              {e.title}
            </option>
          ))}
        </select>
      </label>
      {eventId && (
        <button type="button" onClick={() => navigate("")} className="text-xs text-grey underline hover:text-ink">
          Clear
        </button>
      )}
    </div>
  );
}
