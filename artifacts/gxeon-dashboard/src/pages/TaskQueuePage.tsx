import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { OperationalEmptyState } from "@/components/ops/OperationalEmptyState";
import {
  getTaskQueueSummary,
  getTasksByStatus,
  activeOperationalTasks,
  taskBoardStatuses,
  type TaskPriority,
  type TaskStatus,
} from "@/data/task-queue";
import { operationalEmptyStates } from "@/data/operational-mode";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ArrowRight, ClipboardCheck, DatabaseZap, Gauge, KanbanSquare, Link2, Lock, Route, ShieldCheck, Sparkles, Target } from "lucide-react";

const statusTone: Record<TaskStatus, string> = {
  BACKLOG: "border-slate-300/30 bg-slate-400/10 text-slate-100",
  TRIAGE: "border-sky-300/30 bg-sky-400/10 text-sky-100",
  IN_PROGRESS: "border-blue-300/30 bg-blue-400/10 text-blue-100",
  WAITING_CLIENT: "border-amber-300/30 bg-amber-400/10 text-amber-100",
  REVIEW: "border-violet-300/30 bg-violet-400/10 text-violet-100",
  DONE: "border-emerald-300/30 bg-emerald-400/10 text-emerald-100",
  ARCHIVED: "border-slate-500/30 bg-slate-600/10 text-slate-300",
};

const priorityTone: Record<TaskPriority, string> = {
  LOW: "border-slate-300/30 bg-slate-400/10 text-slate-100",
  MEDIUM: "border-blue-300/30 bg-blue-400/10 text-blue-100",
  HIGH: "border-orange-300/30 bg-orange-400/10 text-orange-100",
  CRITICAL: "border-rose-300/30 bg-rose-400/10 text-rose-100",
};

