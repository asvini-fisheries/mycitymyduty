import type { ReactNode } from "react";

export type UserRole =
  | "super_admin"
  | "admin"
  | "official"
  | "stakeholder"
  | "viewer";
export type ProjectStatus = "planned" | "active" | "on_hold" | "completed" | "cancelled";
export type ProjectRecordType = "project" | "requirement";
export type BillStatus = "draft" | "submitted" | "approved" | "paid" | "rejected";
export type PaymentMode = "cash" | "bank_transfer" | "upi" | "cheque";
export type ApprovalStatus = "draft" | "submitted" | "approved" | "rejected";

export type FieldType =
  | "text"
  | "email"
  | "tel"
  | "number"
  | "date"
  | "textarea"
  | "select"
  | "checkbox"
  | "attachments"
  | "logo";

export interface RecordAttachment {
  url: string;
  description: string;
  file_name: string;
  uploaded_at: string;
}

export interface FieldConfig {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  optionsFrom?: {
    table: string;
    valueKey: string;
    labelKey?: string;
    labelKeys?: string[];
    labelSeparator?: string;
    selectQuery?: string;
    /** Filter dropdown options by a form field value (e.g. project record type). */
    filterByFormField?: { formField: string; rowKey: string };
  };
  defaultValue?: string | number | boolean;
  step?: string;
  /** When true, field is shown in the form but not saved to the database. */
  formOnly?: boolean;
  /** On edit, populate from a nested row path (e.g. projects.record_type). */
  editValueFrom?: string;
  /** Change label based on another form field's value. */
  dynamicLabel?: { field: string; labels: Record<string, string> };
  /** Clear these form fields when this field changes. */
  clearsOnChange?: string[];
  /** When true, textarea value is split into a TEXT[] on save (one entry per line). */
  arrayField?: boolean;
  /** For attachments fields: allow multiple images. */
  multiple?: boolean;
  /** For attachments fields: file input accept attribute. */
  accept?: string;
  /** Span full width in the form grid. */
  fullWidth?: boolean;
  /** Show this field only when another field matches a value. */
  visibleWhen?: { field: string; value: string | string[] };
  /** Require this field only when another field matches a value. */
  requiredWhen?: { field: string; value: string | string[] };
}

export interface ColumnConfig {
  key: string;
  label: string;
  render?: (row: Record<string, unknown>) => ReactNode;
}

export interface GeoCoordinates {
  latitude: number | null;
  longitude: number | null;
}

export interface ApprovalWorkflow {
  approval_status?: ApprovalStatus | null;
  submitted_at?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  rejection_reason?: string | null;
}

export interface Corporation extends GeoCoordinates {
  id: string;
  code: string | null;
  name: string;
  address: string | null;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  gstin: string | null;
  pan: string | null;
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ZoneWard {
  id: string;
  ward_number: string;
  name: string;
}

export interface WardArea {
  id: string;
  name: string;
}

export interface AreaStreet {
  id: string;
  name: string;
}

export interface Stakeholder {
  id: string;
  stakeholder_category_id: string;
  corporation_id: string | null;
  registration_no: string | null;
  gstin: string | null;
  pan: string | null;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  service_category_id: string | null;
  attachments: RecordAttachment[] | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Project extends GeoCoordinates, ApprovalWorkflow {
  id: string;
  corporation_id: string;
  record_type: ProjectRecordType;
  ward_id: string | null;
  area_id: string | null;
  street_id: string | null;
  code: string | null;
  name: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  budget: number;
  status: ProjectStatus;
  attachments: RecordAttachment[] | null;
  created_at: string;
  updated_at: string;
  corporations?: Corporation;
  zone_wards?: ZoneWard | null;
  ward_areas?: WardArea | null;
  area_streets?: AreaStreet | null;
}

export interface DailyActivityUpdate extends GeoCoordinates, ApprovalWorkflow {
  id: string;
  project_activity_id: string;
  stakeholder_id: string;
  update_date: string;
  work_description: string;
  progress_pct: number;
  remarks: string | null;
  attachments: RecordAttachment[] | null;
  created_at: string;
  updated_at: string;
}

export interface StakeholderBill {
  id: string;
  stakeholder_id: string;
  project_id: string | null;
  project_activity_id: string | null;
  service_provider_name: string;
  bill_number: string | null;
  bill_date: string;
  amount: number;
  description: string | null;
  status: BillStatus;
  attachments: RecordAttachment[] | null;
  submitted_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}
