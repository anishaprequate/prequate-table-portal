// Read-only. Reports where the launch exit criteria stand: no changes are made.
//   npm run launch-check
const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

function envNames(file) {
  const out = {};
  try {
    for (const line of fs.readFileSync(path.join(__dirname, "..", file), "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  } catch (e) {}
  return out;
}

const results = [];
const check = (ok, label, detail) => results.push({ ok, label, detail });

(async () => {
  const prisma = new PrismaClient();
  const admin = envNames("apps/admin/.env.local");
  const member = envNames("apps/member/.env.local");

  // 1. Every seated member has a working access code on their plate.
  const seated = await prisma.user.findMany({
    where: { role: "MEMBER", seatNumber: { not: null } },
    select: { name: true, seatNumber: true, email: true, accessCodeHash: true, accessCodeRetiredAt: true, notionPageId: true },
    orderBy: { seatNumber: "asc" },
  });
  const real = seated.filter((m) => m.notionPageId);
  const sample = seated.filter((m) => !m.notionPageId);
  const noCode = real.filter((m) => !m.accessCodeHash && !m.accessCodeRetiredAt);
  check(real.length > 0, "Real seated members are in the portal (from the Notion master)", `${real.length} real, ${sample.length} sample (mock) seats`);
  check(real.length > 0 && noCode.length === 0, "Every real seated member has an access code", noCode.length ? `missing: ${noCode.map((m) => `seat ${m.seatNumber} ${m.name}`).join(", ")}` : `${real.length} of ${real.length}`);
  check(real.every((m) => m.email), "Every real seated member has an email (needed for the one-time sign-in code)", real.filter((m) => !m.email).map((m) => m.name).join(", ") || "all have one");

  // 2. The inaugural dinner exists as a closed event with all invitees.
  const dinner = await prisma.event.findFirst({
    where: { title: { contains: "Inaugural Dinner" }, NOT: { title: { contains: "(test)" } } },
    include: { attendances: { select: { memberId: true, invited: true, invitationSentAt: true } } },
  });
  check(Boolean(dinner), "The inaugural dinner exists (not the test copy)", dinner ? dinner.title : "none yet");
  if (dinner) {
    check(dinner.inviteOnly, "It is a closed event (invite only)", dinner.inviteOnly ? "yes" : "it is open");
    check(Boolean(dinner.publishedAt), "It is published, so the invitations have gone", dinner.publishedAt ? "yes" : "still a draft");
    const invited = new Set(dinner.attendances.filter((a) => a.invited && a.invitationSentAt).map((a) => a.memberId));
    const realIds = (await prisma.user.findMany({ where: { role: "MEMBER", notionPageId: { not: null }, seatNumber: { not: null } }, select: { id: true, name: true } }));
    const missing = realIds.filter((m) => !invited.has(m.id));
    check(missing.length === 0 && realIds.length > 0, "Every real seated member is invited", missing.length ? `not invited: ${missing.map((m) => m.name).join(", ")}` : `${realIds.length} invited`);
    check(Boolean(dinner.dinnerQuestion), "It carries a dinner question", dinner.dinnerQuestion ? "yes" : "none set");
    check(Boolean(dinner.location), "It has a place", dinner.location || "none set");
  }

  // 3. Partners can sign in and have something to see.
  const partners = await prisma.user.findMany({ where: { role: "PARTNER" }, select: { name: true, username: true, passwordHash: true } });
  check(partners.length >= 2 && partners.every((p) => p.username && p.passwordHash), "Both partners have an admin login", partners.map((p) => `${p.name}: ${p.username && p.passwordHash ? "ok" : "missing"}`).join("; "));

  // 4. Setup the launch depends on.
  const settings = await prisma.appSettings.findUnique({ where: { id: "singleton" } });
  check(Boolean(settings?.notionLastSyncAt), "The Notion sync has run", settings?.notionLastSyncSummary || "never");
  check(Boolean(admin.ACCESS_CODE_PEPPER) && Boolean(member.ACCESS_CODE_PEPPER) && admin.ACCESS_CODE_PEPPER === member.ACCESS_CODE_PEPPER, "The access code secret (pepper) is set and the same in both apps", "values not shown");
  check(Boolean(admin.SMTP_USER && admin.SMTP_APP_PASSWORD), "Email can be sent (SMTP is set)", admin.SMTP_USER ? "set" : "not set, emails are only logged");
  check(Boolean(admin.VAPID_PRIVATE_KEY && member.NEXT_PUBLIC_VAPID_PUBLIC_KEY), "Push keys are set", "set");
  check(Boolean(admin.CRON_SECRET), "The scheduler secret is set", admin.CRON_SECRET ? "set" : "missing");
  const addr = admin.MEMBER_APP_URL || "";
  check(/^https:\/\//.test(addr) && !/trycloudflare|localhost/.test(addr), "The portal has a stable https address", addr || "not set (quick tunnel or localhost only)");

  // The member sign-in screen a real person will meet.
  const login = fs.readFileSync(path.join(__dirname, "..", "apps/member/src/app/login/page.tsx"), "utf8");
  check(/plate code|access code/i.test(login), "Member sign-in has a typed plate code step", "sign-in offers: tap plate, phone, email");

  await prisma.$disconnect();
  const width = Math.max(...results.map((r) => r.label.length));
  for (const r of results) console.log(`${r.ok ? "PASS" : "OPEN"}  ${r.label.padEnd(width)}  ${r.detail ?? ""}`);
  console.log(`\n${results.filter((r) => !r.ok).length} open of ${results.length}`);
})();
