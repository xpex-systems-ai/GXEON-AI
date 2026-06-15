import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, CircleDot, Menu, Search, ShieldCheck, Zap } from "lucide-react";
import { useR100TruthSummary } from "@/hooks/useR100TruthSummary";
import { useEffect, useState } from "react";
import { fetchR100Verification, fallbackR100Verification, type R100VerificationSummary } from "@/services/r100DurableStateService";

const headerTabs = ["Status", "Operator", "Revenue", "Tasks", "Connectors"];
const fallbackKpis = [
  { label: "Opportunities", value: "0", href: "/ops/prospects" },
  { label: "Tasks", value: "0", href: "/ops/tasks" },
  { label: "Executions", value: "0", href: "/ops/execution" },
  { label: "Revenue", value: "R$0", qualifier: "manual", href: "/ops/ledger", title: "provider not verified" },
  { label: "Connectors", value: "5", href: "/ops/connectors" },
];

export function Topbar() {
  const { summary, refresh, lastUpdatedAt, safeFallbackUsed } = useR100TruthSummary();
  const [memory, setMemory] = useState<R100VerificationSummary>(() => fallbackR100Verification());
  useEffect(() => { const controller = new AbortController(); fetchR100Verification(controller.signal).then(setMemory); return () => controller.abort(); }, []);
  const persistenceTitle = memory.persistenceMode === "SERVER_LOCAL_JSON" ? "Server JSON" : memory.fallbackUsed || !memory.healthy ? "Needs verification" : "Memory fallback";
  const persistenceTitle = summary.persistenceMode === "SERVER_LOCAL_JSON" ? "file-backed" : summary.persistenceFallbackUsed ? "safe memory fallback" : "memory-only";
  const kpis = (summary?.topbarKpis?.length ? summary.topbarKpis : fallbackKpis).map((kpi) => kpi.label === "Revenue" && summary.operatorConfirmedRevenueBrl > 0 ? { ...kpi, value: summary.revenueDisplayValue || `R$${summary.operatorConfirmedRevenueBrl}` } : kpi);
  return (
    <header className="sticky top-0 z-30 border-b border-amber-300/10 bg-[#050505]/90 px-4 py-3 backdrop-blur-xl md:px-6">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="ghost" size="icon" className="border border-amber-300/15 text-amber-100 lg:hidden">
            <Menu className="h-5 w-5" />
          </Button>
          <Link href="/" className="flex items-center gap-3">
            <h1 className="text-xl font-black tracking-[0.24em] text-white">GXEON OS</h1>
            <Badge className="border-emerald-300/30 bg-emerald-400/10 text-emerald-100">
              <CircleDot className="mr-1 h-3 w-3" /> Live
            </Badge>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {headerTabs.map((tab) => (
              <Link key={tab} href={tab === "Connectors" ? "/ops/connectors" : tab === "Tasks" ? "/ops/tasks" : tab === "Revenue" ? "/ops/ledger" : "/"}>
                <span className="rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-stone-400 transition hover:bg-amber-400/10 hover:text-amber-100">{tab}</span>
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {kpis.map((kpi) => (
            <Link key={kpi.label} href={kpi.href}>
              <div title={kpi.title ?? (kpi.label === "Revenue" ? summary.revenueSafetyLabel : undefined)} className="rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2 transition hover:-translate-y-0.5 hover:border-amber-300/30 hover:bg-amber-400/10">
                <p className="text-[10px] uppercase tracking-[0.22em] text-stone-500">{kpi.label}</p>
                <p className="text-sm font-black text-white">{kpi.value}{kpi.qualifier ? <span className="ml-1 text-[10px] uppercase text-emerald-100">{kpi.qualifier}</span> : null}</p>{kpi.label === "Revenue" && summary.providerVerifiedRevenueBrl === 0 ? <p className="text-[9px] uppercase tracking-[0.16em] text-stone-500">provider not verified</p> : null}
              </div>
            </Link>
          ))}
          <div className="hidden rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-2 text-stone-400 md:flex md:items-center md:gap-2">
            <Search className="h-4 w-4 text-amber-200" />
            <span className="text-sm">⌘K</span>
          </div>
          <Button type="button" onClick={() => refresh()} variant="outline" className="h-8 border-emerald-300/35 text-emerald-100" title={lastUpdatedAt ? `Truth synced ${lastUpdatedAt} · persistence ${persistenceTitle}` : `Refresh R$100 truth · persistence ${persistenceTitle}`}><ShieldCheck className="mr-1 h-3 w-3" /> {safeFallbackUsed ? "SAFE" : "Manual"} · {persistenceTitle}</Button>
          <Button type="button" onClick={() => refresh()} variant="outline" className="h-8 border-emerald-300/35 text-emerald-100" title={lastUpdatedAt ? `Truth synced ${lastUpdatedAt} · persistence ${persistenceTitle}` : `Refresh R$100 truth · persistence ${persistenceTitle}`}><ShieldCheck className="mr-1 h-3 w-3" /> {safeFallbackUsed ? "SAFE" : "Manual"}</Button>
          <Button size="icon" variant="ghost" className="relative rounded-full border border-white/10 bg-white/[0.035] text-amber-100">
            <Bell className="h-4 w-4" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-amber-300" />
          </Button>
          <div className="hidden items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-2 lg:flex">
            <Zap className="h-4 w-4 text-amber-200" />
            <p className="text-xs font-semibold text-white">Junior Sena</p>
          </div>
        </div>
      </div>
    </header>
  );
}
