// Google Calendar client.
//
// Availability (getPartnerAvailability) is always mocked — that stands in
// for reading each partner's own connected calendar, which isn't part of
// this integration.
//
// Event creation/reschedule/cancellation for The Hour is real whenever a
// GoogleCalendarConnection row exists (an admin has connected an account
// via the admin console's Settings page): those calls hit the real Google
// Calendar API and create a real event on that connected account's
// calendar. With no connection, the same functions fall back to the
// original deterministic mock, so the app still runs with zero setup.
import { prisma } from "@prequate/db";
import { refreshAccessToken } from "./google-oauth";

export interface CalendarSlot {
  startTime: Date;
  endTime: Date;
}

export interface CalendarEventRef {
  googleCalendarEventId: string;
}

const SLOT_DURATION_MINUTES = 45;
const BUSINESS_HOUR_START = 10;
const BUSINESS_HOUR_END = 17;
const CALENDAR_API = "https://www.googleapis.com/calendar/v3";

/**
 * Deterministic mock availability: business-hour slots, skipping weekends,
 * from tomorrow through the end of *next* calendar month — always exactly
 * the current month and the immediately following one, no staggered
 * early-open logic or day-count countdown. Real implementation would read
 * the partner's connected Google Calendar free/busy data.
 */
export function getPartnerAvailability(partnerId: string): CalendarSlot[] {
  const slots: CalendarSlot[] = [];
  const now = new Date();

  const rangeEnd = new Date(now.getFullYear(), now.getMonth() + 2, 1); // start of the month after next
  const day = new Date(now);
  day.setDate(day.getDate() + 1);
  day.setHours(0, 0, 0, 0);

  while (day < rangeEnd) {
    const isWeekend = day.getDay() === 0 || day.getDay() === 6;
    if (!isWeekend) {
      for (let hour = BUSINESS_HOUR_START; hour < BUSINESS_HOUR_END; hour++) {
        const startTime = new Date(day);
        startTime.setHours(hour, 0, 0, 0);
        const endTime = new Date(startTime.getTime() + SLOT_DURATION_MINUTES * 60_000);
        slots.push({ startTime, endTime });
      }
    }
    day.setDate(day.getDate() + 1);
  }

  return slots;
}

async function getActiveConnection(): Promise<{ calendarId: string; accessToken: string } | null> {
  const connection = await prisma.googleCalendarConnection.findFirst({
    orderBy: { createdAt: "desc" },
  });
  if (!connection) return null;

  // Refresh a little before actual expiry to avoid racing the API call.
  const needsRefresh = connection.expiresAt.getTime() - Date.now() < 60_000;
  if (!needsRefresh) {
    return { calendarId: connection.accountEmail, accessToken: connection.accessToken };
  }

  const refreshed = await refreshAccessToken(connection.refreshToken);
  await prisma.googleCalendarConnection.update({
    where: { id: connection.id },
    data: { accessToken: refreshed.accessToken, expiresAt: refreshed.expiresAt },
  });

  return { calendarId: connection.accountEmail, accessToken: refreshed.accessToken };
}

export async function createCalendarEvent(params: {
  partnerId: string;
  partnerName: string;
  partnerEmail?: string | null;
  memberName: string;
  memberEmail?: string | null;
  memberContext?: string | null;
  startTime: Date;
  endTime: Date;
}): Promise<CalendarEventRef> {
  const connection = await getActiveConnection();

  if (!connection) {
    const id = `mock-gcal-${params.partnerId}-${params.startTime.getTime()}`;
    return { googleCalendarEventId: id };
  }

  const attendees = [
    params.memberEmail ? { email: params.memberEmail, displayName: params.memberName } : null,
    params.partnerEmail ? { email: params.partnerEmail, displayName: params.partnerName } : null,
  ].filter((a): a is { email: string; displayName: string } => a !== null);

  const descriptionLines = [
    "Booked via The Prequate Table member portal.",
    "",
    `Member: ${params.memberName}${params.memberEmail ? ` (${params.memberEmail})` : ""}`,
    `Partner: ${params.partnerName}`,
  ];
  if (params.memberContext) {
    descriptionLines.push("", "What the member shared ahead of the session:", `"${params.memberContext}"`);
  }

  const response = await fetch(
    `${CALENDAR_API}/calendars/${encodeURIComponent(connection.calendarId)}/events`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${connection.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: `The Hour: ${params.memberName} × ${params.partnerName}`,
        description: descriptionLines.join("\n"),
        start: { dateTime: params.startTime.toISOString() },
        end: { dateTime: params.endTime.toISOString() },
        attendees,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Google Calendar event creation failed: ${response.status} ${await response.text()}`);
  }

  const event = (await response.json()) as { id: string };
  return { googleCalendarEventId: event.id };
}

export async function createEventCalendarEntry(params: {
  eventId: string;
  title: string;
  description?: string | null;
  location?: string | null;
  memberName: string;
  memberEmail?: string | null;
  startTime: Date;
  endTime: Date;
}): Promise<CalendarEventRef> {
  const connection = await getActiveConnection();

  if (!connection) {
    const id = `mock-gcal-event-${params.eventId}-${params.memberEmail ?? params.memberName}`;
    return { googleCalendarEventId: id };
  }

  const attendees = params.memberEmail
    ? [{ email: params.memberEmail, displayName: params.memberName }]
    : [];

  const response = await fetch(
    `${CALENDAR_API}/calendars/${encodeURIComponent(connection.calendarId)}/events`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${connection.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: params.title,
        description: params.description ? params.description.replace(/<[^>]+>/g, " ").trim() : undefined,
        location: params.location ?? undefined,
        start: { dateTime: params.startTime.toISOString() },
        end: { dateTime: params.endTime.toISOString() },
        attendees,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Google Calendar event creation failed: ${response.status} ${await response.text()}`);
  }

  const event = (await response.json()) as { id: string };
  return { googleCalendarEventId: event.id };
}

