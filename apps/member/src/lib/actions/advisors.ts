"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@prequate/db";
import { availability, createNotification } from "@prequate/core";
import { getCurrentUser } from "@/lib/session";
import { findBookingInMonth, findAdvisorRequestInMonth, findHourInMonth, formatMonthLabel } from "@/lib/monthly-cap";
import { formatSlot } from "@/lib/format";

// Advisors work as a request and an answer. The member proposes a date and
// nothing else; the advisor desk (Anisha and Nag) comes back with up to three
// times; the member takes one. There is no calendar behind an advisor, so
// nothing here touches Google.

export type AdvisorState = { status: "idle" } | { status: "ok"; message: string } | { status: "error"; message: string };

const fail = (message: string): AdvisorState => ({ status: "error", message });

async function tellTheDesk(message: string, requestId: string) {
  const desk = await prisma.user.findMany({ where: { advisorDesk: true }, select: { id: true } });
  await Promise.all(
    desk.map((d) =>
      createNotification({
        recipientId: d.id,
        type: "advisor_request",
        message,
        relatedEntityType: "advisor_request",
        relatedEntityId: requestId,
      }),
    ),
  );
}

export async function requestAdvisorHour(_prev: AdvisorState, formData: FormData): Promise<AdvisorState> {
  const user = await getCurrentUser();
  if (!user) return fail("Please sign in again.");

  const advisorId = String(formData.get("advisorId") ?? "");
  const dateKey = String(formData.get("date") ?? "");
  const note = String(formData.get("memberContext") ?? "").trim().slice(0, 1000) || null;

  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!m) return fail("Choose a date first.");
  const date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (Number.isNaN(date.getTime())) return fail("Choose a date first.");

  const now = new Date();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  if (date < tomorrow) return fail("Choose a date from tomorrow.");
  if (date >= availability.bookingHorizon(now)) return fail("Choose a date in this month or next.");
  if (date.getDay() === 0 || date.getDay() === 6) return fail("Choose a weekday.");

  const advisor = await prisma.advisor.findFirst({ where: { id: advisorId, active: true }, select: { id: true, name: true } });
  if (!advisor) return fail("That advisor is not available. Choose another.");

  const existing = await findHourInMonth(user.id, date);
  if (existing) {
    return fail(
      `You already have your ${formatMonthLabel(date)} Hour, with ${existing.firstName}${existing.hasTime ? ` on ${formatSlot(existing.at)}` : ""}.`,
    );
  }

  const request = await prisma.advisorRequest.create({
    data: { advisorId: advisor.id, memberId: user.id, proposedDate: date, note },
  });

  const when = new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long" }).format(date);
  await tellTheDesk(`${user.name} would like an Hour with ${advisor.name}, around ${when}. Offer times.`, request.id);

  revalidatePath("/the-hour");
  revalidatePath("/home");
  return { status: "ok", message: `Sent. We will come back with times for ${when}.` };
}

export async function withdrawAdvisorRequest(formData: FormData): Promise<AdvisorState> {
  const user = await getCurrentUser();
  if (!user) return fail("Please sign in again.");
  const id = String(formData.get("requestId") ?? "");

  const request = await prisma.advisorRequest.findFirst({
    where: { id, memberId: user.id, status: { in: ["REQUESTED", "OFFERED"] } },
    include: { advisor: { select: { name: true } } },
  });
  if (!request) return fail("That request can no longer be withdrawn.");

  await prisma.advisorRequest.update({ where: { id }, data: { status: "WITHDRAWN" } });
  await tellTheDesk(`${user.name} withdrew the request for an Hour with ${request.advisor.name}.`, id);

  revalidatePath("/the-hour");
  revalidatePath("/home");
  return { status: "ok", message: "Withdrawn. Your month is free again." };
}

// One tap on one of the times offered.
export async function acceptAdvisorTime(formData: FormData): Promise<AdvisorState> {
  const user = await getCurrentUser();
  if (!user) return fail("Please sign in again.");

  const id = String(formData.get("requestId") ?? "");
  const start = new Date(String(formData.get("start") ?? ""));
  if (Number.isNaN(start.getTime())) return fail("Choose one of the times.");

  const request = await prisma.advisorRequest.findFirst({
    where: { id, memberId: user.id, status: "OFFERED" },
    include: { advisor: { select: { name: true } } },
  });
  if (!request) return fail("These times are no longer on offer.");

  const slots = JSON.parse(request.offeredSlots ?? "[]") as { start: string; end: string }[];
  const picked = slots.find((s) => new Date(s.start).getTime() === start.getTime());
  if (!picked) return fail("Choose one of the times offered.");
  if (start <= new Date()) return fail("That time has passed. Ask us for new times.");

  // One Hour a month: the picked time may fall in a different month from the
  // date proposed, so check that month again.
  const [booking, other] = await Promise.all([
    findBookingInMonth(user.id, start),
    findAdvisorRequestInMonth(user.id, start, id),
  ]);
  if (booking || other) return fail(`You already have your ${formatMonthLabel(start)} Hour.`);

  await prisma.advisorRequest.update({
    where: { id },
    data: { status: "CONFIRMED", confirmedStart: new Date(picked.start), confirmedEnd: new Date(picked.end) },
  });
  await tellTheDesk(`${user.name} took ${formatSlot(new Date(picked.start))} with ${request.advisor.name}.`, id);

  revalidatePath("/the-hour");
  revalidatePath("/home");
  return { status: "ok", message: `Booked: ${formatSlot(new Date(picked.start))} with ${request.advisor.name.split(" ")[0]}.` };
}
