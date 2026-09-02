import type { FieldConfig } from "@/lib/types/database";

export interface FieldOption {
  value: string;
  label: string;
  filterValue?: string;
}

export function getFieldLabel(
  field: FieldConfig,
  formData: Record<string, string>
): string {
  if (field.dynamicLabel) {
    const key = formData[field.dynamicLabel.field] ?? "";
    return field.dynamicLabel.labels[key] ?? field.label;
  }
  return field.label;
}

export function filterOptionsForField(
  field: FieldConfig,
  options: FieldOption[],
  formData: Record<string, string>
): FieldOption[] {
  const filterCfg = field.optionsFrom?.filterByFormField;
  if (!filterCfg) return options;
  const match = formData[filterCfg.formField] ?? "";
  if (!match) return [];
  return options.filter((option) => option.filterValue === match);
}
