import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { OperationalEmptyState } from "@/components/ops/OperationalEmptyState";
import { activeOperationalExecutions } from "@/data/execution-tracker";
import { operationalEmptyStates } from "@/data/operational-mode";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { fetchExecutionCenterStatus, fetchExecutionPreviews, fallbackExecutionStatus, type ExecutionCenterStatus, type ExecutionPreviewRecord, type ExecutionPreviewStatus } from "@/services/executionCenterService";
import { ArrowRight, ClipboardCheck, FileCheck2, Link2, Lock, Route, ShieldCheck, Sparkles, Target, TriangleAlert, Undo2 } from "lucide-react";

const statusTone: Record<ExecutionPreviewStatus, string> = {
  NOT_STARTED: "border-slate-300/30 bg-slate-400/10 text-slate-100",
  READY_FOR_OPERATOR: "border-cyan-300/30 bg-cyan-400/10 text-cyan-100",
  BLOCKED: "border-rose-300/30 bg-rose-400/10 text-rose-100",
  IN_MANUAL_PROGRESS: "border-blue-300/30 bg-blue-400/10 text-blue-100",
  READY_FOR_REVIEW: "border-violet-300/30 bg-violet-400/10 text-violet-100",
  CANCELLED: "border-slate-500/30 bg-slate-600/10 text-slate-300",
};

const pipeline = ["P1 Task Queue", "Quantum Advisory", "Broker P0 Decision Preview", "Execution Center P0 Preview", "Manual Checklist", "Evidence Requirements", "Validation Gate", "Release Gate", "Ledger"];

function countByStatus(previews: ExecutionPreviewRecord[], status: ExecutionPreviewStatus) {
  return previews.filter((preview) => preview.status === status).length;
}

