import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  RefreshCw, Activity, Users, Smartphone, TrendingUp, Zap,
  AlertTriangle, CheckCircle, Globe, BarChart2, Shield, Cpu,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

type ProductionStatus = {
  mode: string;
  phase: string;
  services: Record<string, { status: string; uptime?: string; mrr?: number; conversionRate?: string; activeSessions?: number; eventsPerMin?: number; healthScore?: string }>;
  runtimeHealth: string;
};
type Telemetry = {
  activeSessions: number; webSessions: number; mobileSessions: number;
  ctaClicks: number; conversions: number; conversionRate: number;
  avgSessionDuration: number; bounceRate: number;
  topCountries: { country: string; sessions: number }[];
};
type GrowthData = {
  campaigns: { id: string; name: string; channel: string; leads: number; conversions: number; roi: number; score: number; status: string }[];
  summary: { totalLeads: number; totalConversions: number; totalRevenue: number; overallROI: number; topChannel: string };
  viralCoefficient: number;
};
type ConversionLive = {
  conversions: { id: string; source: string; value: number; device: string; timestamp: string }[];
  totalValue: number; avgOrderValue: number; webConversions: number; mobileConversions: number;
  topSource: { source: string; count: number; value: number };
};
type Alert = {
  id: string; level: "info" | "warning" | "critical"; category: string;
  title: string; message: string; timestamp: string; resolved: boolean;
};
type AlertData = { alerts: Alert[]; unresolved: number; critical: number };
type ActivationData = {
  activationStatus: string; overallGrade: string; passCount: number;
  checklist: { item: string; status: string; note?: string }[];
};

function formatBRL(n: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
}
function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

async function fetchJson<T>(path: string): Promise<T | null> {
  try {
    const r = await fetch(`${API_BASE}${path}`);
    if (!r.ok) return null;
    return r.json();
  } catch { return null; }
}

const alertIcon = (level: Alert["level"]) =>
  level === "critical" ? "text-red-500" : level === "warning" ? "text-yellow-500" : "text-blue-500";
const alertBg = (level: Alert["level"]) =>
  level === "critical" ? "bg-red-500/10 border-red-500/30" : level === "warning" ? "bg-yellow-500/10 border-yellow-500/30" : "bg-blue-500/10 border-blue-500/30";
const statusDot = (s: string) =>
  s === "LIVE" || s === "ACTIVE" || s === "STABLE" || s === "PRESERVED" ? "bg-green-500" : s === "DEGRADED" ? "bg-yellow-500" : "bg-red-500";
const checkColor = (s: string) =>
  s === "PASS" ? "text-green-500" : s === "DEGRADED" ? "text-yellow-500" : "text-muted-foreground";

