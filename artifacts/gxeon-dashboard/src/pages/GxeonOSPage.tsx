import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { connectorGatewayProviders } from "@/data/connector-gateway";
import { getFinancialLedgerSummary } from "@/data/financial-ledger";
import { getOpportunitySummary } from "@/data/opportunity-inbox";
import { formatCurrency } from "@/lib/format";
import { ArrowRight, BadgeCheck, BookOpenCheck, CircleDot, Inbox, ListChecks, LockKeyhole, Plug, ShieldCheck, Workflow, Zap } from "lucide-react";

const connectorRoutes: Record<string, string> = {
  github: "/ops/connectors/github",
  vercel: "/ops/connectors/vercel",
  railway: "/ops/connectors/railway",
  supabase: "/ops/connectors/supabase",
  microsoft365: "/ops/connectors/m365",
};

const missionCards = [
  { label: "Opportunities", value: "0", status: "Ready", href: "/ops/opportunities", icon: Inbox, accent: "emerald" },
  { label: "Tasks", value: "0", status: "Queue", href: "/ops/tasks", icon: ListChecks, accent: "blue" },
  { label: "Execution", value: "0", status: "Idle", href: "/ops/execution", icon: Workflow, accent: "violet" },
  { label: "Validation", value: "0", status: "Clear", href: "/ops/validation", icon: BadgeCheck, accent: "emerald" },
  { label: "Revenue", value: "R$0", status: "Forecast", href: "/ops/ledger", icon: BookOpenCheck, accent: "amber" },
  { label: "Connectors", value: "5", status: "Controlled", href: "/ops/connectors", icon: Plug, accent: "cyan" },
];

const accentTone: Record<string, string> = {
  emerald: "text-emerald-200 border-emerald-300/20 bg-emerald-400/10",
  blue: "text-blue-200 border-blue-300/20 bg-blue-400/10",
  violet: "text-violet-200 border-violet-300/20 bg-violet-400/10",
  amber: "text-amber-200 border-amber-300/20 bg-amber-400/10",
  cyan: "text-cyan-200 border-cyan-300/20 bg-cyan-400/10",
};

export default function GxeonOSPage({ moduleId: _moduleId = "command_center" }: { moduleId?: string }) {
  const opportunities = getOpportunitySummary();
  const ledger = getFinancialLedgerSummary();
  const connectedCount = connectorGatewayProviders.filter((connector) => connector.status === "CONNECTED").length;
  const readyCount = connectorGatewayProviders.filter((connector) => connector.status === "READY").length;

  const kpis = [
    { label: "Opportunities", value: opportunities.active },
    { label: "Tasks", value: 0 },
    { label: "Executions", value: 0 },
    { label: "Revenue", value: formatCurrency(ledger.active_pipeline_brl) },
    { label: "Connectors", value: connectorGatewayProviders.length },
  ];

  return (
    <div className="space-y-5">
      <section className="rounded-[2rem] border border-amber-300/15 bg-[#070707]/90 p-5 shadow-2xl shadow-black/50 backdrop-blur-xl">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-emerald-300/30 bg-emerald-400/10 text-emerald-100"><CircleDot className="mr-1 h-3 w-3" /> Operational</Badge>
              <Badge variant="outline" className="border-amber-300/30 text-amber-100"><LockKeyhole className="mr-1 h-3 w-3" /> Safe</Badge>
              <Badge variant="outline" className="border-cyan-300/30 text-cyan-100">No OAuth</Badge>
              <Badge variant="outline" className="border-cyan-300/30 text-cyan-100">No API</Badge>
            </div>
            <h2 className="mt-4 text-4xl font-black tracking-tight text-white md:text-6xl">Mission Control</h2>
          </div>
          <div className="grid gap-2 sm:grid-cols-5">
            {kpis.map((kpi) => (
              <div key={kpi.label} className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
                <p className="text-[10px] uppercase tracking-[0.25em] text-stone-500">{kpi.label}</p>
                <p className="mt-2 text-xl font-black text-white">{kpi.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {missionCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.label} href={card.href}>
              <Card className="group h-full cursor-pointer overflow-hidden border-white/10 bg-[#090909]/85 text-white transition duration-200 hover:-translate-y-1 hover:border-amber-300/35 hover:bg-amber-400/[0.08] hover:shadow-[0_22px_55px_rgba(245,158,11,0.12)]">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <span className={`grid h-11 w-11 place-items-center rounded-2xl border ${accentTone[card.accent]}`}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <Badge variant="outline" className="border-amber-300/30 text-amber-100">{card.status}</Badge>
                  </div>
                  <div className="mt-8 flex items-end justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-stone-400">{card.label}</p>
                      <p className="mt-1 text-4xl font-black tracking-tight">{card.value}</p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-amber-200 transition group-hover:translate-x-1" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-white/10 bg-[#090909]/85 text-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-bold">Revenue Pipeline</h3>
              <Badge variant="outline" className="border-amber-300/30 text-amber-100">P5</Badge>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-5">
              {["Forecast", "Approved", "Pending", "Received", "Lost"].map((stage) => (
                <div key={stage}>
                  <div className="mb-2 flex items-center justify-between text-xs text-stone-400">
                    <span>{stage}</span>
                    <span>0</span>
                  </div>
                  <Progress value={0} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-[#090909]/85 text-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">Connector State</h3>
              <Plug className="h-5 w-5 text-amber-200" />
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-emerald-300/15 bg-emerald-400/10 p-3"><p className="text-2xl font-black">{connectedCount}</p><p className="text-xs text-emerald-100">Connected</p></div>
              <div className="rounded-2xl border border-amber-300/15 bg-amber-400/10 p-3"><p className="text-2xl font-black">{readyCount}</p><p className="text-xs text-amber-100">Ready</p></div>
              <div className="rounded-2xl border border-stone-300/15 bg-stone-400/10 p-3"><p className="text-2xl font-black">{connectorGatewayProviders.filter((connector) => connector.status === "LOCKED").length}</p><p className="text-xs text-stone-300">Locked</p></div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-3 md:grid-cols-5">
        {connectorGatewayProviders.map((connector) => (
          <Link key={connector.id} href={connectorRoutes[connector.id]}>
            <div className="group rounded-2xl border border-white/10 bg-white/[0.035] p-4 transition hover:-translate-y-1 hover:border-amber-300/35 hover:bg-amber-400/10 hover:shadow-[0_18px_45px_rgba(245,158,11,0.12)]">
              <div className="flex items-center justify-between">
                <p className="font-bold text-white">{connector.name}</p>
                <ShieldCheck className="h-4 w-4 text-emerald-200" />
              </div>
              <p className="mt-4 text-xs uppercase tracking-[0.22em] text-stone-500">{connector.status.replaceAll("_", " ")}</p>
              <div className="mt-3 flex items-center justify-between text-xs font-semibold text-amber-100">
                <span>Open</span>
                <ArrowRight className="h-3 w-3 transition group-hover:translate-x-1" />
              </div>
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}
