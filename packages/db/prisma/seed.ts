import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const Role = {
  MEMBER: "MEMBER",
  PARTNER: "PARTNER",
  ADMIN_OWNER: "ADMIN_OWNER",
  ADMIN_RM: "ADMIN_RM",
  ADMIN_ASSOCIATE: "ADMIN_ASSOCIATE",
} as const;

const CONCIERGE_CATALOG: Array<{
  group: string;
  category: string;
  examples: string[];
}> = [
  {
    group: "Lifestyle Touchpoints",
    category: "Travel",
    examples: [
      "Itinerary planning",
      "Guided tours",
      "Chartered travel",
      "Retreats",
      "Flights and train concierge",
    ],
  },
  {
    group: "Lifestyle Touchpoints",
    category: "Lifestyle services",
    examples: [
      "Personal shopping and gifting",
      "Expert consultations",
      "Daily errands",
      "Unusual requests",
    ],
  },
  {
    group: "Lifestyle Touchpoints",
    category: "Wellness",
    examples: ["Retreats", "Priority booking", "Specialist access"],
  },
  {
    group: "Access Touchpoints",
    category: "Restaurants",
    examples: [
      "Reservations",
      "Dietary accommodation",
      "Cuisine preference",
      "Private chef access",
    ],
  },
  {
    group: "Access Touchpoints",
    category: "Exclusive access",
    examples: [
      "Sold out shows and events",
      "Ceremonies and awards",
      "Behind the scenes",
      "Gallery and auction previews",
    ],
  },
  {
    group: "Access Touchpoints",
    category: "Education",
    examples: ["Consulting experts", "Private tuition", "Education networks"],
  },
  {
    group: "Access Touchpoints",
    category: "Expert network",
    examples: [
      "Subject matter experts",
      "Researchers",
      "Specialist consultants (art experts, physicians, architects, and similar)",
    ],
  },
  {
    group: "Experience Touchpoints",
    category: "Private events",
    examples: [
      "End to end planning and execution for member events and unique requests",
    ],
  },
  {
    group: "Experience Touchpoints",
    category: "Art and culture",
    examples: [
      "Artist network",
      "Artisanal vendors",
      "Curation and advisory access",
      "Gallery and auction house connections",
    ],
  },
  {
    group: "Experience Touchpoints",
    category: "Sport",
    examples: ["VIP club access", "Court access", "Player access", "Expert coaching"],
  },
];

