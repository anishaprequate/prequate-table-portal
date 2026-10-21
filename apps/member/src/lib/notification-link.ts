import { notificationPath } from "@prequate/core";

// Where a notification takes you when opened. One rule for the push, the email
// and this page, kept in @prequate/core so they cannot disagree. Types that are
// not in the member list (older notifications) fall back to Home.
export function notificationLink(notification: {
  type: string;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
}): string {
  if (notification.type === "new_message") {
    return notification.relatedEntityId ? `/messages/${notification.relatedEntityId}` : "/messages";
  }
  return notificationPath(notification);
}
