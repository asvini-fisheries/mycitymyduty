import { AccessProvider } from "@/contexts/AccessContext";
import { DashboardAccessGuard } from "@/components/layout/DashboardAccessGuard";
import { Sidebar } from "@/components/layout/Sidebar";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <AccessProvider>
      <div className="flex min-h-screen bg-civic-50">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <div className="mx-auto max-w-7xl px-6 py-8">
            <DashboardAccessGuard>{children}</DashboardAccessGuard>
          </div>
        </main>
      </div>
    </AccessProvider>
  );
}
