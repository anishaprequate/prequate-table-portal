// One-off: copy the existing uploaded files that belong in Supabase Storage
// (Hour files, Insight images, photos) from the uploads folder into their
// private buckets, under the same file names, so no database row changes.
// Event covers, event photos and sponsor logos are left where they are.
// The local copies are not deleted. Safe to run twice.
//
//   node scripts/move-uploads-to-supabase.cjs          (shows the plan only)
//   node scripts/move-uploads-to-supabase.cjs --go     (does it)
const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");
const { createClient } = require("@supabase/supabase-js");

const root = path.join(__dirname, "..");
const readEnv = (f) => Object.fromEntries(fs.readFileSync(f, "utf8").split("\n").filter((l) => /^[A-Z_]+=/.test(l)).map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "").trim()]; }));
const env = { ...readEnv(path.join(root, "apps/admin/.env.local")), ...process.env };
const UPLOADS = path.join(root, "data/uploads");
const BUCKETS = { hour: "hour-files", insight: "insight-images", photo: "profile-photos" };
const TYPES = { ".pdf": "application/pdf", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".webp": "image/webp", ".svg": "image/svg+xml", ".txt": "text/plain", ".doc": "application/msword", ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document" };
const GO = process.argv.includes("--go");

const refs = (text) => [...String(text || "").matchAll(/\/api\/briefs\/([A-Za-z0-9_.~-]+)/g)].map((m) => m[1]);

(async () => {
  const p = new PrismaClient();
  const plan = new Map(); // name -> kind
  const add = (kind, name) => { if (name && !plan.has(name)) plan.set(name, kind); };

  for (const b of await p.brief.findMany({ select: { fileUrl: true } })) refs(b.fileUrl).forEach((n) => add("hour", n));
  for (const i of await p.insightPost.findMany({ select: { imageUrl: true, body: true } })) { refs(i.imageUrl).forEach((n) => add("insight", n)); refs(i.body).forEach((n) => add("insight", n)); }
  for (const u of await p.user.findMany({ where: { photoUrl: { not: null } }, select: { photoUrl: true } })) refs(u.photoUrl).forEach((n) => add("photo", n));
  for (const a of await p.advisor.findMany({ where: { photoUrl: { not: null } }, select: { photoUrl: true } })) refs(a.photoUrl).forEach((n) => add("photo", n));

  const onDisk = new Set(fs.existsSync(UPLOADS) ? fs.readdirSync(UPLOADS) : []);
  const staying = [...onDisk].filter((n) => !plan.has(n));
  console.log(`Files for Supabase: ${plan.size} | staying in the uploads folder: ${staying.length} (event covers, event photos, sponsor logos, anything unreferenced)`);

  const client = env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY ? createClient(new URL(env.SUPABASE_URL).origin, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } }) : null;
  if (GO && !client) { console.log("Supabase is not configured."); process.exit(1); }

  if (GO) {
    const { data: existing } = await client.storage.listBuckets();
    const have = new Set((existing || []).map((b) => b.name));
    for (const name of Object.values(BUCKETS)) {
      if (have.has(name)) { console.log("bucket exists:", name); continue; }
      const { error } = await client.storage.createBucket(name, { public: false, fileSizeLimit: 16 * 1024 * 1024 });
      console.log(error ? `bucket ${name} FAILED: ${error.message}` : `bucket created (private): ${name}`);
    }
  }

  let ok = 0, missing = 0, failed = 0;
  for (const [name, kind] of plan) {
    const file = path.join(UPLOADS, name);
    if (!fs.existsSync(file)) { missing++; console.log(`  MISSING on disk  ${kind.padEnd(8)} ${name}`); continue; }
    if (!GO) { console.log(`  would copy       ${kind.padEnd(8)} ${name}`); continue; }
    const { error } = await client.storage.from(BUCKETS[kind]).upload(name, fs.readFileSync(file), { contentType: TYPES[path.extname(name).toLowerCase()] || "application/octet-stream", upsert: true });
    if (error) { failed++; console.log(`  FAILED           ${kind.padEnd(8)} ${name}: ${error.message}`); } else { ok++; console.log(`  copied           ${kind.padEnd(8)} ${name}`); }
  }
  console.log(GO ? `Done: ${ok} copied, ${missing} missing on disk, ${failed} failed.` : `Plan only: ${plan.size - missing} would be copied, ${missing} missing on disk. Run with --go to do it.`);
  await p.$disconnect();
})().catch((e) => { console.error("FAILED:", String(e.message).slice(0, 200)); process.exit(1); });
