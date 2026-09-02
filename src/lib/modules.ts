/** Screen-level module keys used for stakeholder access rights. */
export const MODULE_KEYS = {
  dashboard: "dashboard",
  project_dashboard: "project_dashboard",
  zones: "zones",
  zone_wards: "zone_wards",
  ward_areas: "ward_areas",
  area_streets: "area_streets",
  corporation_officials: "corporation_officials",
  service_categories: "service_categories",
  stakeholder_categories: "stakeholder_categories",
  stakeholder_access_rights: "stakeholder_access_rights",
  stakeholder_project_allocations: "stakeholder_project_allocations",
  stakeholders: "stakeholders",
  stakeholder_members: "stakeholder_members",
  stakeholder_equipment: "stakeholder_equipment",
  central_committees: "central_committees",
  projects: "projects",
  activities: "activities",
  project_activities: "project_activities",
  activity_resources: "activity_resources",
  activity_executors: "activity_executors",
  activity_funders: "activity_funders",
  daily_updates: "daily_updates",
  resources_used: "resources_used",
  bills: "bills",
  payments: "payments",
  users: "users",
  corporations: "corporations",
} as const;

export type ModuleKey = (typeof MODULE_KEYS)[keyof typeof MODULE_KEYS];

/** Legacy coarse keys still honored when checking access. */
export const LEGACY_MODULE_ALIASES: Record<string, ModuleKey[]> = {
  masters: [
    MODULE_KEYS.zones,
    MODULE_KEYS.zone_wards,
    MODULE_KEYS.ward_areas,
    MODULE_KEYS.area_streets,
    MODULE_KEYS.corporation_officials,
    MODULE_KEYS.service_categories,
    MODULE_KEYS.stakeholder_categories,
    MODULE_KEYS.stakeholder_access_rights,
    MODULE_KEYS.stakeholder_project_allocations,
    MODULE_KEYS.stakeholders,
    MODULE_KEYS.stakeholder_members,
    MODULE_KEYS.stakeholder_equipment,
    MODULE_KEYS.central_committees,
  ],
  projects: [
    MODULE_KEYS.projects,
    MODULE_KEYS.project_dashboard,
    MODULE_KEYS.project_activities,
  ],
  activities: [
    MODULE_KEYS.activities,
    MODULE_KEYS.project_activities,
    MODULE_KEYS.activity_resources,
    MODULE_KEYS.activity_executors,
    MODULE_KEYS.activity_funders,
  ],
  daily_updates: [MODULE_KEYS.daily_updates, MODULE_KEYS.resources_used],
  billing: [MODULE_KEYS.bills, MODULE_KEYS.payments],
  dashboard: [MODULE_KEYS.dashboard, MODULE_KEYS.project_dashboard],
};

export const APP_MODULE_OPTIONS: { value: ModuleKey; label: string }[] = [
  { value: MODULE_KEYS.dashboard, label: "Dashboard" },
  { value: MODULE_KEYS.project_dashboard, label: "Project Dashboard" },
  { value: MODULE_KEYS.zones, label: "Zones" },
  { value: MODULE_KEYS.zone_wards, label: "Zone-wise Wards" },
  { value: MODULE_KEYS.ward_areas, label: "Ward-wise Areas" },
  { value: MODULE_KEYS.area_streets, label: "Area-wise Streets" },
  { value: MODULE_KEYS.corporation_officials, label: "Corporation Officials" },
  { value: MODULE_KEYS.service_categories, label: "Service Categories" },
  { value: MODULE_KEYS.stakeholder_categories, label: "Stakeholder Categories" },
  { value: MODULE_KEYS.stakeholder_access_rights, label: "Access Rights" },
  { value: MODULE_KEYS.stakeholder_project_allocations, label: "Project Allocations" },
  { value: MODULE_KEYS.stakeholders, label: "Stakeholders" },
  { value: MODULE_KEYS.stakeholder_members, label: "Stakeholder Members" },
  { value: MODULE_KEYS.stakeholder_equipment, label: "Stakeholder Equipment" },
  { value: MODULE_KEYS.central_committees, label: "Central Committee" },
  { value: MODULE_KEYS.projects, label: "Projects / Requirements" },
  { value: MODULE_KEYS.activities, label: "Activities" },
  { value: MODULE_KEYS.project_activities, label: "Project Activities" },
  { value: MODULE_KEYS.activity_resources, label: "Resource Requirements" },
  { value: MODULE_KEYS.activity_executors, label: "Executing Stakeholders" },
  { value: MODULE_KEYS.activity_funders, label: "Funding Stakeholders" },
  { value: MODULE_KEYS.daily_updates, label: "Daily Activity Updates" },
  { value: MODULE_KEYS.resources_used, label: "Resources Used" },
  { value: MODULE_KEYS.bills, label: "Bills" },
  { value: MODULE_KEYS.payments, label: "Payments" },
  { value: MODULE_KEYS.users, label: "Users" },
  { value: MODULE_KEYS.corporations, label: "Corporations" },
];

