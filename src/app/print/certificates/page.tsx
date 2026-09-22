"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  CertificatePrintStyles,
  CertificateSheet,
} from "@/components/print/CertificateSheet";
import {
  fetchCertificateParticipations,
  firstRecord,
  getCertificateTemplateUrl,
  markCertificatesIssued,
  nestedName,
  text,
  type ParticipationRow,
} from "@/lib/certificate-print";
import { ensureLockedCorporation } from "@/lib/corporations";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { fetchAllocatedProjectIds } from "@/lib/stakeholders";

export default function BatchCertificatesPage() {
  const [rows, setRows] = useState<ParticipationRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      setError("Certificates could not be loaded.");
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const projectId = params.get("project_id");
    const stakeholderId = params.get("stakeholder_id");

    if (!projectId) {
      setLoading(false);
      setError("Select a project to print certificates.");
      return;
    }

    async function load() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setError("Sign in to print certificates.");
          setLoading(false);
          return;
        }

        const { data: profile } = await supabase
          .from("user_master")
          .select("role, stakeholder_id")
          .eq("id", user.id)
          .maybeSingle();

        const lockedStakeholderId =
          profile?.role === "stakeholder"
            ? (profile.stakeholder_id as string | null)
            : null;
        const corporationId = await ensureLockedCorporation(supabase);
        const allocatedProjectIds = lockedStakeholderId
          ? await fetchAllocatedProjectIds(supabase, lockedStakeholderId)
          : null;

        const data = await fetchCertificateParticipations(supabase, {
          corporationId,
          allocatedProjectIds,
          lockedStakeholderId,
          projectId,
          stakeholderId,
        });

        setRows(data);
        setLoading(false);

        const pendingIds = data
          .filter((row) => !row.certificate_issued_at)
          .map((row) => row.id);
        if (pendingIds.length > 0) {
          const issuedAt = await markCertificatesIssued(supabase, pendingIds);
          setRows((current) =>
            current.map((row) =>
              pendingIds.includes(row.id)
                ? { ...row, certificate_issued_at: issuedAt }
                : row
            )
          );
        }
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Certificates could not be loaded."
        );
        setLoading(false);
      }
    }

    load();
  }, []);

  if (loading) {
    return <p className="p-8 text-civic-600">Preparing certificates...</p>;
  }

  if (error) {
    return <p className="p-8 text-red-700">{error}</p>;
  }

  if (rows.length === 0) {
    return (
      <p className="p-8 text-civic-600">
        No participants match the selected project and stakeholder.
      </p>
    );
  }

  return (
    <div className="certificate-print mx-auto max-w-[1123px] p-6">
      <div className="no-print mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-civic-600">
          {rows.length} appreciation certificate
          {rows.length === 1 ? "" : "s"} ready to print
        </p>
        <Button type="button" onClick={() => window.print()}>
          Print / Save PDF
        </Button>
      </div>

      <CertificatePrintStyles />
      {rows.map((row) => {
        const memberName = text(
          firstRecord(row.stakeholder_members)?.name,
          "Participant"
        );
        const stakeholderName = nestedName(row.stakeholders, "Stakeholder");
        return (
          <CertificateSheet
            key={row.id}
            memberName={memberName}
            stakeholderName={stakeholderName}
            templateSrc={getCertificateTemplateUrl(row.projects)}
          />
        );
      })}
    </div>
  );
}
