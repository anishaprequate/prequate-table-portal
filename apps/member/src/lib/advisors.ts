import { prisma } from "@prequate/db";

export interface AdvisorView {
  id: string;
  name: string;
  headline: string | null;
  photoUrl: string | null;
  linkedinUrl: string | null;
}

export async function getAdvisors(): Promise<AdvisorView[]> {
  return prisma.advisor.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, headline: true, photoUrl: true, linkedinUrl: true },
  });
}

export interface AdvisorRequestView {
  id: string;
  advisorName: string;
  advisorPhotoUrl: string | null;
  status: "REQUESTED" | "OFFERED" | "CONFIRMED" | "DECLINED" | "WITHDRAWN";
  proposedDate: string; // ISO
  note: string | null;
  slots: { start: string; end: string }[];
  confirmedStart: string | null;
  confirmedEnd: string | null;
  declineReason: string | null;
}

// The member's advisor requests, newest first.
export async function getAdvisorRequests(memberId: string): Promise<AdvisorRequestView[]> {
  const rows = await prisma.advisorRequest.findMany({
    where: { memberId },
    orderBy: { createdAt: "desc" },
    include: { advisor: { select: { name: true, photoUrl: true } } },
  });
  const now = new Date();
  return rows.map((r) => ({
    id: r.id,
    advisorName: r.advisor.name,
    advisorPhotoUrl: r.advisor.photoUrl,
    status: r.status as AdvisorRequestView["status"],
    proposedDate: r.proposedDate.toISOString(),
    note: r.note,
    slots: (JSON.parse(r.offeredSlots ?? "[]") as { start: string; end: string }[]).filter((s) => new Date(s.start) > now),
    confirmedStart: r.confirmedStart?.toISOString() ?? null,
    confirmedEnd: r.confirmedEnd?.toISOString() ?? null,
    declineReason: r.declineReason,
  }));
}
