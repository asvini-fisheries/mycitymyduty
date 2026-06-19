import type { SupabaseClient } from "@supabase/supabase-js";
import type { Corporation } from "@/lib/types/database";
import { formatErrorMessage } from "@/lib/errors";

export const MCMD_CORPORATION_ID_KEY = "mcmd_corporation_id";
export const CORPORATION_ID_FIELD = "corporation_id";

export function getSelectedCorporationId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(MCMD_CORPORATION_ID_KEY);
}

/** Corporation chosen at login — used to scope all masters and transactions. */
export function getLockedCorporationId(): string | null {
  return getSelectedCorporationId();
}

export function hasCorporationIdField(
  fields: readonly { name: string }[]
): boolean {
  return fields.some((field) => field.name === CORPORATION_ID_FIELD);
}

type OptionsFromConfig = {
  table: string;
  selectQuery?: string;
};

type NestedCorporationScope = {
  filterColumn: string;
  innerJoinSelect: (selectQuery: string) => string;
};

const NESTED_CORPORATION_ROW_SCOPES: Record<string, NestedCorporationScope> = {
  zone_wards: {
    filterColumn: "zones.corporation_id",
    innerJoinSelect: (q) =>
      q.includes("zones")
        ? q.replace("zones(", "zones!inner(")
        : `${q}, zones!inner(corporation_id)`,
  },
  ward_areas: {
    filterColumn: "zone_wards.zones.corporation_id",
    innerJoinSelect: (q) => {
      if (q.includes("zone_wards")) {
        const withWardInner = q.replace("zone_wards(", "zone_wards!inner(");
        return q.includes("zones")
          ? withWardInner.replace("zones(", "zones!inner(")
          : withWardInner.replace(
              /zone_wards!inner\(([^)]*)\)/,
              "zone_wards!inner($1, zones!inner(corporation_id))"
            );
      }
      return `${q}, zone_wards!inner(zones!inner(corporation_id))`;
    },
  },
  area_streets: {
    filterColumn: "ward_areas.zone_wards.zones.corporation_id",
    innerJoinSelect: (q) => {
      if (q.includes("ward_areas")) {
        return q
          .replace("ward_areas(", "ward_areas!inner(")
          .replace("zone_wards(", "zone_wards!inner(")
          .replace("zones(", "zones!inner(");
      }
      return `${q}, ward_areas!inner(zone_wards!inner(zones!inner(corporation_id)))`;
    },
  },
  project_activities: {
    filterColumn: "projects.corporation_id",
    innerJoinSelect: (q) => q.replace("projects(", "projects!inner("),
  },
  activity_resource_requirements: {
    filterColumn: "project_activities.projects.corporation_id",
    innerJoinSelect: (q) =>
      q
        .replace("project_activities(", "project_activities!inner(")
        .replace("projects(", "projects!inner("),
  },
  activity_executing_stakeholders: {
    filterColumn: "project_activities.projects.corporation_id",
    innerJoinSelect: (q) =>
      q
        .replace("project_activities(", "project_activities!inner(")
        .replace("projects(", "projects!inner("),
  },
  activity_funding_stakeholders: {
    filterColumn: "project_activities.projects.corporation_id",
    innerJoinSelect: (q) =>
      q
        .replace("project_activities(", "project_activities!inner(")
        .replace("projects(", "projects!inner("),
  },
  daily_activity_updates: {
    filterColumn: "project_activities.projects.corporation_id",
    innerJoinSelect: (q) =>
      q
        .replace("project_activities(", "project_activities!inner(")
        .replace("projects(", "projects!inner("),
  },
  daily_activity_resources_used: {
    filterColumn:
      "daily_activity_updates.project_activities.projects.corporation_id",
    innerJoinSelect: (q) => {
      if (q.includes("daily_activity_updates")) {
        let result = q.replace(
          "daily_activity_updates(",
          "daily_activity_updates!inner("
        );
        if (q.includes("project_activities")) {
          result = result.replace(
            "project_activities(",
            "project_activities!inner("
          );
          if (q.includes("projects")) {
            return result.replace("projects(", "projects!inner(");
          }
        }
        return result;
      }
      return `${q}, daily_activity_updates!inner(project_activities!inner(projects!inner(corporation_id)))`;
    },
  },
  stakeholder_bills: {
    filterColumn: "stakeholders.corporation_id",
    innerJoinSelect: (q) => q.replace("stakeholders(", "stakeholders!inner("),
  },
  stakeholder_payments: {
    filterColumn: "stakeholders.corporation_id",
    innerJoinSelect: (q) => q.replace("stakeholders(", "stakeholders!inner("),
  },
};

