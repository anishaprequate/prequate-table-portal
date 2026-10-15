import Link from "next/link";
import type { OnTheDay } from "@/lib/home";

const label = "text-xs uppercase tracking-[0.28em] text-taupe";
const time = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" });

// On the day of an event the member is going to.
export function OnTheDayCard({ data }: { data: OnTheDay }) {
  const rows: { name: string; value: React.ReactNode }[] = [
    { name: "Timing", value: `${time.format(data.startTime)} to ${time.format(data.endTime)}` },
    ...(data.venue
      ? [
          {
            name: "Venue",
            value: (
              <>
                {data.venue}
                {data.mapUrl && (
                  <>
                    {" "}
                    <a
                      href={data.mapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-[44px] items-center text-clay underline decoration-clay/40 underline-offset-2"
                    >
                      Open the map
                    </a>
                  </>
                )}
              </>
            ),
          },
        ]
      : []),
    ...(data.host ? [{ name: "Host", value: data.host }] : []),
    ...(data.dress ? [{ name: "Dress", value: data.dress }] : []),
    ...(data.arrival ? [{ name: "On arrival", value: data.arrival }] : []),
  ];

  return (
    <section className="card mt-6 p-5 sm:p-6" aria-labelledby="on-the-day">
      <h2 id="on-the-day" className="mb-1 font-display text-3xl font-semibold text-ink">
        On the day
      </h2>
      <p className="mb-4 text-sm text-taupe">{data.title}</p>
      <dl className="flex flex-col gap-3">
        {rows.map((r) => (
          <div key={r.name}>
            <dt className={label}>{r.name}</dt>
            <dd className="mt-0.5 text-sm text-ink">{r.value}</dd>
          </div>
        ))}
      </dl>
      <Link href={`/events/${data.eventId}`} className="btn-ghost tap mt-3 !px-0">
        Event details
      </Link>
    </section>
  );
}
