import type { SupabaseClient } from "@supabase/supabase-js";
import {
  applyCorporationScopeToRowQuery,
  applyCorporationScopeToSelectQuery,
} from "@/lib/corporations";
import {
  applyAllocationScopeToRowQuery,
  applyAllocationScopeToSelectQuery,
} from "@/lib/stakeholders";

export const PARTICIPATION_TABLE = "project_member_participations";

export const PARTICIPATION_CERTIFICATE_SELECT =
  "id, project_id, stakeholder_id, participation_date, notes, certificate_issued_at, projects(id, name, code, record_type, corporation_id, certificate_template_url, corporations(name, logo_url)), stakeholders(id, name), stakeholder_members(name, phone, role)";

export type Nested = Record<string, unknown> | Record<string, unknown>[] | null;

export type ParticipationRow = {
  id: string;
  project_id?: string;
  stakeholder_id?: string;
  participation_date: string;
  notes: string | null;
  certificate_issued_at: string | null;
  projects: Nested;
  stakeholders: Nested;
  stakeholder_members: Nested;
};

export function firstRecord(value: Nested): Record<string, unknown> | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

export function text(value: unknown, fallback = "—"): string {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

export function overlayLengthClass(value: string) {
  if (value.length > 42) return "is-long";
  if (value.length > 28) return "is-medium";
  return "";
}

export function nestedName(value: Nested, fallback = ""): string {
  return text(firstRecord(value)?.name, fallback);
}

export const DEFAULT_CERTIFICATE_TEMPLATE =
  "/certificates/coastal-cleanup-2026.jpg";

export function getCertificateTemplateUrl(project: Nested): string {
  const url = firstRecord(project)?.certificate_template_url;
  if (typeof url === "string" && url.trim()) return url.trim();
  return DEFAULT_CERTIFICATE_TEMPLATE;
}

export function projectLabel(value: Nested): string {
  const project = firstRecord(value);
  if (!project) return "Project";
  const kind =
    project.record_type === "requirement" ? "Requirement" : "Project";
  const name = text(project.name, kind);
  const code = project.code ? ` (${project.code})` : "";
  return `${name}${code}`;
}

function compareParticipations(a: ParticipationRow, b: ParticipationRow) {
  const stakeholder = nestedName(a.stakeholders).localeCompare(
    nestedName(b.stakeholders),
    "en",
    { sensitivity: "base" }
  );
  if (stakeholder !== 0) return stakeholder;
  return nestedName(a.stakeholder_members).localeCompare(
    nestedName(b.stakeholder_members),
    "en",
    { sensitivity: "base" }
  );
}

export async function fetchCertificateParticipations(
  supabase: SupabaseClient,
  options: {
    corporationId: string | null;
    allocatedProjectIds: string[] | null;
    lockedStakeholderId: string | null;
    projectId?: string | null;
    stakeholderId?: string | null;
  }
): Promise<ParticipationRow[]> {
  if (options.allocatedProjectIds && options.allocatedProjectIds.length === 0) {
    return [];
  }

  const corpSelect = applyCorporationScopeToSelectQuery(
    PARTICIPATION_TABLE,
    PARTICIPATION_CERTIFICATE_SELECT,
    options.corporationId
  );
  const scopedSelect = applyAllocationScopeToSelectQuery(
    PARTICIPATION_TABLE,
    corpSelect,
    options.allocatedProjectIds
  );

  const pageSize = 500;
  const rows: ParticipationRow[] = [];
  let from = 0;

  while (true) {
    let query = supabase
      .from(PARTICIPATION_TABLE)
      .select(scopedSelect)
      .order("participation_date", { ascending: true })
      .range(from, from + pageSize - 1);

    query = applyCorporationScopeToRowQuery(
      query,
      PARTICIPATION_TABLE,
      [],
      options.corporationId
    );
    query = applyAllocationScopeToRowQuery(
      query,
      PARTICIPATION_TABLE,
      options.allocatedProjectIds
    );

    if (options.lockedStakeholderId) {
      query = query.eq("stakeholder_id", options.lockedStakeholderId);
    }
    if (options.projectId) {
      query = query.eq("project_id", options.projectId);
    }
    if (options.stakeholderId) {
      query = query.eq("stakeholder_id", options.stakeholderId);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(error.message);
    }

    const batch = (data as unknown as ParticipationRow[]) ?? [];
    rows.push(...batch);
    if (batch.length < pageSize) break;
    from += pageSize;
  }

  return rows.sort(compareParticipations);
}

export async function markCertificatesIssued(
  supabase: SupabaseClient,
  ids: string[]
): Promise<string> {
  const issuedAt = new Date().toISOString();
  const pending = ids.filter(Boolean);
  for (let index = 0; index < pending.length; index += 100) {
    const chunk = pending.slice(index, index + 100);
    const { error } = await supabase
      .from(PARTICIPATION_TABLE)
      .update({ certificate_issued_at: issuedAt })
      .in("id", chunk)
      .is("certificate_issued_at", null);
    if (error) {
      throw new Error(error.message);
    }
  }
  return issuedAt;
}
