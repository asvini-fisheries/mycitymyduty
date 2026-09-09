"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { ensureLockedCorporation } from "@/lib/corporations";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";

type CategoryOption = { id: string; name: string };
type StakeholderOption = {
  id: string;
  name: string;
  stakeholder_category_id: string;
};
type ProjectOption = {
  id: string;
  name: string;
  code: string | null;
  record_type: string;
};

const recordTypeOptions = [
  { value: "project", label: "Project" },
  { value: "requirement", label: "Requirement" },
];

interface AllocationBulkModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function AllocationBulkModal({
  open,
  onClose,
  onSaved,
}: AllocationBulkModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [stakeholders, setStakeholders] = useState<StakeholderOption[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [recordType, setRecordType] = useState("project");
  const [categoryId, setCategoryId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [selectedStakeholderIds, setSelectedStakeholderIds] = useState<string[]>(
    []
  );
  const [allocatedStakeholderIds, setAllocatedStakeholderIds] = useState<
    string[]
  >([]);
  const [stakeholderSearch, setStakeholderSearch] = useState("");
  const [notes, setNotes] = useState("");

  const loadOptions = useCallback(async () => {
    if (!isSupabaseConfigured()) return;
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const corpId = await ensureLockedCorporation(supabase);

    let categoryQuery = supabase
      .from("stakeholder_categories")
      .select("id, name")
      .eq("is_active", true)
      .order("name");

    let stakeholderQuery = supabase
      .from("stakeholders")
      .select("id, name, stakeholder_category_id")
      .eq("is_active", true)
      .order("name");

    let projectQuery = supabase
      .from("projects")
      .select("id, name, code, record_type")
      .order("name");

    if (corpId) {
      stakeholderQuery = stakeholderQuery.eq("corporation_id", corpId);
      projectQuery = projectQuery.eq("corporation_id", corpId);
    }

    const [{ data: catData }, { data: shData }, { data: projData }] =
      await Promise.all([categoryQuery, stakeholderQuery, projectQuery]);

    setCategories((catData as CategoryOption[]) ?? []);
    setStakeholders((shData as StakeholderOption[]) ?? []);
    setProjects((projData as ProjectOption[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (open) {
      loadOptions();
      setRecordType("project");
      setCategoryId("");
      setProjectId("");
      setSelectedStakeholderIds([]);
      setAllocatedStakeholderIds([]);
      setStakeholderSearch("");
      setNotes("");
      setError(null);
    }
  }, [open, loadOptions]);

  useEffect(() => {
    if (!open || !projectId || !isSupabaseConfigured()) {
      setAllocatedStakeholderIds([]);
      return;
    }

    let cancelled = false;
    const supabase = createClient();
    supabase
      .from("stakeholder_project_allocations")
      .select("stakeholder_id")
      .eq("project_id", projectId)
      .then(({ data, error: allocError }) => {
        if (cancelled) return;
        if (allocError) {
          setAllocatedStakeholderIds([]);
          return;
        }
        const ids = (data ?? []).map((row) => String(row.stakeholder_id));
        setAllocatedStakeholderIds(ids);
        setSelectedStakeholderIds((prev) =>
          prev.filter((id) => !ids.includes(id))
        );
      });

    return () => {
      cancelled = true;
    };
  }, [open, projectId]);

  const filteredProjects = useMemo(
    () => projects.filter((p) => p.record_type === recordType),
    [projects, recordType]
  );

  const filteredStakeholders = useMemo(() => {
    const allocated = new Set(allocatedStakeholderIds);
    const query = stakeholderSearch.trim().toLowerCase();
    return stakeholders.filter((s) => {
      if (categoryId && s.stakeholder_category_id !== categoryId) return false;
      if (projectId && allocated.has(s.id)) return false;
      if (query && !s.name.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [
    stakeholders,
    categoryId,
    projectId,
    allocatedStakeholderIds,
    stakeholderSearch,
  ]);

  const projectOptions = filteredProjects.map((p) => ({
    value: p.id,
    label: [p.code, p.name].filter(Boolean).join(" — "),
  }));

  const categoryOptions = categories.map((c) => ({
    value: c.id,
    label: c.name,
  }));

  function toggleStakeholder(id: string) {
    setSelectedStakeholderIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function selectAllStakeholders() {
    if (!projectId) return;
    setSelectedStakeholderIds(filteredStakeholders.map((s) => s.id));
  }

  function clearStakeholders() {
    setSelectedStakeholderIds([]);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    if (!projectId) {
      setError("Select a project or requirement.");
      setSaving(false);
      return;
    }

    if (selectedStakeholderIds.length === 0) {
      setError("Select at least one stakeholder.");
      setSaving(false);
      return;
    }

    const supabase = createClient();
    const rows = selectedStakeholderIds.map((stakeholderId) => ({
      stakeholder_id: stakeholderId,
      project_id: projectId,
      notes: notes.trim() || null,
    }));

    const { error: insertError } = await supabase
      .from("stakeholder_project_allocations")
      .upsert(rows, { onConflict: "stakeholder_id,project_id" });

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <Modal open={open} title="Allocate Project / Requirement" onClose={onClose}>
      {loading ? (
        <p className="text-sm text-civic-600">Loading options...</p>
      ) : (
        <form onSubmit={handleSave} className="space-y-4">
          <Select
            label="Type"
            required
            options={recordTypeOptions}
            value={recordType}
            onChange={(e) => {
              setRecordType(e.target.value);
              setProjectId("");
            }}
          />

          <Select
            label="Project / Requirement"
            required
            options={projectOptions}
            value={projectId}
            onChange={(e) => {
              setProjectId(e.target.value);
              setSelectedStakeholderIds([]);
              setStakeholderSearch("");
            }}
          />

          <Select
            label="Stakeholder Category"
            emptyLabel="All categories"
            options={categoryOptions}
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setSelectedStakeholderIds([]);
              setStakeholderSearch("");
            }}
          />

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className="text-sm font-medium text-civic-800">
                Stakeholders <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="text-xs font-medium text-civic-700 hover:underline disabled:cursor-not-allowed disabled:no-underline disabled:opacity-50"
                  onClick={selectAllStakeholders}
                  disabled={!projectId}
                >
                  Select all
                </button>
                <button
                  type="button"
                  className="text-xs font-medium text-civic-600 hover:underline"
                  onClick={clearStakeholders}
                >
                  Clear
                </button>
              </div>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-civic-400" />
              <input
                type="search"
                value={stakeholderSearch}
                onChange={(e) => setStakeholderSearch(e.target.value)}
                placeholder="Search stakeholders..."
                className="w-full rounded-lg border border-civic-200 py-2 pl-8 pr-3 text-sm text-civic-900 placeholder:text-civic-400 focus:border-civic-500 focus:outline-none focus:ring-2 focus:ring-civic-200"
                aria-label="Search stakeholders"
              />
            </div>
            <div className="max-h-52 space-y-1 overflow-y-auto rounded-lg border border-civic-200 p-2">
              {!projectId ? (
                <p className="px-2 py-3 text-sm text-civic-500">
                  Select a project or requirement to see available stakeholders.
                </p>
              ) : filteredStakeholders.length === 0 ? (
                <p className="px-2 py-3 text-sm text-civic-500">
                  {stakeholderSearch.trim()
                    ? "No stakeholders match this search."
                    : "All matching stakeholders are already allocated to this project."}
                </p>
              ) : (
                filteredStakeholders.map((stakeholder) => (
                  <label
                    key={stakeholder.id}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 hover:bg-civic-50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedStakeholderIds.includes(stakeholder.id)}
                      onChange={() => toggleStakeholder(stakeholder.id)}
                      className="rounded border-civic-300"
                    />
                    <span className="text-sm text-civic-900">{stakeholder.name}</span>
                  </label>
                ))
              )}
            </div>
            <p className="text-xs text-civic-500">
              {selectedStakeholderIds.length} stakeholder
              {selectedStakeholderIds.length === 1 ? "" : "s"} selected
            </p>
          </div>

          <Textarea
            label="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes for this allocation"
          />

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Allocations"}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
