"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAccess } from "@/contexts/AccessContext";
import { getModuleKeyForPath } from "@/lib/modules";

export function DashboardAccessGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { loading, profile, canPath, isStakeholder } = useAccess();

  useEffect(() => {
    if (loading || !profile) return;
    if (!isStakeholder) return;

    if (!canPath(pathname, "view")) {
      router.replace("/dashboard");
    }
  }, [canPath, isStakeholder, loading, pathname, profile, router]);

  if (loading) {
    return (
      <div className="rounded-xl border border-civic-100 bg-white p-8 text-sm text-civic-600">
        Loading your access...
      </div>
    );
  }

  if (isStakeholder && profile && !canPath(pathname, "view")) {
    const moduleKey = getModuleKeyForPath(pathname);
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-8 text-sm text-amber-900">
        <p className="font-semibold">Access restricted</p>
        <p className="mt-2">
          Your stakeholder category does not include access to{" "}
          {moduleKey ? `"${moduleKey}"` : "this screen"}. Contact your corporation
          admin if you need permission.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
