"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import path from "path";
import { prisma } from "@prequate/db";
import { availability, notifyMember, saveUpload } from "@prequate/core";
import { getCurrentAdmin, canWrite, isFullAdmin } from "@/lib/session";

export type AdvisorFormState = { status: "idle" } | { status: "ok"; message: string } | { status: "error"; message: string };

const fail = (message: string): AdvisorFormState => ({ status: "error", message });

// Advisor requests are answered by the advisor desk: Anisha and Nag.
async function requireDesk() {
  const admin = await getCurrentAdmin();
  if (!admin || !admin.advisorDesk || !canWrite(admin.role)) return null;
  return admin;
}

const fmt = (d: Date) =>
  new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(d);

// Up to three times, each a date and a start time on the hour or half hour.
export async function offerAdvisorTimes(_prev: AdvisorFormState, formData: FormData): Promise<AdvisorFormState> {
  const admin = await requireDesk();
  if (!admin) return fail("Please sign in again.");

  const requestId = String(formData.get("requestId") ?? "");
  const request = await prisma.advisorRequest.findFirst({
    where: { id: requestId, status: { in: ["REQUESTED", "OFFERED"] } },
    include: { advisor: { select: { name: true } } },
  });
  if (!request) return fail("That request is no longer open.");

  const now = new Date();
  const slots: { start: string; end: string }[] = [];
  const seen = new Set<number>();
  for (const n of [1, 2, 3]) {
    const date = String(formData.get(`date${n}`) ?? "");
    const time = String(formData.get(`time${n}`) ?? "");
    if (!date && !time) continue;
    const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
    const tm = /^(\d{2}):(\d{2})$/.exec(time);
    if (!dm || !tm) return fail(`Time ${n} needs both a date and a start time.`);
    const start = new Date(Number(dm[1]), Number(dm[2]) - 1, Number(dm[3]), Number(tm[1]), Number(tm[2]), 0, 0);
    if (!availability.isHourStart(start)) return fail(`Time ${n} must start on the hour or half hour, between 10 am and 7 pm.`);
    if (start <= now) return fail(`Time ${n} has already passed.`);
    if (seen.has(start.getTime())) return fail("Two of the times are the same.");
    seen.add(start.getTime());
    slots.push({ start: start.toISOString(), end: new Date(start.getTime() + availability.SLOT_MINUTES * 60_000).toISOString() });
  }
  if (slots.length === 0) return fail("Add at least one time.");
  slots.sort((a, b) => a.start.localeCompare(b.start));

  await prisma.advisorRequest.update({
    where: { id: request.id },
    data: { status: "OFFERED", offeredSlots: JSON.stringify(slots), handledById: admin.id },
  });
  await notifyMember({
    memberId: request.memberId,
    type: "advisor_offer",
    message: `${request.advisor.name.split(" ")[0]} can do ${slots.length === 1 ? "this time" : `these ${slots.length} times`}: ${slots.map((s) => fmt(new Date(s.start))).join("; ")}. Choose one.`,
    entityType: "advisor_request",
    entityId: request.id,
  });

  revalidatePath("/advisors");
  return { status: "ok", message: `Sent to the member: ${slots.length} time${slots.length === 1 ? "" : "s"}.` };
}

export async function declineAdvisorRequest(formData: FormData) {
  const admin = await requireDesk();
  if (!admin) redirect("/home");

  const requestId = String(formData.get("requestId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 300) || null;
  const request = await prisma.advisorRequest.findFirst({
    where: { id: requestId, status: { in: ["REQUESTED", "OFFERED"] } },
    include: { advisor: { select: { name: true } } },
  });
  if (!request) redirect("/advisors");

  await prisma.advisorRequest.update({
    where: { id: request.id },
    data: { status: "DECLINED", declineReason: reason, handledById: admin.id },
  });
  await notifyMember({
    memberId: request.memberId,
    type: "advisor_offer",
    message: `${request.advisor.name.split(" ")[0]} is not available around the day you proposed.${reason ? ` ${reason}` : ""} You can propose another date.`,
    entityType: "advisor_request",
    entityId: request.id,
  });

  revalidatePath("/advisors");
  redirect("/advisors?declined=1");
}

const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
const PHOTO_EXT = new Set([".jpg", ".jpeg", ".png", ".webp"]);

// The advisor list: full admins add and edit advisors.
export async function saveAdvisor(formData: FormData) {
  const admin = await getCurrentAdmin();
  if (!admin || !isFullAdmin(admin.role) || !canWrite(admin.role)) redirect("/home");

  const id = String(formData.get("id") ?? "") || null;
  const name = String(formData.get("name") ?? "").trim().slice(0, 120);
  const headline = String(formData.get("headline") ?? "").trim().slice(0, 300) || null;
  const linkedinRaw = String(formData.get("linkedinUrl") ?? "").trim();
  const sortOrder = Math.max(0, Math.min(999, Number(formData.get("sortOrder") ?? 0) || 0));
  const active = formData.get("active") === "on";
  const file = formData.get("photo");

  if (!name) redirect("/settings/advisors?error=name");
  // Only a LinkedIn address on https is kept.
  let linkedinUrl: string | null = null;
  if (linkedinRaw) {
    try {
      const u = new URL(/^https?:\/\//i.test(linkedinRaw) ? linkedinRaw : `https://${linkedinRaw}`);
      if (!/(^|\.)linkedin\.com$/i.test(u.hostname)) redirect("/settings/advisors?error=linkedin");
      u.protocol = "https:";
      linkedinUrl = u.toString();
    } catch {
      redirect("/settings/advisors?error=linkedin");
    }
  }

  let photoUrl: string | undefined;
  if (file instanceof File && file.size > 0) {
    const ext = path.extname(file.name).toLowerCase();
    if (!PHOTO_EXT.has(ext) || file.size > MAX_PHOTO_BYTES) redirect("/settings/advisors?error=photo");
    const stored = await saveUpload("photo", `advisor-${Date.now()}${ext}`, Buffer.from(await file.arrayBuffer()), file.type);
    photoUrl = `/api/briefs/${stored}`;
  }

  const data = { name, headline, linkedinUrl, sortOrder, active, ...(photoUrl ? { photoUrl } : {}) };
  if (id) await prisma.advisor.update({ where: { id }, data });
  else await prisma.advisor.create({ data });

  revalidatePath("/settings/advisors");
  revalidatePath("/the-hour");
  redirect("/settings/advisors?saved=1");
}
