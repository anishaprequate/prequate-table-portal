import { redirect } from "next/navigation";
import { getCurrentAdmin, canViewReports } from "@/lib/session";
import { getReportsData } from "@/lib/reports";
import { PageHero } from "@/components/page-hero";
import { ReportSectionNav } from "@/components/reports/report-section-nav";
import { HourChart } from "@/components/reports/hour-chart";

export default async function HourReportPage() {
  const admin = await getCurrentAdmin();
  if (!admin || !canViewReports(admin.role)) redirect("/bookings");

  const data = await getReportsData({});

  return (
    <div className="max-w-3xl">
      <PageHero title="The Hour" subtitle="Booked vs. members still eligible this month, per partner." />
      <ReportSectionNav active="/reports/hour" />

      {data.hourUtilization.length === 0 ? (
        <p className="text-sm text-grey">No partners yet.</p>
      ) : (
        <>
          <HourChart data={data.hourUtilization} />
          <p className="mt-4 text-xs text-grey">Click a partner&apos;s bar to see the bookings behind it.</p>
        </>
      )}
    </div>
  );
}
