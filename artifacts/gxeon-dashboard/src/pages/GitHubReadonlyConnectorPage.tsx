import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  githubReadonlyAllowedActions,
  githubReadonlyEmptyStateCopy,
  githubReadonlyForbiddenActions,
  githubReadonlySnapshot,
  githubReadonlyStatusFlow,
  type GitHubConnectorStatus,
} from "@/data/github-readonly-connector";
import { Activity, AlertTriangle, CheckCircle2, CircleDot, Code2, GitBranch, GitPullRequest, Github, HeartPulse, History, LockKeyhole, Server, ShieldCheck } from "lucide-react";

const statusTone: Record<GitHubConnectorStatus, string> = {
  CONNECTING: "border-cyan-300/35 bg-cyan-400/10 text-cyan-100",
  CONNECTED_READONLY: "border-emerald-300/35 bg-emerald-400/10 text-emerald-100",
  FAILED: "border-red-300/35 bg-red-400/10 text-red-100",
  DISCONNECTED: "border-amber-300/35 bg-amber-400/10 text-amber-100",
};

const metricCards = [
  { label: "Repositories", value: githubReadonlySnapshot.repositoryCount, detail: "authorized read-only repositories", icon: Github },
  { label: "Open PRs", value: githubReadonlySnapshot.openPrs, detail: "pull requests currently open", icon: GitPullRequest },
  { label: "Merged PRs", value: githubReadonlySnapshot.mergedPrs, detail: "merged pull requests observed", icon: CheckCircle2 },
  { label: "Open Issues", value: githubReadonlySnapshot.openIssues, detail: "issues currently open", icon: AlertTriangle },
  { label: "Recent Commits", value: githubReadonlySnapshot.recentCommits, detail: "commits in latest read window", icon: Code2 },
];

const safetyBoundary = [
  ["OAuth enabled", githubReadonlySnapshot.health.oauthEnabled],
  ["External API calls", githubReadonlySnapshot.health.externalApiCalls],
  ["Frontend token storage", githubReadonlySnapshot.health.tokenStorageFrontend],
  ["Repository write access", githubReadonlySnapshot.health.repositoryWriteAccess],
  ["Database writes", githubReadonlySnapshot.health.databaseWrites],
  ["Secret exposure", githubReadonlySnapshot.health.secretExposure],
] as const;

