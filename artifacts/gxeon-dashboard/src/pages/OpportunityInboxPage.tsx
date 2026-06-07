import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { activeOpportunityStatuses, getOpportunityInboxSummary, getOpportunityStatusCounts, opportunityScoringModel, sampleManualFirstOpportunities, type OpportunityPriority, type OpportunityStatus } from "@/data/opportunity-inbox";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ArrowRight, ClipboardList, DatabaseZap, FileSearch, Hand, Inbox, Lock, Route, ShieldCheck, Sparkles, Target } from "lucide-react";

const statusTone: Record<OpportunityStatus, string> = {
  NEW: "border-sky-300/30 bg-sky-400/10 text-sky-100",
  REVIEWING: "border-violet-300/30 bg-violet-400/10 text-violet-100",
  QUALIFIED: "border-emerald-300/30 bg-emerald-400/10 text-emerald-100",
  PROPOSAL_READY: "border-amber-300/30 bg-amber-400/10 text-amber-100",
  CONTACTED: "border-cyan-300/30 bg-cyan-400/10 text-cyan-100",
  WON: "border-green-300/30 bg-green-400/10 text-green-100",
  LOST: "border-rose-300/30 bg-rose-400/10 text-rose-100",
  ARCHIVED: "border-slate-300/30 bg-slate-400/10 text-slate-100",
};

const priorityTone: Record<OpportunityPriority, string> = {
  LOW: "border-slate-300/30 bg-slate-400/10 text-slate-100",
  MEDIUM: "border-blue-300/30 bg-blue-400/10 text-blue-100",
  HIGH: "border-orange-300/30 bg-orange-400/10 text-orange-100",
  CRITICAL: "border-rose-300/30 bg-rose-400/10 text-rose-100",
};

