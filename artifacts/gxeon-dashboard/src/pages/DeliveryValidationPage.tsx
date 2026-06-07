import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { OperationalEmptyState } from "@/components/ops/OperationalEmptyState";
import {
  approvalStates,
  getApprovalStateCounts,
  getDeliveryValidationSummary,
  getEvidenceTypeCounts,
  getValidationsByApprovalState,
  activeOperationalValidations,
  type ApprovalState,
  type DeliveryRisk,
  type EvidenceState,
  type ValidationStatus,
} from "@/data/delivery-validation";
import { operationalEmptyStates } from "@/data/operational-mode";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ArrowRight, BadgeCheck, ClipboardCheck, DatabaseZap, FileCheck2, GitPullRequestArrow, Image, KanbanSquare, Lock, Route, ShieldCheck, Sparkles, TriangleAlert, UploadCloud } from "lucide-react";

const approvalTone: Record<ApprovalState, string> = {
  PENDING_REVIEW: "border-violet-300/30 bg-violet-400/10 text-violet-100",
  APPROVED: "border-emerald-300/30 bg-emerald-400/10 text-emerald-100",
  REVISION_REQUESTED: "border-amber-300/30 bg-amber-400/10 text-amber-100",
  REJECTED: "border-rose-300/30 bg-rose-400/10 text-rose-100",
  ARCHIVED: "border-slate-500/30 bg-slate-600/10 text-slate-300",
};

const validationTone: Record<ValidationStatus, string> = {
  AWAITING_EVIDENCE: "border-slate-300/30 bg-slate-400/10 text-slate-100",
  EVIDENCE_ATTACHED: "border-blue-300/30 bg-blue-400/10 text-blue-100",
  MANUAL_REVIEW: "border-violet-300/30 bg-violet-400/10 text-violet-100",
  VALIDATED: "border-emerald-300/30 bg-emerald-400/10 text-emerald-100",
  VALIDATION_BLOCKED: "border-rose-300/30 bg-rose-400/10 text-rose-100",
  CLOSED_SAMPLE: "border-slate-500/30 bg-slate-600/10 text-slate-300",
};

const evidenceTone: Record<EvidenceState, string> = {
  MISSING: "border-rose-300/30 bg-rose-400/10 text-rose-100",
  SAMPLE_ATTACHED: "border-blue-300/30 bg-blue-400/10 text-blue-100",
  READY_FOR_REVIEW: "border-violet-300/30 bg-violet-400/10 text-violet-100",
  MANUALLY_VERIFIED: "border-emerald-300/30 bg-emerald-400/10 text-emerald-100",
  NEEDS_REVISION: "border-amber-300/30 bg-amber-400/10 text-amber-100",
};

const riskTone: Record<DeliveryRisk, string> = {
  LOW: "border-slate-300/30 bg-slate-400/10 text-slate-100",
  MEDIUM: "border-blue-300/30 bg-blue-400/10 text-blue-100",
  HIGH: "border-orange-300/30 bg-orange-400/10 text-orange-100",
  CRITICAL: "border-rose-300/30 bg-rose-400/10 text-rose-100",
};

const evidenceIcon = {
  "GitHub PR": GitPullRequestArrow,
  "Vercel Preview": UploadCloud,
  Screenshot: Image,
  Document: FileCheck2,
  "Manual Validation": ClipboardCheck,
};

