"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@prequate/db";
import { notifyMember } from "@prequate/core";
import { getCurrentAdmin, canView, canWrite } from "@/lib/session";

const STATUSES = ["NEW", "IN_PROGRESS", "DONE"];

// Move a member's request along and leave a note for the team.
export async function updateTableRequest(formData: FormData) {
  const admin = await getCurrentAdmin();
  if (!admin || !canView(admin.role) || !canWrite(admin.role)) redirect("/bookings");

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !STATUSES.includes(status)) redirect("/requests");
  const adminNote = String(formData.get("adminNote") ?? "").trim() || null;

  const before = await prisma.tableRequest.findUnique({ where: { id }, select: { status: true, type: true, memberId: true } });
  await prisma.tableRequest.update({ where: { id }, data: { status, adminNote } });

  // When a request moves to Done, the member is told, with the team's note.
  if (before && before.status !== "DONE" && status === "DONE") {
    const label = before.type === "BRIEF" ? "brief" : before.type === "PEER_HOUR" ? "peer Hour" : "reservation";
    await notifyMember({
      memberId: before.memberId,
      type: "request_done",
      message: `Your ${label} request is done.${adminNote ? ` ${adminNote}` : ""}`,
      entityType: "request",
      entityId: id,
      email: {
        subject: `Your ${label} request is done`,
        text: `Your ${label} request is done.${adminNote ? `\n\nFrom the team: ${adminNote}` : ""}\n\nSee it in The Prequate Table.`,
      },
    });
  }
  revalidatePath("/requests");
  redirect("/requests?saved=1");
}

// The book of the year shown on the member Home. Leave the title empty to
// take the shelf down.
export async function saveBook(formData: FormData) {
  const admin = await getCurrentAdmin();
  if (!admin || !canView(admin.role) || !canWrite(admin.role)) redirect("/bookings");

  const bookTitle = String(formData.get("bookTitle") ?? "").trim() || null;
  const bookAuthor = bookTitle ? String(formData.get("bookAuthor") ?? "").trim() || null : null;
  const dinnerRaw = String(formData.get("bookDinnerAt") ?? "").trim();
  const dinner = bookTitle && dinnerRaw ? new Date(dinnerRaw) : null;
  const bookDinnerAt = dinner && !Number.isNaN(dinner.getTime()) ? dinner : null;

  await prisma.appSettings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", bookTitle, bookAuthor, bookDinnerAt },
    update: { bookTitle, bookAuthor, bookDinnerAt },
  });

  revalidatePath("/settings");
  redirect("/settings?bookSaved=1");
}

// Crisis access: two sentences and a contact, shown in the member's Settings.
// Leave both empty to go back to the built-in wording.
export async function saveCrisisAccess(formData: FormData) {
  const admin = await getCurrentAdmin();
  if (!admin || !canView(admin.role) || !canWrite(admin.role)) redirect("/bookings");

  const crisisAccessText = String(formData.get("crisisAccessText") ?? "").trim().slice(0, 400) || null;
  const crisisAccessContact = String(formData.get("crisisAccessContact") ?? "").trim().slice(0, 120) || null;

  await prisma.appSettings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", crisisAccessText, crisisAccessContact },
    update: { crisisAccessText, crisisAccessContact },
  });

  revalidatePath("/settings");
  redirect("/settings?crisisSaved=1");
}

// Each partner's Table-hours calendar, for when Google sync is switched on.
// Saved now so setup later is only connecting the account.
export async function savePartnerCalendars(formData: FormData) {
  const admin = await getCurrentAdmin();
  if (!admin || !canView(admin.role) || !canWrite(admin.role)) redirect("/bookings");

  const partners = await prisma.user.findMany({ where: { hostsHours: true }, select: { id: true } });
  for (const p of partners) {
    const value = String(formData.get(`calendar_${p.id}`) ?? "").trim().slice(0, 200) || null;
    await prisma.user.update({ where: { id: p.id }, data: { tableHoursCalendarId: value } });
  }
  revalidatePath("/settings");
  redirect("/settings?hourSaved=1");
}
