"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { ensureLockedCorporation } from "@/lib/corporations";
import { useAccess } from "@/contexts/AccessContext";
import { fetchAllocatedProjectIds } from "@/lib/stakeholders";
import { Select } from "@/components/ui/Select";

interface ProjectRow {
  id: string;
  name: string;
  code: string | null;
  record_type: string | null;
  status: string;
  budget: number;
  quantity: number | null;
  start_date: string | null;
  created_at: string | null;
  activity_description: string | null;
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

function formatRecordType(value: string | null | undefined): string {
  if (value === "project") return "Project";
  if (value === "requirement") return "Requirement";
  return value ?? "—";
}

function latestTimestamp(project: ProjectRow): string {
  return project.start_date || project.created_at || "";
}

function sortProjectsFirst(rows: ProjectRow[]): ProjectRow[] {
  return [...rows].sort((a, b) => {
    const typeA = a.record_type === "project" ? 0 : 1;
    const typeB = b.record_type === "project" ? 0 : 1;
    if (typeA !== typeB) return typeA - typeB;
    const time = latestTimestamp(b).localeCompare(latestTimestamp(a));
    if (time !== 0) return time;
    return a.name.localeCompare(b.name);
  });
}

function pickDefaultProjectId(rows: ProjectRow[]): string {
  if (!rows.length) return "";
  const projectsOnly = rows.filter((row) => row.record_type === "project");
  const pool = projectsOnly.length ? projectsOnly : rows;
  const active = pool.filter((row) => row.status === "active");
  const planned = pool.filter((row) => row.status === "planned");
  const candidates = active.length ? active : planned.length ? planned : pool;
  return sortProjectsFirst(candidates)[0]?.id ?? rows[0].id;
}

function formatQuantity(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return Number(value).toLocaleString("en-IN");
}

interface ProjectStats {
  activityCount: number;
  updateCount: number;
  allocatedStakeholders: number;
  dailyQuantity: number;
  participants: number;
  totalFunding: number;
  totalBilled: number;
  totalPaid: number;
}

export default function ProjectDashboardPage() {
  const { isStakeholder, profile } = useAccess();
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [stats, setStats] = useState<ProjectStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [emptyMessage, setEmptyMessage] = useState<string | null>(null);

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
          "id, name, code, record_type, status, budget, quantity, start_date, created_at, activity_description, corporations(name), zone_wards(ward_number, name), ward_areas(name), area_streets(name)"
        )
        .order("name");

      if (lockedId) {
        query = query.eq("corporation_id", lockedId);
      }

      if (isStakeholder && profile?.stakeholder_id) {
        const allocatedIds = await fetchAllocatedProjectIds(
          supabase,
          profile.stakeholder_id
        );
        if (allocatedIds.length === 0) {
          setProjects([]);
          setEmptyMessage(
            "No projects or requirements have been allocated to your stakeholder yet."
          );
          setLoading(false);
          return;
        }
        query = query.in("id", allocatedIds);
      }