export default function DeliveryValidationPage() {
  const summary = getDeliveryValidationSummary();
  const approvalCounts = getApprovalStateCounts();
  const evidenceCounts = getEvidenceTypeCounts();

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-emerald-400/20 bg-slate-950/85 p-6 shadow-2xl shadow-emerald-950/25 backdrop-blur-xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_12%,rgba(16,185,129,0.24),transparent_35%),radial-gradient(circle_at_15%_24%,rgba(34,211,238,0.18),transparent_32%)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300 to-transparent" />
        <div className="relative grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="border-emerald-300/40 bg-emerald-400/10 text-emerald-100">P3 Validação de Entrega</Badge>
              <Badge variant="outline" className="border-cyan-300/40 text-cyan-100">Visual-only mode</Badge>
              <Badge variant="outline" className="border-amber-300/40 text-amber-100">No external API calls</Badge>
              <Badge variant="outline" className="border-rose-300/40 text-rose-100">No database mutations</Badge>
            </div>
            <div>
              <p className="mb-2 text-xs uppercase tracking-[0.5em] text-emerald-200/70">P0 Oportunidade → P1 Tarefa → P2 Execução → P3 Validação</p>
              <h1 className="max-w-5xl text-4xl font-black tracking-tight text-white md:text-6xl">P3 · Validação de Entrega do QG</h1>
              <p className="mt-4 max-w-3xl text-base text-slate-300 md:text-lg">
                Fourth operational validation layer for GXEON OS. P3 validates execution outcomes with static approval states, rejection states, revision states and evidence checks before any persistence, payment, storage, automation or external integration is activated.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ["Total validations", String(summary.total_validations), "Static P3 records"],
                ["Pending review", String(summary.pending_review), "Human gate required"],
                ["Approved", String(summary.approved), "Sample approval only"],
                ["Revision requested", String(summary.revision_requested), "Needs manual change"],
                ["Rejected", String(summary.rejected), "Evidence or quality failed"],
                ["Archived", String(summary.archived), "Closed pendente state"],
                ["Missing evidence", String(summary.missing_evidence), "No external fetch"],
                ["Value in validation", formatCurrency(summary.delivery_value_under_validation_brl), "BRL estimate · registro real pendente"],
              ].map(([label, value, hint]) => (
                <Card key={label} className="border-white/10 bg-white/[0.04] backdrop-blur">
                  <CardContent className="p-4">
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-400">{label}</p>
                    <p className="mt-2 text-2xl font-bold text-white">{value}</p>
                    <p className="text-xs text-emerald-200">{hint}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
          <Card className="border-emerald-300/20 bg-black/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white"><ShieldCheck className="h-5 w-5 text-emerald-200" /> P3 operating boundary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                [Route, "P0/P1/P2 relationship", "Every pendente validation references the upstream opportunity, task and execution chain where available."],
                [Lock, "Manual approval workflow", "Pending Review, Approved, Revision Requested, Rejected and Archived are static visual states."],
                [DatabaseZap, "No backend activation", "GitHub, Vercel, Supabase, Railway, payments, auth and storage remain disconnected."],
              ].map(([Icon, label, description]) => (
                <div key={String(label)} className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-200" />
                  <div>
                    <p className="font-semibold text-white">{String(label)}</p>
                    <p className="text-sm text-slate-400">{String(description)}</p>
                  </div>
                </div>
              ))}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-3">
                <Link href="/ops/opportunities"><div className="group flex items-center justify-between rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-3 text-sm font-semibold text-emerald-100 transition hover:border-emerald-200/40">P0 Inbox <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></div></Link>
                <Link href="/ops/tasks"><div className="group flex items-center justify-between rounded-2xl border border-blue-300/20 bg-blue-400/10 p-3 text-sm font-semibold text-blue-100 transition hover:border-blue-200/40">P1 Tasks <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></div></Link>
                <Link href="/ops/execution"><div className="group flex items-center justify-between rounded-2xl border border-violet-300/20 bg-violet-400/10 p-3 text-sm font-semibold text-violet-100 transition hover:border-violet-200/40">P2 Execution <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></div></Link>
                <Link href="/ops/release"><div className="group flex items-center justify-between rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-3 text-sm font-semibold text-emerald-100 transition hover:border-emerald-200/40">P4 Release Gate <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></div></Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
        <Card className="border-cyan-300/20 bg-slate-950/75 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white"><BadgeCheck className="h-5 w-5 text-cyan-200" /> Approval workflow</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {approvalCounts.map(({ state, count }) => {
              const share = activeOperationalValidations.length === 0 ? 0 : (count / activeOperationalValidations.length) * 100;
              return (
                <div key={state} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <Badge variant="outline" className={cn("border", approvalTone[state])}>{state.replaceAll("_", " ")}</Badge>
                    <p className="font-bold text-white">{count} records</p>
                  </div>
                  <Progress value={share} className="mt-3 h-2" />
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="border-emerald-300/20 bg-slate-950/75 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white"><KanbanSquare className="h-5 w-5 text-emerald-200" /> Static approval board</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              {approvalStates.map((state) => {
                const validations = getValidationsByApprovalState(state);
                return (
                  <div key={state} className="rounded-3xl border border-white/10 bg-white/[0.03] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <Badge variant="outline" className={cn("border", approvalTone[state])}>{state.replaceAll("_", " ")}</Badge>
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-bold text-white">{validations.length}</span>
                    </div>
                    <div className="mt-3 space-y-3">
                      {validations.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-4 text-sm text-slate-500">No pendente validations in this approval state.</div>
                      ) : (
                        validations.map((validation) => (
                          <div key={validation.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                            <div className="flex flex-wrap gap-2">
                              <Badge variant="outline" className={cn("border text-[10px]", riskTone[validation.risk])}>{validation.risk}</Badge>
                              <Badge variant="outline" className={cn("border text-[10px]", validationTone[validation.validation_status])}>{validation.validation_status.replaceAll("_", " ")}</Badge>
                            </div>
                            <p className="mt-2 text-sm font-bold text-white">{validation.title}</p>
                            <p className="mt-1 text-xs text-slate-400">{validation.id}</p>
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

      <section className="grid gap-6 xl:grid-cols-[0.7fr_1.3fr]">
        <Card className="border-amber-300/20 bg-slate-950/75 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white"><FileCheck2 className="h-5 w-5 text-amber-200" /> Evidence validation layer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="rounded-2xl border border-amber-300/20 bg-amber-400/10 p-3 text-sm text-amber-50">
              Evidence names are static labels only. P3 does not fetch GitHub PRs, Vercel previews, screenshots, documents or manual notes from external systems.
            </p>
            {evidenceCounts.map(({ type, count }) => {
              const Icon = evidenceIcon[type];
              return (
                <div key={type} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="flex items-center gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-amber-100"><Icon className="h-4 w-4" /></span>
                    <p className="font-semibold text-white">{type}</p>
                  </div>
                  <Badge variant="outline" className="border-white/15 text-slate-200">{count}</Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="border-cyan-300/20 bg-slate-950/75 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white"><Sparkles className="h-5 w-5 text-cyan-200" /> Delivery validation cards</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            {activeOperationalValidations.length === 0 ? (
              <OperationalEmptyState {...operationalEmptyStates.validations} />
            ) : (
              activeOperationalValidations.map((validation) => (
              <article key={validation.id} className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-cyan-300/35 hover:bg-cyan-400/10">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="border-cyan-300/30 text-cyan-100">{validation.id}</Badge>
                      <Badge variant="outline" className={cn("border", riskTone[validation.risk])}>{validation.risk}</Badge>
                      <Badge variant="outline" className={cn("border", approvalTone[validation.approval_state])}>{validation.approval_state.replaceAll("_", " ")}</Badge>
                      <Badge variant="outline" className={cn("border", validationTone[validation.validation_status])}>{validation.validation_status.replaceAll("_", " ")}</Badge>
                      <Badge variant="outline" className="border-amber-300/30 text-amber-100">operacional</Badge>
                    </div>
                    <h2 className="mt-3 text-xl font-black text-white">{validation.title}</h2>
                    <p className="mt-2 text-sm text-slate-400">{validation.outcome_summary}</p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div><p className="text-xs uppercase tracking-[0.24em] text-slate-500">Client label</p><p className="font-bold text-white">{validation.client_label}</p></div>
                      <div><p className="text-xs uppercase tracking-[0.24em] text-slate-500">Value</p><p className="font-bold text-white">{formatCurrency(validation.delivery_value_brl)}</p></div>
                      <div><p className="text-xs uppercase tracking-[0.24em] text-slate-500">Validator</p><p className="font-bold text-white">{validation.validator}</p></div>
                      <div><p className="text-xs uppercase tracking-[0.24em] text-slate-500">Updated</p><p className="font-bold text-white">{formatDate(validation.updated_at)}</p></div>
                    </div>
                    <p className="mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-3 text-sm font-semibold text-emerald-50">{validation.p0_p1_p2_relationship}</p>
                    <div className="mt-4 grid gap-2 md:grid-cols-3">
                      {validation.acceptance_criteria.map((criteria) => (
                        <div key={criteria} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-sm text-slate-300">{criteria}</div>
                      ))}
                    </div>
                    {validation.rejection_state !== "NONE" || validation.revision_state !== "NONE" ? (
                      <div className="mt-4 flex gap-3 rounded-2xl border border-amber-300/20 bg-amber-400/10 p-3 text-sm text-amber-50">
                        <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>Rejection: {validation.rejection_state.replaceAll("_", " ")} · Revision: {validation.revision_state.replaceAll("_", " ")}</span>
                      </div>
                    ) : null}
                  </div>
                  <div className="space-y-3 rounded-2xl border border-violet-300/20 bg-violet-400/10 p-4 xl:w-[26rem]">
                    <div>
                      <p className="text-xs uppercase tracking-[0.28em] text-violet-100/70">Next manual gate</p>
                      <p className="mt-2 text-sm font-semibold text-white">{validation.next_manual_gate}</p>
                    </div>
                    <div className="space-y-2">
                      {validation.evidence.map((evidence) => {
                        const Icon = evidenceIcon[evidence.type];
                        return (
                          <div key={`${validation.id}-${evidence.type}-${evidence.label}`} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <Icon className="h-4 w-4 text-violet-100" />
                              <Badge variant="outline" className="border-white/15 text-slate-200">{evidence.type}</Badge>
                              <Badge variant="outline" className={cn("border", evidenceTone[evidence.state])}>{evidence.state.replaceAll("_", " ")}</Badge>
                            </div>
                            <p className="mt-2 text-sm font-bold text-white">{evidence.label}</p>
                            <p className="mt-1 text-xs text-slate-400">{evidence.note}</p>
                          </div>
                        );
                      })}
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