const DIRECT_CORPORATION_OPTION_TABLES = new Set([
  "corporations",
  "zones",
  "stakeholders",
  "projects",
]);

const NESTED_CORPORATION_OPTION_SCOPES: Record<string, NestedCorporationScope> =
  {
    zone_wards: {
      filterColumn: "zones.corporation_id",
      innerJoinSelect: (q) =>
        q.includes("zones")
          ? q.replace("zones(", "zones!inner(")
          : `${q}, zones!inner(corporation_id)`,
    },
    ward_areas: {
      filterColumn: "zone_wards.zones.corporation_id",
      innerJoinSelect: (q) => {
        if (q.includes("zone_wards")) {
          return q
            .replace("zone_wards(", "zone_wards!inner(")
            .replace("zones(", "zones!inner(");
        }
        return `${q}, zone_wards!inner(zones!inner(corporation_id))`;
      },
    },
    area_streets: {
      filterColumn: "ward_areas.zone_wards.zones.corporation_id",
      innerJoinSelect: (q) => {
        if (q.includes("ward_areas")) {
          return q
            .replace("ward_areas(", "ward_areas!inner(")
            .replace("zone_wards(", "zone_wards!inner(")
            .replace("zones(", "zones!inner(");
        }
        return `${q}, ward_areas!inner(zone_wards!inner(zones!inner(corporation_id)))`;
      },
    },
    project_activities: NESTED_CORPORATION_ROW_SCOPES.project_activities,
    daily_activity_updates: {
      filterColumn: "project_activities.projects.corporation_id",
      innerJoinSelect: (q) => {
        if (q.includes("project_activities")) {
          return q
            .replace("project_activities(", "project_activities!inner(")
            .replace("projects(", "projects!inner(");
        }
        return `${q}, project_activities!inner(projects!inner(corporation_id))`;
      },
    },
    stakeholder_bills: {
      filterColumn: "stakeholders.corporation_id",
      innerJoinSelect: (q) =>
        q.includes("stakeholders")
          ? q.replace("stakeholders(", "stakeholders!inner(")
          : `${q}, stakeholders!inner(corporation_id)`,
    },
  };

export function applyCorporationScopeToSelectQuery(
  table: string,
  selectQuery: string,
  corporationId: string | null
): string {
  if (!corporationId) return selectQuery;
  const scope = NESTED_CORPORATION_ROW_SCOPES[table];
  return scope ? scope.innerJoinSelect(selectQuery) : selectQuery;
}

export function applyCorporationScopeToRowQuery<T extends {
  eq: (column: string, value: string) => T;
}>(
  query: T,
  table: string,
  fields: readonly { name: string }[],
  corporationId: string | null
): T {
  if (!corporationId) return query;

  if (table === "corporations") {
    return query.eq("id", corporationId);
  }

  if (hasCorporationIdField(fields)) {
    return query.eq(CORPORATION_ID_FIELD, corporationId);
  }

  const scope = NESTED_CORPORATION_ROW_SCOPES[table];
  if (scope) {
    return query.eq(scope.filterColumn, corporationId);
  }

  return query;
}

export function applyCorporationScopeToOptionsQuery<T extends {
  eq: (column: string, value: string) => T;
}>(
  query: T,
  optionsFrom: OptionsFromConfig,
  corporationId: string | null
): T {
  if (!corporationId) return query;

  if (DIRECT_CORPORATION_OPTION_TABLES.has(optionsFrom.table)) {
    const column =
      optionsFrom.table === "corporations" ? "id" : CORPORATION_ID_FIELD;
    return query.eq(column, corporationId);
  }

  const scope = NESTED_CORPORATION_OPTION_SCOPES[optionsFrom.table];
  if (scope) {
    return query.eq(scope.filterColumn, corporationId);
  }

  return query;
}

export function scopeOptionsSelectQuery(
  optionsFrom: OptionsFromConfig,
  corporationId: string | null
): string {
  const base = optionsFrom.selectQuery ?? "*";
  if (!corporationId) return base;

  const scope = NESTED_CORPORATION_OPTION_SCOPES[optionsFrom.table];
  if (!scope) return base;

  return scope.innerJoinSelect(base);
}

export function injectLockedCorporationId(
  payload: Record<string, unknown>,
  fields: readonly { name: string }[],
  corporationId: string | null
): Record<string, unknown> {
  if (!corporationId || !hasCorporationIdField(fields)) {
    return payload;
  }
  return { ...payload, [CORPORATION_ID_FIELD]: corporationId };
}

