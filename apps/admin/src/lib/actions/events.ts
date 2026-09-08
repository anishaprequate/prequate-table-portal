"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import sanitizeHtml from "sanitize-html";
import { prisma } from "@prequate/db";
import { luma, googleCalendar, UPLOADS_DIR, EVENT_TIER_LABELS, type EventTier } from "@prequate/core";
import { getCurrentAdmin, isFullAdmin, canWrite } from "@/lib/session";

type EventForCalendar = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  startTime: Date;
  endTime: Date;
};

// Called whenever an attendance moves into joined=true from somewhere else
// (approved, promoted from the waitlist) — mirrors what joinEvent does for
// a direct join, so every confirmed RSVP ends up on the calendar exactly
// once, regardless of which path got them there.
async function ensureCalendarEntry(event: EventForCalendar, attendanceId: string) {
  const attendance = await prisma.eventAttendance.findUnique({
    where: { id: attendanceId },
    include: { member: true },
  });
  if (!attendance || attendance.googleCalendarEventId) return;

  const ref = await googleCalendar.createEventCalendarEntry({
    eventId: event.id,
    title: event.title,
    description: event.description,
    location: event.location,
    memberName: attendance.member.name,
    memberEmail: attendance.member.email,
    startTime: event.startTime,
    endTime: event.endTime,
  });

  await prisma.eventAttendance.update({
    where: { id: attendanceId },
    data: { googleCalendarEventId: ref.googleCalendarEventId },
  });
}

function parseTier(raw: FormDataEntryValue | null): EventTier {
  const value = String(raw ?? "");
  return (Object.keys(EVENT_TIER_LABELS) as EventTier[]).includes(value as EventTier)
    ? (value as EventTier)
    : "DINNER";
}

