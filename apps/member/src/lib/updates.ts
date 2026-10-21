import { prisma } from "@prequate/db";
import { formatSlot } from "./format";
import { formatRelative } from "./relative-time";
import { getPartnerAvailabilityLines } from "./partner-availability";
import { eventVisibleTo } from "./event-access";

export type UpdateKind = "hour" | "event" | "intro" | "message" | "insight";

export interface UpdateItem {
  key: string;
  kind: UpdateKind;
  // "nudge" is something the member could act on; "info" is just status.
  tone: "info" | "nudge";
  title: string;
  detail: string;
  tag?: string;
  href: string;
  // Present when the item is about a point in time, so the page can show a
  // live "in 2 days".
  startsAt?: string;
  whenText?: string;
}

const MAX_UPDATES = 7;

function plainText(html: string | null): string {
  return (html ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
}

// Words from the member's sector worth looking for in an event's text, e.g.
// "Consumer Tech" gives ["consumer", "tech"]. Short words are skipped so a
// two-letter fragment never matches by accident.
function sectorWords(sector: string | null): string[] {
  if (!sector) return [];
  return sector
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((w) => w.length >= 4 || w === sector.toLowerCase());
}

// The "what is happening for me" list on Home. Every line is backed by a
// real record: a booking, an RSVP, an event, a count. Nothing is guessed
// beyond a plain text match between the member's sector and the event.
export async function getUpdates(user: { id: string; sector: string | null }): Promise<UpdateItem[]> {
  const now = new Date();

  const [nextBooking, events, myRsvps, pendingIntros, unreadMessages, unreadInsight, availability] = await Promise.all([
    prisma.booking.findFirst({
      where: { memberId: user.id, startTime: { gte: now }, status: { not: "CANCELLED" } },
      orderBy: { startTime: "asc" },
      include: { partner: { select: { name: true } } },
    }),
    prisma.event.findMany({
      where: {
        publishedAt: { not: null },
        archivedAt: null,
        cancelledAt: null,
        startTime: { gte: now },
        ...eventVisibleTo(user.id),
      },
      orderBy: { startTime: "asc" },
      take: 8,
    }),
    prisma.eventAttendance.findMany({
      where: { memberId: user.id },
      select: { eventId: true, invited: true, joined: true, waitlisted: true, pendingApproval: true, declinedAt: true },
    }),
    prisma.introductionRequest.count({
      where: { targetId: user.id, routedAt: { not: null }, status: "SENT" },
    }),
    prisma.message.count({ where: { memberId: user.id, senderRole: { not: "MEMBER" }, read: false } }),
    prisma.insightPost.count({ where: { status: "PUBLISHED", views: { none: { memberId: user.id } } } }),
    getPartnerAvailabilityLines(),
  ]);

  const items: UpdateItem[] = [];

  // 1. The Hour.
  if (nextBooking) {
    items.push({
      key: "hour",
      kind: "hour",
      tone: "info",
      title: `Your Hour with ${nextBooking.partner.name.split(" ")[0]}`,
      detail: formatSlot(nextBooking.startTime),
      href: `/the-hour/${nextBooking.id}`,
      startsAt: nextBooking.startTime.toISOString(),
      whenText: formatRelative(nextBooking.startTime, now),
    });
  } else {
    items.push({
      key: "hour-book",
      kind: "hour",
      tone: "nudge",
      title: "Book your Hour",
      detail: availability.length > 0 ? availability.map((l) => l.text).join(" ") : "Time with a partner, on your terms.",
      href: "/the-hour/book",
    });
  }

  // 2. Events the member has already responded to.
  const mine = new Map(myRsvps.map((r) => [r.eventId, r]));
  const visible = events;

  // An invitation to a closed event comes first: it is waiting on an answer.
  for (const e of visible) {
    const r = mine.get(e.id);
    if (!e.inviteOnly || !r?.invited || r.declinedAt || r.joined || r.waitlisted || r.pendingApproval) continue;
    items.push({
      key: `invite-${e.id}`,
      kind: "event",
      tone: "nudge",
      title: `You're invited: ${e.title}`,
      detail: `${formatSlot(e.startTime)}. Accept or decline.`,
      tag: "By invitation",
      href: `/events/${e.id}`,
      startsAt: e.startTime.toISOString(),
      whenText: formatRelative(e.startTime, now),
    });
  }

  for (const e of visible) {
    const r = mine.get(e.id);
    if (!r?.joined && !r?.waitlisted && !r?.pendingApproval) continue;
    items.push({
      key: `event-${e.id}`,
      kind: "event",
      tone: "info",
      title: r.joined ? `You're going: ${e.title}` : r.waitlisted ? `Waitlisted: ${e.title}` : `Awaiting approval: ${e.title}`,
      detail: formatSlot(e.startTime),
      href: `/events/${e.id}`,
      startsAt: e.startTime.toISOString(),
      whenText: formatRelative(e.startTime, now),
    });
  }

  // 3. Events the member has not signed up for: a nudge, made specific when
  // the event text mentions their sector or peers in their sector are going.
  const unsigned = visible.filter(
    (e) => !e.inviteOnly && !mine.get(e.id)?.joined && !mine.get(e.id)?.waitlisted && !mine.get(e.id)?.pendingApproval,
  );
  const words = sectorWords(user.sector);

  const peerCounts = await Promise.all(
    unsigned.slice(0, 3).map((e) =>
      user.sector
        ? prisma.eventAttendance.count({
            where: { eventId: e.id, joined: true, memberId: { not: user.id }, member: { sector: user.sector } },
          })
        : Promise.resolve(0),
    ),
  );

  unsigned.slice(0, 3).forEach((e, i) => {
    const text = `${e.title.toLowerCase()} ${plainText(e.description)}`;
    const mentionsSector = words.some((w) => text.includes(w));
    const peers = peerCounts[i];

    const reasons: string[] = [];
    let tag = "Open to you";
    if (mentionsSector && user.sector) {
      reasons.push(`This one looks relevant to your work in ${user.sector}. You should join.`);
      tag = `For ${user.sector}`;
    }
    if (peers > 0 && user.sector) {
      reasons.push(`${peers} other ${user.sector} member${peers === 1 ? " is" : "s are"} going.`);
      if (!mentionsSector) tag = "Your sector is going";
    }
    if (reasons.length === 0) reasons.push("You have not signed up yet.");

    items.push({
      key: `event-nudge-${e.id}`,
      kind: "event",
      tone: "nudge",
      title: e.title,
      detail: `${formatSlot(e.startTime)}. ${reasons.join(" ")}`,
      tag,
      href: `/events/${e.id}`,
      startsAt: e.startTime.toISOString(),
      whenText: formatRelative(e.startTime, now),
    });
  });

  // 4. Things waiting on the member.
  if (pendingIntros > 0) {
    items.push({
      key: "intros",
      kind: "intro",
      tone: "nudge",
      title: `${pendingIntros} introduction${pendingIntros === 1 ? "" : "s"} waiting for your reply`,
      detail: "Accept or decline from Members.",
      href: "/members?tab=received",
    });
  }
  if (unreadMessages > 0) {
    items.push({
      key: "messages",
      kind: "message",
      tone: "info",
      title: `${unreadMessages} unread message${unreadMessages === 1 ? "" : "s"}`,
      detail: "From your relationship manager or a partner.",
      href: "/messages",
    });
  }
  if (unreadInsight > 0) {
    items.push({
      key: "insight",
      kind: "insight",
      tone: "info",
      title: `${unreadInsight} new Insight post${unreadInsight === 1 ? "" : "s"}`,
      detail: "Written for the Table since your last visit.",
      href: "/insight",
    });
  }

  return items.slice(0, MAX_UPDATES);
}
