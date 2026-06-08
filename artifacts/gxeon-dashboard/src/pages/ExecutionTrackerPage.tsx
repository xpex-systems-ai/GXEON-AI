import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { OperationalEmptyState } from "@/components/ops/OperationalEmptyState";
import {
  executionBoardStatuses,
  getExecutionSummary,
  getExecutionsByStatus,
  getProofStatusCounts,
  activeOperationalExecutions,
  type ExecutionPriority,
  type ExecutionStatus,
  type ProofStatus,
} from "@/data/execution-tracker";
import { operationalEmptyStates } from "@/data/operational-mode";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ArrowRight, ClipboardCheck, DatabaseZap, FileCheck2, KanbanSquare, Link2, Lock, Route, ShieldCheck, Sparkles, Target, TriangleAlert } from "lucide-react";

const statusTone: Record<ExecutionStatus, string> = {
  NOT_STARTED: "border-slate-300/30 bg-slate-400/10 text-slate-100",
  IN_PROGRESS: "border-blue-300/30 bg-blue-400/10 text-blue-100",
  BLOCKED: "border-rose-300/30 bg-rose-400/10 text-rose-100",
  REVIEW: "border-violet-300/30 bg-violet-400/10 text-violet-100",
  DELIVERED: "border-emerald-300/30 bg-emerald-400/10 text-emerald-100",
  VERIFIED: "border-cyan-300/30 bg-cyan-400/10 text-cyan-100",
  ARCHIVED: "border-slate-500/30 bg-slate-600/10 text-slate-300",
};

const priorityTone: Record<ExecutionPriority, string> = {
  LOW: "border-slate-300/30 bg-slate-400/10 text-slate-100",
  MEDIUM: "border-blue-300/30 bg-blue-400/10 text-blue-100",
  HIGH: "border-orange-300/30 bg-orange-400/10 text-orange-100",
  CRITICAL: "border-rose-300/30 bg-rose-400/10 text-rose-100",
};

const proofTone: Record<ProofStatus, string> = {
  MISSING: "border-rose-300/30 bg-rose-400/10 text-rose-100",
  DRAFT: "border-amber-300/30 bg-amber-400/10 text-amber-100",
  ATTACHED_REAL: "border-blue-300/30 bg-blue-400/10 text-blue-100",
  READY_FOR_REVIEW: "border-violet-300/30 bg-violet-400/10 text-violet-100",
  VERIFIED_REAL: "border-emerald-300/30 bg-emerald-400/10 text-emerald-100",
};

const proofLabel: Record<ProofStatus, string> = {
  MISSING: "Missing",
  DRAFT: "Draft",
  ATTACHED_REAL: "Attached pendente",
  READY_FOR_REVIEW: "Ready for review",
  VERIFIED_REAL: "Verified pendente",
};

