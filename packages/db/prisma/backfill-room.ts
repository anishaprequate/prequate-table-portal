// One-off backfill for the Room/Access-and-Privilege-Layer schema addition —
// gives existing seeded members plausible seatingDate/foundingCohort/city
// values, creates the AppSettings singleton, and seeds one recent
// RoomEvent so the "Seat N was taken on <day>" caption has something to
// show. Safe to re-run: every write is an upsert or a conditional create.
import { prisma } from "../src/index";

const CITIES = [
  "Mumbai",
  "Bengaluru",
  "Delhi NCR",
  "Chennai",
  "Hyderabad",
  "Pune",
  "Ahmedabad",
  "Kolkata",
  "Jaipur",
  "Kochi",
  "Coimbatore",
];

const FOUNDING_SEAT_NUMBERS = new Set(["001", "002", "003", "004"]);

function monthsAgo(n: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d;
}

async function main() {
  const members = await prisma.user.findMany({
    where: { role: "MEMBER" },
    orderBy: { seatNumber: "asc" },
  });

  for (const [i, member] of members.entries()) {
    // Earliest seat numbers were seated longest ago — roughly one new
    // seat every 3-5 weeks, most recent seat within the last fortnight.
    const monthsBack = Math.max(0, (members.length - 1 - i) * 0.9);
    await prisma.user.update({
      where: { id: member.id },
      data: {
        seatingDate: member.seatingDate ?? monthsAgo(monthsBack),
        foundingCohort: member.seatNumber ? FOUNDING_SEAT_NUMBERS.has(member.seatNumber) : false,
        city: member.city ?? CITIES[i % CITIES.length],
      },
    });
  }

  await prisma.appSettings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", roomPulseEnabled: true },
    update: {},
  });

  // Seed one RoomEvent for the most recently seated member, so the Room
  // has a real "was taken on <day>" caption to show on first load.
  const newest = members.at(-1);
  if (newest) {
    const existing = await prisma.roomEvent.findFirst({ where: { memberId: newest.id } });
    if (!existing) {
      await prisma.roomEvent.create({
        data: { memberId: newest.id, filledAt: newest.seatingDate ?? new Date() },
      });
    }
  }

  console.log(`Backfilled ${members.length} members, AppSettings singleton, and one RoomEvent.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
