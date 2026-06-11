import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { OperationalEmptyState } from "@/components/ops/OperationalEmptyState";
import { activeOperationalValidations } from "@/data/delivery-validation";
import { operationalEmptyStates } from "@/data/operational-mode";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { fetchDeliveryValidationPreviews, fetchDeliveryValidationStatus, fallbackDeliveryValidationStatus, type ApprovalState, type DeliveryValidationPreviewRecord, type DeliveryValidationStatus, type DeliveryValidationStatusSummary, type EvidenceState } from "@/services/deliveryValidationService";
import { ArrowRight, BadgeCheck, ClipboardCheck, FileCheck2, GitPullRequestArrow, Image, KanbanSquare, Lock, Route, ShieldCheck, Sparkles, TriangleAlert, UploadCloud } from "lucide-react";

const approvalTone: Record<ApprovalState, string> = {
  PENDING_REVIEW: "border-violet-300/30 bg-violet-400/10 text-violet-100",
  APPROVED_MANUAL: "border-emerald-300/30 bg-emerald-400/10 text-emerald-100",
  REVISION_REQUESTED: "border-amber-300/30 bg-amber-400/10 text-amber-100",
  REJECTED: "border-rose-300/30 bg-rose-400/10 text-rose-100",
  ARCHIVED: "border-slate-500/30 bg-slate-600/10 text-slate-300",
};

const validationTone: Record<DeliveryValidationStatus, string> = {
  AWAITING_EVIDENCE: "border-slate-300/30 bg-slate-400/10 text-slate-100",
  EVIDENCE_ATTACHED: "border-blue-300/30 bg-blue-400/10 text-blue-100",
  MANUAL_REVIEW: "border-violet-300/30 bg-violet-400/10 text-violet-100",
  VALIDATION_BLOCKED: "border-rose-300/30 bg-rose-400/10 text-rose-100",
  READY_FOR_RELEASE_REVIEW: "border-emerald-300/30 bg-emerald-400/10 text-emerald-100",
  CANCELLED: "border-slate-500/30 bg-slate-600/10 text-slate-300",
};

const evidenceTone: Record<EvidenceState, string> = {
  MISSING: "border-rose-300/30 bg-rose-400/10 text-rose-100",
  MANUAL_ATTACHED: "border-blue-300/30 bg-blue-400/10 text-blue-100",
  READY_FOR_REVIEW: "border-violet-300/30 bg-violet-400/10 text-violet-100",
  MANUALLY_VERIFIED: "border-emerald-300/30 bg-emerald-400/10 text-emerald-100",
  NEEDS_REVISION: "border-amber-300/30 bg-amber-400/10 text-amber-100",
};

const pipeline = ["Broker P0 Decision Preview", "Execution Center P0 Preview", "Delivery Validation P0 Preview", "Manual Evidence Review", "Revision or Rejection Gate", "Future Release Gate", "Future Ledger"];

function countByApproval(previews: DeliveryValidationPreviewRecord[], state: ApprovalState) {
  return previews.filter((preview) => preview.approvalState === state).length;
}

function countMissingEvidence(previews: DeliveryValidationPreviewRecord[]) {
  return previews.filter((preview) => preview.evidence.some((evidence) => evidence.state === "MISSING")).length;
}

