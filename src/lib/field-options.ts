import type { FieldConfig } from "@/lib/types/database";

export interface FieldOption {
  value: string;
  label: string;
  filterValue?: string;
  meta?: Record<string, string>;
}

export function getFieldLabel(
  field: FieldConfig,
  formData: Record<string, string>,
  sourceOptions?: FieldOption[]
): string {
  if (field.labelFromOption && sourceOptions?.length) {
    const selected = sourceOptions.find(
      (option) => option.value === (formData[field.labelFromOption!.sourceField] ?? "")
    );
    const hint = selected?.meta?.[field.labelFromOption.metaKey]?.trim();
    if (hint) {
      return field.labelFromOption.template
        ? field.labelFromOption.template.replace(/\{value\}/g, hint)
        : hint;
    }
  }
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
