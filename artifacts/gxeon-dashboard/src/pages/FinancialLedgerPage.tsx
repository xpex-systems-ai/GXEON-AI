import { OperatorAssistantPanel } from "@/components/operatorAssistant/OperatorAssistantPanel";import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getFinancialLedgerSummary, getLedgerStatusCounts, realFinancialLedgerRecords } from "@/data/financial-ledger";
import { formatCurrency, formatDate } from "@/lib/format";
import { fetchLedgerPreviews, fetchLedgerStatus, fallbackLedgerStatus, type LedgerPreviewRecord, type LedgerStatus, type LedgerStatusSummary } from "@/services/ledgerService";
import { Banknote, BookOpenCheck, CircleDollarSign, GitBranch, Lock, ShieldCheck, TrendingDown, TrendingUp } from "lucide-react";

const metricCards = [
  { key: "estimated_revenue_brl", label: "Forecast", icon: TrendingUp, tone: "border-blue-300/20 bg-blue-400/10 text-blue-100" },
  { key: "approved_revenue_brl", label: "Approved", icon: BookOpenCheck, tone: "border-emerald-300/20 bg-emerald-400/10 text-emerald-100" },
  { key: "pending_revenue_brl", label: "Pending", icon: CircleDollarSign, tone: "border-amber-300/20 bg-amber-400/10 text-amber-100" },
  { key: "received_revenue_brl", label: "Received", icon: Banknote, tone: "border-cyan-300/20 bg-cyan-400/10 text-cyan-100" },
  { key: "lost_revenue_brl", label: "Lost", icon: TrendingDown, tone: "border-rose-300/20 bg-rose-400/10 text-rose-100" },
] as const;

const statusTone: Record<LedgerStatus, string> = {
  FORECAST: "border-blue-300/30 bg-blue-400/10 text-blue-100",
  APPROVED_MANUAL: "border-emerald-300/30 bg-emerald-400/10 text-emerald-100",
  PENDING_PAYMENT_REVIEW: "border-amber-300/30 bg-amber-400/10 text-amber-100",
  LOST: "border-rose-300/30 bg-rose-400/10 text-rose-100",
  CANCELLED: "border-slate-500/30 bg-slate-600/10 text-slate-300",
  ARCHIVED: "border-stone-500/30 bg-stone-600/10 text-stone-300",
};

function summarizeFallbackRecords() {
  return getFinancialLedgerSummary(realFinancialLedgerRecords);
}

