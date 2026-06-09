import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  connectorGatewayProviders,
  connectorGatewaySafetyRules,
  ecosystemReadiness,
  operationalActivityFeed,
  REAL_DATA_MODE,
  type ConnectorGatewayId,
  type ConnectorGatewayStatus,
} from "@/data/connector-gateway";
import { cn } from "@/lib/utils";
import { fetchGitHubConnectorSnapshot } from "@/services/githubConnectorService";
import { fetchVercelConnectorSnapshot } from "@/services/vercelConnectorService";
import { fetchRailwayConnectorSnapshot } from "@/services/railwayConnectorService";
import { fetchSupabaseConnectorSnapshot } from "@/services/supabaseConnectorService";
import {
  CheckCircle2,
  Eye,
  LockKeyhole,
  Plug,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { FaMicrosoft } from "react-icons/fa";
import { SiGithub, SiRailway, SiSupabase, SiVercel } from "react-icons/si";

const connectorRoutes: Record<ConnectorGatewayId, string> = {
  github: "/ops/connectors/github",
  vercel: "/ops/connectors/vercel",
  railway: "/ops/connectors/railway",
  supabase: "/ops/connectors/supabase",
  microsoft365: "/ops/connectors/m365",
};

const statusTone: Record<ConnectorGatewayStatus, string> = {
  NOT_CONFIGURED: "border-stone-400/25 bg-stone-500/10 text-stone-200",
  READY: "border-amber-300/30 bg-amber-400/10 text-amber-100",
  CONNECTING: "border-cyan-300/30 bg-cyan-400/10 text-cyan-100",
  CONNECTED: "border-emerald-300/30 bg-emerald-400/10 text-emerald-100",
  ERROR: "border-red-300/30 bg-red-400/10 text-red-100",
  LOCKED: "border-stone-400/25 bg-stone-500/10 text-stone-200",
};

const brandIcon: Record<ConnectorGatewayId, typeof SiGithub> = {
  github: SiGithub,
  vercel: SiVercel,
  railway: SiRailway,
  supabase: SiSupabase,
  microsoft365: FaMicrosoft,
};

function formatSync(value: string | null | undefined): string | null {
  if (!value) return null;
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function ConnectorGatewayPage() {
  const [location] = useLocation();
  const [githubGatewayOverride, setGithubGatewayOverride] = useState<{
    status: ConnectorGatewayStatus;
    lastSync: string | null;
    healthScore: number;
  } | null>(null);
  const [vercelGatewayOverride, setVercelGatewayOverride] = useState<{
    status: ConnectorGatewayStatus;
    lastSync: string | null;
    healthScore: number;
  } | null>(null);
  const [railwayGatewayOverride, setRailwayGatewayOverride] = useState<{
    status: ConnectorGatewayStatus;
    lastSync: string | null;
    healthScore: number;
  } | null>(null);
  const [supabaseGatewayOverride, setSupabaseGatewayOverride] = useState<{
    status: ConnectorGatewayStatus;
    lastSync: string | null;
    healthScore: number;
  } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchGitHubConnectorSnapshot(controller.signal)
      .then((snapshot) => {
        if (snapshot.status === "CONNECTED_READONLY") {
          setGithubGatewayOverride({
            status: "CONNECTED",
            lastSync: formatSync(snapshot.health.lastSyncAt),
            healthScore: 100,
          });
          return;
        }
        setGithubGatewayOverride({
          status: "READY",
          lastSync: null,
          healthScore: 0,
        });
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setGithubGatewayOverride({
            status: "READY",
            lastSync: null,
            healthScore: 0,
          });
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchVercelConnectorSnapshot(controller.signal)
      .then((snapshot) => {
        if (snapshot.status === "CONNECTED_READONLY") {
          setVercelGatewayOverride({
            status: "CONNECTED",
            lastSync: formatSync(snapshot.health.lastSyncAt),
            healthScore: snapshot.health.healthScore,
          });
          return;
        }
        setVercelGatewayOverride({
          status: "READY",
          lastSync: null,
          healthScore: 0,
        });
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setVercelGatewayOverride({
            status: "READY",
            lastSync: null,
            healthScore: 0,
          });
      });
    return () => controller.abort();
  }, []);


  useEffect(() => {
    const controller = new AbortController();
    fetchRailwayConnectorSnapshot(controller.signal)
      .then((snapshot) => {
        if (snapshot.status === "CONNECTED_READONLY" || snapshot.status === "PARTIAL_READONLY") {
          setRailwayGatewayOverride({
            status: "CONNECTED",
            lastSync: formatSync(snapshot.health.lastSyncAt),
            healthScore: snapshot.health.healthScore,
          });
          return;
        }
        setRailwayGatewayOverride({
          status: "READY",
          lastSync: null,
          healthScore: 0,
        });
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setRailwayGatewayOverride({
            status: "READY",
            lastSync: null,
            healthScore: 0,
          });
      });
    return () => controller.abort();
  }, []);


  useEffect(() => {
    const controller = new AbortController();
    fetchSupabaseConnectorSnapshot(controller.signal)
      .then((snapshot) => {
        if (snapshot.status === "CONNECTED_READONLY" || snapshot.status === "PARTIAL_READONLY") {
          setSupabaseGatewayOverride({
            status: "CONNECTED",
            lastSync: formatSync(snapshot.health.lastSyncAt),
            healthScore: snapshot.health.healthScore,
          });
          return;
        }
        setSupabaseGatewayOverride({
          status: "READY",
          lastSync: null,
          healthScore: 0,
        });
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setSupabaseGatewayOverride({
            status: "READY",
            lastSync: null,
            healthScore: 0,
          });
      });
    return () => controller.abort();
  }, []);

  const gatewayProviders = useMemo(
    () =>
      connectorGatewayProviders.map((connector) => {
        if (connector.id === "github" && githubGatewayOverride) {
          return {
            ...connector,
            status: githubGatewayOverride.status,
            lastSync: githubGatewayOverride.lastSync,
            healthScore: githubGatewayOverride.healthScore,
          };
        }
        if (connector.id === "vercel" && vercelGatewayOverride) {
          return {
            ...connector,
            status: vercelGatewayOverride.status,
            lastSync: vercelGatewayOverride.lastSync,
            healthScore: vercelGatewayOverride.healthScore,
          };
        }
        if (connector.id === "railway" && railwayGatewayOverride) {
          return {
            ...connector,
            status: railwayGatewayOverride.status,
            lastSync: railwayGatewayOverride.lastSync,
            healthScore: railwayGatewayOverride.healthScore,
          };
        }
        if (connector.id === "supabase" && supabaseGatewayOverride) {
          return {
            ...connector,
            status: supabaseGatewayOverride.status,
            lastSync: supabaseGatewayOverride.lastSync,
            healthScore: supabaseGatewayOverride.healthScore,
          };
        }
        return connector;
      }),
    [githubGatewayOverride, vercelGatewayOverride, railwayGatewayOverride, supabaseGatewayOverride],
  );

  return (
    <div className="space-y-5">
      <section className="rounded-[2rem] border border-amber-300/15 bg-[#070707]/90 p-5 shadow-2xl shadow-black/50">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-amber-300/30 bg-amber-400/10 text-amber-100">
                <Plug className="mr-1 h-3 w-3" /> Connector Hub
              </Badge>
              <Badge
                variant="outline"
                className="border-emerald-300/30 text-emerald-100"
              >
                <ShieldCheck className="mr-1 h-3 w-3" /> No secrets in frontend
              </Badge>
              <Badge
                variant="outline"
                className="border-cyan-300/30 text-cyan-100"
              >
                {REAL_DATA_MODE.dashboardMode}
              </Badge>
            </div>
            <h1 className="mt-4 text-4xl font-black tracking-tight text-white md:text-6xl">
              Mission Control
            </h1>
            <p className="mt-3 max-w-3xl text-sm text-stone-400">
              Conectores no topo do ecossistema, com status engine real-ready,
              health layer, readiness geral e feed operacional vazio até eventos
              reais.
            </p>
          </div>
          <div className="grid grid-cols-4 gap-2 text-white">
            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
              <p className="text-2xl font-black">
                {ecosystemReadiness.providers}
              </p>
              <p className="text-xs text-stone-400">Providers</p>
            </div>
            <div className="rounded-2xl border border-amber-300/15 bg-amber-400/10 p-3">
              <p className="text-2xl font-black">{ecosystemReadiness.ready}</p>
              <p className="text-xs text-amber-100">Ready</p>
            </div>
            <div className="rounded-2xl border border-emerald-300/15 bg-emerald-400/10 p-3">
              <p className="text-2xl font-black">
                {ecosystemReadiness.connected}
              </p>
              <p className="text-xs text-emerald-100">Connected</p>
            </div>
            <div className="rounded-2xl border border-cyan-300/15 bg-cyan-400/10 p-3">
              <p className="text-2xl font-black">0%</p>
              <p className="text-xs text-cyan-100">Health</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {gatewayProviders.map((connector) => {
          const href = connectorRoutes[connector.id];
          const active = location === href;
          const connected = connector.status === "CONNECTED";
          const BrandIcon = brandIcon[connector.id];
          return (
            <Link key={connector.id} href={href}>
              <Card
                className={cn(
                  "group h-full cursor-pointer overflow-hidden border-white/10 bg-[#090909]/85 text-white transition duration-200 hover:-translate-y-1 hover:border-amber-300/35 hover:bg-amber-400/[0.08]",
                  active && "border-amber-300/45 bg-amber-400/10",
                  connected && "border-emerald-300/35",
                )}
              >
                <CardContent className="flex h-full flex-col p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white text-black">
                      <BrandIcon className="h-6 w-6" />
                    </div>
                    <Badge
                      variant="outline"
                      className={cn("border", statusTone[connector.status])}
                    >
                      {connector.status.replaceAll("_", " ")}
                    </Badge>
                  </div>
                  <h2 className="mt-6 text-2xl font-black">
                    {connector.officialBrand}
                  </h2>
                  <p className="mt-2 text-xs text-stone-500">
                    {connector.purpose}
                  </p>
                  <div className="mt-5 grid gap-3 text-sm">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <span className="text-stone-500">Health score</span>
                      <span className="font-semibold">
                        {connector.healthScore}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <span className="text-stone-500">Last sync</span>
                      <span className="font-semibold">
                        {connector.lastSync ?? "never"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <span className="text-stone-500">Credentials</span>
                      <span className="font-semibold">backend only</span>
                    </div>
                  </div>
                  <div className="mt-auto grid grid-cols-3 gap-2 pt-5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-amber-300/25 bg-amber-400/10 text-amber-100 hover:bg-amber-400/20"
                    >
                      <Eye className="mr-1 h-3 w-3" />
                      {connector.id === "github" ? "Connect" : "Open"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-cyan-300/20 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/20"
                    >
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      {connector.id === "github" ? "Details" : "Ready"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-white/10 bg-white/[0.035] text-stone-200 hover:bg-white/10"
                    >
                      <Wrench className="mr-1 h-3 w-3" />
                      Prepare
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
        <Card className="border-white/10 bg-[#090909]/85 text-white">
          <CardContent className="p-5">
            <h2 className="text-lg font-bold">Operational Activity Feed</h2>
            <p className="mt-3 rounded-2xl border border-dashed border-white/10 p-5 text-sm text-stone-400">
              {operationalActivityFeed.length === 0
                ? "EMPTY_REAL_DATA: nenhum evento de operador, conexão, deploy ou sincronização real registrado."
                : "Events available"}
            </p>
          </CardContent>
        </Card>
        <Card className="border-white/10 bg-[#090909]/85 text-white">
          <CardContent className="p-5">
            <h2 className="text-lg font-bold">System Health Center</h2>
            <div className="mt-4 grid gap-2 text-sm">
              {gatewayProviders.map((connector) => (
                <div
                  key={connector.id}
                  className="flex items-center justify-between border-b border-white/10 pb-2"
                >
                  <span>{connector.name} Health</span>
                  <span>{connector.healthScore}%</span>
                </div>
              ))}
              <div className="flex items-center justify-between pt-2 font-black text-emerald-100">
                <span>Global Health Score</span>
                <span>{ecosystemReadiness.globalHealthScore}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-3 md:grid-cols-5">
        {connectorGatewaySafetyRules.map((rule) => (
          <div
            key={rule}
            className="flex items-center gap-3 rounded-2xl border border-emerald-300/15 bg-emerald-400/[0.06] p-4 text-sm font-semibold text-emerald-50"
          >
            <LockKeyhole className="h-4 w-4 text-emerald-200" />
            {rule}
          </div>
        ))}
      </section>
    </div>
  );
}
