import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getFinancialLedgerSummary, getLedgerStatusCounts, sampleFinancialLedgerRecords } from "@/data/financial-ledger";
import { formatCurrency, formatDate } from "@/lib/format";
import { Banknote, BookOpenCheck, CircleDollarSign, TrendingDown, TrendingUp } from "lucide-react";

const metricCards = [
  { key: "estimated_revenue_brl", label: "Forecast", icon: TrendingUp, tone: "border-blue-300/20 bg-blue-400/10 text-blue-100" },
  { key: "approved_revenue_brl", label: "Approved", icon: BookOpenCheck, tone: "border-emerald-300/20 bg-emerald-400/10 text-emerald-100" },
  { key: "pending_revenue_brl", label: "Pending", icon: CircleDollarSign, tone: "border-amber-300/20 bg-amber-400/10 text-amber-100" },
  { key: "received_revenue_brl", label: "Received", icon: Banknote, tone: "border-cyan-300/20 bg-cyan-400/10 text-cyan-100" },
  { key: "lost_revenue_brl", label: "Lost", icon: TrendingDown, tone: "border-rose-300/20 bg-rose-400/10 text-rose-100" },
] as const;

export default function FinancialLedgerPage() {
  const summary = getFinancialLedgerSummary();
  const statusCounts = getLedgerStatusCounts();
  const maxCount = Math.max(...statusCounts.map((item) => item.count), 1);
  const recent = sampleFinancialLedgerRecords.slice(0, 5);

  return (
    <div className="space-y-5">
      <section className="rounded-[2rem] border border-amber-300/15 bg-[#070707]/90 p-5 shadow-2xl shadow-black/50">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <Badge className="border-amber-300/30 bg-amber-400/10 text-amber-100">P5 Ledger</Badge>
            <h1 className="mt-4 text-4xl font-black tracking-tight text-white md:text-6xl">Ledger</h1>
          </div>
          <Badge variant="outline" className="w-fit border-emerald-300/30 text-emerald-100">Manual · no transactions</Badge>
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
              <h2 className="text-lg font-bold">Recent activity</h2>
              <Badge variant="outline" className="border-amber-300/30 text-amber-100">Preview</Badge>
            </div>
            <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">
              <table className="w-full text-left text-sm">
                <thead className="bg-white/[0.035] text-xs uppercase tracking-[0.22em] text-stone-500">
                  <tr><th className="p-3">Record</th><th className="p-3">Status</th><th className="p-3">Value</th><th className="p-3">Updated</th></tr>
                </thead>
                <tbody>
                  {recent.map((record) => (
                    <tr key={record.id} className="border-t border-white/10">
                      <td className="p-3 font-semibold text-white">{record.id}</td>
                      <td className="p-3 text-stone-300">{record.status.replaceAll("_", " ")}</td>
                      <td className="p-3 text-stone-300">{formatCurrency(record.expected_revenue_brl)}</td>
                      <td className="p-3 text-stone-500">{formatDate(record.updated_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
