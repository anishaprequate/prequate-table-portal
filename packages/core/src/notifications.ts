import { prisma } from "@prequate/db";

// Notification.type: "event_cancelled" | "member_inactive"
// | "concierge_sla_breach" | "intro_request" | "event_survey" — deliberately
// no "new_message" here. A new message already has its own unread signal
// (Message.read, surfaced on the Messages nav item); routing it through
// Notification as well used to make the member-side Notifications page a
// confusing mix of "a message arrived" pings and everything else. This is
// reserved for pings about something other than a message thread, so the
// two inboxes stay genuinely separate.
export async function createNotification(params: {
  recipientId: string;
  type: string;
  message: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
}) {
  await prisma.notification.create({
    data: {
      recipientId: params.recipientId,
      type: params.type,
      message: params.message,
      relatedEntityType: params.relatedEntityType,
      relatedEntityId: params.relatedEntityId,
    },
  });
}
