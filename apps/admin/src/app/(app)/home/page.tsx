import Link from "next/link";
import { prisma } from "@prequate/db";
import { PageHero } from "@/components/page-hero";

// Where the owner and full admins start: what needs a person today.
export default async function AdminHomePage() {
  const now = new Date();
  const weekEnd = new Date(now.getTime() + 7 * 24 * 3_600_000);

  const [requests, intros, approvals, messages, hoursThisWeek] = await Promise.all([
    prisma.tableRequest.count({ where: { status: { not: "DONE" } } }),
    prisma.introductionRequest.count({ where: { routedAt: null, status: "SENT" } }),
    prisma.eventAttendance.count({
      where: { pendingApproval: true, event: { startTime: { gte: now }, cancelledAt: null, archivedAt: null } },
    }),
    prisma.message.count({ where: { senderRole: "MEMBER", read: false, partnerId: null } }),
    prisma.booking.count({
      where: { status: { in: ["CONFIRMED", "REQUESTED", "RESCHEDULE_REQUESTED"] }, startTime: { gte: now, lt: weekEnd } },
    }),
  ]);

  const rows = [
    { href: "/requests", label: "Requests from members", note: "Briefs, peer Hours, reservations", count: requests },
    { href: "/introductions", label: "Introductions to route", note: "Waiting for you to pass on", count: intros },
    { href: "/events", label: "Event registrations to approve", note: "On upcoming events", count: approvals },
    { href: "/messages", label: "Unread messages", note: "From members", count: messages },
  ];

  return (
    <div className="max-w-2xl">
      <PageHero title="Good to" accent="see you." subtitle="What needs a person today." />

      <section className="mb-10">
        <h2 className="mb-3 text-xs uppercase tracking-wide text-grey">Needs you</h2>
        <ul className="flex flex-col divide-y divide-grey/15 rounded-lg border border-grey/20">
          {rows.map((r) => (
            <li key={r.href}>
              <Link href={r.href} className="flex min-h-[64px] items-center justify-between gap-4 px-4 py-3 transition hover:bg-ink/[0.03]">
                <span className="min-w-0">
                  <span className="block text-sm text-ink">{r.label}</span>
                  <span className="block text-xs text-grey">{r.note}</span>
                </span>
                <span
                  className={`flex h-8 min-w-[2rem] flex-shrink-0 items-center justify-center rounded-full px-2 text-sm ${
                    r.count > 0 ? "bg-deep-orange text-paper" : "bg-grey/10 text-grey"
                  }`}
                >
                  {r.count}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Room kept for the quiet seat alerts (b4): members who have gone quiet. */}
      <section className="mb-10" aria-labelledby="quiet-seats">
        <h2 id="quiet-seats" className="mb-3 text-xs uppercase tracking-wide text-grey">
          Quiet seats
        </h2>
        <div className="rounded-lg border border-dashed border-grey/30 p-4">
          <p className="text-sm text-grey">Members who have gone quiet will appear here. This arrives with the next stage.</p>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xs uppercase tracking-wide text-grey">This week</h2>
        <Link href="/bookings" className="flex min-h-[44px] items-center text-sm text-ink underline decoration-grey/40 underline-offset-2">
          {hoursThisWeek} Hour{hoursThisWeek === 1 ? "" : "s"} booked in the next seven days
        </Link>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/events/new" className="flex min-h-[44px] items-center rounded-md bg-ink px-5 text-sm font-medium text-paper">
            New event
          </Link>
          <Link href="/members" className="flex min-h-[44px] items-center rounded-md border border-grey/30 px-5 text-sm font-medium text-ink">
            Members
          </Link>
        </div>
      </section>
    </div>
  );
}