export default function ExecutionTrackerPage() {
  const [status, setStatus] = useState<ExecutionCenterStatus>(() => fallbackExecutionStatus());
  const [previews, setPreviews] = useState<ExecutionPreviewRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const [runtimeStatus, executionPreviews] = await Promise.all([fetchExecutionCenterStatus(controller.signal), fetchExecutionPreviews(controller.signal)]);
        setStatus(runtimeStatus);
        setPreviews(executionPreviews);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    load();
    return () => controller.abort();
  }, []);

  const metrics = useMemo(() => [
    ["Preview records", String(previews.length), "In-memory manual previews"],
    ["Ready for operator", String(countByStatus(previews, "READY_FOR_OPERATOR")), "Awaiting manual review"],
    ["Blocked previews", String(countByStatus(previews, "BLOCKED")), "Safety blocker visible"],
    ["Ready for review", String(countByStatus(previews, "READY_FOR_REVIEW")), "Validation gate candidate"],
    ["Execution disabled", status.executionDisabled ? "TRUE" : "TRUE", "No runtime execution route"],
    ["Evidence required", status.evidenceRequired ? "TRUE" : "TRUE", "Proof before delivery claim"],
  ], [previews, status.executionDisabled, status.evidenceRequired]);

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-violet-400/20 bg-slate-950/85 p-6 shadow-2xl shadow-violet-950/25 backdrop-blur-xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_76%_10%,rgba(139,92,246,0.24),transparent_34%),radial-gradient(circle_at_16%_24%,rgba(34,211,238,0.18),transparent_30%)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-300 to-transparent" />
        <div className="relative grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="border-violet-300/40 bg-violet-400/10 text-violet-100">PREVIEW_ONLY</Badge>
              <Badge variant="outline" className="border-cyan-300/40 text-cyan-100">MANUAL_FIRST</Badge>
              <Badge variant="outline" className="border-emerald-300/40 text-emerald-100">EXECUTION_DISABLED</Badge>
              <Badge variant="outline" className="border-amber-300/40 text-amber-100">EVIDENCE_REQUIRED</Badge>
            </div>
            <div>
              <p className="mb-2 text-xs uppercase tracking-[0.5em] text-violet-200/70">BROKER → EXECUTION PREVIEW → MANUAL CHECKLIST → EVIDENCE → VALIDATION</p>
              <h1 className="max-w-5xl text-4xl font-black tracking-tight text-white md:text-6xl">Execution Center P0</h1>
              <p className="mt-4 max-w-3xl text-base text-slate-300 md:text-lg">
                Safe preview-only runtime layer connected to Broker P0 decisions. It creates internal manual execution previews, tracks checklists, evidence requirements, blockers and rollback notes, and never executes code, deploys services, writes to GitHub, contacts users or touches payments.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {metrics.map(([label, value, hint]) => (
                <Card key={label} className="border-white/10 bg-white/[0.04] backdrop-blur">
                  <CardContent className="p-4">
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-400">{label}</p>
                    <p className="mt-2 text-2xl font-bold text-white">{value}</p>
                    <p className="text-xs text-violet-200">{hint}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
          <Card className="border-violet-300/20 bg-black/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white"><ShieldCheck className="h-5 w-5 text-violet-200" /> Execution boundary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {status.boundaries.map((item) => (
                <div key={item} className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-sm text-slate-300">
                  <Lock className="mt-0.5 h-4 w-4 shrink-0 text-violet-200" />
                  <span>{item}</span>
                </div>
              ))}
              {status.diagnostics ? (
                <div className="rounded-2xl border border-amber-300/20 bg-amber-400/10 p-3 text-xs text-amber-100">
                  <div className="font-bold uppercase tracking-[0.2em]">Backend diagnostic</div>
                  <div className="mt-2 grid gap-1 text-amber-50/85">
                    <span>API base: {status.diagnostics.apiBase}</span>
                    <span>Route: {status.diagnostics.attemptedRoute}</span>
                    <span>Failure: {status.diagnostics.failureType}</span>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-9">
        {pipeline.map((step, index) => (
          <Card key={step} className="border-white/10 bg-slate-950/75">
            <CardContent className="flex min-h-24 flex-col justify-between p-3 text-xs font-bold text-white">
              <span className="grid h-8 w-8 place-items-center rounded-xl border border-violet-300/20 bg-violet-400/10 text-violet-100">{index + 1}</span>
              <span>{step}</span>
            </CardContent>
          </Card>
        ))}
      </section>

      {previews.length ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black text-white">Execution preview records</h2>
              <p className="text-sm text-slate-400">Read-only/manual previews from the API; no execute, deploy, payment or GitHub write controls are rendered.</p>
            </div>
            <Badge variant="outline" className="border-red-300/30 px-3 py-2 text-red-100">No execute / deploy / pay / GitHub-write buttons</Badge>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            {previews.map((preview) => <ExecutionPreviewCard key={preview.id} preview={preview} />)}
          </div>
        </section>
      ) : (
        <OperationalEmptyState
          title={loading ? "Loading Execution Center previews…" : operationalEmptyStates.executions.title}
          description={loading ? "Reading the safe preview-only API." : "No execution previews are in memory yet. Create one from a Broker P0 decision; the fallback state remains manual-first and execution-disabled."}
          nextManualAction={`Go to Broker P0, create a manual execution preview, then return here. Backend status: ${status.status}; static fallback records: ${activeOperationalExecutions.length}.`}
          previousRoute="/ops/broker"
          nextRoute="/ops/validation"
        />
      )}
    </div>
  );
}

function ExecutionPreviewCard({ preview }: { preview: ExecutionPreviewRecord }) {
  const checklistProgress = preview.checklist.length ? Math.round((preview.checklist.filter((item) => item.completed).length / preview.checklist.length) * 100) : 0;

  return (
    <Card className="border-violet-300/20 bg-slate-950/80 backdrop-blur-xl">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{preview.id}</p>
            <CardTitle className="mt-2 text-2xl font-black text-white">{preview.title}</CardTitle>
            <p className="mt-1 text-xs text-slate-400">Created {formatDate(preview.createdAt)} · Updated {formatDate(preview.updatedAt)}</p>
          </div>
          <Badge variant="outline" className={cn("shrink-0", statusTone[preview.status])}>{preview.status}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MiniMetric label="Mode" value={preview.mode} />
          <MiniMetric label="Risk energy" value={String(preview.riskEnergy)} />
          <MiniMetric label="Approval" value={preview.approvalRequired ? "Required" : "Required"} />
          <MiniMetric label="Evidence" value={preview.evidenceRequired ? "Required" : "Required"} />
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Manual checklist</p>
            <span className="text-xs text-violet-200">{checklistProgress}% complete</span>
          </div>
          <Progress value={checklistProgress} className="mb-3 h-2" />
          <ul className="space-y-2 text-sm text-slate-300">
            {preview.checklist.slice(0, 8).map((item) => (
              <li key={item.id} className="flex gap-2"><ClipboardCheck className="mt-0.5 h-4 w-4 shrink-0 text-cyan-200" />{item.label}</li>
            ))}
          </ul>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          <ListBlock icon={FileCheck2} title="Evidence requirements" items={preview.evidenceRequirements.map((item) => item.label)} />
          <ListBlock icon={TriangleAlert} title="Blocked actions" items={preview.blockedActions} danger />
          <ListBlock icon={Undo2} title="Rollback plan" items={preview.rollbackPlan} />
          <ListBlock icon={Route} title="Recommended agents" items={preview.recommendedAgentIds} />
        </div>
        {preview.blockers.length ? <ListBlock icon={TriangleAlert} title="Blockers" items={preview.blockers} danger /> : null}
        <div className="rounded-3xl border border-emerald-300/20 bg-emerald-500/10 p-4 text-sm text-emerald-50">
          <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-emerald-100"><Target className="h-4 w-4" /> Operator next action</p>
          {preview.operatorNextAction}
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="border-violet-300/30 text-violet-100">PREVIEW_ONLY</Badge>
          <Badge variant="outline" className="border-cyan-300/30 text-cyan-100">MANUAL_FIRST</Badge>
          <Badge variant="outline" className="border-emerald-300/30 text-emerald-100">EXECUTION_DISABLED</Badge>
          <Badge variant="outline" className="border-amber-300/30 text-amber-100">EVIDENCE_REQUIRED</Badge>
          {preview.brokerDecisionId ? <Link href="/ops/broker" className="inline-flex items-center gap-1 rounded-md border border-violet-300/30 px-2.5 py-0.5 text-xs font-semibold text-violet-100"><Link2 className="h-3 w-3" /> Broker {preview.brokerDecisionId}<ArrowRight className="h-3 w-3" /></Link> : null}
        </div>
      </CardContent>
    </Card>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-white/10 bg-black/20 p-3"><p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p><p className="mt-1 truncate text-sm font-bold text-white">{value}</p></div>;
}

function ListBlock({ title, items, icon: Icon = Sparkles, danger = false }: { title: string; items: string[]; icon?: typeof Sparkles; danger?: boolean }) {
  const visibleItems = items.length ? items : ["None for preview"];
  return (
    <div className={cn("rounded-3xl border p-4", danger ? "border-red-300/20 bg-red-500/10" : "border-white/10 bg-white/[0.03]")}>
      <p className={cn("mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.24em]", danger ? "text-red-100" : "text-slate-400")}><Icon className="h-4 w-4" />{title}</p>
      <ul className="list-disc space-y-1 pl-4 text-xs text-slate-300">
        {visibleItems.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </div>
  );
}
