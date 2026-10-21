import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getMonthView, bookableMonths } from "@/lib/hour-calendar";
import { findHourInMonth, formatMonthLabel } from "@/lib/monthly-cap";
import { getAdvisors } from "@/lib/advisors";
import { formatSlot } from "@/lib/format";
import { PageHero } from "@/components/page-hero";
import { BackLink } from "@/components/back-link";
import { HourCalendar } from "@/components/hour/hour-calendar";
import { HourRule } from "@/components/hour/hour-rule";
import { AdvisorList } from "@/components/hour/advisor-list";

// Book an Hour. Partners: a calendar of green dots, then a partner, then a
// start time you propose, which books at once if it is free. Advisors: propose a date only, and
// the team comes back with times.
export default async function BookHourPage({
  searchParams,
}: {
  searchParams: { m?: string; parentBookingId?: string; with?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const advisorsTab = searchParams.with === "advisors";
  const tab = "tap flex min-h-[44px] flex-1 items-center justify-center rounded-md px-3 text-sm transition-colors duration-200";

  return (
    <div className="max-w-md">
      <PageHero
        title="Book your"
        accent="Hour."
        subtitle={advisorsTab ? "Propose a date. We will come back with times." : "Pick a day with a dot, then a partner and a time."}
      />
      <HourRule />

      <div className="mb-6 flex gap-1 rounded-lg border border-taupe/25 p-1" role="tablist" aria-label="Who to meet">
        <Link href="/the-hour/book" role="tab" aria-selected={!advisorsTab} className={`${tab} ${!advisorsTab ? "bg-ink text-bone" : "text-taupe hover:text-ink"}`}>
          Partners
        </Link>
        <Link href="/the-hour/book?with=advisors" role="tab" aria-selected={advisorsTab} className={`${tab} ${advisorsTab ? "bg-ink text-bone" : "text-taupe hover:text-ink"}`}>
          Advisors
        </Link>
      </div>

      {advisorsTab ? <Advisors userId={user.id} /> : <Partners userId={user.id} month={searchParams.m} parent={searchParams.parentBookingId ?? null} />}

      <div className="mt-10">
        <BackLink href="/the-hour" />
      </div>
    </div>
  );
}

async function Partners({ userId, month, parent }: { userId: string; month?: string; parent: string | null }) {
  let view = await getMonthView(userId, month);
  // No month chosen, and this one is used or empty: open on the next one.
  if (!month && (view.used || view.openDays.length === 0) && view.months[1]) {
    const next = await getMonthView(userId, view.months[1].param);
    if (!next.used && next.openDays.length > 0) view = next;
  }
  return <HourCalendar view={view} parentBookingId={parent} />;
}

async function Advisors({ userId }: { userId: string }) {
  const months = bookableMonths();
  const advisors = await getAdvisors();
  // Both months are checked, because the member picks the date inside the sheet.
  const [thisMonth, nextMonth] = await Promise.all(months.map((m) => findHourInMonth(userId, new Date(m.year, m.month, 1))));
  // The sheet shows this sentence instead of the calendar only when both months are used.
  const both = thisMonth && nextMonth;
  const used = both
    ? `You already have your ${formatMonthLabel(new Date(months[0].year, months[0].month, 1))} Hour, with ${thisMonth.firstName}${thisMonth.hasTime ? ` on ${formatSlot(thisMonth.at)}` : ""}, and your ${formatMonthLabel(new Date(months[1].year, months[1].month, 1))} Hour with ${nextMonth.firstName}.`
    : null;
  const available = months.filter((_, i) => !(i === 0 ? thisMonth : nextMonth));

  return (
    <>
      <AdvisorList advisors={advisors} months={available} used={used} />
      {thisMonth && !nextMonth && (
        <p className="mt-5 text-sm text-taupe">
          Your {formatMonthLabel(new Date(months[0].year, months[0].month, 1))} Hour is with {thisMonth.firstName}, so you can ask for a date next month.
        </p>
      )}
    </>
  );
}
