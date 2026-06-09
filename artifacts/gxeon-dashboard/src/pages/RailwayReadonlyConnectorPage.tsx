import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  fetchRailwayConnectorActivity,
  fetchRailwayConnectorDiagnostics,
  fetchRailwayConnectorSnapshot,
  railwayReadonlySnapshotFallback,
  type RailwayConnectorActivityEvent,
  type RailwayConnectorDiagnostics,
  type RailwayConnectorSectionError,
  type RailwayReadonlySnapshot,
} from "@/services/railwayConnectorService";
import { AlertTriangle, ArrowLeft, CheckCircle2, Clock3, RefreshCw, ShieldCheck } from "lucide-react";
import { SiRailway } from "react-icons/si";

const statusTone: Record<RailwayReadonlySnapshot["status"], string> = {
  READY: "border-amber-300/30 bg-amber-400/10 text-amber-100",
  CONNECTED_READONLY: "border-emerald-300/30 bg-emerald-400/10 text-emerald-100",
  PARTIAL_READONLY: "border-cyan-300/30 bg-cyan-400/10 text-cyan-100",
  FAILED: "border-red-300/30 bg-red-400/10 text-red-100",
};

function formatDate(value: string | null | undefined): string {
  if (!value) return "not measured";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function errorHint(error: RailwayConnectorSectionError | null): string | null {
  if (!error) return null;
  if (error.hint) return error.hint;
  if (error.code === "MISSING_RAILWAY_TOKEN") return "Add RAILWAY_TOKEN to the backend runtime only.";
  if (error.code === "RAILWAY_403") return "Token is valid but cannot read the selected Railway workspace/project.";
  if (error.code === "RAILWAY_404") return "Verify RAILWAY_PROJECT_ID and RAILWAY_ENVIRONMENT_ID.";
  if (error.code === "RAILWAY_GRAPHQL_ERROR") return "Railway GraphQL returned a read error; check backend connector logs.";
  return error.message;
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="border-white/10 bg-white/[0.035]">
      <CardContent className="p-4">
        <p className="text-2xl font-black text-white">{value}</p>
        <p className="mt-1 text-xs uppercase tracking-[0.2em] text-stone-500">{label}</p>
      </CardContent>
    </Card>
  );
}