      const { data } = await query;
      const rows = sortProjectsFirst((data as unknown as ProjectRow[]) || []);
      setProjects(rows);
      setEmptyMessage(rows.length ? null : "No projects found.");
      if (rows.length) {
        setSelectedProjectId(pickDefaultProjectId(rows));
      }
      setLoading(false);
    }

    loadProjects();
  }, [isStakeholder, profile?.stakeholder_id]);

  useEffect(() => {
    if (!selectedProjectId || !isSupabaseConfigured()) return;

    async function loadProjectStats() {
      const supabase = createClient();

      const { data: projectActivities } = await supabase
        .from("project_activities")
        .select("id")
        .eq("project_id", selectedProjectId);

      const paIds = (projectActivities || []).map((pa) => pa.id);
      const stakeholderId = isStakeholder ? profile?.stakeholder_id : null;

      const [updates, funding, bills, payments, allocations] = await Promise.all([
        paIds.length
          ? supabase
              .from("daily_activity_updates")
              .select("quantity, persons_attended")
              .in("project_activity_id", paIds)
          : Promise.resolve({ data: [] }),
        paIds.length
          ? (() => {
              let q = supabase
                .from("activity_funding_stakeholders")
                .select("committed_amount")
                .in("project_activity_id", paIds);
              if (stakeholderId) q = q.eq("stakeholder_id", stakeholderId);
              return q;
            })()
          : Promise.resolve({ data: [] }),
        (() => {
          let q = supabase.from("stakeholder_bills").select("amount, stakeholder_id");
          if (stakeholderId) q = q.eq("stakeholder_id", stakeholderId);
          return q;
        })(),
        (() => {
          let q = supabase.from("stakeholder_payments").select("amount");
          if (stakeholderId) q = q.eq("stakeholder_id", stakeholderId);
          return q;
        })(),
        supabase
          .from("stakeholder_project_allocations")
          .select("id", { count: "exact", head: true })
          .eq("project_id", selectedProjectId),
      ]);

      const updateRows = updates.data || [];

      setStats({
        activityCount: paIds.length,
        updateCount: updateRows.length,
        allocatedStakeholders: allocations.count || 0,
        dailyQuantity: updateRows.reduce(
          (sum, row) => sum + Number(row.quantity || 0),
          0
        ),
        participants: updateRows.reduce(
          (sum, row) => sum + Number(row.persons_attended || 0),
          0
        ),
        totalFunding: (funding.data || []).reduce(
          (s, r) => s + Number(r.committed_amount || 0),
          0
        ),
        totalBilled: (bills.data || []).reduce((s, r) => s + Number(r.amount || 0), 0),
        totalPaid: (payments.data || []).reduce((s, r) => s + Number(r.amount || 0), 0),
      });
    }

    loadProjectStats();
  }, [selectedProjectId, isStakeholder, profile?.stakeholder_id]);

  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const selectedLocation = selectedProject ? formatProjectLocation(selectedProject) : null;

  if (loading) {
    return <p className="text-civic-600">Loading projects...</p>;
  }

  if (projects.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-civic-900">Project Dashboard</h1>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
          {emptyMessage ??
            "No allocated projects or requirements are available for your account."}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-civic-900">Project Dashboard</h1>
          <p className="mt-1 text-civic-600">
            {isStakeholder
              ? "Allocated projects and requirements assigned to you"
              : "Progress, funding, and billing overview by project"}
          </p>
        </div>
        <div className="w-full sm:w-96">
          <Select
            label="Select Project / Requirement"
            options={projects.map((p) => ({
              value: p.id,
              label: [
                formatRecordType(p.record_type),
                p.code,
                p.name,
              ]
                .filter(Boolean)
                .join(" — "),
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
              <p className="text-xs font-semibold uppercase tracking-wide text-civic-500">
                {formatRecordType(selectedProject.record_type)}
              </p>
              <h2 className="text-xl font-semibold text-civic-900">{selectedProject.name}</h2>
              <p className="text-sm text-civic-600">
                {selectedProject.corporations?.name}
                {selectedLocation ? ` · ${selectedLocation}` : ""} · Status:{" "}
                <span className="capitalize">{selectedProject.status.replace("_", " ")}</span>
                {selectedProject.activity_description
                  ? ` · ${selectedProject.activity_description}`
                  : ""}
              </p>
            </div>
            <p className="text-lg font-semibold text-civic-800">
              Budget: ₹{Number(selectedProject.budget || 0).toLocaleString("en-IN")}
            </p>
          </div>
        </div>
      )}

      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: "Stakeholders allocated",
              value: stats.allocatedStakeholders.toLocaleString("en-IN"),
            },
            {
              label: "Project quantity",
              value: formatQuantity(selectedProject?.quantity),
            },
            {
              label: "Quantity so far",
              value: formatQuantity(stats.dailyQuantity),
            },
            {
              label: "Participants",
              value: stats.participants.toLocaleString("en-IN"),
            },
            { label: "Project Activities", value: stats.activityCount },
            { label: "Daily Updates", value: stats.updateCount },
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
            <Link href="/dashboard/masters/stakeholder-allocations" className="text-civic-800 underline">
              Project Allocations
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
