import { prisma } from "@prequate/db";

const NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];

function wordFor(n: number): string {
  return NUMBER_WORDS[n] ?? String(n);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export interface PartnerAvailabilityLine {
  partnerId: string;
  text: string;
}

// One calm line per partner on this month's open Hours — no member
// activity, no names beyond the partner's own. Deliberately reads off each
// partner's monthly Table-Hours allowance, not their raw connected-calendar
// free/busy slots — the latter runs to dozens of open slots (plenty of
// choice for the booking flow's own slot picker) and would read as "wide
// open" rather than the scarcity this panel is meant to convey.
export async function getPartnerAvailabilityLines(): Promise<PartnerAvailabilityLine[]> {
  const partners = await prisma.user.findMany({ where: { role: "PARTNER" }, orderBy: { name: "asc" } });
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const monthName = now.toLocaleDateString("en-IN", { month: "long" });

  const lines: PartnerAvailabilityLine[] = [];

  for (const partner of partners) {
    const bookedThisMonth = await prisma.booking.count({
      where: { partnerId: partner.id, status: { not: "CANCELLED" }, startTime: { gte: monthStart, lt: monthEnd } },
    });
    const open = Math.max(0, partner.monthlyHourCapacity - bookedThisMonth);

    const firstName = partner.name.split(" ")[0];
    const text =
      open === 0
        ? `${firstName}'s Hours for ${monthName} are held.`
        : `${firstName} has ${wordFor(open)} Hour${open === 1 ? "" : "s"} open this month.`;

    lines.push({ partnerId: partner.id, text });
  }

  return lines;
}

// The optional, admin-toggleable "room pulse" — total Hours held this
// month across every partner, never with names. Returns null when the
// toggle is off or there's nothing held yet.
export async function getRoomPulseLine(): Promise<string | null> {
  const settings = await prisma.appSettings.findUnique({ where: { id: "singleton" } });
  if (settings && !settings.roomPulseEnabled) return null;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const monthName = now.toLocaleDateString("en-IN", { month: "long" });

  const count = await prisma.booking.count({
    where: { status: { not: "CANCELLED" }, startTime: { gte: monthStart, lt: monthEnd } },
  });
  if (count === 0) return null;

  return `${capitalize(wordFor(count))} Hour${count === 1 ? "" : "s"} held in ${monthName}.`;
}
