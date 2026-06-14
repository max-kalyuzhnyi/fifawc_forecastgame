import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const PROJECT_REF = "qgawmjczgfbhwsdpsqly";
const ENV_FILE = process.env.BROADCAST_ENV_FILE ?? ".env.broadcast.local";

if (!existsSync(ENV_FILE)) {
  console.error(`Missing ${ENV_FILE}. Run vercel env pull first.`);
  process.exit(1);
}

const json = execSync(
  `supabase projects api-keys --project-ref ${PROJECT_REF} --output json`,
  { encoding: "utf8" },
);
const keys = JSON.parse(json);

const serviceRoleKey =
  keys.find((key) => key.name === "service_role")?.api_key ??
  keys.find((key) => key.type === "secret")?.api_key;

if (!serviceRoleKey) {
  console.error("Could not find production service role key via Supabase CLI.");
  process.exit(1);
}

const line = `SUPABASE_SERVICE_ROLE_KEY="${serviceRoleKey.replaceAll('"', '\\"')}"`;
let content = readFileSync(ENV_FILE, "utf8");

if (/^SUPABASE_SERVICE_ROLE_KEY=/m.test(content)) {
  content = content.replace(/^SUPABASE_SERVICE_ROLE_KEY=.*$/m, line);
} else {
  content = `${content.trimEnd()}\n${line}\n`;
}

writeFileSync(ENV_FILE, content);
console.log(`Patched SUPABASE_SERVICE_ROLE_KEY in ${ENV_FILE}`);
