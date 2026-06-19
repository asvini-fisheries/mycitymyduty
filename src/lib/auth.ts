import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthError } from "@supabase/supabase-js";
import type { UserRole } from "@/lib/types/database";
import { formatErrorMessage } from "@/lib/errors";

/** Readable message from Supabase Auth / PostgREST errors (avoids "{}" UI bug). */
export function formatAuthError(
  error: AuthError | { message?: string; msg?: string } | null | undefined,
  fallback: string
): string {
  return formatErrorMessage(error, fallback);
}

export interface CurrentUserProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  corporation_id: string | null;
}

export async function fetchCurrentUserProfile(
  supabase: SupabaseClient
): Promise<CurrentUserProfile | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("user_master")
    .select("id, email, full_name, role, corporation_id")
    .eq("id", user.id)
    .maybeSingle();

  return data as CurrentUserProfile | null;
}
