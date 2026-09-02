"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Images, Pencil, Plus, Printer, Trash2 } from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { ColumnConfig, FieldConfig } from "@/lib/types/database";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Modal } from "@/components/ui/Modal";
import { AttachmentField } from "@/components/crud/AttachmentField";
import { LogoUploadField } from "@/components/crud/LogoUploadField";
import { AttachmentViewerModal } from "@/components/crud/AttachmentViewerModal";
import { ExcelToolbar } from "@/components/crud/ExcelToolbar";
import { SearchFilterBar } from "@/components/crud/SearchFilterBar";
import {
  applySearchAndFilters,
  deriveFilterableColumns,
  formatCellValue,
  getActiveFilterChips,
  getNestedValue,
} from "@/lib/crud-filters";
import {
  parseAttachments,
  serializeAttachments,
  uploadCorporationLogo,
  type RecordAttachment,
} from "@/lib/attachments";
import {
  summarizeImportRow,
  type ImportResult,
  type ParsedImportRow,
} from "@/lib/excel-utils";
import {
  applyCorporationScopeToOptionsQuery,
  applyCorporationScopeToRowQuery,
  applyCorporationScopeToSelectQuery,
  CORPORATION_ID_FIELD,
  ensureLockedCorporation,
  getLockedCorporationId,
  injectLockedCorporationId,
  scopeOptionsSelectQuery,
} from "@/lib/corporations";
import { isFieldRequired, isFieldVisible } from "@/lib/field-conditions";

interface CrudPageProps {
  title: string;
  description?: string;
  table: string;
  columns: ColumnConfig[];
  fields: FieldConfig[];
  selectQuery?: string;
  orderBy?: { column: string; ascending?: boolean };
  idKey?: string;
  allowCreate?: boolean;
  allowDelete?: boolean;
  allowExcelImport?: boolean;
  excelFileName?: string;
  printVoucher?: "receipt" | "payment";
  defaultLatestCorporation?: boolean;
  skipCorporationScope?: boolean;
}

type Row = Record<string, unknown>;

const DEFAULT_ORDER_BY = { column: "created_at", ascending: false } as const;

