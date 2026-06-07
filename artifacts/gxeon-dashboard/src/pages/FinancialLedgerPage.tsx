import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  getFinancialLedgerSummary,
  getLedgerRecordsByStatus,
  getLedgerStatusCounts,
  ledgerStatuses,
  sampleFinancialLedgerRecords,
  type LedgerStatus,
} from "@/data/financial-ledger";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ArrowRight, BadgeDollarSign, Banknote, BookOpenCheck, Calculator, CircleDollarSign, FileLock2, GitBranch, KanbanSquare, Lock, ReceiptText, ShieldCheck, TrendingDown, TrendingUp } from "lucide-react";

const ledgerTone: Record<LedgerStatus, string> = {
  FORECAST: "border-blue-300/30 bg-blue-400/10 text-blue-100",
  APPROVED: "border-emerald-300/30 bg-emerald-400/10 text-emerald-100",
  PENDING_PAYMENT: "border-amber-300/30 bg-amber-400/10 text-amber-100",
  RECEIVED_SAMPLE: "border-cyan-300/30 bg-cyan-400/10 text-cyan-100",
  LOST: "border-rose-300/30 bg-rose-400/10 text-rose-100",
  ARCHIVED: "border-slate-500/30 bg-slate-600/10 text-slate-300",
};

export default function FinancialLedgerPage() {
  const summary = getFinancialLedgerSummary();
  const statusCounts = getLedgerStatusCounts();

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-cyan-400/20 bg-slate-950/85 p-6 shadow-2xl shadow-cyan-950/25 backdrop-blur-xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_8%,rgba(34,211,238,0.24),transparent_34%),radial-gradient(circle_at_18%_28%,rgba(16,185,129,0.18),transparent_34%)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300 to-transparent" />
        <div className="relative grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="border-cyan-300/40 bg-cyan-400/10 text-cyan-100">P5 Financial Ledger</Badge>
              <Badge variant="outline" className="border-emerald-300/40 text-emerald-100">Safe Preview Mode</Badge>
              <Badge variant="outline" className="border-amber-300/40 text-amber-100">Manual accounting readiness</Badge>
              <Badge variant="outline" className="border-rose-300/40 text-rose-100">No invoices · no transactions</Badge>
            </div>
            <div>
              <p className="mb-2 text-xs uppercase tracking-[0.5em] text-cyan-200/70">OPP → TASK → EXEC → VAL → RELEASE → LEDGER</p>
              <h1 className="max-w-5xl text-4xl font-black tracking-tight text-white md:text-6xl">Financial Ledger P5</h1>
              <p className="mt-4 max-w-3xl text-base text-slate-300 md:text-lg">
                Manual-first financial visibility layer connecting Revenue Release Gate P4 to accounting readiness. P5 models expected, approved, pending, received sample, and lost revenue without APIs, payment processing, Supabase writes, invoices, or real financial transactions.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: "Estimated revenue", value: formatCurrency(summary.estimated_revenue_brl), hint: "Expected pipeline value", Icon: TrendingUp },
                { label: "Approved revenue", value: formatCurrency(summary.approved_revenue_brl), hint: "Release-approved sample", Icon: BadgeDollarSign },
                { label: "Pending revenue", value: formatCurrency(summary.pending_revenue_brl), hint: "Manual payment wait", Icon: CircleDollarSign },
                { label: "Received sample", value: formatCurrency(summary.received_revenue_brl), hint: "Visual-only received state", Icon: Banknote },
                { label: "Lost revenue", value: formatCurrency(summary.lost_revenue_brl), hint: "Pipeline leakage label", Icon: TrendingDown },
                { label: "Approval conversion", value: `${summary.approval_conversion_rate}%`, hint: "Approved ÷ estimated", Icon: Calculator },
                { label: "Receipt conversion", value: `${summary.receipt_conversion_rate}%`, hint: "Received ÷ approved", Icon: BookOpenCheck },
                { label: "Accounting ready", value: `${summary.average_accounting_readiness}%`, hint: "Average manual score", Icon: ShieldCheck },
              ].map(({ label, value, hint, Icon }) => (
                <Card key={label} className="border-white/10 bg-white/[0.04] backdrop-blur">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs uppercase tracking-[0.25em] text-slate-400">{label}</p>
                      <Icon className="h-4 w-4 text-cyan-200" />
                    </div>
                    <p className="mt-2 text-2xl font-black text-white">{value}</p>
                    <p className="mt-1 text-xs text-slate-500">{hint}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <Card className="border-emerald-300/20 bg-emerald-400/10 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white"><FileLock2 className="h-5 w-5 text-emerald-200" /> Safe ledger boundary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-emerald-50">
              {[
                "Static manual-first records only",
                "Zero external API calls or gateway connections",
                "Zero Supabase writes and zero persistence side effects",
                "Zero real invoices, transactions, settlements, refunds, or receipts",
              ].map((item) => (
                <div key={item} className="flex gap-3 rounded-2xl border border-emerald-300/20 bg-slate-950/30 p-3">
                  <Lock className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
              <Link href="/ops/release" className="inline-flex items-center gap-2 rounded-2xl border border-cyan-300/30 bg-cyan-400/10 px-4 py-3 text-sm font-bold text-cyan-50 transition hover:bg-cyan-400/20">
                Back to Release Gate P4 <ArrowRight className="h-4 w-4" />
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.7fr_1.3fr]">
        <Card className="border-amber-300/20 bg-slate-950/75 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white"><ReceiptText className="h-5 w-5 text-amber-200" /> Revenue metrics layer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {statusCounts.map(({ status, count }) => {
              const share = sampleFinancialLedgerRecords.length === 0 ? 0 : (count / sampleFinancialLedgerRecords.length) * 100;
              return (
                <div key={`${status}-metric`} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <Badge variant="outline" className={cn("border", ledgerTone[status])}>{status.replaceAll("_", " ")}</Badge>
                    <p className="font-bold text-white">{count} records</p>
                  </div>
                  <Progress value={share} className="mt-3 h-2" />
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="border-cyan-300/20 bg-slate-950/75 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white"><KanbanSquare className="h-5 w-5 text-cyan-200" /> Revenue Accounting Board</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
              {ledgerStatuses.map((status) => {
                const records = getLedgerRecordsByStatus(status);
                return (
                  <div key={status} className="rounded-3xl border border-white/10 bg-white/[0.03] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <Badge variant="outline" className={cn("border", ledgerTone[status])}>{status.replaceAll("_", " ")}</Badge>
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-bold text-white">{records.length}</span>
                    </div>
                    <div className="mt-3 space-y-3">
                      {records.map((record) => (
                        <div key={`${status}-${record.id}`} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                          <p className="text-sm font-bold text-white">{record.title}</p>
                          <p className="mt-1 text-xs text-slate-400">{record.id} · {record.release_id}</p>
                          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                            <span className="rounded-xl bg-slate-950/40 p-2 text-slate-300">Expected <b className="text-white">{formatCurrency(record.expected_revenue_brl)}</b></span>
                            <span className="rounded-xl bg-slate-950/40 p-2 text-slate-300">Ready <b className="text-white">{record.accounting_readiness_score}%</b></span>
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
        <Card className="border-emerald-300/20 bg-slate-950/75 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white"><GitBranch className="h-5 w-5 text-emerald-200" /> Pipeline traceability</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            {sampleFinancialLedgerRecords.map((record) => (
              <article key={record.id} className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-cyan-300/35 hover:bg-cyan-400/10">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="border-cyan-300/30 text-cyan-100">{record.id}</Badge>
                      <Badge variant="outline" className={cn("border", ledgerTone[record.status])}>{record.status.replaceAll("_", " ")}</Badge>
                      <Badge variant="outline" className="border-white/15 text-slate-200">{record.revenue_class.replaceAll("_", " ")}</Badge>
                      <Badge variant="outline" className="border-emerald-300/30 text-emerald-100">Safe Preview</Badge>
                    </div>
                    <h2 className="mt-3 text-xl font-black text-white">{record.title}</h2>
                    <p className="mt-2 text-sm text-slate-400">{record.ledger_summary}</p>
                    <p className="mt-4 rounded-2xl border border-cyan-300/20 bg-cyan-400/10 p-3 text-sm font-semibold text-cyan-50">{record.full_trace_label}</p>
                    <p className="mt-3 rounded-2xl border border-amber-300/20 bg-amber-400/10 p-3 text-sm text-amber-50">{record.accounting_note}</p>
                  </div>
                  <div className="space-y-3 rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-4 xl:w-[26rem]">
                    <div className="grid grid-cols-2 gap-3">
                      <div><p className="text-xs uppercase tracking-[0.24em] text-emerald-100/70">Approved</p><p className="font-black text-white">{formatCurrency(record.approved_revenue_brl)}</p></div>
                      <div><p className="text-xs uppercase tracking-[0.24em] text-emerald-100/70">Pending</p><p className="font-black text-white">{formatCurrency(record.pending_revenue_brl)}</p></div>
                      <div><p className="text-xs uppercase tracking-[0.24em] text-emerald-100/70">Received</p><p className="font-black text-white">{formatCurrency(record.received_revenue_brl)}</p></div>
                      <div><p className="text-xs uppercase tracking-[0.24em] text-emerald-100/70">Lost</p><p className="font-black text-white">{formatCurrency(record.lost_revenue_brl)}</p></div>
                      <div><p className="text-xs uppercase tracking-[0.24em] text-emerald-100/70">Client</p><p className="font-bold text-white">{record.client_label}</p></div>
                      <div><p className="text-xs uppercase tracking-[0.24em] text-emerald-100/70">Updated</p><p className="font-bold text-white">{formatDate(record.updated_at)}</p></div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-3 text-sm text-emerald-50">
                      <p className="text-xs uppercase tracking-[0.28em] text-emerald-100/70">Next manual action</p>
                      <p className="mt-2 font-semibold text-white">{record.next_manual_action}</p>
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-xs text-emerald-100/70"><span>Accounting readiness</span><span>{record.accounting_readiness_score}%</span></div>
                      <Progress value={record.accounting_readiness_score} className="mt-2 h-2" />
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </CardContent>
        </Card>

        <Card className="border-violet-300/20 bg-slate-950/75 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white"><BookOpenCheck className="h-5 w-5 text-violet-200" /> Accounting readiness notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-violet-50">
            <p className="rounded-2xl border border-violet-300/20 bg-violet-400/10 p-3">
              P5 is a visibility layer, not a ledger of record. It prepares the vocabulary, status model, trace fields, and reconciliation questions for P6 persistence without activating production writes.
            </p>
            {[
              "FORECAST keeps expected revenue separate from approved release value.",
              "APPROVED mirrors P4 release readiness without creating receivables.",
              "PENDING_PAYMENT is a manual waiting state, not a gateway status.",
              "RECEIVED_SAMPLE is a UI sample only, not proof of funds.",
              "LOST and ARCHIVED preserve operator learning without accounting entries.",
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">{item}</div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
