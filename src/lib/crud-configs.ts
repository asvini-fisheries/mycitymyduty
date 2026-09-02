import type { ColumnConfig, FieldConfig } from "@/lib/types/database";

const corporationOptionsFrom = {
  table: "corporations",
  valueKey: "id",
  labelKey: "name",
};

const zoneOptionsFrom = {
  table: "zones",
  valueKey: "id",
  labelKeys: ["name", "corporations.name"],
  labelSeparator: " — ",
  selectQuery: "id, name, corporations(name)",
};

const wardOptionsFrom = {
  table: "zone_wards",
  valueKey: "id",
  labelKeys: ["ward_number", "name"],
  labelSeparator: " — ",
  selectQuery: "id, ward_number, name",
};

const areaOptionsFrom = {
  table: "ward_areas",
  valueKey: "id",
  labelKey: "name",
};

const streetOptionsFrom = {
  table: "area_streets",
  valueKey: "id",
  labelKey: "name",
};

const stakeholderCategoryOptionsFrom = {
  table: "stakeholder_categories",
  valueKey: "id",
  labelKey: "name",
};

const stakeholderOptionsFrom = {
  table: "stakeholders",
  valueKey: "id",
  labelKey: "name",
};

const serviceCategoryOptionsFrom = {
  table: "service_categories",
  valueKey: "id",
  labelKey: "name",
};

const projectOptionsFrom = {
  table: "projects",
  valueKey: "id",
  labelKeys: ["code", "name"],
  labelSeparator: " — ",
  selectQuery: "id, code, name",
};

const activityOptionsFrom = {
  table: "activities",
  valueKey: "id",
  labelKey: "name",
};

const projectActivityOptionsFrom = {
  table: "project_activities",
  valueKey: "id",
  labelKeys: ["projects.name", "activities.name"],
  labelSeparator: " — ",
  selectQuery: "id, projects(name), activities(name)",
};

const dailyUpdateOptionsFrom = {
  table: "daily_activity_updates",
  valueKey: "id",
  labelKeys: ["update_date", "work_description"],
  labelSeparator: " — ",
  selectQuery: "id, update_date, work_description",
};

const billOptionsFrom = {
  table: "stakeholder_bills",
  valueKey: "id",
  labelKeys: ["bill_number", "service_provider_name"],
  labelSeparator: " — ",
  selectQuery: "id, bill_number, service_provider_name",
};

const userOptionsFrom = {
  table: "user_master",
  valueKey: "id",
  labelKey: "full_name",
  selectQuery: "id, full_name",
};

const roleOptions = [
  { value: "super_admin", label: "Super Admin" },
  { value: "admin", label: "Admin" },
  { value: "official", label: "Corporation Official" },
  { value: "stakeholder", label: "Stakeholder" },
  { value: "viewer", label: "Viewer" },
];

