import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { OperationalEmptyState } from "@/components/ops/OperationalEmptyState";
import { operationalEmptyStates } from "@/data/operational-mode";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { fetchReleaseGateStatus, fetchReleasePreviews, fallbackReleaseGateStatus, type EvidenceCompleteness, type FinancialReadinessState, type OperatorApprovalStatus, type ReleaseGatePreviewRecord, type ReleaseGateStatusSummary, type ReleaseStatus } from "@/services/releaseGateService";
import { ArrowRight, BadgeDollarSign, CheckCircle2, CircleDollarSign, GitBranch, KanbanSquare, Lock, ReceiptText, ShieldCheck, TriangleAlert, WalletCards, XCircle } from "lucide-react";

const releaseTone: Record<ReleaseStatus, string> = {
  PENDING_REVIEW: "border-violet-300/30 bg-violet-400/10 text-violet-100",
  READY_FOR_MANUAL_RELEASE_REVIEW: "border-emerald-300/30 bg-emerald-400/10 text-emerald-100",
  BLOCKED: "border-rose-300/30 bg-rose-400/10 text-rose-100",
  REVISION_REQUIRED: "border-amber-300/30 bg-amber-400/10 text-amber-100",
  CANCELLED: "border-slate-500/30 bg-slate-600/10 text-slate-300",
};

const financialTone: Record<FinancialReadinessState, string> = {
  NOT_READY: "border-rose-300/30 bg-rose-400/10 text-rose-100",
  NEEDS_REVIEW: "border-amber-300/30 bg-amber-400/10 text-amber-100",
  READY_MANUAL: "border-emerald-300/30 bg-emerald-400/10 text-emerald-100",
  BLOCKED: "border-rose-300/30 bg-rose-400/10 text-rose-100",
};

const evidenceTone: Record<EvidenceCompleteness, string> = {
  INCOMPLETE: "border-rose-300/30 bg-rose-400/10 text-rose-100",
  PARTIAL: "border-amber-300/30 bg-amber-400/10 text-amber-100",
  COMPLETE: "border-blue-300/30 bg-blue-400/10 text-blue-100",
  MANUALLY_VERIFIED: "border-emerald-300/30 bg-emerald-400/10 text-emerald-100",
};

const authorizationTone: Record<OperatorApprovalStatus, string> = {
  NOT_REQUESTED: "border-slate-300/30 bg-slate-400/10 text-slate-100",
  PENDING_OPERATOR: "border-violet-300/30 bg-violet-400/10 text-violet-100",
  MANUAL_APPROVAL_REQUIRED: "border-emerald-300/30 bg-emerald-400/10 text-emerald-100",
  BLOCKED: "border-rose-300/30 bg-rose-400/10 text-rose-100",
};

const checklistLabels = [
  ["delivery_approved", "Delivery validation reviewed"],
  ["evidence_complete", "Evidence complete"],
  ["scope_confirmed", "Scope confirmed manually"],
  ["release_authorized", "Manual release authorized"],
  ["financial_ready", "Financial readiness"],
  ["ledger_write_disabled", "Ledger write disabled"],
] as const;

function countStatus(previews: ReleaseGatePreviewRecord[], status: ReleaseStatus) {
  return previews.filter((preview) => preview.release_status === status).length;
}

