import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  githubReadonlyAllowedActions,
  githubReadonlyEmptyStateCopy,
  githubReadonlyForbiddenActions,
  githubReadonlySnapshot,
  githubReadonlyStatusFlow,
  type GitHubConnectorDiagnostics,
  type GitHubConnectorStatus,
  type GitHubReadonlySnapshot,
} from "@/data/github-readonly-connector";
import {
  fetchGitHubConnectUrl,
  fetchGitHubConnectorDiagnostics,
  fetchGitHubConnectorSnapshot,
  githubConnectorApiBaseMode,
} from "@/services/githubConnectorService";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  CircleDot,
  Code2,
  GitBranch,
  GitPullRequest,
  Github,
  HeartPulse,
  History,
  LockKeyhole,
  RefreshCw,
  Server,
  ShieldCheck,
} from "lucide-react";

const statusTone: Record<GitHubConnectorStatus, string> = {
  READY: "border-amber-300/35 bg-amber-400/10 text-amber-100",
  CONNECTING: "border-cyan-300/35 bg-cyan-400/10 text-cyan-100",
  CONNECTED_READONLY:
    "border-emerald-300/35 bg-emerald-400/10 text-emerald-100",
  FAILED: "border-red-300/35 bg-red-400/10 text-red-100",
  DISCONNECTED: "border-amber-300/35 bg-amber-400/10 text-amber-100",
};

const safetyLabels = [
  ["OAuth enabled", "oauthEnabled"],
  ["Frontend external calls", "externalApiCalls"],
  ["Frontend token storage", "tokenStorageFrontend"],
  ["Repository mutation access", "repositoryWriteAccess"],
  ["Database writes", "databaseWrites"],
  ["Secret exposure", "secretExposure"],
] as const;

function formatDate(value: string | null | undefined): string {
  if (!value) return "never";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: number;
  detail: string;
  icon: typeof Github;
}) {
  return (
    <Card className="border-amber-300/15 bg-[#080705]/90 text-white backdrop-blur-xl">
      <CardContent className="p-5">
        <Icon className="h-5 w-5 text-amber-200" />
        <p className="mt-5 text-xs uppercase tracking-[0.24em] text-stone-500">
          {label}
        </p>
        <p className="mt-2 text-3xl font-black">{value}</p>
        <p className="mt-2 text-xs text-stone-400">{detail}</p>
      </CardContent>
    </Card>
  );
}

