"use client";

import { useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccess } from "@/contexts/AccessContext";
import { navGroups } from "@/lib/navigation";
import { fetchLockedCorporation } from "@/lib/corporations";
import { isSuperAdmin } from "@/lib/roles";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

export function Sidebar() {
  const pathname = usePathname();
  const { can, profile, isStakeholder, stakeholderName } = useAccess();
  const [corporationName, setCorporationName] = useState<string | null>(null);
  const [corporationLogoUrl, setCorporationLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    async function loadContext() {
      if (!isSupabaseConfigured()) return;

      const supabase = createClient();
      const corp = await fetchLockedCorporation(supabase);
      if (!corp) return;

      setCorporationName(corp.name);
      setCorporationLogoUrl(corp.logo_url);
    }

    loadContext();
  }, []);

  const visibleNavGroups = useMemo(() => {
    const superAdmin = isSuperAdmin(profile?.role);
    return navGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => {
          if (item.superAdminOnly && !superAdmin) return false;
          if (isStakeholder) return can(item.moduleKey, "view");
          return true;
        }),
      }))
      .filter((group) => group.items.length > 0);
  }, [can, isStakeholder, profile?.role]);

  return (
    <aside className="flex w-64 flex-col border-r border-civic-100 bg-civic-900 text-white">
      <div className="flex flex-col gap-2 border-b border-civic-800 px-5 py-5">
        <div className="flex items-center gap-3">
          <Image
            src="/mycitymyduty-logo.png"
            alt="MyCityMyDuty"
            width={40}
            height={40}
            className="h-10 w-10 shrink-0 rounded-lg bg-white/95 object-contain p-0.5"
          />
          {corporationName &&
            (corporationLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={corporationLogoUrl}
                alt={`${corporationName} logo`}
                className="h-10 w-10 shrink-0 rounded-lg border border-civic-700 bg-white object-contain p-0.5"
              />
            ) : (
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-dashed border-civic-600 bg-civic-800 text-sm font-semibold text-amber-300"
                aria-hidden
              >
                {corporationName.charAt(0).toUpperCase()}
              </div>
            ))}
        </div>
        {corporationName && (
          <p
            className="line-clamp-2 text-sm font-bold leading-snug text-amber-400"
            title={corporationName}
          >
            {corporationName}
          </p>
        )}
        {isStakeholder && stakeholderName && (
          <p
            className="line-clamp-2 text-xs font-semibold leading-snug text-civic-200"
            title={stakeholderName}
          >
            {stakeholderName}
          </p>
        )}
        <p className="text-xs font-medium text-civic-300">
          {isStakeholder ? "Stakeholder Portal" : "MyCityMyDuty"}
        </p>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {visibleNavGroups.length === 0 && isStakeholder ? (
          <p className="px-3 text-sm text-civic-300">
            No screens assigned yet. Contact your corporation admin to configure
            access rights for your stakeholder category.
          </p>
        ) : (
          visibleNavGroups.map((group) => (
          <div key={group.title} className="mb-5">
            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-civic-400">
              {group.title}
            </p>
            <ul className="space-y-1">
              {group.items.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href));
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                        active
                          ? "bg-civic-700 text-white"
                          : "text-civic-200 hover:bg-civic-800 hover:text-white"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
          ))
        )}
      </nav>
    </aside>
  );
}
