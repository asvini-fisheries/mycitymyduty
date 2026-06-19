/**
 * Disable Supabase email confirmation via Management API.
 * Usage: node scripts/disable-email-confirm.mjs
 *
 * Requires SUPABASE_ACCESS_TOKEN and project ref in .env.local
 * (ref is parsed from NEXT_PUBLIC_SUPABASE_URL).
 */
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

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

function projectRefFromUrl(url) {
  const match = url?.match(/https:\/\/([^.]+)\.supabase\.co/);
  return match?.[1] ?? null;
}

const env = loadEnv();
const token = env.SUPABASE_ACCESS_TOKEN;
const ref = projectRefFromUrl(env.NEXT_PUBLIC_SUPABASE_URL);

if (!token) {
  console.error("Missing SUPABASE_ACCESS_TOKEN in .env.local");
  process.exit(1);
}
if (!ref) {
  console.error("Could not parse project ref from NEXT_PUBLIC_SUPABASE_URL");
  process.exit(1);
}

const base = `https://api.supabase.com/v1/projects/${ref}/config/auth`;
const headers = {
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
};

async function getAuthConfig() {
  const res = await fetch(base, { headers });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(`GET auth config failed (${res.status}): ${JSON.stringify(body)}`);
  }
  return body;
}

async function patchAuthConfig(payload) {
  const res = await fetch(base, {
    method: "PATCH",
    headers,
    body: JSON.stringify(payload),
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(`PATCH auth config failed (${res.status}): ${JSON.stringify(body)}`);
  }
  return body;
}

const before = await getAuthConfig();
console.log("Before:", {
  mailer_autoconfirm: before.mailer_autoconfirm,
  mailer_allow_unverified_email_sign_ins: before.mailer_allow_unverified_email_sign_ins,
});

const after = await patchAuthConfig({
  mailer_autoconfirm: true,
});

console.log("After:", {
  mailer_autoconfirm: after.mailer_autoconfirm,
});

if (after.mailer_autoconfirm === true) {
  console.log("Email confirmation disabled (mailer_autoconfirm=true).");
} else {
  console.error("Warning: mailer_autoconfirm is still not true.");
  process.exit(1);
}
