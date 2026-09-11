import { redirect } from "next/navigation";
import { getCurrentAdmin, canViewReports } from "@/lib/session";
import { getReportsData } from "@/lib/reports";
import { PageHero } from "@/components/page-hero";
import { ReportSectionNav } from "@/components/reports/report-section-nav";
import { MembersReportFilterBar } from "@/components/reports/members-report-filter-bar";
import { SortableInactiveTable } from "@/components/reports/sortable-inactive-table";
import { PointsTrendChart } from "@/components/reports/points-trend-chart";

export default async function MembersReportPage({
  searchParams,
}: {
  searchParams: { q?: string; sector?: string };
}) {
  const admin = await getCurrentAdmin();
  if (!admin || !canViewReports(admin.role)) redirect("/bookings");

  const q = searchParams.q ?? "";
  const sector = searchParams.sector ?? "";
  const data = await getReportsData({ q, sector });

  return (
    <div className="max-w-3xl">
      <PageHero title="Members" subtitle="Who's gone quiet, who's most active, and points over time." />
      <ReportSectionNav active="/reports/members" />
      <MembersReportFilterBar q={q} sector={sector} sectorOptions={data.sectorOptions} />

      <section className="mb-12">
        <h2 className="mb-2 text-xs uppercase tracking-wide text-grey">
          60-day inactive ({data.inactiveMembers.length})
        </h2>
        {data.inactiveMembers.length === 0 ? (
          <p className="text-sm text-grey">Everyone&apos;s had a touch within 60 days.</p>
        ) : (
          <SortableInactiveTable rows={data.inactiveMembers} />
        )}
      </section>

      <section className="mb-12">
        <h2 className="mb-2 text-xs uppercase tracking-wide text-grey">Most-active members</h2>
        <p className="mb-4 text-sm text-grey">Hour bookings + event attendance + messages, one point each, simple sum.</p>
        {data.mostActiveMembers.length === 0 ? (
          <p className="text-sm text-grey">No activity yet.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-grey/20 text-xs text-grey">
                <th className="pb-2 pr-4 font-normal">Name</th>
                <th className="pb-2 pr-4 font-normal">The Hour</th>
                <th className="pb-2 pr-4 font-normal">Events</th>
                <th className="pb-2 pr-4 font-normal">Messages</th>
                <th className="pb-2 font-normal">Score</th>
              </tr>
            </thead>
            <tbody>
              {data.mostActiveMembers.map((m) => (
                <tr key={m.id} className="border-b border-grey/10">
                  <td className="py-2 pr-4">
                    <a href={`/members/${m.id}`} className="font-medium text-deep-orange hover:underline">
                      {m.name}
                    </a>
                  </td>
                  <td className="py-2 pr-4 text-grey">{m.bookingScore}</td>
                  <td className="py-2 pr-4 text-grey">{m.attendanceScore}</td>
                  <td className="py-2 pr-4 text-grey">{m.messageScore}</td>
                  <td className="py-2 font-medium text-ink">{m.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section>
        <h2 className="mb-1 text-xs uppercase tracking-wide text-grey">Points balance trend</h2>
        <p className="mb-4 text-sm text-grey">Cumulative points awarded across the membership. Click a point for that month&apos;s awards.</p>
        <PointsTrendChart data={data.pointsTrend} />
      </section>
    </div>
  );
}
