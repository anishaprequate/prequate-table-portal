// Headline stat tiles + a segmented capacity bar, shared by Overview,
// Guests, and Insights so the same numbers read identically everywhere.
// Plain server-rendered divs — no chart library needed for a flat bar.
export function EventStatsBar({
  capacity,
  takenSpots,
  joinedCount,
  waitlistCount,
  pendingCount,
  checkedInCount,
}: {
  capacity: number | null;
  takenSpots: number;
  joinedCount: number;
  waitlistCount: number;
  pendingCount: number;
  checkedInCount: number;
}) {
  const notCheckedIn = Math.max(joinedCount - checkedInCount, 0);
  const checkedInPct = capacity ? (checkedInCount / capacity) * 100 : (checkedInCount / Math.max(joinedCount, 1)) * 100;
  const joinedPct = capacity ? (notCheckedIn / capacity) * 100 : (notCheckedIn / Math.max(joinedCount, 1)) * 100;

  return (
    <div className="mb-6">
      <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-md border border-grey/15 p-3">
          <p className="font-display text-2xl text-ink">{joinedCount}</p>
          <p className="text-xs uppercase tracking-wide text-grey">Going</p>
        </div>
        <div className="rounded-md border border-grey/15 p-3">
          <p className="font-display text-2xl text-ink">{checkedInCount}</p>
          <p className="text-xs uppercase tracking-wide text-grey">Checked in</p>
        </div>
        {pendingCount > 0 && (
          <div className="rounded-md border border-grey/15 p-3">
            <p className="font-display text-2xl text-ink">{pendingCount}</p>
            <p className="text-xs uppercase tracking-wide text-grey">Pending</p>
          </div>
        )}
        {waitlistCount > 0 && (
          <div className="rounded-md border border-grey/15 p-3">
            <p className="font-display text-2xl text-ink">{waitlistCount}</p>
            <p className="text-xs uppercase tracking-wide text-grey">Waitlist</p>
          </div>
        )}
      </div>

      <div className="flex h-2 overflow-hidden rounded-full bg-grey/10">
        <div className="h-full bg-deep-orange" style={{ width: `${Math.min(checkedInPct, 100)}%` }} />
        <div className="h-full bg-orange" style={{ width: `${Math.min(joinedPct, 100)}%` }} />
      </div>
      <p className="mt-1.5 text-xs text-grey">
        {capacity != null ? `${takenSpots} of ${capacity} spots taken` : "Uncapped"}
      </p>
    </div>
  );
}
