// Availability from Google Calendar, READY BUT NOT SWITCHED ON.
//
// How it will work once the approach is confirmed (see
// docs/tabled-and-decisions.md):
//   - each partner keeps a dedicated calendar of recurring "Table hours" blocks
//     (User.tableHoursCalendarId). Free/busy on that calendar tells us WHEN
//     they offer Hours, without reading any event titles.
//   - free/busy on the partner's main calendar tells us what is already taken.
//   - one batched free/busy request covers every partner.
//
// This file only speaks the free/busy API. It does not know how to sign in:
// that depends on the setup chosen (a service account with domain-wide
// delegation, or each partner signing in), so the caller supplies
// `getAccessToken`. Nothing registers this provider yet.
import type { AvailabilityProvider, PartnerRef, Range } from "./availability";

const FREEBUSY = "https://www.googleapis.com/calendar/v3/freeBusy";

async function freeBusy(
  accessToken: string,
  calendarIds: string[],
  from: Date,
  to: Date,
): Promise<Record<string, Range[]>> {
  const res = await fetch(FREEBUSY, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      timeMin: from.toISOString(),
      timeMax: to.toISOString(),
      items: calendarIds.map((id) => ({ id })),
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Google free/busy failed: ${res.status} ${await res.text()}`);

  const data = (await res.json()) as { calendars?: Record<string, { busy?: { start: string; end: string }[] }> };
  const out: Record<string, Range[]> = {};
  for (const id of calendarIds) {
    out[id] = (data.calendars?.[id]?.busy ?? []).map((b) => ({ start: new Date(b.start), end: new Date(b.end) }));
  }
  return out;
}

export function createGoogleAvailabilityProvider(
  getAccessToken: (partner: PartnerRef) => Promise<string>,
): AvailabilityProvider {
  return {
    name: "google",
    async fetch(partner, from, to) {
      if (!partner.tableHoursCalendarId || !partner.email) return { windows: [], busy: [] };
      const token = await getAccessToken(partner);
      const result = await freeBusy(token, [partner.tableHoursCalendarId, partner.email], from, to);
      return { windows: result[partner.tableHoursCalendarId], busy: result[partner.email] };
    },
  };
}
