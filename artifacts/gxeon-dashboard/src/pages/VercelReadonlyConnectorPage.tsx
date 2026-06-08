import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  fetchVercelConnectorActivity,
  fetchVercelConnectorDiagnostics,
  fetchVercelConnectorSnapshot,
  vercelReadonlySnapshotFallback,
  type VercelConnectorActivityEvent,
  type VercelConnectorDiagnostics,
  type VercelReadonlySnapshot,
} from "@/services/vercelConnectorService";
import {
  Activity,
  CheckCircle2,
  Clock3,
  Globe2,
  LockKeyhole,
  Rocket,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { SiVercel } from "react-icons/si";

function formatDate(value: string | null | undefined): string {
  if (!value) return "Not synced";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusTone(status: string): string {
  if (status === "CONNECTED_READONLY" || status === "READY") {
    return "border-emerald-300/30 bg-emerald-400/10 text-emerald-100";
  }
  if (status === "FAILED") return "border-red-300/30 bg-red-400/10 text-red-100";
  return "border-amber-300/30 bg-amber-400/10 text-amber-100";
}

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: typeof Rocket;
}) {
  return (
    <Card className="border-white/10 bg-[#080808]/90 text-white shadow-xl shadow-black/30">
      <CardContent className="p-5">
        <Icon className="h-5 w-5 text-white" />
        <p className="mt-4 text-xs uppercase tracking-[0.24em] text-stone-500">{label}</p>
        <p className="mt-2 text-3xl font-black">{value}</p>
        <p className="mt-2 text-xs text-stone-400">{detail}</p>
      </CardContent>
    </Card>
  );
}