function EmptyMonitorCard({ title, description, icon: Icon }: { title: string; description: string; icon: typeof Github }) {
  return (
    <Card className="border-amber-300/15 bg-[#090704]/90 text-white backdrop-blur-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><Icon className="h-5 w-5 text-amber-200" /> {title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-2xl border border-amber-300/15 bg-amber-400/[0.04] p-4">
          <p className="text-sm text-stone-300">{description}</p>
          <p className="mt-3 text-xs uppercase tracking-[0.22em] text-amber-200/65">Read-only placeholder · zero mutations</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function GitHubReadonlyConnectorPage() {
  const snapshot = githubReadonlySnapshot;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-amber-300/20 bg-[#050403]/95 p-6 shadow-2xl shadow-black/60 backdrop-blur-xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_12%,rgba(245,158,11,0.22),transparent_34%),radial-gradient(circle_at_16%_16%,rgba(255,255,255,0.08),transparent_28%)]" />
        <div className="relative grid gap-6 xl:grid-cols-[1.35fr_0.65fr] xl:items-end">
          <div>
            <div className="mb-4 flex flex-wrap gap-2">
              <Badge className="border-amber-300/35 bg-amber-400/10 text-amber-100">P1 GitHub Read-Only</Badge>
              <Badge className="border-emerald-300/35 bg-emerald-400/10 text-emerald-100">No writes</Badge>
              <Badge className="border-cyan-300/35 bg-cyan-400/10 text-cyan-100">No automation</Badge>
              <Badge className="border-rose-300/35 bg-rose-400/10 text-rose-100">No credentials in frontend</Badge>
            </div>
            <p className="text-xs uppercase tracking-[0.48em] text-amber-200/70">GXEON QG · Connector Gateway · GitHub</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-white md:text-6xl">GitHub Read-Only Connector</h1>
            <p className="mt-4 max-w-4xl text-base text-stone-300 md:text-lg">
              Primeira integração real preparada em modo somente leitura. A rota modela descoberta de repositórios, branches, pull requests, issues, commits, saúde e evidências sem OAuth ativo, sem chamadas externas, sem gravações e sem exposição de credenciais.
            </p>
          </div>
          <Card className="border-amber-300/25 bg-black/35 text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-amber-200" /> Connection Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Badge variant="outline" className={statusTone[snapshot.status]}>{snapshot.status}</Badge>
              <p className="text-sm text-stone-300">{snapshot.statusLabel}</p>
              <div className="grid grid-cols-2 gap-2 text-xs text-stone-400">
                {githubReadonlyStatusFlow.map((status) => (
                  <div key={status} className="flex items-center gap-2 rounded-xl border border-amber-100/10 bg-amber-100/[0.03] p-2">
                    <CircleDot className={`h-3 w-3 ${status === snapshot.status ? "text-amber-200" : "text-stone-600"}`} />
                    {status}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {metricCards.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.label} className="border-amber-300/15 bg-[#080705]/90 text-white backdrop-blur-xl">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-amber-200/60">{metric.label}</p>
                    <p className="mt-2 text-3xl font-black text-white">{metric.value}</p>
                  </div>
                  <span className="grid h-10 w-10 place-items-center rounded-2xl border border-amber-300/20 bg-amber-400/10 text-amber-100"><Icon className="h-5 w-5" /></span>
                </div>
                <p className="mt-3 text-xs text-stone-400">{metric.detail}</p>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <Card className="border-emerald-300/20 bg-emerald-400/10 text-white backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><LockKeyhole className="h-5 w-5 text-emerald-200" /> Allowed read actions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            {githubReadonlyAllowedActions.map((action) => (
              <div key={action} className="flex items-center gap-2 rounded-2xl border border-emerald-300/20 bg-black/25 p-3 text-sm text-emerald-50">
                <CheckCircle2 className="h-4 w-4 text-emerald-200" /> {action}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-rose-300/20 bg-rose-400/10 text-white backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-rose-200" /> Forbidden mutations</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {githubReadonlyForbiddenActions.map((action) => (
              <div key={action} className="rounded-2xl border border-rose-300/20 bg-black/25 p-3 text-sm text-rose-50">{action}</div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <EmptyMonitorCard title="Repositories" description={githubReadonlyEmptyStateCopy.repositories} icon={Github} />
        <EmptyMonitorCard title="Branches" description={githubReadonlyEmptyStateCopy.branches} icon={GitBranch} />
        <EmptyMonitorCard title="Pull Requests" description={githubReadonlyEmptyStateCopy.pullRequests} icon={GitPullRequest} />
        <EmptyMonitorCard title="Issues" description={githubReadonlyEmptyStateCopy.issues} icon={AlertTriangle} />
        <EmptyMonitorCard title="Commits" description={githubReadonlyEmptyStateCopy.commits} icon={Code2} />
        <Card className="border-cyan-300/15 bg-[#05070d]/90 text-white backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><HeartPulse className="h-5 w-5 text-cyan-200" /> Connector Health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-300">
            <p>Gateway: <span className="text-cyan-100">{snapshot.health.connectorGateway}</span></p>
            <p>GitHub: <span className="text-cyan-100">{snapshot.health.githubConnector}</span></p>
            <p>Next activation: <span className="text-amber-100">{snapshot.health.nextActivation}</span></p>
            <p>System state: <span className="text-emerald-100">{snapshot.health.systemState}</span></p>
            <p>Last sync: <span className="text-stone-500">not started</span></p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-amber-300/20 bg-[#080705]/90 text-white backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><History className="h-5 w-5 text-amber-200" /> Evidence Timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {snapshot.evidenceTimeline.map((event) => (
              <div key={event.id} className="rounded-2xl border border-amber-300/15 bg-amber-400/[0.04] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Badge variant="outline" className="border-amber-300/25 bg-amber-400/10 text-amber-100">{event.type}</Badge>
                  <span className="text-xs text-stone-500">{event.occurredAt}</span>
                </div>
                <p className="mt-3 font-semibold text-white">{event.title}</p>
                <p className="mt-1 text-sm text-stone-300">{event.description}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.2em] text-stone-500">{event.source}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-cyan-300/20 bg-cyan-400/10 text-white backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Server className="h-5 w-5 text-cyan-200" /> Safety Boundary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {safetyBoundary.map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-3 rounded-2xl border border-cyan-300/15 bg-black/25 p-3">
                <span className="text-sm text-cyan-50">{label}</span>
                <Badge variant="outline" className={value ? "border-red-300/30 bg-red-400/10 text-red-100" : "border-emerald-300/30 bg-emerald-400/10 text-emerald-100"}>{String(value)}</Badge>
              </div>
            ))}
            <div className="rounded-2xl border border-cyan-300/15 bg-black/25 p-3 text-sm text-cyan-50">
              <Activity className="mb-2 h-4 w-4 text-cyan-200" /> External reads are intentionally stubbed until a backend-only connector is approved.
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
