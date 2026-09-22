"use client";

import { useEffect, useMemo, useState } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { useAccess } from "@/contexts/AccessContext";
import {
  fetchCertificateParticipations,
  firstRecord,
  nestedName,
  projectLabel,
  type ParticipationRow,
} from "@/lib/certificate-print";
import { ensureLockedCorporation } from "@/lib/corporations";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { fetchAllocatedProjectIds } from "@/lib/stakeholders";

function uniqueOptions(
  rows: ParticipationRow[],
  kind: "project" | "stakeholder"
): { value: string; label: string }[] {
  const seen = new Map<string, string>();
  for (const row of rows) {
    if (kind === "project") {
      const id = String(row.project_id ?? firstRecord(row.projects)?.id ?? "");
      if (!id || seen.has(id)) continue;
      seen.set(id, projectLabel(row.projects));
    } else {
      const id = String(
        row.stakeholder_id ?? firstRecord(row.stakeholders)?.id ?? ""
      );
      if (!id || seen.has(id)) continue;
      seen.set(id, nestedName(row.stakeholders, "Stakeholder"));
    }
  }
  return [...seen.entries()]
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label, "en", { sensitivity: "base" }));
}

export function CertificatePrintBar() {
  const { isStakeholder, profile, stakeholderName } = useAccess();
  const lockedStakeholderId = isStakeholder
    ? profile?.stakeholder_id ?? null
    : null;
  const [rows, setRows] = useState<ParticipationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projectId, setProjectId] = useState("");
  const [stakeholderId, setStakeholderId] = useState("");

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      setError("Certificates could not be loaded.");
      return;
    }

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const supabase = createClient();
        const corporationId = await ensureLockedCorporation(supabase);
        const allocatedProjectIds = lockedStakeholderId
          ? await fetchAllocatedProjectIds(supabase, lockedStakeholderId)
          : null;
        const data = await fetchCertificateParticipations(supabase, {
          corporationId,
          allocatedProjectIds,
          lockedStakeholderId,
        });
        setRows(data);
      } catch (loadError) {
        setRows([]);
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load participants."
        );
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [lockedStakeholderId]);

  useEffect(() => {
    if (lockedStakeholderId) {
      setStakeholderId(lockedStakeholderId);
    }
  }, [lockedStakeholderId]);

  const projectOptions = useMemo(() => uniqueOptions(rows, "project"), [rows]);
  const stakeholderOptions = useMemo(() => {
    const scoped = projectId
      ? rows.filter((row) => row.project_id === projectId)
      : rows;
    return uniqueOptions(scoped, "stakeholder");
  }, [rows, projectId]);

  const matchingCount = useMemo(() => {
    return rows.filter((row) => {
      if (projectId && row.project_id !== projectId) return false;
      if (stakeholderId && row.stakeholder_id !== stakeholderId) return false;
      return true;
    }).length;
  }, [rows, projectId, stakeholderId]);

  function handleProjectChange(value: string) {
    setProjectId(value);
    if (!lockedStakeholderId) {
      setStakeholderId("");
    }
  }

  function handlePrint() {
    if (!projectId || matchingCount === 0) return;
    const params = new URLSearchParams({ project_id: projectId });
    if (stakeholderId) params.set("stakeholder_id", stakeholderId);
    window.open(
      `/print/certificates?${params.toString()}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  return (
    <div className="rounded-xl border border-civic-100 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-civic-900">
            Print certificates
          </p>
          <p className="mt-0.5 text-xs text-civic-600">
            Choose a project, optionally a stakeholder, then print every matching
            participant certificate as one PDF.
          </p>
        </div>
        <div className="grid w-full gap-3 sm:grid-cols-2 lg:w-auto lg:min-w-[34rem]">
          <Select
            label="Project"
            name="certificate_project_id"
            required
            value={projectId}
            onChange={(event) => handleProjectChange(event.target.value)}
            options={projectOptions}
            emptyLabel="Select project"
            disabled={loading || projectOptions.length === 0}
          />
          {lockedStakeholderId ? (
            <Select
              label="Stakeholder"
              name="certificate_stakeholder_id"
              value={lockedStakeholderId}
              options={[
                {
                  value: lockedStakeholderId,
                  label: stakeholderName ?? "Your organisation",
                },
              ]}
              disabled
            />
          ) : (
            <Select
              label="Stakeholder"
              name="certificate_stakeholder_id"
              value={stakeholderId}
              onChange={(event) => setStakeholderId(event.target.value)}
              options={stakeholderOptions}
              emptyLabel="All stakeholders"
              disabled={loading || !projectId}
            />
          )}
        </div>
        <div className="flex shrink-0 flex-col items-stretch gap-1 sm:items-end">
          <Button
            type="button"
            onClick={handlePrint}
            disabled={!projectId || matchingCount === 0 || loading}
          >
            <Printer className="mr-2 h-4 w-4" />
            Print certificates
          </Button>
          <p className="text-xs text-civic-600">
            {loading
              ? "Loading participants..."
              : error
                ? error
                : !projectId
                  ? "Select a project to print."
                  : matchingCount === 0
                    ? "No matching participants."
                    : `${matchingCount} certificate${matchingCount === 1 ? "" : "s"}`}
          </p>
        </div>
      </div>
    </div>
  );
}
