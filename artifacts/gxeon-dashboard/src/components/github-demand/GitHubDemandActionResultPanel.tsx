import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ConversionActionResult } from "@/services/githubDemandService";

const routeLabels: Record<string, string> = {
  inbox: "Open Inbox",
  tasks: "Open Tasks",
  brain: "Open Brain",
  broker: "Open Broker",
  ledger: "Open Ledger",
};

function List({ title, items }: { title: string; items?: string[] }) {
  if (!items?.length) return null;
  return <div><p className="font-bold text-white">{title}</p><ul className="mt-1 list-disc space-y-1 pl-5 text-slate-200">{items.map((item) => <li key={item}>{item}</li>)}</ul></div>;
}

export function GitHubDemandActionResultPanel({ result }: { result: ConversionActionResult | null }) {
  if (!result) return null;
  const routes = Object.entries(result.nextRoutes ?? {}).filter(([, href]) => Boolean(href));
  return <Card className="border-emerald-300/30 bg-emerald-950/30 shadow-lg shadow-emerald-950/20">
    <CardHeader>
      <CardTitle className="flex flex-wrap items-center gap-2 text-white">
        Last action result
        <Badge className="bg-cyan-300/10 text-cyan-100">{result.actionType}</Badge>
        <Badge className="bg-emerald-300/10 text-emerald-100">{result.status}</Badge>
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-4 text-sm text-slate-200">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Source conversion pack</p>
        <p className="font-bold text-white">{result.conversionPackTitle}</p>
        <p className="text-xs text-slate-400">Pack ID: {result.conversionPackId}</p>
      </div>
      {result.actionType === "OPPORTUNITY_PREVIEW" && !result.opportunity && <p className="rounded-2xl border border-amber-300/30 bg-amber-300/10 p-3 text-amber-100">Internal Opportunity was not created yet. Confirm operator approval to create internal preview.</p>}
      {result.actionType === "OPPORTUNITY_PREVIEW" && result.opportunity && <div className="rounded-2xl border border-white/10 p-3"><p className="font-bold text-white">Internal Opportunity Preview</p><p>ID: {result.opportunity.id}</p><p>Status: {String(result.opportunity.status ?? "PREVIEW_ONLY")}</p></div>}
      {result.actionType === "TASK_PREVIEW" && <div className="grid gap-3 md:grid-cols-3"><List title="Task checklist" items={result.taskPreview.checklist}/><List title="Evidence checklist" items={result.taskPreview.evidenceChecklist}/><List title="Delivery checklist" items={result.taskPreview.deliveryChecklist}/></div>}
      {result.actionType === "BRAIN_SPRINT_PREVIEW" && <div className="grid gap-3 md:grid-cols-2"><div className="rounded-2xl border border-white/10 p-3"><p className="font-bold text-white">Brain recommendation</p><p>{result.recommendation?.reason}</p><p className="text-xs text-slate-400">Route: {result.recommendation?.route}</p></div><div className="rounded-2xl border border-white/10 p-3"><p className="font-bold text-white">Ledger preview</p><p>R${result.ledgerPreview?.expectedValueBrl ?? 0} / US${result.ledgerPreview?.expectedValueUsd ?? 0}</p><p className="text-xs text-amber-100">Preview only. Reward is not guaranteed.</p></div></div>}
      <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/5 p-3"><p className="font-bold text-cyan-100">Next manual action</p><p>{result.nextManualAction ?? result.nextBestAction ?? "Manual review required before any internal next step."}</p></div>
      <div className="flex flex-wrap gap-2">{["PREVIEW_ONLY", "NO_GITHUB_WRITE", "NO_AUTO_CONTACT", "NO_PAYMENT", "REWARD_NOT_GUARANTEED"].map((flag) => <Badge key={flag} className="border-cyan-300/30 bg-cyan-400/10 text-cyan-100">{flag}</Badge>)}</div>
      {!!routes.length && <div className="flex flex-wrap gap-2">{routes.map(([key, href]) => <Link key={key} href={href as string}><Button variant="outline" className="border-white/20 text-white">{routeLabels[key] ?? `Open ${key}`}</Button></Link>)}</div>}
    </CardContent>
  </Card>;
}