// Seeded from Anisha's CPG-FMCG sourcing database in Notion ("CPG-FMCG Table
// Leads — ₹100-1000Cr Unfunded (v2)"), filtered to the 11 rows marked
// "Verified by Anisha". Real names and companies; bios are written fresh
// from the sourcing notes rather than copied, and deliberately omit
// contested/unverified revenue figures the notes themselves flag as such.
//
// IMPORTANT: every one of these 11 is still at "Prospect" status in that
// database — none has been invited, onboarded, or confirmed as an actual
// Prequate Table member. They are used here purely as realistic prototype
// content. Contact fields (phone, email, chip UID) are synthetic
// placeholders, not these people's real contact details, so this prototype
// never doubles as a way to reach them.
const MEMBERS = [
  {
    name: "Himmath Jain",
    seatNumber: "001",
    seatType: "Founding Seat",
    phone: "+919820000001",
    email: "himmath.jain@example.com",
    chipUid: "CHIP-101",
    bio: "Co-founder of a single-ingredient protein supplement brand out of Bengaluru, relaunched in 2018 and among the fastest-growing in its category.",
    points: 0,
  },
  {
    name: "Deeksha S Kumar",
    seatNumber: "002",
    seatType: "Founding Seat",
    phone: "+919820000002",
    email: "deeksha.kumar@example.com",
    chipUid: "CHIP-102",
    bio: "Second-generation Managing Director of a spice manufacturer her parents founded in 2006, now FSSC 22000 and USFDA certified.",
    points: 0,
  },
  {
    name: "Arvind Varchaswi",
    seatNumber: "003",
    seatType: "Founding Seat",
    phone: "+919820000003",
    email: "arvind.varchaswi@example.com",
    chipUid: "CHIP-103",
    bio: "Managing Director of an Ayurvedic wellness group spanning manufacturing, a hospital, and Panchakarma centers, with consistent double-digit growth.",
    points: 0,
  },
  {
    name: "Nagaraja Rao",
    seatNumber: "004",
    seatType: "Founding Seat",
    phone: "+919820000004",
    email: "nagaraja.rao@example.com",
    chipUid: "CHIP-104",
    bio: "Third-generation director of a Bengaluru coffee roasting business his grandfather started as a grocery in 1956.",
    points: 0,
  },
  {
    name: "Navrathan Jain",
    seatNumber: "005",
    seatType: "Founding Seat",
    phone: "+919820000005",
    email: "navrathan.jain@example.com",
    chipUid: "CHIP-105",
    bio: "Managing Director of a family-run dairy ingredients manufacturer based in Bengaluru.",
    points: 0,
  },
  {
    name: "Nick Pandey",
    seatNumber: "006",
    seatType: "Founding Seat",
    phone: "+919820000006",
    email: "nick.pandey@example.com",
    chipUid: "CHIP-106",
    bio: "Co-founder of an agri-processing company run from a factory near Tumkur, built alongside a former UN agricultural researcher.",
    points: 0,
  },
  {
    name: "Milan Shah",
    seatNumber: "007",
    seatType: "Founding Seat",
    phone: "+919820000007",
    email: "milan.shah@example.com",
    chipUid: "CHIP-107",
    bio: "Managing Director of a long-established Bengaluru herbs and spice exporter, now also building a consumer spice brand.",
    points: 0,
  },
  {
    name: "Firoz H M",
    seatNumber: "008",
    seatType: "Founding Seat",
    phone: "+919820000008",
    email: "firoz.hm@example.com",
    chipUid: "CHIP-108",
    bio: "Founder of a Bengaluru herbal extracts and nutraceutical ingredients manufacturer, exporting from its KIADB facility.",
    points: 0,
  },
  {
    name: "Subrata Dutta",
    seatNumber: "009",
    seatType: "Founding Seat",
    phone: "+919820000009",
    email: "subrata.dutta@example.com",
    chipUid: "CHIP-109",
    bio: "Founder of a nutrition and personal care brand built on a direct-selling model, launched in 2018.",
    points: 0,
  },
  {
    name: "Abhilash Thomas",
    seatNumber: "010",
    seatType: "Founding Seat",
    phone: "+919820000010",
    email: "abhilash.thomas@example.com",
    chipUid: "CHIP-110",
    bio: "Co-founder and CEO of a direct-selling health sciences company, and an occasional public speaker on entrepreneurship.",
    points: 0,
  },
  {
    name: "Sunil Attavar",
    seatNumber: "011",
    seatType: "Founding Seat",
    phone: "+919820000011",
    email: "sunil.attavar@example.com",
    chipUid: "CHIP-111",
    bio: "Chairman connected to a 45-year Bengaluru oral care manufacturer behind the Enafix brand.",
    points: 0,
  },
];

const PARTNERS = [
  {
    name: "Pradyumna Nag",
    email: "pradyumna@prequate.one",
    bio: "Founding Partner, Prequate Advisory.",
  },
  {
    name: "Rakesh Bordia",
    email: "rakesh@prequate.one",
    bio: "Founding Partner, Prequate Advisory.",
  },
];

async function main() {
  await prisma.notification.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conciergeRequest.deleteMany();
  await prisma.conciergeCategory.deleteMany();
  await prisma.eventAttendance.deleteMany();
  await prisma.event.deleteMany();
  await prisma.brief.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.insightPost.deleteMany();
  await prisma.session.deleteMany();
  await prisma.otpCode.deleteMany();
  await prisma.user.deleteMany();

  for (const member of MEMBERS) {
    await prisma.user.create({
      data: { role: Role.MEMBER, ...member },
    });
  }

  for (const partner of PARTNERS) {
    await prisma.user.create({
      data: { role: Role.PARTNER, ...partner },
    });
  }

  await prisma.user.create({
    data: {
      role: Role.ADMIN_OWNER,
      name: "Anisha",
      email: "anisha@prequate.one",
      phone: "+919810000001",
    },
  });

  await prisma.user.create({
    data: {
      role: Role.ADMIN_RM,
      name: "Prequate RM Desk",
      email: "rm@prequate.one",
      phone: "+919810000002",
    },
  });

  for (const [index, entry] of CONCIERGE_CATALOG.entries()) {
    await prisma.conciergeCategory.create({
      data: {
        group: entry.group,
        category: entry.category,
        examples: JSON.stringify(entry.examples),
        sortOrder: index,
      },
    });
  }

  console.log(
    `Seeded ${MEMBERS.length} members, ${PARTNERS.length} partners, 2 admins, ${CONCIERGE_CATALOG.length} concierge categories.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
