"use client";

import { useEffect, useState } from "react";
import { CrudPage } from "@/components/crud/CrudPage";
import { fetchCurrentUserProfile } from "@/lib/auth";
import { crudConfigs } from "@/lib/crud-configs";
import { ensureLockedCorporation } from "@/lib/corporations";
import { isSuperAdmin } from "@/lib/roles";
import type { UserRole } from "@/lib/types/database";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export function CorporationsPage() {
  const [ready, setReady] = useState(false);
  const [userRole, setUserRole] = useState<UserRole | null>(null);

  useEffect(() => {
    async function load() {
      if (isSupabaseConfigured()) {
        const supabase = createClient();
        await ensureLockedCorporation(supabase);
        const profile = await fetchCurrentUserProfile(supabase);
        setUserRole(profile?.role ?? null);
      }
      setReady(true);
    }
    load();
  }, []);

  if (!ready) {
    return <p className="text-sm text-civic-600">Loading...</p>;
  }

  const superAdmin = isSuperAdmin(userRole);

  return (
    <CrudPage
      {...crudConfigs.corporations}
      allowCreate={superAdmin}
      skipCorporationScope={superAdmin}
      description={
        superAdmin
          ? "Create and manage municipal corporations"
          : "Your municipal corporation profile"
      }
    />
  );
}