export default function TaskQueuePage() {
  const summary = getTaskQueueSummary();

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-blue-400/20 bg-slate-950/85 p-6 shadow-2xl shadow-blue-950/25 backdrop-blur-xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_12%,rgba(59,130,246,0.24),transparent_34%),radial-gradient(circle_at_18%_24%,rgba(16,185,129,0.18),transparent_30%)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-300 to-transparent" />
        <div className="relative grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="border-blue-300/40 bg-blue-400/10 text-blue-100">P1 Fila de Tarefas</Badge>
              <Badge variant="outline" className="border-cyan-300/40 text-cyan-100">No external API calls</Badge>
              <Badge variant="outline" className="border-amber-300/40 text-amber-100">Sample/manual-first data</Badge>
            </div>
            <div>
              <p className="mb-2 text-xs uppercase tracking-[0.5em] text-blue-200/70">OPORTUNIDADE → TAREFA → EXECUÇÃO → VALIDAÇÃO → RELEASE → LEDGER</p>
              <h1 className="max-w-5xl text-4xl font-black tracking-tight text-white md:text-6xl">P1 · Fila de Tarefas do QG</h1>
              <p className="mt-4 max-w-3xl text-base text-slate-300 md:text-lg">
                Second operational revenue-validation layer for GXEON OS. Qualified pendente opportunities become execution-ready tasks that the operator can inspect before persistence, automation, payments, scraping, Supabase, Railway, or external platform connections exist.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ["Open tasks", String(summary.open_tasks), "Active manual statuses"],
                ["Critical tasks", String(summary.critical_tasks), "Needs operator review"],
                ["Potential execution value", formatCurrency(summary.potential_value_brl), "BRL estimate · registro real pendente"],
                ["Average progress", `${summary.average_progress}%`, "Static progress signal"],
              ].map(([label, value, hint]) => (
                <Card key={label} className="border-white/10 bg-white/[0.04] backdrop-blur">
                  <CardContent className="p-4">
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-400">{label}</p>
                    <p className="mt-2 text-2xl font-bold text-white">{value}</p>
                    <p className="text-xs text-blue-200">{hint}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
          <Card className="border-blue-300/20 bg-black/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white"><ShieldCheck className="h-5 w-5 text-blue-200" /> Execution boundary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                [Route, "P0 relationship", "Tasks reference Opportunity Inbox pendente IDs when feasible."],
                [Lock, "Manual execution only", "No drag-and-drop persistence, backend mutation, or external storage."],
                [DatabaseZap, "Integrations disabled", "LinkedIn, Workana, Upwork, Supabase, Railway and payments remain disconnected."],
              ].map(([Icon, label, description]) => (
                <div key={String(label)} className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-blue-200" />
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
                <Link href="/ops/execution">
                  <div className="group flex items-center justify-between rounded-2xl border border-violet-300/20 bg-violet-400/10 p-3 text-sm font-semibold text-violet-100 transition hover:border-violet-200/40">
                    Track Execution P2
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                  </div>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <Card className="border-blue-300/20 bg-slate-950/75 backdrop-blur-xl">
          <CardContent className="p-5">
            <ClipboardCheck className="h-6 w-6 text-blue-200" />
            <p className="mt-4 text-xs uppercase tracking-[0.25em] text-slate-500">Real tasks</p>
            <p className="mt-2 text-3xl font-black text-white">{activeOperationalTasks.length}</p>
            <p className="mt-1 text-sm text-slate-400">Static/manual-first records only.</p>
          </CardContent>
        </Card>
        <Card className="border-rose-300/20 bg-slate-950/75 backdrop-blur-xl">
          <CardContent className="p-5">
            <Target className="h-6 w-6 text-rose-200" />
            <p className="mt-4 text-xs uppercase tracking-[0.25em] text-slate-500">In progress</p>
            <p className="mt-2 text-3xl font-black text-white">{summary.in_progress_tasks}</p>
            <p className="mt-1 text-sm text-slate-400">Operator-visible work in motion.</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-300/20 bg-slate-950/75 backdrop-blur-xl">
          <CardContent className="p-5">
            <Gauge className="h-6 w-6 text-emerald-200" />
            <p className="mt-4 text-xs uppercase tracking-[0.25em] text-slate-500">Done pendentes</p>
            <p className="mt-2 text-3xl font-black text-white">{summary.done_tasks}</p>
            <p className="mt-1 text-sm text-slate-400">Closed UI state, not real revenue.</p>
          </CardContent>
        </Card>
        <Link href="/ops/execution">
          <Card className="border-cyan-300/20 bg-slate-950/75 backdrop-blur-xl transition hover:border-violet-300/35 hover:bg-violet-400/10">
            <CardContent className="p-5">
              <Link2 className="h-6 w-6 text-cyan-200" />
              <p className="mt-4 text-xs uppercase tracking-[0.25em] text-slate-500">P2 tracker</p>
              <p className="mt-2 text-3xl font-black text-white">Track</p>
              <p className="mt-1 text-sm text-slate-400">Open operacional Execution Tracker.</p>
            </CardContent>
          </Card>
        </Link>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-blue-200/70">Manual-first execution board</p>
            <h2 className="text-2xl font-black text-white">Static Kanban-style status board</h2>
          </div>
          <Badge variant="outline" className="border-blue-300/40 text-blue-100"><KanbanSquare className="mr-2 h-3 w-3" /> No drag-and-drop in P1</Badge>
        </div>
        <div className="grid gap-4 xl:grid-cols-6">
          {taskBoardStatuses.map((status) => {
            const tasks = getTasksByStatus(status);
            return (
              <Card key={status} className="border-white/10 bg-slate-950/75 backdrop-blur-xl">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="flex items-center justify-between gap-2 text-sm text-white">
                    <span>{status.replaceAll("_", " ")}</span>
                    <Badge variant="outline" className={cn("border", statusTone[status])}>{tasks.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 p-4 pt-2">
                  {tasks.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-4 text-sm text-slate-500">
                      No operacional tasks in this status yet.
                    </div>
                  ) : (
                    tasks.map((task) => (
                      <div key={task.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline" className={cn("border text-[10px]", priorityTone[task.priority])}>{task.priority}</Badge>
                          <Badge variant="outline" className="border-white/15 text-[10px] text-slate-300">{task.progress_percent}%</Badge>
                        </div>
                        <p className="mt-2 text-sm font-bold text-white">{task.title}</p>
                        <Progress value={task.progress_percent} className="mt-3 h-1.5" />
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section>
        <Card className="border-cyan-300/20 bg-slate-950/75 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white"><Sparkles className="h-5 w-5 text-cyan-200" /> Execution-ready task cards</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            {activeOperationalTasks.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-cyan-300/30 bg-cyan-400/10 p-8 text-center">
                <p className="text-xl font-bold text-white">No real tasks have been created yet.</p>
                <p className="mt-2 text-slate-300">Future validated tasks should appear here only after explicit operator entry, consent, and safe persistence design.</p>
              </div>
            ) : (
              activeOperationalTasks.map((task) => (
                <article key={task.id} className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-cyan-300/35 hover:bg-cyan-400/10">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="border-cyan-300/30 text-cyan-100">{task.source}</Badge>
                        <Badge variant="outline" className="border-white/15 text-slate-200">{task.category}</Badge>
                        <Badge variant="outline" className={cn("border", priorityTone[task.priority])}>{task.priority}</Badge>
                        <Badge variant="outline" className={cn("border", statusTone[task.status])}>{task.status.replaceAll("_", " ")}</Badge>
                        <Badge variant="outline" className="border-amber-300/30 text-amber-100">operacional</Badge>
                      </div>
                      <h2 className="mt-3 text-xl font-black text-white">{task.title}</h2>
                      <p className="mt-2 text-sm text-slate-400">{task.evidence}</p>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                        <div>
                          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Client label</p>
                          <p className="font-bold text-white">{task.client_label}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Value</p>
                          <p className="font-bold text-white">{formatCurrency(task.estimated_value_brl)}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Owner</p>
                          <p className="font-bold text-white">{task.owner}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Due</p>
                          <p className="font-bold text-white">{task.due_label}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Updated</p>
                          <p className="font-bold text-white">{formatDate(task.updated_at)}</p>
                        </div>
                      </div>
                      <div className="mt-4">
                        <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
                          <span>Manual progress</span>
                          <span>{task.progress_percent}%</span>
                        </div>
                        <Progress value={task.progress_percent} className="h-2" />
                      </div>
                    </div>
                    <div className="rounded-2xl border border-blue-300/20 bg-blue-400/10 p-4 lg:w-80">
                      <p className="text-xs uppercase tracking-[0.28em] text-blue-100/70">Next manual action</p>
                      <p className="mt-2 text-sm font-semibold text-white">{task.next_action}</p>
                      {task.opportunity_id ? (
                        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-blue-100">Linked to {task.opportunity_id}</p>
                      ) : (
                        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Internal manual task</p>
                      )}
                      <Link href="/ops/execution">
                        <div className="mt-4 flex items-center justify-between gap-2 rounded-xl border border-violet-200/20 bg-violet-300/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-violet-100 transition hover:border-violet-200/40">
                          <span>Track Execution · operacional</span>
                          <ArrowRight className="h-3 w-3" />
                        </div>
                      </Link>
                      <p className="mt-2 text-[11px] text-blue-100/70">Visual affordance only: no backend mutation, database write, or external storage.</p>
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