export default function RailwayReadonlyConnectorPage() {
  const [snapshot, setSnapshot] = useState<RailwayReadonlySnapshot>(railwayReadonlySnapshotFallback);
  const [diagnostics, setDiagnostics] = useState<RailwayConnectorDiagnostics | null>(null);
  const [activity, setActivity] = useState<RailwayConnectorActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    Promise.all([
      fetchRailwayConnectorSnapshot(controller.signal),
      fetchRailwayConnectorDiagnostics(controller.signal),
      fetchRailwayConnectorActivity(controller.signal),
    ])
      .then(([nextSnapshot, nextDiagnostics, nextActivity]) => {
        setSnapshot(nextSnapshot);
        setDiagnostics(nextDiagnostics);
        setActivity(nextActivity);
      })
      .catch((error) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setSnapshot(railwayReadonlySnapshotFallback);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  const hints = useMemo(
    () =>
      [
        snapshot.lastErrorCode === "MISSING_RAILWAY_TOKEN"
          ? "Missing backend token: add RAILWAY_TOKEN to Railway api-server variables."
          : null,
        diagnostics?.projectIdPresent === false
          ? "No project ID configured: connector reads project list and selects the first project for service metadata."
          : null,
        errorHint(snapshot.projectsError),
        errorHint(snapshot.viewerError),
        errorHint(snapshot.servicesError),
        errorHint(snapshot.deploymentsError),
        errorHint(snapshot.domainsError),
        errorHint(snapshot.envPresenceError),
      ].filter(Boolean) as string[],
    [diagnostics, snapshot],
  );

  return (
    <div className="space-y-5">
      <section className="rounded-[2rem] border border-emerald-300/15 bg-[#070707]/90 p-5 shadow-2xl shadow-black/50">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-emerald-300/30 bg-emerald-400/10 text-emerald-100">
                <SiRailway className="mr-1 h-3 w-3" /> Railway Read-only P0
              </Badge>
              <Badge variant="outline" className={statusTone[snapshot.status]}>
                {snapshot.statusLabel}
              </Badge>
              <Badge variant="outline" className="border-cyan-300/30 text-cyan-100">
                Backend-only token
              </Badge>
            </div>
            <h1 className="mt-4 text-4xl font-black tracking-tight text-white md:text-6xl">
              Railway Connector
            </h1>
            <p className="mt-3 max-w-3xl text-sm text-stone-400">
              Read-only Railway runtime visibility for projects, services, deployments and domains.
              The dashboard never asks for credentials and only calls GXEON backend routes.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/ops/connectors">
              <Button variant="outline" className="border-white/10 bg-white/[0.03] text-white hover:bg-white/10">
                <ArrowLeft className="mr-2 h-4 w-4" /> Gateway
              </Button>
            </Link>
            <Button onClick={() => window.location.reload()} className="bg-emerald-300 text-black hover:bg-emerald-200">
              <RefreshCw className="mr-2 h-4 w-4" /> Refresh
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-7">
        <Metric label="Health" value={`${snapshot.health.healthScore}%`} />
        <Metric label="Projects" value={snapshot.projectCount} />
        <Metric label="Services" value={snapshot.serviceCount} />
        <Metric label="Deployments" value={snapshot.deploymentCount} />
        <Metric label="Failed" value={snapshot.failedDeployments} />
        <Metric label="Running" value={snapshot.runningServices} />
        <Metric label="Domains" value={snapshot.domainCount} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-white/10 bg-[#0b0b0b]">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-white">Services</h2>
                <p className="text-sm text-stone-500">
                  Selected project: {snapshot.selectedProject?.name ?? "not configured / not discovered"}
                </p>
              </div>
              {loading ? <Badge className="bg-white/10 text-white">Loading</Badge> : null}
            </div>
            <div className="mt-4 space-y-3">
              {snapshot.services.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-stone-400">
                  No Railway services were returned by the backend read-only snapshot.
                </div>
              ) : (
                snapshot.services.map((service) => (
                  <div key={service.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-bold text-white">{service.name}</p>
                        <p className="text-xs text-stone-500">Updated {formatDate(service.updatedAt)}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge className="bg-white/10 text-white">{service.status}</Badge>
                        <Badge variant="outline" className="border-cyan-300/30 text-cyan-100">
                          deploy {service.latestDeploymentStatus}
                        </Badge>
                        <Badge variant="outline" className="border-emerald-300/30 text-emerald-100">
                          {service.domainCount} domains
                        </Badge>
                      </div>
                    </div>
                    <p className="mt-2 truncate text-xs text-stone-500">{service.publicUrl ?? "No public URL returned"}</p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-emerald-300/15 bg-emerald-400/5">
            <CardContent className="p-5">
              <h2 className="flex items-center gap-2 text-xl font-black text-white">
                <ShieldCheck className="h-5 w-5 text-emerald-200" /> Runtime Boundary
              </h2>
              <div className="mt-4 space-y-2 text-sm text-stone-300">
                <p>Frontend token storage: {String(snapshot.health.frontendTokenStorage)}</p>
                <p>Provider writes: {String(snapshot.health.providerWrites)}</p>
                <p>Secret exposure: {String(snapshot.health.secretExposure)}</p>
                <p>Command execution: {String(snapshot.health.commandExecution)}</p>
                <p>Last sync: {formatDate(snapshot.health.lastSyncAt)}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-amber-300/15 bg-amber-400/5">
            <CardContent className="p-5">
              <h2 className="flex items-center gap-2 text-xl font-black text-white">
                <AlertTriangle className="h-5 w-5 text-amber-200" /> Diagnostics hints
              </h2>
              <div className="mt-4 space-y-2 text-sm text-stone-300">
                {hints.length === 0 ? (
                  <p>No diagnostics hints. Snapshot is within the read-only boundary.</p>
                ) : (
                  hints.map((hint) => <p key={hint}>• {hint}</p>)
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card className="border-white/10 bg-[#0b0b0b]">
          <CardContent className="p-5">
            <h2 className="flex items-center gap-2 text-xl font-black text-white">
              <Clock3 className="h-5 w-5 text-cyan-200" /> Evidence timeline
            </h2>
            <div className="mt-4 space-y-3">
              {snapshot.evidenceTimeline.map((event) => (
                <div key={event.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-white">{event.title}</p>
                    <Badge variant="outline" className="border-white/10 text-stone-300">{event.type}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-stone-400">{event.description}</p>
                  <p className="mt-2 text-xs text-stone-600">{formatDate(event.occurredAt)} · {event.source}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-[#0b0b0b]">
          <CardContent className="p-5">
            <h2 className="flex items-center gap-2 text-xl font-black text-white">
              <CheckCircle2 className="h-5 w-5 text-emerald-200" /> Activity log
            </h2>
            <div className="mt-4 space-y-3">
              {activity.length === 0 ? (
                <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-stone-400">
                  No activity events yet. Open diagnostics or snapshot to populate safe metadata.
                </p>
              ) : (
                activity.map((event) => (
                  <div key={`${event.timestamp}-${event.eventType}`} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-bold text-white">{event.eventType}</p>
                      <Badge className="bg-white/10 text-white">{event.status}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-stone-500">{formatDate(event.timestamp)} · {event.code ?? "NONE"}</p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
