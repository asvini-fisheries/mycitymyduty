/**
 * End-to-end signup + sign-in smoke test (throwaway email).
 * Usage: node scripts/test-signup.mjs
 */
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

const stamp = Date.now();
const email = `mcm-test-${stamp}@example.com`;
const password = `TestPass${stamp}!`;

console.log(`Testing signup for ${email}`);

const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: { full_name: "Test User", role: "admin" },
  },
});

if (signUpError) {
  console.error("signUp failed:", signUpError.message);
  process.exit(1);
}

console.log("signUp OK:", {
  userId: signUpData.user?.id,
  hasSession: Boolean(signUpData.session),
  emailConfirmedAt: signUpData.user?.email_confirmed_at,
});

if (signUpData.session) {
  console.log("Session returned on signup — email confirmation is off.");
} else {
  const { data: signInData, error: signInError } =
    await supabase.auth.signInWithPassword({ email, password });

  if (signInError) {
    console.error("signIn after signup failed:", signInError.message);
    process.exit(1);
  }

  console.log("signIn OK:", {
    userId: signInData.user?.id,
    hasSession: Boolean(signInData.session),
  });
}

const {
  data: { user },
} = await supabase.auth.getUser();
if (!user) {
  console.error("No authenticated user after signup/sign-in");
  process.exit(1);
}

const { data: corps, error: corpsError } = await supabase
  .from("corporations")
  .select("id")
  .eq("is_active", true)
  .limit(1);

if (corpsError || !corps?.length) {
  console.error("Could not load corporation for persist test:", corpsError?.message);
  process.exit(1);
}

const corpId = corps[0].id;
const { error: rpcError } = await supabase.rpc("set_my_corporation", {
  p_corporation_id: corpId,
});

if (rpcError) {
  console.error("set_my_corporation failed:", rpcError.message);
  process.exit(1);
}

const { data: profile, error: profileError } = await supabase
  .from("user_master")
  .select("corporation_id")
  .eq("id", user.id)
  .maybeSingle();

if (profileError) {
  console.error("user_master read failed:", profileError.message);
  process.exit(1);
}

if (profile?.corporation_id !== corpId) {
  console.error(
    "corporation_id not persisted:",
    profile?.corporation_id,
    "expected",
    corpId
  );
  process.exit(1);
}

console.log("Corporation linked OK:", corpId);

await supabase.auth.signOut();
console.log("Signup + sign-in + corporation persist test passed.");