export function CrudPage({
  title,
  description,
  table,
  columns,
  fields,
  selectQuery = "*",
  orderBy = DEFAULT_ORDER_BY,
  idKey = "id",
  allowCreate = true,
  allowDelete = true,
  allowExcelImport = true,
  excelFileName,
  printVoucher,
  defaultLatestCorporation = false,
  skipCorporationScope = false,
}: CrudPageProps) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [lockedCorporationId, setLockedCorporationId] = useState<string | null>(
    null
  );
  const [fieldOptions, setFieldOptions] = useState<
    Record<string, { value: string; label: string }[]>
  >({});
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerAttachments, setViewerAttachments] = useState<RecordAttachment[]>(
    []
  );
  const [viewerRecordTitle, setViewerRecordTitle] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState("");
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [pendingLogoFiles, setPendingLogoFiles] = useState<Record<string, File>>({});

  const formFields = useMemo(
    () => fields.filter((field) => field.name !== CORPORATION_ID_FIELD),
    [fields]
  );

  const attachmentFieldName = useMemo(
    () => fields.find((field) => field.type === "attachments")?.name ?? "attachments",
    [fields]
  );

  const hasAttachmentsField = useMemo(
    () => fields.some((field) => field.type === "attachments"),
    [fields]
  );

  const filterableColumns = useMemo(
    () => deriveFilterableColumns(columns, formFields, rows, fieldOptions),
    [columns, formFields, rows, fieldOptions]
  );

  const filteredRows = useMemo(
    () =>
      applySearchAndFilters(
        rows,
        columns,
        searchQuery,
        columnFilters,
        filterableColumns
      ),
    [rows, columns, searchQuery, columnFilters, filterableColumns]
  );

  const isFilterActive = useMemo(
    () =>
      getActiveFilterChips(searchQuery, columnFilters, filterableColumns).length >
      0,
    [searchQuery, columnFilters, filterableColumns]
  );

  const loadOptions = useCallback(async () => {
    if (!isSupabaseConfigured()) return;
    const supabase = createClient();
    const lockedId = skipCorporationScope
      ? null
      : await ensureLockedCorporation(supabase);
    setLockedCorporationId(lockedId);

    const opts: Record<string, { value: string; label: string }[]> = {};

    for (const field of fields) {
      if (field.name === CORPORATION_ID_FIELD) {
        continue;
      }
      if (field.options) {
        opts[field.name] = field.options;
      } else if (field.optionsFrom) {
        const of = field.optionsFrom;
        const scopedSelect = scopeOptionsSelectQuery(of, lockedId);
        let query = supabase.from(of.table).select(scopedSelect);
        query = applyCorporationScopeToOptionsQuery(query, of, lockedId);

        const { data } = await query;
        opts[field.name] = ((data as Row[] | null) || []).map((row) => ({
          value: String(row[of.valueKey]),
          label: of.labelKeys
            ? of.labelKeys
                .map((key) => {
                  const val = getNestedValue(row, key);
                  return val !== null && val !== undefined ? String(val) : "";
                })
                .filter(Boolean)
                .join(of.labelSeparator ?? " — ")
            : String(row[of.labelKey!]),
        }));
      }
    }
    setFieldOptions(opts);
  }, [fields, skipCorporationScope]);

  const orderColumn = orderBy.column;
  const orderAscending = orderBy.ascending ?? false;

  const loadRows = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      setError("Supabase is not configured. Add credentials to .env.local");
      return;
    }

    setLoading(true);
    setError(null);
    const supabase = createClient();
    const lockedId = skipCorporationScope
      ? null
      : await ensureLockedCorporation(supabase);
    setLockedCorporationId(lockedId);

    const scopedSelect = applyCorporationScopeToSelectQuery(
      table,
      selectQuery,
      lockedId
    );

    let query = supabase
      .from(table)
      .select(scopedSelect)
      .order(orderColumn, { ascending: orderAscending });

    query = applyCorporationScopeToRowQuery(query, table, fields, lockedId);

    const { data, error: fetchError } = await query;

    if (fetchError) {
      setError(fetchError.message);
      setRows([]);
    } else {
      setRows((data as unknown as Row[]) || []);
    }
    setLoading(false);
  }, [table, selectQuery, orderColumn, orderAscending, fields, skipCorporationScope]);

  useEffect(() => {
    loadOptions();
    loadRows();
  }, [loadOptions, loadRows]);

  function resolveLockedCorporationId(): string | null {
    return lockedCorporationId ?? getLockedCorporationId();
  }

  function openCreate() {
    setEditing(null);
    const corpId = resolveLockedCorporationId();
    const initial: Record<string, string> = {};
    fields.forEach((f) => {
      if (f.name === CORPORATION_ID_FIELD && corpId) {
        initial[f.name] = corpId;
      } else if (f.type === "attachments") {
        initial[f.name] = "[]";
      } else if (f.defaultValue !== undefined) {
        initial[f.name] = String(f.defaultValue);
      } else if (f.type === "date" && defaultLatestCorporation) {
        initial[f.name] = new Date().toISOString().slice(0, 10);
      } else {
        initial[f.name] = "";
      }
    });
    setFormData(initial);
    setPendingLogoFiles({});
    setModalOpen(true);
  }

  function openEdit(row: Row) {
    setEditing(row);
    const corpId = resolveLockedCorporationId();
    const initial: Record<string, string> = {};
    fields.forEach((f) => {
      if (f.name === CORPORATION_ID_FIELD && corpId) {
        initial[f.name] = corpId;
        return;
      }
      const val = row[f.name];
      if (f.type === "checkbox") {
        initial[f.name] = val ? "true" : "false";
      } else if (f.type === "attachments") {
        initial[f.name] = serializeAttachments(parseAttachments(val));
      } else if (f.arrayField && Array.isArray(val)) {
        initial[f.name] = val.join("\n");
      } else if (val !== null && val !== undefined) {
        initial[f.name] = String(val);
      } else {
        initial[f.name] = "";
      }
    });
    setFormData(initial);
    setPendingLogoFiles({});
    setModalOpen(true);
  }

  async function handleDelete(row: Row) {
    if (!confirm("Delete this record?")) return;
    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from(table)
      .delete()
      .eq(idKey, row[idKey]);

    if (deleteError) {
      alert(deleteError.message);
    } else {
      loadRows();
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    for (const f of formFields) {
      if (!isFieldVisible(f, formData)) continue;
      const required = isFieldRequired(f, formData);
      const raw = formData[f.name];
      if (required && (raw === "" || raw === undefined)) {
        alert(`${f.label} is required.`);
        setSaving(false);
        return;
      }
    }

    const payload: Record<string, unknown> = {};
    formFields.forEach((f) => {
      if (!isFieldVisible(f, formData)) {
        if (["ward_id", "area_id", "street_id"].includes(f.name)) {
          payload[f.name] = null;
        }
        return;
      }
      const raw = formData[f.name];
      const required = isFieldRequired(f, formData);
      if (raw === "" && !required) {
        payload[f.name] = null;
        return;
      }
      if (f.type === "attachments") {
        const items = parseAttachments(raw);
        payload[f.name] = items.length ? items : [];
        return;
      }
      if (f.type === "logo") {
        payload[f.name] = raw || null;
        return;
      }
      if (f.arrayField) {
        payload[f.name] = raw
          ? raw.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
          : null;
        return;
      }
      switch (f.type) {
        case "number":
          payload[f.name] = raw === "" ? null : Number(raw);
          break;
        case "checkbox":
          payload[f.name] = raw === "true";
          break;
        default:
          payload[f.name] = raw || null;
      }
    });

    const scopedPayload = injectLockedCorporationId(
      payload,
      fields,
      resolveLockedCorporationId()
    );

    try {
      const supabase = createClient();
      const logoFields = formFields.filter((field) => field.type === "logo");

      if (editing) {
        const result = await supabase
          .from(table)
          .update(scopedPayload)
          .eq(idKey, editing[idKey]);

        if (result.error) {
          const msg = result.error.message || "Could not save record.";
          if (result.error.code === "23505") {
            alert("This record already exists (duplicate entry). Edit the existing row instead.");
          } else {
            alert(msg);
          }
        } else {
          setModalOpen(false);
          await loadRows();
        }
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from(table)
          .insert(scopedPayload)
          .select(String(idKey))
          .single();

        if (insertError) {
          const msg = insertError.message || "Could not save record.";
          if (insertError.code === "23505") {
            alert("This record already exists (duplicate entry). Edit the existing row instead.");
          } else {
            alert(msg);
          }
        } else {
          const newRecordId = inserted
            ? String((inserted as unknown as Row)[idKey])
            : null;

          if (newRecordId) {
            for (const field of logoFields) {
              const pendingFile = pendingLogoFiles[field.name];
              if (pendingFile) {
                const logoUrl = await uploadCorporationLogo(pendingFile, newRecordId);
                await supabase
                  .from(table)
                  .update({ [field.name]: logoUrl })
                  .eq(idKey, newRecordId);
              }
            }
          }

          setModalOpen(false);
          setPendingLogoFiles({});
          await loadRows();
        }
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Network error. Refresh the page and sign in again.";
      alert(message.includes("fetch") ? "Connection failed. Refresh the page, sign in again, then retry." : message);
    } finally {
      setSaving(false);
    }
  }

  function renderField(field: FieldConfig) {
    const value = formData[field.name] ?? "";
    const required = isFieldRequired(field, formData);

    if (field.type === "attachments") {
      return (
        <AttachmentField
          key={field.name}
          name={field.name}
          label={field.label}
          value={value}
          onChange={(next) =>
            setFormData((prev) => ({ ...prev, [field.name]: next }))
          }
          table={table}
          recordId={editing ? String(editing[idKey]) : undefined}
          multiple={field.multiple ?? true}
          accept={field.accept}
          required={required}
        />
      );
    }

    if (field.type === "logo") {
      return (
        <LogoUploadField
          key={field.name}
          name={field.name}
          label={field.label}
          value={value}
          onChange={(next) =>
            setFormData((prev) => ({ ...prev, [field.name]: next }))
          }
          recordId={editing ? String(editing[idKey]) : undefined}
          onFileSelected={(file) =>
            setPendingLogoFiles((prev) => {
              const next = { ...prev };
              if (file) {
                next[field.name] = file;
              } else {
                delete next[field.name];
              }
              return next;
            })
          }
          accept={field.accept}
        />
      );
    }

    if (field.type === "textarea") {
      return (
        <Textarea
          key={field.name}
          name={field.name}
          label={field.label}
          required={required}
          placeholder={field.placeholder}
          value={value}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, [field.name]: e.target.value }))
          }
        />
      );
    }

    if (field.type === "select") {
      return (
        <Select
          key={field.name}
          name={field.name}
          label={field.label}
          required={required}
          options={fieldOptions[field.name] || field.options || []}
          value={value}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, [field.name]: e.target.value }))
          }
        />
      );
    }

    if (field.type === "checkbox") {
      return (
        <label key={field.name} className="flex items-center gap-2 text-sm text-civic-800">
          <input
            type="checkbox"
            checked={value === "true"}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                [field.name]: e.target.checked ? "true" : "false",
              }))
            }
            className="rounded border-civic-300"
          />
          {field.label}
        </label>
      );
    }

    return (
      <Input
        key={field.name}
        name={field.name}
        label={field.label}
        type={field.type}
        required={required}
        placeholder={field.placeholder}
        step={field.step}
        value={value}
        onChange={(e) =>
          setFormData((prev) => ({ ...prev, [field.name]: e.target.value }))
        }
      />
    );
  }

  async function handleImport(rowsToImport: ParsedImportRow[]): Promise<ImportResult> {
    const supabase = createClient();
    let corpId = resolveLockedCorporationId();
    if (!corpId) {
      corpId = await ensureLockedCorporation(supabase);
      setLockedCorporationId(corpId);
    }

    const results: ImportResult["results"] = [];
    let ok = 0;
    let failed = 0;

    for (const { excelRowIndex, payload: row } of rowsToImport) {
      const payload = injectLockedCorporationId({ ...row }, fields, corpId);
      const summary = summarizeImportRow(payload, formFields, fieldOptions);
      const { error } = await supabase.from(table).insert(payload);

      if (error) {
        failed++;
        results.push({
          excelRowIndex,
          status: "failed",
          payload,
          error: error.message,
          summary,
        });
      } else {
        ok++;
        results.push({
          excelRowIndex,
          status: "saved",
          payload,
          summary,
        });
      }
    }

    if (ok > 0) {
      await loadRows();
    }

    return { ok, failed, parseErrors: [], results };
  }

  function openPrint(row: Row) {
    const id = String(row[idKey]);
    const path =
      printVoucher === "receipt"
        ? `/print/receipt/${id}`
        : `/print/payment/${id}`;
    window.open(path, "_blank", "noopener,noreferrer");
  }

  function getRowAttachments(row: Row): RecordAttachment[] {
    return parseAttachments(row[attachmentFieldName]);
  }

  function openAttachments(row: Row) {
    const attachments = getRowAttachments(row);
    const firstColumn = columns[0];
    const label = firstColumn
      ? formatCellValue(getNestedValue(row, firstColumn.key))
      : undefined;

    setViewerAttachments(attachments);
    setViewerRecordTitle(label && label !== "—" ? label : undefined);
    setViewerOpen(true);
  }

  function handleRemoveFilterChip(chipId: string) {
    if (chipId === "__search__") {
      setSearchQuery("");
      return;
    }
    setColumnFilters((prev) => {
      const next = { ...prev };
      delete next[chipId];
      return next;
    });
  }

  function handleClearAllFilters() {
    setSearchQuery("");
    setColumnFilters({});
  }

  const exportName =
    excelFileName ?? title.replace(/\s+/g, "_").toLowerCase();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-civic-900">{title}</h1>
            {description && (
              <p className="mt-1 text-sm text-civic-600">{description}</p>
            )}
          </div>
          <Button onClick={openCreate} disabled={!allowCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add New
          </Button>
        </div>
        <ExcelToolbar
          title={title}
          fileName={exportName}
          columns={columns}
          fields={formFields}
          rows={filteredRows}
          totalRowCount={rows.length}
          isFilterActive={isFilterActive}
          fieldOptions={fieldOptions}
          allowImport={allowExcelImport}
          onImport={handleImport}
        />
        {!loading && !error && rows.length > 0 && (
          <SearchFilterBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            columnFilters={columnFilters}
            onColumnFilterChange={(key, value) =>
              setColumnFilters((prev) => ({ ...prev, [key]: value }))
            }
            onClearAll={handleClearAllFilters}
            onRemoveChip={handleRemoveFilterChip}
            filterableColumns={filterableColumns}
            filteredCount={filteredRows.length}
            totalCount={rows.length}
          />
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-civic-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-civic-100 bg-civic-50">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className="px-4 py-3 font-semibold text-civic-800"
                  >
                    {col.label}
                  </th>
                ))}
                <th className="w-36 px-4 py-3 font-semibold text-civic-800">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={columns.length + 1}
                    className="px-4 py-8 text-center text-civic-500"
                  >
                    Loading...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + 1}
                    className="px-4 py-8 text-center text-civic-500"
                  >
                    No records yet. Click &quot;Add New&quot; to create one.
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + 1}
                    className="px-4 py-8 text-center text-civic-500"
                  >
                    No records match your search or filters.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  const rowAttachments = hasAttachmentsField
                    ? getRowAttachments(row)
                    : [];

                  return (
                  <tr
                    key={String(row[idKey])}
                    className="border-b border-civic-50 hover:bg-civic-50/50"
                  >
                    {columns.map((col) => (
                      <td key={col.key} className="px-4 py-3 text-civic-700">
                        {col.render
                          ? col.render(row)
                          : formatCellValue(getNestedValue(row, col.key))}
                      </td>
                    ))}
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {printVoucher && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openPrint(row)}
                            aria-label="Print"
                            title="Print / PDF"
                          >
                            <Printer className="h-4 w-4 text-civic-700" />
                          </Button>
                        )}
                        {hasAttachmentsField && rowAttachments.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openAttachments(row)}
                            aria-label={`View ${rowAttachments.length} attachment${rowAttachments.length === 1 ? "" : "s"}`}
                            title="View attachments"
                            className="relative"
                          >
                            <Images className="h-4 w-4 text-civic-700" />
                            {rowAttachments.length > 1 && (
                              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-civic-700 px-1 text-[10px] font-semibold leading-none text-white">
                                {rowAttachments.length}
                              </span>
                            )}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(row)}
                          aria-label="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(row)}
                          aria-label="Delete"
                          disabled={!allowDelete}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AttachmentViewerModal
        open={viewerOpen}
        onClose={() => setViewerOpen(false)}
        attachments={viewerAttachments}
        recordTitle={viewerRecordTitle}
      />

      <Modal
        open={modalOpen}
        title={editing ? `Edit ${title}` : `Add ${title}`}
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {formFields
              .filter((field) => isFieldVisible(field, formData))
              .map((field) => (
              <div
                key={field.name}
                className={
                  field.type === "attachments" || field.fullWidth
                    ? "sm:col-span-2"
                    : undefined
                }
              >
                {renderField(field)}
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : editing ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
