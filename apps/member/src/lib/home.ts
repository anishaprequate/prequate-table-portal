import { prisma } from "@prequate/db";
import { eventVisibleTo } from "./event-access";
import { getOpenSlots } from "./availability";
import { getRoomPulseLine } from "./partner-availability";
import { getOpenOffers, type OfferView } from "./hour-offers";

// Everything below the dial on Home. Each function reads real records and
// returns null (or an empty list) when there is nothing to say, so the page
// can leave that section out instead of showing a placeholder.

const DAY = 24 * 60 * 60 * 1000;

function monthWindow(now: Date) {
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return { start, end, daysInMonth, name: now.toLocaleDateString("en-IN", { month: "long" }) };
}

// ---------------------------------------------------------------- 1. Since

function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : `${n} ${many}`;
}

function sentence(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? "";
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

// One quiet line: what is new since the member last opened Home. Null when
// there is nothing, or when this is their first visit (nothing to compare to).
export async function getSinceLastVisit(user: { id: string; homeSeenAt: Date | null }): Promise<string | null> {
  const seen = user.homeSeenAt;
  if (!seen) return null;
  const now = new Date();

  const [events, invitations, insight, hourNotes, messages, intros] = await Promise.all([
    prisma.event.count({
      where: {
        publishedAt: { gt: seen },
        archivedAt: null,
        cancelledAt: null,
        startTime: { gte: now },
        inviteOnly: false,
        ...eventVisibleTo(user.id),
      },
    }),
    prisma.eventAttendance.count({
      where: {
        memberId: user.id,
        invited: true,
        invitationSentAt: { gt: seen },
        joined: false,
        declinedAt: null,
        event: { startTime: { gte: now }, cancelledAt: null, archivedAt: null },
      },
    }),
    prisma.insightPost.count({ where: { status: "PUBLISHED", publishedAt: { gt: seen } } }),
    prisma.brief.count({
      where: { createdAt: { gt: seen }, authorId: { not: user.id }, booking: { memberId: user.id } },
    }),
    prisma.message.count({
      where: { memberId: user.id, senderRole: { not: "MEMBER" }, createdAt: { gt: seen } },
    }),
    prisma.introductionRequest.count({ where: { targetId: user.id, routedAt: { gt: seen } } }),
  ]);

  const parts: string[] = [];
  if (invitations) parts.push(plural(invitations, "an invitation", "invitations"));
  if (events) parts.push(plural(events, "a new event", "new events"));
  if (hourNotes) parts.push("notes from an Hour");
  if (intros) parts.push(plural(intros, "an introduction", "introductions"));
  if (messages) parts.push(plural(messages, "a message", "messages"));
  if (insight) parts.push(plural(insight, "a new Insight piece", "new Insight pieces"));
  if (!parts.length) return null;

  return `Since you were last here: ${sentence(parts)}.`;
}

// ------------------------------------------------------------ 2. This month

export interface MonthHour {
  state: "booked" | "held" | "open";
  monthName: string;
  // Booked or held: the partner and when.
  partnerName?: string;
  startTime?: Date;
  bookingId?: string;
  // Open, in the last ten days of the month: the partner with a day to offer.
  invitation?: string;
}

export interface MonthQuestion {
  eventId: string;
  eventTitle: string;
  question: string;
  hostFirstName: string;
  reply: string | null;
}

export interface MonthBook {
  title: string;
  author: string | null;
  dinnerAt: Date | null;
}

export interface ThisMonth {
  // A partner moved or cancelled an Hour: three times to choose from.
  offer: OfferView | null;
  hour: MonthHour;
  question: MonthQuestion | null;
  book: MonthBook | null;
  pulseLine: string | null;
}

export async function getThisMonth(user: { id: string }): Promise<ThisMonth> {
  const now = new Date();
  const { start, end, daysInMonth, name } = monthWindow(now);

  const [bookings, questionEvent, settings, pulseLine, offers] = await Promise.all([
    prisma.booking.findMany({
      where: { memberId: user.id, status: { not: "CANCELLED" }, startTime: { gte: start, lt: end } },
      orderBy: { startTime: "asc" },
      include: { partner: { select: { name: true } } },
    }),
    prisma.event.findFirst({
      where: {
        publishedAt: { not: null },
        archivedAt: null,
        cancelledAt: null,
        startTime: { gte: now },
        dinnerQuestion: { not: null },
        hostPartnerId: { not: null },
        ...eventVisibleTo(user.id),
      },
      orderBy: { startTime: "asc" },
      include: { hostPartner: { select: { name: true } } },
    }),
    prisma.appSettings.findUnique({ where: { id: "singleton" } }),
    getRoomPulseLine(),
    getOpenOffers(user.id),
  ]);

  // Your Hour.
  const upcoming = bookings.find((b) => b.startTime >= now);
  let hour: MonthHour;
  if (upcoming) {
    hour = {
      state: "booked",
      monthName: name,
      partnerName: upcoming.partner.name,
      startTime: upcoming.startTime,
      bookingId: upcoming.id,
    };
  } else if (bookings.length) {
    const last = bookings[bookings.length - 1];
    hour = { state: "held", monthName: name, partnerName: last.partner.name, startTime: last.startTime, bookingId: last.id };
  } else {
    hour = { state: "open", monthName: name };
    const lastTenDays = now.getDate() >= daysInMonth - 9;
    if (lastTenDays) hour.invitation = await partnerWithADay(now, end, name);
  }

  // The question, and the member's own reply to it.
  let question: MonthQuestion | null = null;
  if (questionEvent?.dinnerQuestion && questionEvent.hostPartner) {
    const reply = await prisma.eventQuestionReply.findUnique({
      where: { eventId_memberId: { eventId: questionEvent.id, memberId: user.id } },
      select: { body: true },
    });
    question = {
      eventId: questionEvent.id,
      eventTitle: questionEvent.title,
      question: questionEvent.dinnerQuestion,
      hostFirstName: questionEvent.hostPartner.name.split(" ")[0],
      reply: reply?.body ?? null,
    };
  }

  const book: MonthBook | null = settings?.bookTitle
    ? { title: settings.bookTitle, author: settings.bookAuthor, dinnerAt: settings.bookDinnerAt }
    : null;

  return { offer: offers[0] ?? null, hour, question, book, pulseLine };
}

// "Your October hour is still open. Pradyumna has Thursday." Picks the partner
// with an Hour still to give this month and the soonest open day.
async function partnerWithADay(now: Date, monthEnd: Date, monthName: string): Promise<string> {
  const base = `Your ${monthName} Hour is still open.`;
  const partners = await prisma.user.findMany({ where: { role: "PARTNER" }, orderBy: { name: "asc" } });
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const grouped = await prisma.booking.groupBy({
    by: ["partnerId"],
    where: { status: { not: "CANCELLED" }, startTime: { gte: monthStart, lt: monthEnd } },
    _count: { _all: true },
  });
  const booked = new Map(grouped.map((g) => [g.partnerId, g._count._all]));

  let best: { name: string; at: Date } | null = null;
  for (const p of partners) {
    if (p.monthlyHourCapacity - (booked.get(p.id) ?? 0) <= 0) continue;
    const slots = (await getOpenSlots(p.id)).filter((s) => s.startTime > now && s.startTime < monthEnd);
    const first = slots.sort((a, b) => a.startTime.getTime() - b.startTime.getTime())[0];
    if (first && (!best || first.startTime < best.at)) best = { name: p.name.split(" ")[0], at: first.startTime };
  }
  if (!best) return base;
  const day = new Intl.DateTimeFormat("en-IN", { weekday: "long" }).format(best.at);
  return `${base} ${best.name} has ${day}.`;
}

// ------------------------------------------------------ 3. Getting ready

export interface GettingReady {
  bookingId: string;
  partnerName: string;
  partnerPhotoUrl: string | null;
  startTime: Date;
  note: string | null;
  lastNotes: string | null;
}

// For the 24 hours before an Hour: the booking note, the partner, and the
// notes from the last Hour with the same partner.
export async function getGettingReady(user: { id: string }): Promise<GettingReady | null> {
  const now = new Date();
  const booking = await prisma.booking.findFirst({
    where: {
      memberId: user.id,
      status: { in: ["REQUESTED", "CONFIRMED"] },
      startTime: { gte: now, lte: new Date(now.getTime() + DAY) },
    },
    orderBy: { startTime: "asc" },
    include: { partner: { select: { id: true, name: true, photoUrl: true } } },
  });
  if (!booking) return null;

  const previous = await prisma.booking.findFirst({
    where: {
      memberId: user.id,
      partnerId: booking.partner.id,
      startTime: { lt: now },
      status: { in: ["COMPLETED", "CONFIRMED"] },
      briefs: { some: { content: { not: null } } },
    },
    orderBy: { startTime: "desc" },
    include: { briefs: { where: { content: { not: null } }, orderBy: { createdAt: "desc" }, take: 1 } },
  });

  const notes = previous?.briefs[0]?.content?.trim() ?? null;
  return {
    bookingId: booking.id,
    partnerName: booking.partner.name,
    partnerPhotoUrl: booking.partner.photoUrl,
    startTime: booking.startTime,
    note: booking.memberContext?.trim() || null,
    lastNotes: notes ? (notes.length > 320 ? `${notes.slice(0, 317)}...` : notes) : null,
  };
}

// ---------------------------------------------------------- 4. On the day

export interface OnTheDay {
  eventId: string;
  title: string;
  venue: string | null;
  mapUrl: string | null;
  host: string | null;
  startTime: Date;
  endTime: Date;
  dress: string | null;
  arrival: string | null;
}

// On the day of an event the member has joined, from the morning until it ends.
export async function getOnTheDay(user: { id: string }): Promise<OnTheDay | null> {
  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayEnd = new Date(dayStart.getTime() + DAY);

  const attendance = await prisma.eventAttendance.findFirst({
    where: {
      memberId: user.id,
      joined: true,
      event: { cancelledAt: null, archivedAt: null, startTime: { gte: dayStart, lt: dayEnd }, endTime: { gte: now } },
    },
    orderBy: { event: { startTime: "asc" } },
    include: { event: { include: { hostPartner: { select: { name: true } } } } },
  });
  if (!attendance) return null;

  const e = attendance.event;
  const mapUrl =
    e.mapUrl?.trim() ||
    (e.location ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(e.location)}` : null);
  return {
    eventId: e.id,
    title: e.title,
    venue: e.location,
    mapUrl,
    host: e.hostPartner?.name ?? e.sponsorName ?? null,
    startTime: e.startTime,
    endTime: e.endTime,
    dress: e.dressCode,
    arrival: e.arrivalNote,
  };
}

// ------------------------------------------------------------ 5. Your seat

export interface SeatStats {
  seatedOn: Date | null;
  hoursHeld: number;
  eventsAttended: number;
  tableLine: string | null;
}

export async function getSeatStats(user: { id: string; seatingDate: Date | null; tableLine: string | null }): Promise<SeatStats> {
  const now = new Date();
  const [hoursHeld, eventsAttended] = await Promise.all([
    prisma.booking.count({
      where: { memberId: user.id, status: { in: ["CONFIRMED", "COMPLETED"] }, startTime: { lt: now } },
    }),
    prisma.eventAttendance.count({
      where: { memberId: user.id, joined: true, event: { startTime: { lt: now }, cancelledAt: null } },
    }),
  ]);
  return { seatedOn: user.seatingDate, hoursHeld, eventsAttended, tableLine: user.tableLine };
}

// The introduction sheet needs people to pick from: the same directory the
// Members page shows.
export async function getIntroductionChoices(userId: string): Promise<{ id: string; name: string }[]> {
  return prisma.user.findMany({
    where: { role: "MEMBER", directoryOptOut: false, id: { not: userId } },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}
