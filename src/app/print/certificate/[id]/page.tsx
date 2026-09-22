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

function overlayLengthClass(value: string) {
  if (value.length > 42) return "is-long";
  if (value.length > 28) return "is-medium";
  return "";
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

  const stakeholder = firstRecord(row.stakeholders);
  const member = firstRecord(row.stakeholder_members);
  const memberName = text(member?.name, "Participant");
  const stakeholderName = text(stakeholder?.name, "Stakeholder");

  return (
    <div className="certificate-print mx-auto max-w-[1123px] p-6">
      <div className="no-print mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-civic-600">
          Appreciation certificate for {memberName}
        </p>
        <Button type="button" onClick={() => window.print()}>
          Print / Save PDF
        </Button>
      </div>

      <style>{`
        .certificate-sheet {
          position: relative;
          width: 100%;
          aspect-ratio: 1024 / 682;
          overflow: hidden;
          background: #fff;
          container-type: inline-size;
        }
        .certificate-sheet img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: fill;
        }
        .certificate-line {
          position: absolute;
          left: 16%;
          right: 16%;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          text-align: center;
          color: #163a57;
          font-family: Georgia, "Times New Roman", serif;
          margin: 0;
          line-height: 1;
          text-decoration: none;
          overflow: visible;
          white-space: nowrap;
        }
        .certificate-line--name {
          top: 41.4%;
          height: 5.2%;
          font-size: 2.35cqw;
          font-weight: 600;
        }
        .certificate-line--org {
          top: 50.6%;
          height: 5.1%;
          font-size: 1.95cqw;
          font-weight: 600;
        }
        .certificate-line--name.is-medium { font-size: 1.95cqw; }
        .certificate-line--org.is-medium { font-size: 1.7cqw; }
        .certificate-line--name.is-long { font-size: 1.6cqw; }
        .certificate-line--org.is-long { font-size: 1.45cqw; }
        @media print {
          @page { size: A4 landscape; margin: 0; }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          .certificate-print {
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .certificate-sheet {
            width: 297mm;
            height: 210mm;
            aspect-ratio: auto;
          }
          .certificate-line {
            overflow: hidden;
            line-height: 1.15;
          }
          .certificate-line--name {
            top: 43.4%;
            height: 3.8%;
            font-size: 1.7rem;
            font-weight: 700;
          }
          .certificate-line--org {
            top: 52.5%;
            height: 3.7%;
            font-size: 1.35rem;
            font-weight: 600;
          }
          .certificate-line--name.is-medium { font-size: 1.35rem; }
          .certificate-line--org.is-medium { font-size: 1.15rem; }
          .certificate-line--name.is-long { font-size: 1.1rem; }
          .certificate-line--org.is-long { font-size: 0.98rem; }
        }
      `}</style>

      <article className="certificate-sheet">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/certificates/coastal-cleanup-2026.jpg"
          alt="International Coastal Cleanup 2026 certificate"
        />
        <p
          className={`certificate-line certificate-line--name ${overlayLengthClass(memberName)}`}
        >
          {memberName}
        </p>
        <p
          className={`certificate-line certificate-line--org ${overlayLengthClass(stakeholderName)}`}
        >
          {stakeholderName}
        </p>
      </article>
    </div>
  );
}
