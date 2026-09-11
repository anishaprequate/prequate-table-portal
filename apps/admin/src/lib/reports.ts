import { prisma } from "@prequate/db";
import type { EventTier } from "@prequate/core";
import { getLastTouchByMember, INACTIVE_THRESHOLD_DAYS } from "./member-inactivity";

const MONTHS_BACK = 6;

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string): string {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
}

// Last MONTHS_BACK calendar months, oldest first, including the current
// one — every "over time" chart below shares this window so an empty
// month still shows as a zero point rather than vanishing from the axis.
function recentMonthKeys(): string[] {
  const now = new Date();
  const keys: string[] = [];
  for (let i = MONTHS_BACK - 1; i >= 0; i--) {
    keys.push(monthKey(new Date(now.getFullYear(), now.getMonth() - i, 1)));
  }
  return keys;
}

export type ReportFilters = {
  q?: string;
  sector?: string;
  eventId?: string;
};

export type DrillRecord = { label: string; sublabel: string; href: string };

export async function getReportsData(filters: ReportFilters) {
  const q = filters.q?.trim() ?? "";
  const sector = filters.sector ?? "";
  const eventIdFilter = filters.eventId ?? "";
  const now = new Date();
  const months = recentMonthKeys();

  const memberWhere = {
    role: "MEMBER" as const,
    ...(q && { name: { contains: q } }),
    ...(sector && { sector }),
  };

  const [
    members,
    allMembersForFilterOptions,
    partners,
    bookings,
    allPublishedEvents,
    conciergeRequests,
    conciergeCategories,
    introRequests,
    insightPosts,
    insightViews,
    messages,
  ] = await Promise.all([
    prisma.user.findMany({ where: memberWhere }),
    prisma.user.findMany({ where: { role: "MEMBER" }, select: { sector: true } }),
    prisma.user.findMany({ where: { role: "PARTNER" }, orderBy: { name: "asc" } }),
    prisma.booking.findMany({ include: { member: true, partner: true } }),
    prisma.event.findMany({
      where: { publishedAt: { not: null } },
      include: { attendances: { include: { member: true } } },
      orderBy: { startTime: "desc" },
    }),
    prisma.conciergeRequest.findMany({ include: { member: true, category: true } }),
    prisma.conciergeCategory.findMany(),
    prisma.introductionRequest.findMany({ include: { requester: true, target: true } }),
    prisma.insightPost.findMany({ where: { publishedAt: { not: null } } }),
    prisma.insightView.findMany({ include: { member: true } }),
    prisma.message.findMany({ orderBy: { createdAt: "asc" } }),
  ]);

  // The event filter narrows event-centric metrics (attendance rate,
  // no-show rate) to one event; every other metric stays unfiltered by it,
  // same as person/sector only narrowing the person-centric views below.
  const events = eventIdFilter ? allPublishedEvents.filter((e) => e.id === eventIdFilter) : allPublishedEvents;

  const memberIds = new Set(members.map((m) => m.id));

  // --- 1 & 3. Hour utilization + partner utilization comparison ---
  // "Available" has no explicit capacity concept in this system — the one
  // real constraint is the existing one-booking-per-partner-per-member cap
  // for the current month, so "available" here means members who haven't
  // already used their one slot with that partner this month. Scoped to
  // the current calendar month, since a single horizontal bar per partner
  // has no month axis of its own.
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const bookingsThisMonth = bookings.filter(
    (b) => b.startTime >= monthStart && b.startTime < monthEnd && b.status !== "CANCELLED",
  );
  const hourUtilization = partners.map((partner) => {
    const own = bookingsThisMonth.filter((b) => b.partnerId === partner.id);
    const bookedMemberIds = new Set(own.map((b) => b.memberId));
    const eligibleMembers = members.filter((m) => !bookedMemberIds.has(m.id));
    return {
      partnerId: partner.id,
      partnerName: partner.name,
      booked: own.length,
      available: eligibleMembers.length,
      records: own.map(
        (b): DrillRecord => ({
          label: b.member.name,
          sublabel: `${b.startTime.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} · ${b.status}`,
          href: `/members/${b.memberId}`,
        }),
      ),
    };
  });

  // --- 2. Event attendance rate by tier ---
  const tiers: EventTier[] = ["DINNER", "QUARTERLY", "ANNUAL"];
  const attendanceByTier = tiers.map((tier) => {
    const tierEvents = events.filter((e) => e.tier === tier);
    const rsvpd = tierEvents.reduce((sum, e) => sum + e.attendances.filter((a) => a.joined).length, 0);
    const attended = tierEvents.reduce(
      (sum, e) => sum + e.attendances.filter((a) => a.joined && a.checkedInAt).length,
      0,
    );
    return {
      tier,
      rsvpd,
      attended,
      records: tierEvents.map(
        (e): DrillRecord => ({
          label: e.title,
          sublabel: `${e.attendances.filter((a) => a.joined).length} RSVP'd, ${
            e.attendances.filter((a) => a.joined && a.checkedInAt).length
          } attended`,
          href: `/events/${e.id}`,
        }),
      ),
    };
  });

  // --- 7. Post-event survey rollup: average rating per event, per tier ---
  const surveyByEvent = events
    .map((e) => {
      const rated = e.attendances.filter((a) => a.surveyRating != null);
      const avgRating = rated.length
        ? Math.round((rated.reduce((sum, a) => sum + (a.surveyRating ?? 0), 0) / rated.length) * 10) / 10
        : null;
      return { eventId: e.id, title: e.title, tier: e.tier, avgRating, responses: rated.length };
    })
    .filter((e) => e.responses > 0)
    .sort((a, b) => (b.avgRating ?? 0) - (a.avgRating ?? 0));

  const surveyByTier = tiers
    .map((tier) => {
      const rated = events
        .filter((e) => e.tier === tier)
        .flatMap((e) => e.attendances)
        .filter((a) => a.surveyRating != null);
      const avgRating = rated.length
        ? Math.round((rated.reduce((sum, a) => sum + (a.surveyRating ?? 0), 0) / rated.length) * 10) / 10
        : null;
      return { tier, avgRating, responses: rated.length };
    })
    .filter((t) => t.responses > 0);

  // --- 9. No-show rate per event ---
  const noShowByEvent = events
    .filter((e) => e.startTime < now)
    .map((e) => {
      const joined = e.attendances.filter((a) => a.joined);
      const noShows = joined.filter((a) => !a.checkedInAt);
      return {
        eventId: e.id,
        title: e.title,
        rsvpd: joined.length,
        noShows: noShows.length,
        rate: joined.length ? Math.round((noShows.length / joined.length) * 100) : 0,
        records: noShows.map(
          (a): DrillRecord => ({
            label: a.member.name,
            sublabel: "Did not check in",
            href: `/members/${a.memberId}`,
          }),
        ),
      };
    })
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 10);

  // --- 3b/4. Concierge volume + time-to-fulfillment over time ---
  const conciergeByMonth = months.map((key) => {
    const inMonth = conciergeRequests.filter((r) => monthKey(r.createdAt) === key);
    const fulfilled = inMonth.filter((r) => r.status === "FULFILLED");
    const avgDays = fulfilled.length
      ? fulfilled.reduce((sum, r) => sum + (r.updatedAt.getTime() - r.createdAt.getTime()), 0) /
        fulfilled.length /
        (24 * 60 * 60 * 1000)
      : 0;
    return {
      month: key,
      label: monthLabel(key),
      volume: inMonth.length,
      avgDays: Math.round(avgDays * 10) / 10,
      records: inMonth.map(
        (r): DrillRecord => ({
          label: r.member.name,
          sublabel: r.category?.category ?? r.customText ?? "Something else",
          href: `/members/${r.memberId}`,
        }),
      ),
    };
  });

  // --- Most-used services donut ---
  const groups = Array.from(new Set(conciergeCategories.map((c) => c.group)));
  const servicesByGroup = groups.map((group) => {
    const categoryIds = new Set(conciergeCategories.filter((c) => c.group === group).map((c) => c.id));
    const inGroup = conciergeRequests.filter((r) => r.categoryId && categoryIds.has(r.categoryId));
    return {
      group,
      count: inGroup.length,
      records: inGroup.map(
        (r): DrillRecord => ({
          label: r.member.name,
          sublabel: r.category?.category ?? "",
          href: `/members/${r.memberId}`,
        }),
      ),
    };
  });

  // --- 5. Points balance trend (cumulative, monthly) ---
  const pointsAwardedEvents = conciergeRequests.filter((r) => r.pointsAwarded > 0);
  const pointEvents = [...pointsAwardedEvents].sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime());
  let running = 0;
  const pointsTrend = months.map((key) => {
    const [year, month] = key.split("-").map(Number);
    const cutoff = new Date(year, month, 1);
    while (pointEvents.length && pointEvents[0].updatedAt < cutoff) {
      running += pointEvents.shift()!.pointsAwarded;
    }
    // Records for this bucket are the requests actually awarded points
    // during this specific month — the natural drill-down set, distinct
    // from the running cumulative balance itself.
    const awardedThisMonth = pointsAwardedEvents.filter((r) => monthKey(r.updatedAt) === key);
    return {
      month: key,
      label: monthLabel(key),
      balance: running,
      records: awardedThisMonth.map(
        (r): DrillRecord => ({
          label: r.member.name,
          sublabel: `+${r.pointsAwarded} pts · ${r.category?.category ?? r.customText ?? "Something else"}`,
          href: `/members/${r.memberId}`,
        }),
      ),
    };
  });
  // Any remaining events happened at/after the last bucket's cutoff — fold
  // them into the final point so the trend always ends at today's total.
  for (const remaining of pointEvents) running += remaining.pointsAwarded;
  if (pointsTrend.length) pointsTrend[pointsTrend.length - 1].balance = running;

  // --- 6. Directory / introduction-request activity per month ---
  const introByMonth = months.map((key) => {
    const inMonth = introRequests.filter((r) => monthKey(r.createdAt) === key);
    return {
      month: key,
      label: monthLabel(key),
      count: inMonth.length,
      records: inMonth.map(
        (r): DrillRecord => ({
          label: `${r.requester.name} → ${r.target.name}`,
          sublabel: r.status,
          href: `/members/${r.requesterId}`,
        }),
      ),
    };
  });

  // --- 7. Insight readership ranked by post ---
  const viewsByPost = new Map<string, typeof insightViews>();
  for (const v of insightViews) {
    viewsByPost.set(v.postId, [...(viewsByPost.get(v.postId) ?? []), v]);
  }
  const insightReadership = insightPosts
    .map((post) => {
      const views = viewsByPost.get(post.id) ?? [];
      return {
        postId: post.id,
        title: post.title,
        views: views.length,
        records: views.map(
          (v): DrillRecord => ({
            label: v.member.name,
            sublabel: v.createdAt.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
            href: `/members/${v.memberId}`,
          }),
        ),
      };
    })
    .sort((a, b) => b.views - a.views);

  // --- 8. Message response time, RM vs Partner, over time ---
  type ThreadKey = string;
  const threads = new Map<ThreadKey, typeof messages>();
  for (const m of messages) {
    const key = `${m.memberId}:${m.partnerId ?? "rm"}`;
    threads.set(key, [...(threads.get(key) ?? []), m]);
  }
  const responseSamples: { month: string; role: "RM" | "PARTNER"; hours: number }[] = [];
  for (const thread of threads.values()) {
    for (let i = 0; i < thread.length - 1; i++) {
      const msg = thread[i];
      const next = thread[i + 1];
      if (msg.senderRole === "MEMBER" && (next.senderRole === "RM" || next.senderRole === "PARTNER")) {
        const hours = (next.createdAt.getTime() - msg.createdAt.getTime()) / (60 * 60 * 1000);
        responseSamples.push({ month: monthKey(next.createdAt), role: next.senderRole, hours });
      }
    }
  }
  const responseTimeByMonth = months.map((key) => {
    const rm = responseSamples.filter((s) => s.month === key && s.role === "RM");
    const partner = responseSamples.filter((s) => s.month === key && s.role === "PARTNER");
    return {
      month: key,
      label: monthLabel(key),
      rmHours: rm.length ? Math.round((rm.reduce((s, r) => s + r.hours, 0) / rm.length) * 10) / 10 : 0,
      partnerHours: partner.length
        ? Math.round((partner.reduce((s, r) => s + r.hours, 0) / partner.length) * 10) / 10
        : 0,
    };
  });

  // --- 60-day inactive members ---
  const inactivityCandidates = members.filter(
    (m) => m.lifecycleStatus === "ACTIVE" || m.lifecycleStatus === "AT_RISK",
  );
  const lastTouchMap = await getLastTouchByMember(inactivityCandidates.map((m) => m.id));
  const inactiveMembers = inactivityCandidates
    .map((member) => {
      const lastTouch = lastTouchMap.get(member.id) ?? null;
      const daysSince = lastTouch
        ? Math.floor((now.getTime() - lastTouch.getTime()) / (24 * 60 * 60 * 1000))
        : null;
      return { id: member.id, name: member.name, lastTouch, daysSince };
    })
    .filter((m) => m.daysSince === null || m.daysSince >= INACTIVE_THRESHOLD_DAYS)
    .sort((a, b) => (b.daysSince ?? Infinity) - (a.daysSince ?? Infinity));

  // --- Most-active members (composite score) ---
  const bookingCountByMember = new Map<string, number>();
  for (const b of bookings) {
    if (memberIds.has(b.memberId)) bookingCountByMember.set(b.memberId, (bookingCountByMember.get(b.memberId) ?? 0) + 1);
  }
  const attendanceCountByMember = new Map<string, number>();
  for (const e of events) {
    for (const a of e.attendances) {
      if (a.joined && memberIds.has(a.memberId)) {
        attendanceCountByMember.set(a.memberId, (attendanceCountByMember.get(a.memberId) ?? 0) + 1);
      }
    }
  }
  const messageCountByMember = new Map<string, number>();
  for (const m of messages) {
    if (memberIds.has(m.memberId)) messageCountByMember.set(m.memberId, (messageCountByMember.get(m.memberId) ?? 0) + 1);
  }
  const mostActiveMembers = members
    .map((member) => {
      const bookingScore = bookingCountByMember.get(member.id) ?? 0;
      const attendanceScore = attendanceCountByMember.get(member.id) ?? 0;
      const messageScore = messageCountByMember.get(member.id) ?? 0;
      return {
        id: member.id,
        name: member.name,
        bookingScore,
        attendanceScore,
        messageScore,
        score: bookingScore + attendanceScore + messageScore,
      };
    })
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 15);

  return {
    hourUtilization,
    attendanceByTier,
    surveyByEvent,
    surveyByTier,
    noShowByEvent,
    conciergeByMonth,
    servicesByGroup,
    pointsTrend,
    introByMonth,
    insightReadership,
    responseTimeByMonth,
    inactiveMembers,
    mostActiveMembers,
    eventOptions: allPublishedEvents.map((e) => ({ id: e.id, title: e.title })),
    sectorOptions: Array.from(
      new Set(allMembersForFilterOptions.map((m) => m.sector).filter((s): s is string => !!s)),
    ).sort(),
  };
}

export type ReportsData = Awaited<ReturnType<typeof getReportsData>>;
