import type { SupabaseClient } from "@supabase/supabase-js";

export const STAKEHOLDER_ID_FIELD = "stakeholder_id";

export type LockedStakeholder = {
  id: string;
  name: string;
};

export function hasStakeholderIdField(
  fields: readonly { name: string }[]
): boolean {
  return fields.some((field) => field.name === STAKEHOLDER_ID_FIELD);
}

export function injectLockedStakeholderId(
  payload: Record<string, unknown>,
  fields: readonly { name: string }[],
  stakeholderId: string | null
): Record<string, unknown> {
  if (!stakeholderId || !hasStakeholderIdField(fields)) {
    return payload;
  }
  return { ...payload, [STAKEHOLDER_ID_FIELD]: stakeholderId };
}

export async function fetchStakeholderById(
  supabase: SupabaseClient,
  id: string
): Promise<LockedStakeholder | null> {
  const { data } = await supabase
    .from("stakeholders")
    .select("id, name")
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();

  return (data as LockedStakeholder | null) ?? null;
}

export async function fetchLockedStakeholder(
  supabase: SupabaseClient
): Promise<LockedStakeholder | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("user_master")
    .select("stakeholder_id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "stakeholder" || !profile.stakeholder_id) {
    return null;
  }

  return fetchStakeholderById(supabase, profile.stakeholder_id);
}

export async function fetchAllocatedProjectIds(
  supabase: SupabaseClient,
  stakeholderId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from("stakeholder_project_allocations")
    .select("project_id")
    .eq("stakeholder_id", stakeholderId);

  if (error || !data) return [];
  return data.map((row) => row.project_id as string);
}
