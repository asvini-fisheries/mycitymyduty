import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

let localEnv: Record<string, string> | null = null;

function parseEnvFile(filePath: string): Record<string, string> {
  const parsed: Record<string, string> = {};
  const text = readFileSync(filePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed
      .slice(eq + 1)
      .trim()
      .replace(/^['"]|['"]$/g, "");
    if (key && value) parsed[key] = value;
  }
  return parsed;
}

function readLocalEnv(): Record<string, string> {
  if (localEnv) return localEnv;
  const envPath = resolve(process.cwd(), ".env.local");
  localEnv = existsSync(envPath) ? parseEnvFile(envPath) : {};
  return localEnv;
}

function envValue(name: string): string | undefined {
  const fromProcess = process.env[name]?.trim();
  if (fromProcess) return fromProcess;
  const fromFile = readLocalEnv()[name]?.trim();
  return fromFile || undefined;
}

function getSupabaseUrl(): string | undefined {
  return envValue("NEXT_PUBLIC_SUPABASE_URL");
}

function getServiceRoleKey(): string | undefined {
  return envValue("SUPABASE_SERVICE_ROLE_KEY") || envValue("SUPABASE_SECRET_KEY");
}

export function createAdminClient() {
  const url = getSupabaseUrl();
  const serviceRoleKey = getServiceRoleKey();

  if (!url || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is required for stakeholder login provisioning."
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function hasAdminClientConfig(): boolean {
  return Boolean(getSupabaseUrl() && getServiceRoleKey());
}
