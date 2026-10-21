// Runs the time-driven notification jobs on this computer, every few minutes,
// until stopped (Ctrl-C). A real host would point its own scheduler at the same
// three addresses. Reads CRON_SECRET and the admin address from apps/admin/.env.local.
//   npm run jobs
const fs = require("fs");
const path = require("path");

const env = {};
for (const line of fs.readFileSync(path.join(__dirname, "..", "apps", "admin", ".env.local"), "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const base = process.env.ADMIN_URL || "http://localhost:3001";
const secret = env.CRON_SECRET;
if (!secret) {
  console.error("CRON_SECRET is not set in apps/admin/.env.local");
  process.exit(1);
}
const jobs = ["notifications", "hour-reminders", "event-surveys"];
const everyMinutes = Number(process.env.EVERY_MINUTES || 5);

async function tick() {
  for (const job of jobs) {
    try {
      const res = await fetch(`${base}/api/cron/${job}?secret=${encodeURIComponent(secret)}`);
      console.log(new Date().toLocaleTimeString(), job, res.status, (await res.text()).slice(0, 200));
    } catch (e) {
      console.log(new Date().toLocaleTimeString(), job, "failed:", e.message);
    }
  }
}
tick();
setInterval(tick, everyMinutes * 60_000);
