// Runs a dev server against the LOCAL database instead of Supabase.
//   npm run dev:member:offline     (or dev:admin:offline)
// Supabase is switched off for that run, so uploaded files come from
// data/uploads (kept complete by the backup) and nothing reaches the live data.
const { spawn } = require("child_process");
const app = process.argv[2];
if (!["member", "admin"].includes(app)) { console.log("Usage: offline.cjs member|admin"); process.exit(1); }
const URL_LOCAL = "postgresql://postgres:local@127.0.0.1:54329/table";
const child = spawn("npm", ["run", `dev:${app}`], {
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: URL_LOCAL, DIRECT_URL: URL_LOCAL, SUPABASE_URL: "", SUPABASE_SERVICE_ROLE_KEY: "" },
});
child.on("exit", (c) => process.exit(c || 0));
