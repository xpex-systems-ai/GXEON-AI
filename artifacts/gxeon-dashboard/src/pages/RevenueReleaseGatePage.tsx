import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  getReleaseStatusCounts,
  getReleasesByStatus,
  getRevenueReleaseSummary,
  releaseStatuses,
  sampleRevenueReleases,
  type AuthorizationStatus,
  type EvidenceCompleteness,
  type FinancialReadinessState,
  type ReleaseStatus,
} from "@/data/revenue-release-gate";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ArrowRight, BadgeDollarSign, CheckCircle2, CircleDollarSign, GitBranch, KanbanSquare, Lock, ReceiptText, ShieldCheck, TriangleAlert, WalletCards, XCircle } from "lucide-react";

const releaseTone: Record<ReleaseStatus, string> = {
  PENDING_REVIEW: "border-violet-300/30 bg-violet-400/10 text-violet-100",
  READY_FOR_RELEASE: "border-emerald-300/30 bg-emerald-400/10 text-emerald-100",
  BLOCKED: "border-rose-300/30 bg-rose-400/10 text-rose-100",
  RELEASED_SAMPLE: "border-cyan-300/30 bg-cyan-400/10 text-cyan-100",
  ARCHIVED: "border-slate-500/30 bg-slate-600/10 text-slate-300",
};

const financialTone: Record<FinancialReadinessState, string> = {
  NOT_READY: "border-rose-300/30 bg-rose-400/10 text-rose-100",
  NEEDS_REVIEW: "border-amber-300/30 bg-amber-400/10 text-amber-100",
  READY_MANUAL: "border-emerald-300/30 bg-emerald-400/10 text-emerald-100",
  SAMPLE_RELEASED: "border-cyan-300/30 bg-cyan-400/10 text-cyan-100",
  ARCHIVED: "border-slate-500/30 bg-slate-600/10 text-slate-300",
};

const evidenceTone: Record<EvidenceCompleteness, string> = {
  INCOMPLETE: "border-rose-300/30 bg-rose-400/10 text-rose-100",
  PARTIAL: "border-amber-300/30 bg-amber-400/10 text-amber-100",
  COMPLETE: "border-blue-300/30 bg-blue-400/10 text-blue-100",
  VERIFIED_SAMPLE: "border-emerald-300/30 bg-emerald-400/10 text-emerald-100",
};

const authorizationTone: Record<AuthorizationStatus, string> = {
  NOT_REQUESTED: "border-slate-300/30 bg-slate-400/10 text-slate-100",
  PENDING_OPERATOR: "border-violet-300/30 bg-violet-400/10 text-violet-100",
  AUTHORIZED_SAMPLE: "border-emerald-300/30 bg-emerald-400/10 text-emerald-100",
  BLOCKED: "border-rose-300/30 bg-rose-400/10 text-rose-100",
  ARCHIVED: "border-slate-500/30 bg-slate-600/10 text-slate-300",
};

const checklistLabels = [
  ["delivery_approved", "Delivery approved"],
  ["evidence_complete", "Evidence complete"],
  ["scope_confirmed", "Scope confirmed"],
  ["release_authorized", "Release authorized"],
  ["financial_ready", "Financial readiness"],
] as const;

