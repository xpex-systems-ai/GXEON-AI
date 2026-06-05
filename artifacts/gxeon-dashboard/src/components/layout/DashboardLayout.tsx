import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dark min-h-screen bg-slate-950 text-foreground">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_20%_10%,rgba(14,165,233,0.18),transparent_28%),radial-gradient(circle_at_82%_18%,rgba(217,70,239,0.14),transparent_30%),linear-gradient(135deg,#020617_0%,#07111f_50%,#020617_100%)]" />
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <Topbar />
          <main className="flex-1 overflow-auto p-4 md:p-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
