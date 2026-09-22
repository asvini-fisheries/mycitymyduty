"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { APP_MODULE_OPTIONS } from "@/lib/modules";

type CategoryOption = { id: string; name: string };

interface AccessRightsBulkModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function AccessRightsBulkModal({
  open,
  onClose,
  onSaved,
}: AccessRightsBulkModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [existingKeys, setExistingKeys] = useState<string[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [screenSearch, setScreenSearch] = useState("");
  const [canView, setCanView] = useState(true);
  const [canCreate, setCanCreate] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [canDelete, setCanDelete] = useState(false);

  const loadCategories = useCallback(async () => {
    if (!isSupabaseConfigured()) return;
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data, error: fetchError } = await supabase
      .from("stakeholder_categories")
      .select("id, name")
      .eq("is_active", true)
      .order("name");
    if (fetchError) {
      setError(fetchError.message);
      setCategories([]);
    } else {
      setCategories((data as CategoryOption[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    loadCategories();
    setCategoryId("");
    setExistingKeys([]);
    setSelectedKeys([]);
    setScreenSearch("");
    setCanView(true);
    setCanCreate(false);
    setCanEdit(false);
    setCanDelete(false);
    setError(null);
  }, [open, loadCategories]);

  useEffect(() => {
    if (!open || !categoryId || !isSupabaseConfigured()) {
      setExistingKeys([]);
      return;
    }

    let cancelled = false;
    const supabase = createClient();
    supabase
      .from("stakeholder_category_access_rights")
      .select("module_key")
      .eq("stakeholder_category_id", categoryId)
      .then(({ data, error: rightsError }) => {
        if (cancelled) return;
        if (rightsError) {
          setExistingKeys([]);
          return;
        }
        const keys = (data ?? []).map((row) => String(row.module_key));
        setExistingKeys(keys);
        setSelectedKeys((prev) => prev.filter((key) => !keys.includes(key)));
      });

    return () => {
      cancelled = true;
    };
  }, [open, categoryId]);

  const availableScreens = useMemo(() => {
    const taken = new Set(existingKeys);
    const query = screenSearch.trim().toLowerCase();
    return APP_MODULE_OPTIONS.filter((option) => {
      if (taken.has(option.value)) return false;
      if (!query) return true;
      return (
        option.label.toLowerCase().includes(query) ||
        option.value.toLowerCase().includes(query)
      );
    });
  }, [existingKeys, screenSearch]);

  const categoryOptions = categories.map((category) => ({
    value: category.id,
    label: category.name,
  }));

  function toggleScreen(key: string) {
    setSelectedKeys((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]
    );
  }

  function selectAllScreens() {
    if (!categoryId) return;
    setSelectedKeys(availableScreens.map((option) => option.value));
  }

  function clearScreens() {
    setSelectedKeys([]);
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    if (!categoryId) {
      setError("Select a stakeholder category.");
      setSaving(false);
      return;
    }

    if (selectedKeys.length === 0) {
      setError("Select at least one screen.");
      setSaving(false);
      return;
    }

    const rows = selectedKeys.map((moduleKey) => {
      const option = APP_MODULE_OPTIONS.find((item) => item.value === moduleKey);
      return {
        stakeholder_category_id: categoryId,
        module_key: moduleKey,
        module_label: option?.label ?? moduleKey,
        can_view: canView,
        can_create: canCreate,
        can_edit: canEdit,
        can_delete: canDelete,
      };
    });

    const supabase = createClient();
    const { error: insertError } = await supabase
      .from("stakeholder_category_access_rights")
      .insert(rows);

    if (insertError) {
      setError(
        insertError.code === "23505"
          ? "One or more of those screens already has access rights for this category."
          : insertError.message
      );
      setSaving(false);
      return;
    }

    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <Modal open={open} title="Add access rights" onClose={onClose}>
      <form onSubmit={handleSave} className="space-y-4">
        {error && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {error}
          </p>
        )}

        <Select
          label="Stakeholder Category"
          required
          options={categoryOptions}
          value={categoryId}
          emptyLabel={loading ? "Loading..." : "Select category"}
          disabled={loading}
          onChange={(event) => {
            setCategoryId(event.target.value);
            setSelectedKeys([]);
            setScreenSearch("");
          }}
        />

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <label className="text-sm font-medium text-civic-800">
              Screens <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                className="text-xs font-medium text-civic-700 hover:underline disabled:cursor-not-allowed disabled:no-underline disabled:opacity-50"
                onClick={selectAllScreens}
                disabled={!categoryId || availableScreens.length === 0}
              >
                Select all
              </button>
              <button
                type="button"
                className="text-xs font-medium text-civic-600 hover:underline"
                onClick={clearScreens}
              >
                Clear
              </button>
            </div>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-civic-400" />
            <input
              type="search"
              value={screenSearch}
              onChange={(event) => setScreenSearch(event.target.value)}
              placeholder="Search screens..."
              className="w-full rounded-lg border border-civic-200 py-2 pl-8 pr-3 text-sm text-civic-900 placeholder:text-civic-400 focus:border-civic-500 focus:outline-none focus:ring-2 focus:ring-civic-200"
              aria-label="Search screens"
              disabled={!categoryId}
            />
          </div>
          <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-civic-200 p-2">
            {!categoryId ? (
              <p className="px-2 py-3 text-sm text-civic-500">
                Select a category to choose screens.
              </p>
            ) : availableScreens.length === 0 ? (
              <p className="px-2 py-3 text-sm text-civic-500">
                {screenSearch.trim()
                  ? "No screens match this search."
                  : "All screens already have access rights for this category."}
              </p>
            ) : (
              availableScreens.map((option) => (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 hover:bg-civic-50"
                >
                  <input
                    type="checkbox"
                    checked={selectedKeys.includes(option.value)}
                    onChange={() => toggleScreen(option.value)}
                    className="rounded border-civic-300"
                  />
                  <span className="text-sm text-civic-900">{option.label}</span>
                </label>
              ))
            )}
          </div>
          {categoryId && (
            <p className="text-xs text-civic-600">
              {selectedKeys.length} selected
              {existingKeys.length > 0
                ? ` · ${existingKeys.length} already added`
                : ""}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <PermissionToggle
            label="Can View"
            checked={canView}
            onChange={setCanView}
          />
          <PermissionToggle
            label="Can Create"
            checked={canCreate}
            onChange={setCanCreate}
          />
          <PermissionToggle
            label="Can Edit"
            checked={canEdit}
            onChange={setCanEdit}
          />
          <PermissionToggle
            label="Can Delete"
            checked={canDelete}
            onChange={setCanDelete}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving || loading}>
            {saving
              ? "Saving..."
              : selectedKeys.length > 1
                ? `Add ${selectedKeys.length} screens`
                : "Add access rights"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function PermissionToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-civic-800">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="rounded border-civic-300"
      />
      {label}
    </label>
  );
}
