import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserRole } from "@/lib/types/database";
import {
  getModuleKeyForPath,
  LEGACY_MODULE_ALIASES,
  type ModuleKey,
} from "@/lib/modules";
import { isSuperAdmin } from "@/lib/roles";

export type AccessAction = "view" | "create" | "edit" | "delete";

export interface ModuleAccessRight {
  module_key: string;
  module_label: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

export interface AccessRightsMap {
  [moduleKey: string]: ModuleAccessRight;
}

const ADMIN_ROLES = new Set<UserRole>([
  "super_admin",
  "admin",
  "official",
]);

function actionField(action: AccessAction): keyof ModuleAccessRight {
  switch (action) {
    case "view":
      return "can_view";
    case "create":
      return "can_create";
    case "edit":
      return "can_edit";
    case "delete":
      return "can_delete";
  }
}

function expandLegacyRights(
  rows: ModuleAccessRight[]
): AccessRightsMap {
  const map: AccessRightsMap = {};

  for (const row of rows) {
    map[row.module_key] = row;
    const legacyChildren = LEGACY_MODULE_ALIASES[row.module_key];
    if (legacyChildren) {
      for (const childKey of legacyChildren) {
        if (!map[childKey]) {
          map[childKey] = { ...row, module_key: childKey };
        }
      }
    }
  }

  return map;
}

export async function fetchStakeholderAccessRights(
  supabase: SupabaseClient,
  stakeholderId: string | null | undefined
): Promise<AccessRightsMap> {
  if (!stakeholderId) return {};

  const { data: stakeholder, error: stakeholderError } = await supabase
    .from("stakeholders")
    .select("stakeholder_category_id")
    .eq("id", stakeholderId)
    .maybeSingle();

  if (stakeholderError || !stakeholder?.stakeholder_category_id) {
    return {};
  }

  const { data: rights, error: rightsError } = await supabase
    .from("stakeholder_category_access_rights")
    .select(
      "module_key, module_label, can_view, can_create, can_edit, can_delete"
    )
    .eq("stakeholder_category_id", stakeholder.stakeholder_category_id);

  if (rightsError || !rights) {
    return {};
  }

  return expandLegacyRights(rights as ModuleAccessRight[]);
}

export function hasUnrestrictedAccess(role: UserRole | null | undefined): boolean {
  if (!role) return false;
  if (isSuperAdmin(role)) return true;
  return ADMIN_ROLES.has(role);
}

export function canAccessModule(
  role: UserRole | null | undefined,
  rights: AccessRightsMap,
  moduleKey: ModuleKey | string | null | undefined,
  action: AccessAction = "view"
): boolean {
  if (hasUnrestrictedAccess(role)) return true;
  if (role !== "stakeholder") return true;
  if (!moduleKey) return false;

  const right = rights[moduleKey];
  if (!right) return false;
  return Boolean(right[actionField(action)]);
}

export function canAccessPath(
  role: UserRole | null | undefined,
  rights: AccessRightsMap,
  pathname: string,
  action: AccessAction = "view"
): boolean {
  const moduleKey = getModuleKeyForPath(pathname);
  if (pathname === "/dashboard" && role === "stakeholder") {
    return canAccessModule(role, rights, "dashboard", action);
  }
  return canAccessModule(role, rights, moduleKey, action);
}
