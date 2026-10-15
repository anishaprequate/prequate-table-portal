"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@prequate/db";
import { getCurrentUser } from "@/lib/session";
import { eventVisibleTo } from "@/lib/event-access";

export type HomeActionResult = { ok: true } | { ok: false; error: string };

const fail = (error: string): HomeActionResult => ({ ok: false, error });

// A private reply to a dinner's question. One per member, editable. Only the
// event's host partner reads it (see the admin Table questions page).
export async function saveQuestionReply(formData: FormData): Promise<HomeActionResult> {
  const user = await getCurrentUser();
  if (!user) return fail("Please sign in again.");

  const eventId = String(formData.get("eventId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return fail("Write a few words first.");
  if (body.length > 2000) return fail("Keep it under 2,000 characters.");

  // The member must be able to see the event, and it must have a question.
  const event = await prisma.event.findFirst({
    where: { id: eventId, publishedAt: { not: null }, archivedAt: null, dinnerQuestion: { not: null }, ...eventVisibleTo(user.id) },
    select: { id: true },
  });
  if (!event) return fail("That question is no longer open.");

  await prisma.eventQuestionReply.upsert({
    where: { eventId_memberId: { eventId, memberId: user.id } },
    create: { eventId, memberId: user.id, body },
    update: { body },
  });

  revalidatePath("/home");
  return { ok: true };
}

const REQUEST_TYPES = ["BRIEF", "PEER_HOUR", "RESTAURANT"] as const;

// Ask the table: a brief, a peer Hour or a restaurant reservation. Lands in
// the admin Requests list.
export async function createTableRequest(formData: FormData): Promise<HomeActionResult> {
  const user = await getCurrentUser();
  if (!user) return fail("Please sign in again.");

  const type = String(formData.get("type") ?? "");
  if (!(REQUEST_TYPES as readonly string[]).includes(type)) return fail("Choose what you are asking for.");

  let details = String(formData.get("details") ?? "").trim();
  if (type === "RESTAURANT") {
    const place = String(formData.get("place") ?? "").trim();
    const branch = String(formData.get("branch") ?? "").trim();
    const placeId = String(formData.get("placeId") ?? "").trim();
    const when = String(formData.get("when") ?? "").trim();
    const people = String(formData.get("people") ?? "").trim();
    // The team books the outlet the member names, so both must be given.
    if (!place) return fail("Name the restaurant or hotel.");
    if (!branch) return fail("Say which branch or area, so we book the right outlet.");
    // A picked place carries Google's id, so the team can open the exact outlet.
    const map = /^[A-Za-z0-9_-]{10,200}$/.test(placeId)
      ? `Map: https://www.google.com/maps/place/?q=place_id:${placeId}`
      : "";
    const lines = [`Place: ${place}`, `Branch or area: ${branch}`, map, when && `When: ${when}`, people && `People: ${people}`, details].filter(Boolean);
    return await saveRequest(user.id, type, lines.join("\n"));
  }
  if (!details) return fail("Add a line about what you need.");
  return await saveRequest(user.id, type, details);
}

async function saveRequest(memberId: string, type: string, details: string): Promise<HomeActionResult> {
  if (details.length > 2000) return fail("Keep it under 2,000 characters.");
  await prisma.tableRequest.create({ data: { memberId, type, details } });
  return { ok: true };
}

// The introduction sheet on Home. Same record as the Members page makes, but
// without sending the member to another page.
export async function requestIntroductionQuick(formData: FormData): Promise<HomeActionResult> {
  const user = await getCurrentUser();
  if (!user) return fail("Please sign in again.");

  const targetId = String(formData.get("targetId") ?? "");
  if (!targetId || targetId === user.id) return fail("Choose who you would like to meet.");

  const target = await prisma.user.findFirst({
    where: { id: targetId, role: "MEMBER", directoryOptOut: false },
    select: { id: true },
  });
  if (!target) return fail("That member is not available.");

  const message = String(formData.get("message") ?? "").trim() || null;
  const existing = await prisma.introductionRequest.findFirst({ where: { requesterId: user.id, targetId } });
  if (existing) return fail("You have already asked for this introduction.");

  await prisma.introductionRequest.create({ data: { requesterId: user.id, targetId, message } });
  revalidatePath("/members");
  return { ok: true };
}

// The line a member writes about what the table means to them.
export async function saveTableLine(formData: FormData): Promise<HomeActionResult> {
  const user = await getCurrentUser();
  if (!user) return fail("Please sign in again.");

  const line = String(formData.get("line") ?? "").trim();
  if (line.length > 240) return fail("Keep it to a sentence or two (240 characters).");

  await prisma.user.update({ where: { id: user.id }, data: { tableLine: line || null } });
  revalidatePath("/home");
  return { ok: true };
}
