import { redirect } from "next/navigation";
import { getCurrentAdmin, canViewReports } from "@/lib/session";
import { getReportsData } from "@/lib/reports";
import { PageHero } from "@/components/page-hero";
import { HubCard } from "@/components/hub-card";
import { ReportSectionNav } from "@/components/reports/report-section-nav";

export default async function ReportsHubPage() {
  const admin = await getCurrentAdmin();
  if (!admin || !canViewReports(admin.role)) redirect("/bookings");

  const data = await getReportsData({});

  const totalBooked = data.hourUtilization.reduce((sum, p) => sum + p.booked, 0);
  const totalRsvpd = data.attendanceByTier.reduce((sum, t) => sum + t.rsvpd, 0);
  const ratedTiers = data.surveyByTier.filter((t) => t.avgRating != null);
  const avgRating = ratedTiers.length
    ? Math.round((ratedTiers.reduce((s, t) => s + (t.avgRating ?? 0), 0) / ratedTiers.length) * 10) / 10
    : null;
  const totalConciergeVolume = data.conciergeByMonth.reduce((sum, m) => sum + m.volume, 0);
  const topService = [...data.servicesByGroup].sort((a, b) => b.count - a.count)[0];
  const totalInsightViews = data.insightReadership.reduce((sum, p) => sum + p.views, 0);
  const totalIntroRequests = data.introByMonth.reduce((sum, m) => sum + m.count, 0);

  return (
    <div className="max-w-4xl">
      <PageHero title="Reports" subtitle="Where things stand, across the room." />
      <ReportSectionNav active="/reports" />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <HubCard
          href="/reports/hour"
          title="The Hour"
          facts={[
            { label: "Partners tracked", value: data.hourUtilization.length },
            { label: "Booked this month", value: totalBooked },
          ]}
        />
        <HubCard
          href="/reports/events"
          title="Events"
          facts={[
            { label: "RSVP'd (all tiers)", value: totalRsvpd },
            { label: "Avg survey rating", value: avgRating != null ? `${avgRating}/5` : "—" },
          ]}
        />
        <HubCard
          href="/reports/concierge"
          title="Concierge"
          facts={[
            { label: "Requests (6 months)", value: totalConciergeVolume },
            { label: "Top category", value: topService?.group ?? "—" },
          ]}
        />
        <HubCard
          href="/reports/members"
          title="Members"
          facts={[
            { label: "Inactive 60+ days", value: data.inactiveMembers.length },
            { label: "Most active", value: data.mostActiveMembers[0]?.name ?? "—" },
          ]}
        />
        <HubCard
          href="/reports/directory-content"
          title="Directory & Content"
          facts={[
            { label: "Insight views", value: totalInsightViews },
            { label: "Intro requests (6 months)", value: totalIntroRequests },
          ]}
        />
      </div>
    </div>
  );
}