export default function ExecutionTrackerPage() {
  const summary = getExecutionSummary();
  const proofCounts = getProofStatusCounts();

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-violet-400/20 bg-slate-950/85 p-6 shadow-2xl shadow-violet-950/25 backdrop-blur-xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_76%_10%,rgba(139,92,246,0.24),transparent_34%),radial-gradient(circle_at_16%_24%,rgba(34,211,238,0.18),transparent_30%)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-300 to-transparent" />
        <div className="relative grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="border-violet-300/40 bg-violet-400/10 text-violet-100">P2 Rastreador de Execução</Badge>
              <Badge variant="outline" className="border-cyan-300/40 text-cyan-100">No external API calls</Badge>
              <Badge variant="outline" className="border-amber-300/40 text-amber-100">Sample/manual-first data</Badge>
            </div>
            <div>
              <p className="mb-2 text-xs uppercase tracking-[0.5em] text-violet-200/70">OPORTUNIDADE → TAREFA → EXECUÇÃO → VALIDAÇÃO → RELEASE → LEDGER</p>
              <h1 className="max-w-5xl text-4xl font-black tracking-tight text-white md:text-6xl">P2 · Rastreador de Execução do QG</h1>
              <p className="mt-4 max-w-3xl text-base text-slate-300 md:text-lg">
                Terceira camada do QG conectando P0 e P1 a evidências manuais de execução, bloqueios, entregáveis e prova de trabalho antes de qualquer banco, pagamento, storage ou integração externa.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {[
                ["Active executions", String(summary.active_executions), "Manual execution statuses"],
                ["Blocked executions", String(summary.blocked_executions), "Needs operator evidence"],
                ["Ready for review", String(summary.ready_for_review), "Status or proof review"],
                ["Execution value", formatCurrency(summary.estimated_value_in_execution_brl), "BRL estimate · registro real pendente"],
                ["Average progress", `${summary.average_progress}%`, "Static progress signal"],
                ["Missing proof", String(summary.missing_proof_count), "Evidence not attached"],
              ].map(([label, value, hint]) => (
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
              {[
                [Route, "P0 + P1 relationship", "Execution records reference pendente Opportunity IDs and Task IDs where feasible."],
                [Lock, "Manual proof only", "Proof labels are placeholders or pendente evidence states until integrations are explicitly activated."],
                [DatabaseZap, "Integrations disabled", "No GitHub, Vercel, Microsoft 365, Supabase, Railway, storage or payment calls are made."],
              ].map(([Icon, label, description]) => (
                <div key={String(label)} className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-violet-200" />
                  <div>
                    <p className="font-semibold text-white">{String(label)}</p>
                    <p className="text-sm text-slate-400">{String(description)}</p>
                  </div>
                </div>
              ))}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <Link href="/ops/opportunities">
                  <div className="group flex items-center justify-between rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-3 text-sm font-semibold text-emerald-100 transition hover:border-emerald-200/40">
                    View Opportunity Inbox P0
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                  </div>
                </Link>
                <Link href="/ops/tasks">
                  <div className="group flex items-center justify-between rounded-2xl border border-blue-300/20 bg-blue-400/10 p-3 text-sm font-semibold text-blue-100 transition hover:border-blue-200/40">
                    View Task Queue P1
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                  </div>
                </Link>
                <Link href="/ops/validation">
                  <div className="group flex items-center justify-between rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-3 text-sm font-semibold text-emerald-100 transition hover:border-emerald-200/40">
                    View Delivery Validation P3
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                  </div>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Card className="border-amber-300/20 bg-slate-950/75 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white"><FileCheck2 className="h-5 w-5 text-amber-200" /> Proof-of-work state</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="rounded-2xl border border-amber-300/20 bg-amber-400/10 p-3 text-sm text-amber-50">
              Proof links and labels are placeholders/pendente evidence until GitHub, Vercel, Microsoft 365, storage or database integrations are explicitly designed and activated.
            </p>
            {proofCounts.map(({ status, count }) => {
              const share = activeOperationalExecutions.length === 0 ? 0 : (count / activeOperationalExecutions.length) * 100;
              return (
                <div key={status} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <Badge variant="outline" className={cn("border", proofTone[status])}>{proofLabel[status]}</Badge>
                    <p className="font-bold text-white">{count} records</p>
                  </div>
                  <Progress value={share} className="mt-3 h-2" />
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="border-violet-300/20 bg-slate-950/75 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white"><KanbanSquare className="h-5 w-5 text-violet-200" /> Manual-first execution board</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {executionBoardStatuses.map((status) => {
                const executions = getExecutionsByStatus(status);
                return (
                  <div key={status} className="rounded-3xl border border-white/10 bg-white/[0.03] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <Badge variant="outline" className={cn("border", statusTone[status])}>{status.replaceAll("_", " ")}</Badge>
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-bold text-white">{executions.length}</span>
                    </div>
                    <div className="mt-3 space-y-3">
                      {executions.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-4 text-sm text-slate-500">
                          No operacional executions in this status yet.
                        </div>
                      ) : (
                        executions.map((execution) => (
                          <div key={execution.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                            <div className="flex flex-wrap gap-2">
                              <Badge variant="outline" className={cn("border text-[10px]", priorityTone[execution.priority])}>{execution.priority}</Badge>
                              <Badge variant="outline" className={cn("border text-[10px]", proofTone[execution.proof_status])}>{proofLabel[execution.proof_status]}</Badge>
                              <Badge variant="outline" className="border-white/15 text-[10px] text-slate-300">{execution.progress_percent}%</Badge>
                            </div>
                            <p className="mt-2 text-sm font-bold text-white">{execution.title}</p>
                            <Progress value={execution.progress_percent} className="mt-3 h-1.5" />
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="border-cyan-300/20 bg-slate-950/75 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white"><Sparkles className="h-5 w-5 text-cyan-200" /> Execution evidence cards</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            {activeOperationalExecutions.length === 0 ? (
              <OperationalEmptyState {...operationalEmptyStates.executions} />
            ) : (
              activeOperationalExecutions.map((execution) => (
              <article key={execution.id} className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-cyan-300/35 hover:bg-cyan-400/10">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="border-cyan-300/30 text-cyan-100">{execution.execution_type}</Badge>
                      <Badge variant="outline" className={cn("border", priorityTone[execution.priority])}>{execution.priority}</Badge>
                      <Badge variant="outline" className={cn("border", statusTone[execution.status])}>{execution.status.replaceAll("_", " ")}</Badge>
                      <Badge variant="outline" className={cn("border", proofTone[execution.proof_status])}>{proofLabel[execution.proof_status]}</Badge>
                      <Badge variant="outline" className="border-amber-300/30 text-amber-100">operacional</Badge>
                    </div>
                    <h2 className="mt-3 text-xl font-black text-white">{execution.title}</h2>
                    <p className="mt-2 text-sm text-slate-400">
                      Source relationship: {execution.opportunity_id ? `${execution.opportunity_id} → ` : "Internal manual task → "}{execution.task_id} → {execution.id}.
                    </p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                      <div>
                        <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Client label</p>
                        <p className="font-bold text-white">{execution.client_label}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Value</p>
                        <p className="font-bold text-white">{formatCurrency(execution.estimated_value_brl)}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Owner</p>
                        <p className="font-bold text-white">{execution.owner}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Proof type</p>
                        <p className="font-bold text-white">{execution.proof_type}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Updated</p>
                        <p className="font-bold text-white">{formatDate(execution.updated_at)}</p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
                        <span>Manual progress</span>
                        <span>{execution.progress_percent}%</span>
                      </div>
                      <Progress value={execution.progress_percent} className="h-2" />
                    </div>
                    {execution.blocker ? (
                      <div className="mt-4 flex gap-3 rounded-2xl border border-rose-300/20 bg-rose-400/10 p-3 text-sm text-rose-50">
                        <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>{execution.blocker}</span>
                      </div>
                    ) : null}
                  </div>
                  <div className="space-y-3 rounded-2xl border border-violet-300/20 bg-violet-400/10 p-4 lg:w-96">
                    <div>
                      <p className="text-xs uppercase tracking-[0.28em] text-violet-100/70">Next manual action</p>
                      <p className="mt-2 text-sm font-semibold text-white">{execution.next_action}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                      <p className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-violet-100/70"><ClipboardCheck className="h-3.5 w-3.5" /> Proof label</p>
                      <p className="mt-2 text-sm font-semibold text-white">{execution.proof_label}</p>
                    </div>
                    {execution.deliverable ? (
                      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                        <p className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-violet-100/70"><Target className="h-3.5 w-3.5" /> Deliverable</p>
                        <p className="mt-2 text-sm font-semibold text-white">{execution.deliverable}</p>
                      </div>
                    ) : null}
                    <div className="rounded-2xl border border-cyan-300/20 bg-cyan-400/10 p-3 text-xs text-cyan-50">
                      <div className="flex items-center gap-2 font-semibold uppercase tracking-[0.18em]"><Link2 className="h-3.5 w-3.5" /> Placeholder evidence only</div>
                      <p className="mt-2 text-cyan-100/80">No files are uploaded and no GitHub, Vercel, storage or database API is called from this tracker.</p>
                    </div>
                  </div>
                </div>
              </article>
            )))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
