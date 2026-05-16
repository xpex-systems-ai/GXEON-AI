import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  RefreshCw,
  TrendingUp,
  Users,
  Zap,
  DollarSign,
  Target,
  Activity,
  ArrowRight,
  BarChart2,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

type FunnelStage = {
  id: string;
  name: string;
  count: number;
  dropoff: number;
  conversionRate: number;
};
type Telemetry = {
  totalLeads: number;
  convertedLeads: number;
  hotLeads: number;
  conversionRate: number;
  totalPipelineRevenue: number;
  avgLeadScore: number;
  avgOrderValue: number;
  ctaClickRate: number;
  emailOpenRate: number;
};
type Lead = {
  id: string;
  source: string;
  score: number;
  intent: string;
  status: string;
  value: number;
};
type Opportunity = {
  leadId: string;
  source: string;
  score: number;
  estimatedValue: number;
  urgency: string;
  recommendation: string;
};
type Projection = {
  period: string;
  projected: number;
  conservative: number;
  optimistic: number;
};
type Runtime = {
  status: string;
  mode: string;
  engines: Record<string, string>;
  metrics: Record<string, number>;
  uptime: string;
};

function formatBRL(n: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
}

async function fetchJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}${path}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } catch {
    return null;
  }
}

export default function ConversionPage() {
  const [funnels, setFunnels] = useState<{
    stages: FunnelStage[];
    overallConversionRate: number;
  } | null>(null);
  const [telemetry, setTelemetry] = useState<Telemetry | null>(null);
  const [leads, setLeads] = useState<{
    leads: Lead[];
    summary: Record<string, number>;
  } | null>(null);
  const [opportunities, setOpportunities] = useState<{
    opportunities: Opportunity[];
  } | null>(null);
  const [forecast, setForecast] = useState<{
    projections: Projection[];
    currentMRR: number;
    growthRate: number;
  } | null>(null);
  const [runtime, setRuntime] = useState<Runtime | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAll = async () => {
    const [f, t, l, o, fc, rt] = await Promise.all([
      fetchJson<typeof funnels>("/api/v1/conversion/funnels"),
      fetchJson<Telemetry>("/api/v1/conversion/telemetry"),
      fetchJson<typeof leads>("/api/v1/conversion/leads?limit=8"),
      fetchJson<typeof opportunities>("/api/v1/conversion/opportunities"),
      fetchJson<typeof forecast>("/api/v1/conversion/forecast"),
      fetchJson<Runtime>("/api/v1/conversion/runtime"),
    ]);
    if (f) setFunnels(f);
    if (t) setTelemetry(t);
    if (l) setLeads(l);
    if (o) setOpportunities(o);
    if (fc) setForecast(fc);
    if (rt) setRuntime(rt);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const refresh = () => {
    setRefreshing(true);
    loadAll();
  };

  const intentColor = (i: string) =>
    i === "hot" ? "destructive" : i === "warm" ? "outline" : "secondary";
  const urgencyColor = (u: string) =>
    u === "critical" ? "destructive" : u === "high" ? "outline" : "secondary";
  const engineDot = (s: string) =>
    s === "ONLINE" || s === "ACTIVE" || s === "ADAPTIVE" ? "bg-green-500" : "bg-yellow-500";
  const engineText = (s: string) =>
    s === "ONLINE" || s === "ACTIVE" || s === "ADAPTIVE"
      ? "text-green-500"
      : "text-yellow-500";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-muted-foreground">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span>Loading Conversion Center…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Conversion Center</h1>
          <p className="text-muted-foreground text-sm">
            GXEON Phase 7 — Autonomous Revenue Operating System
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Runtime Status Banner */}
      {runtime && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/30">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm font-semibold text-green-500">{runtime.mode}</span>
          <span className="text-xs text-muted-foreground ml-auto">Uptime: {runtime.uptime}</span>
        </div>
      )}

      {/* KPI Metrics */}
      {telemetry && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: "Pipeline Revenue",
              value: formatBRL(telemetry.totalPipelineRevenue),
              icon: DollarSign,
              accent: "text-green-500",
            },
            {
              label: "Conversion Rate",
              value: `${telemetry.conversionRate}%`,
              icon: Target,
              accent: "text-blue-500",
            },
            {
              label: "Hot Leads",
              value: String(telemetry.hotLeads),
              icon: Zap,
              accent: "text-orange-500",
            },
            {
              label: "Avg Lead Score",
              value: String(telemetry.avgLeadScore),
              icon: Activity,
              accent: "text-purple-500",
            },
          ].map((m) => (
            <Card key={m.label} className="border-border/50">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">
                    {m.label}
                  </span>
                  <m.icon className={`h-4 w-4 ${m.accent}`} />
                </div>
                <p className={`text-2xl font-bold ${m.accent}`}>{m.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Funnel Visualization */}
      {funnels && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart2 className="h-4 w-4 text-primary" />
              Live Conversion Funnel
              <Badge variant="outline" className="ml-auto text-xs">
                {funnels.overallConversionRate}% end-to-end
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1 overflow-x-auto pb-2">
              {funnels.stages.map((stage, i) => {
                const maxCount = funnels.stages[0].count;
                const widthPct = Math.max((stage.count / maxCount) * 100, 12);
                return (
                  <div key={stage.id} className="flex items-center gap-1 flex-shrink-0">
                    <div className="text-center" style={{ width: `${Math.max(widthPct, 80)}px` }}>
                      <div
                        className="rounded bg-primary/20 border border-primary/40 flex items-center justify-center text-xs font-bold text-primary mb-1"
                        style={{ height: `${Math.max(40, widthPct * 0.7)}px` }}
                      >
                        {stage.count}
                      </div>
                      <p className="text-[10px] text-muted-foreground leading-tight">
                        {stage.name}
                      </p>
                      {i > 0 && (
                        <p className="text-[10px] text-green-500 font-semibold">
                          {stage.conversionRate.toFixed(0)}%
                        </p>
                      )}
                    </div>
                    {i < funnels.stages.length - 1 && (
                      <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Opportunities */}
        {opportunities && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Zap className="h-4 w-4 text-orange-500" />
                Top Opportunities
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {opportunities.opportunities.slice(0, 5).map((opp) => (
                <div
                  key={opp.leadId}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/40"
                >
                  <div className="text-center min-w-[36px]">
                    <p className="text-lg font-bold text-primary">{opp.score}</p>
                    <p className="text-[10px] text-muted-foreground">score</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Badge
                        variant={urgencyColor(opp.urgency) as any}
                        className="text-[10px] px-1.5 py-0"
                      >
                        {opp.urgency}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{opp.source}</span>
                    </div>
                    <p className="text-xs text-foreground/80 leading-tight">
                      {opp.recommendation}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-green-500 whitespace-nowrap">
                    {formatBRL(opp.estimatedValue)}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Recent Leads */}
        {leads && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4 text-blue-500" />
                Recent Leads
                <Badge className="ml-auto">{leads.summary.total} total</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {leads.leads.map((lead) => (
                <div
                  key={lead.id}
                  className="flex items-center gap-3 py-2 border-b border-border/30 last:border-0"
                >
                  <div
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      lead.intent === "hot"
                        ? "bg-orange-500"
                        : lead.intent === "warm"
                          ? "bg-yellow-500"
                          : "bg-muted-foreground"
                    }`}
                  />
                  <span className="text-xs text-muted-foreground flex-1">{lead.source}</span>
                  <Badge
                    variant={intentColor(lead.intent) as any}
                    className="text-[10px] px-1.5 py-0"
                  >
                    {lead.intent}
                  </Badge>
                  <span className="text-xs font-semibold w-8 text-right">{lead.score}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Revenue Forecast */}
      {forecast && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Revenue Forecast
              <span className="text-xs text-muted-foreground ml-2">
                +{forecast.growthRate}% MoM growth
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground border-b border-border/40">
                    <th className="text-left py-2 font-medium">Period</th>
                    <th className="text-right py-2 font-medium">Conservative</th>
                    <th className="text-right py-2 font-medium text-primary">Projected</th>
                    <th className="text-right py-2 font-medium text-green-500">Optimistic</th>
                  </tr>
                </thead>
                <tbody>
                  {forecast.projections.map((p) => (
                    <tr key={p.period} className="border-b border-border/20 hover:bg-muted/20">
                      <td className="py-2 font-medium">{p.period}</td>
                      <td className="py-2 text-right text-muted-foreground text-xs">
                        {formatBRL(p.conservative)}
                      </td>
                      <td className="py-2 text-right font-semibold text-primary">
                        {formatBRL(p.projected)}
                      </td>
                      <td className="py-2 text-right text-green-500 text-xs">
                        {formatBRL(p.optimistic)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Engine Status */}
      {runtime && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-purple-500" />
              Conversion Runtime Engines
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Object.entries(runtime.engines).map(([name, status]) => (
                <div
                  key={name}
                  className="flex items-center gap-2 p-3 rounded-lg bg-muted/20 border border-border/30"
                >
                  <div className={`w-2 h-2 rounded-full ${engineDot(status)}`} />
                  <div>
                    <p className="text-xs font-medium leading-tight">
                      {name.replace(/([A-Z])/g, " $1").trim()}
                    </p>
                    <p className={`text-[10px] font-semibold ${engineText(status)}`}>{status}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-4 mt-3 pt-3 border-t border-border/30 text-xs text-muted-foreground">
              <span>
                Leads today:{" "}
                <strong className="text-foreground">{runtime.metrics.leadsProcessedToday}</strong>
              </span>
              <span>
                Conversions today:{" "}
                <strong className="text-foreground">
                  {runtime.metrics.conversionEventsToday}
                </strong>
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
