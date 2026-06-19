"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  Building2,
  FolderKanban,
  Landmark,
  Receipt,
  Users,
} from "lucide-react";
import { fetchCurrentUserProfile } from "@/lib/auth";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { ensureLockedCorporation } from "@/lib/corporations";
import { isSuperAdmin } from "@/lib/roles";

interface Stats {
  corporations: number;
  stakeholders: number;
  projects: number;
  activities: number;
  dailyUpdates: number;
  bills: number;
}

const quickLinks = [
  {
    href: "/dashboard/masters/corporations",
    label: "Corporations",
    icon: Landmark,
    superAdminOnly: true,
  },
  { href: "/dashboard/masters/stakeholders", label: "Stakeholders", icon: Users },
  { href: "/dashboard/masters/projects", label: "Projects", icon: FolderKanban },
  { href: "/dashboard/masters/activities", label: "Activities", icon: Activity },
  { href: "/dashboard/operations/daily-updates", label: "Daily Updates", icon: Building2 },
  { href: "/dashboard/operations/bills", label: "Bills", icon: Receipt },
  { href: "/dashboard/projects", label: "Project Dashboard", icon: FolderKanban },
];

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [configured, setConfigured] = useState(true);
  const [superAdmin, setSuperAdmin] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setConfigured(false);
      return;
    }

    async function loadStats() {
      const supabase = createClient();
      const [profile, lockedId] = await Promise.all([
        fetchCurrentUserProfile(supabase),
        ensureLockedCorporation(supabase),
      ]);
      setSuperAdmin(isSuperAdmin(profile?.role));

      const corpFilter = lockedId ? { corporation_id: lockedId } : undefined;

      const [corporations, stakeholders, projects, activities, dailyUpdates, bills] =
        await Promise.all([
          lockedId
            ? supabase
                .from("corporations")
                .select("id", { count: "exact", head: true })
                .eq("id", lockedId)
            : supabase.from("corporations").select("id", { count: "exact", head: true }),
          corpFilter
            ? supabase
                .from("stakeholders")
                .select("id", { count: "exact", head: true })
                .eq("corporation_id", lockedId!)
            : supabase.from("stakeholders").select("id", { count: "exact", head: true }),
          corpFilter
            ? supabase
                .from("projects")
                .select("id", { count: "exact", head: true })
                .eq("corporation_id", lockedId!)
            : supabase.from("projects").select("id", { count: "exact", head: true }),
          supabase.from("activities").select("id", { count: "exact", head: true }),
          supabase.from("daily_activity_updates").select("id", { count: "exact", head: true }),
          supabase.from("stakeholder_bills").select("id", { count: "exact", head: true }),
        ]);

      setStats({
        corporations: corporations.count || 0,
        stakeholders: stakeholders.count || 0,
        projects: projects.count || 0,
        activities: activities.count || 0,
        dailyUpdates: dailyUpdates.count || 0,
        bills: bills.count || 0,
      });
    }

    loadStats();
  }, []);

  const visibleQuickLinks = useMemo(
    () => quickLinks.filter((link) => !link.superAdminOnly || superAdmin),
    [superAdmin]
  );

  const statCards = stats
    ? [
        { label: "Corporations", value: stats.corporations },
        { label: "Stakeholders", value: stats.stakeholders },
        { label: "Projects", value: stats.projects },
        { label: "Activities", value: stats.activities },
        { label: "Daily Updates", value: stats.dailyUpdates },
        { label: "Bills", value: stats.bills },
      ]
    : [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-civic-900">Dashboard</h1>
        <p className="mt-1 text-civic-600">
          MyCityMyDuty — civic engagement and project operations
        </p>
      </div>

      {!configured && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          <p className="font-semibold">Supabase not configured</p>
          <p className="mt-1">
            Copy <code className="rounded bg-amber-100 px-1">.env.example</code> to{" "}
            <code className="rounded bg-amber-100 px-1">.env.local</code> and add your
            Supabase project URL and anon key.
          </p>
        </div>
      )}

      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {statCards.map((card) => (
            <div
              key={card.label}
              className="rounded-xl border border-civic-100 bg-white p-5 shadow-sm"
            >
              <p className="text-sm text-civic-600">{card.label}</p>
              <p className="mt-1 text-3xl font-bold text-civic-900">{card.value}</p>
            </div>
          ))}
        </div>
      )}

      <div>
        <h2 className="mb-4 text-lg font-semibold text-civic-900">Quick Links</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visibleQuickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-3 rounded-xl border border-civic-100 bg-white p-4 shadow-sm transition hover:border-civic-300 hover:shadow"
              >
                <div className="rounded-lg bg-civic-100 p-2">
                  <Icon className="h-5 w-5 text-civic-700" />
                </div>
                <span className="font-medium text-civic-800">{link.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
