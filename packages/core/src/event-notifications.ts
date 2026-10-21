// The notifications that belong to an event: invitation, dinner question, a seat,
// cancelled, changed. Used by admin (publishing, inviting, approving, cancelling)
// and by the member app (a member joining). Each sends once, tracked by a marker
// on the attendance, so running a step twice never tells anyone twice.
import { prisma } from "@prequate/db";
import { notifyMember, appUrl } from "./notify";

const dayTime = (d: Date) =>
  new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(d);

type EventLite = { id: string; title: string; startTime: Date; location: string | null };

const whenWhere = (e: EventLite) => `${dayTime(e.startTime)}${e.location ? `, ${e.location}` : ""}`;
const link = (e: { id: string }) => `${appUrl()}/events/${e.id}`;

// Invitations that have been released and not yet announced.
export async function notifyNewInvitations(eventId: string): Promise<number> {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event || !event.publishedAt || event.cancelledAt) return 0;
  const rows = await prisma.eventAttendance.findMany({
    where: { eventId, invited: true, invitationSentAt: { not: null }, invitationNotifiedAt: null, declinedAt: null },
  });
  for (const row of rows) {
    await prisma.eventAttendance.update({ where: { id: row.id }, data: { invitationNotifiedAt: new Date() } });
    await notifyMember({
      memberId: row.memberId,
      type: "event_invited",
      message: `You are invited to ${event.title}, ${dayTime(event.startTime)}.`,
      entityType: "event",
      entityId: event.id,
      email: {
        subject: `You are invited: ${event.title}`,
        text: `You are invited to ${event.title}.\n\n${whenWhere(event)}\n\nReply from The Prequate Table:\n${link(event)}`,
      },
    });
  }
  return rows.length;
}

// A question for the dinner, to members who are going and have not been told. An
// invited member is asked once they say yes, not before. With memberId, only that
// member (someone who has just joined).
export async function notifyDinnerQuestion(eventId: string, memberId?: string): Promise<number> {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event || !event.publishedAt || event.cancelledAt || !event.dinnerQuestion || event.startTime < new Date()) return 0;
  const rows = await prisma.eventAttendance.findMany({
    where: {
      eventId,
      questionNotifiedAt: null,
      ...(memberId ? { memberId } : {}),
      joined: true,
    },
  });
  const q = event.dinnerQuestion.length > 120 ? `${event.dinnerQuestion.slice(0, 117).trim()}…` : event.dinnerQuestion;
  for (const row of rows) {
    await prisma.eventAttendance.update({ where: { id: row.id }, data: { questionNotifiedAt: new Date() } });
    await notifyMember({
      memberId: row.memberId,
      type: "dinner_question",
      message: `A question for ${event.title}: ${q}`,
      entityType: "event",
      entityId: event.id,
    });
  }
  return rows.length;
}

// Told that a seat is theirs: an approved RSVP, or a place off the waitlist.
export async function notifySeat(attendanceId: string, kind: "rsvp_approved" | "waitlist_seat"): Promise<void> {
  const row = await prisma.eventAttendance.findUnique({ where: { id: attendanceId }, include: { event: true } });
  if (!row || !row.joined || row.event.cancelledAt) return;
  await notifyMember({
    memberId: row.memberId,
    type: kind,
    message:
      kind === "rsvp_approved"
        ? `Your RSVP for ${row.event.title} is approved. ${dayTime(row.event.startTime)}.`
        : `A seat opened at ${row.event.title}, and it is yours. ${dayTime(row.event.startTime)}.`,
    entityType: "event",
    entityId: row.event.id,
  });
}

// Everyone with a place, a pending RSVP or a waitlist spot.
export async function notifyEventCancelled(eventId: string, reason: string | null): Promise<number> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { attendances: { where: { OR: [{ joined: true }, { waitlisted: true }, { pendingApproval: true }] } } },
  });
  if (!event) return 0;
  for (const a of event.attendances) {
    await notifyMember({
      memberId: a.memberId,
      type: "event_cancelled",
      message: `${event.title}, ${dayTime(event.startTime)}, has been cancelled.${reason ? ` ${reason}` : ""}`,
      entityType: "event",
      entityId: event.id,
      email: {
        subject: `${event.title} is cancelled`,
        text: `${event.title} on ${dayTime(event.startTime)} has been cancelled.${reason ? `\n\n${reason}` : ""}\n\n${link(event)}`,
      },
    });
  }
  return event.attendances.length;
}

// A change that matters to anyone going or invited: the place or the time.
export async function notifyEventChanged(eventId: string, what: string): Promise<number> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      attendances: { where: { OR: [{ joined: true }, { invited: true, invitationSentAt: { not: null }, declinedAt: null }] } },
    },
  });
  if (!event || !event.publishedAt || event.cancelledAt || event.startTime < new Date()) return 0;
  for (const a of event.attendances) {
    await notifyMember({
      memberId: a.memberId,
      type: "event_moved",
      message: `${event.title} has changed. ${what}`,
      entityType: "event",
      entityId: event.id,
      email: {
        subject: `${event.title} has changed`,
        text: `${event.title} has changed.\n\n${what}\n\nNow: ${whenWhere(event)}\n\n${link(event)}`,
      },
    });
  }
  return event.attendances.length;
}
