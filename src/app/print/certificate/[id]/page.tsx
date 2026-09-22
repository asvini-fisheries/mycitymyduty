"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import {
  CertificatePrintStyles,
  CertificateSheet,
} from "@/components/print/CertificateSheet";
import {
  firstRecord,
  markCertificatesIssued,
  nestedName,
  text,
  type ParticipationRow,
} from "@/lib/certificate-print";

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
        const issuedAt = await markCertificatesIssued(supabase, [
          participation.id,
        ]);
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

  const memberName = text(
    firstRecord(row.stakeholder_members)?.name,
    "Participant"
  );
  const stakeholderName = nestedName(row.stakeholders, "Stakeholder");

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

      <CertificatePrintStyles />
      <CertificateSheet
        memberName={memberName}
        stakeholderName={stakeholderName}
      />
    </div>
  );
}
