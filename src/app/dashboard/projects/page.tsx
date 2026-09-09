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

function nestedRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  if (Array.isArray(value)) {
    return (value[0] as Record<string, unknown> | undefined) ?? null;
  }
  return value as Record<string, unknown>;
}

interface RankedStakeholder {
  id: string;
  rank: number;
  name: string;
  category: string | null;
  contactPerson: string | null;
  phone: string | null;
  quantity: number;
  participants: number;
  updateCount: number;
}

function stakeholderDetails(value: unknown): {
  id: string;
  name: string;
  category: string | null;
  contactPerson: string | null;
  phone: string | null;
} | null {
  const stakeholder = nestedRecord(value);
  if (!stakeholder?.id) return null;
  const category = nestedRecord(stakeholder.stakeholder_categories);
  return {
    id: String(stakeholder.id),
    name: String(stakeholder.name ?? "Stakeholder"),
    category: category?.name ? String(category.name) : null,
    contactPerson: stakeholder.contact_person
      ? String(stakeholder.contact_person)
      : null,
    phone: stakeholder.phone ? String(stakeholder.phone) : null,
  };
}

function rankStakeholders(
  allocations: { stakeholder_id?: string; stakeholders?: unknown }[],
  updates: {
    stakeholder_id?: string;
    quantity?: number | null;
    persons_attended?: number | null;
    stakeholders?: unknown;
  }[]
): RankedStakeholder[] {
  const byId = new Map<string, RankedStakeholder>();

  function ensure(details: ReturnType<typeof stakeholderDetails>) {
    if (!details || byId.has(details.id)) return;
    byId.set(details.id, {
      ...details,
      rank: 0,
      quantity: 0,
      participants: 0,
      updateCount: 0,
    });
  }

  for (const row of allocations) {
    ensure(
      stakeholderDetails(row.stakeholders) ??
        (row.stakeholder_id
          ? {
              id: String(row.stakeholder_id),
              name: "Stakeholder",
              category: null,
              contactPerson: null,
              phone: null,
            }
          : null)
    );
  }

  for (const row of updates) {
    const details =
      stakeholderDetails(row.stakeholders) ??
      (row.stakeholder_id
        ? {
            id: String(row.stakeholder_id),
            name: "Stakeholder",
            category: null,
            contactPerson: null,
            phone: null,
          }
        : null);
    if (!details) continue;
    ensure(details);
    const current = byId.get(details.id);
    if (!current) continue;
    if (current.name === "Stakeholder" && details.name !== "Stakeholder") {
      current.name = details.name;
      current.category = details.category;
      current.contactPerson = details.contactPerson;
      current.phone = details.phone;
    }
    current.quantity += Number(row.quantity || 0);
    current.participants += Number(row.persons_attended || 0);
    current.updateCount += 1;
  }

  const ranked = [...byId.values()].sort((a, b) => {
    if (b.quantity !== a.quantity) return b.quantity - a.quantity;
    if (b.participants !== a.participants) return b.participants - a.participants;
    return a.name.localeCompare(b.name);
  });

  ranked.forEach((row, index) => {
    if (index > 0 && row.quantity === ranked[index - 1].quantity) {
      row.rank = ranked[index - 1].rank;
    } else {
      row.rank = index + 1;
    }
  });

  return ranked;
}

interface ProjectStats {
  updateCount: number;
  allocatedStakeholders: number;
  dailyQuantity: number;
  participants: number;
}

export default function ProjectDashboardPage() {
  const { isStakeholder, profile } = useAccess();
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [stats, setStats] = useState<ProjectStats | null>(null);
  const [rankedStakeholders, setRankedStakeholders] = useState<
    RankedStakeholder[]
  >([]);
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
      setStats(null);
      setRankedStakeholders([]);
      const supabase = createClient();

      const { data: projectActivities } = await supabase
        .from("project_activities")
        .select("id")
        .eq("project_id", selectedProjectId);

      const paIds = (projectActivities || []).map((pa) => pa.id);

      const [updates, allocations] = await Promise.all([
        paIds.length
          ? supabase
              .from("daily_activity_updates")
              .select(
                "quantity, persons_attended, stakeholder_id, stakeholders(id, name, contact_person, phone, stakeholder_categories(name))"
              )
              .in("project_activity_id", paIds)
          : Promise.resolve({ data: [] }),
        supabase
          .from("stakeholder_project_allocations")
          .select(
            "stakeholder_id, stakeholders(id, name, contact_person, phone, stakeholder_categories(name))"
          )
          .eq("project_id", selectedProjectId),
      ]);

      const updateRows = updates.data || [];
      const allocationRows = allocations.data || [];
      const ranked = rankStakeholders(allocationRows, updateRows);

      setRankedStakeholders(ranked);
      setStats({
        updateCount: updateRows.length,
        allocatedStakeholders: allocationRows.length,
        dailyQuantity: updateRows.reduce(
          (sum, row) => sum + Number(row.quantity || 0),
          0
        ),
        participants: updateRows.reduce(
          (sum, row) => sum + Number(row.persons_attended || 0),
          0
        ),
      });
    }

    loadProjectStats();
  }, [selectedProjectId]);

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
              : "Progress and quantity overview by project"}
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
            { label: "Daily Updates", value: stats.updateCount },
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

      <div className="overflow-hidden rounded-xl border border-civic-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-civic-100 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-civic-900">
              Stakeholders by quantity
            </h2>
            <p className="mt-0.5 text-sm text-civic-600">
              Ranked by quantity entered in daily activities for this project
            </p>
          </div>
          <Link
            href="/dashboard/masters/stakeholder-allocations"
            className="text-sm font-medium text-civic-700 hover:underline"
          >
            View allocations
          </Link>
        </div>
        {rankedStakeholders.length === 0 ? (
          <p className="px-5 py-8 text-sm text-civic-500">
            No stakeholders are allocated to this project yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-civic-100 bg-civic-50">
                <tr>
                  <th className="px-5 py-3 font-semibold text-civic-800">Rank</th>
                  <th className="px-5 py-3 font-semibold text-civic-800">
                    Stakeholder
                  </th>
                  <th className="px-5 py-3 font-semibold text-civic-800">
                    Contact
                  </th>
                  <th className="px-5 py-3 text-right font-semibold text-civic-800">
                    Quantity
                  </th>
                  <th className="px-5 py-3 text-right font-semibold text-civic-800">
                    Participants
                  </th>
                  <th className="px-5 py-3 text-right font-semibold text-civic-800">
                    Updates
                  </th>
                </tr>
              </thead>
              <tbody>
                {rankedStakeholders.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-civic-50 last:border-0"
                  >
                    <td className="px-5 py-3 font-semibold text-civic-900">
                      {row.rank}
                    </td>
                    <td className="px-5 py-3">
                      <p className="font-medium text-civic-900">{row.name}</p>
                      {row.category ? (
                        <p className="text-xs text-civic-500">{row.category}</p>
                      ) : null}
                    </td>
                    <td className="px-5 py-3 text-civic-700">
                      {row.contactPerson || row.phone ? (
                        <>
                          {row.contactPerson ? <p>{row.contactPerson}</p> : null}
                          {row.phone ? (
                            <p className="text-xs text-civic-500">{row.phone}</p>
                          ) : null}
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-5 py-3 text-right font-medium text-civic-900">
                      {formatQuantity(row.quantity)}
                    </td>
                    <td className="px-5 py-3 text-right text-civic-700">
                      {row.participants.toLocaleString("en-IN")}
                    </td>
                    <td className="px-5 py-3 text-right text-civic-700">
                      {row.updateCount.toLocaleString("en-IN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
