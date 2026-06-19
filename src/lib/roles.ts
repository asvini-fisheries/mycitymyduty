import type { UserRole } from "@/lib/types/database";

export function isSuperAdmin(role: UserRole | null | undefined): boolean {
  return role === "super_admin";
}

export const SUPER_ADMIN_ONLY_HREFS = new Set([
  "/dashboard/masters/corporations",
]);