export default function RevenueReleaseGatePage() {
  const summary = getRevenueReleaseSummary();
  const statusCounts = getReleaseStatusCounts();

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-emerald-400/20 bg-slate-950/85 p-6 shadow-2xl shadow-emerald-950/25 backdrop-blur-xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_10%,rgba(16,185,129,0.24),transparent_34%),radial-gradient(circle_at_18%_24%,rgba(34,211,238,0.18),transparent_34%)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300 to-transparent" />
        <div className="relative grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="border-emerald-300/40 bg-emerald-400/10 text-emerald-100">P4 Release Gate</Badge>
              <Badge variant="outline" className="border-cyan-300/40 text-cyan-100">Safe Preview Mode</Badge>
              <Badge variant="outline" className="border-amber-300/40 text-amber-100">No payment gateway</Badge>
              <Badge variant="outline" className="border-rose-300/40 text-rose-100">No revenue claims</Badge>
              <Link href="/ops/ledger" className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-400/10 px-3 py-1 text-xs font-bold text-cyan-50 transition hover:bg-cyan-400/20">Open P5 Ledger <ArrowRight className="h-3.5 w-3.5" /></Link>
            </div>
            <div>
              <p className="mb-2 text-xs uppercase tracking-[0.5em] text-emerald-200/70">OPP → TASK → EXEC → VAL → RELEASE</p>
              <h1 className="max-w-5xl text-4xl font-black tracking-tight text-white md:text-6xl">Revenue Release Gate P4</h1>
              <p className="mt-4 max-w-3xl text-base text-slate-300 md:text-lg">
                Manual-first release validation layer connecting Delivery Validation P3 to Financial Readiness. P4 makes release eligibility visible without creating invoices, processing payments, writing databases, connecting Supabase, or activating automation.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ["Total records", String(summary.total_records), "Static P4 samples"],
                ["Ready for release", String(summary.ready_for_release), "Manual-only approval"],
                ["Blocked", String(summary.blocked), "Held from release"],
                ["Pending review", String(summary.pending_review), "Human review needed"],
                ["Estimated total", formatCurrency(summary.estimated_revenue_total_brl), "Pipeline estimate only"],
                ["Releasable sample", formatCurrency(summary.releasable_revenue_total_brl), "Not received revenue"],
                ["Avg readiness", `${summary.average_readiness_score}%`, "Financial checklist score"],
                ["Authorized samples", String(summary.authorized_sample_count), "Visual authorization labels"],
              ].map(([label, value, hint]) => (
                <Card key={label} className="border-white/10 bg-white/[0.04] backdrop-blur">
                  <CardContent className="p-4">
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-400">{label}</p>
                    <p className="mt-2 text-2xl font-black text-white">{value}</p>
                    <p className="mt-1 text-xs text-slate-500">{hint}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
          <Card className="border-emerald-300/20 bg-emerald-400/10 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white"><Lock className="h-5 w-5 text-emerald-200" /> Safety boundaries</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-emerald-50">
              {[
                "Static sample/manual-first data only",
                "Zero external API calls or Supabase writes",
                "No Stripe, Mercado Pago, invoices, receipts, or ledger transactions",
                "Estimated values are pipeline readiness labels, not revenue claims",
                "P5 Financial Ledger is manual-first and visual-only",
              ].map((item) => (
                <div key={item} className="flex gap-3 rounded-2xl border border-emerald-200/15 bg-slate-950/35 p-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
              <Link href="/ops/validation">
                <div className="group flex items-center justify-between rounded-2xl border border-cyan-300/20 bg-cyan-400/10 p-3 font-semibold text-cyan-50 transition hover:border-cyan-200/40">
                  Back to Delivery Validation P3 <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </div>
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.72fr_1.28fr]">
        <Card className="border-cyan-300/20 bg-slate-950/75 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white"><CircleDollarSign className="h-5 w-5 text-cyan-200" /> Financial readiness layer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {sampleRevenueReleases.filter((release) => release.release_status !== "ARCHIVED").map((release) => (
              <div key={`${release.id}-readiness`} className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Badge variant="outline" className="border-cyan-300/30 text-cyan-100">{release.id}</Badge>
                    <h2 className="mt-2 font-black text-white">{release.title}</h2>
                    <p className="mt-1 text-xs text-slate-400">{release.client_label}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-white">{release.readiness_score}%</p>
                    <p className="text-xs text-slate-500">readiness score</p>
                  </div>
                </div>
                <Progress value={release.readiness_score} className="mt-4 h-2" />
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {checklistLabels.map(([key, label]) => {
                    const passed = release.checklist[key];
                    const Icon = passed ? CheckCircle2 : XCircle;
                    return (
                      <div key={`${release.id}-${key}`} className={cn("flex items-center gap-2 rounded-2xl border p-3 text-sm", passed ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-50" : "border-slate-300/10 bg-white/[0.03] text-slate-400")}>
                        <Icon className="h-4 w-4 shrink-0" />
                        <span>{label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-emerald-300/20 bg-slate-950/75 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white"><KanbanSquare className="h-5 w-5 text-emerald-200" /> Release board</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              {releaseStatuses.map((status) => {
                const releases = getReleasesByStatus(status);
                return (
                  <div key={status} className="rounded-3xl border border-white/10 bg-white/[0.03] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <Badge variant="outline" className={cn("border", releaseTone[status])}>{status.replaceAll("_", " ")}</Badge>
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-bold text-white">{releases.length}</span>
                    </div>
                    <div className="mt-3 space-y-3">
                      {releases.map((release) => (
                        <div key={`${status}-${release.id}`} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                          <p className="text-sm font-bold text-white">{release.title}</p>
                          <p className="mt-1 text-xs text-slate-400">{release.id}</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Badge variant="outline" className={cn("border text-[10px]", financialTone[release.financial_readiness_state])}>{release.financial_readiness_state.replaceAll("_", " ")}</Badge>
                            <Badge variant="outline" className="border-white/15 text-[10px] text-slate-200">{release.readiness_score}%</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <Card className="border-cyan-300/20 bg-slate-950/75 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white"><GitBranch className="h-5 w-5 text-cyan-200" /> Pipeline traceability</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            {sampleRevenueReleases.map((release) => (
              <article key={release.id} className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-cyan-300/35 hover:bg-cyan-400/10">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="border-cyan-300/30 text-cyan-100">{release.id}</Badge>
                      <Badge variant="outline" className={cn("border", releaseTone[release.release_status])}>{release.release_status.replaceAll("_", " ")}</Badge>
                      <Badge variant="outline" className={cn("border", evidenceTone[release.evidence_completeness])}>{release.evidence_completeness.replaceAll("_", " ")}</Badge>
                      <Badge variant="outline" className={cn("border", authorizationTone[release.authorization_status])}>{release.authorization_status.replaceAll("_", " ")}</Badge>
                    </div>
                    <h2 className="mt-3 text-xl font-black text-white">{release.title}</h2>
                    <p className="mt-2 text-sm text-slate-400">{release.release_summary}</p>
                    <p className="mt-4 rounded-2xl border border-cyan-300/20 bg-cyan-400/10 p-3 text-sm font-semibold text-cyan-50">{release.p0_p1_p2_p3_p4_trace}</p>
                    {release.blocker ? (
                      <div className="mt-4 flex gap-3 rounded-2xl border border-rose-300/20 bg-rose-400/10 p-3 text-sm text-rose-50">
                        <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>{release.blocker}</span>
                      </div>
                    ) : null}
                  </div>
                  <div className="space-y-3 rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-4 xl:w-[25rem]">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.24em] text-emerald-100/70">Estimated</p>
                        <p className="font-black text-white">{formatCurrency(release.estimated_revenue_brl)}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.24em] text-emerald-100/70">Releasable</p>
                        <p className="font-black text-white">{formatCurrency(release.releasable_revenue_brl)}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.24em] text-emerald-100/70">Client</p>
                        <p className="font-bold text-white">{release.client_label}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.24em] text-emerald-100/70">Updated</p>
                        <p className="font-bold text-white">{formatDate(release.updated_at)}</p>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-3 text-sm text-emerald-50">
                      <p className="text-xs uppercase tracking-[0.28em] text-emerald-100/70">Next manual action</p>
                      <p className="mt-2 font-semibold text-white">{release.next_manual_action}</p>
                    </div>
                    <div className="space-y-2">
                      {release.approval_chain.map((step) => (
                        <div key={`${release.id}-${step.role}-${step.owner}`} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className="border-white/15 text-slate-200">{step.role}</Badge>
                            <Badge variant="outline" className="border-emerald-300/30 text-emerald-100">{step.status.replaceAll("_", " ")}</Badge>
                          </div>
                          <p className="mt-2 text-sm font-bold text-white">{step.owner}</p>
                          <p className="mt-1 text-xs text-slate-400">{step.note}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-amber-300/20 bg-slate-950/75 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white"><ReceiptText className="h-5 w-5 text-amber-200" /> Release status metrics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {statusCounts.map(({ status, count }) => {
                const share = sampleRevenueReleases.length === 0 ? 0 : (count / sampleRevenueReleases.length) * 100;
                return (
                  <div key={`${status}-metric`} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <Badge variant="outline" className={cn("border", releaseTone[status])}>{status.replaceAll("_", " ")}</Badge>
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
              <CardTitle className="flex items-center gap-2 text-white"><WalletCards className="h-5 w-5 text-violet-200" /> Financial Ledger P5 boundary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-violet-50">
              <p className="rounded-2xl border border-violet-300/20 bg-violet-400/10 p-3">
                P4 stops at manual release readiness. Financial Ledger P5 now models expected, approved, pending, received sample, and lost revenue as a visual accounting ledger before any real financial integration is considered.
              </p>
              <Link href="/ops/ledger" className="inline-flex items-center gap-2 rounded-2xl border border-cyan-300/30 bg-cyan-400/10 px-4 py-3 text-sm font-bold text-cyan-50 transition hover:bg-cyan-400/20">Open Financial Ledger P5 <ArrowRight className="h-4 w-4" /></Link>
              <div className="grid gap-2">
                {["Expected revenue", "Approved revenue", "Pending revenue", "Received sample revenue", "Lost revenue"].map((item) => (
                  <div key={item} className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                    <BadgeDollarSign className="h-4 w-4" />
                    <span>{item} · P5 manual-first placeholder</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