const projectStatusOptions = [
  { value: "planned", label: "Planned" },
  { value: "active", label: "Active" },
  { value: "on_hold", label: "On Hold" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const projectRecordTypeOptions = [
  { value: "project", label: "Project" },
  { value: "requirement", label: "Requirement" },
];

const billStatusOptions = [
  { value: "draft", label: "Draft" },
  { value: "submitted", label: "Submitted" },
  { value: "approved", label: "Approved" },
  { value: "paid", label: "Paid" },
  { value: "rejected", label: "Rejected" },
];

const paymentModeOptions = [
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "upi", label: "UPI" },
  { value: "cheque", label: "Cheque" },
];

const approvalStatusOptions = [
  { value: "draft", label: "Draft" },
  { value: "submitted", label: "Submitted" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

const geoFields = [
  { name: "latitude", label: "Latitude", type: "number" as const, step: "0.0000001", placeholder: "e.g. 13.0827" },
  { name: "longitude", label: "Longitude", type: "number" as const, step: "0.0000001", placeholder: "e.g. 80.2707" },
];

const approvalWorkflowFields = [
  { name: "approval_status", label: "Approval Status", type: "select" as const, options: approvalStatusOptions },
  { name: "submitted_at", label: "Submitted At", type: "text" as const, placeholder: "YYYY-MM-DDTHH:mm (optional)" },
  { name: "approved_by", label: "Approved By", type: "select" as const, optionsFrom: userOptionsFrom },
  { name: "approved_at", label: "Approved At", type: "text" as const, placeholder: "YYYY-MM-DDTHH:mm (optional)" },
  { name: "rejection_reason", label: "Rejection Reason", type: "textarea" as const },
];

const billApprovalFields = [
  { name: "submitted_at", label: "Submitted At", type: "text" as const, placeholder: "YYYY-MM-DDTHH:mm (optional)" },
  { name: "approved_by", label: "Approved By", type: "select" as const, optionsFrom: userOptionsFrom },
  { name: "approved_at", label: "Approved At", type: "text" as const, placeholder: "YYYY-MM-DDTHH:mm (optional)" },
  { name: "rejection_reason", label: "Rejection Reason", type: "textarea" as const },
];

const attachmentsField = (multiple = true) => ({
  name: "attachments",
  label: "Image Attachments",
  type: "attachments" as const,
  multiple,
  accept: "image/jpeg,image/png,image/webp",
  fullWidth: true,
});

/** Transactional screens requiring multiple attachments. */
const transactionalAttachmentsField = attachmentsField(true);

/** Master screens — multiple enabled for consistency. */
const masterAttachmentsField = attachmentsField(true);

const appModules = [
  { value: "masters", label: "Masters" },
  { value: "projects", label: "Projects" },
  { value: "activities", label: "Activities" },
  { value: "daily_updates", label: "Daily Updates" },
  { value: "billing", label: "Billing & Payments" },
  { value: "dashboard", label: "Dashboard" },
];

export const crudConfigs = {
  users: {
    title: "Users",
    description: "Application users and roles",
    table: "user_master",
    columns: [
      { key: "full_name", label: "Name" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
      { key: "role", label: "Role" },
      { key: "is_active", label: "Active" },
    ] as ColumnConfig[],
    fields: [
      { name: "full_name", label: "Full Name", type: "text", required: true },
      { name: "email", label: "Email", type: "email", required: true },
      { name: "phone", label: "Phone", type: "tel" },
      { name: "role", label: "Role", type: "select", required: true, options: roleOptions },
      { name: "is_active", label: "Active", type: "checkbox", defaultValue: true },
    ] as FieldConfig[],
    orderBy: { column: "full_name", ascending: true },
    allowCreate: false,
    allowDelete: false,
    allowExcelImport: false,
  },

  corporations: {
    title: "Corporations",
    description: "Municipal corporation master",
    table: "corporations",
    columns: [
      { key: "code", label: "Code" },
      { key: "name", label: "Name" },
      { key: "logo_url", label: "Logo" },
      { key: "contact_person", label: "Contact" },
      { key: "phone", label: "Phone" },
      { key: "is_active", label: "Active" },
    ] as ColumnConfig[],
    fields: [
      { name: "code", label: "Corporation Code", type: "text" },
      { name: "name", label: "Corporation Name", type: "text", required: true },
      { name: "logo_url", label: "Corporation Logo", type: "logo", fullWidth: true },
      { name: "contact_person", label: "Contact Person", type: "text" },
      { name: "phone", label: "Phone", type: "tel" },
      { name: "email", label: "Email", type: "email" },
      { name: "address", label: "Address", type: "textarea" },
      { name: "is_active", label: "Active", type: "checkbox", defaultValue: true },
    ] as FieldConfig[],
    orderBy: { column: "name", ascending: true },
  },

  zones: {
    title: "Zones",
    description: "Zone master within each corporation",
    table: "zones",
    selectQuery: "*, corporations(name)",
    columns: [
      { key: "corporations.name", label: "Corporation" },
      { key: "code", label: "Code" },
      { key: "name", label: "Zone Name" },
      { key: "is_active", label: "Active" },
    ] as ColumnConfig[],
    fields: [
      { name: "corporation_id", label: "Corporation", type: "select", required: true, optionsFrom: corporationOptionsFrom },
      { name: "code", label: "Zone Code", type: "text" },
      { name: "name", label: "Zone Name", type: "text", required: true },
      { name: "description", label: "Description", type: "textarea" },
      ...geoFields,
      masterAttachmentsField,
      { name: "is_active", label: "Active", type: "checkbox", defaultValue: true },
    ] as FieldConfig[],
    defaultLatestCorporation: true,
  },

  zoneWards: {
    title: "Zone-wise Wards",
    description: "Ward master within each zone",
    table: "zone_wards",
    selectQuery: "*, zones(name, corporations(name))",
    columns: [
      { key: "zones.corporations.name", label: "Corporation" },
      { key: "zones.name", label: "Zone" },
      { key: "ward_number", label: "Ward No." },
      { key: "name", label: "Ward Name" },
      { key: "is_active", label: "Active" },
    ] as ColumnConfig[],
    fields: [
      { name: "zone_id", label: "Zone", type: "select", required: true, optionsFrom: zoneOptionsFrom },
      { name: "ward_number", label: "Ward Number", type: "text", required: true },
      { name: "name", label: "Ward Name", type: "text", required: true },
      { name: "description", label: "Description", type: "textarea" },
      ...geoFields,
      masterAttachmentsField,
      { name: "is_active", label: "Active", type: "checkbox", defaultValue: true },
    ] as FieldConfig[],
  },

  wardAreas: {
    title: "Ward-wise Areas",
    description: "Area master within each ward",
    table: "ward_areas",
    selectQuery: "*, zone_wards(ward_number, name, zones(name, corporation_id))",
    columns: [
      { key: "zone_wards.zones.name", label: "Zone" },
      { key: "zone_wards.ward_number", label: "Ward" },
      { key: "code", label: "Code" },
      { key: "name", label: "Area Name" },
      { key: "is_active", label: "Active" },
    ] as ColumnConfig[],
    fields: [
      { name: "ward_id", label: "Ward", type: "select", required: true, optionsFrom: wardOptionsFrom },
      { name: "code", label: "Area Code", type: "text" },
      { name: "name", label: "Area Name", type: "text", required: true },
      { name: "description", label: "Description", type: "textarea" },
      ...geoFields,
      masterAttachmentsField,
      { name: "is_active", label: "Active", type: "checkbox", defaultValue: true },
    ] as FieldConfig[],
  },

  areaStreets: {
    title: "Area-wise Streets",
    description: "Street master within each area",
    table: "area_streets",
    selectQuery:
      "*, ward_areas(name, zone_wards(ward_number, name, zones(corporation_id)))",
    columns: [
      { key: "ward_areas.name", label: "Area" },
      { key: "name", label: "Street Name" },
      { key: "street_type", label: "Type" },
      { key: "is_active", label: "Active" },
    ] as ColumnConfig[],
    fields: [
      { name: "area_id", label: "Area", type: "select", required: true, optionsFrom: areaOptionsFrom },
      { name: "name", label: "Street Name", type: "text", required: true },
      { name: "street_type", label: "Street Type", type: "text", placeholder: "Main / Cross / Lane" },
      { name: "description", label: "Description", type: "textarea" },
      ...geoFields,
      masterAttachmentsField,
      { name: "is_active", label: "Active", type: "checkbox", defaultValue: true },
    ] as FieldConfig[],
  },

  corporationOfficials: {
    title: "Corporation Officials",
    description: "Officials and department contacts",
    table: "corporation_officials",
    selectQuery: "*, corporations(name)",
    columns: [
      { key: "corporations.name", label: "Corporation" },
      { key: "name", label: "Name" },
      { key: "designation", label: "Designation" },
      { key: "department", label: "Department" },
      { key: "phone", label: "Phone" },
    ] as ColumnConfig[],
    fields: [
      { name: "corporation_id", label: "Corporation", type: "select", required: true, optionsFrom: corporationOptionsFrom },
      { name: "name", label: "Official Name", type: "text", required: true },
      { name: "designation", label: "Designation", type: "text" },
      { name: "department", label: "Department", type: "text" },
      { name: "phone", label: "Phone", type: "tel" },
      { name: "email", label: "Email", type: "email" },
      masterAttachmentsField,
      { name: "is_active", label: "Active", type: "checkbox", defaultValue: true },
    ] as FieldConfig[],
    defaultLatestCorporation: true,
  },

  serviceCategories: {
    title: "Service Categories",
    description: "Categories of civic services",
    table: "service_categories",
    columns: [
      { key: "name", label: "Category" },
      { key: "description", label: "Description" },
      { key: "is_active", label: "Active" },
    ] as ColumnConfig[],
    fields: [
      { name: "name", label: "Category Name", type: "text", required: true },
      { name: "description", label: "Description", type: "textarea" },
      masterAttachmentsField,
      { name: "is_active", label: "Active", type: "checkbox", defaultValue: true },
    ] as FieldConfig[],
    orderBy: { column: "name", ascending: true },
  },

  stakeholderCategories: {
    title: "Stakeholder Categories",
    description: "NGO, contractor, resident group, etc.",
    table: "stakeholder_categories",
    columns: [
      { key: "name", label: "Category" },
      { key: "description", label: "Description" },
      { key: "is_active", label: "Active" },
    ] as ColumnConfig[],
    fields: [
      { name: "name", label: "Category Name", type: "text", required: true },
      { name: "description", label: "Description", type: "textarea" },
      masterAttachmentsField,
      { name: "is_active", label: "Active", type: "checkbox", defaultValue: true },
    ] as FieldConfig[],
    orderBy: { column: "name", ascending: true },
  },

  stakeholderAccessRights: {
    title: "Stakeholder Access Rights",
    description: "App module access by stakeholder category",
    table: "stakeholder_category_access_rights",
    selectQuery: "*, stakeholder_categories(name)",
    columns: [
      { key: "stakeholder_categories.name", label: "Category" },
      { key: "module_label", label: "Module" },
      { key: "can_view", label: "View" },
      { key: "can_create", label: "Create" },
      { key: "can_edit", label: "Edit" },
      { key: "can_delete", label: "Delete" },
    ] as ColumnConfig[],
    fields: [
      { name: "stakeholder_category_id", label: "Stakeholder Category", type: "select", required: true, optionsFrom: stakeholderCategoryOptionsFrom },
      { name: "module_key", label: "Module Key", type: "select", required: true, options: appModules },
      { name: "module_label", label: "Module Label", type: "text", required: true },
      { name: "can_view", label: "Can View", type: "checkbox", defaultValue: true },
      { name: "can_create", label: "Can Create", type: "checkbox", defaultValue: false },
      { name: "can_edit", label: "Can Edit", type: "checkbox", defaultValue: false },
      { name: "can_delete", label: "Can Delete", type: "checkbox", defaultValue: false },
    ] as FieldConfig[],
  },

  stakeholders: {
    title: "Stakeholders",
    description: "Organizations and service providers",
    table: "stakeholders",
    selectQuery: "*, stakeholder_categories(name), corporations(name), service_categories(name)",
    columns: [
      { key: "name", label: "Name" },
      { key: "stakeholder_categories.name", label: "Category" },
      { key: "gstin", label: "GSTIN" },
      { key: "service_categories.name", label: "Service" },
      { key: "phone", label: "Phone" },
      { key: "is_active", label: "Active" },
    ] as ColumnConfig[],
    fields: [
      { name: "stakeholder_category_id", label: "Category", type: "select", required: true, optionsFrom: stakeholderCategoryOptionsFrom },
      { name: "corporation_id", label: "Corporation", type: "select", optionsFrom: corporationOptionsFrom },
      { name: "service_category_id", label: "Service Category", type: "select", optionsFrom: serviceCategoryOptionsFrom },
      { name: "registration_no", label: "Registration No.", type: "text" },
      { name: "gstin", label: "GSTIN", type: "text", placeholder: "15-character GSTIN (optional)" },
      { name: "pan", label: "PAN", type: "text", placeholder: "10-character PAN (optional)" },
      { name: "name", label: "Stakeholder Name", type: "text", required: true },
      { name: "contact_person", label: "Contact Person", type: "text" },
      { name: "phone", label: "Phone", type: "tel" },
      { name: "email", label: "Email", type: "email" },
      { name: "address", label: "Address", type: "textarea" },
      masterAttachmentsField,
      { name: "is_active", label: "Active", type: "checkbox", defaultValue: true },
    ] as FieldConfig[],
    orderBy: { column: "name", ascending: true },
  },

  stakeholderMembers: {
    title: "Stakeholder Members",
    description: "Members within each stakeholder organization",
    table: "stakeholder_members",
    selectQuery: "*, stakeholders(name)",
    columns: [
      { key: "stakeholders.name", label: "Stakeholder" },
      { key: "name", label: "Member Name" },
      { key: "role", label: "Role" },
      { key: "phone", label: "Phone" },
      { key: "is_active", label: "Active" },
    ] as ColumnConfig[],
    fields: [
      { name: "stakeholder_id", label: "Stakeholder", type: "select", required: true, optionsFrom: stakeholderOptionsFrom },
      { name: "name", label: "Member Name", type: "text", required: true },
      { name: "role", label: "Role", type: "text" },
      { name: "phone", label: "Phone", type: "tel" },
      { name: "email", label: "Email", type: "email" },
      masterAttachmentsField,
      { name: "is_active", label: "Active", type: "checkbox", defaultValue: true },
    ] as FieldConfig[],
  },

  stakeholderEquipment: {
    title: "Stakeholder Equipment",
    description: "Equipment owned by stakeholders",
    table: "stakeholder_equipment",
    selectQuery: "*, stakeholders(name)",
    columns: [
      { key: "stakeholders.name", label: "Stakeholder" },
      { key: "name", label: "Equipment" },
      { key: "equipment_type", label: "Type" },
      { key: "quantity", label: "Qty" },
    ] as ColumnConfig[],
    fields: [
      { name: "stakeholder_id", label: "Stakeholder", type: "select", required: true, optionsFrom: stakeholderOptionsFrom },
      { name: "name", label: "Equipment Name", type: "text", required: true },
      { name: "equipment_type", label: "Equipment Type", type: "text" },
      { name: "quantity", label: "Quantity", type: "number", required: true, defaultValue: 1 },
      { name: "notes", label: "Notes", type: "textarea" },
      masterAttachmentsField,
    ] as FieldConfig[],
  },

  centralCommittees: {
    title: "Central Committee",
    description: "Central committee master per corporation",
    table: "central_committees",
    selectQuery: "*, corporations(name)",
    columns: [
      { key: "corporations.name", label: "Corporation" },
      { key: "name", label: "Committee" },
      { key: "chairperson", label: "Chairperson" },
      { key: "formation_date", label: "Formed On" },
      { key: "is_active", label: "Active" },
    ] as ColumnConfig[],
    fields: [
      { name: "corporation_id", label: "Corporation", type: "select", required: true, optionsFrom: corporationOptionsFrom },
      { name: "name", label: "Committee Name", type: "text", required: true },
      { name: "formation_date", label: "Formation Date", type: "date" },
      { name: "chairperson", label: "Chairperson", type: "text" },
      { name: "secretary", label: "Secretary", type: "text" },
      { name: "notes", label: "Notes", type: "textarea" },
      masterAttachmentsField,
      { name: "is_active", label: "Active", type: "checkbox", defaultValue: true },
    ] as FieldConfig[],
    defaultLatestCorporation: true,
  },

  projects: {
    title: "Projects / Requirements",
    description: "Civic projects and requirements master",
    table: "projects",
    selectQuery:
      "*, corporations(name), zone_wards(ward_number, name), ward_areas(name), area_streets(name)",
    columns: [
      { key: "record_type", label: "Type" },
      { key: "corporations.name", label: "Corporation" },
      { key: "zone_wards.ward_number", label: "Ward" },
      { key: "ward_areas.name", label: "Area" },
      { key: "area_streets.name", label: "Street" },
      { key: "code", label: "Code" },
      { key: "name", label: "Name" },
      { key: "budget", label: "Budget (₹)" },
      { key: "status", label: "Status" },
      { key: "approval_status", label: "Approval" },
    ] as ColumnConfig[],
    fields: [
      { name: "corporation_id", label: "Corporation", type: "select", required: true, optionsFrom: corporationOptionsFrom },
      {
        name: "record_type",
        label: "Type",
        type: "select",
        required: true,
        options: projectRecordTypeOptions,
        defaultValue: "project",
        fullWidth: true,
      },
      {
        name: "ward_id",
        label: "Ward",
        type: "select",
        optionsFrom: wardOptionsFrom,
        visibleWhen: { field: "record_type", value: "requirement" },
      },
      {
        name: "area_id",
        label: "Area",
        type: "select",
        optionsFrom: areaOptionsFrom,
        visibleWhen: { field: "record_type", value: "requirement" },
      },
      {
        name: "street_id",
        label: "Street",
        type: "select",
        optionsFrom: streetOptionsFrom,
        visibleWhen: { field: "record_type", value: "requirement" },
      },
      { name: "code", label: "Code", type: "text" },
      { name: "name", label: "Name", type: "text", required: true },
      { name: "description", label: "Description", type: "textarea" },
      { name: "start_date", label: "Start Date", type: "date" },
      { name: "end_date", label: "End Date", type: "date" },
      { name: "budget", label: "Budget (₹)", type: "number", step: "0.01" },
      { name: "status", label: "Status", type: "select", required: true, options: projectStatusOptions, defaultValue: "planned" },
      ...geoFields,
      masterAttachmentsField,
      ...approvalWorkflowFields,
    ] as FieldConfig[],
    defaultLatestCorporation: true,
  },

  activities: {
    title: "Activities",
    description: "Activity types master",
    table: "activities",
    columns: [
      { key: "name", label: "Activity" },
      { key: "unit", label: "Unit" },
      { key: "description", label: "Description" },
      { key: "is_active", label: "Active" },
    ] as ColumnConfig[],
    fields: [
      { name: "name", label: "Activity Name", type: "text", required: true },
      { name: "unit", label: "Unit", type: "text", placeholder: "e.g. km, sq.m, nos" },
      { name: "description", label: "Description", type: "textarea" },
      masterAttachmentsField,
      { name: "is_active", label: "Active", type: "checkbox", defaultValue: true },
    ] as FieldConfig[],
    orderBy: { column: "name", ascending: true },
  },

  projectActivities: {
    title: "Project-wise Activities",
    description: "Activities mapped to each project",
    table: "project_activities",
    selectQuery: "*, projects(name, code), activities(name)",
    columns: [
      { key: "projects.name", label: "Project" },
      { key: "activities.name", label: "Activity" },
      { key: "planned_start", label: "Start" },
      { key: "planned_end", label: "End" },
      { key: "budget", label: "Budget (₹)" },
      { key: "status", label: "Status" },
    ] as ColumnConfig[],
    fields: [
      { name: "project_id", label: "Project", type: "select", required: true, optionsFrom: projectOptionsFrom },
      { name: "activity_id", label: "Activity", type: "select", required: true, optionsFrom: activityOptionsFrom },
      { name: "planned_start", label: "Planned Start", type: "date" },
      { name: "planned_end", label: "Planned End", type: "date" },
      { name: "budget", label: "Budget (₹)", type: "number", step: "0.01" },
      { name: "status", label: "Status", type: "select", required: true, options: projectStatusOptions, defaultValue: "planned" },
      { name: "notes", label: "Notes", type: "textarea" },
      transactionalAttachmentsField,
    ] as FieldConfig[],
  },

  activityResourceRequirements: {
    title: "Activity Resource Requirements",
    description: "Resources required per project activity",
    table: "activity_resource_requirements",
    selectQuery: "*, project_activities(projects(name), activities(name))",
    columns: [
      { key: "project_activities.projects.name", label: "Project" },
      { key: "project_activities.activities.name", label: "Activity" },
      { key: "resource_name", label: "Resource" },
      { key: "quantity", label: "Qty" },
      { key: "unit", label: "Unit" },
      { key: "estimated_cost", label: "Est. Cost (₹)" },
    ] as ColumnConfig[],
    fields: [
      { name: "project_activity_id", label: "Project Activity", type: "select", required: true, optionsFrom: projectActivityOptionsFrom },
      { name: "resource_name", label: "Resource Name", type: "text", required: true },
      { name: "quantity", label: "Quantity", type: "number", required: true, step: "0.001" },
      { name: "unit", label: "Unit", type: "text" },
      { name: "estimated_cost", label: "Estimated Cost (₹)", type: "number", step: "0.01" },
      { name: "notes", label: "Notes", type: "textarea" },
      masterAttachmentsField,
    ] as FieldConfig[],
  },

  activityExecutingStakeholders: {
    title: "Activity Executing Stakeholders",
    description: "Stakeholders executing each project activity",
    table: "activity_executing_stakeholders",
    selectQuery: "*, project_activities(projects(name), activities(name)), stakeholders(name)",
    columns: [
      { key: "project_activities.projects.name", label: "Project" },
      { key: "project_activities.activities.name", label: "Activity" },
      { key: "stakeholders.name", label: "Stakeholder" },
      { key: "role", label: "Role" },
      { key: "assigned_date", label: "Assigned" },
    ] as ColumnConfig[],
    fields: [
      { name: "project_activity_id", label: "Project Activity", type: "select", required: true, optionsFrom: projectActivityOptionsFrom },
      { name: "stakeholder_id", label: "Stakeholder", type: "select", required: true, optionsFrom: stakeholderOptionsFrom },
      { name: "role", label: "Execution Role", type: "text" },
      { name: "assigned_date", label: "Assigned Date", type: "date" },
      { name: "notes", label: "Notes", type: "textarea" },
      masterAttachmentsField,
    ] as FieldConfig[],
  },

  activityFundingStakeholders: {
    title: "Activity Funding Stakeholders",
    description: "Stakeholders funding each project activity",
    table: "activity_funding_stakeholders",
    selectQuery: "*, project_activities(projects(name), activities(name)), stakeholders(name)",
    columns: [
      { key: "project_activities.projects.name", label: "Project" },
      { key: "project_activities.activities.name", label: "Activity" },
      { key: "stakeholders.name", label: "Stakeholder" },
      { key: "committed_amount", label: "Committed (₹)" },
      { key: "funding_type", label: "Funding Type" },
    ] as ColumnConfig[],
    fields: [
      { name: "project_activity_id", label: "Project Activity", type: "select", required: true, optionsFrom: projectActivityOptionsFrom },
      { name: "stakeholder_id", label: "Stakeholder", type: "select", required: true, optionsFrom: stakeholderOptionsFrom },
      { name: "committed_amount", label: "Committed Amount (₹)", type: "number", required: true, step: "0.01" },
      { name: "funding_type", label: "Funding Type", type: "text", placeholder: "CSR / Grant / Self" },
      { name: "notes", label: "Notes", type: "textarea" },
      masterAttachmentsField,
    ] as FieldConfig[],
  },

  dailyActivityUpdates: {
    title: "Daily Activity Updates",
    description: "Daily work progress reported by stakeholders",
    table: "daily_activity_updates",
    selectQuery: "*, project_activities(projects(name), activities(name)), stakeholders(name)",
    columns: [
      { key: "update_date", label: "Date" },
      { key: "project_activities.projects.name", label: "Project" },
      { key: "project_activities.activities.name", label: "Activity" },
      { key: "stakeholders.name", label: "Stakeholder" },
      { key: "progress_pct", label: "Progress %" },
      { key: "approval_status", label: "Approval" },
      { key: "work_description", label: "Work Done" },
    ] as ColumnConfig[],
    fields: [
      { name: "project_activity_id", label: "Project Activity", type: "select", required: true, optionsFrom: projectActivityOptionsFrom },
      { name: "stakeholder_id", label: "Stakeholder", type: "select", required: true, optionsFrom: stakeholderOptionsFrom },
      { name: "update_date", label: "Update Date", type: "date", required: true },
      { name: "work_description", label: "Work Description", type: "textarea", required: true },
      { name: "progress_pct", label: "Progress %", type: "number", defaultValue: 0 },
      { name: "remarks", label: "Remarks", type: "textarea" },
      ...geoFields,
      transactionalAttachmentsField,
      ...approvalWorkflowFields,
    ] as FieldConfig[],
    orderBy: { column: "update_date", ascending: false },
  },

  dailyActivityResourcesUsed: {
    title: "Resources Used (Daily)",
    description: "Resources consumed in daily activity updates",
    table: "daily_activity_resources_used",
    selectQuery:
      "*, daily_activity_updates(update_date, work_description, project_activities(projects(corporation_id)))",
    columns: [
      { key: "daily_activity_updates.update_date", label: "Date" },
      { key: "daily_activity_updates.work_description", label: "Update" },
      { key: "resource_name", label: "Resource" },
      { key: "quantity", label: "Qty" },
      { key: "unit", label: "Unit" },
    ] as ColumnConfig[],
    fields: [
      { name: "daily_activity_update_id", label: "Daily Update", type: "select", required: true, optionsFrom: dailyUpdateOptionsFrom },
      { name: "resource_name", label: "Resource Name", type: "text", required: true },
      { name: "quantity", label: "Quantity", type: "number", required: true, step: "0.001" },
      { name: "unit", label: "Unit", type: "text" },
      transactionalAttachmentsField,
    ] as FieldConfig[],
  },

  stakeholderBills: {
    title: "Stakeholder Bills",
    description: "Bills generated for service providers",
    table: "stakeholder_bills",
    selectQuery: "*, stakeholders(name)",
    columns: [
      { key: "stakeholders.name", label: "Stakeholder" },
      { key: "service_provider_name", label: "Service Provider" },
      { key: "bill_number", label: "Bill No." },
      { key: "bill_date", label: "Date" },
      { key: "amount", label: "Amount (₹)" },
      { key: "status", label: "Status" },
    ] as ColumnConfig[],
    fields: [
      { name: "stakeholder_id", label: "Stakeholder", type: "select", required: true, optionsFrom: stakeholderOptionsFrom },
      { name: "service_provider_name", label: "Service Provider", type: "text", required: true },
      { name: "bill_number", label: "Bill Number", type: "text" },
      { name: "bill_date", label: "Bill Date", type: "date", required: true },
      { name: "amount", label: "Amount (₹)", type: "number", required: true, step: "0.01" },
      { name: "description", label: "Description", type: "textarea" },
      { name: "status", label: "Status", type: "select", required: true, options: billStatusOptions, defaultValue: "draft" },
      transactionalAttachmentsField,
      ...billApprovalFields,
    ] as FieldConfig[],
    orderBy: { column: "bill_date", ascending: false },
  },

  stakeholderPayments: {
    title: "Stakeholder Payments",
    description: "Payments by stakeholders to service providers",
    table: "stakeholder_payments",
    selectQuery: "*, stakeholders(name), stakeholder_bills(bill_number, service_provider_name)",
    columns: [
      { key: "stakeholders.name", label: "Stakeholder" },
      { key: "stakeholder_bills.bill_number", label: "Bill" },
      { key: "payment_date", label: "Date" },
      { key: "amount", label: "Amount (₹)" },
      { key: "payment_mode", label: "Mode" },
      { key: "reference_number", label: "Reference" },
    ] as ColumnConfig[],
    fields: [
      { name: "stakeholder_id", label: "Stakeholder", type: "select", required: true, optionsFrom: stakeholderOptionsFrom },
      { name: "bill_id", label: "Bill (optional)", type: "select", optionsFrom: billOptionsFrom },
      { name: "payment_date", label: "Payment Date", type: "date", required: true },
      { name: "amount", label: "Amount (₹)", type: "number", required: true, step: "0.01" },
      { name: "payment_mode", label: "Payment Mode", type: "select", required: true, options: paymentModeOptions, defaultValue: "bank_transfer" },
      { name: "reference_number", label: "Reference Number", type: "text" },
      { name: "notes", label: "Notes", type: "textarea" },
      transactionalAttachmentsField,
    ] as FieldConfig[],
    orderBy: { column: "payment_date", ascending: false },
  },
};
