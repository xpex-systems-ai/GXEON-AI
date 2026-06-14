import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { approveManualExecution, blockTask, cancelTask, fetchTaskQueue, fetchTaskQueueStatus, type TaskQueueCounts, type TaskQueueReadinessStatus, type TaskQueueRecord, type TaskQueueStatus } from "@/services/taskQueueService";
import { previewBrokerRoute, type BrokerDecisionPreview } from "@/services/brokerService";
import { simulateQuantumTaskRoute } from "@/services/homeCenterAgentsService";
import { ArrowRight, ClipboardCheck, Inbox, Link2, Lock, ShieldCheck, XCircle } from "lucide-react";

const emptyCounts: TaskQueueCounts = { total: 0, open: 0, blocked: 0, approvedForManualExecution: 0, done: 0, cancelled: 0, TASK_READY: 0, APPROVAL_REQUIRED: 0, APPROVED_FOR_MANUAL_EXECUTION: 0, BLOCKED: 0, IN_REVIEW: 0, DONE: 0, CANCELLED: 0 };

const statusOrder: TaskQueueStatus[] = ["TASK_READY", "APPROVAL_REQUIRED", "APPROVED_FOR_MANUAL_EXECUTION", "BLOCKED", "IN_REVIEW", "DONE", "CANCELLED"];

const statusTone: Record<TaskQueueStatus, string> = {
  TASK_READY: "border-cyan-300/30 bg-cyan-400/10 text-cyan-100",
  APPROVAL_REQUIRED: "border-amber-300/30 bg-amber-400/10 text-amber-100",
  APPROVED_FOR_MANUAL_EXECUTION: "border-blue-300/30 bg-blue-400/10 text-blue-100",
  BLOCKED: "border-red-300/30 bg-red-400/10 text-red-100",
  IN_REVIEW: "border-violet-300/30 bg-violet-400/10 text-violet-100",
  DONE: "border-emerald-300/30 bg-emerald-400/10 text-emerald-100",
  CANCELLED: "border-slate-300/30 bg-slate-400/10 text-slate-100",
};

const priorityTone = {
  LOW: "border-slate-300/30 bg-slate-400/10 text-slate-100",
  MEDIUM: "border-blue-300/30 bg-blue-400/10 text-blue-100",
  HIGH: "border-orange-300/30 bg-orange-400/10 text-orange-100",
};