export default function OpportunityInboxPage() {
  const summary = getOpportunityInboxSummary();
  const statusCounts = getOpportunityStatusCounts();
  const activeStatusValue = statusCounts
    .filter(({ status }) => activeOpportunityStatuses.includes(status))
    .reduce((total, item) => total + item.estimatedValueBrl, 0);

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-emerald-400/20 bg-slate-950/85 p-6 shadow-2xl shadow-emerald-950/25 backdrop-blur-xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_15%,rgba(16,185,129,0.22),transparent_34%),radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.18),transparent_30%)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300 to-transparent" />
        <div className="relative grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="border-emerald-300/40 bg-emerald-400/10 text-emerald-100">P0 Caixa de Oportunidades</Badge>
              <Badge variant="outline" className="border-cyan-300/40 text-cyan-100">No external API calls</Badge>
              <Badge variant="outline" className="border-amber-300/40 text-amber-100">Sample/manual-first data</Badge>
            </div>
            <div>
              <p className="mb-2 text-xs uppercase tracking-[0.5em] text-emerald-200/70">OPORTUNIDADE → TAREFA → EXECUÇÃO → VALIDAÇÃO → RELEASE → LEDGER</p>
              <h1 className="max-w-5xl text-4xl font-black tracking-tight text-white md:text-6xl">P0 · Caixa de Oportunidades do QG</h1>
              <p className="mt-4 max-w-3xl text-base text-slate-300 md:text-lg">
                Primeira camada do QG para capturar, classificar, pontuar e rotear oportunidades manualmente antes de qualquer banco, pagamento, plataforma externa, scraping ou automação.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ["Valor visual do pipeline", formatCurrency(summary.activePipelineValueBrl), "BRL estimate · sample only"],
                ["Alta prioridade P0", String(summary.highPriorityCount), `${summary.criticalPriorityCount} critical sample`],
                ["Oportunidades manuais", String(summary.totalCount), `${summary.activeCount} active statuses`],
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
              <CardTitle className="flex items-center gap-2 text-white"><ShieldCheck className="h-5 w-5 text-emerald-200" /> Boundary operacional do QG</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                [Lock, "Manual entry only", "No platform connections or database writes."],
                [DatabaseZap, "APIs disabled", "Workana, 99Freelas, Upwork, LinkedIn, Supabase and payments remain disconnected."],
                [FileSearch, "Evidence-driven", "Every card requires a human next action before task conversion."],
              ].map(([Icon, label, description]) => (
                <div key={String(label)} className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-200" />
                  <div>
                    <p className="font-semibold text-white">{String(label)}</p>
                    <p className="text-sm text-slate-400">{String(description)}</p>
                  </div>
                </div>
              ))}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <Link href="/ops/tasks">
                  <div className="group flex items-center justify-between rounded-2xl border border-blue-300/20 bg-blue-400/10 p-3 text-sm font-semibold text-blue-100 transition hover:border-blue-200/40">
                    View Task Queue P1
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                  </div>
                </Link>
                <Link href="/ops/execution">
                  <div className="group flex items-center justify-between rounded-2xl border border-violet-300/20 bg-violet-400/10 p-3 text-sm font-semibold text-violet-100 transition hover:border-violet-200/40">
                    View Execution Tracker P2
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                  </div>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-cyan-300/20 bg-slate-950/75 backdrop-blur-xl">
          <CardContent className="p-5">
            <Inbox className="h-6 w-6 text-cyan-200" />
            <p className="mt-4 text-xs uppercase tracking-[0.25em] text-slate-500">Total estimated sample value</p>
            <p className="mt-2 text-3xl font-black text-white">{formatCurrency(summary.totalEstimatedValueBrl)}</p>
            <p className="mt-1 text-sm text-slate-400">Includes archived/lost/won sample states; not recognized revenue.</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-300/20 bg-slate-950/75 backdrop-blur-xl">
          <CardContent className="p-5">
            <Route className="h-6 w-6 text-emerald-200" />
            <p className="mt-4 text-xs uppercase tracking-[0.25em] text-slate-500">Active status value</p>
            <p className="mt-2 text-3xl font-black text-white">{formatCurrency(activeStatusValue)}</p>
            <p className="mt-1 text-sm text-slate-400">NEW through CONTACTED only.</p>
          </CardContent>
        </Card>
        <Card className="border-amber-300/20 bg-slate-950/75 backdrop-blur-xl">
          <CardContent className="p-5">
            <Target className="h-6 w-6 text-amber-200" />
            <p className="mt-4 text-xs uppercase tracking-[0.25em] text-slate-500">Scoring model</p>
            <p className="mt-2 text-3xl font-black text-white">100 pts</p>
            <p className="mt-1 text-sm text-slate-400">Value {opportunityScoringModel.value_weight}% · Fit {opportunityScoringModel.fit_weight}% · Urgency {opportunityScoringModel.urgency_weight}% · Simplicity {opportunityScoringModel.simplicity_weight}%.</p>
          </CardContent>
        </Card>
        <Card className="border-violet-300/20 bg-slate-950/75 backdrop-blur-xl">
          <CardContent className="p-5">
            <Hand className="h-6 w-6 text-violet-200" />
            <p className="mt-4 text-xs uppercase tracking-[0.25em] text-slate-500">Closed sample guard</p>
            <p className="mt-2 text-3xl font-black text-white">{formatCurrency(summary.wonSampleValueBrl)}</p>
            <p className="mt-1 text-sm text-slate-400">WON is present only to validate UI state; no real revenue is claimed.</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="border-emerald-300/20 bg-slate-950/75 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white"><ClipboardList className="h-5 w-5 text-emerald-200" /> Opportunity Pipeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {statusCounts.map(({ status, count, estimatedValueBrl }) => {
              const statusShare = summary.totalCount === 0 ? 0 : (count / summary.totalCount) * 100;
              return (
                <div key={status} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <Badge variant="outline" className={cn("border", statusTone[status])}>{status.replaceAll("_", " ")}</Badge>
                    <div className="text-right">
                      <p className="font-bold text-white">{count} opportunities</p>
                      <p className="text-xs text-slate-400">{formatCurrency(estimatedValueBrl)} sample estimate</p>
                    </div>
                  </div>
                  <Progress value={statusShare} className="mt-3 h-2" />
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="border-cyan-300/20 bg-slate-950/75 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white"><Sparkles className="h-5 w-5 text-cyan-200" /> Manual-first opportunity cards</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            {sampleManualFirstOpportunities.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-cyan-300/30 bg-cyan-400/10 p-8 text-center">
                <p className="text-xl font-bold text-white">No real opportunities have been registered yet.</p>
                <p className="mt-2 text-slate-300">When operators add validated, consented, non-scraped opportunities, they should appear here before becoming Task Queue P0 candidates.</p>
              </div>
            ) : (
              sampleManualFirstOpportunities.map((opportunity) => (
                <article key={opportunity.id} className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-cyan-300/35 hover:bg-cyan-400/10">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="border-cyan-300/30 text-cyan-100">{opportunity.source}</Badge>
                        <Badge variant="outline" className="border-white/15 text-slate-200">{opportunity.category}</Badge>
                        <Badge variant="outline" className={cn("border", priorityTone[opportunity.priority])}>{opportunity.priority}</Badge>
                        <Badge variant="outline" className={cn("border", statusTone[opportunity.status])}>{opportunity.status.replaceAll("_", " ")}</Badge>
                      </div>
                      <h2 className="mt-3 text-xl font-black text-white">{opportunity.title}</h2>
                      <p className="mt-2 text-sm text-slate-400">{opportunity.evidence}</p>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <div>
                          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Value</p>
                          <p className="font-bold text-white">{formatCurrency(opportunity.estimated_value_brl)}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Fit score</p>
                          <p className="font-bold text-white">{opportunity.fit_score}/100</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Complexity</p>
                          <p className="font-bold text-white">{opportunity.complexity}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Updated</p>
                          <p className="font-bold text-white">{formatDate(opportunity.updated_at)}</p>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-4 lg:w-72">
                      <p className="text-xs uppercase tracking-[0.28em] text-emerald-100/70">Next manual action</p>
                      <p className="mt-2 text-sm font-semibold text-white">{opportunity.next_action}</p>
                      <Link href="/ops/tasks">
                        <div className="mt-4 flex items-center justify-between gap-2 rounded-xl border border-emerald-200/20 bg-emerald-300/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-100 transition hover:border-emerald-200/40">
                          <span>Create Task · sample/manual-first</span>
                          <ArrowRight className="h-3 w-3" />
                        </div>
                      </Link>
                      <Link href="/ops/execution">
                        <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-violet-200/20 bg-violet-300/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-violet-100 transition hover:border-violet-200/40">
                          <span>Execution Tracker P2</span>
                          <ArrowRight className="h-3 w-3" />
                        </div>
                      </Link>
                      <p className="mt-2 text-[11px] text-emerald-100/70">Visual affordance only: no backend mutation, database write, or external storage.</p>
                    </div>
                  </div>
                </article>
              ))
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
