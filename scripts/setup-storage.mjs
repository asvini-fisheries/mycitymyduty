/**
 * Ensure mycitymyduty-attachments storage bucket and policies exist.
 * Usage: node scripts/setup-storage.mjs
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
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
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
  const sqlPath = resolve(root, "supabase/migrations/012_record_attachments.sql");
  const sql = readFileSync(sqlPath, "utf8");

  const storageOnly = sql
    .split("-- ============================================================")[1]
    ?.split("-- ADD attachments COLUMN")[0];

  if (!storageOnly?.trim()) {
    console.error("Could not extract storage section from 012_record_attachments.sql");
    process.exit(1);
  }

  console.log(`Setting up storage bucket on project ${ref}...`);
  const result = await runQuery(token, ref, storageOnly.trim());
  console.log("OK", result ?? "(no rows returned)");
}

main().catch((err) => {
  console.error("Storage setup failed:", err.message);
  process.exit(1);
});
