import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentAdmin, canViewReports } from "@/lib/session";
import { getReportsData } from "@/lib/reports";
import { PageHero } from "@/components/page-hero";
import { BackLink } from "@/components/back-link";

export default async function PointsMonthDetailPage({ params }: { params: { month: string } }) {
  const admin = await getCurrentAdmin();
  if (!admin || !canViewReports(admin.role)) redirect("/bookings");

  const data = await getReportsData({});
  const month = data.pointsTrend.find((m) => m.month === params.month);
  if (!month) notFound();

  return (
    <div className="max-w-md">
      <p className="mb-2 text-xs uppercase tracking-wide text-grey">
        <Link href="/reports/members" className="hover:text-ink">
          Members
        </Link>{" "}
        / {month.label}
      </p>
      <PageHero title={month.label} subtitle={`Balance at month end: ${month.balance} points.`} />

      {month.records.length === 0 ? (
        <p className="text-sm text-grey">No points awarded that month.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-grey/15">
          {month.records.map((r, i) => (
            <li key={i} className="py-3">
              <Link href={r.href} className="block">
                <p className="text-sm font-medium text-deep-orange hover:underline">{r.label}</p>
                <p className="text-xs text-grey">{r.sublabel}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <BackLink href="/reports/members" />
    </div>
  );
}
