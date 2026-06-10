import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  fetchMicrosoft365ConnectUrl,
  fetchMicrosoft365ConnectorActivity,
  fetchMicrosoft365ConnectorDiagnostics,
  fetchMicrosoft365ConnectorSnapshot,
  microsoft365ReadonlySnapshotFallback,
  type Microsoft365ConnectorActivityEvent,
  type Microsoft365ConnectorDiagnostics,
  type Microsoft365ConnectorStatus,
  type Microsoft365ReadonlySnapshot,
} from "@/services/microsoft365ConnectorService";
import { cn } from "@/lib/utils";
import {
  CalendarDays,
  CheckCircle2,
  FileText,
  Mail,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
  Users,
} from "lucide-react";
import { FaMicrosoft } from "react-icons/fa";

const statusTone: Record<Microsoft365ConnectorStatus, string> = {
  NOT_CONFIGURED: "border-stone-400/25 bg-stone-500/10 text-stone-200",
  READY_FOR_CONSENT: "border-amber-300/30 bg-amber-400/10 text-amber-100",
  CONNECTED_READONLY: "border-emerald-300/30 bg-emerald-400/10 text-emerald-100",
  FAILED: "border-red-300/30 bg-red-400/10 text-red-100",
};

const subsystemIcons = {
  outlook: Mail,
  calendar: CalendarDays,
  contacts: Users,
  onedrive: FileText,
  proposalCenter: ShieldCheck,
};

