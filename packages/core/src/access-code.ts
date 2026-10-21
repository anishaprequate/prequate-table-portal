import { createHmac } from "crypto";

// The plate access code (Notion field "Access Code") is a short, hand-typed
// secret. The portal never stores it: only an HMAC keyed with a server-side
// pepper, so a leaked database alone cannot be searched for valid codes.
// HMAC rather than a slow hash because login must look a member up by code.

const DEV_PEPPER = "dev-only-pepper-do-not-use-in-production";

function pepper(): string {
  const value = process.env.ACCESS_CODE_PEPPER;
  if (value) return value;
  if (process.env.NODE_ENV === "production") {
    throw new Error("ACCESS_CODE_PEPPER is not set");
  }
  return DEV_PEPPER;
}

// Codes are typed on a phone: ignore case, spaces and dashes.
export function normalizeAccessCode(raw: string): string {
  return raw.replace(/[\s-]+/g, "").toUpperCase();
}

export function hashAccessCode(raw: string): string {
  return createHmac("sha256", pepper()).update(normalizeAccessCode(raw)).digest("hex");
}

// What the portal writes back to Notion once a code has been used. The sync
// treats any value starting with this as "retired", never as a live code.
export const ACCESS_CODE_USED_PREFIX = "USED";

export function isRetiredMarker(value: string | null | undefined): boolean {
  return Boolean(value) && value!.trim().toUpperCase().startsWith(ACCESS_CODE_USED_PREFIX);
}
