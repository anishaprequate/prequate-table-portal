import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

// Admin passwords are stored only as a salted scrypt hash, in the form
// "scrypt$<salt>$<hash>". The set-password command (scripts/set-password.cjs)
// writes the same format.

export const PASSWORD_MIN_LENGTH = 8;
const KEY_LENGTH = 64;

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export function hashPassword(plain: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(plain, salt, KEY_LENGTH).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(plain: string, stored: string | null | undefined): boolean {
  if (!stored) return false;
  const [scheme, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const actual = scryptSync(plain, salt, expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
