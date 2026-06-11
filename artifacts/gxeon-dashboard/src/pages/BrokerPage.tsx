import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchBrokerDecisions, fetchBrokerStatus, previewBrokerRoute, type BrokerDecisionPreview, type BrokerStatus } from "@/services/brokerService";
import { createExecutionPreview, type ExecutionPreviewRecord } from "@/services/executionCenterService";
import { ArrowRight, BrainCircuit, ClipboardCheck, Lock, Route, ShieldCheck } from "lucide-react";

const demoInput = {
  taskId: "task_preview_001",
  title: "Fix Supabase RLS for dashboard",
  summary: "Assess dashboard data access policies and prepare a safe manual change plan.",
  category: "security",
  requiredConnectors: ["Supabase", "GitHub"],
  forbiddenActions: ["external_contact", "payment_action", "change_database"],
  approvalGates: ["operator_review_required"],
  riskFlags: ["execution_not_authorized"],
};

export default function BrokerPage() {
  const [status, setStatus] = useState<BrokerStatus | null>(null);
  const [decisions, setDecisions] = useState<BrokerDecisionPreview[]>([]);
  const [activeDecision, setActiveDecision] = useState<BrokerDecisionPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [executionPreviewLoading, setExecutionPreviewLoading] = useState(false);
  const [createdExecutionPreview, setCreatedExecutionPreview] = useState<ExecutionPreviewRecord | null>(null);

  async function refresh(signal?: AbortSignal) {
    const [runtimeStatus, brokerDecisions] = await Promise.all([fetchBrokerStatus(signal), fetchBrokerDecisions(signal)]);
    setStatus(runtimeStatus);
    setDecisions(brokerDecisions);
    setActiveDecision((current) => current ?? brokerDecisions[0] ?? null);
  }

  useEffect(() => {
    const controller = new AbortController();
    refresh(controller.signal);
    return () => controller.abort();
  }, []);

  async function previewDemoRoute() {
    setLoading(true);
    const decision = await previewBrokerRoute(demoInput);
    setActiveDecision(decision);
    await refresh();
    setLoading(false);
  }

  async function createManualExecutionPreview() {
    const decision = activeDecision ?? decisions[0];
    if (!decision) return;
    setExecutionPreviewLoading(true);
    const executionPreview = await createExecutionPreview({
      brokerDecisionId: decision.id,
      brokerDecision: decision,
      title: decision.title,
      taskId: decision.taskId,
      recommendedAgentIds: decision.recommendedAgents.map((agent) => agent.agentId),
      riskEnergy: decision.riskEnergy,
      blockedActions: decision.blockedActions,
      approvalGates: decision.approvalGates.map((gate) => gate.label),
      operatorNextAction: decision.operatorNextAction,
    });
    setCreatedExecutionPreview(executionPreview);
    setExecutionPreviewLoading(false);
  }

  const displayDecision = activeDecision ?? decisions[0] ?? null;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-violet-400/20 bg-slate-950/85 p-6 shadow-2xl shadow-violet-950/25 backdrop-blur-xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_12%,rgba(139,92,246,0.24),transparent_34%),radial-gradient(circle_at_18%_24%,rgba(16,185,129,0.16),transparent_30%)]" />
        <div className="relative grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="border-violet-300/40 bg-violet-400/10 text-violet-100">PREVIEW_ONLY</Badge>
              <Badge variant="outline" className="border-amber-300/40 text-amber-100">OPERATOR_APPROVAL_REQUIRED</Badge>
              <Badge variant="outline" className="border-emerald-300/40 text-emerald-100">EXECUTION_DISABLED</Badge>
            </div>
            <div>
              <p className="mb-2 text-xs uppercase tracking-[0.5em] text-violet-200/70">P1 TASK QUEUE → SAFE ROUTING BRAIN → FUTURE HANDOFF</p>
              <h1 className="max-w-5xl text-4xl font-black tracking-tight text-white md:text-6xl">Broker P0</h1>
              <p className="mt-4 max-w-3xl text-base text-slate-300 md:text-lg">Broker P0 creates preview-only routing decisions across P1 Task Queue, the quantum-inspired advisory layer and the real Home Center Agent Registry. It never installs agents, executes tasks, writes to GitHub, contacts users or touches payments.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button onClick={previewDemoRoute} disabled={loading} className="bg-violet-300 text-slate-950 hover:bg-violet-200"><Route className="mr-2 h-4 w-4" />{loading ? "Previewing…" : "Preview Broker Route"}</Button>
              <Badge variant="outline" className="border-red-300/30 px-3 py-2 text-red-100">No execute / approve / install controls</Badge>
              {displayDecision ? (
                <Button onClick={createManualExecutionPreview} disabled={executionPreviewLoading} variant="outline" className="border-cyan-300/40 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/20 hover:text-white">
                  <ClipboardCheck className="mr-2 h-4 w-4" />
                  {executionPreviewLoading ? "Creating preview…" : "Create Execution Preview · manual only"}
                </Button>
              ) : null}
              {createdExecutionPreview ? (
                <Link href="/ops/execution" className="rounded-md border border-emerald-300/40 bg-emerald-400/10 px-4 py-2 text-sm font-bold text-emerald-100 hover:bg-emerald-400/20">
                  View Execution Preview {createdExecutionPreview.id}
                </Link>
              ) : null}
            </div>
          </div>
          <Card className="border-violet-300/20 bg-black/30">
            <CardHeader><CardTitle className="flex items-center gap-2 text-white"><ShieldCheck className="h-5 w-5 text-violet-200" /> Broker boundaries</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {(status?.boundaries ?? ["Broker P0 is preview-only."]).map((item) => <div key={item} className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-sm text-slate-300"><Lock className="mt-0.5 h-4 w-4 shrink-0 text-violet-200" /><span>{item}</span></div>)}
              {status?.diagnostics ? (
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

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Decisions" value={String(decisions.length)} hint="In-memory previews only" />
        <Metric label="Approval required" value={status?.approvalRequired ? "TRUE" : "TRUE"} hint="Every route is gated" />
        <Metric label="Execution disabled" value={status?.executionDisabled ? "TRUE" : "TRUE"} hint="No runtime handoff in P0" />
        <Metric label="Registry source" value={status?.sourceOfTruth ?? "HOME_CENTER_AGENT_REGISTRY"} hint={`${status?.registryAgentsAvailable ?? 0} agents visible`} />
      </section>

      <section className="grid gap-3 md:grid-cols-5">
        {["Task Queue", "Quantum Advisory", "Agent Route", "Operator Approval", "Future Execution Center"].map((step, index) => (
          <Card key={step} className="border-white/10 bg-slate-950/75">
            <CardContent className="flex items-center gap-3 p-4 text-sm font-bold text-white"><span className="grid h-8 w-8 place-items-center rounded-xl border border-violet-300/20 bg-violet-400/10 text-violet-100">{index + 1}</span>{step}{index < 4 ? <ArrowRight className="ml-auto h-4 w-4 text-violet-200" /> : null}</CardContent>
          </Card>
        ))}
      </section>

      {displayDecision ? (
        <section className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
          <Card className="border-violet-300/20 bg-slate-950/80 backdrop-blur-xl">
            <CardHeader><CardTitle className="flex items-center gap-2 text-white"><BrainCircuit className="h-5 w-5 text-violet-200" /> Recommended route preview</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Decision</p>
                <h2 className="mt-2 text-2xl font-black text-white">{displayDecision.title}</h2>
                <div className="mt-3 flex flex-wrap gap-2"><Badge variant="outline" className="border-violet-300/30 text-violet-100">Risk energy {displayDecision.riskEnergy}</Badge><Badge variant="outline" className="border-emerald-300/30 text-emerald-100">Safety grade {displayDecision.safetyGrade}</Badge><Badge variant="outline" className="border-amber-300/30 text-amber-100">Approval required</Badge></div>
              </div>
              <div className="grid gap-3">
                {displayDecision.recommendedAgents.map((agent) => (
                  <div key={agent.agentId} className="rounded-3xl border border-white/10 bg-black/20 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-lg font-black text-white">{agent.agentName}</p><p className="text-xs uppercase tracking-[0.24em] text-violet-200">{agent.routeRole}</p></div><Badge className="bg-violet-300 text-slate-950">Fit {agent.fitScore}</Badge></div>
                    <div className="mt-3 grid gap-3 md:grid-cols-3"><ListBlock title="Capabilities" items={agent.matchedCapabilities} /><ListBlock title="Connectors" items={agent.matchedConnectors} /><ListBlock title="Policy blocks" items={agent.blockedByPolicy} danger /></div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card className="border-amber-300/20 bg-amber-500/10"><CardHeader><CardTitle className="text-white">Manual approval gates</CardTitle></CardHeader><CardContent><ListBlock title="Required gates" items={displayDecision.approvalGates.map((gate) => gate.label)} /></CardContent></Card>
            <Card className="border-red-300/20 bg-red-500/10"><CardHeader><CardTitle className="text-white">Blocked actions</CardTitle></CardHeader><CardContent><ListBlock title="Disabled by policy" items={displayDecision.blockedActions} danger /></CardContent></Card>
            <Card className="border-emerald-300/20 bg-emerald-500/10"><CardHeader><CardTitle className="flex items-center gap-2 text-white"><ClipboardCheck className="h-5 w-5" /> Operator next action</CardTitle></CardHeader><CardContent className="text-sm text-emerald-50">{displayDecision.operatorNextAction}</CardContent></Card>
          </div>
        </section>
      ) : (
        <Card className="border-dashed border-violet-300/30 bg-violet-400/10"><CardContent className="p-8 text-center text-slate-200">No Broker previews yet. Use the Preview Broker Route button to create a safe in-memory route decision.</CardContent></Card>
      )}
    </div>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint: string }) {
  return <Card className="border-white/10 bg-white/[0.04] backdrop-blur"><CardContent className="p-4"><p className="text-xs uppercase tracking-[0.25em] text-slate-400">{label}</p><p className="mt-2 truncate text-2xl font-bold text-white">{value}</p><p className="text-xs text-violet-200">{hint}</p></CardContent></Card>;
}

function ListBlock({ title, items, danger = false }: { title: string; items: string[]; danger?: boolean }) {
  const visibleItems = items.length ? items.slice(0, 5) : ["None for preview"];
  return <div className={`rounded-2xl border p-3 ${danger ? "border-red-300/20 bg-red-500/10" : "border-white/10 bg-white/[0.03]"}`}><p className={`text-xs font-bold uppercase tracking-[0.24em] ${danger ? "text-red-100" : "text-slate-400"}`}>{title}</p><ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-slate-300">{visibleItems.map((item) => <li key={item}>{item}</li>)}</ul></div>;
}
