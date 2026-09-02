/** Quick smoke test for stakeholder login config — prints status only, no secrets. */
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
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const secret = env.SUPABASE_SERVICE_ROLE_KEY;
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log("env keys:", {
  url: Boolean(url),
  anon: Boolean(anon),
  secret: Boolean(secret),
  anonPrefix: anon?.slice(0, 15) ?? "missing",
  secretPrefix: secret?.slice(0, 15) ?? "missing",
});

if (!url || !secret) {
  console.log("FAIL: missing URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, secret, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: members, error: memberError } = await admin
  .from("stakeholder_members")
  .select("phone")
  .eq("is_active", true)
  .limit(1);

console.log("admin db read:", memberError ? `ERROR ${memberError.message}` : `OK (${members?.length ?? 0} row)`);

const testPhone = process.argv[2] ?? "9876543210";
const res = await fetch("http://localhost:3000/api/auth/stakeholder-login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ phone: testPhone, otp: "123456" }),
});

const contentType = res.headers.get("content-type") ?? "";
let bodySummary = `HTTP ${res.status}`;
if (contentType.includes("application/json")) {
  const json = await res.json();
  bodySummary += json.error ? ` error=${json.error}` : json.ok ? " ok=true" : "";
} else {
  bodySummary += " non-json response";
}

console.log("stakeholder-login API:", bodySummary);
