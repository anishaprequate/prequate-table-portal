"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import sanitizeHtml from "sanitize-html";
import sharp from "sharp";
import { prisma } from "@prequate/db";
import { luma, googleCalendar, createNotification, mailer, UPLOADS_DIR, EVENT_TIER_LABELS, type EventTier } from "@prequate/core";
import { getCurrentAdmin, isFullAdmin, canWrite } from "@/lib/session";
import { formatDateOnly } from "@/lib/format";

const GALLERY_MAX_BYTES = 15 * 1024 * 1024;
const GALLERY_ALLOWED_EXT = new Set([".jpg", ".jpeg", ".png", ".heic", ".heif"]);

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

// One "Name, email" pair per line — Annual Gathering guests beyond the
// membership, not tied to a Member record.
function parseExternalGuests(raw: FormDataEntryValue | null): string | null {
  const guests = String(raw ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, email] = line.split(",").map((s) => s.trim());
      return name ? { name, email: email ?? "" } : null;
    })
    .filter((g): g is { name: string; email: string } => g !== null);
  return guests.length > 0 ? JSON.stringify(guests) : null;
}

export async function publishEvent(formData: FormData) {
  const admin = await getCurrentAdmin();
  if (!admin || !isFullAdmin(admin.role) || !canWrite(admin.role)) redirect("/bookings");

  const lumaEventId = String(formData.get("lumaEventId") ?? "");
  const tier = parseTier(formData.get("tier"));
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
      // Luma has no tier concept of its own — this comes from the picker
      // right next to the Publish button, so it's never silently left at
      // the DINNER default.
      tier,
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
  const sponsorName = String(formData.get("sponsorName") ?? "").trim() || null;
  const sponsorLogoUrl = String(formData.get("sponsorLogoUrl") ?? "").trim() || null;
  const externalGuests = parseExternalGuests(formData.get("externalGuests"));
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
      sponsorName,
      sponsorLogoUrl,
      externalGuests,
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
  redirect(`/events/${clone.id}/edit`);
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
  const sponsorName = String(formData.get("sponsorName") ?? "").trim() || null;
  const sponsorLogoUrl = String(formData.get("sponsorLogoUrl") ?? "").trim() || null;
  const externalGuests = parseExternalGuests(formData.get("externalGuests"));

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
      sponsorName,
      sponsorLogoUrl,
      externalGuests,
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

// Reverts a published event back to draft — the other half of the
// draft/publish toggle alongside publishEventDraft.
export async function unpublishEvent(formData: FormData) {
  const admin = await getCurrentAdmin();
  if (!admin || !isFullAdmin(admin.role) || !canWrite(admin.role)) redirect("/bookings");

  const eventId = String(formData.get("eventId") ?? "");
  await prisma.event.update({ where: { id: eventId }, data: { publishedAt: null } });

  revalidatePath(`/events/${eventId}`);
  revalidatePath("/events");
  redirect(`/events/${eventId}?saved=1`);
}

// Draft or published, deletes outright — any confirmation for a published
// event with existing RSVPs happens client-side (see DeleteEventButton)
// before this ever gets called.
// Soft delete — archives rather than removing the row, so it stays
// viewable (and restorable) under the Archive tab instead of vanishing.
export async function deleteEvent(formData: FormData) {
  const admin = await getCurrentAdmin();
  if (!admin || !isFullAdmin(admin.role) || !canWrite(admin.role)) redirect("/bookings");

  const eventId = String(formData.get("eventId") ?? "");
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) redirect("/events");

  await prisma.event.update({ where: { id: eventId }, data: { archivedAt: new Date() } });

  revalidatePath("/events");
  revalidatePath(`/events/${eventId}`);
  redirect(`/events/${eventId}`);
}

export async function restoreEvent(formData: FormData) {
  const admin = await getCurrentAdmin();
  if (!admin || !isFullAdmin(admin.role) || !canWrite(admin.role)) redirect("/bookings");

  const eventId = String(formData.get("eventId") ?? "");
  await prisma.event.update({ where: { id: eventId }, data: { archivedAt: null } });

  revalidatePath("/events");
  revalidatePath(`/events/${eventId}`);
  redirect(`/events/${eventId}?saved=1`);
}

