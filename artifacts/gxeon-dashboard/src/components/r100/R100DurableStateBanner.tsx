import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import type { R100VerificationSummary } from "@/services/r100DurableStateService";

export function R100DurableStateBanner({ verification, compact=false }: { verification: R100VerificationSummary; compact?: boolean }) {
  const label = verification.persistenceMode === "SERVER_LOCAL_JSON" ? "Server JSON" : verification.fallbackUsed || !verification.healthy ? "Needs verification" : "Memory fallback";
  const tone = verification.durabilityLevel === "SERVER_LOCAL_JSON" ? "border-emerald-300/30 bg-emerald-400/10 text-emerald-100" : verification.durabilityLevel === "MEMORY_ONLY" ? "border-amber-300/30 bg-amber-400/10 text-amber-100" : "border-rose-300/30 bg-rose-400/10 text-rose-100";
  return <div className={`rounded-3xl border ${tone} ${compact ? "p-3" : "p-5"}`}><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.24em]">R$100 durable memory</p><h2 className="text-xl font-black text-white">{label} · trust {verification.operatorTrustLevel}</h2><p className="mt-1 text-sm text-stone-300">Manual-first · Preview-only · Operator-approved only · Provider verified revenue remains R$0 · Real revenue is operator-confirmed only.</p></div><Link href="/ops/r100-state" className="rounded-2xl border border-white/15 px-3 py-2 text-sm font-bold text-white hover:border-amber-300/40">Open memory panel</Link></div>{!compact?<div className="mt-3 flex flex-wrap gap-2">{["Manual-first","Preview-only","No payment provider API","No checkout","No invoice","No auto-send","No external contact","No GitHub write","No scraping"].map(item=><Badge key={item} variant="outline" className="border-white/15 text-stone-200">{item}</Badge>)}</div>:null}</div>;
}
