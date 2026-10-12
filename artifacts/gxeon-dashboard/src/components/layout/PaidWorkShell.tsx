import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Activity, ArrowUpRight, BriefcaseBusiness, ChevronLeft, ChevronRight, CircleDollarSign, ClipboardCheck, Command, Database, Github, LayoutDashboard, Menu, Radar, ShieldCheck, Wallet, X } from "lucide-react";
import { cn } from "@/lib/utils";
const groups = [
 { title:"COMANDO", items:[["Visão geral","/ops/paid-work",LayoutDashboard],["Radar GitHub","/ops/github-demand",Github],["Radar Web3","/ops/web3-tasks",Radar]] },
 { title:"OPERAÇÃO", items:[["Oportunidades","/ops/opportunities",BriefcaseBusiness],["Fila de tarefas","/ops/tasks",ClipboardCheck],["Execução","/ops/execution",Activity],["Validação","/ops/validation",ShieldCheck]] },
 { title:"FINANCEIRO", items:[["Liberação","/ops/release",CircleDollarSign],["Ledger","/ops/ledger",Database],["Carteira","/ops/monetization",Wallet]] }
] as const;
export default function PaidWorkShell({children}:{children:React.ReactNode}){
 const [location]=useLocation(); const [collapsed,setCollapsed]=useState(false);const [mobile,setMobile]=useState(false);
 return <div className="dark flex h-screen overflow-hidden bg-[#070a0f] text-slate-100">
  {mobile&&<button aria-label="Fechar menu" onClick={()=>setMobile(false)} className="fixed inset-0 z-40 bg-black/70 lg:hidden"/>}
  <aside className={cn("fixed inset-y-0 left-0 z-50 flex flex-col border-r border-white/10 bg-[#0b0e14] transition-all duration-200 lg:relative lg:translate-x-0",collapsed?"w-[84px]":"w-[260px]",mobile?"translate-x-0":"-translate-x-full")}>
   <div className="flex h-20 items-center justify-between border-b border-white/10 px-5">
    <Link href="/ops/paid-work" onClick={()=>setMobile(false)} className="flex min-w-0 items-center gap-3">
     <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-amber-400/30 bg-amber-400/10"><Command className="h-5 w-5 text-amber-300"/></div>
     {!collapsed&&<div><div className="text-base font-black tracking-[.18em]">GXEON<span className="text-amber-300">.</span></div><div className="text-[10px] font-semibold tracking-[.16em] text-slate-500">WORK COMMAND</div></div>}
    </Link>
    <button aria-label="Fechar menu" onClick={()=>setMobile(false)} className="lg:hidden"><X className="h-5 w-5"/></button>
   </div>
   <div className="min-h-0 flex-1 overflow-y-auto px-3 py-6">
    {groups.map(group=><div key={group.title} className="mb-7">
     {!collapsed&&<p className="mb-3 px-3 text-[10px] font-bold tracking-[.22em] text-slate-600">{group.title}</p>}
     <div className="space-y-1">{group.items.map(([label,href,Icon])=><Link key={href} href={href} onClick={()=>setMobile(false)} className={cn("flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition",location===href?"border border-amber-400/20 bg-amber-400/10 text-amber-200":"border border-transparent text-slate-400 hover:bg-white/5 hover:text-white",collapsed&&"justify-center")} title={label}><Icon className="h-[18px] w-[18px] shrink-0"/>{!collapsed&&<span>{label}</span>}</Link>)}</div>
    </div>)}
   </div>
   <div className="border-t border-white/10 p-3">
    <div className="rounded-xl border border-emerald-400/15 bg-emerald-400/5 p-3">{!collapsed&&<div className="text-[10px] font-bold tracking-[.15em] text-emerald-300">GOVERNANÇA</div>}<div className="mt-1 flex items-center gap-2 text-xs text-slate-400"><ShieldCheck className="h-4 w-4 shrink-0 text-emerald-300"/>{!collapsed&&"READ ONLY · EVIDENCE FIRST"}</div></div>
    <button onClick={()=>setCollapsed(v=>!v)} className="mt-3 hidden w-full items-center justify-center rounded-lg p-2 text-slate-500 hover:bg-white/5 lg:flex" aria-label={collapsed?"Expandir menu":"Recolher menu"}>{collapsed?<ChevronRight className="h-4 w-4"/>:<ChevronLeft className="h-4 w-4"/>}</button>
   </div>
  </aside>
  <div className="flex min-w-0 flex-1 flex-col">
   <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 bg-[#0b0e14]/90 px-4 backdrop-blur-xl md:px-7">
    <div className="flex items-center gap-3"><button onClick={()=>setMobile(true)} aria-label="Abrir menu" className="rounded-lg p-2 text-slate-300 lg:hidden"><Menu className="h-5 w-5"/></button><div><p className="text-[10px] font-semibold uppercase tracking-[.2em] text-slate-500">GXEON / OPERATIONS</p><p className="text-sm font-semibold text-white">Paid Work Command Center</p></div></div>
    <div className="flex items-center gap-3"><span className="hidden rounded-full border border-cyan-400/20 bg-cyan-400/5 px-3 py-1 text-[10px] font-bold tracking-widest text-cyan-300 sm:block">OPERATOR CONSOLE</span><Link href="/ops/github-demand" className="rounded-lg border border-white/10 p-2 text-slate-400 hover:text-white" title="Radar GitHub"><ArrowUpRight className="h-4 w-4"/></Link></div>
   </header>
   <main className="min-h-0 flex-1 overflow-y-auto bg-[radial-gradient(ellipse_at_top_right,rgba(245,158,11,.055),transparent_40%)] p-4 md:p-7">{children}</main>
  </div>
 </div>
}