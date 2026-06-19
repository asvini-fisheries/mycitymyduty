/** Verify Supabase connection and seed data. Usage: node scripts/verify-setup.mjs */
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnv() {
  const text = readFileSync(resolve(root, ".env.local"), "utf8");
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

const env = loadEnv();
const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const tables = [
  "corporations",
  "zones",
  "zone_wards",
  "stakeholders",
  "projects",
  "daily_activity_updates",
];

for (const table of tables) {
  const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true });
  if (error) {
    console.error(`${table}: ERROR ${error.message}`);
  } else {
    console.log(`${table}: ${count ?? 0} rows`);
  }
}

const { data: activeCorps, error: corpError } = await supabase
  .from("corporations")
  .select("id, name, code")
  .eq("is_active", true)
  .order("name", { ascending: true });

if (corpError) {
  console.error(`active corporations (anon): ERROR ${corpError.message}`);
} else {
  console.log(`active corporations (anon): ${activeCorps?.length ?? 0}`);
  for (const corp of activeCorps ?? []) {
    console.log(`  - ${corp.name}${corp.code ? ` (${corp.code})` : ""}`);
  }
}
