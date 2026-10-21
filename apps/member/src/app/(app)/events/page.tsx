import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@prequate/db";
import { getCurrentUser } from "@/lib/session";
import { PageHero } from "@/components/page-hero";
import { EventCard, type EventCardData } from "@/components/event-card";
import { eventVisibleTo, joinFormConfig, memberEventState } from "@/lib/event-access";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const PAST_LIMIT = 12;

function monthGrid(year: number, month: number): Date[][] {
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = firstOfMonth.getDay();
  const gridStart = new Date(year, month, 1 - startOffset);

  const weeks: Date[][] = [];
  const cursor = new Date(gridStart);
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

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

export default async function EventsPage({
  searchParams,
}: {
  searchParams: { view?: string; month?: string; day?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [events, myAttendances] = await Promise.all([
    prisma.event.findMany({
      // A closed event is only ever fetched for a member who holds an
      // invitation to it.
      where: { publishedAt: { not: null }, archivedAt: null, ...eventVisibleTo(user.id) },
      orderBy: { startTime: "desc" },
      include: { ticketTypes: { select: { id: true, name: true }, orderBy: { sortOrder: "asc" } } },
    }),
    prisma.eventAttendance.findMany({
      where: { memberId: user.id },
      select: {
        eventId: true,
        invited: true,
        joined: true,
        waitlisted: true,
        pendingApproval: true,
        declinedAt: true,
      },
    }),
  ]);

  const mine = new Map(myAttendances.map((a) => [a.eventId, a]));
  const visible = events;

  const now = new Date();
  const upcoming = visible
    .filter((e) => e.startTime >= now)
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  const past = visible.filter((e) => e.startTime < now).slice(0, PAST_LIMIT);

  // Who is going, and how many spots are left, for everything shown as an
  // upcoming card. One query for all of them.
  const joinedRows = upcoming.length
    ? await prisma.eventAttendance.findMany({
        where: { eventId: { in: upcoming.map((e) => e.id) }, joined: true },
        select: { eventId: true, guestCount: true, member: { select: { name: true, photoUrl: true } } },
        orderBy: { createdAt: "asc" },
      })
    : [];
  const joinedByEvent = new Map<string, typeof joinedRows>();
  for (const row of joinedRows) joinedByEvent.set(row.eventId, [...(joinedByEvent.get(row.eventId) ?? []), row]);

  function toCard(e: (typeof visible)[number]): EventCardData {
    const a = mine.get(e.id);
    const state = memberEventState(e, a);
    const rows = joinedByEvent.get(e.id) ?? [];
    const taken = rows.reduce((sum, r) => sum + 1 + r.guestCount, 0);
    return {
      id: e.id,
      title: e.title,
      startTime: e.startTime,
      location: e.location,
      imageUrl: e.imageUrl,
      tier: e.tier,
      cancelled: Boolean(e.cancelledAt),
      past: e.startTime < now,
      approvalRequired: e.approvalRequired,
      closed: e.inviteOnly,
      form: joinFormConfig(e),
      state,
      goingCount: rows.length,
      // A closed event is for the people asked. No count of seats left.
      spotsLeft: !e.inviteOnly && e.capacity != null ? Math.max(e.capacity - taken, 0) : null,
      goingFaces:
        e.attendeeVisibility === "VISIBLE_TO_ALL"
          ? rows.slice(0, 4).map((r) => ({ name: r.member.name, photoUrl: r.member.photoUrl }))
          : [],
    };
  }

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
    const key = dayKey(event.startTime);
    eventsByDay.set(key, [...(eventsByDay.get(key) ?? []), event]);
  }
  const monthEvents = visible
    .filter((e) => e.startTime.getFullYear() === year && e.startTime.getMonth() === month)
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  const selectedDay = searchParams.day ?? "";
  const agenda = selectedDay ? (eventsByDay.get(selectedDay) ?? []) : monthEvents;

  const tabClass = (active: boolean) =>
    `tap flex h-11 items-center rounded-md px-4 text-sm transition-colors duration-300 ${
      active ? "bg-ink text-bone" : "text-taupe hover:text-ink"
    }`;

  return (
    <div className="max-w-2xl">
      <PageHero
        eyebrow={`${upcoming.length} upcoming`}
        title="Events"
        subtitle="At The Table dinners and gatherings."
      />

      <div className="mb-8 inline-flex rounded-lg border border-taupe/15 bg-bone p-1">
        <Link href="/events?view=list" className={tabClass(view === "list")}>
          List
        </Link>
        <Link href="/events?view=calendar" className={tabClass(view === "calendar")}>
          Calendar
        </Link>
      </div>

      {view === "calendar" ? (
        <div className="mb-12">
          <div className="mb-4 flex items-center justify-between">
            <Link
              href={`/events?view=calendar&month=${prevMonth.getFullYear()}-${prevMonth.getMonth() + 1}`}
              className="tap flex h-11 w-11 items-center justify-center rounded-md text-taupe hover:text-ink"
              aria-label="Previous month"
            >
              ←
            </Link>
            <p className="font-display text-xl italic text-ink">
              {new Date(year, month, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
            </p>
            <Link
              href={`/events?view=calendar&month=${nextMonth.getFullYear()}-${nextMonth.getMonth() + 1}`}
              className="tap flex h-11 w-11 items-center justify-center rounded-md text-taupe hover:text-ink"
              aria-label="Next month"
            >
              →
            </Link>
          </div>

          <div className="card grid grid-cols-7 gap-px overflow-hidden bg-taupe/10 text-sm">
            {WEEKDAYS.map((d, i) => (
              <div key={i} className="bg-bone py-2 text-center text-xs text-taupe">
                {d}
              </div>
            ))}
            {weeks.flat().map((day, i) => {
              const inMonth = day.getMonth() === month;
              const key = dayKey(day);
              const dayEvents = eventsByDay.get(key) ?? [];
              const isToday = key === dayKey(now);
              const isSelected = key === selectedDay;
              return (
                <Link
                  key={i}
                  href={`/events?view=calendar&month=${year}-${month + 1}&day=${key}`}
                  aria-label={`${day.toDateString()}${dayEvents.length ? `, ${dayEvents.length} event${dayEvents.length === 1 ? "" : "s"}` : ""}`}
                  className={`tap flex min-h-[48px] flex-col items-center justify-center gap-1 bg-bone transition-colors duration-300 hover:bg-foil/10 ${
                    inMonth ? "" : "opacity-30"
                  } ${isSelected ? "!bg-ink !text-bone" : ""}`}
                >
                  <span className={isToday && !isSelected ? "font-medium text-gold" : ""}>{day.getDate()}</span>
                  <span className="flex h-1.5 gap-0.5">
                    {dayEvents.slice(0, 3).map((e) => (
                      <span key={e.id} className={`h-1.5 w-1.5 rounded-full ${isSelected ? "bg-foil" : "bg-clay"}`} />
                    ))}
                  </span>
                </Link>
              );
            })}
          </div>

          <div className="mt-8">
            <p className="mb-4 text-xs uppercase tracking-[0.28em] text-taupe">
              {selectedDay ? "That day" : "This month"}
            </p>
            {agenda.length === 0 ? (
              <p className="text-sm text-taupe">Nothing on the calendar{selectedDay ? " that day" : " this month"}.</p>
            ) : (
              <div className="flex flex-col gap-5">
                {agenda.map((e, i) => (
                  <EventCard key={e.id} event={toCard(e)} tone={i % 2 === 0 ? "night" : "bone"} />
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          <section className="mb-12">
            <h2 className="mb-4 text-xs uppercase tracking-[0.28em] text-taupe">Upcoming</h2>
            {upcoming.length === 0 && <p className="text-sm text-taupe">Nothing on the calendar yet.</p>}
            <div className="flex flex-col gap-5">
              {upcoming.map((event, i) => (
                <EventCard key={event.id} event={toCard(event)} tone={i === 0 ? "night" : i % 2 === 1 ? "bone" : "clay"} />
              ))}
            </div>
          </section>

          <details className="group">
            <summary className="tap mb-4 flex min-h-[44px] cursor-pointer list-none items-center gap-2 text-xs uppercase tracking-[0.28em] text-taupe [&::-webkit-details-marker]:hidden">
              Past ({past.length})
              <svg width="10" height="10" viewBox="0 0 10 10" className="transition-transform duration-300 group-open:rotate-180">
                <path d="M1.5 3.5L5 7L8.5 3.5" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </summary>
            {past.length === 0 ? (
              <p className="text-sm text-taupe">No events yet.</p>
            ) : (
              <div className="flex flex-col gap-5">
                {past.map((event) => (
                  <EventCard key={event.id} event={toCard(event)} />
                ))}
              </div>
            )}
          </details>
        </>
      )}
    </div>
  );
}
