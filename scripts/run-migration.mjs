/**
 * Run SQL migrations against Supabase via Management API.
 * Usage: node scripts/run-migration.mjs [migration-file]
 */
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function loadEnv() {
  const envPath = resolve(root, ".env.local");
  const text = readFileSync(envPath, "utf8");
  const env = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    env[key] = value;
  }
  return env;
}

async function runQuery(token, ref, query) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${ref}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    }
  );
  const body = await res.text();
  if (!res.ok) {
    throw new Error(`${res.status} ${body}`);
  }
  return body ? JSON.parse(body) : null;
}

async function main() {
  const env = loadEnv();
  const token = env.SUPABASE_ACCESS_TOKEN;
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  if (!token || !url) {
    console.error("Missing SUPABASE_ACCESS_TOKEN or NEXT_PUBLIC_SUPABASE_URL in .env.local");
    process.exit(1);
  }
  const ref = new URL(url).hostname.split(".")[0];

  const fileArg = process.argv[2] || "001_initial_schema.sql";
  const sqlPath = resolve(root, "supabase/migrations", fileArg);
  const sql = readFileSync(sqlPath, "utf8");

  console.log(`Running ${fileArg} on project ${ref}...`);
  const result = await runQuery(token, ref, sql);
  console.log("OK", result ?? "(no rows returned)");
}

main().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
