import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  fetchSupabaseConnectorActivity,
  fetchSupabaseConnectorDiagnostics,
  fetchSupabaseConnectorSnapshot,
  supabaseReadonlySnapshotFallback,
  type SupabaseConnectorActivityEvent,
  type SupabaseConnectorDiagnostics,
  type SupabaseReadonlySnapshot,
} from "@/services/supabaseConnectorService";
import {
  Activity,
  CheckCircle2,
  Clock3,
  Database,
  Eye,
  HardDrive,
  LockKeyhole,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { SiSupabase } from "react-icons/si";

function formatDate(value: string | null | undefined): string {
  if (!value) return "Not synced";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusTone(status: string): string {
  if (status === "CONNECTED_READONLY" || status === "PARTIAL_READONLY") {
    return "border-emerald-300/30 bg-emerald-400/10 text-emerald-100";
  }
  if (status === "READY") return "border-amber-300/30 bg-amber-400/10 text-amber-100";
  if (status === "FAILED") return "border-red-300/30 bg-red-400/10 text-red-100";
  return "border-stone-300/30 bg-stone-400/10 text-stone-100";
}

function boolLabel(value: boolean): string {
  return value ? "ready" : "pending";
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
  icon: typeof Database;
}) {
  return (
    <Card className="border-white/10 bg-[#080808]/90 text-white shadow-xl shadow-black/30">
      <CardContent className="p-5">
        <Icon className="h-5 w-5 text-emerald-200" />
        <p className="mt-4 text-xs uppercase tracking-[0.24em] text-stone-500">{label}</p>
        <p className="mt-2 text-3xl font-black">{value}</p>
        <p className="mt-2 text-xs text-stone-400">{detail}</p>
      </CardContent>
    </Card>
  );
}

export default function SupabaseReadonlyConnectorPage() {
  const [snapshot, setSnapshot] = useState<SupabaseReadonlySnapshot>(
    supabaseReadonlySnapshotFallback,
  );
  const [diagnostics, setDiagnostics] =
    useState<SupabaseConnectorDiagnostics | null>(null);
  const [activityEvents, setActivityEvents] = useState<
    SupabaseConnectorActivityEvent[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    Promise.all([
      fetchSupabaseConnectorSnapshot(controller.signal),
      fetchSupabaseConnectorDiagnostics(controller.signal),
      fetchSupabaseConnectorActivity(controller.signal),
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

  const primarySectionError =
    snapshot.restError ??
    snapshot.authError ??
    snapshot.storageError ??
    snapshot.databaseMetadataError ??
    snapshot.rlsMetadataError;

  const diagnosticsHints = useMemo(() => {
    if (!snapshot.configured) {
      return [
        "Add SUPABASE_URL and SUPABASE_ANON_KEY only to Railway api-server variables.",
        "Optionally add SUPABASE_SERVICE_ROLE_KEY in backend variables for bucket metadata where required.",
        "Optionally add SUPABASE_DB_URL only in backend runtime for metadata posture readiness signals.",
      ];
    }
    if (primarySectionError) {
      return [
        primarySectionError.hint ?? primarySectionError.message,
        "Keep all fixes in backend runtime variables; do not add Supabase credentials to Vite env.",
      ];
    }
    return [
      "Backend read-only snapshot is available; no credential UI, SQL editor or row viewer is enabled.",
      "P0 returns metadata counts and readiness signals only.",
    ];
  }, [primarySectionError, snapshot.configured]);

  return (
    <div className="space-y-5 text-white">
      <section className="rounded-[2rem] border border-emerald-300/15 bg-[#050505]/95 p-6 shadow-2xl shadow-black/50">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-emerald-300/30 bg-emerald-400/10 text-emerald-100">
                <SiSupabase className="mr-1 h-3 w-3" /> Supabase Connector P0
              </Badge>
              <Badge className={statusTone(snapshot.status)}>
                {loading ? "LOADING" : snapshot.status}
              </Badge>
              <Badge variant="outline" className="border-cyan-300/30 text-cyan-100">
                Backend-only credentials · read-only
              </Badge>
            </div>
            <h1 className="mt-4 text-4xl font-black tracking-tight md:text-6xl">
              Supabase Read-Only Connector
            </h1>
            <p className="mt-3 max-w-3xl text-sm text-stone-400">
              Reads Supabase REST, auth, storage and safe database metadata signals
              only through GXEON api-server. The dashboard has no credential entry,
              table row viewer, SQL editor or provider write action.
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
        <MetricCard label="REST" value={boolLabel(snapshot.restReachable)} detail="PostgREST metadata endpoint" icon={CheckCircle2} />
        <MetricCard label="Storage" value={boolLabel(snapshot.storageReachable)} detail={`${snapshot.bucketCount ?? 0} bucket metadata records`} icon={HardDrive} />
        <MetricCard label="Database" value={boolLabel(snapshot.dbMetadataReachable)} detail={`${snapshot.tableCount ?? 0} table metadata count`} icon={Database} />
        <MetricCard label="RLS posture" value={snapshot.rlsMissingTables ?? "metadata"} detail="missing-table count when safe" icon={ShieldCheck} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-white/10 bg-[#080808]/90 text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" /> Runtime boundary
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {[
              ["SUPABASE_URL", snapshot.urlConfigured],
              ["SUPABASE_ANON_KEY", snapshot.anonConfigured],
              ["Service role backend-only", snapshot.serviceRoleConfigured],
              ["DB URL backend-only", snapshot.dbUrlConfigured],
              ["Frontend service role storage", snapshot.health.frontendServiceRoleStorage],
              ["Provider writes", snapshot.health.providerWrites],
              ["Provider migrations", snapshot.health.migrations],
              ["Secret exposure", snapshot.health.secretExposure],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-stone-500">{label}</p>
                <p className="mt-2 text-lg font-bold">{String(value)}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-[#080808]/90 text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TriangleAlert className="h-5 w-5" /> Diagnostics hints
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-stone-500">Last error</p>
              <p className="mt-2 font-bold">{snapshot.lastErrorCode}</p>
              <p className="mt-2 text-xs text-stone-400">
                Probe: {diagnostics?.readProbe?.stage ?? "not attempted"} · Status: {diagnostics?.readProbe?.status ?? "n/a"}
              </p>
            </div>
            {diagnosticsHints.map((hint) => (
              <div key={hint} className="rounded-2xl border border-amber-300/15 bg-amber-400/10 p-3 text-sm text-amber-50">
                {hint}
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Card className="border-white/10 bg-[#080808]/90 text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock3 className="h-5 w-5" /> Evidence timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {snapshot.evidenceTimeline.map((event) => (
              <div key={event.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">{event.title}</p>
                  <Badge variant="outline" className="border-white/10 text-stone-300">{event.type}</Badge>
                </div>
                <p className="mt-2 text-sm text-stone-400">{event.description}</p>
                <p className="mt-2 text-xs text-stone-500">{event.source} · {formatDate(event.occurredAt)}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-[#080808]/90 text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" /> Activity log
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activityEvents.map((event) => (
              <div key={`${event.timestamp}-${event.eventType}`} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">{event.eventType}</p>
                  <Badge className={statusTone(event.status)}>{event.status}</Badge>
                </div>
                <p className="mt-2 text-xs text-stone-500">{formatDate(event.timestamp)} · {event.code ?? "NO_ERROR"}</p>
              </div>
            ))}
            {activityEvents.length === 0 && (
              <div className="rounded-2xl border border-dashed border-white/10 p-5 text-sm text-stone-400">
                No Supabase connector activity yet. Trigger diagnostics or snapshot from backend routes.
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="rounded-[1.5rem] border border-emerald-300/15 bg-emerald-400/10 p-4 text-sm text-emerald-50">
        <LockKeyhole className="mr-2 inline h-4 w-4" /> P0 safety: frontend calls only GXEON backend routes; no Supabase keys, DB URL, table rows, SQL editor, migration control or write operation is exposed.
      </section>
    </div>
  );
}
