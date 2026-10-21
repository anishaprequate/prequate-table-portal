import { prisma } from "@prequate/db";
import { declineAdvisorRequest } from "@/lib/actions/advisors";
import { formatSlot } from "@/lib/format";
import { PageHero } from "@/components/page-hero";
import { Toast } from "@/components/toast";
import { AdvisorOfferForm } from "@/components/advisor-offer-form";

const pad = (n: number) => String(n).padStart(2, "0");
const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dayLabel = (d: Date) => new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long" }).format(d);

const STATUS_LABELS: Record<string, string> = {
  REQUESTED: "Waiting for times",
  OFFERED: "Times sent",
  CONFIRMED: "Confirmed",
  DECLINED: "Declined",
  WITHDRAWN: "Withdrawn",
};

// A member proposes a date; the advisor desk answers with up to three times.
// Open requests first, then what has been settled.
export default async function AdvisorRequestsPage() {
  const requests = await prisma.advisorRequest.findMany({
    include: { advisor: { select: { name: true } }, member: { select: { name: true, seatNumber: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const open = requests.filter((r) => r.status === "REQUESTED" || r.status === "OFFERED");
  const settled = requests.filter((r) => !open.includes(r));

  return (
    <div className="max-w-2xl">
      <Toast param="declined" message="Declined. The member has been told." />
      <PageHero title="Advisor" accent="requests." subtitle="A member proposes a date. Offer up to three times." />

      {open.length === 0 && <p className="mb-10 text-sm text-grey">Nothing waiting.</p>}
      <ul className="mb-12 flex flex-col gap-5">
        {open.map((r) => {
          const slots = r.offeredSlots ? (JSON.parse(r.offeredSlots) as { start: string }[]) : [];
          return (
            <li key={r.id} className="rounded-md border border-grey/15 p-4">
              <p className="font-display text-2xl italic leading-tight text-ink">
                {r.member.name} <span className="text-deep-orange">· {r.advisor.name}</span>
              </p>
              <p className="mb-3 text-xs text-grey">
                {STATUS_LABELS[r.status]} · asked {formatSlot(r.createdAt)}
              </p>
              <p className="text-sm text-ink">
                Proposed day: <strong className="font-medium">{dayLabel(r.proposedDate)}</strong>
              </p>
              {r.note && <p className="mt-1 whitespace-pre-wrap text-sm text-ink">{r.note}</p>}
              {slots.length > 0 && (
                <p className="mt-2 text-sm text-grey">Offered: {slots.map((s) => formatSlot(new Date(s.start))).join("; ")}</p>
              )}

              <div className="mt-4 border-t border-grey/15 pt-4">
                <AdvisorOfferForm requestId={r.id} proposedDay={dayKey(r.proposedDate)} again={r.status === "OFFERED"} />
              </div>
              <form action={declineAdvisorRequest} className="mt-4 flex flex-wrap items-center gap-2">
                <input type="hidden" name="requestId" value={r.id} />
                <input
                  type="text"
                  name="reason"
                  maxLength={300}
                  placeholder="Reason for the member, optional"
                  className="min-h-[44px] min-w-0 flex-1 rounded-md border border-grey/30 bg-paper px-3 text-ink"
                />
                <button type="submit" className="min-h-[44px] rounded-md border border-grey/30 px-4 text-sm font-medium text-ink transition hover:border-grey/60">
                  Decline
                </button>
              </form>
            </li>
          );
        })}
      </ul>

      {settled.length > 0 && (
        <>
          <h2 className="mb-3 text-xs uppercase tracking-[0.28em] text-grey">Settled</h2>
          <ul className="flex flex-col divide-y divide-grey/15">
            {settled.map((r) => (
              <li key={r.id} className="py-3 text-sm">
                <p className="text-ink">
                  {r.member.name} · {r.advisor.name}
                </p>
                <p className="text-xs text-grey">
                  {STATUS_LABELS[r.status]}
                  {r.status === "CONFIRMED" && r.confirmedStart ? `, ${formatSlot(r.confirmedStart)}` : `, proposed ${dayLabel(r.proposedDate)}`}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