export default function VercelReadonlyConnectorPage() {
  const [snapshot, setSnapshot] = useState<VercelReadonlySnapshot>(
    vercelReadonlySnapshotFallback,
  );
  const [diagnostics, setDiagnostics] =
    useState<VercelConnectorDiagnostics | null>(null);
  const [activityEvents, setActivityEvents] = useState<
    VercelConnectorActivityEvent[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    Promise.all([
      fetchVercelConnectorSnapshot(controller.signal),
      fetchVercelConnectorDiagnostics(controller.signal),
      fetchVercelConnectorActivity(controller.signal),
    ])
      .then(([snapshotData, diagnosticsData, activityData]) => {
        setSnapshot(snapshotData);
        setDiagnostics(diagnosticsData);
        setActivityEvents(activityData);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  const deploymentStatus = useMemo(() => {
    const latest = snapshot.latestDeployments[0];
    if (!latest) return "Awaiting backend-confirmed snapshot";
    return `${latest.state} · ${latest.target ?? "unknown"} · ${formatDate(latest.createdAt)}`;
  }, [snapshot.latestDeployments]);

  const safeProductionUrl = snapshot.projects.find(
    (project) => project.productionUrl,
  )?.productionUrl;

  return (
    <div className="space-y-5 text-white">
      <section className="rounded-[2rem] border border-white/10 bg-[#050505]/95 p-6 shadow-2xl shadow-black/50">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-white/20 bg-white/10 text-white">
                <SiVercel className="mr-1 h-3 w-3" /> Vercel Connector P0
              </Badge>
              <Badge className={statusTone(snapshot.status)}>
                {loading ? "LOADING" : snapshot.status}
              </Badge>
              <Badge variant="outline" className="border-cyan-300/30 text-cyan-100">
                Backend-only token · read-only
              </Badge>
            </div>
            <h1 className="mt-4 text-4xl font-black tracking-tight md:text-6xl">
              Vercel Read-Only Connector
            </h1>
            <p className="mt-3 max-w-3xl text-sm text-stone-400">
              Reads Vercel projects, deployments, domains and aliases only through
              GXEON Railway api-server. The dashboard never accepts, stores or sends
              Vercel credentials.
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 text-right">
            <p className="text-xs uppercase tracking-[0.24em] text-stone-500">Health score</p>
            <p className="mt-2 text-5xl font-black">{snapshot.health.healthScore}%</p>
            <p className="mt-2 text-xs text-stone-400">Last sync {formatDate(snapshot.health.lastSyncAt)}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Projects" value={snapshot.totalProjects} detail="read from backend snapshot" icon={Rocket} />
        <MetricCard label="Production ready" value={snapshot.productionReady} detail="latest production deployments" icon={CheckCircle2} />
        <MetricCard label="Failed 24h" value={snapshot.failedLast24h} detail="recent failed deployments" icon={TriangleAlert} />
        <MetricCard label="Domains" value={snapshot.domainsConfigured} detail="configured project domains" icon={Globe2} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-white/10 bg-[#080808]/90 text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Rocket className="h-5 w-5" /> Deployment status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-stone-500">Latest deployment</p>
              <p className="mt-2 text-lg font-bold">{deploymentStatus}</p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-stone-500">Production URL</p>
                <p className="mt-2 break-all text-sm text-stone-200">
                  {safeProductionUrl ?? "Hidden until backend snapshot confirms safe URL"}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-stone-500">Preview count</p>
                <p className="mt-2 text-2xl font-black">{snapshot.previewCount}</p>
              </div>
            </div>
            <div className="space-y-2">
              {snapshot.latestDeployments.slice(0, 6).map((deployment) => (
                <div key={deployment.id} className="flex flex-col gap-1 rounded-2xl border border-white/10 bg-black/20 p-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-semibold">{deployment.name}</p>
                    <p className="text-xs text-stone-500">{deployment.target ?? "unknown"} · {formatDate(deployment.createdAt)}</p>
                  </div>
                  <Badge className={statusTone(deployment.state)}>{deployment.state}</Badge>
                </div>
              ))}
              {snapshot.latestDeployments.length === 0 && (
                <p className="rounded-2xl border border-amber-300/20 bg-amber-400/10 p-4 text-sm text-amber-100">
                  No deployment data yet. Add VERCEL_TOKEN to Railway api-server to activate real reads.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-300/15 bg-[#071009]/90 text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-200" /> Safety boundary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-stone-300">
            <p><LockKeyhole className="mr-2 inline h-4 w-4 text-emerald-200" />No credential UI and no frontend token storage.</p>
            <p><ShieldCheck className="mr-2 inline h-4 w-4 text-emerald-200" />Provider writes disabled: {String(snapshot.health.providerWrites)}.</p>
            <p><ShieldCheck className="mr-2 inline h-4 w-4 text-emerald-200" />Secret exposure disabled: {String(snapshot.health.secretExposure)}.</p>
            <p><Clock3 className="mr-2 inline h-4 w-4 text-emerald-200" />Diagnostics route: {diagnostics?.routeStatus ?? "UNREACHABLE"}.</p>
            <p className="rounded-2xl border border-white/10 bg-black/30 p-3 text-xs text-stone-400">
              Status remains READY when the backend token is missing and becomes CONNECTED_READONLY only after backend snapshot confirms Vercel data.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Card className="border-white/10 bg-[#080808]/90 text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" /> Activity logs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {activityEvents.slice(0, 10).map((event) => (
              <div key={`${event.timestamp}-${event.eventType}`} className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold">{event.eventType}</p>
                  <Badge className={statusTone(event.status)}>{event.status}</Badge>
                </div>
                <p className="mt-1 text-xs text-stone-500">{formatDate(event.timestamp)} · {event.code ?? "NO_CODE"}</p>
              </div>
            ))}
            {activityEvents.length === 0 && <p className="text-sm text-stone-400">No backend activity recorded yet.</p>}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-[#080808]/90 text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock3 className="h-5 w-5" /> Evidence timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {snapshot.evidenceTimeline.map((item) => (
              <div key={item.id} className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
                <p className="font-semibold">{item.title}</p>
                <p className="mt-1 text-sm text-stone-400">{item.description}</p>
                <p className="mt-2 text-xs text-stone-500">{formatDate(item.occurredAt)} · {item.source}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
