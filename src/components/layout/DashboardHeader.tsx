"use client";

import { LogOut } from "lucide-react";
import { useAccess } from "@/contexts/AccessContext";
import { signOutAndRedirect } from "@/lib/logout";
import { Button } from "@/components/ui/Button";

export function DashboardHeader() {
  const { profile, isStakeholder, stakeholderName, loading } = useAccess();

  const displayName =
    isStakeholder && stakeholderName
      ? stakeholderName
      : profile?.full_name || profile?.email || null;

  async function handleLogout() {
    await signOutAndRedirect(isStakeholder);
  }

  return (
    <header className="sticky top-0 z-20 border-b border-civic-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/90">
      <div className="flex items-center justify-end gap-4 px-6 py-3">
        {!loading && displayName && (
          <p
            className="hidden max-w-xs truncate text-sm text-civic-600 sm:block"
            title={displayName}
          >
            {displayName}
          </p>
        )}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleLogout}
          className="shrink-0 border-civic-300 shadow-sm"
          aria-label="Sign out"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </Button>
      </div>
    </header>
  );
}
