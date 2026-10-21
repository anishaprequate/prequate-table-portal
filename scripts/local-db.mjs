// A local Postgres on this machine, kept as a working copy of the live data.
// It listens only on this computer (127.0.0.1, port 54329). Its password is
// "local" and means nothing: nothing outside this machine can reach it.
//
//   npm run local:start      start it (in the background)
//   npm run local:stop       stop it
//   npm run local:status     is it running, and what is in it
//   npm run local:refresh    make it an exact copy of the latest backup
//
// Run `npm run backup` first to have a fresh backup to copy from (refresh does
// that for you unless you pass --no-backup).
import fs from "fs";
import net from "net";
import path from "path";
import { fileURLToPath } from "url";
import { spawn, spawnSync } from "child_process";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIR = path.join(root, "data/local-db");
const PIDFILE = path.join(root, "data/local-db.pid");
const LOG = path.join(root, "data/local-db.log");
const PORT = 54329;
const URL_LOCAL = `postgresql://postgres:local@127.0.0.1:${PORT}/table`;
const cmd = process.argv[2];

const open = () => new Promise((res) => { const s = net.connect({ host: "127.0.0.1", port: PORT, timeout: 1500 }, () => { s.end(); res(true); }); s.on("error", () => res(false)); s.on("timeout", () => { s.destroy(); res(false); }); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const localEnv = { ...process.env, DATABASE_URL: URL_LOCAL, DIRECT_URL: URL_LOCAL };

async function serve() {
  const { default: EmbeddedPostgres } = await import("embedded-postgres");
  const pg = new EmbeddedPostgres({ databaseDir: DIR, user: "postgres", password: "local", port: PORT, persistent: true, onLog: () => {}, onError: () => {} });
  if (!fs.existsSync(path.join(DIR, "PG_VERSION"))) await pg.initialise();
  await pg.start();
  try { await pg.createDatabase("table"); } catch { /* already there */ }
  fs.writeFileSync(PIDFILE, String(process.pid));
  const stop = async () => { try { await pg.stop(); } catch {} try { fs.unlinkSync(PIDFILE); } catch {} process.exit(0); };
  process.on("SIGTERM", stop); process.on("SIGINT", stop);
  setInterval(() => {}, 1 << 30);
}

async function start() {
  if (await open()) { console.log("local database is already running"); return; }
  fs.mkdirSync(path.join(root, "data"), { recursive: true });
  const out = fs.openSync(LOG, "a");
  const child = spawn(process.execPath, [fileURLToPath(import.meta.url), "serve"], { detached: true, stdio: ["ignore", out, out], cwd: root });
  child.unref();
  for (let i = 0; i < 60; i++) { await sleep(1000); if (await open()) { console.log(`local database is running on 127.0.0.1:${PORT}`); return; } }
  console.log("local database did not start. See data/local-db.log");
  process.exit(1);
}

async function stop() {
  if (!fs.existsSync(PIDFILE)) { console.log("local database is not running"); return; }
  const pid = Number(fs.readFileSync(PIDFILE, "utf8"));
  try { process.kill(pid, "SIGTERM"); console.log("stopping local database"); } catch { console.log("it was not running"); try { fs.unlinkSync(PIDFILE); } catch {} }
}

async function status() {
  if (!(await open())) { console.log("local database: stopped"); return; }
  const r = spawnSync("node", ["-e", `const {PrismaClient}=require("@prisma/client");(async()=>{const p=new PrismaClient();try{console.log("local database: running, "+(await p.user.count())+" users, "+(await p.booking.count())+" bookings")}catch(e){console.log("local database: running, but empty (run: npm run local:refresh)")}await p.$disconnect()})()`], { cwd: root, env: localEnv, encoding: "utf8" });
  console.log((r.stdout || r.stderr).trim());
}

async function refresh() {
  await start();
  if (!process.argv.includes("--no-backup")) {
    console.log("taking a fresh backup first…");
    const b = spawnSync("node", ["scripts/backup.cjs"], { cwd: root, stdio: "inherit" });
    if (b.status !== 0) { console.log("backup failed, so the local copy was not changed"); process.exit(1); }
  }
  console.log("preparing the local tables…");
  const m = spawnSync("npx", ["prisma", "migrate", "deploy"], { cwd: path.join(root, "packages/db"), env: localEnv, encoding: "utf8" });
  if (m.status !== 0) { console.log((m.stdout + m.stderr).split("\n").filter((l) => !/npm notice/.test(l)).slice(-6).join("\n")); process.exit(1); }
  const r = spawnSync("node", ["scripts/restore-backup.cjs", "latest", "--reset"], { cwd: root, env: localEnv, stdio: "inherit" });
  process.exit(r.status || 0);
}

({ serve, start, stop, status, refresh }[cmd] || (async () => console.log("Usage: local-db.mjs start | stop | status | refresh")))();
