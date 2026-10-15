import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getMonthView } from "@/lib/hour-calendar";
import { PageHero } from "@/components/page-hero";
import { BackLink } from "@/components/back-link";
import { HourCalendar } from "@/components/hour/hour-calendar";
import { HourRule } from "@/components/hour/hour-rule";

// Book an Hour from a calendar. Partner, time and the note all happen in one
// sheet: day, time, confirm.
export default async function BookHourPage({
  searchParams,
}: {
  searchParams: { m?: string; parentBookingId?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  let view = await getMonthView(user.id, searchParams.m);
  // No month chosen, and this one is used or empty: open on the next one.
  if (!searchParams.m && (view.used || view.openDays.length === 0) && view.months[1]) {
    const next = await getMonthView(user.id, view.months[1].param);
    if (!next.used && next.openDays.length > 0) view = next;
  }

  return (
    <div className="max-w-md">
      <PageHero title="Book your" accent="Hour." subtitle="Pick a day with a dot." />
      <HourRule />
      <HourCalendar view={view} parentBookingId={searchParams.parentBookingId ?? null} />
      <div className="mt-10">
        <BackLink href="/the-hour" />
      </div>
    </div>
  );
}
