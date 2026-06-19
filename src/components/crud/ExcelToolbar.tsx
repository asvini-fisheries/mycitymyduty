"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, Upload } from "lucide-react";
import type { ColumnConfig, FieldConfig } from "@/lib/types/database";
import {
  buildExportColumns,
  downloadExcel,
  downloadImportTemplate,
  parseImportFile,
  type ExportColumn,
  type ImportResult,
  type ParsedImportRow,
  type Row,
} from "@/lib/excel-utils";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

interface ExcelToolbarProps {
  title: string;
  fileName: string;
  columns: ColumnConfig[];
  fields: FieldConfig[];
  rows: Row[];
  totalRowCount?: number;
  isFilterActive?: boolean;
  fieldOptions: Record<string, { value: string; label: string }[]>;
  allowImport?: boolean;
  onImport: (rows: ParsedImportRow[]) => Promise<ImportResult>;
}

export function ExcelToolbar({
  title,
  fileName,
  columns,
  fields,
  rows,
  totalRowCount,
  isFilterActive = false,
  fieldOptions,
  allowImport = true,
  onImport,
}: ExcelToolbarProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importLogOpen, setImportLogOpen] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const exportColumns = useMemo(
    () => buildExportColumns(columns, fields),
    [columns, fields]
  );
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(exportColumns.map((c) => c.key))
  );

  const totalRows = totalRowCount ?? rows.length;
  const selectedCount = selected.size;
  const totalColumns = exportColumns.length;

  useEffect(() => {
    setSelected(new Set(exportColumns.map((c) => c.key)));
  }, [exportColumns]);

  const logEntries = useMemo(() => {
    if (!importResult) return [];
    const parseRows = importResult.parseErrors.map((e) => ({
      excelRowIndex: e.excelRowIndex,
      status: "failed" as const,
      summary: e.summary ?? "—",
      error: e.message,
    }));
    const saveRows = importResult.results.map((r) => ({
      excelRowIndex: r.excelRowIndex,
      status: r.status,
      summary: r.summary,
      error: r.error,
    }));
    return [...parseRows, ...saveRows].sort(
      (a, b) => a.excelRowIndex - b.excelRowIndex
    );
  }, [importResult]);

  function openExportModal() {
    setSelected(new Set(exportColumns.map((c) => c.key)));
    setExportOpen(true);
  }

  function selectAllColumns() {
    setSelected(new Set(exportColumns.map((c) => c.key)));
  }

  function deselectAllColumns() {
    setSelected(new Set());
  }

  function toggleColumn(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function handleExport() {
    const cols = exportColumns.filter((c) => selected.has(c.key));
    if (!cols.length) {
      alert("Select at least one column.");
      return;
    }
    downloadExcel(rows, cols, fileName);
    setExportOpen(false);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const buffer = await file.arrayBuffer();
      const { rows: parsed, errors: parseErrors } = parseImportFile(
        buffer,
        fields,
        fieldOptions
      );

      let saveResult: ImportResult = {
        ok: 0,
        failed: 0,
        parseErrors,
        results: [],
      };

      if (parsed.length) {
        saveResult = await onImport(parsed);
        saveResult = { ...saveResult, parseErrors };
      }

      setImportResult(saveResult);
      setImportLogOpen(true);
    } catch (err) {
      setImportResult({
        ok: 0,
        failed: 0,
        parseErrors: [
          {
            excelRowIndex: 0,
            message: err instanceof Error ? err.message : "Import failed",
          },
        ],
        results: [],
      });
      setImportLogOpen(true);
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const totalFailed =
    (importResult?.failed ?? 0) + (importResult?.parseErrors.length ?? 0);
  const totalSaved = importResult?.ok ?? 0;

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={openExportModal}>
          <Download className="mr-1.5 h-4 w-4" />
          Export Excel
        </Button>
        {allowImport && (
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => downloadImportTemplate(title, fields, fieldOptions)}
            >
              <FileSpreadsheet className="mr-1.5 h-4 w-4" />
              Download Template
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={importing}
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="mr-1.5 h-4 w-4" />
              {importing ? "Importing..." : "Upload Excel"}
            </Button>
            {importResult && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setImportLogOpen(true)}
              >
                <AlertCircle className="mr-1.5 h-4 w-4" />
                Import log
              </Button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleFileChange}
            />
          </>
        )}
      </div>

      <Modal open={exportOpen} title="Export — select columns" onClose={() => setExportOpen(false)}>
        <p className="mb-1 text-sm text-civic-600">
          Choose columns to include in the Excel file.
        </p>
        {isFilterActive ? (
          <p className="mb-4 text-sm text-amber-700">
            Exporting filtered view: <strong>{rows.length}</strong> of{" "}
            <strong>{totalRows}</strong> records match your current search and filters.
          </p>
        ) : (
          <p className="mb-4 text-sm text-civic-600">
            All <strong>{rows.length}</strong> records will be exported.
          </p>
        )}
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={selectAllColumns}>
              Select all
            </Button>
            <Button variant="secondary" size="sm" onClick={deselectAllColumns}>
              Deselect all
            </Button>
          </div>
          <span className="text-xs text-civic-600">
            <strong className="text-civic-800">{selectedCount}</strong> of{" "}
            <strong className="text-civic-800">{totalColumns}</strong> columns selected
          </span>
        </div>
        <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-civic-100 p-3">
          {exportColumns.map((col: ExportColumn) => (
            <label
              key={col.key}
              className="flex cursor-pointer items-center gap-2 text-sm text-civic-800"
            >
              <input
                type="checkbox"
                checked={selected.has(col.key)}
                onChange={() => toggleColumn(col.key)}
                className="rounded border-civic-300"
              />
              {col.label}
            </label>
          ))}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setExportOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
        </div>
      </Modal>

      <Modal
        open={importLogOpen}
        title="Import results"
        onClose={() => setImportLogOpen(false)}
      >
        {importResult && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>
                  <strong>{totalSaved}</strong> saved
                </span>
              </div>
              {totalFailed > 0 && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>
                    <strong>{totalFailed}</strong> failed
                  </span>
                </div>
              )}
            </div>

            {logEntries.length === 0 ? (
              <p className="text-sm text-civic-600">No data rows found in file.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-civic-100">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead className="border-b border-civic-100 bg-civic-50">
                    <tr>
                      <th className="px-3 py-2 font-semibold text-civic-800">Row</th>
                      <th className="px-3 py-2 font-semibold text-civic-800">Status</th>
                      <th className="px-3 py-2 font-semibold text-civic-800">Record</th>
                      <th className="px-3 py-2 font-semibold text-civic-800">Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logEntries.map((entry, idx) => (
                      <tr
                        key={`${entry.excelRowIndex}-${idx}`}
                        className="border-b border-civic-50 last:border-0"
                      >
                        <td className="px-3 py-2 text-civic-700">
                          {entry.excelRowIndex > 0 ? entry.excelRowIndex : "—"}
                        </td>
                        <td className="px-3 py-2">
                          {entry.status === "saved" ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Saved
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-red-700">
                              <AlertCircle className="h-3.5 w-3.5" />
                              Failed
                            </span>
                          )}
                        </td>
                        <td className="max-w-[200px] truncate px-3 py-2 text-civic-700" title={entry.summary}>
                          {entry.summary}
                        </td>
                        <td className="px-3 py-2 text-red-700">
                          {entry.error ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={() => setImportLogOpen(false)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
