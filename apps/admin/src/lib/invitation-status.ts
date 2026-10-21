// Where one invitation stands, for the admin lists.
export function invitationStatus(a: {
  joined: boolean;
  waitlisted: boolean;
  pendingApproval: boolean;
  declinedAt: Date | null;
  invitationSentAt: Date | null;
}): { label: string; tone: "good" | "muted" | "wait" } {
  if (a.joined) return { label: "Accepted", tone: "good" };
  if (a.waitlisted) return { label: "Accepted, waitlisted", tone: "good" };
  if (a.pendingApproval) return { label: "Accepted, awaiting approval", tone: "good" };
  if (a.declinedAt) return { label: "Declined", tone: "muted" };
  if (a.invitationSentAt) return { label: "Sent, no reply", tone: "wait" };
  return { label: "Not sent", tone: "muted" };
}