/** Map dashboard routes to module keys (longest prefix wins in guard). */
export const HREF_MODULE_MAP: { href: string; moduleKey: ModuleKey }[] = [
  { href: "/dashboard/masters/corporations", moduleKey: MODULE_KEYS.corporations },
  { href: "/dashboard/masters/zones", moduleKey: MODULE_KEYS.zones },
  { href: "/dashboard/masters/zone-wards", moduleKey: MODULE_KEYS.zone_wards },
  { href: "/dashboard/masters/ward-areas", moduleKey: MODULE_KEYS.ward_areas },
  { href: "/dashboard/masters/area-streets", moduleKey: MODULE_KEYS.area_streets },
  { href: "/dashboard/masters/corporation-officials", moduleKey: MODULE_KEYS.corporation_officials },
  { href: "/dashboard/masters/service-categories", moduleKey: MODULE_KEYS.service_categories },
  { href: "/dashboard/masters/stakeholder-categories", moduleKey: MODULE_KEYS.stakeholder_categories },
  { href: "/dashboard/masters/stakeholder-access-rights", moduleKey: MODULE_KEYS.stakeholder_access_rights },
  { href: "/dashboard/masters/stakeholder-allocations", moduleKey: MODULE_KEYS.stakeholder_project_allocations },
  { href: "/dashboard/masters/stakeholders", moduleKey: MODULE_KEYS.stakeholders },
  { href: "/dashboard/masters/stakeholder-members", moduleKey: MODULE_KEYS.stakeholder_members },
  { href: "/dashboard/masters/stakeholder-equipment", moduleKey: MODULE_KEYS.stakeholder_equipment },
  { href: "/dashboard/masters/central-committees", moduleKey: MODULE_KEYS.central_committees },
  { href: "/dashboard/masters/projects", moduleKey: MODULE_KEYS.projects },
  { href: "/dashboard/masters/activities", moduleKey: MODULE_KEYS.activities },
  { href: "/dashboard/masters/project-activities", moduleKey: MODULE_KEYS.project_activities },
  { href: "/dashboard/masters/activity-resources", moduleKey: MODULE_KEYS.activity_resources },
  { href: "/dashboard/masters/activity-executors", moduleKey: MODULE_KEYS.activity_executors },
  { href: "/dashboard/masters/activity-funders", moduleKey: MODULE_KEYS.activity_funders },
  { href: "/dashboard/operations/daily-updates", moduleKey: MODULE_KEYS.daily_updates },
  { href: "/dashboard/operations/resources-used", moduleKey: MODULE_KEYS.resources_used },
  { href: "/dashboard/operations/bills", moduleKey: MODULE_KEYS.bills },
  { href: "/dashboard/operations/payments", moduleKey: MODULE_KEYS.payments },
  { href: "/dashboard/masters/users", moduleKey: MODULE_KEYS.users },
  { href: "/dashboard/projects", moduleKey: MODULE_KEYS.project_dashboard },
  { href: "/dashboard", moduleKey: MODULE_KEYS.dashboard },
];

export function getModuleKeyForPath(pathname: string): ModuleKey | null {
  const sorted = [...HREF_MODULE_MAP].sort((a, b) => b.href.length - a.href.length);
  for (const entry of sorted) {
    if (pathname === entry.href || pathname.startsWith(`${entry.href}/`)) {
      return entry.moduleKey;
    }
  }
  return null;
}

/** Resolve module key from Supabase table name for CRUD screens. */
export const TABLE_MODULE_MAP: Record<string, ModuleKey> = {
  corporations: MODULE_KEYS.corporations,
  zones: MODULE_KEYS.zones,
  zone_wards: MODULE_KEYS.zone_wards,
  ward_areas: MODULE_KEYS.ward_areas,
  area_streets: MODULE_KEYS.area_streets,
  corporation_officials: MODULE_KEYS.corporation_officials,
  service_categories: MODULE_KEYS.service_categories,
  stakeholder_categories: MODULE_KEYS.stakeholder_categories,
  stakeholder_category_access_rights: MODULE_KEYS.stakeholder_access_rights,
  stakeholder_project_allocations: MODULE_KEYS.stakeholder_project_allocations,
  stakeholders: MODULE_KEYS.stakeholders,
  stakeholder_members: MODULE_KEYS.stakeholder_members,
  stakeholder_equipment: MODULE_KEYS.stakeholder_equipment,
  central_committees: MODULE_KEYS.central_committees,
  projects: MODULE_KEYS.projects,
  activities: MODULE_KEYS.activities,
  project_activities: MODULE_KEYS.project_activities,
  activity_resource_requirements: MODULE_KEYS.activity_resources,
  activity_executing_stakeholders: MODULE_KEYS.activity_executors,
  activity_funding_stakeholders: MODULE_KEYS.activity_funders,
  daily_activity_updates: MODULE_KEYS.daily_updates,
  daily_activity_resources_used: MODULE_KEYS.resources_used,
  stakeholder_bills: MODULE_KEYS.bills,
  stakeholder_payments: MODULE_KEYS.payments,
  user_master: MODULE_KEYS.users,
};
