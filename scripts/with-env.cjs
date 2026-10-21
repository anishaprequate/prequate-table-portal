// Runs a command with the variables from an env file, so one command can be
// aimed at a chosen database without touching the everyday .env.local files.
//   node scripts/with-env.cjs packages/db/.env.prod -- npx prisma migrate deploy
const fs = require("fs");
const { spawnSync } = require("child_process");
const [file, sep, ...cmd] = process.argv.slice(2);
if (!file || sep !== "--" || !cmd.length) { console.log("Usage: with-env.cjs <env file> -- <command...>"); process.exit(1); }
const env = { ...process.env };
for (const l of fs.readFileSync(file, "utf8").split("\n")) {
  const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
}
const r = spawnSync(cmd[0], cmd.slice(1), { stdio: "inherit", env });
process.exit(r.status ?? 1);
