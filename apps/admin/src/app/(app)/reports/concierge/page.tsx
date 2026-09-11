import { redirect } from "next/navigation";
import { getCurrentAdmin, canViewReports } from "@/lib/session";
import { getReportsData } from "@/lib/reports";
import { PageHero } from "@/components/page-hero";
import { ReportSectionNav } from "@/components/reports/report-section-nav";
import { ConciergeVolumeChart, ServicesDonutChart } from "@/components/reports/concierge-charts";

export default async function ConciergeReportPage() {
  const admin = await getCurrentAdmin();
  if (!admin || !canViewReports(admin.role)) redirect("/bookings");

  const data = await getReportsData({});

  return (
    <div className="max-w-3xl">
      <PageHero title="Concierge" subtitle="Volume, time-to-fulfillment, and most-used services." />
      <ReportSectionNav active="/reports/concierge" />

      <section className="mb-12">
        <h2 className="mb-1 text-xs uppercase tracking-wide text-grey">Volume &amp; time-to-fulfillment</h2>
        <p className="mb-4 text-sm text-grey">
          Requests per month (left axis) against average days to fulfill (right axis). Click a point for that
          month&apos;s requests.
        </p>
        <ConciergeVolumeChart data={data.conciergeByMonth} />
      </section>

      <section>
        <h2 className="mb-1 text-xs uppercase tracking-wide text-grey">Most-used services</h2>
        <p className="mb-4 text-sm text-grey">
          Volume by touchpoint group. Click a slice for the requests behind it.
        </p>
        <ServicesDonutChart data={data.servicesByGroup} />
      </section>
    </div>
  );
}
