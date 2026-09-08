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

type NestedAllocationScope = {
  filterColumn: string;
  innerJoinSelect: (selectQuery: string) => string;
};

const DIRECT_ALLOCATION_ROW_COLUMNS: Record<string, string> = {
  projects: "id",
  project_activities: "project_id",
  stakeholder_project_allocations: "project_id",
};

const NESTED_ALLOCATION_ROW_SCOPES: Record<string, NestedAllocationScope> = {
  activity_resource_requirements: {
    filterColumn: "project_activities.project_id",
    innerJoinSelect: (q) =>
      q.includes("project_activities")
        ? q.replace("project_activities(", "project_activities!inner(")
        : `${q}, project_activities!inner(project_id)`,
  },
  activity_executing_stakeholders: {
    filterColumn: "project_activities.project_id",
    innerJoinSelect: (q) =>
      q.includes("project_activities")
        ? q.replace("project_activities(", "project_activities!inner(")
        : `${q}, project_activities!inner(project_id)`,
  },
  activity_funding_stakeholders: {
    filterColumn: "project_activities.project_id",
    innerJoinSelect: (q) =>
      q.includes("project_activities")
        ? q.replace("project_activities(", "project_activities!inner(")
        : `${q}, project_activities!inner(project_id)`,
  },
  daily_activity_updates: {
    filterColumn: "project_activities.project_id",
    innerJoinSelect: (q) =>
      q.includes("project_activities")
        ? q.replace("project_activities(", "project_activities!inner(")
        : `${q}, project_activities!inner(project_id)`,
  },
  daily_activity_resources_used: {
    filterColumn: "daily_activity_updates.project_activities.project_id",
    innerJoinSelect: (q) => {
      if (!q.includes("daily_activity_updates")) {
        return `${q}, daily_activity_updates!inner(project_activities!inner(project_id))`;
      }
      let result = q.replace(
        "daily_activity_updates(",
        "daily_activity_updates!inner("
      );
      if (result.includes("project_activities(")) {
        result = result.replace(
          "project_activities(",
          "project_activities!inner("
        );
      }
      return result;
    },
  },
};

const DIRECT_ALLOCATION_OPTION_COLUMNS: Record<string, string> = {
  projects: "id",
  project_activities: "project_id",
};

const NESTED_ALLOCATION_OPTION_SCOPES: Record<string, NestedAllocationScope> = {
  daily_activity_updates: {
    filterColumn: "project_activities.project_id",
    innerJoinSelect: (q) =>
      q.includes("project_activities")
        ? q.replace("project_activities(", "project_activities!inner(")
        : `${q}, project_activities!inner(project_id)`,
  },
};

export function tableUsesProjectAllocationScope(table: string): boolean {
  return (
    table in DIRECT_ALLOCATION_ROW_COLUMNS ||
    table in NESTED_ALLOCATION_ROW_SCOPES
  );
}

export function optionsTableUsesProjectAllocationScope(table: string): boolean {
  return (
    table in DIRECT_ALLOCATION_OPTION_COLUMNS ||
    table in NESTED_ALLOCATION_OPTION_SCOPES
  );
}

export function applyAllocationScopeToSelectQuery(
  table: string,
  selectQuery: string,
  allocatedProjectIds: string[] | null
): string {
  if (!allocatedProjectIds) return selectQuery;
  const scope = NESTED_ALLOCATION_ROW_SCOPES[table];
  return scope ? scope.innerJoinSelect(selectQuery) : selectQuery;
}

export function applyAllocationScopeToRowQuery<
  T extends { in: (column: string, values: string[]) => T },
>(
  query: T,
  table: string,
  allocatedProjectIds: string[] | null
): T {
  if (!allocatedProjectIds?.length) return query;

  const direct = DIRECT_ALLOCATION_ROW_COLUMNS[table];
  if (direct) return query.in(direct, allocatedProjectIds);

  const nested = NESTED_ALLOCATION_ROW_SCOPES[table];
  if (nested) return query.in(nested.filterColumn, allocatedProjectIds);

  return query;
}

export function applyAllocationScopeToOptionsQuery<
  T extends { in: (column: string, values: string[]) => T },
>(
  query: T,
  optionsTable: string,
  allocatedProjectIds: string[] | null
): T {
  if (!allocatedProjectIds?.length) return query;

  const direct = DIRECT_ALLOCATION_OPTION_COLUMNS[optionsTable];
  if (direct) return query.in(direct, allocatedProjectIds);

  const nested = NESTED_ALLOCATION_OPTION_SCOPES[optionsTable];
  if (nested) return query.in(nested.filterColumn, allocatedProjectIds);

  return query;
}

export function scopeAllocationOptionsSelectQuery(
  optionsTable: string,
  selectQuery: string,
  allocatedProjectIds: string[] | null
): string {
  if (!allocatedProjectIds) return selectQuery;
  const scope = NESTED_ALLOCATION_OPTION_SCOPES[optionsTable];
  return scope ? scope.innerJoinSelect(selectQuery) : selectQuery;
}

function nestedProjectId(
  value: unknown
): string | null {
  if (!value || typeof value !== "object") return null;
  const record = value as { project_id?: unknown };
  if (typeof record.project_id === "string") return record.project_id;
  return null;
}

export async function payloadIsWithinAllocatedProjects(
  supabase: SupabaseClient,
  payload: Record<string, unknown>,
  allocatedProjectIds: string[]
): Promise<boolean> {
  const projectId = payload.project_id;
  if (typeof projectId === "string" && projectId) {
    return allocatedProjectIds.includes(projectId);
  }

  const projectActivityId = payload.project_activity_id;
  if (typeof projectActivityId === "string" && projectActivityId) {
    const { data } = await supabase
      .from("project_activities")
      .select("project_id")
      .eq("id", projectActivityId)
      .maybeSingle();
    return Boolean(
      data?.project_id && allocatedProjectIds.includes(String(data.project_id))
    );
  }

  const updateId = payload.daily_activity_update_id;
  if (typeof updateId === "string" && updateId) {
    const { data } = await supabase
      .from("daily_activity_updates")
      .select("project_activities(project_id)")
      .eq("id", updateId)
      .maybeSingle();
    const activity = (data as { project_activities?: unknown } | null)
      ?.project_activities;
    const nested = Array.isArray(activity) ? activity[0] : activity;
    const nestedId = nestedProjectId(nested);
    return Boolean(nestedId && allocatedProjectIds.includes(nestedId));
  }

  return true;
}
