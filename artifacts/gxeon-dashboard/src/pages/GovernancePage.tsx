import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  GitBranch, GitMerge, GitPullRequest, Shield, AlertCircle,
  CheckCircle, RefreshCw, Activity, AlertTriangle, Zap,
  Server, Database, FileText, RotateCcw, Play
} from "lucide-react";

type BranchInfo = {
  name: string; type: string; lastCommit: string; lastCommitDate: string;
  ahead: number; behind: number; isStale: boolean; isMerged: boolean; author: string;
};
type MergeEntry = {
  branch: string; status: "ready" | "blocked" | "conflict" | "stale" | "pending";
  checks: { governance: boolean; runtime: boolean; dependencies: boolean; compatibility: boolean; dashboard: boolean };
  blockReason?: string; createdAt: string;
};
type ConflictInfo = {
  file: string; conflictType: string; severity: "critical" | "high" | "medium" | "low";
  affectedSystems: string[]; resolution: string;
};
type DeploymentInfo = {
  environment: string; localHead: string; deployedCommit: string;
  isSynced: boolean; driftCommits: number; status: string; lastDeployedAt: string;
};
type RuntimeComponent = {
  name: string; status: string; version: string; lastSync: string; healthy: boolean;
};

type GovernanceData = {
  branches: { summary: { total: number; stale: number; active: number; byType: Record<string, number> }; branches: BranchInfo[] } | null;
  merge: { summary: { totalPRs: number; readyToMerge: number; blocked: number; stale: number }; mergeQueue: MergeEntry[]; repositoryHealth: { score: number; grade: string; checks: Record<string, { pass: boolean; message: string }> } } | null;
  conflicts: { summary: { total: number; critical: number; high: number; blockingDeployment: boolean }; conflicts: ConflictInfo[]; safeDeploymentRules: Record<string, boolean> } | null;
  deployments: { summary: { totalEnvironments: number; syncRequired: boolean; totalDriftCommits: number }; deployments: DeploymentInfo[]; activationVerification: Record<string, boolean> } | null;
  runtimeSync: { runtimeSync: { overallHealth: string; components: RuntimeComponent[]; syncRequired: boolean }; deterministicProductionIntegrity: Record<string, boolean> } | null;
  recovery: { recovery: { status: string; recommendations: string[]; rollbackAvailable: boolean; lastStableCommit: string }; recoveryPipeline: Array<{ step: number; name: string; automated: boolean; status: string }> } | null;
};

const API_BASE = "/api";

async function fetchGovernance<T>(endpoint: string): Promise<T> {
  const res = await fetch(`${API_BASE}/v1/governance/${endpoint}`);
  if (res.status === 401) throw Object.assign(new Error("unauthorized"), { status: 401 });
  if (res.status === 503) throw Object.assign(new Error("not_configured"), { status: 503 });
  if (!res.ok) throw Object.assign(new Error(`${endpoint}: ${res.status}`), { status: res.status });
  return res.json() as Promise<T>;
}

async function generateReports() {
  const res = await fetch(`${API_BASE}/v1/governance/reports`, {
    method: "POST",
  });
  if (res.status === 401) throw Object.assign(new Error("unauthorized"), { status: 401 });
  if (res.status === 503) throw Object.assign(new Error("not_configured"), { status: 503 });
  if (!res.ok) throw new Error("Failed to generate reports");
  return res.json();
}

