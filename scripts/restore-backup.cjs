// Loads a backup (from scripts/backup.cjs) into a database that is EMPTY, or
// into one it is told to empty first. It uses whatever DATABASE_URL is in the
// environment, so choose the target on purpose:
//
//   DATABASE_URL=... node scripts/restore-backup.cjs latest --reset
//
// It refuses a database that is not on this machine unless --allow-remote is
// given, so a slip cannot wipe the live data.
const fs = require("fs");
const os = require("os");
const path = require("path");
const { PrismaClient, Prisma } = require("@prisma/client");

const BACKUPS = process.env.TABLE_BACKUP_DIR || path.join(os.homedir(), "prequate-table-backups");
const arg = process.argv[2];
const reset = process.argv.includes("--reset");
const remoteOk = process.argv.includes("--allow-remote");
// --skip=Session,OtpCode leaves those tables empty (sign-in sessions and codes are not worth carrying over).
const skip = new Set((process.argv.find((a) => a.startsWith("--skip=")) || "").slice(7).split(",").filter(Boolean));

(async () => {
  if (!arg) { console.log("Usage: restore-backup.cjs <backup folder name | latest> [--reset] [--allow-remote]"); process.exit(1); }
  const name = arg === "latest" ? fs.readFileSync(path.join(BACKUPS, "LATEST"), "utf8").trim() : arg;
  const file = path.join(BACKUPS, name, "db.json");
  if (!fs.existsSync(file)) { console.log("No such backup:", name); process.exit(1); }
  const host = (() => { try { return new URL(process.env.DATABASE_URL).hostname; } catch { return "unknown"; } })();
  const local = ["localhost", "127.0.0.1", "::1"].includes(host);
  if (!local && !remoteOk) { console.log(`Refusing: the target database is ${host}, not this machine. Add --allow-remote only if you mean it.`); process.exit(1); }
  console.log(`restoring backup ${name} into ${local ? "the local database" : host}`);

  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  for (const n of skip) data[n] = [];
  const p = new PrismaClient();
  const models = Prisma.dmmf.datamodel.models;
  const byName = Object.fromEntries(models.map((m) => [m.name, m]));
  const delegate = (n) => n.charAt(0).toLowerCase() + n.slice(1);

  if (reset) {
    await p.$executeRawUnsafe(`TRUNCATE TABLE ${models.map((m) => `"${m.dbName || m.name}"`).join(", ")} CASCADE`);
    console.log("tables emptied");
  }
  for (const m of models) {
    const n = await p[delegate(m.name)].count();
    if (n > 0) { console.log(`ABORT: ${m.name} already has rows. Use --reset to empty the database first.`); process.exit(1); }
  }

  const deps = {}, selfFields = {};
  for (const m of models) {
    deps[m.name] = new Set(); selfFields[m.name] = [];
    for (const f of m.fields) if (f.kind === "object" && f.relationFromFields && f.relationFromFields.length) {
      if (f.type === m.name) selfFields[m.name].push(...f.relationFromFields); else deps[m.name].add(f.type);
    }
  }
  const order = []; const left = new Set(models.map((m) => m.name));
  while (left.size) {
    const ready = [...left].filter((n) => [...deps[n]].every((d) => !left.has(d)));
    if (!ready.length) { console.log("Cannot order tables:", [...left].join(", ")); process.exit(1); }
    ready.forEach((n) => { order.push(n); left.delete(n); });
  }
  // Rows whose parent is gone cannot be kept: the database enforces the link.
  const dropped = {};
  for (let changed = true; changed; ) {
    changed = false;
    for (const m of models) for (const f of m.fields) {
      if (f.kind !== "object" || !f.relationFromFields || !f.relationFromFields.length) continue;
      const ids = new Set((data[f.type] || []).map((r) => r[f.relationToFields[0]]));
      const fk = f.relationFromFields[0];
      const before = (data[m.name] || []).length;
      data[m.name] = (data[m.name] || []).filter((r) => r[fk] == null || ids.has(r[fk]));
      const gone = before - data[m.name].length;
      if (gone) { dropped[m.name] = (dropped[m.name] || 0) + gone; changed = true; }
    }
  }
  if (Object.keys(dropped).length) console.log("rows skipped, parent missing:", JSON.stringify(dropped));
  const revive = (m, row) => { const o = {}; for (const f of m.fields) { if (f.kind !== "scalar") continue; let v = row[f.name]; if (v === undefined) continue; if (v !== null && f.type === "DateTime") v = new Date(v); o[f.name] = v; } return o; };

  for (const name of order) {
    const m = byName[name]; const rows = data[name] || []; if (!rows.length) continue;
    const later = [];
    const prepared = rows.map((r) => { const o = revive(m, r); const patch = {}; for (const k of selfFields[name]) if (o[k] != null) { patch[k] = o[k]; o[k] = null; } if (Object.keys(patch).length) later.push([o.id, patch]); return o; });
    for (let i = 0; i < prepared.length; i += 200) await p[delegate(name)].createMany({ data: prepared.slice(i, i + 200) });
    for (const [id, patch] of later) await p[delegate(name)].update({ where: { id }, data: patch });
  }
  let bad = 0;
  for (const m of models) { const n = await p[delegate(m.name)].count(); const want = (data[m.name] || []).length; if (n !== want) { bad++; console.log("MISMATCH", m.name, want, n); } }
  console.log(bad ? `${bad} table(s) do not match` : `restored: all ${models.length} tables match`);
  await p.$disconnect();
})().catch((e) => { console.error("RESTORE FAILED:", String(e.message).split("\n").slice(-3).join(" ").replace(/postgres(ql)?:\/\/[^\s]*/g, "<url>")); process.exit(1); });