async function storeImage(eventId: string, file: FormDataEntryValue | null) {
  if (!(file instanceof File) || file.size === 0) return null;
  if (!file.type.startsWith("image/")) return null;

  await mkdir(UPLOADS_DIR, { recursive: true });
  const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, "_");
  const storedName = `${eventId}-${Date.now()}-${safeName}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(UPLOADS_DIR, storedName), buffer);

  return `/api/briefs/${storedName}`;
}

// Same sanitize-on-the-way-in convention as InsightPost.body — the member
// app trusts this boundary and renders it with dangerouslySetInnerHTML.
function sanitizeDescription(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ["p", "br", "strong", "em", "u", "h2", "h3", "ul", "ol", "li", "blockquote", "img"],
    allowedAttributes: { img: ["src", "alt"] },
    allowedSchemesByTag: { img: ["http", "https"] },
    allowedSchemesAppliedToAttributes: [],
    transformTags: {
      img: (tagName, attribs) => ({
        tagName,
        attribs: attribs.src?.startsWith("/api/briefs/") ? attribs : {},
      }),
    },
  });
}

function parseQuestions(raw: FormDataEntryValue | null): string | null {
  const questions = String(raw ?? "")
    .split("\n")
    .map((q) => q.trim())
    .filter(Boolean);
  return questions.length > 0 ? JSON.stringify(questions) : null;
}

export async function publishEvent(formData: FormData) {
  const admin = await getCurrentAdmin();
  if (!admin || !isFullAdmin(admin.role) || !canWrite(admin.role)) redirect("/bookings");

  const lumaEventId = String(formData.get("lumaEventId") ?? "");
  const [upcoming, past] = await Promise.all([luma.getUpcomingEvents(), luma.getPastEvents()]);
  const source = [...upcoming, ...past].find((e) => e.lumaEventId === lumaEventId);
  if (!source) redirect("/events");

  await prisma.event.upsert({
    where: { lumaEventId },
    create: {
      lumaEventId: source.lumaEventId,
      title: source.title,
      description: source.description,
      location: source.location,
      startTime: source.startTime,
      endTime: source.endTime,
      publishedAt: new Date(),
    },
    update: {},
  });

  revalidatePath("/events");
}

export async function createEvent(formData: FormData) {
  const admin = await getCurrentAdmin();
  if (!admin || !isFullAdmin(admin.role) || !canWrite(admin.role)) redirect("/bookings");

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const location = String(formData.get("location") ?? "").trim() || null;
  const startTime = new Date(String(formData.get("startTime") ?? ""));
  const endTime = new Date(String(formData.get("endTime") ?? ""));
  const tier = parseTier(formData.get("tier"));
  const capacityRaw = String(formData.get("capacity") ?? "").trim();
  const capacity = capacityRaw ? Math.max(0, Math.trunc(Number(capacityRaw))) : null;
  const approvalRequired = formData.get("approvalRequired") === "on";
  const allowPlusOne = formData.get("allowPlusOne") === "on";
  const registrationQuestions = parseQuestions(formData.get("registrationQuestions"));
  const intent = String(formData.get("intent") ?? "publish");

  if (!title || Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
    redirect("/events/new?error=incomplete");
  }

  const event = await prisma.event.create({
    data: {
      title,
      description: description ? sanitizeDescription(description) : null,
      location,
      startTime,
      endTime,
      tier,
      capacity,
      approvalRequired,
      allowPlusOne,
      registrationQuestions,
      publishedAt: intent === "publish" ? new Date() : null,
    },
  });

  const imageUrl = await storeImage(event.id, formData.get("image"));
  if (imageUrl) {
    await prisma.event.update({ where: { id: event.id }, data: { imageUrl } });
  }

  revalidatePath("/events");
  redirect(`/events/${event.id}?saved=1`);
}

export async function cloneEvent(formData: FormData) {
  const admin = await getCurrentAdmin();
  if (!admin || !isFullAdmin(admin.role) || !canWrite(admin.role)) redirect("/bookings");

  const eventId = String(formData.get("eventId") ?? "");
  const source = await prisma.event.findUnique({ where: { id: eventId }, include: { ticketTypes: true } });
  if (!source) redirect("/events");

  const clone = await prisma.event.create({
    data: {
      title: `${source.title} (copy)`,
      description: source.description,
      imageUrl: source.imageUrl,
      location: source.location,
      startTime: source.startTime,
      endTime: source.endTime,
      tier: source.tier,
      capacity: source.capacity,
      attendeeVisibility: source.attendeeVisibility,
      approvalRequired: source.approvalRequired,
      registrationQuestions: source.registrationQuestions,
      publishedAt: new Date(),
      ticketTypes: {
        create: source.ticketTypes.map((t) => ({ name: t.name, capacity: t.capacity, sortOrder: t.sortOrder })),
      },
    },
  });

  revalidatePath("/events");
  redirect(`/events/${clone.id}?edit=1`);
}

export async function updateEventDetails(formData: FormData) {
  const admin = await getCurrentAdmin();
  if (!admin || !isFullAdmin(admin.role) || !canWrite(admin.role)) redirect("/bookings");

  const eventId = String(formData.get("eventId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim() || null;
  const tier = parseTier(formData.get("tier"));
  const attendeeVisibility = String(formData.get("attendeeVisibility") ?? "HIDDEN");
  const capacityRaw = String(formData.get("capacity") ?? "").trim();
  const capacity = capacityRaw ? Math.max(0, Math.trunc(Number(capacityRaw))) : null;
  const inviteOnly = formData.get("inviteOnly") === "on";
  const approvalRequired = formData.get("approvalRequired") === "on";
  const allowPlusOne = formData.get("allowPlusOne") === "on";
  const registrationQuestions = parseQuestions(formData.get("registrationQuestions"));

  const imageUrl = await storeImage(eventId, formData.get("image"));

  const event = await prisma.event.update({
    where: { id: eventId },
    data: {
      ...(title ? { title } : {}),
      description: description ? sanitizeDescription(description) : null,
      location,
      tier,
      attendeeVisibility,
      capacity,
      inviteOnly,
      approvalRequired,
      allowPlusOne,
      registrationQuestions,
      ...(imageUrl ? { imageUrl } : {}),
    },
  });

  // A raised (or removed) cap can free up room for whoever's been waiting
  // longest — promote them in order until the new capacity is filled.
  if (capacity !== null) {
    const [joined, waitlist] = await Promise.all([
      prisma.eventAttendance.findMany({ where: { eventId, joined: true }, select: { guestCount: true } }),
      prisma.eventAttendance.findMany({
        where: { eventId, waitlisted: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);
    let takenSpots = joined.reduce((sum, a) => sum + 1 + a.guestCount, 0);

    for (const entry of waitlist) {
      const spotsNeeded = 1 + entry.guestCount;
      if (takenSpots + spotsNeeded > capacity) break;
      await prisma.eventAttendance.update({
        where: { id: entry.id },
        data: { joined: true, waitlisted: false },
      });
      await ensureCalendarEntry(event, entry.id);
      takenSpots += spotsNeeded;
    }
  }

  revalidatePath(`/events/${eventId}`);
  revalidatePath("/events");
  redirect(`/events/${eventId}?saved=1`);
}

export async function publishEventDraft(formData: FormData) {
  const admin = await getCurrentAdmin();
  if (!admin || !isFullAdmin(admin.role) || !canWrite(admin.role)) redirect("/bookings");

  const eventId = String(formData.get("eventId") ?? "");
  await prisma.event.update({ where: { id: eventId }, data: { publishedAt: new Date() } });

  revalidatePath(`/events/${eventId}`);
  revalidatePath("/events");
  redirect(`/events/${eventId}?saved=1`);
}

export async function generateInviteLink(formData: FormData) {
  const admin = await getCurrentAdmin();
  if (!admin || !isFullAdmin(admin.role) || !canWrite(admin.role)) redirect("/bookings");

  const eventId = String(formData.get("eventId") ?? "");
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) redirect("/events");

  if (!event.inviteToken) {
    await prisma.event.update({ where: { id: eventId }, data: { inviteToken: crypto.randomUUID() } });
  }

  revalidatePath(`/events/${eventId}`);
  redirect(`/events/${eventId}?edit=1&saved=1`);
}

export async function addTicketType(formData: FormData) {
  const admin = await getCurrentAdmin();
  if (!admin || !isFullAdmin(admin.role) || !canWrite(admin.role)) redirect("/bookings");

  const eventId = String(formData.get("eventId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const capacityRaw = String(formData.get("capacity") ?? "").trim();
  const capacity = capacityRaw ? Math.max(0, Math.trunc(Number(capacityRaw))) : null;
  if (!name) redirect(`/events/${eventId}?edit=1`);

  const count = await prisma.eventTicketType.count({ where: { eventId } });
  await prisma.eventTicketType.create({ data: { eventId, name, capacity, sortOrder: count } });

  revalidatePath(`/events/${eventId}`);
  redirect(`/events/${eventId}?edit=1&saved=1`);
}

export async function deleteTicketType(formData: FormData) {
  const admin = await getCurrentAdmin();
  if (!admin || !isFullAdmin(admin.role) || !canWrite(admin.role)) redirect("/bookings");

  const eventId = String(formData.get("eventId") ?? "");
  const id = String(formData.get("id") ?? "");
  await prisma.eventTicketType.delete({ where: { id } });

  revalidatePath(`/events/${eventId}`);
  redirect(`/events/${eventId}?edit=1&saved=1`);
}

export async function inviteMembersToEvent(formData: FormData) {
  const admin = await getCurrentAdmin();
  if (!admin || !isFullAdmin(admin.role) || !canWrite(admin.role)) redirect("/bookings");

  const eventId = String(formData.get("eventId") ?? "");
  const memberIds = formData.getAll("memberIds").map(String).filter(Boolean);

  await Promise.all(
    memberIds.map((memberId) =>
      prisma.eventAttendance.upsert({
        where: { eventId_memberId: { eventId, memberId } },
        create: { eventId, memberId, invited: true },
        update: { invited: true },
      }),
    ),
  );

  revalidatePath(`/events/${eventId}`);
  redirect(`/events/${eventId}?edit=1&saved=1`);
}

export async function removeEventInvite(formData: FormData) {
  const admin = await getCurrentAdmin();
  if (!admin || !isFullAdmin(admin.role) || !canWrite(admin.role)) redirect("/bookings");

  const eventId = String(formData.get("eventId") ?? "");
  const memberId = String(formData.get("memberId") ?? "");

  // Only pull an invite back if they haven't already joined off the back of it.
  await prisma.eventAttendance.deleteMany({
    where: { eventId, memberId, joined: false, waitlisted: false },
  });

  revalidatePath(`/events/${eventId}`);
  redirect(`/events/${eventId}?edit=1&saved=1`);
}

export async function approveAttendance(formData: FormData) {
  const admin = await getCurrentAdmin();
  if (!admin || !isFullAdmin(admin.role) || !canWrite(admin.role)) redirect("/bookings");

  const id = String(formData.get("id") ?? "");
  const attendance = await prisma.eventAttendance.findUnique({ where: { id } });
  if (!attendance) redirect("/events");

  const event = await prisma.event.findUnique({ where: { id: attendance.eventId } });
  if (!event) redirect("/events");

  let waitlisted = false;
  if (event.capacity != null) {
    const joined = await prisma.eventAttendance.findMany({
      where: { eventId: event.id, joined: true },
      select: { guestCount: true },
    });
    const takenSpots = joined.reduce((sum, a) => sum + 1 + a.guestCount, 0);
    waitlisted = takenSpots + 1 + attendance.guestCount > event.capacity;
  }

  await prisma.eventAttendance.update({
    where: { id },
    data: { pendingApproval: false, joined: !waitlisted, waitlisted },
  });
  if (!waitlisted) await ensureCalendarEntry(event, id);

  revalidatePath(`/events/${event.id}`);
  redirect(`/events/${event.id}?saved=1`);
}

export async function declineAttendance(formData: FormData) {
  const admin = await getCurrentAdmin();
  if (!admin || !isFullAdmin(admin.role) || !canWrite(admin.role)) redirect("/bookings");

  const id = String(formData.get("id") ?? "");
  const attendance = await prisma.eventAttendance.findUnique({ where: { id } });
  if (!attendance) redirect("/events");

  await prisma.eventAttendance.delete({ where: { id } });

  revalidatePath(`/events/${attendance.eventId}`);
  redirect(`/events/${attendance.eventId}?saved=1`);
}

export async function checkInAttendee(formData: FormData) {
  const admin = await getCurrentAdmin();
  if (!admin || !isFullAdmin(admin.role) || !canWrite(admin.role)) redirect("/bookings");

  const id = String(formData.get("id") ?? "");
  const eventId = String(formData.get("eventId") ?? "");
  const checkedIn = formData.get("checkedIn") === "1";

  await prisma.eventAttendance.update({
    where: { id },
    data: { checkedInAt: checkedIn ? new Date() : null },
  });

  revalidatePath(`/events/${eventId}`);
}

export async function promoteFromWaitlist(formData: FormData) {
  const admin = await getCurrentAdmin();
  if (!admin || !isFullAdmin(admin.role) || !canWrite(admin.role)) redirect("/bookings");

  const id = String(formData.get("id") ?? "");
  const eventId = String(formData.get("eventId") ?? "");
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) redirect("/events");

  await prisma.eventAttendance.update({ where: { id }, data: { joined: true, waitlisted: false } });
  await ensureCalendarEntry(event, id);

  revalidatePath(`/events/${eventId}`);
  redirect(`/events/${eventId}?saved=1`);
}

export async function demoteToWaitlist(formData: FormData) {
  const admin = await getCurrentAdmin();
  if (!admin || !isFullAdmin(admin.role) || !canWrite(admin.role)) redirect("/bookings");

  const id = String(formData.get("id") ?? "");
  const eventId = String(formData.get("eventId") ?? "");
  await prisma.eventAttendance.update({ where: { id }, data: { joined: false, waitlisted: true } });

  revalidatePath(`/events/${eventId}`);
  redirect(`/events/${eventId}?saved=1`);
}

export async function blastEventMessage(formData: FormData) {
  const admin = await getCurrentAdmin();
  if (!admin || !isFullAdmin(admin.role) || !canWrite(admin.role)) redirect("/bookings");

  const eventId = String(formData.get("eventId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!body) redirect(`/events/${eventId}`);

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) redirect("/events");

  const recipients = await prisma.eventAttendance.findMany({
    where: { eventId, OR: [{ joined: true }, { waitlisted: true }] },
    select: { memberId: true },
  });

  const text = `${event.title}: ${body}`;
  await Promise.all(
    recipients.map((r) =>
      prisma.message.create({
        data: { memberId: r.memberId, partnerId: null, senderRole: "RM", authorId: admin.id, body: text },
      }),
    ),
  );

  revalidatePath(`/events/${eventId}`);
  redirect(`/events/${eventId}?blasted=1`);
}

export async function saveEventNote(formData: FormData) {
  const admin = await getCurrentAdmin();
  if (!admin || !isFullAdmin(admin.role) || !canWrite(admin.role)) redirect("/bookings");

  const eventId = String(formData.get("eventId") ?? "");
  const adminNote = String(formData.get("adminNote") ?? "").trim() || null;

  await prisma.event.update({ where: { id: eventId }, data: { adminNote } });

  revalidatePath(`/events/${eventId}`);
  redirect(`/events/${eventId}?saved=1`);
}