export function setSelectedCorporationId(id: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(MCMD_CORPORATION_ID_KEY, id);
}

export function clearSelectedCorporationId(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(MCMD_CORPORATION_ID_KEY);
}

export type CorporationSummary = Pick<Corporation, "id" | "name" | "code" | "logo_url">;

export const DEFAULT_BOOTSTRAP_CORPORATION = {
  name: "",
  code: "",
} as const;

export type FetchActiveCorporationsResult = {
  corporations: CorporationSummary[];
  error: string | null;
};

export async function fetchActiveCorporations(
  supabase: SupabaseClient
): Promise<FetchActiveCorporationsResult> {
  const { data, error } = await supabase
    .from("corporations")
    .select("id, name, code, logo_url")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    return {
      corporations: [],
      error: formatErrorMessage(error, "Could not load corporations."),
    };
  }

  return {
    corporations: (data as CorporationSummary[]) ?? [],
    error: null,
  };
}

export async function bootstrapFirstCorporation(
  supabase: SupabaseClient,
  name: string,
  code: string
): Promise<{ id: string | null; error: string | null }> {
  const { data, error } = await supabase.rpc("bootstrap_first_corporation", {
    p_name: name.trim(),
    p_code: code.trim(),
  });

  if (error) {
    return {
      id: null,
      error: formatErrorMessage(error, "Could not create the first corporation."),
    };
  }

  const id = typeof data === "string" ? data : null;
  if (!id) {
    return {
      id: null,
      error: "Corporation bootstrap did not return an id. Run migration 008_login_corporation_access.sql.",
    };
  }

  return { id, error: null };
}

export async function fetchCorporationById(
  supabase: SupabaseClient,
  id: string
): Promise<Pick<Corporation, "id" | "name" | "code" | "logo_url"> | null> {
  const { data } = await supabase
    .from("corporations")
    .select("id, name, code, logo_url")
    .eq("id", id)
    .maybeSingle();
  return data as Pick<Corporation, "id" | "name" | "code" | "logo_url"> | null;
}

export async function fetchLatestCorporationId(
  supabase: SupabaseClient
): Promise<string | null> {
  const { data } = await supabase
    .from("corporations")
    .select("id")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

export async function fetchDefaultCorporationId(
  supabase: SupabaseClient
): Promise<string | null> {
  const locked = getLockedCorporationId();
  if (!locked) return null;

  const { data } = await supabase
    .from("corporations")
    .select("id")
    .eq("id", locked)
    .eq("is_active", true)
    .maybeSingle();

  return data?.id ?? null;
}

export type LockedCorporation = Pick<
  Corporation,
  "id" | "name" | "code" | "logo_url"
>;

/** Restore locked corporation from user profile when localStorage is empty. */
export async function ensureLockedCorporation(
  supabase: SupabaseClient
): Promise<string | null> {
  const corp = await fetchLockedCorporation(supabase);
  return corp?.id ?? null;
}

/** Locked corporation id resolved from localStorage or user profile, with full record. */
export async function fetchLockedCorporation(
  supabase: SupabaseClient
): Promise<LockedCorporation | null> {
  const existing = getLockedCorporationId();
  if (existing) {
    const { data } = await supabase
      .from("corporations")
      .select("id, name, code, logo_url")
      .eq("id", existing)
      .eq("is_active", true)
      .maybeSingle();
    if (data) return data as LockedCorporation;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("user_master")
    .select("corporation_id")
    .eq("id", user.id)
    .maybeSingle();

  const corpId = profile?.corporation_id ?? null;
  if (!corpId) return null;

  setSelectedCorporationId(corpId);
  const { data: corp } = await supabase
    .from("corporations")
    .select("id, name, code, logo_url")
    .eq("id", corpId)
    .eq("is_active", true)
    .maybeSingle();

  return (corp as LockedCorporation | null) ?? null;
}

export async function persistCorporationSelection(
  supabase: SupabaseClient,
  corporationId: string
): Promise<{ error: string | null }> {
  setSelectedCorporationId(corporationId);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: null };
  }

  const { error: rpcError } = await supabase.rpc("set_my_corporation", {
    p_corporation_id: corporationId,
  });

  if (!rpcError) {
    return { error: null };
  }

  const { error: updateError } = await supabase
    .from("user_master")
    .update({ corporation_id: corporationId })
    .eq("id", user.id);

  if (updateError) {
    return {
      error: formatErrorMessage(
        updateError,
        "Signed in, but could not link your account to the selected corporation."
      ),
    };
  }

  return { error: null };
}
