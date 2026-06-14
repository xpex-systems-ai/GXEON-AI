import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { BrainCircuit, CircleDot, Database, GitBranch, HandCoins, Inbox, Kanban, ListChecks, LockKeyhole, Plug, Radar, Rocket, Route, ShieldCheck, Table2, TrendingUp, Workflow } from "lucide-react";

const navGroups = [
  {
    title: "Operations",
    items: [
      { label: "Brain", href: "/ops/brain", icon: BrainCircuit, status: "review" },
      { label: "Revenue Sprint", href: "/ops/revenue-sprint", icon: HandCoins, status: "review" },
      { label: "Inbox", href: "/ops/opportunities", icon: Inbox, status: "live" },
      { label: "Tasks", href: "/ops/tasks", icon: ListChecks, status: "live" },
      { label: "Broker P0", href: "/ops/broker", icon: Route, status: "review" },
      { label: "Execution", href: "/ops/execution", icon: Workflow, status: "pending" },
      { label: "Validation", href: "/ops/validation", icon: ShieldCheck, status: "pending" },
      { label: "Release", href: "/ops/release", icon: Rocket, status: "pending" },
      { label: "Ledger", href: "/ops/ledger", icon: Table2, status: "pending" },
      { label: "Monetization", href: "/ops/monetization", icon: CircleDot, status: "review" },
    ],
  },
  {
    title: "Acquisition",
    items: [
      { label: "Radar X", href: "/ops/radar-x", icon: Radar, status: "review" },
      { label: "Web3 Tasks", href: "/ops/web3-tasks", icon: Radar, status: "review" },
      { label: "Agent Economy", href: "/ops/agent-economy", icon: Radar, status: "review" },
      { label: "Home Agents", href: "/ops/agent-conectou", icon: Plug, status: "review" },
      { label: "Proposals", href: "/marketplace", icon: TrendingUp, status: "live" },
    ],
  },
  {
    title: "Infrastructure",
    items: [
      { label: "Connectors", href: "/ops/connectors", icon: Plug, status: "review" },
      { label: "Database", href: "/financial-core", icon: Database, status: "locked" },
      { label: "Deployments", href: "/deploy-engine", icon: Rocket, status: "pending" },
      { label: "Analytics", href: "/analytics", icon: Kanban, status: "live" },
      { label: "Security", href: "/settings", icon: LockKeyhole, status: "live" },
    ],
  },
];

const statusTone: Record<string, string> = {
  live: "bg-emerald-300 shadow-[0_0_14px_rgba(110,231,183,0.85)]",
  pending: "bg-amber-300 shadow-[0_0_14px_rgba(252,211,77,0.75)]",
  review: "bg-cyan-300 shadow-[0_0_14px_rgba(103,232,249,0.75)]",
  locked: "bg-stone-500",
};

export function Sidebar() {
  const [location] = useLocation();

  return (
    <aside className="hidden h-full w-72 shrink-0 flex-col border-r border-amber-300/10 bg-[#050505]/95 shadow-2xl shadow-black/60 backdrop-blur-xl lg:flex">
      <div className="border-b border-amber-300/10 p-5">
        <Link href="/" className="group flex items-center gap-3">
          <div className="relative grid h-11 w-11 place-items-center rounded-2xl border border-amber-300/30 bg-amber-400/10 text-amber-100 transition group-hover:border-amber-200/60 group-hover:shadow-[0_0_26px_rgba(245,158,11,0.22)]">
            <BrainCircuit className="h-6 w-6" />
            <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-emerald-300" />
          </div>
          <div>
            <p className="text-lg font-black tracking-[0.22em] text-white">GXEON OS</p>
            <p className="text-[10px] uppercase tracking-[0.28em] text-amber-200/60">Operator Mode</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto p-3">
        {navGroups.map((group) => (
          <div key={group.title} className="space-y-1.5">
            <p className="px-3 text-[10px] font-bold uppercase tracking-[0.3em] text-stone-500">{group.title}</p>
            {group.items.map((item) => {
              const active = location === item.href || (item.href !== "/" && location.startsWith(item.href));
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href}>
                  <div
                    className={cn(
                      "group flex items-center gap-3 rounded-2xl border border-transparent px-3 py-3 text-stone-300 transition duration-200 hover:-translate-y-0.5 hover:border-amber-300/25 hover:bg-amber-400/10 hover:text-white hover:shadow-[0_14px_34px_rgba(0,0,0,0.35)]",
                      active && "border-amber-300/35 bg-amber-400/15 text-white shadow-[0_0_28px_rgba(245,158,11,0.13)]",
                    )}
                  >
                    <span className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[0.035] text-amber-200">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="flex-1 truncate text-sm font-semibold">{item.label}</span>
                    <span className={cn("h-2 w-2 rounded-full", statusTone[item.status])} />
                    {active && <CircleDot className="h-3 w-3 text-amber-200" />}
                  </div>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="m-3 rounded-2xl border border-emerald-300/15 bg-emerald-400/[0.06] p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-100">
            <GitBranch className="h-3.5 w-3.5" /> Safe Mode
          </div>
          <span className="h-2 w-2 rounded-full bg-emerald-300" />
        </div>
      </div>
    </aside>
  );
}