function EmptyMonitorCard({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon: typeof Github;
}) {
  return (
    <Card className="border-amber-300/15 bg-[#090704]/90 text-white backdrop-blur-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-5 w-5 text-amber-200" /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-2xl border border-amber-300/15 bg-amber-400/[0.04] p-4">
          <p className="text-sm text-stone-300">{description}</p>
          <p className="mt-3 text-xs uppercase tracking-[0.22em] text-amber-200/65">
            Read-only monitor · zero mutations
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function GitHubReadonlyConnectorPage() {
  const [snapshot, setSnapshot] = useState<GitHubReadonlySnapshot>(
    githubReadonlySnapshot,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectLoading, setConnectLoading] = useState(false);
  const [diagnostics, setDiagnostics] =
    useState<GitHubConnectorDiagnostics | null>(null);

  const callbackError = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("error");
  }, []);

  const callbackConnected = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("connected") === "github";
  }, []);

  async function handleConnectGitHub() {
    setConnectLoading(true);
    setError(null);
    try {
      const connectUrl = await fetchGitHubConnectUrl();
      window.location.assign(connectUrl.url);
    } catch (connectError) {
      setConnectLoading(false);
      setError(
        connectError instanceof Error
          ? connectError.message
          : "GITHUB_CONNECT_URL_FAILED",
      );
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    Promise.all([
      fetchGitHubConnectorSnapshot(controller.signal),
      fetchGitHubConnectorDiagnostics(controller.signal),
    ])
      .then(([data, diagnosticData]) => {
        setSnapshot(data);
        setDiagnostics(diagnosticData);
        if (!diagnosticData && data.lastErrorCode === "BACKEND_UNAVAILABLE") {
          setError("Backend API is unreachable from this dashboard runtime.");
        }
      })
      .catch((loadError) => {
        if (
          loadError instanceof DOMException &&
          loadError.name === "AbortError"
        )
          return;
        setError("Backend GitHub connector snapshot unavailable.");
        setSnapshot({
          ...githubReadonlySnapshot,
          statusLabel: "READY_BACKEND_UNAVAILABLE",
          lastErrorCode: "BACKEND_UNAVAILABLE",
          health: {
            ...githubReadonlySnapshot.health,
            lastErrorCode: "BACKEND_UNAVAILABLE",
          },
        });
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, []);

  const metricCards = useMemo(
    () => [
      {
        label: "Repositories",
        value: snapshot.repositoryCount,
        detail: "authorized read-only repositories",
        icon: Github,
      },
      {
        label: "Branches",
        value: snapshot.branches.length,
        detail: "branches read by backend runtime",
        icon: GitBranch,
      },
      {
        label: "Open PRs",
        value: snapshot.openPrs,
        detail: "pull requests currently open",
        icon: GitPullRequest,
      },
      {
        label: "Open Issues",
        value: snapshot.openIssues,
        detail: "issues currently open",
        icon: AlertTriangle,
      },
      {
        label: "Recent Commits",
        value: snapshot.recentCommits,
        detail: "commits in latest read window",
        icon: Code2,
      },
    ],
    [snapshot],
  );

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-amber-300/20 bg-[#050403]/95 p-6 shadow-2xl shadow-black/60 backdrop-blur-xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_12%,rgba(245,158,11,0.22),transparent_34%),radial-gradient(circle_at_16%_16%,rgba(255,255,255,0.08),transparent_28%)]" />
        <div className="relative grid gap-6 xl:grid-cols-[1.35fr_0.65fr] xl:items-end">
          <div>
            <div className="mb-4 flex flex-wrap gap-2">
              <Badge className="border-amber-300/35 bg-amber-400/10 text-amber-100">
                P3 GitHub App Flow
              </Badge>
              <Badge className="border-emerald-300/35 bg-emerald-400/10 text-emerald-100">
                Backend-only secret boundary
              </Badge>
              <Badge className="border-cyan-300/35 bg-cyan-400/10 text-cyan-100">
                GitHub App installation
              </Badge>
              <Badge className="border-rose-300/35 bg-rose-400/10 text-rose-100">
                No credential UI
              </Badge>
            </div>
            <p className="text-xs uppercase tracking-[0.48em] text-amber-200/70">
              GXEON QG · Connector Gateway · GitHub
            </p>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-white md:text-6xl">
              GitHub Read-Only Connector
            </h1>
            <p className="mt-4 max-w-4xl text-base text-stone-300 md:text-lg">
              Connect GitHub redirects to the official GitHub App installation
              flow. The backend validates signed state, stores only safe
              installation metadata, mints short-lived installation tokens
              server-side and keeps the legacy backend token path as an
              emergency read-only fallback.
            </p>
          </div>
          <Card className="border-amber-300/25 bg-black/35 text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-amber-200" /> Connection
                Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Badge variant="outline" className={statusTone[snapshot.status]}>
                {loading ? "CONNECTING" : snapshot.status}
              </Badge>
              <p className="text-sm text-stone-300">{snapshot.statusLabel}</p>
              <p className="text-xs text-stone-500">
                Last sync: {formatDate(snapshot.health.lastSyncAt)}
              </p>
              {callbackConnected ? (
                <p className="text-xs text-emerald-200">
                  GitHub installation callback completed. Snapshot will use
                  GitHub App mode when backend token minting is configured.
                </p>
              ) : null}
              {callbackError ? (
                <p className="text-xs text-red-200">
                  Callback error: {callbackError}
                </p>
              ) : null}
              {error ? <p className="text-xs text-red-200">{error}</p> : null}
              <Button
                type="button"
                onClick={handleConnectGitHub}
                disabled={connectLoading}
                className="w-full bg-amber-300 text-black hover:bg-amber-200"
              >
                <Github className="mr-2 h-4 w-4" />
                {connectLoading
                  ? "Preparing GitHub redirect..."
                  : "Connect GitHub"}
              </Button>
              <div className="grid grid-cols-2 gap-2 text-xs text-stone-400">
                {githubReadonlyStatusFlow.map((status) => (
                  <div
                    key={status}
                    className="flex items-center gap-2 rounded-xl border border-amber-100/10 bg-amber-100/[0.03] p-2"
                  >
                    <CircleDot
                      className={`h-3 w-3 ${status === snapshot.status ? "text-amber-200" : "text-stone-600"}`}
                    />
                    {status}
                  </div>
                ))}
              </div>
              <div className="grid gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-xs text-stone-300">
                <div className="flex justify-between gap-3">
                  <span>Backend reachability</span>
                  <strong
                    className={
                      diagnostics ? "text-emerald-100" : "text-red-100"
                    }
                  >
                    {diagnostics ? "ONLINE" : "UNREACHABLE"}
                  </strong>
                </div>
                <div className="flex justify-between gap-3">
                  <span>Backend token fallback</span>
                  <strong>
                    {diagnostics
                      ? diagnostics.tokenPresent
                        ? "yes"
                        : "no"
                      : "unknown"}
                  </strong>
                </div>
                <div className="flex justify-between gap-3">
                  <span>Connection mode</span>
                  <strong>
                    {snapshot.connectionMode ??
                      diagnostics?.connection?.mode ??
                      "not_connected"}
                  </strong>
                </div>
                <div className="flex justify-between gap-3">
                  <span>GitHub App ready</span>
                  <strong>
                    {diagnostics?.auth?.appInstallationReady ? "yes" : "no"}
                  </strong>
                </div>
                <div className="flex justify-between gap-3">
                  <span>Installation token config</span>
                  <strong>
                    {diagnostics?.auth?.installationTokenReady ? "yes" : "no"}
                  </strong>
                </div>
                <div className="flex justify-between gap-3">
                  <span>Owner configured</span>
                  <strong>
                    {diagnostics
                      ? diagnostics.ownerPresent
                        ? "yes"
                        : "no"
                      : "unknown"}
                  </strong>
                </div>
                <div className="flex justify-between gap-3">
                  <span>Repo configured</span>
                  <strong>
                    {diagnostics
                      ? diagnostics.repoPresent
                        ? "yes"
                        : "no"
                      : "unknown"}
                  </strong>
                </div>
                <div className="flex justify-between gap-3">
                  <span>Last backend error</span>
                  <strong>
                    {snapshot.lastErrorCode ?? snapshot.health.lastErrorCode}
                  </strong>
                </div>
                <div className="flex justify-between gap-3">
                  <span>API base mode</span>
                  <strong>{githubConnectorApiBaseMode}</strong>
                </div>
                {snapshot.installation ? (
                  <>
                    <div className="flex justify-between gap-3">
                      <span>Installation</span>
                      <strong>#{snapshot.installation.installationId}</strong>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span>Account</span>
                      <strong>
                        {snapshot.installation.accountLogin ??
                          "selected in GitHub"}
                      </strong>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span>Repository access</span>
                      <strong>
                        {snapshot.installation.repositorySelection}
                      </strong>
                    </div>
                  </>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {metricCards.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-white/10 bg-[#080808]/90 text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Github className="h-5 w-5 text-amber-200" /> Repository Snapshot
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {snapshot.repositories.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-stone-400">
                {githubReadonlyEmptyStateCopy.repositories}
              </p>
            ) : (
              snapshot.repositories.map((repository) => (
                <div
                  key={repository.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-black">
                        {repository.owner}/{repository.name}
                      </p>
                      <p className="text-sm text-stone-400">
                        Default branch: {repository.defaultBranch}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className="border-emerald-300/30 text-emerald-100"
                    >
                      {repository.status}
                    </Badge>
                  </div>
                  <p className="mt-3 text-xs text-stone-500">
                    Last read: {formatDate(repository.lastReadAt)}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-[#080808]/90 text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LockKeyhole className="h-5 w-5 text-emerald-200" /> Compact
              Safety Boundary
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            {safetyLabels.map(([label, key]) => (
              <div
                key={key}
                className="rounded-2xl border border-emerald-300/15 bg-emerald-400/[0.04] p-3"
              >
                <p className="text-xs uppercase tracking-[0.2em] text-stone-500">
                  {label}
                </p>
                <p className="mt-1 font-black text-emerald-100">
                  {String(snapshot.health[key])}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <EmptyMonitorCard
          title="Branches"
          description={
            snapshot.branches.length === 0
              ? githubReadonlyEmptyStateCopy.branches
              : `${snapshot.branches.length} branches loaded from backend.`
          }
          icon={GitBranch}
        />
        <EmptyMonitorCard
          title="Pull Requests"
          description={
            snapshot.pullRequests.length === 0
              ? githubReadonlyEmptyStateCopy.pullRequests
              : `${snapshot.pullRequests.length} pull requests loaded from backend.`
          }
          icon={GitPullRequest}
        />
        <EmptyMonitorCard
          title="Issues"
          description={
            snapshot.issues.length === 0
              ? githubReadonlyEmptyStateCopy.issues
              : `${snapshot.issues.length} issues loaded from backend.`
          }
          icon={AlertTriangle}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card className="border-white/10 bg-[#080808]/90 text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-amber-200" /> Allowed Reads
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            {githubReadonlyAllowedActions.map((action) => (
              <Badge
                key={action}
                variant="outline"
                className="justify-start border-emerald-300/20 py-2 text-emerald-100"
              >
                <CheckCircle2 className="mr-2 h-3 w-3" />
                {action}
              </Badge>
            ))}
          </CardContent>
        </Card>
        <Card className="border-white/10 bg-[#080808]/90 text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5 text-red-200" /> Forbidden Boundary
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            {githubReadonlyForbiddenActions.map((action) => (
              <Badge
                key={action}
                variant="outline"
                className="justify-start border-red-300/20 py-2 text-red-100"
              >
                <AlertTriangle className="mr-2 h-3 w-3" />
                {action}
              </Badge>
            ))}
          </CardContent>
        </Card>
      </section>

      <Card className="border-white/10 bg-[#080808]/90 text-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-amber-200" />
            Evidence Timeline
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {snapshot.evidenceTimeline.map((event) => {
            return (
              <div
                key={event.id}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-bold">{event.title}</p>
                  <Badge
                    variant="outline"
                    className="border-amber-300/25 text-amber-100"
                  >
                    {event.type}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-stone-400">
                  {event.description}
                </p>
                <p className="mt-3 text-xs text-stone-500">
                  {formatDate(event.occurredAt)} · {event.source}
                </p>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card className="border-emerald-300/15 bg-emerald-400/[0.04] text-white">
        <CardContent className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <HeartPulse className="h-5 w-5 text-emerald-200" />
            <p className="font-bold">
              Backend-only GitHub App read foundation active. No credential
              fields, browser tokens or mutation buttons are present.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-emerald-100">
            <RefreshCw className="h-4 w-4" />
            Short-lived snapshot cache
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