export default function DeliveryValidationPage() {
  const [status, setStatus] = useState<DeliveryValidationStatusSummary>(() => fallbackDeliveryValidationStatus());
  const [previews, setPreviews] = useState<DeliveryValidationPreviewRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const [runtimeStatus, validationPreviews] = await Promise.all([fetchDeliveryValidationStatus(controller.signal), fetchDeliveryValidationPreviews(controller.signal)]);
        setStatus(runtimeStatus);
        setPreviews(validationPreviews);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    load();
    return () => controller.abort();
  }, []);

  const metrics = useMemo(() => [
    ["Preview records", String(previews.length), "In-memory validation previews"],
    ["Pending review", String(countByApproval(previews, "PENDING_REVIEW")), "Manual approval required"],
    ["Revision requested", String(countByApproval(previews, "REVISION_REQUESTED")), "Manual change requested"],
    ["Rejected", String(countByApproval(previews, "REJECTED")), "Manual rejection state"],
    ["Missing evidence", String(countMissingEvidence(previews)), "Evidence must be described manually"],
    ["Release disabled", status.releaseDisabled ? "TRUE" : "TRUE", "Future release gate only"],
    ["Evidence required", status.evidenceRequired ? "TRUE" : "TRUE", "No evidence auto-fetch"],
    ["Approval required", status.approvalRequired ? "TRUE" : "TRUE", "No real auto-approval"],
  ], [previews, status.approvalRequired, status.evidenceRequired, status.releaseDisabled]);

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-emerald-400/20 bg-slate-950/85 p-6 shadow-2xl shadow-emerald-950/25 backdrop-blur-xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_12%,rgba(16,185,129,0.24),transparent_35%),radial-gradient(circle_at_15%_24%,rgba(34,211,238,0.18),transparent_32%)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300 to-transparent" />
        <div className="relative grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="border-emerald-300/40 bg-emerald-400/10 text-emerald-100">PREVIEW_ONLY</Badge>
              <Badge variant="outline" className="border-violet-300/40 text-violet-100">MANUAL_REVIEW</Badge>
              <Badge variant="outline" className="border-rose-300/40 text-rose-100">RELEASE_DISABLED</Badge>
              <Badge variant="outline" className="border-amber-300/40 text-amber-100">EVIDENCE_REQUIRED</Badge>
            </div>
            <div>
              <p className="mb-2 text-xs uppercase tracking-[0.5em] text-emerald-200/70">Broker → Execution Preview → Delivery Validation Preview → Manual Gate</p>
              <h1 className="max-w-5xl text-4xl font-black tracking-tight text-white md:text-6xl">Delivery Validation P0</h1>
              <p className="mt-4 max-w-3xl text-base text-slate-300 md:text-lg">
                Safe preview-only validation runtime connected to Execution Center P0. It tracks evidence state, acceptance criteria, approval state, revision or rejection reasons and the next manual gate without releasing delivery, contacting external users, uploading evidence, writing GitHub data or touching payments.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {metrics.map(([label, value, hint]) => (
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
              <CardTitle className="flex items-center gap-2 text-white"><ShieldCheck className="h-5 w-5 text-emerald-200" /> Validation safety boundary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {status.boundaries.map((item) => (
                <div key={item} className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-sm text-slate-300">
                  <Lock className="mt-0.5 h-4 w-4 shrink-0 text-emerald-200" />
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

      <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-7">
        {pipeline.map((step, index) => (
          <Card key={step} className="border-white/10 bg-slate-950/75">
            <CardContent className="flex min-h-24 flex-col justify-between p-3 text-xs font-bold text-white">
              <span className="grid h-8 w-8 place-items-center rounded-xl border border-emerald-300/20 bg-emerald-400/10 text-emerald-100">{index + 1}</span>
              <span>{step}</span>
            </CardContent>
          </Card>
        ))}
      </section>

      {previews.length ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black text-white">Validation preview records</h2>
              <p className="text-sm text-slate-400">Runtime API previews remain manual-first and release-disabled. No approve-real, upload, payment or GitHub write controls are rendered.</p>
            </div>
            <Badge variant="outline" className="border-red-300/30 px-3 py-2 text-red-100">No release / approve-real / upload / pay / GitHub-write buttons</Badge>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            {previews.map((preview) => <ValidationPreviewCard key={preview.id} preview={preview} />)}
          </div>
        </section>
      ) : (
        <OperationalEmptyState
          title={loading ? "Loading Delivery Validation previews…" : operationalEmptyStates.validations.title}
          description={loading ? "Reading the safe preview-only validation API." : "No validation previews are in memory yet. Create one from an Execution Center P0 preview; the fallback state remains manual-first and release-disabled."}
          nextManualAction={`Go to Execution Center P0, create a validation preview, then return here. Backend status: ${status.status}; static fallback records: ${activeOperationalValidations.length}.`}
          previousRoute="/ops/execution"
          nextRoute="/ops/release"
        />
      )}
    </div>
  );
}

function ValidationPreviewCard({ preview }: { preview: DeliveryValidationPreviewRecord }) {
  const evidenceProgress = preview.evidence.length ? Math.round((preview.evidence.filter((item) => item.state !== "MISSING" && item.state !== "NEEDS_REVISION").length / preview.evidence.length) * 100) : 0;

  return (
    <Card className="border-emerald-300/20 bg-slate-950/80 backdrop-blur-xl">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{preview.id}</p>
            <CardTitle className="mt-2 text-2xl font-black text-white">{preview.title}</CardTitle>
            <p className="mt-1 text-xs text-slate-400">Created {formatDate(preview.createdAt)} · Updated {formatDate(preview.updatedAt)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className={cn("shrink-0 border", validationTone[preview.validationStatus])}>{preview.validationStatus.replaceAll("_", " ")}</Badge>
            <Badge variant="outline" className={cn("shrink-0 border", approvalTone[preview.approvalState])}>{preview.approvalState.replaceAll("_", " ")}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MiniMetric label="Mode" value={preview.mode} />
          <MiniMetric label="Risk energy" value={String(preview.riskEnergy)} />
          <MiniMetric label="Release" value={preview.releaseDisabled ? "Disabled" : "Disabled"} />
          <MiniMetric label="Evidence" value={preview.evidenceRequired ? "Required" : "Required"} />
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Evidence preview state</p>
            <span className="text-xs text-emerald-200">{evidenceProgress}% not missing</span>
          </div>
          <Progress value={evidenceProgress} className="mb-3 h-2" />
          <div className="grid gap-2">
            {preview.evidence.map((evidence) => (
              <div key={evidence.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <FileCheck2 className="h-4 w-4 text-emerald-100" />
                  <Badge variant="outline" className={cn("border", evidenceTone[evidence.state])}>{evidence.state.replaceAll("_", " ")}</Badge>
                  <Badge variant="outline" className="border-white/15 text-slate-200">{evidence.source.replaceAll("_", " ")}</Badge>
                </div>
                <p className="mt-2 text-sm font-bold text-white">{evidence.label}</p>
                <p className="mt-1 text-xs text-slate-400">{evidence.note}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          <ListBlock icon={ClipboardCheck} title="Acceptance criteria" items={preview.acceptanceCriteria} />
          <ListBlock icon={FileCheck2} title="Evidence checklist" items={preview.evidenceChecklist} />
          <ListBlock icon={TriangleAlert} title="Blocked actions" items={preview.blockedActions} danger />
          <ListBlock icon={Route} title="Revision / rejection state" items={[`Rejection: ${preview.rejectionState}${preview.rejectionReason ? ` — ${preview.rejectionReason}` : ""}`, `Revision: ${preview.revisionState}${preview.revisionReason ? ` — ${preview.revisionReason}` : ""}`]} />
        </div>
        <div className="rounded-3xl border border-violet-300/20 bg-violet-500/10 p-4 text-sm text-violet-50">
          <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-violet-100"><KanbanSquare className="h-4 w-4" /> Next manual gate</p>
          {preview.nextManualGate}
        </div>
        <p className="rounded-3xl border border-emerald-300/20 bg-emerald-500/10 p-4 text-sm text-emerald-50">{preview.outcomeSummary}</p>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="border-emerald-300/30 text-emerald-100">PREVIEW_ONLY</Badge>
          <Badge variant="outline" className="border-violet-300/30 text-violet-100">MANUAL_REVIEW</Badge>
          <Badge variant="outline" className="border-rose-300/30 text-rose-100">RELEASE_DISABLED</Badge>
          <Badge variant="outline" className="border-amber-300/30 text-amber-100">EVIDENCE_REQUIRED</Badge>
          {preview.executionPreviewId ? <Link href="/ops/execution" className="inline-flex items-center gap-1 rounded-md border border-emerald-300/30 px-2.5 py-0.5 text-xs font-semibold text-emerald-100"><GitPullRequestArrow className="h-3 w-3" /> Execution {preview.executionPreviewId}<ArrowRight className="h-3 w-3" /></Link> : null}
        </div>
      </CardContent>
    </Card>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-white/10 bg-black/20 p-3"><p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p><p className="mt-1 truncate text-sm font-bold text-white">{value}</p></div>;
}

function ListBlock({ title, items, icon: Icon = Sparkles, danger = false }: { title: string; items: string[]; icon?: typeof Sparkles | typeof ClipboardCheck | typeof FileCheck2 | typeof TriangleAlert | typeof Route | typeof Image | typeof BadgeCheck | typeof UploadCloud; danger?: boolean }) {
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