export async function cancelCalendarEvent(googleCalendarEventId: string): Promise<void> {
  const connection = await getActiveConnection();
  if (!connection) return;
  if (googleCalendarEventId.startsWith("mock-gcal-")) return;

  await fetch(
    `${CALENDAR_API}/calendars/${encodeURIComponent(connection.calendarId)}/events/${googleCalendarEventId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${connection.accessToken}` },
    },
  );
}

async function updateEventAttendees(params: {
  googleCalendarEventId: string;
  attendees: { email: string; displayName?: string }[];
}): Promise<void> {
  const connection = await getActiveConnection();
  if (!connection || params.googleCalendarEventId.startsWith("mock-gcal-")) return;

  await fetch(
    `${CALENDAR_API}/calendars/${encodeURIComponent(connection.calendarId)}/events/${params.googleCalendarEventId}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${connection.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ attendees: params.attendees }),
    },
  );
}

// A calendar invite's attendee list is set once, at event-creation time —
// it doesn't follow a member's record if they later change their email.
// Call this whenever a member's email changes, so every calendar event
// they're already an attendee on (an upcoming Hour session, an RSVP'd
// event) gets repointed to the new address instead of silently going
// stale. No-op in mock mode — there's no real calendar to patch.
export async function syncMemberEmailOnCalendarEvents(params: {
  memberId: string;
  memberName: string;
  memberEmail: string | null;
}): Promise<void> {
  const connection = await getActiveConnection();
  if (!connection) return;

  const [bookings, attendances] = await Promise.all([
    prisma.booking.findMany({
      where: { memberId: params.memberId, status: { not: "CANCELLED" }, googleCalendarEventId: { not: null } },
      include: { partner: true },
    }),
    prisma.eventAttendance.findMany({
      where: { memberId: params.memberId, joined: true, googleCalendarEventId: { not: null } },
    }),
  ]);

  for (const booking of bookings) {
    if (!booking.googleCalendarEventId) continue;
    const attendees = [
      params.memberEmail ? { email: params.memberEmail, displayName: params.memberName } : null,
      booking.partner.email ? { email: booking.partner.email, displayName: booking.partner.name } : null,
    ].filter((a): a is { email: string; displayName: string } => a !== null);
    await updateEventAttendees({ googleCalendarEventId: booking.googleCalendarEventId, attendees });
  }

  for (const attendance of attendances) {
    if (!attendance.googleCalendarEventId) continue;
    const attendees = params.memberEmail ? [{ email: params.memberEmail, displayName: params.memberName }] : [];
    await updateEventAttendees({ googleCalendarEventId: attendance.googleCalendarEventId, attendees });
  }
}

export async function rescheduleCalendarEvent(params: {
  googleCalendarEventId: string;
  startTime: Date;
  endTime: Date;
}): Promise<CalendarEventRef> {
  const connection = await getActiveConnection();
  if (!connection || params.googleCalendarEventId.startsWith("mock-gcal-")) {
    return { googleCalendarEventId: params.googleCalendarEventId };
  }

  await fetch(
    `${CALENDAR_API}/calendars/${encodeURIComponent(connection.calendarId)}/events/${params.googleCalendarEventId}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${connection.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        start: { dateTime: params.startTime.toISOString() },
        end: { dateTime: params.endTime.toISOString() },
      }),
    },
  );

  return { googleCalendarEventId: params.googleCalendarEventId };
}
