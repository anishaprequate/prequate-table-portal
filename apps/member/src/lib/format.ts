export function formatSlot(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatDateOnly(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

// Drops the storage-format leading zeros (seats are stored zero-padded to
// three digits, e.g. "011") down to a plain two-digit read, e.g. "11" — but
// keeps a single leading zero for a genuinely single-digit seat ("8" -> "08").
export function formatSeatDisplay(seatNumber: string | null | undefined): string | null {
  if (!seatNumber) return null;
  const n = parseInt(seatNumber, 10);
  return Number.isNaN(n) ? seatNumber : String(n).padStart(2, "0");
}
