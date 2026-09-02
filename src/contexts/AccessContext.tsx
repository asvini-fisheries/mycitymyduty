"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { fetchCurrentUserProfile, type CurrentUserProfile } from "@/lib/auth";
import {
  canAccessModule,
  canAccessPath,
  fetchStakeholderAccessRights,
  hasUnrestrictedAccess,
  type AccessAction,
  type AccessRightsMap,
} from "@/lib/access-rights";
import type { ModuleKey } from "@/lib/modules";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { fetchLockedStakeholder } from "@/lib/stakeholders";

interface AccessContextValue {
  loading: boolean;
  profile: CurrentUserProfile | null;
  stakeholderName: string | null;
  rights: AccessRightsMap;
  can: (moduleKey: ModuleKey | string | null | undefined, action?: AccessAction) => boolean;
  canPath: (pathname: string, action?: AccessAction) => boolean;
  isStakeholder: boolean;
  refresh: () => Promise<void>;
}

const AccessContext = createContext<AccessContextValue | null>(null);

export function AccessProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<CurrentUserProfile | null>(null);
  const [stakeholderName, setStakeholderName] = useState<string | null>(null);
  const [rights, setRights] = useState<AccessRightsMap>({});

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const nextProfile = await fetchCurrentUserProfile(supabase);
    setProfile(nextProfile);

    if (nextProfile?.role === "stakeholder") {
      const nextRights = await fetchStakeholderAccessRights(
        supabase,
        nextProfile.stakeholder_id
      );
      setRights(nextRights);
      const lockedStakeholder = await fetchLockedStakeholder(supabase);
      setStakeholderName(lockedStakeholder?.name ?? null);
    } else {
      setRights({});
      setStakeholderName(null);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const can = useCallback(
    (moduleKey: ModuleKey | string | null | undefined, action: AccessAction = "view") =>
      canAccessModule(profile?.role, rights, moduleKey, action),
    [profile?.role, rights]
  );

  const canPath = useCallback(
    (pathname: string, action: AccessAction = "view") =>
      canAccessPath(profile?.role, rights, pathname, action),
    [profile?.role, rights]
  );

  const value = useMemo<AccessContextValue>(
    () => ({
      loading,
      profile,
      stakeholderName,
      rights,
      can,
      canPath,
      isStakeholder: profile?.role === "stakeholder",
      refresh,
    }),
    [loading, profile, stakeholderName, rights, can, canPath, refresh]
  );

  return (
    <AccessContext.Provider value={value}>{children}</AccessContext.Provider>
  );
}

export function useAccess() {
  const context = useContext(AccessContext);
  if (!context) {
    throw new Error("useAccess must be used within AccessProvider");
  }
  return context;
}

export function useOptionalAccess() {
  return useContext(AccessContext);
}

export function useModulePermissions(moduleKey: ModuleKey | string | undefined) {
  const { can, profile, loading } = useAccess();

  return useMemo(
    () => ({
      loading,
      unrestricted: hasUnrestrictedAccess(profile?.role),
      canView: can(moduleKey, "view"),
      canCreate: can(moduleKey, "create"),
      canEdit: can(moduleKey, "edit"),
      canDelete: can(moduleKey, "delete"),
    }),
    [can, loading, moduleKey, profile?.role]
  );
}
