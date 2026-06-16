import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { applyR100DatabaseMirrorSchema, createR100DatabaseMirrorProbe, dryRunR100DatabaseMirrorSchema, exportR100SafeSnapshotToDatabaseMirror, fallbackR100DatabaseMirrorOperatorSummary, fetchR100DatabaseMirrorOperatorSummary, runR100DatabaseMirrorActivationSmokeTest, type R100DatabaseMirrorOperatorSummary } from "@/services/r100DatabaseMirrorService";

const badges = ["MANUAL_FIRST", "PREVIEW_ONLY", "DB_MIRROR", "NO_PAYMENT_API", "NO_PROVIDER_VERIFIED_REVENUE"];
const yesNo = (value: boolean) => value ? "yes" : "no";
const commandText = (command: R100DatabaseMirrorOperatorSummary["copySafeHttpCommands"][number]) => `${command.method} ${command.path}${command.body ? `\nbody: ${JSON.stringify(command.body)}` : ""}`;

export default function R100DatabaseMirrorConsolePage() {
  const [summary, setSummary] = useState<R100DatabaseMirrorOperatorSummary>(() => fallbackR100DatabaseMirrorOperatorSummary());
  const [actionResult, setActionResult] = useState("");
  const [loading, setLoading] = useState(true);

  async function refresh(signal?: AbortSignal) { setSummary(await fetchR100DatabaseMirrorOperatorSummary(signal)); }
  useEffect(() => { const controller = new AbortController(); refresh(controller.signal).finally(() => { if (!controller.signal.aborted) setLoading(false); }); return () => controller.abort(); }, []);

  async function runDryRun() { const result = await dryRunR100DatabaseMirrorSchema(); setActionResult(`${result.status}: ${result.nextManualAction}`); await refresh(); }
  async function applySchema() { const result = await applyR100DatabaseMirrorSchema(); setActionResult(`${result.status}: ${result.nextManualAction}`); await refresh(); }
  async function runSmokeTest() { const result = await runR100DatabaseMirrorActivationSmokeTest(); setActionResult(`${result.status}: ${result.nextManualAction}`); await refresh(); }
  async function runProbe() { const result = await createR100DatabaseMirrorProbe(); setActionResult(`${result.status}: ${result.nextManualAction ?? result.error ?? "Probe action completed."}`); await refresh(); }
  async function exportSnapshot() { const result = await exportR100SafeSnapshotToDatabaseMirror(); setActionResult(`${result.status}: ${result.nextManualAction ?? result.error ?? "Snapshot action completed."}`); await refresh(); }

  const schemaReady = !["DB_NOT_CONFIGURED", "SCHEMA_MISSING", "SCHEMA_APPLY_FLAG_REQUIRED", "UNHEALTHY_SAFE_FALLBACK"].includes(summary.activationStage);
  const schemaApplyEnabled = summary.allowedActions.includes("Aplicar schema guardado");
  const safeToWrite = summary.allowedActions.includes("Rodar probe seguro") && summary.allowedActions.includes("Exportar snapshot SAFE_REDACTED");
  const snapshotExported = summary.counts.snapshotCount >= 1;

  const cards = [
    ["activation stage", summary.activationStage],
    ["schema ready", yesNo(schemaReady)],
    ["schema apply enabled", yesNo(schemaApplyEnabled)],
    ["safe to write", yesNo(safeToWrite)],
    ["latest snapshot", summary.latestSnapshot.createdAt ?? "none"],
    ["snapshot count", String(summary.counts.snapshotCount)],
  ];

  return <main className="space-y-6 p-6 text-white">
    <section className="rounded-[2rem] border border-cyan-300/20 bg-gradient-to-br from-cyan-500/15 to-emerald-500/10 p-6"><p className="text-xs font-black uppercase tracking-[0.32em] text-cyan-100">Manual-first persistence mirror</p><h1 className="mt-3 text-4xl font-black">R$100 DB Mirror Activation Console P2.1</h1><p className="mt-2 max-w-4xl text-stone-300">Console seguro para orientar a ativação manual do espelho. Não exibe DATABASE_URL, Pix, links, e-mail, telefone, WhatsApp, tokens, API keys ou credenciais; não ativa pagamentos, checkout, invoice ou receita verificada.</p><div className="mt-4 flex flex-wrap gap-2">{badges.map((badge) => <Badge key={badge} variant="outline" className="border-cyan-300/30 text-cyan-100">{badge}</Badge>)}</div></section>

    <section className="rounded-[2rem] border border-amber-300/25 bg-amber-400/10 p-5"><p className="text-xs font-black uppercase tracking-[0.28em] text-amber-100">Activation lane</p><h2 className="mt-2 text-3xl font-black">{summary.activationStage}</h2><p className="mt-3 text-amber-50"><strong>Bloqueio atual:</strong> {summary.currentBlocker}</p><p className="mt-2 text-amber-50"><strong>Próxima ação manual:</strong> {summary.nextManualAction}</p>{!schemaReady ? <p className="mt-3 rounded-2xl border border-yellow-300/30 bg-yellow-300/10 p-3 text-sm text-yellow-50">Aplique o schema primeiro; nenhuma escrita de espelho será tentada</p> : null}{safeToWrite ? <p className="mt-3 rounded-2xl border border-emerald-300/30 bg-emerald-300/10 p-3 text-sm text-emerald-50">Pronto para escritas guardadas: probe e snapshot SAFE_REDACTED estão liberados pelo backend.</p> : null}{snapshotExported ? <p className="mt-3 rounded-2xl border border-cyan-300/30 bg-cyan-300/10 p-3 text-sm text-cyan-50">Snapshot SAFE_REDACTED exportado: snapshotCount &gt;= 1.</p> : null}</section>

    <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">{cards.map(([label, value]) => <Card key={label} className="border-white/10 bg-[#090909]/85 text-white"><CardContent className="p-4"><p className="text-[10px] uppercase tracking-[0.24em] text-stone-500">{label}</p><p className="mt-3 break-words text-lg font-black">{value}</p></CardContent></Card>)}</section>

    <section className="grid gap-4 lg:grid-cols-[1fr_0.85fr]"><Card className="border-white/10 bg-[#090909]/85 text-white"><CardContent className="space-y-4 p-5"><h2 className="text-xl font-black">Operator actions</h2><div className="flex flex-wrap gap-2"><Button onClick={() => refresh()} className="bg-cyan-300 text-black hover:bg-cyan-200">Verificar prontidão</Button><Button variant="outline" className="border-cyan-300/30 text-cyan-100" onClick={() => refresh()}>Ver diagnóstico de schema</Button><Button variant="outline" className="border-cyan-300/30 text-cyan-100" onClick={runDryRun}>Dry-run do schema</Button><Button variant="outline" className="border-emerald-300/30 text-emerald-100" onClick={applySchema} disabled={!schemaApplyEnabled}>Aplicar schema guardado</Button><Button variant="outline" className="border-emerald-300/30 text-emerald-100" onClick={runSmokeTest}>Activation smoke test</Button><Button variant="outline" className="border-emerald-300/30 text-emerald-100" onClick={runProbe} disabled={!safeToWrite}>Rodar probe seguro</Button><Button variant="outline" className="border-violet-300/30 text-violet-100" onClick={exportSnapshot} disabled={!safeToWrite}>Exportar snapshot SAFE_REDACTED</Button></div><p className="text-sm text-stone-400">Os botões de escrita continuam dependendo de confirmações e flags no backend. Este console não altera Railway/Vercel/env automaticamente.</p>{actionResult ? <div className="rounded-2xl border border-amber-300/25 bg-amber-400/10 p-3 text-sm text-amber-100">{actionResult}</div> : null}</CardContent></Card>
    <Card className="border-white/10 bg-[#090909]/85 text-white"><CardContent className="p-5"><h2 className="text-xl font-black">Readiness warnings</h2><ul className="mt-3 space-y-2 text-sm text-stone-300">{summary.warnings.map((warning) => <li key={warning}>• {warning}</li>)}</ul></CardContent></Card></section>

    <section className="grid gap-4 lg:grid-cols-2"><Card className="border-white/10 bg-[#090909]/85 text-white"><CardContent className="p-5"><h2 className="text-xl font-black">Checklist do operador</h2><ol className="mt-4 space-y-3 text-sm text-stone-300">{summary.operatorChecklist.map((item, index) => <li key={item} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3"><span className="mr-2 font-black text-cyan-100">{index + 1}.</span>{item}</li>)}</ol></CardContent></Card><Card className="border-white/10 bg-[#090909]/85 text-white"><CardContent className="p-5"><h2 className="text-xl font-black">Backend-only env checklist</h2><ul className="mt-4 space-y-3 text-sm text-stone-300">{summary.backendOnlyEnvChecklist.map((item) => <li key={item}>• {item}</li>)}</ul><p className="mt-4 text-xs text-stone-500">Instruções apenas; sem campos de input e sem persistência de segredo no frontend.</p></CardContent></Card></section>

    <section className="rounded-[2rem] border border-white/10 bg-[#090909]/85 p-5"><h2 className="text-xl font-black">Copy-safe HTTP examples</h2><div className="mt-4 grid gap-3 lg:grid-cols-2">{summary.copySafeHttpCommands.map((command) => <pre key={`${command.method}-${command.path}`} className="whitespace-pre-wrap rounded-2xl border border-white/10 bg-black/50 p-3 text-xs text-cyan-50">{commandText(command)}</pre>)}</div></section>{loading ? <p className="text-sm text-stone-500">Loading DB mirror console...</p> : null}</main>;
}
