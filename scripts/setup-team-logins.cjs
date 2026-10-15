// Gives each admin login its username. Safe to run again. It never sets or
// shows a password: use `npm run set-password -- <username>` for that.
const { PrismaClient } = require("@prisma/client");

const LOGINS = [
  { username: "admin", match: { role: "ADMIN_OWNER" } },
  { username: "nag", match: { name: "Pradyumna Nag" } },
  { username: "rakesh", match: { name: "Rakesh Bordia" } },
  { username: "associate", match: { role: "ADMIN_ASSOCIATE" }, rename: "Associate" },
  // Amogh is created if he does not exist yet, with full admin access.
  { username: "amogh", match: { name: "Amogh Giridhar" }, create: { name: "Amogh Giridhar", role: "ADMIN_RM" } },
];

(async () => {
  const prisma = new PrismaClient();
  for (const l of LOGINS) {
    let user = await prisma.user.findFirst({ where: l.match });
    if (!user && l.create) user = await prisma.user.create({ data: l.create });
    if (!user) {
      console.log(`skipped ${l.username}: no matching person`);
      continue;
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { username: l.username, ...(l.rename ? { name: l.rename } : {}) },
    });
    console.log(`${l.username.padEnd(10)} -> ${l.rename ?? user.name} (${user.role})`);
  }
  // The RM Desk is not a login any more. Its record stays, because messages refer to it.
  const rm = await prisma.user.updateMany({ where: { name: "Prequate RM Desk" }, data: { username: null, passwordHash: null } });
  console.log(`RM Desk sign-in removed (${rm.count} record kept)`);
  await prisma.$disconnect();
})();
