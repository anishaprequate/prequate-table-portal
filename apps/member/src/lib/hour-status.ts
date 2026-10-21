// A partner who declines a request ends it as CANCELLED with no cancelledAt (so
// it never counts as a late cancellation) and a reason that starts with
// "Declined". A member who withdraws a request that was never confirmed also
// leaves cancelledAt empty, with whatever reason they gave.
export function endedLabel(b: { status: string; cancelledAt: Date | null; cancellationReason: string | null }): string {
  if (b.status !== "CANCELLED") return "";
  if (b.cancelledAt) return "cancelled";
  return b.cancellationReason?.startsWith("Declined") ? "declined" : "withdrawn";
}

// The partner's reason, without the word "Declined".
export function declineReason(reason: string | null): string | null {
  if (!reason?.startsWith("Declined")) return null;
  const text = reason.replace(/^Declined:?\s*/, "").trim();
  return text || null;
}
