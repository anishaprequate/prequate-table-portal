"use server";

import { revalidatePath } from "next/cache";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { prisma } from "@prequate/db";
import { availability, UPLOADS_DIR } from "@prequate/core";
import { getCurrentAdmin, canWrite } from "@/lib/session";

export type PostState = { status: "idle" } | { status: "ok"; message: string } | { status: "error"; message: string };

const HOUR_POST_KINDS = [
  { value: "NOTES", label: "Meeting notes" },
  { value: "BRIEF", label: "Brief" },
  { value: "OBSERVATION", label: "Follow-up" },
  { value: "FILE", label: "File" },
] as const;

const MAX_FILE_BYTES = 15 * 1024 * 1024;

// After an Hour, a partner posts meeting notes, a brief, a follow-up
// observation or a file. The member sees it in their Hour history and in
// "since you were last here". A partner can post only on their own Hours.
export async function postHourNote(_prev: PostState, formData: FormData): Promise<PostState> {
  const admin = await getCurrentAdmin();
  if (!admin || !canWrite(admin.role)) return { status: "error", message: "Please sign in again." };

  const bookingId = String(formData.get("bookingId") ?? "");
  const kind = String(formData.get("kind") ?? "NOTES");
  const content = String(formData.get("content") ?? "").trim().slice(0, 8000) || null;
  const file = formData.get("file");

  if (!HOUR_POST_KINDS.some((k) => k.value === kind)) return { status: "error", message: "Choose what you are posting." };

  const booking = await prisma.booking.findUnique({ where: { id: bookingId }, select: { id: true, partnerId: true, status: true } });
  if (!booking) return { status: "error", message: "That Hour could not be found." };
  const ownsIt = booking.partnerId === admin.id;
  const fullAdmin = admin.role === "ADMIN_OWNER" || admin.role === "ADMIN_RM";
  if (!ownsIt && !fullAdmin) return { status: "error", message: "You can post only on your own Hours." };

  let fileName: string | null = null;
  let fileUrl: string | null = null;
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_FILE_BYTES) return { status: "error", message: "That file is over 15 MB. Send a smaller one." };
    await mkdir(UPLOADS_DIR, { recursive: true });
    const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, "_");
    const storedName = `${bookingId}-${Date.now()}-${safeName}`;
    await writeFile(path.join(UPLOADS_DIR, storedName), Buffer.from(await file.arrayBuffer()));
    fileName = file.name;
    fileUrl = `/api/briefs/${storedName}`;
  }

  if (!content && !fileUrl) return { status: "error", message: kind === "FILE" ? "Attach a file first." : "Write a few words first." };

  await prisma.brief.create({ data: { bookingId, authorId: admin.id, kind, content, fileName, fileUrl } });

  revalidatePath("/hours");
  revalidatePath(`/bookings/${bookingId}`);
  return { status: "ok", message: "Posted. The member can see it." };
}

// Availability. A partner marks a slot unavailable, or restores it.
async function ownSlotStates(partnerId: string, from: Date, to: Date) {
  const partner = await prisma.user.findUnique({
    where: { id: partnerId },
    select: { id: true, email: true, tableHoursCalendarId: true },
  });
  if (!partner) return [];
  return availability.getSlotStates(partner, from, to);
}

// Whose availability is being changed: a partner changes their own; the owner
// and full admins can change any partner's.
async function targetPartner(partnerId?: string): Promise<{ id: string } | null> {
  const admin = await getCurrentAdmin();
  if (!admin || !canWrite(admin.role)) return null;
  if (admin.role === "PARTNER") return { id: admin.id };
  if (admin.role !== "ADMIN_OWNER" && admin.role !== "ADMIN_RM") return null;
  if (!partnerId) return null;
  return prisma.user.findFirst({ where: { id: partnerId, role: "PARTNER" }, select: { id: true } });
}

export async function toggleSlot(startIso: string, partnerId?: string): Promise<PostState> {
  const target = await targetPartner(partnerId);
  if (!target) return { status: "error", message: "Please sign in again." };

  const start = new Date(startIso);
  if (Number.isNaN(start.getTime())) return { status: "error", message: "That time is not valid." };
  const end = new Date(start.getTime() + availability.SLOT_MINUTES * 60_000);

  const slot = (await ownSlotStates(target.id, start, end)).find((s) => s.start.getTime() === start.getTime());
  if (!slot) return { status: "error", message: "That time is not in your Table hours." };
  if (slot.state === "booked") return { status: "error", message: "A member has booked this. Ask the team to move it." };

  if (slot.state === "blocked" && slot.blockId) {
    await prisma.availabilityBlock.delete({ where: { id: slot.blockId } });
  } else if (slot.state === "open") {
    await prisma.availabilityBlock.create({ data: { partnerId: target.id, startTime: slot.start, endTime: slot.end } });
  } else {
    return { status: "error", message: "This time is busy in your calendar, so it cannot be changed here." };
  }

  revalidatePath("/availability");
  return { status: "ok", message: slot.state === "open" ? "Marked unavailable." : "Open again." };
}

// A whole day: mark every open slot unavailable, or restore every block.
export async function setDay(dayKey: string, available: boolean, partnerId?: string): Promise<PostState> {
  const target = await targetPartner(partnerId);
  if (!target) return { status: "error", message: "Please sign in again." };

  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayKey);
  if (!m) return { status: "error", message: "That day is not valid." };
  const from = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const to = new Date(from.getFullYear(), from.getMonth(), from.getDate() + 1);

  const slots = await ownSlotStates(target.id, from, to);
  if (available) {
    await prisma.availabilityBlock.deleteMany({ where: { partnerId: target.id, startTime: { gte: from, lt: to } } });
  } else {
    const open = slots.filter((s) => s.state === "open");
    if (open.length) {
      await prisma.availabilityBlock.createMany({
        data: open.map((s) => ({ partnerId: target.id, startTime: s.start, endTime: s.end })),
      });
    }
  }

  revalidatePath("/availability");
  return { status: "ok", message: available ? "Day restored." : "Day marked unavailable." };
}