export default function LiveRuntimePage() {
  const [production, setProduction] = useState<ProductionStatus | null>(null);
  const [telemetry, setTelemetry] = useState<Telemetry | null>(null);
  const [growth, setGrowth] = useState<GrowthData | null>(null);
  const [convLive, setConvLive] = useState<ConversionLive | null>(null);
  const [alertData, setAlertData] = useState<AlertData | null>(null);
  const [activation, setActivation] = useState<ActivationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadAll = useCallback(async () => {
    const [p, t, g, c, a, ac] = await Promise.all([
      fetchJson<ProductionStatus>("/api/v1/runtime/production"),
      fetchJson<Telemetry>("/api/v1/telemetry/live"),
      fetchJson<GrowthData>("/api/v1/growth/runtime"),
      fetchJson<ConversionLive>("/api/v1/conversion/live"),
      fetchJson<AlertData>("/api/v1/runtime/alerts?resolved=false"),
      fetchJson<ActivationData>("/api/v1/runtime/activation"),
    ]);
    if (p) setProduction(p);
    if (t) setTelemetry(t);
    if (g) setGrowth(g);
    if (c) setConvLive(c);
    if (a) setAlertData(a);
    if (ac) setActivation(ac);
    setLoading(false);
    setRefreshing(false);
    setLastRefresh(new Date());
  }, []);

  useEffect(() => {
    loadAll();
    timerRef.current = setInterval(() => loadAll(), 30_000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [loadAll]);

  const refresh = () => { setRefreshing(true); loadAll(); };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-muted-foreground">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span>Activating Live Runtime…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            Live Runtime
            <span className="inline-flex items-center gap-1.5 text-xs bg-green-500/15 text-green-500 border border-green-500/30 px-2 py-0.5 rounded-full font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              LIVE
            </span>
          </h1>
          <p className="text-muted-foreground text-sm">
            Phase 8 — Autonomous Commercial Runtime · Last updated {timeAgo(lastRefresh.toISOString())}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Production mode banner */}
      {production && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/30">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm font-bold text-green-500">{production.mode}</span>
          <span className="text-xs text-muted-foreground">{production.phase}</span>
          <Badge variant="outline" className="ml-auto text-xs border-green-500/40 text-green-500">
            {production.runtimeHealth}
          </Badge>
        </div>
      )}

      {/* Service grid */}
      {production && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(production.services).map(([name, svc]) => (
            <Card key={name} className="border-border/50">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-2 h-2 rounded-full ${statusDot(svc.status)}`} />
                  <span className="text-xs text-muted-foreground capitalize">
                    {name.replace(/_/g, " ")}
                  </span>
                </div>
                <p className={`text-sm font-bold ${svc.status === "LIVE" || svc.status === "ACTIVE" || svc.status === "STABLE" || svc.status === "PRESERVED" ? "text-green-500" : "text-yellow-500"}`}>
                  {svc.status}
                </p>
                {svc.uptime && <p className="text-[10px] text-muted-foreground mt-0.5">{svc.uptime}</p>}
                {svc.mrr && <p className="text-[10px] text-muted-foreground mt-0.5">{formatBRL(svc.mrr)}/mo</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Telemetry + conversion live side-by-side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Live Telemetry */}
        {telemetry && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4 text-blue-500" />
                Live User Telemetry
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Active Sessions", value: telemetry.activeSessions, color: "text-blue-500" },
                  { label: "Web", value: telemetry.webSessions, color: "text-foreground" },
                  { label: "Mobile", value: telemetry.mobileSessions, color: "text-purple-500" },
                ].map((m) => (
                  <div key={m.label} className="text-center p-2 rounded-lg bg-muted/20 border border-border/30">
                    <p className={`text-xl font-bold ${m.color}`}>{m.value}</p>
                    <p className="text-[10px] text-muted-foreground">{m.label}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-1.5">
                {[
                  { label: "CTA Clicks", value: telemetry.ctaClicks },
                  { label: "Conversions", value: telemetry.conversions },
                  { label: "Conversion Rate", value: `${telemetry.conversionRate}%` },
                  { label: "Avg Session", value: `${telemetry.avgSessionDuration}s` },
                  { label: "Bounce Rate", value: `${telemetry.bounceRate}%` },
                ].map((row) => (
                  <div key={row.label} className="flex justify-between text-sm border-b border-border/20 pb-1">
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className="font-semibold">{row.value}</span>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">Top Countries</p>
                <div className="flex gap-1.5 flex-wrap">
                  {telemetry.topCountries.map((c) => (
                    <div key={c.country} className="flex items-center gap-1 px-2 py-1 rounded bg-muted/30 border border-border/30">
                      <Globe className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs font-medium">{c.country}</span>
                      <span className="text-[10px] text-muted-foreground">{c.sessions}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Live Conversion Feed */}
        {convLive && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Zap className="h-4 w-4 text-orange-500" />
                Live Conversion Feed
                <Badge className="ml-auto text-xs">{formatBRL(convLive.totalValue)}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-3 gap-2 mb-3">
                {[
                  { label: "Total", value: convLive.conversions.length, color: "text-foreground" },
                  { label: "Web", value: convLive.webConversions, color: "text-blue-500" },
                  { label: "Mobile", value: convLive.mobileConversions, color: "text-purple-500" },
                ].map((m) => (
                  <div key={m.label} className="text-center p-2 rounded-lg bg-muted/20 border border-border/30">
                    <p className={`text-lg font-bold ${m.color}`}>{m.value}</p>
                    <p className="text-[10px] text-muted-foreground">{m.label}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-1.5 max-h-44 overflow-y-auto">
                {convLive.conversions.map((c) => (
                  <div key={c.id} className="flex items-center gap-2 py-1.5 border-b border-border/20">
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${c.device === "mobile" ? "bg-purple-500" : "bg-blue-500"}`} />
                    <span className="text-xs text-muted-foreground flex-1">{c.source}</span>
                    <span className="text-xs font-semibold text-green-500">{formatBRL(c.value)}</span>
                    <span className="text-[10px] text-muted-foreground">{timeAgo(c.timestamp)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Growth Campaigns */}
      {growth && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Growth Intelligence
              <span className="text-xs text-muted-foreground ml-1">
                VC {growth.viralCoefficient}x · {growth.summary.overallROI}% ROI
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground border-b border-border/40">
                    <th className="text-left py-2 font-medium">Campaign</th>
                    <th className="text-left py-2 font-medium">Channel</th>
                    <th className="text-right py-2 font-medium">Leads</th>
                    <th className="text-right py-2 font-medium">Conv.</th>
                    <th className="text-right py-2 font-medium text-green-500">ROI</th>
                    <th className="text-right py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {growth.campaigns.slice(0, 6).map((c) => (
                    <tr key={c.id} className="border-b border-border/20 hover:bg-muted/10">
                      <td className="py-2 font-medium text-xs">{c.name}</td>
                      <td className="py-2 text-xs text-muted-foreground">{c.channel}</td>
                      <td className="py-2 text-right text-xs">{c.leads}</td>
                      <td className="py-2 text-right text-xs">{c.conversions}</td>
                      <td className={`py-2 text-right text-xs font-bold ${c.roi > 200 ? "text-green-500" : c.roi > 0 ? "text-blue-500" : "text-red-500"}`}>
                        {c.roi}%
                      </td>
                      <td className="py-2 text-right">
                        <Badge variant={c.status === "active" ? "default" : "secondary"} className="text-[10px] px-1.5 py-0">
                          {c.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Autonomous Alerts */}
        {alertData && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                Autonomous Alerts
                {alertData.unresolved > 0 && (
                  <Badge variant="outline" className="ml-auto text-xs border-yellow-500/40 text-yellow-500">
                    {alertData.unresolved} unresolved
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {alertData.alerts.length === 0 ? (
                <div className="flex items-center gap-2 text-green-500 text-sm py-2">
                  <CheckCircle className="h-4 w-4" />
                  All systems nominal
                </div>
              ) : (
                alertData.alerts.map((alert) => (
                  <div key={alert.id} className={`p-3 rounded-lg border ${alertBg(alert.level)}`}>
                    <div className="flex items-center gap-2 mb-0.5">
                      <AlertTriangle className={`h-3 w-3 ${alertIcon(alert.level)}`} />
                      <span className={`text-xs font-semibold ${alertIcon(alert.level)}`}>{alert.title}</span>
                      <span className="text-[10px] text-muted-foreground ml-auto">{timeAgo(alert.timestamp)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{alert.message}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        )}

        {/* Activation Checklist */}
        {activation && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="h-4 w-4 text-purple-500" />
                Production Activation
                <Badge variant="outline" className="ml-auto text-xs border-green-500/40 text-green-500">
                  {activation.overallGrade}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {activation.checklist.map((item) => (
                  <div key={item.item} className="flex items-center gap-2 py-1.5 border-b border-border/20 last:border-0">
                    <CheckCircle className={`h-3.5 w-3.5 flex-shrink-0 ${checkColor(item.status)}`} />
                    <span className="text-xs flex-1">{item.item}</span>
                    <span className={`text-[10px] font-semibold ${checkColor(item.status)}`}>
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex gap-4 mt-3 pt-3 border-t border-border/30 text-xs text-muted-foreground">
                <span>Pass: <strong className="text-green-500">{activation.passCount}</strong></span>
                <span>Status: <strong className="text-foreground">{activation.activationStatus}</strong></span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
