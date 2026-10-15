import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { formatSlot } from "@/lib/format";
import type { GettingReady } from "@/lib/home";

const label = "text-xs uppercase tracking-[0.28em] text-taupe";

// For the 24 hours before an Hour.
export function GettingReadyCard({ data }: { data: GettingReady }) {
  return (
    <section className="card mt-6 p-5 sm:p-6" aria-labelledby="getting-ready">
      <h2 id="getting-ready" className="mb-4 font-display text-3xl font-semibold text-ink">
        Getting ready for your Hour
      </h2>
      <div className="flex items-center gap-4">
        <Avatar name={data.partnerName} photoUrl={data.partnerPhotoUrl} size="lg" />
        <div>
          <p className="font-display text-xl italic leading-tight text-ink">{data.partnerName}</p>
          <p className="text-sm text-taupe">{formatSlot(data.startTime)}</p>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-4">
        <div>
          <p className={label}>Your note</p>
          <p className="mt-1 text-sm text-ink">{data.note ?? "You have not left a note. Add one so the hour starts well."}</p>
        </div>
        {data.lastNotes && (
          <div>
            <p className={label}>From your last Hour</p>
            <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-ink">{data.lastNotes}</p>
          </div>
        )}
      </div>

      <Link href={`/the-hour/${data.bookingId}`} className="btn-secondary tap mt-5 w-full !py-2.5">
        Open the booking
      </Link>
    </section>
  );
}
