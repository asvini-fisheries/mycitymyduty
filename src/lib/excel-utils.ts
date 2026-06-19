import * as XLSX from "xlsx";
import type { ColumnConfig, FieldConfig } from "@/lib/types/database";

export type Row = Record<string, unknown>;

export interface ExportColumn {
  key: string;
  label: string;
}

export interface ParsedImportRow {
  excelRowIndex: number;
  payload: Record<string, unknown>;
}

export interface ImportParseError {
  excelRowIndex: number;
  message: string;
  summary?: string;
}

export interface ImportRowResult {
  excelRowIndex: number;
  status: "saved" | "failed";
  payload: Record<string, unknown>;
  error?: string;
  summary: string;
}

export interface ImportResult {
  ok: number;
  failed: number;
  parseErrors: ImportParseError[];
  results: ImportRowResult[];
}

export function getNestedValue(row: Row, key: string): unknown {
  if (!key.includes(".")) return row[key];
  return key.split(".").reduce<unknown>((acc, part) => {
    if (acc && typeof acc === "object") return (acc as Row)[part];
    return undefined;
  }, row);
}

export function formatExportValue(value: unknown): string | number | boolean {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return value;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }
  return String(value);
}

function fieldHasJoinedColumn(
  field: FieldConfig,
  columnKeys: Set<string>
): boolean {
  if (!field.optionsFrom) return false;
  const { table, labelKey, labelKeys } = field.optionsFrom;
  const keys = labelKeys ?? (labelKey ? [labelKey] : []);
  return keys.some((lk) => columnKeys.has(`${table}.${lk}`) || columnKeys.has(lk));
}

export function buildExportColumns(
  columns: ColumnConfig[],
  fields: FieldConfig[]
): ExportColumn[] {
  const result: ExportColumn[] = [];
  const seenKeys = new Set<string>();

  for (const col of columns) {
    if (seenKeys.has(col.key)) continue;
    result.push({ key: col.key, label: col.label });
    seenKeys.add(col.key);
  }

  for (const field of fields) {
    if (field.type === "attachments") continue;
    if (seenKeys.has(field.name)) continue;

    const hasJoinedDisplay = fieldHasJoinedColumn(field, seenKeys);
    const label =
      hasJoinedDisplay && field.optionsFrom
        ? `${field.label} (ID)`
        : field.label;

    result.push({ key: field.name, label });
    seenKeys.add(field.name);
  }

  return result;
}