// Its own state, distinct from delete/archive — the event stops accepting
// RSVPs and stops appearing to browse, but every existing RSVP'd member
// (joined, waitlisted, or pending approval — anyone who took an action)
// gets notified, and the event's history stays exactly as it was. Shown
// in the Archive tab alongside deleted events, but labeled "Cancelled"
// there rather than "Archived".
export async function cancelEvent(formData: FormData) {
  const admin = await getCurrentAdmin();
  if (!admin || !isFullAdmin(admin.role) || !canWrite(admin.role)) redirect("/bookings");

  const eventId = String(formData.get("eventId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim() || null;

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      attendances: {
        where: { OR: [{ joined: true }, { waitlisted: true }, { pendingApproval: true }] },
      },
    },
  });
  if (!event) redirect("/events");

  await prisma.event.update({
    where: { id: eventId },
    data: { cancelledAt: new Date(), cancellationReason: reason },
  });

  const message = `The ${event.title} on ${formatDateOnly(event.startTime)} has been cancelled.${
    reason ? `\n${reason}` : ""
  }`;
  await Promise.all(
    event.attendances.map((attendance) =>
      createNotification({
        recipientId: attendance.memberId,
        type: "event_cancelled",
        message,
        relatedEntityType: "event",
        relatedEntityId: event.id,
      }),
    ),
  );

  revalidatePath("/events");
  revalidatePath(`/events/${eventId}`);
  redirect(`/events/${eventId}?saved=1`);
}

export async function uncancelEvent(formData: FormData) {
  const admin = await getCurrentAdmin();
  if (!admin || !isFullAdmin(admin.role) || !canWrite(admin.role)) redirect("/bookings");

  const eventId = String(formData.get("eventId") ?? "");
  await prisma.event.update({
    where: { id: eventId },
    data: { cancelledAt: null, cancellationReason: null },
  });

  revalidatePath("/events");
  revalidatePath(`/events/${eventId}`);
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
  redirect(`/events/${eventId}/edit?saved=1`);
}