function boolLabel(value: boolean): string {
  return value ? "READY" : "NO";
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "never";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function MetricCard({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return (
    <Card className="border-white/10 bg-[#090909]/90 text-white">
      <CardContent className="p-4">
        <p className="text-xs uppercase tracking-[0.22em] text-stone-500">{label}</p>
        <p className="mt-2 text-2xl font-black">{value}</p>
        <p className="mt-1 text-xs text-stone-400">{detail}</p>
      </CardContent>
    </Card>
  );
}

export default function Microsoft365ConnectorPage() {
  const [snapshot, setSnapshot] = useState<Microsoft365ReadonlySnapshot>(microsoft365ReadonlySnapshotFallback);
  const [diagnostics, setDiagnostics] = useState<Microsoft365ConnectorDiagnostics | null>(null);
  const [activity, setActivity] = useState<Microsoft365ConnectorActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectMessage, setConnectMessage] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      fetchMicrosoft365ConnectorSnapshot(controller.signal),
      fetchMicrosoft365ConnectorDiagnostics(controller.signal),
      fetchMicrosoft365ConnectorActivity(controller.signal),
    ])
      .then(([nextSnapshot, nextDiagnostics, nextActivity]) => {
        setSnapshot(nextSnapshot);
        setDiagnostics(nextDiagnostics);
        setActivity(nextActivity);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  const onboardingChecklist = [
    "Create or access a Microsoft Entra tenant/directory.",
    "Create the GXEON OS Connector App Registration inside that directory.",
    "Add the Web redirect URI for the deployed api-server callback.",
    "Create a client secret and copy the secret value for backend env only.",
    "Configure Railway api-server environment variables.",
    "Redeploy api-server so diagnostics read the new backend runtime.",
    "Open diagnostics and confirm the tenant metadata probe succeeds.",
    "Click Connect Microsoft 365 to open the backend-generated consent URL.",
  ];

  const requiredBackendEnvVars = [
    "MICROSOFT365_TENANT_ID",
    "MICROSOFT365_CLIENT_ID",
    "MICROSOFT365_CLIENT_SECRET",
    "MICROSOFT365_REDIRECT_URI",
    "MICROSOFT365_SCOPES",
  ];

  const diagnosticsHints = useMemo(() => {
    const hints: string[] = [];
    if (!snapshot.tenantIdPresent) hints.push("Create or access Microsoft Entra tenant before App Registration; personal Outlook apps outside a directory cannot complete GXEON onboarding.");
    if (!snapshot.configured) hints.push("Add MICROSOFT365_TENANT_ID, MICROSOFT365_CLIENT_ID, MICROSOFT365_CLIENT_SECRET, MICROSOFT365_REDIRECT_URI and MICROSOFT365_SCOPES to the backend runtime only.");
    if (!snapshot.redirectUriValid) hints.push("Redirect URI must be HTTPS in deployed environments; localhost is accepted only for local development.");
    if (!snapshot.scopePolicySafe) hints.push("Remove forbidden Microsoft Graph write scopes before consent can be generated.");
    if (snapshot.configured && !snapshot.tenantReachable) hints.push("Tenant metadata is not reachable yet; check tenant ID or directory availability and Railway outbound network.");
    if (diagnostics?.tenantProbe?.safeMessage) hints.push(diagnostics.tenantProbe.safeMessage);
    return hints.length ? hints : ["OAuth readiness is manual-first and read-only; consent URL is generated only by the backend."];
  }, [diagnostics, snapshot]);

  async function handleConnect() {
    setConnectMessage("Generating backend consent URL...");
    try {
      const payload = await fetchMicrosoft365ConnectUrl();
      if (payload.connectUrlReady && payload.connectUrl) {
        window.open(payload.connectUrl, "_blank", "noopener,noreferrer");
        setConnectMessage("Microsoft consent URL opened from backend response.");
        return;
      }
      setConnectMessage(`Connect URL not ready: ${payload.lastErrorCode}`);
    } catch {
      setConnectMessage("Connect URL request failed. Check api-server availability.");
    }
  }

  return (
    <div className="space-y-5 text-white">
      <section className="rounded-[2rem] border border-blue-300/15 bg-[#050505]/95 p-6 shadow-2xl shadow-black/50">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-blue-300/30 bg-blue-400/10 text-blue-100">
                <FaMicrosoft className="mr-1 h-3 w-3" /> Microsoft 365 Connector P0
              </Badge>
              <Badge variant="outline" className={cn("border", statusTone[snapshot.status])}>
                {loading ? "LOADING" : snapshot.status.replaceAll("_", " ")}
              </Badge>
              <Badge variant="outline" className="border-emerald-300/30 text-emerald-100">
                Backend-only OAuth · no Graph writes
              </Badge>
            </div>
            <h1 className="mt-4 text-4xl font-black tracking-tight md:text-6xl">
              Microsoft 365 OAuth Readiness
            </h1>
            <p className="mt-3 max-w-3xl text-sm text-stone-400">
              Prepares Outlook, Calendar, Contacts, OneDrive and Proposal Center visibility through GXEON api-server only. P0 does not show credential inputs, store tokens in the browser, send email, edit calendars, show contacts or browse files.
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
        <MetricCard label="Tenant readiness" value={boolLabel(snapshot.tenantReachable)} detail="OpenID metadata probe from backend" />
        <MetricCard label="Consent readiness" value={boolLabel(snapshot.consentReady)} detail="Authorize URL can be generated server-side" />
        <MetricCard label="Scope policy" value={snapshot.scopePolicySafe ? "SAFE" : "BLOCKED"} detail={`${snapshot.safeScopes.length} safe scopes exposed`} />
        <MetricCard label="Connect URL" value={boolLabel(snapshot.connectUrlReady)} detail="Button opens only backend-provided URL" />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-blue-300/15 bg-[#080808]/90 text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-blue-100" /> Onboarding checklist</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-stone-400">
              Complete these steps outside GXEON before consent. A personal Outlook account alone is not enough; the App Registration must live inside a Microsoft Entra tenant/directory.
            </p>
            <ol className="space-y-2 text-sm text-stone-200">
              {onboardingChecklist.map((item, index) => (
                <li key={item} className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-xs font-black text-blue-100">{index + 1}</span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <Card className="border-amber-300/15 bg-[#080808]/90 text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-amber-100" /> Railway backend env checklist</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-stone-500">Required names only</p>
              <div className="mt-3 grid gap-2">
                {requiredBackendEnvVars.map((name) => (
                  <code key={name} className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-amber-50">{name}</code>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-stone-500">Recommended scopes</p>
              <p className="mt-2 font-mono text-sm text-emerald-100">offline_access User.Read</p>
              <p className="mt-2 text-xs text-stone-400">No credential values are entered or stored in this dashboard.</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {snapshot.subsystems.map((subsystem) => {
          const Icon = subsystemIcons[subsystem.id];
          return (
            <Card key={subsystem.id} className="border-white/10 bg-[#090909]/90 text-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Icon className="h-5 w-5 text-blue-100" /> {subsystem.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant="outline" className="border-amber-300/25 text-amber-100">{subsystem.status}</Badge>
                <p className="mt-3 text-xs text-stone-400">{subsystem.detail}</p>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="border-white/10 bg-[#080808]/90 text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" /> Runtime boundary</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {[
              ["Tenant ID present", snapshot.tenantIdPresent],
              ["Client ID present", snapshot.clientIdPresent],
              ["Client secret backend-only", snapshot.clientSecretPresent],
              ["Redirect URI present", snapshot.redirectUriPresent],
              ["Frontend token storage", snapshot.health.frontendTokenStorage],
              ["Client secret exposure", snapshot.health.clientSecretExposure],
              ["Graph writes", snapshot.health.graphWrites],
              ["Personal data persistence", snapshot.health.personalDataPersistence],
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
            <CardTitle className="flex items-center gap-2"><TriangleAlert className="h-5 w-5" /> Diagnostics hints</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-stone-500">Last error</p>
              <p className="mt-2 font-bold">{snapshot.lastErrorCode}</p>
              <p className="mt-2 text-xs text-stone-400">Tenant probe: {String(diagnostics?.tenantProbe?.ok ?? false)} · HTTP {diagnostics?.tenantProbe?.status ?? "n/a"}</p>
              <p className="mt-1 text-xs text-stone-400">Safe scopes: {snapshot.safeScopes.join(", ") || "none"}</p>
              <p className="mt-1 text-xs text-stone-400">Forbidden scopes requested: {snapshot.forbiddenScopesRequested.length}</p>
            </div>
            {diagnosticsHints.map((hint) => (
              <div key={hint} className="rounded-2xl border border-amber-300/15 bg-amber-400/10 p-3 text-sm text-amber-50">{hint}</div>
            ))}
            <Button onClick={handleConnect} className="w-full bg-blue-500 text-white hover:bg-blue-400" disabled={!snapshot.connectUrlReady && snapshot.status !== "READY_FOR_CONSENT"}>
              <FaMicrosoft className="mr-2 h-4 w-4" /> Connect Microsoft 365
            </Button>
            {connectMessage && <p className="text-xs text-stone-400">{connectMessage}</p>}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Card className="border-white/10 bg-[#080808]/90 text-white">
          <CardHeader><CardTitle className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5" /> Evidence timeline</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {snapshot.evidenceTimeline.map((item) => (
              <div key={item.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="font-bold">{item.title}</p>
                <p className="mt-1 text-xs text-stone-400">{item.description}</p>
                <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-stone-500">{formatDate(item.occurredAt)} · {item.source}</p>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="border-white/10 bg-[#080808]/90 text-white">
          <CardHeader><CardTitle className="flex items-center gap-2"><RefreshCw className="h-5 w-5" /> Activity log</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {activity.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-stone-400">No backend activity events recorded yet.</p>
            ) : activity.slice(0, 10).map((event) => (
              <div key={`${event.timestamp}-${event.eventType}`} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="font-bold">{event.eventType} · {event.status}</p>
                <p className="mt-1 text-xs text-stone-400">Code: {event.code ?? "NONE"}</p>
                <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-stone-500">{formatDate(event.timestamp)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