export function downloadExcel(
  rows: Row[],
  selectedColumns: ExportColumn[],
  fileName: string
) {
  const header = selectedColumns.map((c) => c.label);
  const data = rows.map((row) =>
    selectedColumns.map((col) => formatExportValue(getNestedValue(row, col.key)))
  );
  const ws = XLSX.utils.aoa_to_sheet([header, ...data]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data");
  XLSX.writeFile(wb, `${fileName}.xlsx`);
}

export function downloadImportTemplate(
  title: string,
  fields: FieldConfig[],
  fieldOptions: Record<string, { value: string; label: string }[]>
) {
  const usableFields = fields.filter(
    (f) => f.type !== "attachments" && (f.type !== "checkbox" || f.name)
  );

  const headers = usableFields.map((f) => f.label);
  const hints = usableFields.map((f) => {
    if (f.type === "select") {
      const opts = f.options || fieldOptions[f.name] || [];
      return opts.length
        ? `Use: ${opts.map((o) => o.label).join(" | ")}`
        : "See Lookups sheet";
    }
    if (f.type === "date") return "YYYY-MM-DD";
    if (f.type === "number") return "Number";
    if (f.type === "checkbox") return "Yes or No";
    return "Text";
  });

  const example = usableFields.map((f) => {
    if (f.type === "select") {
      const opts = f.options || fieldOptions[f.name] || [];
      return opts[0]?.label ?? "";
    }
    if (f.type === "date") return "2024-06-01";
    if (f.type === "number") return "0";
    if (f.type === "checkbox") return "Yes";
    return "";
  });

  const dataWs = XLSX.utils.aoa_to_sheet([
    ["MyCityMyDuty import template — " + title],
    ["Fill rows below. Required fields marked with * in header row 3."],
    headers.map((h, i) =>
      usableFields[i].required ? `${h} *` : h
    ),
    hints,
    example,
    [],
  ]);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, dataWs, "Import");

  const lookupRows: string[][] = [["Field", "Value", "Label"]];
  usableFields.forEach((f) => {
    if (f.type !== "select") return;
    const opts = f.options || fieldOptions[f.name] || [];
    opts.forEach((o) => lookupRows.push([f.label, o.value, o.label]));
  });
  if (lookupRows.length > 1) {
    const lookupWs = XLSX.utils.aoa_to_sheet(lookupRows);
    XLSX.utils.book_append_sheet(wb, lookupWs, "Lookups");
  }

  const instructions = XLSX.utils.aoa_to_sheet([
    ["Import instructions"],
    ["1. Use the Import sheet — data starts at row 6 (below the example row)."],
    ["2. For dropdown fields, enter the Label exactly as shown in the Lookups sheet."],
    ["3. Dates must be YYYY-MM-DD."],
    ["4. Delete the example row before uploading."],
    ["5. Do not change column headers in row 3."],
    ["6. Image attachments must be added via the UI after import."],
  ]);
  XLSX.utils.book_append_sheet(wb, instructions, "Instructions");

  XLSX.writeFile(
    wb,
    `${title.replace(/\s+/g, "_").toLowerCase()}_import_template.xlsx`
  );
}

function resolveSelectValue(
  raw: string,
  field: FieldConfig,
  fieldOptions: Record<string, { value: string; label: string }[]>
): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const opts = field.options || fieldOptions[field.name] || [];
  const lower = trimmed.toLowerCase();
  const byLabel = opts.find((o) => o.label.toLowerCase() === lower);
  if (byLabel) return byLabel.value;
  const byValue = opts.find((o) => o.value === trimmed);
  if (byValue) return byValue.value;
  const byLabelPrefix = opts.find((o) =>
    o.label.toLowerCase().startsWith(lower)
  );
  if (byLabelPrefix) return byLabelPrefix.value;
  return null;
}

function buildRawRowSummary(
  row: (string | number | boolean)[],
  colMap: { field: FieldConfig; colIdx: number }[]
): string {
  const parts: string[] = [];
  for (const { field, colIdx } of colMap) {
    const raw = String(row[colIdx] ?? "").trim();
    if (!raw) continue;
    parts.push(`${field.label}: ${raw}`);
    if (parts.length >= 3) break;
  }
  return parts.join(" · ") || "—";
}

export function summarizeImportRow(
  payload: Record<string, unknown>,
  fields: FieldConfig[],
  fieldOptions: Record<string, { value: string; label: string }[]>
): string {
  const parts: string[] = [];
  for (const field of fields) {
    if (field.type === "checkbox" || field.type === "attachments") {
      continue;
    }
    const val = payload[field.name];
    if (val === null || val === undefined || val === "") continue;
    if (field.type === "select") {
      const opts = field.options || fieldOptions[field.name] || [];
      const label =
        opts.find((o) => o.value === String(val))?.label ?? String(val);
      parts.push(`${field.label}: ${label}`);
    } else {
      parts.push(`${field.label}: ${String(val)}`);
    }
    if (parts.length >= 3) break;
  }
  return parts.join(" · ") || "—";
}

