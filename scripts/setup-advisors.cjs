// Marks who gives Hours and who answers advisor requests, and adds the three
// advisors. Safe to run again. Names and descriptions were given by Anisha;
// photos are added in admin Settings, Advisors.
const { PrismaClient } = require("@prisma/client");

const HOSTS = ["nag", "rakesh", "amogh"];
const DESK = ["admin", "nag"];
const ADVISORS = [
  { name: "Arnab Bhattacharya", headline: "CEO, GATI Foundation", linkedinUrl: "https://www.linkedin.com/in/bhattacharayaarnab", sortOrder: 1 },
  { name: "Uday Shetty", headline: "CEO, Cornerstone Communications", linkedinUrl: "https://www.linkedin.com/in/uday-shetty-1a0591a/", sortOrder: 2 },
  {
    name: "Srini Vudayagiri",
    headline: "President, The Times of India & Head of Brand Capital / Brand Estate",
    linkedinUrl: "https://www.linkedin.com/in/srinivudayagiri/",
    sortOrder: 3,
  },
];

(async () => {
  const prisma = new PrismaClient();
  for (const u of HOSTS) {
    const r = await prisma.user.updateMany({ where: { username: u }, data: { hostsHours: true } });
    console.log(`hosts Hours  ${u.padEnd(8)} ${r.count ? "yes" : "NOT FOUND"}`);
  }
  for (const u of DESK) {
    const r = await prisma.user.updateMany({ where: { username: u }, data: { advisorDesk: true } });
    console.log(`advisor desk ${u.padEnd(8)} ${r.count ? "yes" : "NOT FOUND"}`);
  }
  for (const a of ADVISORS) {
    const existing = await prisma.advisor.findFirst({ where: { linkedinUrl: a.linkedinUrl } });
    if (existing) {
      console.log(`advisor kept ${a.name}`);
      continue;
    }
    await prisma.advisor.create({ data: a });
    console.log(`advisor added ${a.name}`);
  }
  await prisma.$disconnect();
})();
