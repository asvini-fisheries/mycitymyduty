import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Banknote,
  Building2,
  ClipboardList,
  FileText,
  FolderKanban,
  HardHat,
  KeyRound,
  Landmark,
  LayoutDashboard,
  Map,
  MapPin,
  Network,
  Receipt,
  Route,
  Shield,
  Truck,
  UserCog,
  Users,
  Wrench,
} from "lucide-react";
import { MODULE_KEYS, type ModuleKey } from "@/lib/modules";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  moduleKey: ModuleKey;
  superAdminOnly?: boolean;
};

export type NavGroup = {
  title: string;
  items: NavItem[];
};

export const navGroups: NavGroup[] = [
  {
    title: "Overview",
    items: [
      {
        href: "/dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        moduleKey: MODULE_KEYS.dashboard,
      },
      {
        href: "/dashboard/projects",
        label: "Project Dashboard",
        icon: FolderKanban,
        moduleKey: MODULE_KEYS.project_dashboard,
      },
    ],
  },
  {
    title: "Geography Masters",
    items: [
      {
        href: "/dashboard/masters/corporations",
        label: "Corporations",
        icon: Landmark,
        moduleKey: MODULE_KEYS.corporations,
        superAdminOnly: true,
      },
      {
        href: "/dashboard/masters/zones",
        label: "Zones",
        icon: Map,
        moduleKey: MODULE_KEYS.zones,
      },
      {
        href: "/dashboard/masters/zone-wards",
        label: "Zone-wise Wards",
        icon: MapPin,
        moduleKey: MODULE_KEYS.zone_wards,
      },
      {
        href: "/dashboard/masters/ward-areas",
        label: "Ward-wise Areas",
        icon: Network,
        moduleKey: MODULE_KEYS.ward_areas,
      },
      {
        href: "/dashboard/masters/area-streets",
        label: "Area-wise Streets",
        icon: Route,
        moduleKey: MODULE_KEYS.area_streets,
      },
    ],
  },
  {
    title: "Officials & Services",
    items: [
      {
        href: "/dashboard/masters/corporation-officials",
        label: "Corporation Officials",
        icon: UserCog,
        moduleKey: MODULE_KEYS.corporation_officials,
      },
      {
        href: "/dashboard/masters/service-categories",
        label: "Service Categories",
        icon: Wrench,
        moduleKey: MODULE_KEYS.service_categories,
      },
    ],
  },
  {
    title: "Stakeholders",
    items: [
      {
        href: "/dashboard/masters/stakeholder-categories",
        label: "Stakeholder Categories",
        icon: Users,
        moduleKey: MODULE_KEYS.stakeholder_categories,
      },
      {
        href: "/dashboard/masters/stakeholder-access-rights",
        label: "Access Rights",
        icon: KeyRound,
        moduleKey: MODULE_KEYS.stakeholder_access_rights,
      },
      {
        href: "/dashboard/masters/stakeholder-allocations",
        label: "Project Allocations",
        icon: FolderKanban,
        moduleKey: MODULE_KEYS.stakeholder_project_allocations,
      },
      {
        href: "/dashboard/masters/stakeholders",
        label: "Stakeholders",
        icon: Building2,
        moduleKey: MODULE_KEYS.stakeholders,
      },
      {
        href: "/dashboard/masters/stakeholder-members",
        label: "Stakeholder Members",
        icon: Users,
        moduleKey: MODULE_KEYS.stakeholder_members,
      },
      {
        href: "/dashboard/masters/stakeholder-equipment",
        label: "Stakeholder Equipment",
        icon: Truck,
        moduleKey: MODULE_KEYS.stakeholder_equipment,
      },
      {
        href: "/dashboard/masters/central-committees",
        label: "Central Committee",
        icon: Shield,
        moduleKey: MODULE_KEYS.central_committees,
      },
    ],
  },
  {
    title: "Projects & Activities",
    items: [
      {
        href: "/dashboard/masters/projects",
        label: "Projects / Requirements",
        icon: FolderKanban,
        moduleKey: MODULE_KEYS.projects,
      },
      {
        href: "/dashboard/masters/activities",
        label: "Activities",
        icon: Activity,
        moduleKey: MODULE_KEYS.activities,
      },
      {
        href: "/dashboard/masters/project-activities",
        label: "Project Activities",
        icon: ClipboardList,
        moduleKey: MODULE_KEYS.project_activities,
      },
      {
        href: "/dashboard/masters/activity-resources",
        label: "Resource Requirements",
        icon: HardHat,
        moduleKey: MODULE_KEYS.activity_resources,
      },
      {
        href: "/dashboard/masters/activity-executors",
        label: "Executing Stakeholders",
        icon: Users,
        moduleKey: MODULE_KEYS.activity_executors,
      },
      {
        href: "/dashboard/masters/activity-funders",
        label: "Funding Stakeholders",
        icon: Banknote,
        moduleKey: MODULE_KEYS.activity_funders,
      },
    ],
  },
  {
    title: "Operations",
    items: [
      {
        href: "/dashboard/operations/daily-updates",
        label: "Daily Activity Updates",
        icon: FileText,
        moduleKey: MODULE_KEYS.daily_updates,
      },
      {
        href: "/dashboard/operations/resources-used",
        label: "Resources Used",
        icon: Wrench,
        moduleKey: MODULE_KEYS.resources_used,
      },
      {
        href: "/dashboard/operations/bills",
        label: "Bills",
        icon: Receipt,
        moduleKey: MODULE_KEYS.bills,
      },
      {
        href: "/dashboard/operations/payments",
        label: "Payments",
        icon: Banknote,
        moduleKey: MODULE_KEYS.payments,
      },
    ],
  },
  {
    title: "Admin",
    items: [
      {
        href: "/dashboard/masters/users",
        label: "Users",
        icon: Users,
        moduleKey: MODULE_KEYS.users,
      },
    ],
  },
];