export function parseImportFile(
  buffer: ArrayBuffer,
  fields: FieldConfig[],
  fieldOptions: Record<string, { value: string; label: string }[]>
): { rows: ParsedImportRow[]; errors: ImportParseError[] } {
  const wb = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheet = wb.Sheets["Import"] || wb.Sheets[wb.SheetNames[0]];
  if (!sheet) {
    return { rows: [], errors: [{ excelRowIndex: 0, message: "No worksheet found" }] };
  }

  const matrix = XLSX.utils.sheet_to_json<(string | number | boolean)[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
  });

  let headerRowIdx = matrix.findIndex(
    (row) =>
      Array.isArray(row) &&
      row.some(
        (cell) =>
          typeof cell === "string" &&
          fields.some((f) => cell.replace(/\s*\*$/, "").trim() === f.label)
      )
  );
  if (headerRowIdx < 0) headerRowIdx = 2;

  const headerRow = matrix[headerRowIdx] as string[];
  const labelToField = new Map<string, FieldConfig>();
  fields.forEach((f) => {
    labelToField.set(f.label.toLowerCase(), f);
    labelToField.set(`${f.label} *`.toLowerCase(), f);
  });

  const colMap: { field: FieldConfig; colIdx: number }[] = [];
  headerRow.forEach((cell, colIdx) => {
    const label = String(cell).replace(/\s*\*$/, "").trim().toLowerCase();
    const field = labelToField.get(label);
    if (field) colMap.push({ field, colIdx });
  });

  if (!colMap.length) {
    return {
      rows: [],
      errors: [
        {
          excelRowIndex: headerRowIdx + 1,
          message: "No matching columns found. Use the provided template.",
        },
      ],
    };
  }

  const rows: ParsedImportRow[] = [];
  const errors: ImportParseError[] = [];

  for (let r = headerRowIdx + 1; r < matrix.length; r++) {
    const row = matrix[r];
    if (!Array.isArray(row)) continue;
    const hasData = row.some((c) => String(c).trim() !== "");
    if (!hasData) continue;

    const firstCell = String(row[0] ?? "");
    if (
      firstCell.toLowerCase().includes("use:") ||
      firstCell.toLowerCase().includes("yyyy-mm-dd") ||
      firstCell.toLowerCase().includes("see lookups")
    ) {
      continue;
    }

    const payload: Record<string, unknown> = {};
    let rowError = false;

    for (const { field, colIdx } of colMap) {
      let raw = String(row[colIdx] ?? "").trim();
      if (raw === "" && !field.required) {
        if (field.type === "checkbox") {
          payload[field.name] = field.defaultValue ?? false;
        } else {
          payload[field.name] = null;
        }
        continue;
      }
      if (raw === "" && field.required) {
        errors.push({
          excelRowIndex: r + 1,
          message: `${field.label} is required`,
          summary: buildRawRowSummary(row, colMap),
        });
        rowError = true;
        break;
      }

      switch (field.type) {
        case "number":
          payload[field.name] = Number(raw.replace(/,/g, ""));
          if (Number.isNaN(payload[field.name])) {
            errors.push({
              excelRowIndex: r + 1,
              message: `${field.label} must be a number`,
              summary: buildRawRowSummary(row, colMap),
            });
            rowError = true;
          }
          break;
        case "checkbox":
          payload[field.name] = ["yes", "true", "1", "y"].includes(
            raw.toLowerCase()
          );
          break;
        case "select": {
          const val = resolveSelectValue(raw, field, fieldOptions);
          if (!val) {
            errors.push({
              excelRowIndex: r + 1,
              message: `Invalid ${field.label} "${raw}" — use a label from the Lookups sheet`,
              summary: buildRawRowSummary(row, colMap),
            });
            rowError = true;
          } else {
            payload[field.name] = val;
          }
          break;
        }
        case "date":
          if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
            payload[field.name] = raw.slice(0, 10);
          } else {
            const d = new Date(raw);
            payload[field.name] = Number.isNaN(d.getTime())
              ? raw
              : d.toISOString().slice(0, 10);
          }
          break;
        case "textarea":
          if (field.arrayField) {
            payload[field.name] = raw
              ? raw.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
              : null;
          } else {
            payload[field.name] = raw;
          }
          break;
        case "attachments":
          payload[field.name] = [];
          break;
        default:
          payload[field.name] = raw;
      }
    }

    if (!rowError) rows.push({ excelRowIndex: r + 1, payload });
  }

  return { rows, errors };
}

