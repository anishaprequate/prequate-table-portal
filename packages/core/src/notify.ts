// Every member notification goes through here, so the list in
// docs/notifications.md is the one place that decides what is sent and how.
//
// For each type the registry says whether it is pushed, whether it is emailed,
// and whether it appears on the Notifications page. notifyMember does the rest:
// it writes the in-app row, holds a push through quiet hours (9 pm to 8 am),
// sends the push to each of the member's devices, and sends the email.
//
// Push uses web-push with the VAPID keys in the env file. With the keys missing,
// or PUSH_DISABLED=1, a push is only logged, so nothing breaks without setup.
import webpush from "web-push";
import { prisma } from "@prequate/db";
import { sendEmail } from "./integrations/mailer";

export type NotificationIcon = "event" | "hour" | "message" | "people" | "request" | "post" | "survey" | "digest" | "alert";

export interface TypeConfig {
  // Short heading on the push, and the label of the type.
  title: string;
  icon: NotificationIcon;
  push: boolean;
  // Sent by email as well. emailPref gates it on the member's own setting;
  // null means a confirmation they always get.
  email: boolean;
  emailPref: "hours" | "events" | "surveys" | null;
  // Shown on the Notifications page.
  inApp: boolean;
  // Goes out at once even in quiet hours (a live conversation).
  quietExempt?: boolean;
}

const T = (c: Partial<TypeConfig> & Pick<TypeConfig, "title" | "icon">): TypeConfig => ({
  push: false,
  email: false,
  emailPref: null,
  inApp: true,
  ...c,
});

// The list, as decided. Keys are the Notification.type values.
export const NOTIFICATION_TYPES: Record<string, TypeConfig> = {
  // 1. Invited to a closed event.
  event_invited: T({ title: "You are invited", icon: "event", push: true, email: true, emailPref: "events" }),
  // 2. An Hour changes.
  hour_confirmed: T({ title: "Your Hour is confirmed", icon: "hour", push: true }),
  hour_offer: T({ title: "Other times for your Hour", icon: "hour", push: true }),
  hour_declined: T({ title: "Your Hour request", icon: "hour", push: true }),
  hour_cancelled: T({ title: "Your Hour is cancelled", icon: "hour", push: true }),
  hour_moved: T({ title: "Your Hour has moved", icon: "hour", push: true }),
  hour_place: T({ title: "The place is confirmed", icon: "hour", push: true }),
  advisor_offer: T({ title: "Your advisor Hour", icon: "hour", push: true }),
  // 3. A partner posted after an Hour.
  hour_post: T({ title: "From your partner", icon: "post", push: true }),
  // 4 and 12. The day before and the morning of an event.
  event_tomorrow: T({ title: "Tomorrow at the Table", icon: "event", push: true, email: true, emailPref: "events" }),
  event_today: T({ title: "Today at the Table", icon: "event", push: true, email: true, emailPref: "events" }),
  // 5. An event is cancelled or moved.
  event_cancelled: T({ title: "Event cancelled", icon: "alert", push: true, email: true, emailPref: "events" }),
  event_moved: T({ title: "Event updated", icon: "alert", push: true, email: true, emailPref: "events" }),
  // 6 and 7. A seat.
  waitlist_seat: T({ title: "You have a seat", icon: "event", push: true }),
  rsvp_approved: T({ title: "Your RSVP is approved", icon: "event", push: true }),
  // 8 and 9. Introductions.
  intro_routed: T({ title: "An introduction", icon: "people", push: true }),
  intro_accepted: T({ title: "Introduction accepted", icon: "people", push: true }),
  intro_declined: T({ title: "Introduction", icon: "people" }),
  // 10. A request from Home is done.
  request_done: T({ title: "Your request is done", icon: "request", push: true, email: true }),
  // 11. A message from the team. Push only: the Messages badge is the in-app signal.
  message: T({ title: "A new message", icon: "message", push: true, inApp: false, quietExempt: true }),
  // 13. An Hour starts in an hour.
  hour_soon: T({ title: "Your Hour starts soon", icon: "hour", push: true }),
  // 14. A dinner question.
  dinner_question: T({ title: "A question for the dinner", icon: "event", push: true }),
  // 15. New at the Table, once a day.
  digest: T({ title: "New at the Table", icon: "digest", push: true }),
  // In the app only.
  photos_up: T({ title: "Photos are up", icon: "event" }),
  event_survey: T({ title: "How was it?", icon: "survey", email: true, emailPref: "surveys" }),
  member_inactive: T({ title: "Member quiet", icon: "alert" }),
};

