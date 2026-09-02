import { AccessProvider } from "@/contexts/AccessContext";
import { DashboardAccessGuard } from "@/components/layout/DashboardAccessGuard";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { Sidebar } from "@/components/layout/Sidebar";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <AccessProvider>
      <div className="flex min-h-screen bg-civic-50">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <DashboardHeader />
          <main className="flex-1 overflow-auto">
            <div className="mx-auto max-w-7xl px-6 py-8">
              <DashboardAccessGuard>{children}</DashboardAccessGuard>
            </div>
          </main>
        </div>
      </div>
    </AccessProvider>
  );
}
