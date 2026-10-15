import { formatDateOnly } from "@/lib/format";
import type { SeatStats } from "@/lib/home";
import { TableLine } from "./table-line";

const label = "text-[11px] uppercase tracking-[0.2em] text-taupe";

// The member's standing at the table. Always shown, so Home is never blank.
export function YourSeatCard({ stats }: { stats: SeatStats }) {
  return (
    <section className="card mt-6 p-5 sm:p-6" aria-labelledby="your-seat">
      <h2 id="your-seat" className="mb-5 font-display text-3xl font-semibold text-ink">
        Your seat
      </h2>
      <dl className="mb-5 grid grid-cols-3 gap-3">
        <div>
          <dt className={label}>Seated</dt>
          <dd className="mt-1 font-display text-lg leading-tight text-ink">
            {stats.seatedOn ? formatDateOnly(stats.seatedOn) : "Soon"}
          </dd>
        </div>
        <div>
          <dt className={label}>Hours held</dt>
          <dd className="mt-1 font-display text-lg leading-tight text-ink">{stats.hoursHeld}</dd>
        </div>
        <div>
          <dt className={label}>Events</dt>
          <dd className="mt-1 font-display text-lg leading-tight text-ink">{stats.eventsAttended}</dd>
        </div>
      </dl>
      <TableLine initial={stats.tableLine} />
    </section>
  );
}
