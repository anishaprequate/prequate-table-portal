import { shortSlot, shortDay } from "./stable-date";

// Written the same on the server and in every browser: see stable-date.ts.
export function formatSlot(date: Date): string {
  return shortSlot(date);
}

export function formatDateOnly(date: Date): string {
  return `${shortDay(date)} ${date.getFullYear()}`;
}

// Drops the storage-format leading zeros (seats are stored zero-padded to
// three digits, e.g. "011") down to a plain two-digit read, e.g. "11" — but
// keeps a single leading zero for a genuinely single-digit seat ("8" -> "08").
export function formatSeatDisplay(seatNumber: string | null | undefined): string | null {
  if (!seatNumber) return null;
  const n = parseInt(seatNumber, 10);
  return Number.isNaN(n) ? seatNumber : String(n).padStart(2, "0");
}
