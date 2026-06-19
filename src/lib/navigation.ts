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

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
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
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/dashboard/projects", label: "Project Dashboard", icon: FolderKanban },
    ],
  },
  {
    title: "Geography Masters",
    items: [
      {
        href: "/dashboard/masters/corporations",
        label: "Corporations",
        icon: Landmark,
        superAdminOnly: true,
      },
      { href: "/dashboard/masters/zones", label: "Zones", icon: Map },
      { href: "/dashboard/masters/zone-wards", label: "Zone-wise Wards", icon: MapPin },
      { href: "/dashboard/masters/ward-areas", label: "Ward-wise Areas", icon: Network },
      { href: "/dashboard/masters/area-streets", label: "Area-wise Streets", icon: Route },
    ],
  },
  {
    title: "Officials & Services",
    items: [
      { href: "/dashboard/masters/corporation-officials", label: "Corporation Officials", icon: UserCog },
      { href: "/dashboard/masters/service-categories", label: "Service Categories", icon: Wrench },
    ],
  },
  {
    title: "Stakeholders",
    items: [
      { href: "/dashboard/masters/stakeholder-categories", label: "Stakeholder Categories", icon: Users },
      { href: "/dashboard/masters/stakeholder-access-rights", label: "Access Rights", icon: KeyRound },
      { href: "/dashboard/masters/stakeholders", label: "Stakeholders", icon: Building2 },
      { href: "/dashboard/masters/stakeholder-members", label: "Stakeholder Members", icon: Users },
      { href: "/dashboard/masters/stakeholder-equipment", label: "Stakeholder Equipment", icon: Truck },
      { href: "/dashboard/masters/central-committees", label: "Central Committee", icon: Shield },
    ],
  },
  {
    title: "Projects & Activities",
    items: [
      { href: "/dashboard/masters/projects", label: "Projects / Requirements", icon: FolderKanban },
      { href: "/dashboard/masters/activities", label: "Activities", icon: Activity },
      { href: "/dashboard/masters/project-activities", label: "Project Activities", icon: ClipboardList },
      { href: "/dashboard/masters/activity-resources", label: "Resource Requirements", icon: HardHat },
      { href: "/dashboard/masters/activity-executors", label: "Executing Stakeholders", icon: Users },
      { href: "/dashboard/masters/activity-funders", label: "Funding Stakeholders", icon: Banknote },
    ],
  },
  {
    title: "Operations",
    items: [
      { href: "/dashboard/operations/daily-updates", label: "Daily Activity Updates", icon: FileText },
      { href: "/dashboard/operations/resources-used", label: "Resources Used", icon: Wrench },
      { href: "/dashboard/operations/bills", label: "Bills", icon: Receipt },
      { href: "/dashboard/operations/payments", label: "Payments", icon: Banknote },
    ],
  },
  {
    title: "Admin",
    items: [
      { href: "/dashboard/masters/users", label: "Users", icon: Users },
    ],
  },
];
