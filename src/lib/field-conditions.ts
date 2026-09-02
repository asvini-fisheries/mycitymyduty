import type { FieldConfig } from "@/lib/types/database";

export interface FieldCondition {
  field: string;
  value: string | string[];
}

function matchesCondition(
  condition: FieldCondition | undefined,
  formData: Record<string, string>
): boolean {
  if (!condition) return true;
  const current = formData[condition.field] ?? "";
  if (Array.isArray(condition.value)) {
    return condition.value.includes(current);
  }
  return current === condition.value;
}

export function isFieldVisible(
  field: FieldConfig,
  formData: Record<string, string>
): boolean {
  return matchesCondition(field.visibleWhen, formData);
}

export function isFieldRequired(
  field: FieldConfig,
  formData: Record<string, string>
): boolean {
  if (field.requiredWhen) {
    return matchesCondition(field.requiredWhen, formData);
  }
  return Boolean(field.required);
}
