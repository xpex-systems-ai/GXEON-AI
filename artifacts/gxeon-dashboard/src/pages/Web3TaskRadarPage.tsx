import { FormEvent, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Radar, ShieldCheck, Target } from "lucide-react";
import { fetchWeb3TaskPreviews, fetchWeb3TaskRadarStatus, fetchWeb3TaskSources, manualImportWeb3Task, type Web3TaskCategory, type Web3TaskPreview, type Web3TaskRadarStatus, type Web3TaskSource } from "@/services/web3TaskRadarService";

const categories: Web3TaskCategory[] = ["bounty", "quest", "content", "dev", "audit", "community", "airdrop", "grant", "hackathon"];

export default function Web3TaskRadarPage() {
  const [status, setStatus] = useState<Web3TaskRadarStatus | null>(null);
  const [sources, setSources] = useState<Web3TaskSource[]>([]);
  const [previews, setPreviews] = useState<Web3TaskPreview[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", url: "", sourceId: "superteam_earn", category: "bounty" as Web3TaskCategory, rewardLabel: "", estimatedRewardUsd: "", estimatedRewardBrl: "", deadlineLabel: "", notes: "" });

  async function load(signal?: AbortSignal) {
    const [runtimeStatus, sourceData, previewData] = await Promise.all([fetchWeb3TaskRadarStatus(signal), fetchWeb3TaskSources(signal), fetchWeb3TaskPreviews(signal)]);
    setStatus(runtimeStatus); setSources(sourceData.sources); setPreviews(previewData.previews);
  }

  useEffect(() => { const controller = new AbortController(); load(controller.signal).catch((loadError) => setError(loadError instanceof Error ? loadError.message : "WEB3_TASK_RADAR_LOAD_FAILED")); return () => controller.abort(); }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      const result = await manualImportWeb3Task({ ...form, estimatedRewardUsd: form.estimatedRewardUsd ? Number(form.estimatedRewardUsd) : undefined, estimatedRewardBrl: form.estimatedRewardBrl ? Number(form.estimatedRewardBrl) : undefined });
      setPreviews((current) => [result.preview, ...current]); setError(null);
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : "WEB3_TASK_IMPORT_FAILED"); }
  }

  return <div className="space-y-6">
    <section className="relative overflow-hidden rounded-[2rem] border border-cyan-300/20 bg-slate-950/85 p-6 shadow-2xl shadow-cyan-950/20">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,rgba(34,211,238,0.22),transparent_32%),radial-gradient(circle_at_10%_18%,rgba(245,158,11,0.16),transparent_30%)]" />
      <div className="relative space-y-5">
        <div className="flex flex-wrap gap-2">
          {["PREVIEW_ONLY", "MANUAL_FIRST", "WALLET_DISABLED", "NO_GUARANTEED_REWARD"].map((badge) => <Badge key={badge} className="border-cyan-300/30 bg-cyan-400/10 text-cyan-100">{badge}</Badge>)}
        </div>
        <div><p className="text-xs uppercase tracking-[0.45em] text-cyan-200/70">Safe monetization radar</p><h1 className="mt-2 text-4xl font-black text-white md:text-6xl">Web3 Task Radar P0</h1><p className="mt-3 max-w-3xl text-slate-300">Manual-first task hunting for bounties, quests and microtasks. GXEON creates internal previews only; it never connects wallets, claims rewards or submits external work.</p></div>
        <div className="flex flex-wrap gap-3"><Badge variant="outline" className="border-amber-300/40 p-3 text-amber-100"><Target className="mr-2 h-4 w-4" /> Target: find R$100 equivalent opportunities</Badge><Badge variant="outline" className="border-white/20 p-3 text-white">mode {status?.mode ?? "PREVIEW_ONLY"}</Badge></div>
        {error && <p className="rounded-2xl border border-red-300/25 bg-red-500/10 p-3 text-sm text-red-100">{error}</p>}
      </div>
    </section>

    <section className="grid gap-3 md:grid-cols-3">{(status?.boundaries ?? []).slice(0,6).map((item) => <div key={item} className="rounded-2xl border border-emerald-300/15 bg-emerald-400/10 p-4 text-sm text-emerald-50"><ShieldCheck className="mb-2 h-4 w-4 text-emerald-200" />{item}</div>)}</section>

    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{sources.map((source) => <Card key={source.id} className="border-white/10 bg-slate-950/75"><CardHeader><CardTitle className="text-white">{source.label}</CardTitle></CardHeader><CardContent className="space-y-3"><Badge variant="outline" className="border-emerald-300/30 text-emerald-100">manualOnly: true</Badge><p className="text-sm text-slate-300">{source.payoutNotes}</p><p className="text-xs text-cyan-100">{source.supportedCategories.join(" · ")}</p></CardContent></Card>)}</section>

    <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <Card className="border-amber-300/20 bg-slate-950/75"><CardHeader><CardTitle className="text-white">Manual import form</CardTitle></CardHeader><CardContent><form onSubmit={submit} className="space-y-3">
        <Input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        <Input placeholder="Public task URL" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} required />
        <div className="grid gap-3 md:grid-cols-2"><select className="rounded-md border border-white/10 bg-slate-900 p-2 text-white" value={form.sourceId} onChange={(e) => setForm({ ...form, sourceId: e.target.value })}>{sources.map((source) => <option key={source.id} value={source.id}>{source.label}</option>)}</select><select className="rounded-md border border-white/10 bg-slate-900 p-2 text-white" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as Web3TaskCategory })}>{categories.map((category) => <option key={category}>{category}</option>)}</select></div>
        <Input placeholder="Reward label" value={form.rewardLabel} onChange={(e) => setForm({ ...form, rewardLabel: e.target.value })} />
        <div className="grid gap-3 md:grid-cols-2"><Input placeholder="Estimated USD" type="number" value={form.estimatedRewardUsd} onChange={(e) => setForm({ ...form, estimatedRewardUsd: e.target.value })} /><Input placeholder="Estimated BRL" type="number" value={form.estimatedRewardBrl} onChange={(e) => setForm({ ...form, estimatedRewardBrl: e.target.value })} /></div>
        <Input placeholder="Deadline label" value={form.deadlineLabel} onChange={(e) => setForm({ ...form, deadlineLabel: e.target.value })} />
        <Textarea placeholder="Notes / risk words / evidence context" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        <Button className="w-full bg-amber-300 text-slate-950 hover:bg-amber-200">Create internal preview only</Button>
      </form></CardContent></Card>

      <div className="space-y-4">{previews.map((preview) => <Card key={preview.id} className="border-cyan-300/20 bg-slate-950/75"><CardHeader><CardTitle className="flex items-center gap-2 text-white"><Radar className="h-5 w-5 text-cyan-200" />{preview.title}</CardTitle></CardHeader><CardContent className="space-y-3"><div className="flex flex-wrap gap-2"><Badge className="bg-emerald-400/15 text-emerald-100">Opportunity {preview.opportunityScore}</Badge><Badge className="bg-red-400/15 text-red-100">Risk {preview.riskScore}</Badge><Badge variant="outline" className="border-amber-300/30 text-amber-100">{preview.recommendedAction}</Badge></div><p className="text-sm text-slate-300">{preview.recommendedNextManualAction}</p><p className="text-sm text-cyan-100">{preview.rewardLabel} · {preview.estimatedRewardBrl ? `R$${preview.estimatedRewardBrl}` : "BRL unknown"}</p><div className="grid gap-3 md:grid-cols-2"><List title="Risk flags" items={preview.riskFlags.length ? preview.riskFlags : ["NONE_DETECTED"]} /><List title="Evidence checklist" items={preview.evidenceChecklist} /><List title="Blocked actions" items={preview.blockedActions} /></div></CardContent></Card>)}{!previews.length && <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-slate-300">No Web3 task previews yet. Paste a public opportunity to score it safely.</p>}</div>
    </section>
  </div>;
}

function List({ title, items }: { title: string; items: string[] }) { return <div><p className="mb-2 text-xs uppercase tracking-[0.25em] text-slate-400">{title}</p><ul className="list-disc space-y-1 pl-5 text-xs text-slate-300">{items.map((item) => <li key={item}>{item}</li>)}</ul></div>; }
