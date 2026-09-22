"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

type Nested = Record<string, unknown> | Record<string, unknown>[] | null;

type ParticipationRow = {
  id: string;
  participation_date: string;
  notes: string | null;
  certificate_issued_at: string | null;
  projects: Nested;
  stakeholders: Nested;
  stakeholder_members: Nested;
};

function firstRecord(value: Nested): Record<string, unknown> | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

function text(value: unknown, fallback = "—"): string {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function formatLongDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(`${iso.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso.slice(0, 10);
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function recordTypeLabel(value: unknown): string {
  if (value === "requirement") return "requirement";
  return "project";
}

export default function AppreciationCertificatePage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [row, setRow] = useState<ParticipationRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || !isSupabaseConfigured()) {
      setLoading(false);
      setError("Certificate could not be loaded.");
      return;
    }

    async function load() {
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from("project_member_participations")
        .select(
          "id, participation_date, notes, certificate_issued_at, projects(name, code, record_type, corporations(name, logo_url)), stakeholders(name), stakeholder_members(name, phone, role)"
        )
        .eq("id", id)
        .maybeSingle();

      if (fetchError || !data) {
        setError(fetchError?.message ?? "Participation record not found.");
        setLoading(false);
        return;
      }

      const participation = data as unknown as ParticipationRow;
      setRow(participation);
      setLoading(false);

      if (!participation.certificate_issued_at) {
        const issuedAt = new Date().toISOString();
        await supabase
          .from("project_member_participations")
          .update({ certificate_issued_at: issuedAt })
          .eq("id", id);
        setRow({ ...participation, certificate_issued_at: issuedAt });
      }
    }

    load();
  }, [id]);

  if (loading) {
    return <p className="p-8 text-civic-600">Preparing certificate...</p>;
  }

  if (error || !row) {
    return (
      <p className="p-8 text-red-700">{error ?? "Certificate not found."}</p>
    );
  }

  const project = firstRecord(row.projects);
  const corporation = firstRecord(
    (project?.corporations as Nested) ?? null
  );
  const stakeholder = firstRecord(row.stakeholders);
  const member = firstRecord(row.stakeholder_members);
  const memberName = text(member?.name, "Participant");
  const stakeholderName = text(stakeholder?.name, "Stakeholder");
  const projectName = text(project?.name, "the civic programme");
  const projectCode = project?.code ? String(project.code) : null;
  const corporationName = text(corporation?.name, "Municipal Corporation");
  const corporationLogo = corporation?.logo_url
    ? String(corporation.logo_url)
    : null;
  const kind = recordTypeLabel(project?.record_type);

  return (
    <div className="mx-auto max-w-[1100px] p-6">
      <div className="no-print mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-civic-600">
          Appreciation certificate for {memberName}
        </p>
        <Button type="button" onClick={() => window.print()}>
          Print / Save PDF
        </Button>
      </div>

      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 10mm; }
        }
      `}</style>
      <article className="relative overflow-hidden rounded-sm border-[10px] border-double border-amber-700 bg-[#fffdf6] px-10 py-12 text-center shadow-sm">
        <div className="pointer-events-none absolute inset-3 border border-amber-600/40" />

        <div className="relative flex items-center justify-center gap-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/mycitymyduty-logo.png"
            alt="My City My Duty"
            className="h-16 w-auto rounded bg-white p-1"
          />
          {corporationLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={corporationLogo}
              alt={corporationName}
              className="h-16 w-16 rounded bg-white object-contain p-1"
            />
          ) : null}
        </div>

        <p className="relative mt-4 text-xs font-semibold uppercase tracking-[0.35em] text-civic-600">
          {corporationName}
        </p>
        <p className="relative mt-1 text-xs uppercase tracking-[0.28em] text-amber-800">
          My City My Duty
        </p>

        <h1 className="relative mt-8 font-serif text-4xl font-semibold tracking-wide text-civic-900">
          Certificate of Appreciation
        </h1>
        <p className="relative mx-auto mt-3 max-w-2xl text-sm italic text-civic-600">
          In recognition of civic participation and service to the city
        </p>

        <p className="relative mt-10 text-sm uppercase tracking-widest text-civic-500">
          This certificate is presented to
        </p>
        <p className="relative mt-2 font-serif text-3xl font-semibold text-civic-900">
          {memberName}
        </p>
        <p className="relative mt-2 text-base text-civic-700">
          representing <span className="font-semibold">{stakeholderName}</span>
        </p>

        <p className="relative mx-auto mt-8 max-w-3xl text-base leading-relaxed text-civic-800">
          for participating in the {kind}{" "}
          <span className="font-semibold">
            {projectName}
            {projectCode ? ` (${projectCode})` : ""}
          </span>{" "}
          on <span className="font-semibold">{formatLongDate(row.participation_date)}</span>.
        </p>

        {row.notes ? (
          <p className="relative mx-auto mt-4 max-w-2xl text-sm italic text-civic-600">
            {row.notes}
          </p>
        ) : null}

        <div className="relative mt-16 grid grid-cols-2 gap-16 px-8 text-sm text-civic-700">
          <div>
            <div className="mx-auto mb-2 h-px w-48 bg-civic-400" />
            <p>Authorised Signatory</p>
            <p className="text-xs text-civic-500">{corporationName}</p>
          </div>
          <div>
            <div className="mx-auto mb-2 h-px w-48 bg-civic-400" />
            <p>Date of issue</p>
            <p className="text-xs text-civic-500">
              {formatLongDate(row.certificate_issued_at?.slice(0, 10) ?? null)}
            </p>
          </div>
        </div>
      </article>
    </div>
  );
}
