import type { ColumnConfig, FieldConfig } from "@/lib/types/database";

export type Row = Record<string, unknown>;
export type FilterType = "select" | "boolean" | "text";

export interface FilterableColumn {
  key: string;
  label: string;
  type: FilterType;
  options: { value: string; label: string }[];
}

export function getNestedValue(row: Row, key: string): unknown {
  if (!key.includes(".")) {
    return row[key];
  }
  return key.split(".").reduce<unknown>((acc, part) => {
    if (acc && typeof acc === "object") {
      return (acc as Row)[part];
    }
    return undefined;
  }, row);
}

export function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
      return value.slice(0, 10);
    }
    return value;
  }
  return String(value);
}

function columnMatchesSelectField(
  columnKey: string,
  optionsFrom: NonNullable<FieldConfig["optionsFrom"]>
): boolean {
  const labelKeys =
    optionsFrom.labelKeys ??
    (optionsFrom.labelKey ? [optionsFrom.labelKey] : []);

  for (const lk of labelKeys) {
    if (lk.includes(".")) {
      if (columnKey === lk || columnKey.endsWith(`.${lk}`)) {
        return true;
      }
      continue;
    }

    if (columnKey === `${optionsFrom.table}.${lk}`) {
      return true;
    }
  }

  return false;
}

function mapColumnToField(
  column: ColumnConfig,
  fields: FieldConfig[]
): FieldConfig | undefined {
  const direct = fields.find((f) => f.name === column.key);
  if (direct) return direct;

  for (const field of fields) {
    if (field.type !== "select" || !field.optionsFrom) continue;
    if (columnMatchesSelectField(column.key, field.optionsFrom)) {
      return field;
    }
  }

  return undefined;
}

function resolveFilterType(field: FieldConfig | undefined): FilterType | null {
  if (!field) return "text";
  if (field.type === "checkbox") return "boolean";
  if (field.type === "select") return "select";
  if (
    field.type === "text" ||
    field.type === "email" ||
    field.type === "tel" ||
    field.type === "number" ||
    field.type === "date"
  ) {
    return "text";
  }
  return null;
}

function buildSelectOptions(
  column: ColumnConfig,
  field: FieldConfig | undefined,
  rows: Row[],
  fieldOptions: Record<string, { value: string; label: string }[]>
): { value: string; label: string }[] {
  if (field?.type === "select") {
    if (field.options?.length) {
      return field.options.map((o) => ({ value: o.value, label: o.label }));
    }
    if (field.optionsFrom && fieldOptions[field.name]?.length) {
      return fieldOptions[field.name].map((o) => ({
        value: o.label,
        label: o.label,
      }));
    }
  }

  const seen = new Set<string>();
  const options: { value: string; label: string }[] = [];

  for (const row of rows) {
    const display = formatCellValue(getNestedValue(row, column.key));
    if (display === "—" || seen.has(display)) continue;
    seen.add(display);
    options.push({ value: display, label: display });
  }

  options.sort((a, b) => a.label.localeCompare(b.label));
  return options;
}

export function deriveFilterableColumns(
  columns: ColumnConfig[],
  fields: FieldConfig[],
  rows: Row[],
  fieldOptions: Record<string, { value: string; label: string }[]>
): FilterableColumn[] {
  const result: FilterableColumn[] = [];

  for (const column of columns) {
    if (column.render) continue;

    const field = mapColumnToField(column, fields);
    const filterType = resolveFilterType(field);

    if (!filterType) continue;

    if (filterType === "boolean") {
      const isActiveCol = column.key === "is_active";
      result.push({
        key: column.key,
        label: column.label,
        type: "boolean",
        options: isActiveCol
          ? [
              { value: "all", label: "All" },
              { value: "true", label: "Active" },
              { value: "false", label: "Inactive" },
            ]
          : [
              { value: "all", label: "All" },
              { value: "true", label: "Yes" },
              { value: "false", label: "No" },
            ],
      });
      continue;
    }

    if (filterType === "select") {
      const options = buildSelectOptions(column, field, rows, fieldOptions);
      if (options.length === 0) continue;
      result.push({
        key: column.key,
        label: column.label,
        type: "select",
        options,
      });
      continue;
    }

    result.push({
      key: column.key,
      label: column.label,
      type: "text",
      options: [],
    });
  }

  return result;
}

export function applySearchAndFilters(
  rows: Row[],
  columns: ColumnConfig[],
  searchQuery: string,
  columnFilters: Record<string, string>,
  filterableColumns: FilterableColumn[]
): Row[] {
  let result = rows;

  const trimmedSearch = searchQuery.trim();
  if (trimmedSearch) {
    const q = trimmedSearch.toLowerCase();
    result = result.filter((row) =>
      columns.some((col) => {
        const val = getNestedValue(row, col.key);
        return formatCellValue(val).toLowerCase().includes(q);
      })
    );
  }

  for (const fc of filterableColumns) {
    const filterVal = columnFilters[fc.key];
    if (!filterVal || filterVal === "" || filterVal === "all") continue;

    if (fc.type === "boolean") {
      const wantActive = filterVal === "true";
      result = result.filter((row) => {
        const val = getNestedValue(row, fc.key);
        return Boolean(val) === wantActive;
      });
    } else if (fc.type === "select") {
      result = result.filter((row) => {
        const display = formatCellValue(getNestedValue(row, fc.key));
        return display === filterVal;
      });
    } else if (fc.type === "text") {
      const q = filterVal.toLowerCase();
      result = result.filter((row) => {
        const display = formatCellValue(getNestedValue(row, fc.key));
        return display.toLowerCase().includes(q);
      });
    }
  }

  return result;
}

export function getActiveFilterChips(
  searchQuery: string,
  columnFilters: Record<string, string>,
  filterableColumns: FilterableColumn[]
): { id: string; label: string }[] {
  const chips: { id: string; label: string }[] = [];

  if (searchQuery.trim()) {
    chips.push({ id: "__search__", label: `Search: "${searchQuery.trim()}"` });
  }

  for (const fc of filterableColumns) {
    const val = columnFilters[fc.key];
    if (!val || val === "" || val === "all") continue;

    let displayVal = val;
    if (fc.type === "boolean") {
      const isActiveCol = fc.key === "is_active";
      if (val === "true") {
        displayVal = isActiveCol ? "Active" : "Yes";
      } else {
        displayVal = isActiveCol ? "Inactive" : "No";
      }
    } else {
      const opt = fc.options.find((o) => o.value === val);
      if (opt) displayVal = opt.label;
    }

    chips.push({ id: fc.key, label: `${fc.label}: ${displayVal}` });
  }

  return chips;
}