export const QUIET_START_HOUR = 21;
export const QUIET_END_HOUR = 8;

export function isQuietTime(d = new Date()): boolean {
  const h = d.getHours();
  return h >= QUIET_START_HOUR || h < QUIET_END_HOUR;
}

// When a push that would go out now may actually go: now, or 8 am.
export function nextPushTime(d = new Date()): Date {
  if (!isQuietTime(d)) return d;
  const n = new Date(d);
  if (d.getHours() >= QUIET_START_HOUR) n.setDate(n.getDate() + 1);
  n.setHours(QUIET_END_HOUR, 0, 0, 0);
  return n;
}

export function appUrl(): string {
  return (process.env.MEMBER_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

// The screen each notification opens. One place, used by the push, the email and
// the Notifications page, so they cannot disagree.
export function notificationPath(n: { type: string; relatedEntityType?: string | null; relatedEntityId?: string | null }): string {
  const id = n.relatedEntityId ?? null;
  switch (n.type) {
    case "event_survey":
      return id ? `/events/${id}/survey` : "/events";
    case "event_invited":
    case "event_tomorrow":
    case "event_today":
    case "event_cancelled":
    case "event_moved":
    case "waitlist_seat":
    case "rsvp_approved":
    case "photos_up":
      return id ? `/events/${id}` : "/events";
    case "hour_confirmed":
    case "hour_offer":
    case "hour_declined":
    case "hour_cancelled":
    case "hour_moved":
    case "hour_place":
    case "hour_post":
    case "hour_soon":
      return id ? `/the-hour/${id}` : "/the-hour";
    case "advisor_offer":
      return "/the-hour";
    case "intro_routed":
    case "intro_accepted":
    case "intro_declined":
      return id ? `/members/requests/${id}` : "/members";
    case "request_done":
      return id ? `/requests/${id}` : "/home";
    case "message":
      return id ? `/messages/${id}` : "/messages";
    case "dinner_question":
      return "/home";
    case "digest":
      return id ? `/events/${id}` : "/events";
    default:
      return "/home";
  }
}

// ---------------------------------------------------------------- push

let vapidReady: boolean | null = null;

function ensureVapid(): boolean {
  if (vapidReady !== null) return vapidReady;
  const pub = process.env.VAPID_PUBLIC_KEY ?? process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:anisha@prequate.one";
  if (!pub || !priv) {
    vapidReady = false;
    return false;
  }
  webpush.setVapidDetails(subject, pub.trim(), priv.trim());
  vapidReady = true;
  return true;
}

export interface PushPayload {
  title: string;
  body: string;
  // Where a tap goes. Always a path on the member app.
  url: string;
  // A second push with the same tag replaces the first on the phone.
  tag?: string;
}

// Sends one push to every device the member has allowed. Returns how many went.
export async function sendPushToMember(memberId: string, payload: PushPayload): Promise<number> {
  const subs = await prisma.pushSubscription.findMany({ where: { userId: memberId } });
  if (subs.length === 0) return 0;
  if (process.env.PUSH_DISABLED === "1" || !ensureVapid()) {
    console.log(`[mock-push] to ${memberId} (${subs.length} device${subs.length === 1 ? "" : "s"}): ${payload.title} | ${payload.body} -> ${payload.url}`);
    return 0;
  }

  let sent = 0;
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload),
        { TTL: 12 * 60 * 60, urgency: "normal" },
      );
      sent++;
      await prisma.pushSubscription.update({ where: { id: sub.id }, data: { lastUsedAt: new Date() } });
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode;
      // The device removed the permission or uninstalled: forget it.
      if (status === 404 || status === 410) await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
      else console.log(`[push] failed for a device of ${memberId}: ${status ?? (e as Error).message}`);
    }
  }
  return sent;
}

// ------------------------------------------------------------ notify

const EMAIL_PREF_FIELD = { hours: "emailHourReminders", events: "emailEventBlasts", surveys: "emailEventSurveys" } as const;

export interface NotifyParams {
  memberId: string;
  type: string;
  // One line, what the member reads on the push, the page and the email.
  message: string;
  entityType?: string;
  entityId?: string;
  // Replaces the default email. Pass null to send no email even if the type has one.
  email?: { subject: string; text: string } | null;
  // Overrides the registry, for the few cases that differ by situation.
  push?: boolean;
  // Replaces the earlier push on the phone with the same tag.
  tag?: string;
  // Replaces the heading of the push and the email subject.
  title?: string;
}

