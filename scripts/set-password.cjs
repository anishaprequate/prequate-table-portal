#!/usr/bin/env node
// Set (or change) the password for an admin login. Run it in your own
// terminal, so the password is typed there and never passes through anyone
// else:
//
//   npm run set-password -- admin
//
// The password is read without echo, asked for twice, and stored only as a
// salted scrypt hash. Usernames are the names on the admin sign-in page.
const { randomBytes, scryptSync } = require("crypto");
const { PrismaClient } = require("@prisma/client");

function ask(prompt) {
  return new Promise((resolve) => {
    process.stdout.write(prompt);
    const stdin = process.stdin;
    let value = "";
    stdin.setRawMode && stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    const onData = (ch) => {
      for (const c of ch) {
        if (c === "\u0003") process.exit(130); // Ctrl-C
        if (c === "\r" || c === "\n") {
          stdin.setRawMode && stdin.setRawMode(false);
          stdin.pause();
          stdin.removeListener("data", onData);
          process.stdout.write("\n");
          return resolve(value);
        }
        if (c === "\u007f" || c === "\b") value = value.slice(0, -1);
        else value += c;
      }
    };
    stdin.on("data", onData);
  });
}

(async () => {
  const username = (process.argv[2] || "").trim().toLowerCase();
  if (!username) {
    console.error("Usage: npm run set-password -- <username>   (for example: admin, nag, rakesh, amogh, associate)");
    process.exit(1);
  }
  const prisma = new PrismaClient();
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) {
    const names = (await prisma.user.findMany({ where: { username: { not: null } }, select: { username: true } })).map((u) => u.username);
    console.error(`No login called "${username}". Logins: ${names.join(", ")}`);
    await prisma.$disconnect();
    process.exit(1);
  }

  const first = await ask(`New password for ${username} (${user.name}): `);
  if (first.length < 8) {
    console.error("Use at least 8 characters.");
    await prisma.$disconnect();
    process.exit(1);
  }
  const second = await ask("Type it again: ");
  if (first !== second) {
    console.error("The two did not match. Nothing was changed.");
    await prisma.$disconnect();
    process.exit(1);
  }

  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(first, salt, 64).toString("hex");
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: `scrypt$${salt}$${hash}` } });
  console.log(`Password set for ${username}.`);
  await prisma.$disconnect();
})();