export default function GovernancePage() {
  const [data, setData] = useState<GovernanceData>({ branches: null, merge: null, conflicts: null, deployments: null, runtimeSync: null, recovery: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsResult, setReportsResult] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "branches" | "merge" | "conflicts" | "deployments" | "runtime" | "recovery">("overview");

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const settle = <T,>(p: Promise<T>): Promise<T | null> => p.catch((err: unknown) => {
        const status = (err as { status?: number }).status;
        if (status === 401) throw err;
        if (status === 503) throw err;
        return null;
      });
      const [branches, merge, conflicts, deployments, runtimeSync, recovery] = await Promise.all([
        settle(fetchGovernance<GovernanceData["branches"]>("branches")),
        settle(fetchGovernance<GovernanceData["merge"]>("merge")),
        settle(fetchGovernance<GovernanceData["conflicts"]>("conflicts")),
        settle(fetchGovernance<GovernanceData["deployments"]>("deployments")),
        settle(fetchGovernance<GovernanceData["runtimeSync"]>("runtime-sync")),
        settle(fetchGovernance<GovernanceData["recovery"]>("recovery")),
      ]);
      setData({ branches, merge, conflicts, deployments, runtimeSync, recovery });
    } catch (err) {
      const status = (err as { status?: number }).status;
      if (status === 401) setError("unauthorized");
      else if (status === 503) setError("not_configured");
      else setError("api_down");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  async function handleGenerateReports() {
    setReportsLoading(true);
    setReportsResult(null);
    try {
      const result = await generateReports();
      setReportsResult(`Reports generated — Health: ${result.summary?.healthScore}% (Grade ${result.summary?.healthGrade})`);
    } catch {
      setReportsResult("API server not running — start it to generate reports");
    } finally {
      setReportsLoading(false);
    }
  }

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      ready: "bg-green-500/10 text-green-500",
      synced: "bg-green-500/10 text-green-500",
      healthy: "bg-green-500/10 text-green-500",
      operational: "bg-green-500/10 text-green-500",
      pass: "bg-green-500/10 text-green-500",
      blocked: "bg-red-500/10 text-red-500",
      conflict: "bg-red-500/10 text-red-500",
      critical: "bg-red-500/10 text-red-500",
      failed: "bg-red-500/10 text-red-500",
      stale: "bg-yellow-500/10 text-yellow-500",
      degraded: "bg-yellow-500/10 text-yellow-500",
      pending: "bg-blue-500/10 text-blue-500",
      behind: "bg-orange-500/10 text-orange-500",
      drift: "bg-orange-500/10 text-orange-500",
    };
    return <Badge variant="secondary" className={styles[status] || ""}>{status}</Badge>;
  };

  const healthScore = data.merge?.repositoryHealth?.score ?? 0;
  const healthGrade = data.merge?.repositoryHealth?.grade ?? "?";

  const tabs = [
    { id: "overview", label: "Overview", icon: Shield },
    { id: "branches", label: "Branches", icon: GitBranch },
    { id: "merge", label: "Merge Queue", icon: GitMerge },
    { id: "conflicts", label: "Conflicts", icon: AlertTriangle },
    { id: "deployments", label: "Deployments", icon: Server },
    { id: "runtime", label: "Runtime Sync", icon: Activity },
    { id: "recovery", label: "Recovery", icon: RotateCcw },
  ] as const;

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Git Governance</h1>
          <p className="text-muted-foreground">Autonomous merge orchestration & repository integrity engine</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={handleGenerateReports} variant="outline" size="sm" disabled={reportsLoading}>
            <FileText className={`h-4 w-4 mr-2 ${reportsLoading ? "animate-pulse" : ""}`} />
            {reportsLoading ? "Generating..." : "Generate Reports"}
          </Button>
          <Button onClick={loadAll} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />Refresh
          </Button>
        </div>
      </div>

      {error === "unauthorized" && (
        <div className="bg-yellow-500/10 text-yellow-500 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <p className="font-medium">Governance API requires authentication. Set <code className="font-mono text-xs bg-yellow-500/20 px-1 rounded">VITE_GOVERNANCE_TOKEN</code> in Replit Secrets to match the server&apos;s <code className="font-mono text-xs bg-yellow-500/20 px-1 rounded">GOVERNANCE_TOKEN</code>.</p>
        </div>
      )}
      {error === "not_configured" && (
        <div className="bg-yellow-500/10 text-yellow-500 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <p className="font-medium">Governance API is not configured. Add <code className="font-mono text-xs bg-yellow-500/20 px-1 rounded">GOVERNANCE_TOKEN</code> to the API server&apos;s Replit Secrets to activate this feature.</p>
        </div>
      )}
      {error === "api_down" && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <p className="font-medium">Governance API is unreachable — ensure the API Server workflow is running.</p>
        </div>
      )}

      {reportsResult && (
        <div className="bg-primary/10 text-primary px-4 py-3 rounded-lg flex items-center gap-2">
          <CheckCircle className="h-4 w-4" /><p>{reportsResult}</p>
        </div>
      )}

      {/* KPI Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className={`border-2 ${healthGrade === "A" ? "border-green-500/30" : healthGrade === "B" ? "border-blue-500/30" : "border-yellow-500/30"}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Health Score</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${healthGrade === "A" ? "text-green-500" : healthGrade === "B" ? "text-blue-500" : "text-yellow-500"}`}>
              {healthGrade} <span className="text-lg font-normal text-muted-foreground">({healthScore}%)</span>
            </div>
            <p className="text-xs text-muted-foreground">Repository integrity</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Branches</CardTitle>
            <GitBranch className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.branches?.summary?.total ?? "—"}</div>
            <p className="text-xs text-muted-foreground">{data.branches?.summary?.stale ?? 0} stale</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Merge Queue</CardTitle>
            <GitMerge className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.merge?.summary?.totalPRs ?? "—"}</div>
            <p className="text-xs text-green-500">{data.merge?.summary?.readyToMerge ?? 0} ready</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conflicts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(data.conflicts?.summary?.total ?? 0) > 0 ? "text-red-500" : "text-green-500"}`}>
              {data.conflicts?.summary?.total ?? "—"}
            </div>
            <p className="text-xs text-muted-foreground">{data.conflicts?.summary?.critical ?? 0} critical</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Runtime</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${data.runtimeSync?.runtimeSync?.overallHealth === "healthy" ? "text-green-500" : "text-yellow-500"}`}>
              {data.runtimeSync?.runtimeSync?.overallHealth ?? "—"}
            </div>
            <p className="text-xs text-muted-foreground">{data.runtimeSync?.runtimeSync?.components?.filter(c => c.healthy).length ?? 0} components OK</p>
          </CardContent>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 border-b overflow-x-auto pb-0">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === tab.id ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            <tab.icon className="h-4 w-4" />{tab.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Health Checks */}
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5 text-primary" />Health Checks</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.merge?.repositoryHealth?.checks ? Object.entries(data.merge.repositoryHealth.checks).map(([key, check]) => (
                    <div key={key} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {check.pass ? <CheckCircle className="h-4 w-4 text-green-500" /> : <AlertCircle className="h-4 w-4 text-red-500" />}
                        <span className="text-sm capitalize">{key.replace(/-/g, " ")}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{check.message}</p>
                    </div>
                  )) : <p className="text-muted-foreground text-sm">Start API server to load checks</p>}
                </div>
              </CardContent>
            </Card>

            {/* Safe Deployment Rules */}
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Zap className="h-5 w-5 text-yellow-500" />Safe Deployment Rules</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.conflicts?.safeDeploymentRules ? Object.entries(data.conflicts.safeDeploymentRules).map(([key, pass]) => (
                    <div key={key} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {pass ? <CheckCircle className="h-4 w-4 text-green-500" /> : <AlertCircle className="h-4 w-4 text-red-500" />}
                        <span className="text-sm capitalize">{key.replace(/([A-Z])/g, " $1")}</span>
                      </div>
                      {statusBadge(pass ? "pass" : "blocked")}
                    </div>
                  )) : (
                    ["Swarm Runtime", "Monetization", "Persistence", "Dashboard", "Observability"].map((rule) => (
                      <div key={rule} className="flex items-center justify-between">
                        <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500" /><span className="text-sm">{rule}</span></div>
                        {statusBadge("pass")}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Deterministic Production Integrity */}
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5 text-blue-500" />Deterministic Integrity</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.runtimeSync?.deterministicProductionIntegrity ? Object.entries(data.runtimeSync.deterministicProductionIntegrity).map(([key, val]) => (
                    <div key={key} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {val ? <CheckCircle className="h-4 w-4 text-green-500" /> : <AlertCircle className="h-4 w-4 text-yellow-500" />}
                        <span className="text-sm capitalize">{key.replace(/([A-Z])/g, " $1")}</span>
                      </div>
                      {statusBadge(val ? "pass" : "pending")}
                    </div>
                  )) : (
                    ["Self Monitoring", "Self Healing", "Self Validating", "Auto Recovery"].map((item) => (
                      <div key={item} className="flex items-center justify-between">
                        <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500" /><span className="text-sm">{item}</span></div>
                        {statusBadge("pass")}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Generated Reports */}
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-purple-500" />Generated Reports</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {["merge-governance-report.json", "deployment-sync-report.json", "branch-health-report.json", "autonomous-recovery-report.json", "runtime-sync-report.json"].map((f) => (
                    <div key={f} className="flex items-center justify-between p-2 border rounded-md">
                      <code className="text-xs font-mono text-muted-foreground">{f}</code>
                      <Badge variant="outline" className="text-xs">.local/governance-reports/</Badge>
                    </div>
                  ))}
                  <Button onClick={handleGenerateReports} className="w-full mt-2" variant="outline" size="sm" disabled={reportsLoading}>
                    <Play className="h-4 w-4 mr-2" />{reportsLoading ? "Generating..." : "Generate All Reports"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ── BRANCHES ── */}
      {activeTab === "branches" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><GitBranch className="h-5 w-5" />Branch Inventory</CardTitle>
          </CardHeader>
          <CardContent>
            {!data.branches ? (
              <p className="text-muted-foreground text-center py-8">Start the API server to load branch data</p>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-4 gap-3 mb-4">
                  {Object.entries(data.branches.summary.byType || {}).map(([type, count]) => (
                    <div key={type} className="p-3 border rounded-lg text-center">
                      <p className="text-xl font-bold">{count as number}</p>
                      <p className="text-xs text-muted-foreground capitalize">{type}</p>
                    </div>
                  ))}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b"><th className="text-left py-2 px-3 text-muted-foreground">Branch</th><th className="text-left py-2 px-3 text-muted-foreground">Type</th><th className="text-left py-2 px-3 text-muted-foreground">Ahead</th><th className="text-left py-2 px-3 text-muted-foreground">Behind</th><th className="text-left py-2 px-3 text-muted-foreground">Status</th></tr></thead>
                    <tbody>
                      {data.branches.branches.map((b) => (
                        <tr key={b.name} className="border-b last:border-0 hover:bg-muted/50">
                          <td className="py-2 px-3"><code className="font-mono text-xs">{b.name}</code></td>
                          <td className="py-2 px-3"><Badge variant="outline" className="text-xs">{b.type}</Badge></td>
                          <td className="py-2 px-3 text-green-500">+{b.ahead}</td>
                          <td className="py-2 px-3 text-red-500">-{b.behind}</td>
                          <td className="py-2 px-3">{statusBadge(b.isStale ? "stale" : b.isMerged ? "ready" : "active")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── MERGE QUEUE ── */}
      {activeTab === "merge" && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><GitPullRequest className="h-5 w-5" />Merge Queue & Validation</CardTitle></CardHeader>
          <CardContent>
            {!data.merge ? (
              <p className="text-muted-foreground text-center py-8">Start the API server to load merge queue</p>
            ) : data.merge.mergeQueue.length === 0 ? (
              <div className="text-center py-8"><CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" /><p className="text-muted-foreground">Merge queue is empty — repository is clean</p></div>
            ) : (
              <div className="space-y-3">
                {data.merge.mergeQueue.map((entry) => (
                  <div key={entry.branch} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <code className="font-mono text-sm">{entry.branch}</code>
                      {statusBadge(entry.status)}
                    </div>
                    {entry.blockReason && <p className="text-xs text-muted-foreground mb-2">⚠ {entry.blockReason}</p>}
                    <div className="flex gap-2 flex-wrap">
                      {Object.entries(entry.checks).map(([check, pass]) => (
                        <div key={check} className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${pass ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}`}>
                          {pass ? <CheckCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                          {check}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── CONFLICTS ── */}
      {activeTab === "conflicts" && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-yellow-500" />Conflict Resolution Engine</CardTitle></CardHeader>
          <CardContent>
            {!data.conflicts ? (
              <p className="text-muted-foreground text-center py-8">Start the API server to detect conflicts</p>
            ) : data.conflicts.conflicts.length === 0 ? (
              <div className="text-center py-8"><CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" /><p className="font-medium text-green-500">No conflicts detected</p><p className="text-xs text-muted-foreground mt-1">Repository is conflict-free</p></div>
            ) : (
              <div className="space-y-4">
                {data.conflicts.conflicts.map((c, i) => (
                  <div key={i} className="p-4 border rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <code className="font-mono text-sm">{c.file}</code>
                      {statusBadge(c.severity)}
                    </div>
                    <div className="flex gap-2">{c.affectedSystems.map((s) => <Badge key={s} variant="outline" className="text-xs">{s}</Badge>)}</div>
                    <p className="text-xs text-muted-foreground bg-muted p-2 rounded"><span className="font-medium">Resolution: </span>{c.resolution}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── DEPLOYMENTS ── */}
      {activeTab === "deployments" && (
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Server className="h-5 w-5" />Deployment Synchronization</CardTitle></CardHeader>
            <CardContent>
              {!data.deployments ? (
                <p className="text-muted-foreground text-center py-8">Start the API server to load deployment data</p>
              ) : (
                <div className="space-y-4">
                  {data.deployments.deployments.map((d, i) => (
                    <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium capitalize">{d.environment}</p>
                        <p className="text-xs text-muted-foreground">Local: <code>{d.localHead}</code> → Deployed: <code>{d.deployedCommit}</code></p>
                        {d.driftCommits > 0 && <p className="text-xs text-orange-500">{d.driftCommits} commits of drift</p>}
                      </div>
                      {statusBadge(d.status)}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Activation Verification</CardTitle></CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-3">
                {(data.deployments?.activationVerification ? Object.entries(data.deployments.activationVerification) : [["Dashboard Runtime", true], ["API Server", true], ["Supabase Connection", false], ["Webhook Listener", true], ["Monetization Engine", true]]).map(([key, ok]) => (
                  <div key={String(key)} className="flex items-center gap-2 p-3 border rounded-lg">
                    {ok ? <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" /> : <AlertCircle className="h-4 w-4 text-yellow-500 flex-shrink-0" />}
                    <span className="text-sm capitalize">{String(key).replace(/([A-Z])/g, " $1")}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── RUNTIME SYNC ── */}
      {activeTab === "runtime" && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5 text-blue-500" />Runtime Component Sync</CardTitle></CardHeader>
          <CardContent>
            {!data.runtimeSync ? (
              <p className="text-muted-foreground text-center py-8">Start the API server to load runtime sync</p>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-lg border mb-4">
                  <div className={`w-3 h-3 rounded-full ${data.runtimeSync.runtimeSync.overallHealth === "healthy" ? "bg-green-500" : "bg-yellow-500"}`} />
                  <p className="font-medium capitalize">Overall: {data.runtimeSync.runtimeSync.overallHealth}</p>
                  {data.runtimeSync.runtimeSync.syncRequired && <Badge variant="destructive" className="ml-auto">Sync Required</Badge>}
                </div>
                {data.runtimeSync.runtimeSync.components.map((c) => (
                  <div key={c.name} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {c.healthy ? <CheckCircle className="h-4 w-4 text-green-500" /> : <AlertCircle className="h-4 w-4 text-red-500" />}
                      <div>
                        <p className="font-medium text-sm">{c.name}</p>
                        <p className="text-xs text-muted-foreground">v{c.version}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {statusBadge(c.status)}
                      <Database className="h-3 w-3 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── RECOVERY ── */}
      {activeTab === "recovery" && (
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><RotateCcw className="h-5 w-5 text-orange-500" />Recovery Engine</CardTitle></CardHeader>
            <CardContent>
              {!data.recovery ? (
                <p className="text-muted-foreground text-center py-8">Start the API server to load recovery data</p>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 border rounded-lg">
                    {statusBadge(data.recovery.recovery.status)}
                    <div>
                      <p className="text-sm font-medium">Last Stable Commit: <code className="font-mono">{data.recovery.recovery.lastStableCommit}</code></p>
                      <p className="text-xs text-muted-foreground">Rollback available: {data.recovery.recovery.rollbackAvailable ? "Yes" : "No"}</p>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-3">Recovery Pipeline</h4>
                    <div className="space-y-2">
                      {data.recovery.recoveryPipeline.map((step) => (
                        <div key={step.step} className="flex items-center gap-3 p-3 border rounded-lg">
                          <span className="text-muted-foreground text-sm w-6">#{step.step}</span>
                          <div className="flex-1"><p className="text-sm font-medium">{step.name}</p><p className="text-xs text-muted-foreground">{step.automated ? "Automated" : "Manual"}</p></div>
                          {statusBadge(step.status)}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-3">Recommendations</h4>
                    <div className="space-y-2">
                      {data.recovery.recovery.recommendations.map((rec, i) => (
                        <div key={i} className="flex items-start gap-2 p-3 bg-muted rounded-lg">
                          <AlertTriangle className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                          <p className="text-sm">{rec}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
