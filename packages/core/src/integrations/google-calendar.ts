// Google Calendar client.
//
// Availability lives in availability.ts, not here.
//
// Event creation/reschedule/cancellation for The Hour is real whenever a
// GoogleCalendarConnection row exists (an admin has connected an account
// via the admin console's Settings page): those calls hit the real Google
// Calendar API and create a real event on that connected account's
// calendar. With no connection, the same functions fall back to the
// original deterministic mock, so the app still runs with zero setup.
import { prisma } from "@prequate/db";
import { refreshAccessToken } from "./google-oauth";

export interface CalendarEventRef {
  googleCalendarEventId: string;
  // Set for an online Hour: the Google Meet link Google added to the event.
  meetLink?: string | null;
}

const CALENDAR_API = "https://www.googleapis.com/calendar/v3";

async function getActiveConnection(): Promise<{ calendarId: string; accessToken: string } | null> {
  // Safety switch for development and testing: with GOOGLE_CALENDAR_DISABLED=1
  // no real calendar is ever touched, whatever is connected.
  if (process.env.GOOGLE_CALENDAR_DISABLED === "1") return null;
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
  // An online Hour gets a Google Meet link added to the event.
  online?: boolean;
  startTime: Date;
  endTime: Date;
}): Promise<CalendarEventRef> {
  const connection = await getActiveConnection();

  if (!connection) {
    const id = `mock-gcal-${params.partnerId}-${params.startTime.getTime()}`;
    return { googleCalendarEventId: id, meetLink: null };
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

  // sendUpdates=all: Google emails the invitation to the member and partner.
  // conferenceDataVersion=1 is what lets the request ask Google for a Meet link.
  const query = `sendUpdates=all${params.online ? "&conferenceDataVersion=1" : ""}`;
  const response = await fetch(
    `${CALENDAR_API}/calendars/${encodeURIComponent(connection.calendarId)}/events?${query}`,
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
        ...(params.online
          ? {
              conferenceData: {
                createRequest: {
                  requestId: crypto.randomUUID(),
                  conferenceSolutionKey: { type: "hangoutsMeet" },
                },
              },
            }
          : {}),
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Google Calendar event creation failed: ${response.status} ${await response.text()}`);
  }

  const event = (await response.json()) as {
    id: string;
    hangoutLink?: string;
    conferenceData?: { entryPoints?: { entryPointType?: string; uri?: string }[] };
  };
  const meetLink =
    event.hangoutLink ?? event.conferenceData?.entryPoints?.find((e) => e.entryPointType === "video")?.uri ?? null;
  return { googleCalendarEventId: event.id, meetLink };
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
    `${CALENDAR_API}/calendars/${encodeURIComponent(connection.calendarId)}/events/${params.googleCalendarEventId}?sendUpdates=all`,
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

