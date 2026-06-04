import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Bot,
  Database,
  DollarSign,
  Gauge,
  KeyRound,
  RadioTower,
  RefreshCw,
  Rocket,
  ShieldAlert,
  Terminal,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { gxeoneDashboard } from "@/data/gxeone-dashboard";
import { formatCurrency } from "@/lib/format";

type RuntimeSnapshot = {
  sync?: unknown;
  production?: unknown;
  railway?: unknown;
  monetization?: unknown;
};

type FeedEvent = {
  id: string;
  feed: string;
  status: "GREEN" | "YELLOW" | "RED";
  value: string;
  timestamp: Date;
};

const statusTone = {
  GREEN: "border-emerald-400/40 bg-emerald-500/15 text-emerald-200",
  READY: "border-emerald-400/40 bg-emerald-500/15 text-emerald-200",
  ACTIVE: "border-emerald-400/40 bg-emerald-500/15 text-emerald-200",
  GOOD: "border-emerald-400/40 bg-emerald-500/15 text-emerald-200",
  YELLOW: "border-yellow-400/40 bg-yellow-500/15 text-yellow-100",
  WARNING: "border-yellow-400/40 bg-yellow-500/15 text-yellow-100",
  PENDING: "border-yellow-400/40 bg-yellow-500/15 text-yellow-100",
  DEGRADED: "border-yellow-400/40 bg-yellow-500/15 text-yellow-100",
  UNSTABLE: "border-orange-400/40 bg-orange-500/15 text-orange-100",
  PARTIAL: "border-orange-400/40 bg-orange-500/15 text-orange-100",
  PARTIALLY_HEALTHY: "border-orange-400/40 bg-orange-500/15 text-orange-100",
  RED: "border-red-400/40 bg-red-500/15 text-red-100",
  HIGH: "border-red-400/40 bg-red-500/15 text-red-100",
  RISKY: "border-red-400/40 bg-red-500/15 text-red-100",
  IDLE: "border-slate-400/40 bg-slate-500/15 text-slate-100",
  EARLY_STAGE: "border-cyan-400/40 bg-cyan-500/15 text-cyan-100",
  MONITORING: "border-fuchsia-400/40 bg-fuchsia-500/15 text-fuchsia-100",
} as const;

function toneFor(status: string) {
  return statusTone[status as keyof typeof statusTone] ?? "border-cyan-400/30 bg-cyan-500/10 text-cyan-100";
}

