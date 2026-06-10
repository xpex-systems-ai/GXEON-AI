import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, ClipboardCheck, FileText, Inbox, ListChecks, ShieldCheck } from "lucide-react";
import { fetchOpportunities, fetchOpportunityStatus, previewOpportunityEvidencePlan, previewOpportunityProposal, previewOpportunityTask, qualifyOpportunity, type OpportunityEvidencePlan, type OpportunityInboxStatus, type OpportunityPipelineCounts, type OpportunityProposalPreview, type OpportunityRecord, type OpportunityTaskPreview } from "@/services/opportunityService";

const emptyCounts: OpportunityPipelineCounts = { total: 0, new: 0, review: 0, qualified: 0, proposalDrafted: 0, taskReady: 0, evidenceReady: 0, executionReady: 0, done: 0, lost: 0 };

type PreviewPanel =
  | { kind: "proposal"; data: OpportunityProposalPreview }
  | { kind: "task"; data: OpportunityTaskPreview }
  | { kind: "evidence"; data: OpportunityEvidencePlan };

export default function OpportunityInboxPage() {
  const [status, setStatus] = useState<OpportunityInboxStatus | null>(null);
  const [opportunities, setOpportunities] = useState<OpportunityRecord[]>([]);
  const [counts, setCounts] = useState<OpportunityPipelineCounts>(emptyCounts);
  const [selectedPreview, setSelectedPreview] = useState<PreviewPanel | null>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh(signal?: AbortSignal) {
    const [runtimeStatus, list] = await Promise.all([fetchOpportunityStatus(signal), fetchOpportunities(signal)]);
    setStatus(runtimeStatus);
    setOpportunities(list.opportunities);
    setCounts(list.counts);
  }

  useEffect(() => {
    const controller = new AbortController();
    refresh(controller.signal).catch((loadError) => {
      if (loadError instanceof DOMException && loadError.name === "AbortError") return;
      setError(loadError instanceof Error ? loadError.message : "OPPORTUNITY_INBOX_UNAVAILABLE");
    });
    return () => controller.abort();
  }, []);

  async function runAction(id: string, action: "qualify" | "proposal" | "task" | "evidence") {
    setLoadingAction(`${action}:${id}`);
    setError(null);
    try {
      if (action === "qualify") await qualifyOpportunity(id);
      if (action === "proposal") {
        const result = await previewOpportunityProposal(id);
        setSelectedPreview({ kind: "proposal", data: result.proposal });
      }
      if (action === "task") {
        const result = await previewOpportunityTask(id);
        setSelectedPreview({ kind: "task", data: result.task });
      }
      if (action === "evidence") {
        const result = await previewOpportunityEvidencePlan(id);
        setSelectedPreview({ kind: "evidence", data: result.evidencePlan });
      }
      await refresh();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "OPPORTUNITY_ACTION_FAILED");
    } finally {
      setLoadingAction(null);
    }
  }

  const counters = [
    { label: "New", value: counts.new },
    { label: "Review", value: counts.review },
    { label: "Qualified", value: counts.qualified },
    { label: "Proposal", value: counts.proposalDrafted },
    { label: "Task", value: counts.taskReady },
    { label: "Evidence", value: counts.evidenceReady },
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-cyan-300/20 bg-slate-950/85 p-6 shadow-2xl shadow-cyan-950/25">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex flex-wrap gap-2">
              <Badge className="border-cyan-300/40 bg-cyan-400/10 text-cyan-100">{status?.status ?? "OPPORTUNITY_INBOX_READY"}</Badge>
              <Badge variant="outline" className="border-emerald-300/40 text-emerald-100">{status?.persistence ?? "IN_MEMORY_P0"}</Badge>
              <Badge variant="outline" className="border-amber-300/40 text-amber-100">internal planning only</Badge>
            </div>
            <h1 className="mt-4 text-4xl font-black tracking-tight text-white md:text-6xl">Opportunity Inbox</h1>
            <p className="mt-3 max-w-3xl text-slate-300">Radar X preview candidates enter REVIEW here. Operators qualify opportunities, generate draft-only proposal previews, task previews and evidence plans. P0 has no external contact, no autonomous execution and no payment buttons.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/ops/radar-x"><Button className="bg-cyan-300 text-slate-950 hover:bg-cyan-200">Open Radar X <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
            <Link href="/ops/monetization"><Button variant="outline" className="border-white/20 text-white hover:bg-white/10">Monetization Board</Button></Link>
          </div>
        </div>
        {error && <p className="mt-4 rounded-2xl border border-red-300/25 bg-red-500/10 p-3 text-sm text-red-100">{error}</p>}
      </section>

      <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        {counters.map((counter) => (
          <Card key={counter.label} className="border-white/10 bg-slate-950/75 backdrop-blur-xl">
            <CardContent className="p-5">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-400">{counter.label}</p>
              <p className="mt-2 text-3xl font-black text-white">{counter.value}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          {opportunities.length ? opportunities.map((opportunity) => (
            <Card key={opportunity.id} className="border-cyan-300/20 bg-slate-950/75 backdrop-blur-xl">
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-white">{opportunity.title}</CardTitle>
                    <p className="mt-1 text-sm text-slate-400">{opportunity.id} · {opportunity.source} · {opportunity.category}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge className="border-amber-300/30 bg-amber-400/10 text-amber-100">{opportunity.status}</Badge>
                    <Badge variant="outline" className="border-cyan-300/30 text-cyan-100">Score {opportunity.score}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-slate-300">
                <p>{opportunity.problemSummary}</p>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">Next step: {opportunity.recommendedNextStep}</div>
                  <div className="rounded-2xl border border-amber-300/20 bg-amber-400/10 p-3 text-amber-50">Template: {opportunity.offerTemplateId ?? "manual mapping required"}</div>
                </div>
                <div className="flex flex-wrap gap-2">{opportunity.riskFlags.map((flag) => <Badge key={flag} variant="outline" className="border-white/15 text-slate-200">{flag.replaceAll("_", " ")}</Badge>)}</div>
                <div className="flex flex-wrap gap-3">
                  <Button disabled={loadingAction === `qualify:${opportunity.id}` || opportunity.status !== "REVIEW"} onClick={() => runAction(opportunity.id, "qualify")} className="bg-emerald-300 text-slate-950 hover:bg-emerald-200"><ClipboardCheck className="mr-2 h-4 w-4" />Qualify</Button>
                  <Button disabled={loadingAction === `proposal:${opportunity.id}` || opportunity.status === "REVIEW" || opportunity.status === "NEW"} onClick={() => runAction(opportunity.id, "proposal")} variant="outline" className="border-cyan-300/30 text-cyan-100 hover:bg-cyan-400/10"><FileText className="mr-2 h-4 w-4" />Proposal Preview</Button>
                  <Button disabled={loadingAction === `task:${opportunity.id}` || opportunity.status === "REVIEW" || opportunity.status === "NEW"} onClick={() => runAction(opportunity.id, "task")} variant="outline" className="border-amber-300/30 text-amber-100 hover:bg-amber-400/10"><ListChecks className="mr-2 h-4 w-4" />Task Preview</Button>
                  <Button disabled={loadingAction === `evidence:${opportunity.id}` || opportunity.status === "REVIEW" || opportunity.status === "NEW"} onClick={() => runAction(opportunity.id, "evidence")} variant="outline" className="border-emerald-300/30 text-emerald-100 hover:bg-emerald-400/10"><ShieldCheck className="mr-2 h-4 w-4" />Evidence Plan</Button>
                </div>
              </CardContent>
            </Card>
          )) : (
            <Card className="border-dashed border-white/10 bg-slate-950/75 backdrop-blur-xl">
              <CardContent className="p-8 text-center text-slate-300"><Inbox className="mx-auto mb-3 h-8 w-8 text-cyan-200" />No internal opportunities yet. Add a Radar X preview candidate to begin the manual-first pipeline.</CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card className="border-emerald-300/20 bg-slate-950/75 backdrop-blur-xl">
            <CardHeader><CardTitle className="text-white">P0 boundaries</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm text-emerald-50/80">
              {(status?.boundaries ?? ["No external contact", "No GitHub writes", "No autonomous execution", "No checkout session creation", "No payment capture"]).map((item) => <p key={item}>✓ {item}</p>)}
            </CardContent>
          </Card>
          <PreviewCard preview={selectedPreview} />
        </div>
      </section>
    </div>
  );
}

function PreviewCard({ preview }: { preview: PreviewPanel | null }) {
  if (!preview) {
    return <Card className="border-white/10 bg-slate-950/75 backdrop-blur-xl"><CardContent className="p-6 text-sm text-slate-300">Generate a Proposal Preview, Task Preview or Evidence Plan to inspect internal planning output. Nothing is sent or executed.</CardContent></Card>;
  }
  if (preview.kind === "proposal") {
    return <Card className="border-cyan-300/20 bg-slate-950/75 backdrop-blur-xl"><CardHeader><CardTitle className="text-white">Proposal Preview · {preview.data.mode}</CardTitle></CardHeader><CardContent className="space-y-3 text-sm text-slate-300"><p className="font-bold text-white">{preview.data.title}</p><p>{preview.data.recommendedSolution}</p><p>{preview.data.suggestedPriceRange.currency} {preview.data.suggestedPriceRange.min}-{preview.data.suggestedPriceRange.max} · {preview.data.estimatedEffort}</p><ul className="list-disc pl-5">{preview.data.deliverySteps.map((item) => <li key={item}>{item}</li>)}</ul></CardContent></Card>;
  }
  if (preview.kind === "task") {
    return <Card className="border-amber-300/20 bg-slate-950/75 backdrop-blur-xl"><CardHeader><CardTitle className="text-white">Task Preview · {preview.data.mode}</CardTitle></CardHeader><CardContent className="space-y-3 text-sm text-slate-300"><p>Connectors: {preview.data.requiredConnectors.join(", ")}</p><ul className="list-disc pl-5">{preview.data.executionChecklist.map((item) => <li key={item}>{item}</li>)}</ul><p className="rounded-xl border border-red-300/20 bg-red-500/10 p-3 text-red-100">Forbidden: {preview.data.forbiddenActions.join(" ")}</p></CardContent></Card>;
  }
  return <Card className="border-emerald-300/20 bg-slate-950/75 backdrop-blur-xl"><CardHeader><CardTitle className="text-white">Evidence Plan · {preview.data.mode}</CardTitle></CardHeader><CardContent className="space-y-3 text-sm text-slate-300"><ul className="list-disc pl-5">{preview.data.requirements.map((item) => <li key={item}>{item}</li>)}</ul><p>Examples: {preview.data.examples.join(", ")}</p></CardContent></Card>;
}