export default function TaskQueuePage() {
  const [status, setStatus] = useState<TaskQueueReadinessStatus | null>(null);
  const [tasks, setTasks] = useState<TaskQueueRecord[]>([]);
  const [counts, setCounts] = useState<TaskQueueCounts>(emptyCounts);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [brokerPreview, setBrokerPreview] = useState<BrokerDecisionPreview | null>(null);

  async function refresh(signal?: AbortSignal) {
    const [runtimeStatus, queue] = await Promise.all([fetchTaskQueueStatus(signal), fetchTaskQueue(signal)]);
    setStatus(runtimeStatus);
    setTasks(queue.tasks);
    setCounts(queue.counts);
  }

  useEffect(() => {
    const controller = new AbortController();
    refresh(controller.signal).catch((loadError) => {
      if (loadError instanceof DOMException && loadError.name === "AbortError") return;
      setError(loadError instanceof Error ? loadError.message : "TASK_QUEUE_UNAVAILABLE");
    });
    return () => controller.abort();
  }, []);

  async function mutateTask(task: TaskQueueRecord, action: "approve" | "block" | "cancel") {
    if (action === "approve") {
      const confirmed = window.confirm("Approve this internal task for manual execution only? No code will run, no deploy will happen, and no GitHub or payment action will occur.");
      if (!confirmed) return;
    }
    setLoadingAction(`${action}:${task.id}`);
    setError(null);
    setNotice(null);
    try {
      if (action === "approve") {
        const result = await approveManualExecution(task.id, true);
        setNotice(result.note);
      }
      if (action === "block") {
        const result = await blockTask(task.id);
        setNotice(result.note);
      }
      if (action === "cancel") {
        const result = await cancelTask(task.id);
        setNotice(result.note);
      }
      await refresh();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "TASK_QUEUE_ACTION_FAILED");
    } finally {
      setLoadingAction(null);
    }
  }

  async function previewTaskRoute(task: TaskQueueRecord) {
    setLoadingAction(`broker:${task.id}`);
    setError(null);
    setNotice(null);
    try {
      const decision = await previewBrokerRoute({
        taskId: task.id,
        title: task.title,
        summary: task.summary,
        category: task.category,
        requiredConnectors: task.requiredConnectors,
        forbiddenActions: task.forbiddenActions,
        approvalGates: task.approvalGates,
        riskFlags: task.riskFlags,
      });
      setBrokerPreview(decision);
      setNotice(`Broker preview created: ${decision.id}. Approval required; execution disabled.`);
    } catch (brokerError) {
      setError(brokerError instanceof Error ? brokerError.message : "BROKER_PREVIEW_FAILED");
    } finally {
      setLoadingAction(null);
    }
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-blue-400/20 bg-slate-950/85 p-6 shadow-2xl shadow-blue-950/25 backdrop-blur-xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_12%,rgba(59,130,246,0.24),transparent_34%),radial-gradient(circle_at_18%_24%,rgba(16,185,129,0.18),transparent_30%)]" />
        <div className="relative grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="border-blue-300/40 bg-blue-400/10 text-blue-100">P1 Task Queue</Badge>
              <Badge variant="outline" className="border-emerald-300/40 text-emerald-100">Backend-wired · in-memory</Badge>
              <Badge variant="outline" className="border-amber-300/40 text-amber-100">Manual-first only</Badge>
              <Button size="sm" variant="outline" className="h-7 text-xs border-violet-300/40" onClick={async () => {
                const res = await simulateQuantumTaskRoute({ title: "Task from P1 queue", requiredConnectors: ["GitHub"] });
                console.log("Quantum advisory:", res);
                alert("Quantum route simulation (advisory only). Approval: REQUIRED. Execution: DISABLED.");
              }}>Simulate Quantum Route</Button>
            </div>
            <div>
              <p className="mb-2 text-xs uppercase tracking-[0.5em] text-blue-200/70">RADAR X → OPPORTUNITY INBOX → TASK PREVIEW → INTERNAL TASK</p>
              <h1 className="max-w-5xl text-4xl font-black tracking-tight text-white md:text-6xl">P1 · Internal Task Queue</h1>
              <p className="mt-4 max-w-3xl text-base text-slate-300 md:text-lg">Qualified opportunities now become accountable internal tasks after operator confirmation. P1 stores planning records only; it exposes no execute, deploy, GitHub-write, external-contact, checkout, or payment controls.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ["Total tasks", String(counts.total), "P1 in-memory records"],
                ["Open tasks", String(counts.open), "Not done/cancelled"],
                ["Approval required", String(counts.APPROVAL_REQUIRED), "Needs operator decision"],
                ["Manual approved", String(counts.approvedForManualExecution), "Status only; no execution"],
              ].map(([label, value, hint]) => (
                <Card key={label} className="border-white/10 bg-white/[0.04] backdrop-blur"><CardContent className="p-4"><p className="text-xs uppercase tracking-[0.25em] text-slate-400">{label}</p><p className="mt-2 text-2xl font-bold text-white">{value}</p><p className="text-xs text-blue-200">{hint}</p></CardContent></Card>
              ))}
            </div>
          </div>
          <Card className="border-blue-300/20 bg-black/30">
            <CardHeader><CardTitle className="flex items-center gap-2 text-white"><ShieldCheck className="h-5 w-5 text-blue-200" /> P1 boundaries</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {(status?.boundaries ?? ["Internal P1 tasks only; no autonomous execution.", "No external contact, GitHub writes or payment action."]).map((item) => <div key={item} className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-sm text-slate-300"><Lock className="mt-0.5 h-4 w-4 shrink-0 text-blue-200" /><span>{item}</span></div>)}
              <Link href="/ops/opportunities"><div className="flex items-center justify-between rounded-2xl border border-cyan-300/20 bg-cyan-400/10 p-3 text-sm font-bold text-cyan-100 transition hover:border-cyan-300/40"><span>Create from Opportunity Inbox</span><ArrowRight className="h-4 w-4" /></div></Link>
              <Link href="/ops/web3-tasks"><div className="flex items-center justify-between rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-3 text-sm font-bold text-emerald-100 transition hover:border-emerald-300/40"><span>Open Web3 Task Radar</span><ArrowRight className="h-4 w-4" /></div></Link>
            </CardContent>
          </Card>
        </div>
      </section>

      {error ? <Card className="border-red-300/20 bg-red-500/10"><CardContent className="p-4 text-sm text-red-100">{error}</CardContent></Card> : null}
      {notice ? <Card className="border-emerald-300/20 bg-emerald-500/10"><CardContent className="p-4 text-sm text-emerald-100">{notice}</CardContent></Card> : null}
      {brokerPreview ? <Card className="border-violet-300/20 bg-violet-500/10"><CardContent className="p-4 text-sm text-violet-50"><p className="font-bold">Broker route preview · {brokerPreview.mode}</p><p className="mt-1">Recommended: {brokerPreview.recommendedAgents.map((agent) => `${agent.agentName} (${agent.routeRole})`).join(" → ")}</p><p className="mt-1">Risk energy {brokerPreview.riskEnergy}; safety grade {brokerPreview.safetyGrade}; executionDisabled={String(brokerPreview.executionDisabled)}.</p></CardContent></Card> : null}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {statusOrder.map((taskStatus) => <Card key={taskStatus} className="border-white/10 bg-slate-950/75"><CardContent className="p-4"><Badge variant="outline" className={statusTone[taskStatus]}>{taskStatus.replaceAll("_", " ")}</Badge><p className="mt-3 text-2xl font-black text-white">{counts[taskStatus]}</p></CardContent></Card>)}
      </section>

      <section>
        <Card className="border-cyan-300/20 bg-slate-950/75 backdrop-blur-xl">
          <CardHeader><CardTitle className="flex items-center gap-2 text-white"><ClipboardCheck className="h-5 w-5 text-cyan-200" /> Backend P1 task records</CardTitle></CardHeader>
          <CardContent className="grid gap-4">
            {tasks.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-cyan-300/30 bg-cyan-400/10 p-8 text-center">
                <Inbox className="mx-auto mb-3 h-8 w-8 text-cyan-200" />
                <p className="text-xl font-bold text-white">No internal tasks have been created yet.</p>
                <p className="mt-2 text-slate-300">Open Radar X, add a candidate to Opportunity Inbox, qualify it, generate Task Preview, then click Create Internal Task.</p>
                <div className="mt-4 flex flex-wrap justify-center gap-3"><Link href="/ops/radar-x"><Button variant="outline" className="border-cyan-300/30 text-cyan-100 hover:bg-cyan-400/10">Open Radar X</Button></Link><Link href="/ops/opportunities"><Button className="bg-cyan-300 text-slate-950 hover:bg-cyan-200">Open Opportunity Inbox</Button></Link></div>
              </div>
            ) : tasks.map((task) => (
              <article key={task.id} className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-cyan-300/35 hover:bg-cyan-400/10">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><Badge variant="outline" className="border-cyan-300/30 text-cyan-100">{task.opportunityId}</Badge><Badge variant="outline" className="border-white/15 text-slate-200">{task.category}</Badge><Badge variant="outline" className={priorityTone[task.priority]}>{task.priority}</Badge><Badge variant="outline" className={statusTone[task.status]}>{task.status.replaceAll("_", " ")}</Badge><Badge variant="outline" className="border-emerald-300/30 text-emerald-100">no external action</Badge></div>
                    <h2 className="mt-3 text-xl font-black text-white">{task.title}</h2>
                    <p className="mt-2 text-sm text-slate-400">{task.summary}</p>
                    <div className="mt-4 grid gap-3 md:grid-cols-4"><Metric label="Score" value={String(task.score)} /><Metric label="Checklist" value={`${task.executionChecklist.length} items`} /><Metric label="Connectors" value={task.requiredConnectors.join(", ")} /><Metric label="Evidence" value={`${task.evidenceRequirements.length} requirements`} /></div>
                    <div className="mt-4 grid gap-3 lg:grid-cols-3"><ListBlock title="Approval gates" items={task.approvalGates} /><ListBlock title="Evidence requirements" items={task.evidenceRequirements} /><ListBlock title="Forbidden actions" items={task.forbiddenActions} danger /></div>
                  </div>
                  <div className="rounded-2xl border border-blue-300/20 bg-blue-400/10 p-4 lg:w-80">
                    <p className="text-xs uppercase tracking-[0.28em] text-blue-100/70">Next manual step</p>
                    <p className="mt-2 text-sm font-semibold text-white">{task.nextStep}</p>
                    {task.repository || task.sourceUrl ? <p className="mt-4 flex items-center gap-2 text-xs text-blue-100"><Link2 className="h-3 w-3" />{task.repository ?? task.sourceUrl}</p> : null}
                    <div className="mt-4 grid gap-2">
                      <Button disabled={loadingAction === `broker:${task.id}`} onClick={() => previewTaskRoute(task)} variant="outline" className="border-violet-300/30 text-violet-100 hover:bg-violet-400/10"><ShieldCheck className="mr-2 h-4 w-4" />Preview Broker Route</Button>
                      <Button disabled={loadingAction === `approve:${task.id}` || task.status === "APPROVED_FOR_MANUAL_EXECUTION" || task.status === "DONE" || task.status === "CANCELLED"} onClick={() => mutateTask(task, "approve")} className="bg-blue-300 text-slate-950 hover:bg-blue-200"><ClipboardCheck className="mr-2 h-4 w-4" />Approve Manual Execution</Button>
                      <Button disabled={loadingAction === `block:${task.id}` || task.status === "BLOCKED" || task.status === "DONE" || task.status === "CANCELLED"} onClick={() => mutateTask(task, "block")} variant="outline" className="border-amber-300/30 text-amber-100 hover:bg-amber-400/10"><Lock className="mr-2 h-4 w-4" />Block</Button>
                      <Button disabled={loadingAction === `cancel:${task.id}` || task.status === "DONE" || task.status === "CANCELLED"} onClick={() => mutateTask(task, "cancel")} variant="outline" className="border-red-300/30 text-red-100 hover:bg-red-400/10"><XCircle className="mr-2 h-4 w-4" />Cancel</Button>
                    </div>
                    <p className="mt-3 text-[11px] text-blue-100/70">No Execute, Deploy, GitHub write, email, checkout, or payment buttons exist in P1.</p>
                  </div>
                </div>
              </article>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3"><p className="text-xs uppercase tracking-[0.24em] text-slate-500">{label}</p><p className="mt-1 truncate font-bold text-white">{value}</p></div>;
}

function ListBlock({ title, items, danger = false }: { title: string; items: string[]; danger?: boolean }) {
  return <div className={`rounded-2xl border p-3 ${danger ? "border-red-300/20 bg-red-500/10" : "border-white/10 bg-white/[0.03]"}`}><p className={`text-xs font-bold uppercase tracking-[0.24em] ${danger ? "text-red-100" : "text-slate-400"}`}>{title}</p><ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-slate-300">{items.slice(0, 4).map((item) => <li key={item}>{item}</li>)}</ul></div>;
}