export default function RevenueReleaseGatePage() {
  const [status, setStatus] = useState<ReleaseGateStatusSummary>(() => fallbackReleaseGateStatus());
  const [previews, setPreviews] = useState<ReleaseGatePreviewRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const [runtimeStatus, releasePreviews] = await Promise.all([fetchReleaseGateStatus(controller.signal), fetchReleasePreviews(controller.signal)]);
        setStatus(runtimeStatus);
        setPreviews(releasePreviews);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    load();
    return () => controller.abort();
  }, []);

  const summary = useMemo(() => {
    const totalScore = previews.reduce((total, preview) => total + preview.readiness_score, 0);
    return {
      totalRecords: previews.length,
      readyManual: countStatus(previews, "READY_FOR_MANUAL_RELEASE_REVIEW"),
      blocked: countStatus(previews, "BLOCKED"),
      pending: countStatus(previews, "PENDING_REVIEW"),
      revision: countStatus(previews, "REVISION_REQUIRED"),
      estimatedTotal: previews.reduce((total, preview) => total + preview.estimated_revenue_brl, 0),
      averageReadiness: previews.length ? Math.round(totalScore / previews.length) : 0,
      completeEvidence: previews.filter((preview) => ["COMPLETE", "MANUALLY_VERIFIED"].includes(preview.evidence_completeness)).length,
    };
  }, [previews]);

  const statusCounts = status.allowedReleaseStatuses.map((releaseStatus) => ({ status: releaseStatus, count: countStatus(previews, releaseStatus) }));

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-emerald-400/20 bg-slate-950/85 p-6 shadow-2xl shadow-emerald-950/25 backdrop-blur-xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_10%,rgba(16,185,129,0.24),transparent_34%),radial-gradient(circle_at_18%_24%,rgba(34,211,238,0.18),transparent_34%)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300 to-transparent" />
        <div className="relative grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="border-emerald-300/40 bg-emerald-400/10 text-emerald-100">PREVIEW_ONLY</Badge>
              <Badge variant="outline" className="border-rose-300/40 text-rose-100">RELEASE_DISABLED</Badge>
              <Badge variant="outline" className="border-amber-300/40 text-amber-100">PAYMENT_DISABLED</Badge>
              <Badge variant="outline" className="border-cyan-300/40 text-cyan-100">LEDGER_WRITE_DISABLED</Badge>
              <Badge variant="outline" className="border-violet-300/40 text-violet-100">NO_REVENUE_CLAIM</Badge>
              <Link href="/ops/ledger" className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-400/10 px-3 py-1 text-xs font-bold text-cyan-50 transition hover:bg-cyan-400/20">Future P5 Ledger <ArrowRight className="h-3.5 w-3.5" /></Link>
            </div>
            <div>
              <p className="mb-2 text-xs uppercase tracking-[0.5em] text-emerald-200/70">OPPORTUNITY → TASK → EXECUTION → VALIDATION → RELEASE PREVIEW → FUTURE LEDGER</p>
              <h1 className="max-w-5xl text-4xl font-black tracking-tight text-white md:text-6xl">P4 · Release Gate Runtime Preview</h1>
              <p className="mt-4 max-w-3xl text-base text-slate-300 md:text-lg">
                Manual-first runtime layer connected to Delivery Validation P0. It creates internal release preview records, calculates readiness and financial review state, and keeps release, invoice, payment, ledger write, GitHub write and revenue claims disabled.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ["Preview records", String(summary.totalRecords), "In-memory Release Gate previews"],
                ["Ready manual", String(summary.readyManual), "Manual release review only"],
                ["Blocked", String(summary.blocked), "Held from release"],
                ["Pending review", String(summary.pending), "Human review needed"],
                ["Estimated total", formatCurrency(summary.estimatedTotal), "Pipeline estimate only"],
                ["Releasable", formatCurrency(0), "Always zero in P0"],
                ["Avg readiness", `${summary.averageReadiness}%`, "Deterministic preview score"],
                ["Evidence complete", String(summary.completeEvidence), "Manual evidence state"],
              ].map(([label, value, helper]) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                  <p className="text-xs uppercase tracking-[0.28em] text-emerald-100/70">{label}</p>
                  <p className="mt-2 text-2xl font-black text-white">{value}</p>
                  <p className="mt-1 text-xs text-slate-400">{helper}</p>
                </div>
              ))}
            </div>
          </div>
          <Card className="border-emerald-300/20 bg-emerald-400/10 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-emerald-50"><ShieldCheck className="h-5 w-5" /> Runtime safety state</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-emerald-50">
              {[
                ["Mode", status.mode],
                ["Status", status.status],
                ["Release disabled", String(status.releaseDisabled).toUpperCase()],
                ["Payment disabled", String(status.paymentDisabled).toUpperCase()],
                ["Ledger write disabled", String(status.ledgerWriteDisabled).toUpperCase()],
                ["Revenue claimed", String(status.revenueClaimed).toUpperCase()],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/30 p-3">
                  <span className="text-emerald-100/75">{label}</span>
                  <span className="font-black text-white">{value}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.45fr_0.55fr]">
        <Card className="border-emerald-300/20 bg-slate-950/80 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white"><CircleDollarSign className="h-5 w-5 text-emerald-200" /> Release preview records</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300">Loading release previews…</p> : null}
            {!loading && previews.length === 0 ? <OperationalEmptyState state={operationalEmptyStates.revenueReleaseGate} /> : null}
            {previews.map((release) => (
              <article key={release.id} className="rounded-[1.5rem] border border-emerald-300/15 bg-white/[0.035] p-4 shadow-xl shadow-black/20">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className={cn("border", releaseTone[release.release_status])}>{release.release_status.replaceAll("_", " ")}</Badge>
                      <Badge variant="outline" className={cn("border", financialTone[release.financial_readiness_state])}>{release.financial_readiness_state.replaceAll("_", " ")}</Badge>
                      <Badge variant="outline" className={cn("border", evidenceTone[release.evidence_completeness])}>{release.evidence_completeness.replaceAll("_", " ")}</Badge>
                      <Badge variant="outline" className={cn("border", authorizationTone[release.authorization_status])}>{release.authorization_status.replaceAll("_", " ")}</Badge>
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-white">{release.title}</h2>
                      <p className="mt-1 text-sm text-slate-400">{release.id} · Validation {release.validationPreviewId ?? "manual input"} · Updated {formatDate(release.updated_at)}</p>
                      <p className="mt-3 text-sm text-slate-300">{release.release_summary}</p>
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-3">
                        <p className="text-xs uppercase tracking-[0.24em] text-emerald-100/70">Readiness score</p>
                        <p className="mt-2 text-2xl font-black text-white">{release.readiness_score}%</p>
                        <Progress value={release.readiness_score} className="mt-3 h-2" />
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-3">
                        <p className="text-xs uppercase tracking-[0.24em] text-emerald-100/70">Estimated revenue</p>
                        <p className="mt-2 text-2xl font-black text-white">{formatCurrency(release.estimated_revenue_brl)}</p>
                        <p className="mt-1 text-xs text-amber-100">Preview estimate, not claimed revenue.</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-3">
                        <p className="text-xs uppercase tracking-[0.24em] text-emerald-100/70">Releasable P0</p>
                        <p className="mt-2 text-2xl font-black text-white">{formatCurrency(release.releasable_revenue_brl)}</p>
                        <p className="mt-1 text-xs text-rose-100">Release remains disabled.</p>
                      </div>
                    </div>
                    <div className="grid gap-3 lg:grid-cols-2">
                      <div className="rounded-2xl border border-cyan-300/20 bg-cyan-400/10 p-3">
                        <p className="text-xs uppercase tracking-[0.28em] text-cyan-100/70">Financial readiness checklist</p>
                        <div className="mt-3 grid gap-2">
                          {checklistLabels.map(([key, label]) => {
                            const checked = release.checklist[key];
                            return (
                              <div key={`${release.id}-${key}`} className="flex items-center gap-2 text-sm text-cyan-50">
                                {checked ? <CheckCircle2 className="h-4 w-4 text-emerald-300" /> : <XCircle className="h-4 w-4 text-rose-300" />}
                                <span>{label}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-rose-300/20 bg-rose-400/10 p-3">
                        <p className="text-xs uppercase tracking-[0.28em] text-rose-100/70">Blocked release reasons</p>
                        <div className="mt-3 space-y-2">
                          {release.blockedReleaseReasons.map((reason) => (
                            <div key={`${release.id}-${reason}`} className="flex gap-2 text-sm text-rose-50"><TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" /> <span>{reason}</span></div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <p className="rounded-2xl border border-cyan-300/20 bg-cyan-400/10 p-3 text-sm font-semibold text-cyan-50">{release.p0_p1_p2_p3_p4_trace}</p>
                  </div>
                  <div className="space-y-3 rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-4 xl:w-[25rem]">
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
              {statusCounts.map(({ status: releaseStatus, count }) => {
                const share = previews.length === 0 ? 0 : (count / previews.length) * 100;
                return (
                  <div key={`${releaseStatus}-metric`} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <Badge variant="outline" className={cn("border", releaseTone[releaseStatus])}>{releaseStatus.replaceAll("_", " ")}</Badge>
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
              <CardTitle className="flex items-center gap-2 text-white"><WalletCards className="h-5 w-5 text-violet-200" /> Future Ledger and Monetization boundary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-violet-50">
              <p className="rounded-2xl border border-violet-300/20 bg-violet-400/10 p-3">
                Release Gate P0 stops at preview-only manual readiness. Future ledger and monetization stages can consume reviewed records later, but this page never offers release, invoice, payment, ledger write or GitHub write controls.
              </p>
              <Link href="/ops/validation" className="inline-flex items-center gap-2 rounded-2xl border border-cyan-300/30 bg-cyan-400/10 px-4 py-3 text-sm font-bold text-cyan-50 transition hover:bg-cyan-400/20">Back to Delivery Validation <ArrowRight className="h-4 w-4" /></Link>
              <div className="grid gap-2">
                {["releaseDisabled", "paymentDisabled", "ledgerWriteDisabled", "approvalRequired", "evidenceRequired", "revenueClaimed false"].map((item) => (
                  <div key={item} className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                    <BadgeDollarSign className="h-4 w-4" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-emerald-300/20 bg-slate-950/75 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white"><Lock className="h-5 w-5 text-emerald-200" /> Hard-disabled actions</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm text-emerald-50">
              {["No release button", "No invoice button", "No payment button", "No ledger write button", "No GitHub write button", "No external contact automation"].map((item) => (
                <div key={item} className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-3"><Lock className="h-4 w-4" /> {item}</div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
