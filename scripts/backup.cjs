// Backs up the live (Supabase) data onto this machine.
//   1. every table, as one JSON file, in ~/prequate-table-backups/<date-time>/
//   2. every file in the three Supabase buckets, copied into data/uploads
//      (names are kept, files already there are skipped), so the uploads
//      folder is always a full local copy
// The last 14 database backups are kept. Read only on the Supabase side.
//
//   npm run backup
const fs = require("fs");
const os = require("os");
const path = require("path");
const { PrismaClient, Prisma } = require("@prisma/client");
const { createClient } = require("@supabase/supabase-js");

const root = path.join(__dirname, "..");
const BACKUPS = process.env.TABLE_BACKUP_DIR || path.join(os.homedir(), "prequate-table-backups");
const UPLOADS = path.join(root, "data/uploads");
const KEEP = 14;
const BUCKETS = ["hour-files", "insight-images", "profile-photos"];

const readEnv = (f) => (fs.existsSync(f) ? Object.fromEntries(fs.readFileSync(f, "utf8").split("\n").filter((l) => /^[A-Z_]+=/.test(l)).map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "").trim()]; })) : {});
const env = { ...readEnv(path.join(root, "apps/admin/.env.local")), ...process.env };

(async () => {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const dir = path.join(BACKUPS, stamp);
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });

  // 1. The database.
  const p = new PrismaClient();
  const models = Prisma.dmmf.datamodel.models;
  const out = {};
  const counts = {};
  for (const m of models) {
    const d = m.name.charAt(0).toLowerCase() + m.name.slice(1);
    out[m.name] = await p[d].findMany();
    counts[m.name] = out[m.name].length;
  }
  await p.$disconnect();
  fs.writeFileSync(path.join(dir, "db.json"), JSON.stringify(out), { mode: 0o600 });
  fs.writeFileSync(path.join(dir, "manifest.json"), JSON.stringify({ takenAt: new Date().toISOString(), tables: counts, rows: Object.values(counts).reduce((a, b) => a + b, 0) }, null, 2), { mode: 0o600 });
  console.log(`database: ${Object.keys(counts).length} tables, ${Object.values(counts).reduce((a, b) => a + b, 0)} rows -> ${dir}`);

  // 2. The files.
  if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
    const client = createClient(new URL(env.SUPABASE_URL).origin, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    fs.mkdirSync(UPLOADS, { recursive: true });
    let got = 0, had = 0, failed = 0;
    for (const bucket of BUCKETS) {
      const { data: list, error } = await client.storage.from(bucket).list("", { limit: 1000 });
      if (error) { console.log(`files: could not list ${bucket}: ${error.message}`); failed++; continue; }
      for (const f of list.filter((x) => x.id)) {
        const target = path.join(UPLOADS, path.basename(f.name));
        if (fs.existsSync(target)) { had++; continue; }
        const { data, error: e } = await client.storage.from(bucket).download(f.name);
        if (e || !data) { failed++; console.log(`files: could not download ${bucket}/${f.name}`); continue; }
        fs.writeFileSync(target, Buffer.from(await data.arrayBuffer()));
        got++;
      }
    }
    console.log(`files: ${got} new copied to data/uploads, ${had} already there${failed ? `, ${failed} problem(s)` : ""}`);
  } else {
    console.log("files: Supabase is not configured here, skipped");
  }

  // 3. Keep the newest few.
  const all = fs.readdirSync(BACKUPS).filter((n) => /^\d{4}-\d{2}-\d{2}T/.test(n)).sort();
  for (const old of all.slice(0, Math.max(0, all.length - KEEP))) fs.rmSync(path.join(BACKUPS, old), { recursive: true, force: true });
  fs.writeFileSync(path.join(BACKUPS, "LATEST"), stamp);
  console.log(`kept ${Math.min(all.length, KEEP)} backup(s). latest: ${stamp}`);
})().catch((e) => { console.error("BACKUP FAILED:", String(e.message).split("\n").slice(-3).join(" ").replace(/postgres(ql)?:\/\/[^\s]*/g, "<url>")); process.exit(1); });
