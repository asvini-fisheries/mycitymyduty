"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { ensureLockedCorporation } from "@/lib/corporations";
import { Select } from "@/components/ui/Select";

interface ProjectRow {
  id: string;
  name: string;
  code: string | null;
  status: string;
  budget: number;
  corporations?: { name: string };
  zone_wards?: { ward_number: string; name: string } | null;
  ward_areas?: { name: string } | null;
  area_streets?: { name: string } | null;
}

function formatProjectLocation(project: ProjectRow): string | null {
  const parts: string[] = [];
  if (project.zone_wards) {
    parts.push(`Ward ${project.zone_wards.ward_number} — ${project.zone_wards.name}`);
  }
  if (project.ward_areas?.name) {
    parts.push(project.ward_areas.name);
  }
  if (project.area_streets?.name) {
    parts.push(project.area_streets.name);
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

interface ProjectStats {
  activityCount: number;
  updateCount: number;
  avgProgress: number;
  totalFunding: number;
  totalBilled: number;
  totalPaid: number;
}

export default function ProjectDashboardPage() {
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [stats, setStats] = useState<ProjectStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    async function loadProjects() {
      const supabase = createClient();
      const lockedId = await ensureLockedCorporation(supabase);

      let query = supabase
        .from("projects")
        .select(
          "id, name, code, status, budget, corporations(name), zone_wards(ward_number, name), ward_areas(name), area_streets(name)"
        )
        .order("name");

      if (lockedId) {
        query = query.eq("corporation_id", lockedId);
      }

      const { data } = await query;
      setProjects((data as unknown as ProjectRow[]) || []);
      if (data?.length) {
        setSelectedProjectId(data[0].id);
      }
      setLoading(false);
    }

    loadProjects();
  }, []);

  useEffect(() => {
    if (!selectedProjectId || !isSupabaseConfigured()) return;

    async function loadProjectStats() {
      const supabase = createClient();

      const { data: projectActivities } = await supabase
        .from("project_activities")
        .select("id")
        .eq("project_id", selectedProjectId);

      const paIds = (projectActivities || []).map((pa) => pa.id);

      const [updates, funding, bills, payments] = await Promise.all([
        paIds.length
          ? supabase
              .from("daily_activity_updates")
              .select("progress_pct")
              .in("project_activity_id", paIds)
          : Promise.resolve({ data: [] }),
        paIds.length
          ? supabase
              .from("activity_funding_stakeholders")
              .select("committed_amount")
              .in("project_activity_id", paIds)
          : Promise.resolve({ data: [] }),
        supabase
          .from("stakeholder_bills")
          .select("amount, stakeholder_id"),
        supabase.from("stakeholder_payments").select("amount"),
      ]);

      const updateRows = updates.data || [];
      const avgProgress =
        updateRows.length > 0
          ? Math.round(
              updateRows.reduce((s, r) => s + (r.progress_pct || 0), 0) / updateRows.length
            )
          : 0;

      setStats({
        activityCount: paIds.length,
        updateCount: updateRows.length,
        avgProgress,
        totalFunding: (funding.data || []).reduce(
          (s, r) => s + Number(r.committed_amount || 0),
          0
        ),
        totalBilled: (bills.data || []).reduce((s, r) => s + Number(r.amount || 0), 0),
        totalPaid: (payments.data || []).reduce((s, r) => s + Number(r.amount || 0), 0),
      });
    }

    loadProjectStats();
  }, [selectedProjectId]);

  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const selectedLocation = selectedProject ? formatProjectLocation(selectedProject) : null;

  if (loading) {
    return <p className="text-civic-600">Loading projects...</p>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-civic-900">Project Dashboard</h1>
          <p className="mt-1 text-civic-600">
            Progress, funding, and billing overview by project
          </p>
        </div>
        <div className="w-full sm:w-72">
          <Select
            label="Select Project"
            options={projects.map((p) => ({
              value: p.id,
              label: p.code ? `${p.code} — ${p.name}` : p.name,
            }))}
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
          />
        </div>
      </div>

      {selectedProject && (
        <div className="rounded-xl border border-civic-100 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-civic-900">{selectedProject.name}</h2>
              <p className="text-sm text-civic-600">
                {selectedProject.corporations?.name}
                {selectedLocation ? ` · ${selectedLocation}` : ""} · Status:{" "}
                <span className="capitalize">{selectedProject.status.replace("_", " ")}</span>
              </p>
            </div>
            <p className="text-lg font-semibold text-civic-800">
              Budget: ₹{Number(selectedProject.budget || 0).toLocaleString("en-IN")}
            </p>
          </div>
        </div>
      )}

      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { label: "Project Activities", value: stats.activityCount },
            { label: "Daily Updates", value: stats.updateCount },
            { label: "Avg. Progress", value: `${stats.avgProgress}%` },
            {
              label: "Total Funding",
              value: `₹${stats.totalFunding.toLocaleString("en-IN")}`,
            },
            {
              label: "Total Billed",
              value: `₹${stats.totalBilled.toLocaleString("en-IN")}`,
            },
            {
              label: "Total Paid",
              value: `₹${stats.totalPaid.toLocaleString("en-IN")}`,
            },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-xl border border-civic-100 bg-white p-5 shadow-sm"
            >
              <p className="text-sm text-civic-600">{card.label}</p>
              <p className="mt-1 text-2xl font-bold text-civic-900">{card.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-civic-100 bg-civic-50 p-5 text-sm text-civic-700">
        <p className="font-medium">Manage this project</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>
            <Link href="/dashboard/masters/project-activities" className="text-civic-800 underline">
              Project Activities
            </Link>
          </li>
          <li>
            <Link href="/dashboard/operations/daily-updates" className="text-civic-800 underline">
              Daily Activity Updates
            </Link>
          </li>
          <li>
            <Link href="/dashboard/masters/activity-funders" className="text-civic-800 underline">
              Funding Stakeholders
            </Link>
          </li>
        </ul>
      </div>
    </div>
  );
}
