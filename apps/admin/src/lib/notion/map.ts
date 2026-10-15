// Pure mapping between Notion page JSON and portal fields. No I/O here, so it
// can be tested without a token.
import type { NotionPage } from "./client";

const plain = (rich: any[] | undefined): string =>
  (rich ?? []).map((r) => r.plain_text ?? "").join("").trim();

export interface MasterRow {
  pageId: string;
  name: string;
  status: string; // Prospect | Invited | Onboarding | Active Member | Declined
  seatNumber: string | null; // "001"
  company: string | null;
  sector: string | null; // first of the multi-select
  archetype: string | null;
  email: string | null;
  phone: string | null;
  accessCode: string | null;
  lastTouch: string | null; // ISO date
}

export interface ActivityRow {
  pageId: string;
  masterPageId: string | null;
  portalAccountId: string | null;
  city: string | null;
  seatedOn: string | null; // ISO date
}

// Seat numbers are stored as zero-padded strings ("001") in the portal.
export function padSeat(n: number | null | undefined): string | null {
  if (n == null || !Number.isFinite(n)) return null;
  return String(Math.trunc(n)).padStart(3, "0");
}

// Indian mobile numbers from Notion come in many shapes. Keep digits, and
// make a 10-digit number "+91XXXXXXXXXX" so it matches how members sign in.
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/[^\d]/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) return `+91${digits.slice(1)}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  if (digits.length >= 8) return `+${digits}`;
  return null;
}

export function readMasterRow(page: NotionPage): MasterRow {
  const p = page.properties;
  const email = p["Email"]?.email || p["Secondary Email"]?.email || null;
  const phone = normalizePhone(p["Phone"]?.phone_number) ?? normalizePhone(p["Phone 2"]?.phone_number);
  return {
    pageId: page.id,
    name: plain(p["Name"]?.title),
    status: p["Status"]?.select?.name ?? "",
    seatNumber: padSeat(p["Seat Number"]?.number),
    company: plain(p["Company"]?.rich_text) || null,
    sector: p["Sector"]?.multi_select?.[0]?.name ?? null,
    archetype: p["Archetype"]?.select?.name ?? null,
    email: email ? String(email).trim().toLowerCase() : null,
    phone,
    accessCode: plain(p["Access Code"]?.rich_text) || null,
    lastTouch: p["Last Touch Date"]?.date?.start ?? null,
  };
}

export function readActivityRow(page: NotionPage): ActivityRow {
  const p = page.properties;
  return {
    pageId: page.id,
    masterPageId: p["Member"]?.relation?.[0]?.id ?? null,
    portalAccountId: plain(p["Portal Account ID"]?.rich_text) || null,
    city: plain(p["City"]?.rich_text) || null,
    seatedOn: p["Seated On"]?.date?.start ?? null,
  };
}

// Fields a member can change in the portal. A synced value is skipped for any
// field in this list, so a member's own edit is never overwritten.
export type EditableField = "name" | "email";

export function parseEdited(json: string | null | undefined): Set<string> {
  if (!json) return new Set();
  try {
    const parsed = JSON.parse(json);
    return new Set(Array.isArray(parsed) ? parsed.map(String) : []);
  } catch {
    return new Set();
  }
}

export function newerDate(a: string | null, b: Date | null): string | null {
  const aTime = a ? new Date(a).getTime() : 0;
  const bTime = b ? b.getTime() : 0;
  if (!aTime && !bTime) return null;
  return bTime > aTime ? b!.toISOString() : null; // null means "leave Notion as is"
}
