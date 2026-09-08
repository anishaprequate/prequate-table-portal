// Mock Luma client.
//
// PRODUCTION NOTE: this stands in for Luma's real API. Admins would create
// and publish events in Luma directly; this portal reads them in, keyed by
// lumaEventId, and layers on Prequate-specific fields (attendee visibility,
// the post-event admin note) that have no equivalent in Luma itself. The
// shapes below match what Luma's event and guest endpoints return, so a
// real client can be substituted without reshaping calling code.

export interface LumaEvent {
  lumaEventId: string;
  title: string;
  description: string;
  location: string;
  startTime: Date;
  endTime: Date;
}

export interface LumaAttendee {
  memberSeatNumber: string;
  name: string;
  rsvpStatus: "yes" | "no" | "pending";
}

const MOCK_EVENTS: LumaEvent[] = [
  {
    lumaEventId: "luma-mock-001",
    title: "At The Table — Autumn Dinner",
    description:
      "A seated dinner for The Prequate Table, hosted at a private dining room in Lower Parel.",
    location: "Lower Parel, Mumbai",
    startTime: futureDate(12, 19, 30),
    endTime: futureDate(12, 22, 30),
  },
  {
    lumaEventId: "luma-mock-002",
    title: "The Annual Gathering",
    description: "The full Table, once a year, for a weekend away from the business.",
    location: "Alibaug",
    startTime: futureDate(45, 16, 0),
    endTime: futureDate(47, 12, 0),
  },
  {
    lumaEventId: "luma-mock-003",
    title: "At The Table — Quarter One Dinner",
    description: "A seated dinner marking the close of the quarter.",
    location: "New Delhi",
    startTime: pastDate(20, 19, 30),
    endTime: pastDate(20, 22, 0),
  },
];

function futureDate(daysAhead: number, hour: number, minute: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  date.setHours(hour, minute, 0, 0);
  return date;
}

function pastDate(daysAgo: number, hour: number, minute: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(hour, minute, 0, 0);
  return date;
}

export async function getUpcomingEvents(): Promise<LumaEvent[]> {
  const now = new Date();
  return MOCK_EVENTS.filter((event) => event.startTime > now);
}

export async function getPastEvents(): Promise<LumaEvent[]> {
  const now = new Date();
  return MOCK_EVENTS.filter((event) => event.startTime <= now);
}

export async function getAttendees(lumaEventId: string): Promise<LumaAttendee[]> {
  return [];
}