// Writes the in-app row, pushes (held through quiet hours), and emails.
// Never throws: a notification that fails must not undo the action behind it.
export async function notifyMember(p: NotifyParams): Promise<{ id: string | null }> {
  try {
    const cfg = NOTIFICATION_TYPES[p.type];
    if (!cfg) throw new Error(`Unknown notification type ${p.type}`);
    const now = new Date();
    const wantsPush = p.push ?? cfg.push;
    const due = wantsPush ? (cfg.quietExempt ? now : nextPushTime(now)) : null;

    let id: string | null = null;
    if (cfg.inApp) {
      const row = await prisma.notification.create({
        data: {
          recipientId: p.memberId,
          type: p.type,
          message: p.message,
          relatedEntityType: p.entityType,
          relatedEntityId: p.entityId,
          pushDueAt: due,
        },
      });
      id = row.id;
    }

    const path = notificationPath({ type: p.type, relatedEntityType: p.entityType, relatedEntityId: p.entityId });

    if (wantsPush && due && due <= now) {
      // The tap opens the notification, which marks it read and goes to the screen.
      await sendPushToMember(p.memberId, {
        title: p.title ?? cfg.title,
        body: p.message,
        url: id ? `/api/notifications/${id}/open` : path,
        tag: p.tag,
      });
      if (id) await prisma.notification.update({ where: { id }, data: { pushedAt: new Date() } });
    }

    const wantsEmail = p.email === null ? false : Boolean(p.email) || cfg.email;
    if (wantsEmail) {
      const member = await prisma.user.findUnique({ where: { id: p.memberId } });
      const allowed = member && (!cfg.emailPref || (member as unknown as Record<string, boolean>)[EMAIL_PREF_FIELD[cfg.emailPref]] !== false);
      if (member?.email && allowed) {
        const mail = p.email ?? { subject: p.title ?? cfg.title, text: `${p.message}\n\n${appUrl()}${path}` };
        await sendEmail({ to: member.email, subject: mail.subject, text: mail.text }).catch((e) =>
          console.log(`[email] failed for ${p.memberId}: ${(e as Error).message}`),
        );
      }
    }
    return { id };
  } catch (e) {
    console.log(`[notify] ${p.type} for ${p.memberId} failed: ${(e as Error).message}`);
    return { id: null };
  }
}

// Pushes that were held through quiet hours go out once their time has come.
export async function sendHeldPushes(): Promise<number> {
  const now = new Date();
  const held = await prisma.notification.findMany({
    where: { pushDueAt: { not: null, lte: now }, pushedAt: null },
    orderBy: { pushDueAt: "asc" },
    take: 500,
  });
  for (const n of held) {
    const cfg = NOTIFICATION_TYPES[n.type];
    await sendPushToMember(n.recipientId, {
      title: cfg?.title ?? "The Prequate Table",
      body: n.message,
      url: `/api/notifications/${n.id}/open`,
    });
    await prisma.notification.update({ where: { id: n.id }, data: { pushedAt: new Date() } });
  }
  return held.length;
}

export function adminUrl(): string {
  return (process.env.ADMIN_APP_URL ?? "http://localhost:3001").replace(/\/$/, "");
}

// A notification to someone on the team (a partner or an admin): on their bell in
// admin, and, when `emailPath` is given, by email with a link into admin. Team
// notifications are never pushed.
export async function notifyTeam(p: {
  userId: string;
  type: string;
  message: string;
  entityType?: string;
  entityId?: string;
  emailSubject?: string;
  emailPath?: string;
}): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        recipientId: p.userId,
        type: p.type,
        message: p.message,
        relatedEntityType: p.entityType,
        relatedEntityId: p.entityId,
      },
    });
    if (p.emailSubject && p.emailPath) {
      const user = await prisma.user.findUnique({ where: { id: p.userId }, select: { email: true } });
      if (user?.email) {
        await sendEmail({ to: user.email, subject: p.emailSubject, text: `${p.message}\n\n${adminUrl()}${p.emailPath}` }).catch((e) =>
          console.log(`[email] failed for team member ${p.userId}: ${(e as Error).message}`),
        );
      }
    }
  } catch (e) {
    console.log(`[notifyTeam] ${p.type} for ${p.userId} failed: ${(e as Error).message}`);
  }
}
