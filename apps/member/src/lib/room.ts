import { prisma } from "@prequate/db";

export interface NewSeatCaption {
  seatNumber: number;
  filledAt: Date;
}

export interface SelfSeat {
  seatNumber: number | null;
  seatingDate: Date | null;
}

// The member's own seat, plus the one-time "a new seat was taken" caption.
// The rest of the Room used to render all 24 seats — now the table shows
// only the member's own number; everyone else's seat is not displayed.
export async function getSelfSeat(viewerId: string): Promise<SelfSeat> {
  const self = await prisma.user.findUnique({
    where: { id: viewerId },
    select: { seatNumber: true, seatingDate: true },
  });
  const seatNumber = self?.seatNumber ? Number(self.seatNumber) : null;
  return { seatNumber: Number.isFinite(seatNumber) ? seatNumber : null, seatingDate: self?.seatingDate ?? null };
}

// Finds the most recent seat-filled event this viewer hasn't seen yet
// (skipping the viewer's own seat — no need to caption a member's own
// arrival back to them), then marks every unseen event as seen so a
// backlog never queues up captions across visits. Show once per member,
// then never again, per spec.
export async function consumeNewSeatCaption(viewerId: string): Promise<NewSeatCaption | null> {
  const unseen = await prisma.roomEvent.findMany({
    where: { views: { none: { viewerId } } },
    orderBy: { filledAt: "desc" },
    include: { member: { select: { id: true, seatNumber: true } } },
  });

  if (unseen.length === 0) return null;

  // SQLite's Prisma connector doesn't support `skipDuplicates`, but there's
  // nothing to dedupe against — `unseen` was just queried as exactly the
  // events with no view row for this viewer yet.
  await prisma.roomEventView.createMany({
    data: unseen.map((e) => ({ roomEventId: e.id, viewerId })),
  });

  const captionable = unseen.find((e) => e.member.id !== viewerId);
  if (!captionable) return null;

  const seatNumber = Number(captionable.member.seatNumber);
  if (!Number.isFinite(seatNumber)) return null;

  return { seatNumber, filledAt: captionable.filledAt };
}

export type SatelliteKey =
  | "hour"
  | "events"
  | "members"
  | "introductions"
  | "insight"
  | "messages"
  | "notifications"
  | "settings";

export interface Satellite {
  key: SatelliteKey;
  href: string;
  label: string;
  detail: string;
  badge: number | null;
}

// The eight things orbiting the member's seat — each a live, one-line read
// on that part of the Table, not just a static nav shortcut.
export async function getRoomSatellites(viewerId: string): Promise<Satellite[]> {
  const now = new Date();

  const [
    nextBooking,
    nextEvent,
    pendingReceived,
    unreadInsightCount,
    unreadMessages,
    unreadNotifications,
    publishedPostsCount,
  ] = await Promise.all([
    prisma.booking.findFirst({
      where: { memberId: viewerId, startTime: { gte: now }, status: { not: "CANCELLED" } },
      orderBy: { startTime: "asc" },
      include: { partner: true },
    }),
    prisma.eventAttendance.findFirst({
      where: { memberId: viewerId, joined: true, event: { startTime: { gte: now } } },
      include: { event: true },
      orderBy: { event: { startTime: "asc" } },
    }),
    prisma.introductionRequest.count({
      where: { targetId: viewerId, routedAt: { not: null }, status: "SENT" },
    }),
    prisma.insightPost.count({
      where: { status: "PUBLISHED", views: { none: { memberId: viewerId } } },
    }),
    prisma.message.count({
      where: { memberId: viewerId, senderRole: { not: "MEMBER" }, read: false },
    }),
    prisma.notification.count({
      where: { recipientId: viewerId, readAt: null, type: { not: "new_message" } },
    }),
    prisma.insightPost.count({ where: { status: "PUBLISHED" } }),
  ]);

  return [
    {
      key: "hour",
      href: "/the-hour",
      label: "The Hour",
      detail: nextBooking
        ? `With ${nextBooking.partner.name.split(" ")[0]}, ${formatShortDate(nextBooking.startTime)}`
        : "Nothing booked",
      badge: null,
    },
    {
      key: "events",
      href: "/events",
      label: "Events",
      detail: nextEvent ? formatShortDate(nextEvent.event.startTime) : "Nothing upcoming",
      badge: null,
    },
    {
      key: "members",
      href: "/members",
      label: "Members",
      detail: "Everyone at the Table",
      badge: null,
    },
    {
      key: "introductions",
      href: "/members?tab=received",
      label: "Introductions",
      detail: pendingReceived > 0 ? "Awaiting your reply" : "Nothing pending",
      badge: pendingReceived || null,
    },
    {
      key: "insight",
      href: "/insight",
      label: "Insight",
      detail: unreadInsightCount > 0 ? "New since your last visit" : "You're caught up",
      badge: publishedPostsCount > 0 ? unreadInsightCount || null : null,
    },
    {
      key: "messages",
      href: "/messages",
      label: "Messages",
      detail: unreadMessages > 0 ? "Unread" : "Nothing new",
      badge: unreadMessages || null,
    },
    {
      key: "notifications",
      href: "/notifications",
      label: "Notifications",
      detail: unreadNotifications > 0 ? "Unread" : "Nothing new",
      badge: unreadNotifications || null,
    },
    {
      key: "settings",
      href: "/settings",
      label: "Settings",
      detail: "Your profile and preferences",
      badge: null,
    },
  ];
}

export interface NextUp {
  kind: "hour" | "event";
  title: string;
  startsAt: Date;
  href: string;
}

// The single nearest commitment on the member's calendar: their next Hour or
// the next event they have joined, whichever starts first.
export async function getNextUp(viewerId: string): Promise<NextUp | null> {
  const now = new Date();
  const [booking, attendance] = await Promise.all([
    prisma.booking.findFirst({
      where: { memberId: viewerId, startTime: { gte: now }, status: { not: "CANCELLED" } },
      orderBy: { startTime: "asc" },
      include: { partner: { select: { name: true } } },
    }),
    prisma.eventAttendance.findFirst({
      where: { memberId: viewerId, joined: true, event: { startTime: { gte: now }, cancelledAt: null } },
      orderBy: { event: { startTime: "asc" } },
      include: { event: { select: { id: true, title: true, startTime: true } } },
    }),
  ]);

  const hour: NextUp | null = booking
    ? {
        kind: "hour",
        title: `Your Hour with ${booking.partner.name.split(" ")[0]}`,
        startsAt: booking.startTime,
        href: `/the-hour/${booking.id}`,
      }
    : null;
  const event: NextUp | null = attendance
    ? {
        kind: "event",
        title: attendance.event.title,
        startsAt: attendance.event.startTime,
        href: `/events/${attendance.event.id}`,
      }
    : null;

  if (hour && event) return hour.startsAt <= event.startsAt ? hour : event;
  return hour ?? event;
}

function formatShortDate(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(date);
}
