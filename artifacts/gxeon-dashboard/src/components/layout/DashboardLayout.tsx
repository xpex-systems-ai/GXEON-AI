import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dark min-h-screen bg-[#030303] text-foreground">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_18%_8%,rgba(245,158,11,0.18),transparent_30%),radial-gradient(circle_at_82%_16%,rgba(180,83,9,0.12),transparent_28%),linear-gradient(135deg,#030303_0%,#0b0905_48%,#120d04_100%)]" />
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <Topbar />
          <main className="route-fade flex-1 overflow-auto p-4 md:p-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
