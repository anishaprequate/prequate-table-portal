import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@prequate/db";
import { getCurrentUser } from "@/lib/session";
import { formatSlot } from "@/lib/format";
import { getOpenOffers } from "@/lib/hour-offers";
import { PageHero } from "@/components/page-hero";
import { OfferCard } from "@/components/hour/offer-card";
import { postKindLabel } from "@/lib/hour-posts";
import { getAdvisorRequests } from "@/lib/advisors";
import { endedLabel } from "@/lib/hour-status";
import { AdvisorRequestCard } from "@/components/hour/advisor-request-card";

export default async function TheHourPage({
  searchParams,
}: {
  searchParams: { confirmed?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [bookings, offers, advisorRequests] = await Promise.all([
    prisma.booking.findMany({
      where: { memberId: user.id },
      include: {
        partner: true,
        // What the partner shared afterwards.
        briefs: { where: { authorId: { not: user.id } }, orderBy: { createdAt: "desc" } },
      },
      orderBy: { startTime: "desc" },
    }),
    getOpenOffers(user.id),
    getAdvisorRequests(user.id),
  ]);

  const now = new Date();
  const upcoming = bookings
    .filter((b) => b.status !== "CANCELLED" && b.startTime >= now)
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  const past = bookings.filter((b) => b.startTime < now || b.status === "CANCELLED");

  // Advisor requests still in play, and the ones that are over.
  const advisorActive = advisorRequests.filter(
    (r) => r.status === "REQUESTED" || r.status === "OFFERED" || (r.status === "CONFIRMED" && r.confirmedEnd && new Date(r.confirmedEnd) >= now),
  );
  const advisorPast = advisorRequests.filter((r) => !advisorActive.includes(r));

  const clamp = (s: string, n = 140) => (s.length > n ? `${s.slice(0, n - 1).trim()}…` : s);

  return (
    <div className="max-w-2xl">
      {searchParams.confirmed && (
        <p className="card mb-6 animate-fade-up bg-foil/5 px-3 py-2 text-sm text-ink">Session confirmed.</p>
      )}

      <div className="mb-10 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <PageHero title="The" accent="Hour." subtitle="Time with a partner or an advisor, on your terms." />
        <Link href="/the-hour/book" className="btn-primary w-fit flex-shrink-0 !bg-foil !text-night hover:!text-cream">
          Book an Hour
        </Link>
      </div>

      {offers.length > 0 && (
        <div className="mb-10 flex flex-col gap-4">
          {offers.map((o) => (
            <OfferCard key={o.id} offer={o} />
          ))}
        </div>
      )}

      <section className="mb-12">
        <h2 className="mb-4 text-xs uppercase tracking-[0.28em] text-taupe">Upcoming</h2>
        {advisorActive.length > 0 && (
          <div className="mb-6 flex flex-col gap-4">
            {advisorActive.map((r) => (
              <AdvisorRequestCard key={r.id} request={r} />
            ))}
          </div>
        )}
        {upcoming.length === 0 && advisorActive.length === 0 && (
          <p className="text-sm text-taupe">Nothing booked. Start with the button above.</p>
        )}
        <ul className="flex flex-col gap-3">
          {upcoming.map((booking) => {
            const waiting = booking.status === "REQUESTED" || Boolean(booking.pendingStart);
            return (
              <li key={booking.id}>
                <Link
                  href={`/the-hour/${booking.id}`}
                  className={`tap block p-5 transition-shadow duration-300 hover:shadow-lg ${waiting ? "panel-foil" : "panel-clay"}`}
                >
                  <p className="font-display text-2xl italic leading-tight text-ink">{booking.partner.name}</p>
                  <p className="mt-1 text-sm text-taupe">
                    {formatSlot(booking.startTime)}
                    {booking.status === "RESCHEDULE_REQUESTED" && " · time to be moved"}
                    {booking.status === "REQUESTED" && " · waiting for confirmation"}
                    {booking.pendingStart && ` · move requested for ${formatSlot(booking.pendingStart)}`}
                  </p>
                  <p className="mt-0.5 text-xs text-taupe">{booking.mode === "ONLINE" ? "Online" : "In person"}</p>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <details className="group">
        <summary className="tap mb-4 flex min-h-[44px] cursor-pointer list-none items-center gap-2 text-xs uppercase tracking-[0.28em] text-taupe transition-colors duration-300 hover:text-ink [&::-webkit-details-marker]:hidden">
          History ({past.length + advisorPast.length})
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            className="transition-transform duration-300 ease-out group-open:rotate-180"
          >
            <path d="M1.5 3.5L5 7L8.5 3.5" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </summary>
        {past.length === 0 && advisorPast.length === 0 ? (
          <p className="text-sm text-taupe">No Hours yet.</p>
        ) : (
          <ul className="flex animate-fade-in flex-col divide-y divide-taupe/15">
            {advisorPast.map((r) => (
              <li key={r.id} className="py-4">
                <AdvisorRequestCard request={r} />
              </li>
            ))}
            {past.map((booking) => {
              const first = booking.partner.name.split(" ")[0];
              const shared = booking.briefs[0];
              return (
                <li key={booking.id}>
                  <Link
                    href={`/the-hour/${booking.id}`}
                    className="-mx-3 block rounded-md px-3 py-4 transition-colors duration-300 hover:bg-ink/[0.03]"
                  >
                    <p className="font-display text-xl italic leading-tight text-ink">{booking.partner.name}</p>
                    <p className="text-sm text-taupe">
                      {formatSlot(booking.startTime)}
                      {booking.status === "CANCELLED" && `, ${endedLabel(booking)}`}
                    </p>
                    {booking.memberContext && (
                      <p className="mt-2 text-sm text-ink">
                        <span className="text-xs uppercase tracking-[0.2em] text-taupe">You </span>
                        {clamp(booking.memberContext)}
                      </p>
                    )}
                    {shared && (shared.content || shared.fileName) && (
                      <p className="mt-1.5 text-sm text-ink">
                        <span className="text-xs uppercase tracking-[0.2em] text-taupe">{first}, {postKindLabel(shared.kind).toLowerCase()} </span>
                        {shared.content ? clamp(shared.content) : `Shared ${shared.fileName}`}
                      </p>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </details>
    </div>
  );
}
