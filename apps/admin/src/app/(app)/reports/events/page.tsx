import { redirect } from "next/navigation";
import { getCurrentAdmin, canViewReports } from "@/lib/session";
import { getReportsData } from "@/lib/reports";
import { PageHero } from "@/components/page-hero";
import { ReportSectionNav } from "@/components/reports/report-section-nav";
import { EventFilterSelect } from "@/components/reports/event-filter-select";
import { AttendanceByTierChart, NoShowChart } from "@/components/reports/events-charts";

export default async function EventsReportPage({
  searchParams,
}: {
  searchParams: { eventId?: string };
}) {
  const admin = await getCurrentAdmin();
  if (!admin || !canViewReports(admin.role)) redirect("/bookings");

  const eventId = searchParams.eventId ?? "";
  const data = await getReportsData({ eventId });

  return (
    <div className="max-w-3xl">
      <PageHero title="Events" subtitle="Attendance, no-shows, and survey ratings." />
      <ReportSectionNav active="/reports/events" />
      <EventFilterSelect eventId={eventId} eventOptions={data.eventOptions} />

      <section className="mb-12">
        <h2 className="mb-1 text-xs uppercase tracking-wide text-grey">Attendance, by tier</h2>
        <p className="mb-4 text-sm text-grey">RSVP&apos;d vs. actually checked in. Click a bar for the events behind it.</p>
        <AttendanceByTierChart data={data.attendanceByTier} />
      </section>

      <section className="mb-12">
        <h2 className="mb-1 text-xs uppercase tracking-wide text-grey">No-show rate, per event</h2>
        <p className="mb-4 text-sm text-grey">RSVP&apos;d but never checked in. Click a bar to open that event.</p>
        {data.noShowByEvent.length === 0 ? (
          <p className="text-sm text-grey">Not enough past events yet.</p>
        ) : (
          <NoShowChart data={data.noShowByEvent} />
        )}
      </section>

      <section>
        <h2 className="mb-2 text-xs uppercase tracking-wide text-grey">Post-event survey ratings</h2>
        {data.surveyByTier.length > 0 && (
          <p className="mb-3 text-sm text-grey">
            {data.surveyByTier
              .map((t) => `${t.tier === "DINNER" ? "Dinner" : t.tier === "QUARTERLY" ? "Quarterly" : "Annual Gathering"}: ${t.avgRating}/5 (${t.responses})`)
              .join(" · ")}
          </p>
        )}
        {data.surveyByEvent.length === 0 ? (
          <p className="text-sm text-grey">No responses yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-grey/15 text-sm">
            {data.surveyByEvent.map((e) => (
              <li key={e.eventId} className="flex items-center justify-between py-2">
                <a href={`/events/${e.eventId}`} className="font-medium text-deep-orange hover:underline">
                  {e.title}
                </a>
                <span className="text-grey">
                  {e.avgRating}/5 · {e.responses} response{e.responses === 1 ? "" : "s"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
