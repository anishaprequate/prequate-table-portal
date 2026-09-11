// Where a notification takes you when opened — shared by the notifications
// list and the /api/notifications/[id]/open redirect handler that marks it
// read on the way there.
export function notificationLink(notification: {
  type: string;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
}): string {
  const id = notification.relatedEntityId;
  switch (notification.relatedEntityType) {
    case "event":
      if (notification.type === "event_survey") return id ? `/events/${id}/survey` : "/events";
      return id ? `/events/${id}` : "/events";
    case "concierge":
      return id ? `/concierge/${id}` : "/concierge";
    case "intro_request":
      return id ? `/directory/requests/${id}` : "/directory";
    case "message_thread":
      return id ? `/messages/${id}` : "/messages";
    default:
      return "/home";
  }
}