export default function FinancialLedgerPage() {
  const [status, setStatus] = useState<LedgerStatusSummary>(() => fallbackLedgerStatus());
  const [records, setRecords] = useState<LedgerPreviewRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const [runtimeStatus, previews] = await Promise.all([fetchLedgerStatus(controller.signal), fetchLedgerPreviews(controller.signal)]);
        setStatus(runtimeStatus);
        setRecords(previews);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    load();
    return () => controller.abort();
  }, []);

  const fallbackSummary = summarizeFallbackRecords();
  const summary = records.length > 0 || status.recordsInMemory > 0 ? status : fallbackSummary;
  const statusCounts = useMemo(() => {
    if (records.length > 0 || status.recordsInMemory > 0) {
      return status.allowedStatuses.map((ledgerStatus) => ({ status: ledgerStatus, count: records.filter((record) => record.status === ledgerStatus).length }));
    }
    return getLedgerStatusCounts().map((item) => ({ status: item.status.replace("APPROVED", "APPROVED_MANUAL").replace("PENDING_PAYMENT", "PENDING_PAYMENT_REVIEW").replace("RECEIVED_REAL", "ARCHIVED") as LedgerStatus, count: item.count }));
  }, [records, status]);
  const maxCount = Math.max(...statusCounts.map((item) => item.count), 1);
  const recent = records.slice(0, 8);

  return (
    <div className="space-y-5">
      <section className="rounded-[2rem] border border-amber-300/15 bg-[#070707]/90 p-5 shadow-2xl shadow-black/50">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex flex-wrap gap-2">
              <Badge className="border-amber-300/30 bg-amber-400/10 text-amber-100">P0 Ledger</Badge>
              <Badge className="border-emerald-300/30 bg-emerald-400/10 text-emerald-100">PREVIEW_ONLY</Badge>
              <Badge variant="outline" className="border-rose-300/30 text-rose-100">PAYMENT_DISABLED</Badge>
              <Badge variant="outline" className="border-cyan-300/30 text-cyan-100">INVOICE_DISABLED</Badge>
              <Badge variant="outline" className="border-violet-300/30 text-violet-100">NO_REAL_REVENUE</Badge>
            </div>
            <h1 className="mt-4 text-4xl font-black tracking-tight text-white md:text-6xl">Ledger</h1>
          </div>
          <div className="flex flex-wrap gap-2"><Badge variant="outline" className="w-fit border-emerald-300/30 text-emerald-100">Manual · no transactions · {loading ? "loading" : `${records.length} previews`}</Badge><Link href="/ops/manual-payment"><Button variant="outline" className="border-amber-300/30 text-amber-100">Manual Payment Center · {((status as any).manualPayment?.manualPaymentReadyCount ?? 0)} ready · R$ {((status as any).manualPayment?.manualPaymentTotalExpectedPreviewBrl ?? 0)} preview</Button></Link></div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {metricCards.map((metric) => {
          const Icon = metric.icon;
          const value = summary[metric.key];
          return (
            <Card key={metric.label} className="group border-white/10 bg-[#090909]/85 text-white transition hover:-translate-y-1 hover:border-amber-300/30 hover:bg-amber-400/[0.08]">
              <CardContent className="p-5">
                <div className={`grid h-10 w-10 place-items-center rounded-2xl border ${metric.tone}`}><Icon className="h-5 w-5" /></div>
                <p className="mt-6 text-xs uppercase tracking-[0.25em] text-stone-500">{metric.label}</p>
                <p className="mt-2 text-3xl font-black">{formatCurrency(value)}</p>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="border-white/10 bg-[#090909]/85 text-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Pipeline</h2>
              <Badge variant="outline" className="border-white/15 text-stone-300">{summary.total_records} active</Badge>
            </div>
            <div className="mt-5 space-y-4">
              {statusCounts.filter((item) => item.status !== "ARCHIVED").map((item) => (
                <div key={item.status}>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-semibold text-stone-300">{item.status.replaceAll("_", " ")}</span>
                    <span className="text-stone-500">{item.count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10">
                    <div className="h-2 rounded-full bg-amber-300" style={{ width: `${(item.count / maxCount) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-[#090909]/85 text-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Ledger preview records</h2>
              <Badge variant="outline" className="border-amber-300/30 text-amber-100">Backend preview</Badge>
            </div>
            <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">
              <table className="w-full text-left text-sm">
                <thead className="bg-white/[0.035] text-xs uppercase tracking-[0.22em] text-stone-500">
                  <tr><th className="p-3">Record</th><th className="p-3">Status</th><th className="p-3">Value</th><th className="p-3">Updated</th></tr>
                </thead>
                <tbody>
                  {recent.map((record) => (
                    <tr key={record.id} className="border-t border-white/10 align-top">
                      <td className="p-3">
                        <p className="font-semibold text-white">{record.id}</p>
                        <p className="mt-1 text-xs text-stone-500">{record.title}</p>
                      </td>
                      <td className="p-3"><Badge variant="outline" className={statusTone[record.status]}>{record.status.replaceAll("_", " ")}</Badge></td>
                      <td className="p-3 text-stone-300">{formatCurrency(record.expected_revenue_brl)}</td>
                      <td className="p-3 text-stone-500">{formatDate(record.updated_at)}</td>
                    </tr>
                  ))}
                  {recent.length === 0 && (
                    <tr className="border-t border-white/10"><td colSpan={4} className="p-5 text-center text-sm text-stone-400">No ledger previews yet. Create one from Release Gate P0, or keep this safe empty state while the backend is unavailable.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        {recent.map((record) => (
          <Card key={`${record.id}-trace`} className="border-white/10 bg-[#090909]/85 text-white">
            <CardContent className="space-y-4 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-stone-500">Release Gate trace</p>
                  <h3 className="mt-2 text-xl font-black">{record.title}</h3>
                </div>
                <Badge variant="outline" className={statusTone[record.status]}>{record.revenue_class.replaceAll("_", " ")}</Badge>
              </div>
              <p className="rounded-2xl border border-cyan-300/20 bg-cyan-400/10 p-3 text-sm font-semibold text-cyan-50"><GitBranch className="mr-2 inline h-4 w-4" />{record.full_trace_label}</p>
              <p className="rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-3 text-sm text-emerald-50"><ShieldCheck className="mr-2 inline h-4 w-4" />{record.next_manual_action}</p>
              <div className="grid gap-2 text-xs text-stone-300 md:grid-cols-2">
                {["paymentDisabled", "invoiceDisabled", "receiptDisabled", "databaseWriteDisabled", "approvalRequired", "realRevenueClaimed false"].map((item) => (
                  <div key={`${record.id}-${item}`} className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-3"><Lock className="h-4 w-4 text-amber-200" />{item}</div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
        {recent.length === 0 && (
          <Card className="border-white/10 bg-[#090909]/85 text-white xl:col-span-2">
            <CardContent className="space-y-3 p-5">
              <h2 className="text-lg font-bold">Safe fallback mode</h2>
              <p className="text-sm text-stone-400">The static ledger fallback remains empty and manual-first. Ledger P0 never exposes invoice, payment, receipt or mark-paid controls.</p>
              <Link href="/ops/release" className="inline-flex items-center gap-2 rounded-2xl border border-amber-300/30 bg-amber-400/10 px-4 py-3 text-sm font-bold text-amber-50 transition hover:bg-amber-400/20">Open Release Gate previews</Link>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
