import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getOpportunityInboxSummary, getOpportunityStatusCounts, sampleManualFirstOpportunities } from "@/data/opportunity-inbox";
import { formatCurrency, formatDate } from "@/lib/format";
import { ArrowRight, CircleDollarSign, Inbox, Layers3, Target, Trophy } from "lucide-react";

export default function OpportunityInboxPage() {
  const summary = getOpportunityInboxSummary(sampleManualFirstOpportunities);
  const statusCounts = getOpportunityStatusCounts(sampleManualFirstOpportunities);
  const activeStages = statusCounts.filter((item) => !["ARCHIVED"].includes(item.status));
  const maxCount = Math.max(...activeStages.map((item) => item.count), 1);
  const recent = sampleManualFirstOpportunities.slice(0, 7);

  const metrics = [
    { label: "Pipeline", value: summary.activeCount, icon: Inbox },
    { label: "Stages", value: activeStages.length, icon: Layers3 },
    { label: "Counts", value: summary.totalCount, icon: Target },
    { label: "Value", value: formatCurrency(summary.activePipelineValueBrl), icon: CircleDollarSign },
    { label: "Won", value: formatCurrency(summary.wonSampleValueBrl), icon: Trophy },
  ];

  return (
    <div className="space-y-5">
      <section className="rounded-[2rem] border border-amber-300/15 bg-[#070707]/90 p-5 shadow-2xl shadow-black/50">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <Badge className="border-emerald-300/30 bg-emerald-400/10 text-emerald-100">P0 Inbox</Badge>
            <h1 className="mt-4 text-4xl font-black tracking-tight text-white md:text-6xl">Opportunities</h1>
          </div>
          <Link href="/ops/tasks" className="group flex w-fit items-center gap-2 rounded-2xl border border-amber-300/25 bg-amber-400/10 px-4 py-2 text-sm font-bold text-amber-100 transition hover:border-amber-300/45 hover:bg-amber-400/20">
            Tasks <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.label} className="border-white/10 bg-[#090909]/85 text-white transition hover:-translate-y-1 hover:border-amber-300/30 hover:bg-amber-400/[0.08]">
              <CardContent className="p-5">
                <Icon className="h-5 w-5 text-amber-200" />
                <p className="mt-6 text-xs uppercase tracking-[0.25em] text-stone-500">{metric.label}</p>
                <p className="mt-2 text-3xl font-black">{metric.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <Card className="border-white/10 bg-[#090909]/85 text-white">
          <CardContent className="p-5">
            <h2 className="text-lg font-bold">Stages</h2>
            <div className="mt-5 space-y-4">
              {activeStages.map((stage) => (
                <div key={stage.status}>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-semibold text-stone-300">{stage.status.replaceAll("_", " ")}</span>
                    <span className="text-stone-500">{stage.count} · {formatCurrency(stage.estimatedValueBrl)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10">
                    <div className="h-2 rounded-full bg-amber-300" style={{ width: `${(stage.count / maxCount) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-[#090909]/85 text-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Recent opportunities</h2>
              <Badge variant="outline" className="border-amber-300/30 text-amber-100">Manual</Badge>
            </div>
            <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">
              <table className="w-full text-left text-sm">
                <thead className="bg-white/[0.035] text-xs uppercase tracking-[0.22em] text-stone-500">
                  <tr><th className="p-3">Opportunity</th><th className="p-3">Stage</th><th className="p-3">Value</th><th className="p-3">Updated</th></tr>
                </thead>
                <tbody>
                  {recent.map((opportunity) => (
                    <tr key={opportunity.id} className="border-t border-white/10 transition hover:bg-amber-400/[0.04]">
                      <td className="p-3"><p className="font-semibold text-white">{opportunity.title}</p><p className="text-xs text-stone-500">{opportunity.source}</p></td>
                      <td className="p-3 text-stone-300">{opportunity.status.replaceAll("_", " ")}</td>
                      <td className="p-3 text-stone-300">{formatCurrency(opportunity.estimated_value_brl)}</td>
                      <td className="p-3 text-stone-500">{formatDate(opportunity.updated_at)}</td>
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
