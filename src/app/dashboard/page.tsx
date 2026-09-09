"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  Building2,
  ClipboardList,
  FolderKanban,
  Receipt,
  Users,
} from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { ensureLockedCorporation } from "@/lib/corporations";
import { useAccess } from "@/contexts/AccessContext";
import { fetchAllocatedProjectIds } from "@/lib/stakeholders";

interface Stats {
  projects: number;
  requirements: number;
  stakeholders: number;
  activities: number;
  dailyUpdates: number;
  bills: number;
}

interface ActiveDailyStakeholder {
  id: string;
  name: string;
  lastUpdate: string;
  updateCount: number;
}

const quickLinks = [
  { href: "/dashboard/masters/projects", label: "Projects", icon: FolderKanban },
  { href: "/dashboard/masters/stakeholders", label: "Stakeholders", icon: Users },
  { href: "/dashboard/masters/activities", label: "Activities", icon: Activity },
  { href: "/dashboard/operations/daily-updates", label: "Daily Updates", icon: Building2 },
  { href: "/dashboard/operations/bills", label: "Bills", icon: Receipt },
  { href: "/dashboard/projects", label: "Project Dashboard", icon: ClipboardList },
];

function nestedRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  if (Array.isArray(value)) {
    return (value[0] as Record<string, unknown> | undefined) ?? null;
  }
  return value as Record<string, unknown>;
}

function formatDate(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  return value;
}

export default function DashboardPage() {
  const { isStakeholder, profile, loading: accessLoading } = useAccess();
  const [stats, setStats] = useState<Stats | null>(null);
  const [activeDailyStakeholders, setActiveDailyStakeholders] = useState<
    ActiveDailyStakeholder[]
  >([]);
  const [configured, setConfigured] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setConfigured(false);
      return;
    }
    if (accessLoading) return;

    async function loadStats() {
      const supabase = createClient();
      const lockedId = await ensureLockedCorporation(supabase);
      const allocatedIds =
        isStakeholder && profile?.stakeholder_id
          ? await fetchAllocatedProjectIds(supabase, profile.stakeholder_id)
          : null;

      function countProjects(recordType: "project" | "requirement") {
        if (allocatedIds && allocatedIds.length === 0) {
          return Promise.resolve({ count: 0 });
        }
        let query = supabase
          .from("projects")
          .select("id", { count: "exact", head: true })
          .eq("record_type", recordType);
        if (lockedId) query = query.eq("corporation_id", lockedId);
        if (allocatedIds) query = query.in("id", allocatedIds);
        return query;
      }

      let stakeholdersQuery = supabase
        .from("stakeholders")
        .select("id", { count: "exact", head: true });
      if (lockedId) {
        stakeholdersQuery = stakeholdersQuery.eq("corporation_id", lockedId);
      }

      const [
        projects,
        requirements,
        stakeholders,
        activities,
        dailyUpdates,
        bills,
        dailyUpdateRows,
      ] = await Promise.all([
        countProjects("project"),
        countProjects("requirement"),
        stakeholdersQuery,
        supabase.from("activities").select("id", { count: "exact", head: true }),
        supabase.from("daily_activity_updates").select("id", { count: "exact", head: true }),
        supabase.from("stakeholder_bills").select("id", { count: "exact", head: true }),
        supabase
          .from("daily_activity_updates")
          .select(
            "stakeholder_id, update_date, project_activities(project_id), stakeholders(id, name, is_active, corporation_id)"
          )
          .order("update_date", { ascending: false }),
      ]);

      const allocatedSet = allocatedIds ? new Set(allocatedIds) : null;
      const byStakeholder = new Map<string, ActiveDailyStakeholder>();

      for (const row of dailyUpdateRows.data ?? []) {
        const record = row as Record<string, unknown>;
        const stakeholder = nestedRecord(record.stakeholders);
        if (!stakeholder || stakeholder.is_active === false) continue;
        if (lockedId && stakeholder.corporation_id !== lockedId) continue;

        const project = nestedRecord(record.project_activities);
        const projectId = project?.project_id ? String(project.project_id) : "";
        if (allocatedSet && (!projectId || !allocatedSet.has(projectId))) continue;

        const id = String(stakeholder.id ?? record.stakeholder_id ?? "");
        if (!id) continue;

        const existing = byStakeholder.get(id);
        if (existing) {
          existing.updateCount += 1;
          continue;
        }

        byStakeholder.set(id, {
          id,
          name: String(stakeholder.name ?? "Stakeholder"),
          lastUpdate: String(record.update_date ?? ""),
          updateCount: 1,
        });
      }

      setStats({
        projects: projects.count || 0,
        requirements: requirements.count || 0,
        stakeholders: stakeholders.count || 0,
        activities: activities.count || 0,
        dailyUpdates: dailyUpdates.count || 0,
        bills: bills.count || 0,
      });
      setActiveDailyStakeholders([...byStakeholder.values()]);
    }

    loadStats();
  }, [accessLoading, isStakeholder, profile?.stakeholder_id]);

  const statCards = stats
    ? [
        { label: "Projects", value: stats.projects },
        { label: "Requirements", value: stats.requirements },
        { label: "Stakeholders", value: stats.stakeholders },
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
          MyCityMyDuty — Greener City Healthier City
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

      {stats && (
        <div className="overflow-hidden rounded-xl border border-civic-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-civic-100 px-5 py-4">
            <div>
              <h2 className="text-lg font-semibold text-civic-900">
                Active stakeholders on Daily Activities
              </h2>
              <p className="mt-0.5 text-sm text-civic-600">
                Active stakeholders who have posted daily activity updates
              </p>
            </div>
            <Link
              href="/dashboard/operations/daily-updates"
              className="text-sm font-medium text-civic-700 hover:underline"
            >
              View updates
            </Link>
          </div>
          {activeDailyStakeholders.length === 0 ? (
            <p className="px-5 py-8 text-sm text-civic-500">
              No active stakeholders have posted daily activity updates yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead className="border-b border-civic-100 bg-civic-50">
                  <tr>
                    <th className="px-5 py-3 font-semibold text-civic-800">
                      Stakeholder
                    </th>
                    <th className="px-5 py-3 font-semibold text-civic-800">
                      Updates
                    </th>
                    <th className="px-5 py-3 font-semibold text-civic-800">
                      Last update
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {activeDailyStakeholders.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-civic-50 last:border-0"
                    >
                      <td className="px-5 py-3 font-medium text-civic-900">
                        {row.name}
                      </td>
                      <td className="px-5 py-3 text-civic-700">{row.updateCount}</td>
                      <td className="px-5 py-3 text-civic-700">
                        {row.lastUpdate ? formatDate(row.lastUpdate) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div>
        <h2 className="mb-4 text-lg font-semibold text-civic-900">Quick Links</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {quickLinks.map((link) => {
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