function ScoreRing({ label, value, accent = "cyan" }: { label: string; value: number; accent?: "cyan" | "fuchsia" | "emerald" | "yellow" }) {
  const accentClass = {
    cyan: "from-cyan-300 to-blue-500 text-cyan-100",
    fuchsia: "from-fuchsia-300 to-purple-500 text-fuchsia-100",
    emerald: "from-emerald-300 to-teal-500 text-emerald-100",
    yellow: "from-yellow-300 to-orange-500 text-yellow-100",
  }[accent];

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-[0_0_30px_rgba(34,211,238,0.08)]">
      <div className="flex items-center justify-between text-xs uppercase tracking-[0.22em] text-slate-400">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
        <div className={`h-full rounded-full bg-gradient-to-r ${accentClass}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function JsonCard({ title, children, icon: Icon }: { title: string; children: React.ReactNode; icon: typeof Activity }) {
  return (
    <Card className="border-white/10 bg-slate-950/60 shadow-[0_0_40px_rgba(147,51,234,0.12)] backdrop-blur-xl">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-white/10 pb-4">
        <CardTitle className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-100">{title}</CardTitle>
        <Icon className="h-4 w-4 text-fuchsia-300" />
      </CardHeader>
      <CardContent className="pt-5">{children}</CardContent>
    </Card>
  );
}

function makeFeedEvents(seed: number): FeedEvent[] {
  const feeds = gxeoneDashboard.modules.radar_center.live_feeds;
  const statuses: FeedEvent["status"][] = ["GREEN", "YELLOW", "GREEN", "RED", "YELLOW"];

  return feeds.map((feed, index) => ({
    id: `${feed}-${seed}-${index}`,
    feed,
    status: statuses[(seed + index) % statuses.length],
    value: `${Math.max(12, 96 - ((seed + index * 13) % 64))}ms / ${Math.max(1, (seed + index) % 9)} events`,
    timestamp: new Date(Date.now() - index * 14000),
  }));
}

export default function OperationalDashboardPage() {
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [pulse, setPulse] = useState(0);
  const [runtimeSnapshot, setRuntimeSnapshot] = useState<RuntimeSnapshot>({});
  const [connectedEndpoints, setConnectedEndpoints] = useState(0);

  const refreshRuntime = useCallback(async () => {
    const endpoints = [
      ["sync", "/api/v1/runtime/sync"],
      ["production", "/api/v1/runtime/production"],
      ["railway", "/api/v1/runtime/railway"],
      ["monetization", "/api/v1/runtime/monetization-audit"],
    ] as const;

    const responses = await Promise.allSettled(
      endpoints.map(async ([key, url]) => {
        const response = await fetch(url);
        if (!response.ok) return [key, undefined] as const;
        return [key, await response.json()] as const;
      }),
    );

    const nextSnapshot: RuntimeSnapshot = {};
    let connected = 0;
    responses.forEach((result) => {
      if (result.status === "fulfilled" && result.value[1]) {
        nextSnapshot[result.value[0]] = result.value[1];
        connected += 1;
      }
    });

    setRuntimeSnapshot(nextSnapshot);
    setConnectedEndpoints(connected);
    setLastUpdated(new Date());
    setPulse((current) => current + 1);
  }, []);

  useEffect(() => {
    refreshRuntime();
    const interval = setInterval(refreshRuntime, 30000);
    return () => clearInterval(interval);
  }, [refreshRuntime]);

  const feeds = useMemo(() => makeFeedEvents(pulse), [pulse]);
  const radar = gxeoneDashboard.modules.radar_center;
  const monetization = gxeoneDashboard.modules.monetization_engine;
  const health = gxeoneDashboard.modules.system_health;
  const railway = gxeoneDashboard.modules.railway_runtime;
  const gateway = gxeoneDashboard.modules.api_gateway;
  const agents = gxeoneDashboard.modules.agent_center;
  const ledger = gxeoneDashboard.modules.financial_ledger;
  const warRoom = gxeoneDashboard.modules.war_room;

  return (
    <div className="relative -m-6 min-h-[calc(100vh-4rem)] overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_34%),radial-gradient(circle_at_top_right,rgba(217,70,239,0.18),transparent_28%),linear-gradient(135deg,#020617,#0f172a_45%,#111827)] p-6">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.04)_1px,transparent_1px)] bg-[size:38px_38px]" />
      <div className="relative space-y-6">
        <section className="rounded-[2rem] border border-cyan-300/20 bg-white/[0.04] p-6 shadow-[0_0_80px_rgba(34,211,238,0.14)] backdrop-blur-2xl">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Badge className={toneFor(gxeoneDashboard.global_status.system_state)}>{gxeoneDashboard.global_status.system_state}</Badge>
                <Badge className="border-fuchsia-300/30 bg-fuchsia-500/10 text-fuchsia-100">{gxeoneDashboard.layout.style}</Badge>
                <Badge className="border-cyan-300/30 bg-cyan-500/10 text-cyan-100">{connectedEndpoints}/4 live endpoints</Badge>
              </div>
              <h1 className="text-4xl font-black tracking-tight text-white md:text-5xl">GXEONE Dashboard Vivo</h1>
              <p className="mt-3 max-w-3xl text-sm text-slate-300 md:text-base">
                Render engine operacional guiado por JSON: radar, Railway, API gateway, agentes, monetização e war room em uma visão viva para Vercel, Railway e Supabase futuro.
              </p>
            </div>
            <div className="grid min-w-[280px] gap-3 rounded-2xl border border-white/10 bg-slate-950/60 p-4 font-mono text-xs text-slate-300">
              <div className="flex items-center justify-between"><span>readiness</span><span className="text-cyan-200">{gxeoneDashboard.global_status.readiness}%</span></div>
              <div className="flex items-center justify-between"><span>monetization</span><span className="text-emerald-200">{gxeoneDashboard.global_status.monetization_ready ? "READY" : "PENDING"}</span></div>
              <div className="flex items-center justify-between"><span>production</span><span className="text-yellow-200">{gxeoneDashboard.global_status.production_ready ? "READY" : "NOT READY"}</span></div>
              <div className="flex items-center justify-between"><span>updated</span><span>{lastUpdated.toLocaleTimeString()}</span></div>
              <Button onClick={refreshRuntime} className="mt-2 bg-cyan-500 text-slate-950 hover:bg-cyan-300">
                <RefreshCw className="mr-2 h-4 w-4" /> Atualizar feeds
              </Button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <ScoreRing label="System" value={radar.metrics.system_health_score} accent="cyan" />
          <ScoreRing label="Security" value={radar.metrics.security_score} accent="yellow" />
          <ScoreRing label="Money" value={radar.metrics.monetization_score} accent="emerald" />
          <ScoreRing label="Runtime" value={radar.metrics.runtime_stability} accent="fuchsia" />
          <ScoreRing label="Cohesion" value={radar.metrics.architecture_cohesion} accent="cyan" />
        </section>

        <section className="grid gap-6 xl:grid-cols-12">
          <div className="space-y-6 xl:col-span-8">
            <JsonCard title={radar.title} icon={RadioTower}>
              <div className="grid gap-4 md:grid-cols-3">
                {radar.signals.map((signal) => {
                  const state = signal.split(" → ")[0];
                  return <Badge key={signal} className={`${toneFor(state)} justify-center py-2`}>{signal}</Badge>;
                })}
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {feeds.map((event) => (
                  <div key={event.id} className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-slate-100">{event.feed}</span>
                      <Badge className={toneFor(event.status)}>{event.status}</Badge>
                    </div>
                    <div className="mt-3 flex items-center justify-between font-mono text-xs text-slate-400">
                      <span>{event.value}</span>
                      <span>{event.timestamp.toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </JsonCard>

            <div className="grid gap-6 lg:grid-cols-2">
              <JsonCard title={railway.title} icon={Terminal}>
                <div className="space-y-3">
                  {railway.services.map((service) => (
                    <div key={service.name} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] p-3">
                      <div>
                        <p className="font-mono text-sm text-white">{service.name}</p>
                        <p className="text-xs text-slate-400">Railway service health</p>
                      </div>
                      <div className="flex gap-2">
                        <Badge className={toneFor(service.status)}>{service.status}</Badge>
                        <Badge className={toneFor(service.health)}>{service.health}</Badge>
                      </div>
                    </div>
                  ))}
                  <ScoreRing label="Runtime Score" value={railway.runtime_score} accent="fuchsia" />
                </div>
              </JsonCard>

              <JsonCard title={gateway.title} icon={KeyRound}>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(gateway.endpoints).map(([key, value]) => (
                    <div key={key} className="rounded-xl border border-white/10 bg-slate-900/70 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{key.replace(/_/g, " ")}</p>
                      <p className="mt-2 text-3xl font-black text-white">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-between rounded-xl border border-red-400/20 bg-red-500/10 p-3">
                  <span className="text-sm text-red-100">Gateway risk</span>
                  <Badge className={toneFor(gateway.risk)}>{gateway.risk}</Badge>
                </div>
              </JsonCard>
            </div>

            <JsonCard title="Execution Layer + Runtime Snapshot" icon={Rocket}>
              <div className="grid gap-3 md:grid-cols-3">
                {Object.entries(gxeoneDashboard.execution_layer).map(([key, value]) => (
                  <div key={key} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{key.replace(/_/g, " ")}</p>
                    <p className="mt-2 text-sm font-semibold text-slate-100">{Array.isArray(value) ? value.join(" · ") : value}</p>
                  </div>
                ))}
              </div>
              <pre className="mt-4 max-h-44 overflow-auto rounded-xl border border-cyan-400/20 bg-slate-950/80 p-4 text-xs text-cyan-100">
                {JSON.stringify(runtimeSnapshot, null, 2) || "{}"}
              </pre>
            </JsonCard>
          </div>

          <div className="space-y-6 xl:col-span-4">
            <JsonCard title={monetization.title} icon={DollarSign}>
              <div className="mb-4 text-4xl font-black text-emerald-200">{monetization.score}%</div>
              <div className="space-y-2">
                {monetization.revenue_streams.map((stream) => <Badge key={stream} className="mr-2 mt-2 border-emerald-300/30 bg-emerald-500/10 text-emerald-100">{stream}</Badge>)}
              </div>
              <div className="mt-5 grid gap-2 font-mono text-xs text-slate-300">
                {Object.entries(monetization.pricing_model).map(([key, value]) => (
                  <div key={key} className="flex justify-between rounded-lg bg-slate-900/70 px-3 py-2"><span>{key}</span><span>{value}</span></div>
                ))}
              </div>
            </JsonCard>

            <JsonCard title={health.title} icon={Gauge}>
              <div className="space-y-2">
                {Object.entries(health.components).map(([component, status]) => (
                  <div key={component} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] p-3">
                    <span className="text-sm text-slate-200">{component.replace(/_/g, " ")}</span>
                    <Badge className={toneFor(status)}>{status}</Badge>
                  </div>
                ))}
              </div>
              <div className="mt-4 space-y-2">
                {health.alerts.map((alert) => <p key={alert} className="flex gap-2 text-sm text-yellow-100"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{alert}</p>)}
              </div>
            </JsonCard>

            <JsonCard title={agents.title} icon={Bot}>
              <div className="space-y-3">
                {agents.agents.map((agent) => (
                  <div key={agent.name} className="rounded-xl border border-white/10 bg-slate-900/70 p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm text-white">{agent.name}</span>
                      <Badge className={toneFor(agent.status)}>{agent.status}</Badge>
                    </div>
                    <p className="mt-2 text-xs text-slate-400">ROI {agent.roi.toFixed(1)}x</p>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-sm text-slate-300">Total ROI: <span className="text-cyan-100">{agents.total_roi.toFixed(2)}x</span></p>
            </JsonCard>

            <JsonCard title={ledger.title} icon={Database}>
              <Badge className={toneFor(ledger.status)}>{ledger.status}</Badge>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {Object.entries(ledger.metrics).map(([key, value]) => (
                  <div key={key} className="rounded-xl bg-slate-900/70 p-3">
                    <p className="text-xs text-slate-500">{key.toUpperCase()}</p>
                    <p className="mt-1 font-bold text-white">{formatCurrency(value)}</p>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-sm text-slate-400">{ledger.status_message}</p>
            </JsonCard>

            <JsonCard title={warRoom.title} icon={ShieldAlert}>
              <div className="flex items-center justify-between">
                <Badge className={toneFor(warRoom.mode)}>{warRoom.mode}</Badge>
                <Zap className="h-5 w-5 text-fuchsia-200" />
              </div>
              <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                {Object.entries(warRoom.risk_levels).map(([risk, count]) => (
                  <div key={risk} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                    <p className="text-xl font-black text-white">{count}</p>
                    <p className="text-[10px] uppercase text-slate-500">{risk}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 space-y-2">
                {warRoom.active_alerts.map((alert) => <p key={alert} className="text-sm text-red-100">• {alert}</p>)}
              </div>
            </JsonCard>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-slate-950/70 p-5 backdrop-blur-xl">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.22em] text-cyan-100">
            <Activity className="h-4 w-4" /> Next Step Engine v1
          </div>
          <div className="grid gap-3 md:grid-cols-5">
            {gxeoneDashboard.next_actions.map((action, index) => (
              <div key={action} className="rounded-2xl border border-fuchsia-300/20 bg-fuchsia-500/10 p-4 text-sm text-fuchsia-50">
                <span className="mb-2 block font-mono text-xs text-fuchsia-300">0{index + 1}</span>
                {action}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
