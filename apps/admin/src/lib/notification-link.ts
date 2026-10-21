// Where a notification takes an admin when opened — shared by the
// notifications list and the /api/notifications/[id]/open redirect
// handler that marks it read on the way there. Mirrors the member app's
// version, with admin-side routes.
export function notificationLink(notification: {
  relatedEntityType: string | null;
  relatedEntityId: string | null;
}): string {
  const id = notification.relatedEntityId;
  switch (notification.relatedEntityType) {
    case "member":
      return id ? `/members/${id}` : "/members";
    case "booking":
      return id ? `/bookings/${id}` : "/bookings";
    case "advisor_request":
      return "/advisors";
    case "event":
      return id ? `/events/${id}` : "/events";
    default:
      return "/reports";
  }
}
