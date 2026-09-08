import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@prequate/db";
import { getCurrentUser } from "@/lib/session";
import { formatSlot } from "@/lib/format";
import { PageHero } from "@/components/page-hero";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function monthGrid(year: number, month: number): Date[][] {
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = firstOfMonth.getDay();
  const gridStart = new Date(year, month, 1 - startOffset);

  const weeks: Date[][] = [];
  let cursor = new Date(gridStart);
  for (let w = 0; w < 6; w++) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
    if (cursor.getMonth() !== month && w >= 3) break;
  }
  return weeks;
}

export default async function EventsPage({
  searchParams,
}: {
  searchParams: { view?: string; month?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [events, myAttendances] = await Promise.all([
    prisma.event.findMany({
      where: { publishedAt: { not: null } },
      orderBy: { startTime: "desc" },
    }),
    prisma.eventAttendance.findMany({
      where: { memberId: user.id },
      select: { eventId: true, invited: true, joined: true },
    }),
  ]);

  const canSeeInviteOnly = new Set(
    myAttendances.filter((a) => a.invited || a.joined).map((a) => a.eventId),
  );
  const visible = events.filter((e) => !e.inviteOnly || canSeeInviteOnly.has(e.id));

  const now = new Date();
  const upcoming = visible
    .filter((e) => e.startTime >= now)
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  const past = visible.filter((e) => e.startTime < now);

  const view = searchParams.view === "calendar" ? "calendar" : "list";
  const [monthYear, monthIndex] = (searchParams.month ?? `${now.getFullYear()}-${now.getMonth() + 1}`)
    .split("-")
    .map(Number);
  const year = Number.isFinite(monthYear) ? monthYear : now.getFullYear();
  const month = Number.isFinite(monthIndex) ? monthIndex - 1 : now.getMonth();
  const weeks = monthGrid(year, month);
  const prevMonth = new Date(year, month - 1, 1);
  const nextMonth = new Date(year, month + 1, 1);
  const eventsByDay = new Map<string, typeof visible>();
  for (const event of visible) {
    const key = event.startTime.toDateString();
    eventsByDay.set(key, [...(eventsByDay.get(key) ?? []), event]);
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-8 flex items-start justify-between gap-6">
        <PageHero
          eyebrow={`${upcoming.length} upcoming`}
          title="Events"
          subtitle="At The Table dinners and gatherings."
        />
        <div className="mt-2 flex flex-shrink-0 gap-4 text-sm">
          <Link
            href="/events?view=list"
            className={view === "list" ? "font-medium text-ink" : "text-grey hover:text-ink"}
          >
            List
          </Link>
          <Link
            href="/events?view=calendar"
            className={view === "calendar" ? "font-medium text-ink" : "text-grey hover:text-ink"}
          >
            Calendar
          </Link>
        </div>
      </div>

      {view === "calendar" ? (
        <div className="mb-12">
          <div className="mb-4 flex items-center justify-between">
            <Link
              href={`/events?view=calendar&month=${prevMonth.getFullYear()}-${prevMonth.getMonth() + 1}`}
              className="text-sm text-grey hover:text-ink"
            >
              ← Prev
            </Link>
            <p className="text-sm font-medium text-ink">
              {new Date(year, month, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
            </p>
            <Link
              href={`/events?view=calendar&month=${nextMonth.getFullYear()}-${nextMonth.getMonth() + 1}`}
              className="text-sm text-grey hover:text-ink"
            >
              Next →
            </Link>
          </div>
          <div className="grid grid-cols-7 gap-px overflow-hidden rounded-md border border-grey/15 bg-grey/15 text-xs">
            {WEEKDAYS.map((d) => (
              <div key={d} className="bg-paper px-2 py-1.5 text-center text-grey">
                {d}
              </div>
            ))}
            {weeks.flat().map((day, i) => {
              const inMonth = day.getMonth() === month;
              const dayEvents = eventsByDay.get(day.toDateString()) ?? [];
              return (
                <div
                  key={i}
                  className={`min-h-[72px] bg-paper px-1.5 py-1 ${inMonth ? "" : "opacity-30"}`}
                >
                  <p className="mb-1 text-grey">{day.getDate()}</p>
                  {dayEvents.slice(0, 2).map((e) => (
                    <Link
                      key={e.id}
                      href={`/events/${e.id}`}
                      className="mb-0.5 block truncate rounded bg-orange/10 px-1 py-0.5 text-[10px] text-deep-orange hover:bg-orange/20"
                    >
                      {e.title}
                    </Link>
                  ))}
                  {dayEvents.length > 2 && (
                    <p className="text-[10px] text-grey">+{dayEvents.length - 2} more</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <>
          <section className="mb-12">
            <h2 className="mb-4 text-xs uppercase tracking-wide text-grey">Upcoming</h2>
            {upcoming.length === 0 && <p className="text-sm text-grey">Nothing on the calendar yet.</p>}
            <ul className="flex flex-col divide-y divide-grey/15">
              {upcoming.map((event) => (
                <li key={event.id} className="py-4">
                  <Link href={`/events/${event.id}`} className="block">
                    <p className="font-display text-xl italic leading-tight text-ink">{event.title}</p>
                    <p className="text-sm text-grey">
                      {formatSlot(event.startTime)}
                      {event.location && ` · ${event.location}`}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="mb-4 text-xs uppercase tracking-wide text-grey">Past</h2>
            {past.length === 0 && <p className="text-sm text-grey">No events yet.</p>}
            <ul className="flex flex-col divide-y divide-grey/15">
              {past.map((event) => (
                <li key={event.id} className="py-4">
                  <Link href={`/events/${event.id}`} className="block">
                    <p className="font-display text-xl italic leading-tight text-ink">{event.title}</p>
                    <p className="text-sm text-grey">
                      {formatSlot(event.startTime)}
                      {event.location && ` · ${event.location}`}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
