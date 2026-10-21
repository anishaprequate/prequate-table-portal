import Link from "next/link";

// Headline stat tiles + a segmented capacity bar, shared by Overview,
// Guests, and Insights so the same numbers read identically everywhere.
// Each tile opens the screen where you act on it: Going opens the guest list,
// Checked in opens check-in, Pending opens the approvals, Waitlist the waitlist.
export function EventStatsBar({
  eventId,
  capacity,
  takenSpots,
  joinedCount,
  waitlistCount,
  pendingCount,
  checkedInCount,
}: {
  eventId: string;
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

  const tile = "block min-h-[64px] rounded-md border border-grey/15 p-3 transition hover:border-grey/40 hover:bg-ink/[0.02]";

  return (
    <div className="mb-6">
      <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Link href={`/events/${eventId}/guests`} className={tile}>
          <p className="font-display text-2xl text-ink">{joinedCount}</p>
          <p className="text-xs uppercase tracking-wide text-grey">Going</p>
        </Link>
        <Link href={`/events/${eventId}/checkin`} className={tile}>
          <p className="font-display text-2xl text-ink">{checkedInCount}</p>
          <p className="text-xs uppercase tracking-wide text-grey">Checked in</p>
        </Link>
        {pendingCount > 0 && (
          <Link href={`/events/${eventId}/registration#pending`} className={`${tile} border-orange/40`}>
            <p className="font-display text-2xl text-ink">{pendingCount}</p>
            <p className="text-xs uppercase tracking-wide text-deep-orange">Pending, review</p>
          </Link>
        )}
        {waitlistCount > 0 && (
          <Link href={`/events/${eventId}/registration#waitlist`} className={tile}>
            <p className="font-display text-2xl text-ink">{waitlistCount}</p>
            <p className="text-xs uppercase tracking-wide text-grey">Waitlist</p>
          </Link>
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
