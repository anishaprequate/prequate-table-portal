import { redirect } from "next/navigation";
import { getCurrentAdmin, canViewReports } from "@/lib/session";
import { getReportsData } from "@/lib/reports";
import { PageHero } from "@/components/page-hero";
import { ReportSectionNav } from "@/components/reports/report-section-nav";
import {
  InsightReadershipChart,
  IntroActivityChart,
  ResponseTimeChart,
} from "@/components/reports/directory-content-charts";

export default async function DirectoryContentReportPage() {
  const admin = await getCurrentAdmin();
  if (!admin || !canViewReports(admin.role)) redirect("/bookings");

  const data = await getReportsData({});

  return (
    <div className="max-w-3xl">
      <PageHero title="Directory & Content" subtitle="Insight readership, introductions, and message response time." />
      <ReportSectionNav active="/reports/directory-content" />

      <section className="mb-12">
        <h2 className="mb-1 text-xs uppercase tracking-wide text-grey">Insight readership</h2>
        <p className="mb-4 text-sm text-grey">View count, ranked by post.</p>
        {data.insightReadership.length === 0 ? (
          <p className="text-sm text-grey">No published posts yet.</p>
        ) : (
          <InsightReadershipChart data={data.insightReadership} />
        )}
      </section>

      <section className="mb-12">
        <h2 className="mb-1 text-xs uppercase tracking-wide text-grey">Directory &amp; introduction activity</h2>
        <p className="mb-4 text-sm text-grey">Introduction requests sent per month. Click a bar for who asked.</p>
        <IntroActivityChart data={data.introByMonth} />
      </section>

      <section>
        <h2 className="mb-1 text-xs uppercase tracking-wide text-grey">Message response time</h2>
        <p className="mb-4 text-sm text-grey">Average hours to reply to a member, RM vs. partner threads.</p>
        <ResponseTimeChart data={data.responseTimeByMonth} />
      </section>
    </div>
  );
}
