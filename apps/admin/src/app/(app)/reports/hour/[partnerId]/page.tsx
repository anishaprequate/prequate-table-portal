import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentAdmin, canViewReports } from "@/lib/session";
import { getReportsData } from "@/lib/reports";
import { PageHero } from "@/components/page-hero";
import { BackLink } from "@/components/back-link";

export default async function HourPartnerDetailPage({ params }: { params: { partnerId: string } }) {
  const admin = await getCurrentAdmin();
  if (!admin || !canViewReports(admin.role)) redirect("/bookings");

  const data = await getReportsData({});
  const partner = data.hourUtilization.find((p) => p.partnerId === params.partnerId);
  if (!partner) notFound();

  return (
    <div className="max-w-md">
      <p className="mb-2 text-xs uppercase tracking-wide text-grey">
        <Link href="/reports/hour" className="hover:text-ink">
          The Hour
        </Link>{" "}
        / {partner.partnerName}
      </p>
      <PageHero title={partner.partnerName} subtitle={`${partner.booked} booking(s) this month.`} />

      {partner.records.length === 0 ? (
        <p className="text-sm text-grey">No bookings this month.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-grey/15">
          {partner.records.map((r, i) => (
            <li key={i} className="py-3">
              <Link href={r.href} className="block">
                <p className="text-sm font-medium text-deep-orange hover:underline">{r.label}</p>
                <p className="text-xs text-grey">{r.sublabel}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <BackLink href="/reports/hour" />
    </div>
  );
}
