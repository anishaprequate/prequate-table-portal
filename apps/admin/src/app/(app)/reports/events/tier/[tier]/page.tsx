import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentAdmin, canViewReports } from "@/lib/session";
import { getReportsData } from "@/lib/reports";
import { PageHero } from "@/components/page-hero";
import { BackLink } from "@/components/back-link";

const TIER_LABELS: Record<string, string> = { DINNER: "Dinner", QUARTERLY: "Quarterly", ANNUAL: "Annual Gathering" };

export default async function EventsTierDetailPage({ params }: { params: { tier: string } }) {
  const admin = await getCurrentAdmin();
  if (!admin || !canViewReports(admin.role)) redirect("/bookings");

  const data = await getReportsData({});
  const tier = data.attendanceByTier.find((t) => t.tier === params.tier);
  if (!tier) notFound();

  const label = TIER_LABELS[tier.tier] ?? tier.tier;

  return (
    <div className="max-w-md">
      <p className="mb-2 text-xs uppercase tracking-wide text-grey">
        <Link href="/reports/events" className="hover:text-ink">
          Events
        </Link>{" "}
        / {label}
      </p>
      <PageHero title={label} subtitle={`${tier.rsvpd} RSVP'd, ${tier.attended} attended.`} />

      {tier.records.length === 0 ? (
        <p className="text-sm text-grey">No events in this tier yet.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-grey/15">
          {tier.records.map((r, i) => (
            <li key={i} className="py-3">
              <Link href={r.href} className="block">
                <p className="text-sm font-medium text-deep-orange hover:underline">{r.label}</p>
                <p className="text-xs text-grey">{r.sublabel}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <BackLink href="/reports/events" />
    </div>
  );
}