export async function addTicketType(formData: FormData) {
  const admin = await getCurrentAdmin();
  if (!admin || !isFullAdmin(admin.role) || !canWrite(admin.role)) redirect("/bookings");

  const eventId = String(formData.get("eventId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const capacityRaw = String(formData.get("capacity") ?? "").trim();
  const capacity = capacityRaw ? Math.max(0, Math.trunc(Number(capacityRaw))) : null;
  if (!name) redirect(`/events/${eventId}/edit`);

  const count = await prisma.eventTicketType.count({ where: { eventId } });
  await prisma.eventTicketType.create({ data: { eventId, name, capacity, sortOrder: count } });

  revalidatePath(`/events/${eventId}`);
  redirect(`/events/${eventId}/edit?saved=1`);
}

export async function deleteTicketType(formData: FormData) {
  const admin = await getCurrentAdmin();
  if (!admin || !isFullAdmin(admin.role) || !canWrite(admin.role)) redirect("/bookings");

  const eventId = String(formData.get("eventId") ?? "");
  const id = String(formData.get("id") ?? "");
  await prisma.eventTicketType.delete({ where: { id } });

  revalidatePath(`/events/${eventId}`);
  redirect(`/events/${eventId}/edit?saved=1`);
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
  redirect(`/events/${eventId}/edit?saved=1`);
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
  redirect(`/events/${eventId}/edit?saved=1`);
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

  revalidatePath(`/events/${event.id}/registration`);
  redirect(`/events/${event.id}/registration?saved=1`);
}

export async function declineAttendance(formData: FormData) {
  const admin = await getCurrentAdmin();
  if (!admin || !isFullAdmin(admin.role) || !canWrite(admin.role)) redirect("/bookings");

  const id = String(formData.get("id") ?? "");
  const attendance = await prisma.eventAttendance.findUnique({ where: { id } });
  if (!attendance) redirect("/events");

  await prisma.eventAttendance.delete({ where: { id } });

  revalidatePath(`/events/${attendance.eventId}/registration`);
  redirect(`/events/${attendance.eventId}/registration?saved=1`);
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

  revalidatePath(`/events/${eventId}/registration`);
  revalidatePath(`/events/${eventId}/guests`);
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

  revalidatePath(`/events/${eventId}/registration`);
  redirect(`/events/${eventId}/registration?saved=1`);
}

export async function demoteToWaitlist(formData: FormData) {
  const admin = await getCurrentAdmin();
  if (!admin || !isFullAdmin(admin.role) || !canWrite(admin.role)) redirect("/bookings");

  const id = String(formData.get("id") ?? "");
  const eventId = String(formData.get("eventId") ?? "");
  await prisma.eventAttendance.update({ where: { id }, data: { joined: false, waitlisted: true } });

  revalidatePath(`/events/${eventId}/registration`);
  redirect(`/events/${eventId}/registration?saved=1`);
}

// A one-off announcement or reminder, not a saved recurring campaign.
// Default recipients are confirmed RSVPs; the "include waitlisted" checkbox
// widens that. Delivered as an in-app message (landing in the member's RM
// thread, same as any RM message) and a real email alongside it. No separate
// Notification is created for this — the message itself, once unread, is
// the signal; a distinct Notification row would just duplicate it (see
// notifications.ts's note on keeping notifications and messages separate).
// The send itself is logged as an EventBlast so admins can see blast
// history (who sent what, when, to how many) on the Blasts tab.
export async function blastEventMessage(formData: FormData) {
  const admin = await getCurrentAdmin();
  if (!admin || !isFullAdmin(admin.role) || !canWrite(admin.role)) redirect("/bookings");

  const eventId = String(formData.get("eventId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  const includeWaitlist = formData.get("includeWaitlist") === "on";
  if (!body) redirect(`/events/${eventId}/blasts`);

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) redirect("/events");

  const recipients = await prisma.eventAttendance.findMany({
    where: includeWaitlist ? { eventId, OR: [{ joined: true }, { waitlisted: true }] } : { eventId, joined: true },
    include: { member: true },
  });

  const text = `${event.title}: ${body}`;
  await Promise.all(
    recipients.map(async (r) => {
      await prisma.message.create({
        data: { memberId: r.memberId, partnerId: null, senderRole: "RM", authorId: admin.id, body: text },
      });
      if (r.member.email && r.member.emailEventBlasts) {
        await mailer.sendEmail({ to: r.member.email, subject: event.title, text });
      }
    }),
  );

  await prisma.eventBlast.create({
    data: {
      eventId,
      authorId: admin.id,
      body,
      includeWaitlist,
      recipientCount: recipients.length,
    },
  });

  revalidatePath(`/events/${eventId}`);
  redirect(`/events/${eventId}/blasts?blasted=1`);
}

// Admin-only uploads. Stores the original file plus a resized JPEG
// thumbnail for the gallery grid — thumbnail generation is best-effort: if
// sharp can't decode the source (some HEIC files, depending on what this
// environment's image library was built with), thumbnailUrl stays null and
// the gallery falls back to the original instead of failing the upload.
export async function uploadEventPhotos(formData: FormData) {
  const admin = await getCurrentAdmin();
  if (!admin || !isFullAdmin(admin.role) || !canWrite(admin.role)) redirect("/bookings");

  const eventId = String(formData.get("eventId") ?? "");
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) redirect("/events");

  const files = formData.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  await mkdir(UPLOADS_DIR, { recursive: true });

  for (const file of files) {
    const ext = path.extname(file.name).toLowerCase();
    if (!GALLERY_ALLOWED_EXT.has(ext) || file.size > GALLERY_MAX_BYTES) continue;

    const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, "_");
    const storedName = `gallery-${eventId}-${Date.now()}-${safeName}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(UPLOADS_DIR, storedName), buffer);

    let thumbnailUrl: string | null = null;
    try {
      const thumbName = `gallery-thumb-${eventId}-${Date.now()}-${safeName}.jpg`;
      const thumbBuffer = await sharp(buffer).resize(480, 480, { fit: "cover" }).jpeg({ quality: 80 }).toBuffer();
      await writeFile(path.join(UPLOADS_DIR, thumbName), thumbBuffer);
      thumbnailUrl = thumbName;
    } catch {
      thumbnailUrl = null;
    }

    await prisma.eventPhoto.create({
      data: { eventId, url: storedName, thumbnailUrl, uploadedById: admin.id },
    });
  }

  revalidatePath(`/events/${eventId}`);
  redirect(`/events/${eventId}/guests?photosUploaded=1`);
}

export async function deleteEventPhoto(formData: FormData) {
  const admin = await getCurrentAdmin();
  if (!admin || !isFullAdmin(admin.role) || !canWrite(admin.role)) redirect("/bookings");

  const id = String(formData.get("id") ?? "");
  const eventId = String(formData.get("eventId") ?? "");
  await prisma.eventPhoto.delete({ where: { id } });

  revalidatePath(`/events/${eventId}`);
  redirect(`/events/${eventId}/guests`);
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
