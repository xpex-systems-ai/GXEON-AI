import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { applyR100DatabaseMirrorSchema, createR100DatabaseMirrorProbe, dryRunR100DatabaseMirrorSchema, exportR100SafeSnapshotToDatabaseMirror, fallbackR100DatabaseMirrorSchemaDiagnostics, fetchR100DatabaseMirrorSchemaDiagnostics, runR100DatabaseMirrorActivationSmokeTest, fallbackR100DatabaseMirrorActivationPlan, fallbackR100DatabaseMirrorReadiness, fallbackR100DatabaseMirrorStatus, fetchR100DatabaseMirrorActivationPlan, fetchR100DatabaseMirrorReadiness, fetchR100DatabaseMirrorSnapshot, fetchR100DatabaseMirrorStatus, type R100DatabaseMirrorActivationPlan, type R100DatabaseMirrorReadiness, type R100DatabaseMirrorSchemaDiagnostics, type R100DatabaseMirrorStatus } from "@/services/r100DatabaseMirrorService";

const badges = ["MANUAL_FIRST", "PREVIEW_ONLY", "DB_MIRROR", "NO_PAYMENT_API", "NO_PROVIDER_VERIFIED_REVENUE"];
const yesNo = (value: boolean) => value ? "yes" : "no";

function deriveMissingStep(readiness: R100DatabaseMirrorReadiness): string {
  if (!readiness.databaseConfigured) return "Missing step: configure DATABASE_URL in the backend environment only, then redeploy.";
  if (!readiness.schemaReady) return "Missing step: run pnpm --filter @workspace/db run push or apply lib/db/drizzle/0001_r100_state_mirror.sql, then re-check readiness.";
  if (!readiness.mirrorEnabled) return "Missing step: set GXEON_R100_DB_MIRROR_ENABLED=true in backend only, redeploy, then run safe probe.";
  if (!readiness.safeToWrite) return "Missing step: verify readiness again; writes remain blocked until database, schema, and backend flag are all green.";
  return "Ready for guarded manual actions: run safe probe, export redacted snapshot, then verify latest snapshot.";
}

export default function R100DatabaseMirrorConsolePage() {
  const [status, setStatus] = useState<R100DatabaseMirrorStatus>(() => fallbackR100DatabaseMirrorStatus());
  const [readiness, setReadiness] = useState<R100DatabaseMirrorReadiness>(() => fallbackR100DatabaseMirrorReadiness());
  const [diagnostics, setDiagnostics] = useState<R100DatabaseMirrorSchemaDiagnostics>(() => fallbackR100DatabaseMirrorSchemaDiagnostics());
  const [plan, setPlan] = useState<R100DatabaseMirrorActivationPlan>(() => fallbackR100DatabaseMirrorActivationPlan());
  const [latestSnapshot, setLatestSnapshot] = useState<string | null>(null);
  const [actionResult, setActionResult] = useState<string>("");
  const [loading, setLoading] = useState(true);

  async function refresh(signal?: AbortSignal) {
    const [nextStatus, nextReadiness, nextPlan, snapshot, nextDiagnostics] = await Promise.all([
      fetchR100DatabaseMirrorStatus(signal),
      fetchR100DatabaseMirrorReadiness(signal),
      fetchR100DatabaseMirrorActivationPlan(signal),
      fetchR100DatabaseMirrorSnapshot(signal),
      fetchR100DatabaseMirrorSchemaDiagnostics(signal),
    ]);
    setStatus(nextStatus); setReadiness(nextReadiness); setPlan(nextPlan); setLatestSnapshot(snapshot.createdAt ?? nextStatus.latestSnapshotAt); setDiagnostics(nextDiagnostics);
  }

  useEffect(() => { const controller = new AbortController(); refresh(controller.signal).finally(() => { if (!controller.signal.aborted) setLoading(false); }); return () => controller.abort(); }, []);

  async function runDiagnostics() { const result = await fetchR100DatabaseMirrorSchemaDiagnostics(); setDiagnostics(result); setActionResult(result.nextManualAction); }
  async function runDryRun() { const result = await dryRunR100DatabaseMirrorSchema(); setDiagnostics(result.diagnostics); setActionResult(`${result.status}: ${result.nextManualAction}`); }
  async function applySchema() { const result = await applyR100DatabaseMirrorSchema(); setActionResult(`${result.status}: ${result.nextManualAction}`); await refresh(); }
  async function runSmokeTest() { const result = await runR100DatabaseMirrorActivationSmokeTest(); setActionResult(`${result.status}: ${result.nextManualAction}`); await refresh(); }
  async function runProbe() { const result = await createR100DatabaseMirrorProbe(); setActionResult(result?.status ?? readiness.nextManualAction); await refresh(); }
  async function exportSnapshot() { const result = await exportR100SafeSnapshotToDatabaseMirror(); setActionResult(result?.status ?? readiness.nextManualAction); await refresh(); }

  const missingStep = deriveMissingStep(readiness);

  const cards = [
    ["database configured", yesNo(readiness.databaseConfigured)],
    ["schema ready", yesNo(readiness.schemaReady)],
    ["snapshots table", yesNo(readiness.snapshotsTableReady)],
    ["audit table", yesNo(readiness.auditEventsTableReady)],
    ["mirror enabled", yesNo(readiness.mirrorEnabled)],
    ["safe to write", yesNo(readiness.safeToWrite)],
    ["latest snapshot", latestSnapshot ?? "none"],
    ["snapshot count", String(status.snapshotCount)],
  ];

  return <main className="space-y-6 p-6 text-white"><section className="rounded-[2rem] border border-cyan-300/20 bg-gradient-to-br from-cyan-500/15 to-emerald-500/10 p-6"><p className="text-xs font-black uppercase tracking-[0.32em] text-cyan-100">Manual-first persistence mirror</p><h1 className="mt-3 text-4xl font-black">R$100 DB Mirror Activation Console P2</h1><p className="mt-2 max-w-4xl text-stone-300">Console seguro para verificar schema, explicar flags ausentes, executar probe guardado e exportar snapshot redigido. Não ativa pagamentos, não cria checkout, não emite invoice e não confirma receita de provedor.</p><div className="mt-4 flex flex-wrap gap-2">{badges.map((badge) => <Badge key={badge} variant="outline" className="border-cyan-300/30 text-cyan-100">{badge}</Badge>)}</div></section>
    <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-8">{cards.map(([label, value]) => <Card key={label} className="border-white/10 bg-[#090909]/85 text-white"><CardContent className="p-4"><p className="text-[10px] uppercase tracking-[0.24em] text-stone-500">{label}</p><p className="mt-3 break-words text-lg font-black">{value}</p></CardContent></Card>)}</section>
    <section className="grid gap-4 lg:grid-cols-[1fr_0.85fr]"><Card className="border-white/10 bg-[#090909]/85 text-white"><CardContent className="space-y-4 p-5"><h2 className="text-xl font-black">Operator actions</h2><div className="flex flex-wrap gap-2"><Button onClick={() => refresh()} className="bg-cyan-300 text-black hover:bg-cyan-200">Verificar prontidão</Button><Button variant="outline" className="border-cyan-300/30 text-cyan-100" onClick={runDiagnostics}>Ver diagnóstico de schema</Button><Button variant="outline" className="border-cyan-300/30 text-cyan-100" onClick={runDryRun}>Dry-run do schema</Button><Button variant="outline" className="border-emerald-300/30 text-emerald-100" onClick={applySchema} disabled={!diagnostics.schemaApplyEnabled || diagnostics.schemaReady}>Aplicar schema guardado</Button><Button variant="outline" className="border-emerald-300/30 text-emerald-100" onClick={runSmokeTest}>Activation smoke test</Button><Button variant="outline" className="border-emerald-300/30 text-emerald-100" onClick={runProbe} disabled={!readiness.safeToWrite}>Rodar probe seguro</Button><Button variant="outline" className="border-violet-300/30 text-violet-100" onClick={exportSnapshot} disabled={!readiness.safeToWrite}>Exportar snapshot SAFE_REDACTED</Button></div><p className="text-sm text-stone-400">Buttons rely on server-side confirmations. If the mirror is disabled or schema is missing, the backend safely rejects writes and returns the next manual action.</p>{actionResult ? <div className="rounded-2xl border border-amber-300/25 bg-amber-400/10 p-3 text-sm text-amber-100">{actionResult}</div> : null}<p className="rounded-2xl border border-amber-300/25 bg-amber-400/10 p-3 text-sm text-amber-50">{missingStep}</p><p className="rounded-2xl border border-cyan-300/20 bg-cyan-400/10 p-3 text-sm text-cyan-50">Next manual action from backend: {readiness.nextManualAction}</p></CardContent></Card>
    <Card className="border-white/10 bg-[#090909]/85 text-white"><CardContent className="p-5"><h2 className="text-xl font-black">Readiness warnings</h2><ul className="mt-3 space-y-2 text-sm text-stone-300">{readiness.warnings.map((warning) => <li key={warning}>• {warning}</li>)}</ul></CardContent></Card></section>
    <section className="grid gap-4 lg:grid-cols-2"><Card className="border-white/10 bg-[#090909]/85 text-white"><CardContent className="p-5"><h2 className="text-xl font-black">Activation checklist</h2><ol className="mt-4 space-y-3 text-sm text-stone-300">{plan.checklist.map((item, index) => <li key={item} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3"><span className="mr-2 font-black text-cyan-100">{index + 1}.</span>{item}</li>)}</ol></CardContent></Card><Card className="border-white/10 bg-[#090909]/85 text-white"><CardContent className="p-5"><h2 className="text-xl font-black">Rollback and safety</h2><ul className="mt-4 space-y-3 text-sm text-stone-300">{plan.rollback.map((item) => <li key={item}>• {item}</li>)}</ul><div className="mt-4 flex flex-wrap gap-2">{["not payment settlement", "providerVerifiedRevenueBrl=0", "realRevenueClaimedAutomatically=false", "no frontend secrets"].map((item) => <Badge key={item} variant="outline" className="border-emerald-300/25 text-emerald-100">{item}</Badge>)}</div></CardContent></Card></section><section className="grid gap-4 lg:grid-cols-2"><Card className="border-white/10 bg-[#090909]/85 text-white"><CardContent className="p-5"><h2 className="text-xl font-black">Etapa 2 — Aplicar Schema</h2><p className="mt-2 text-sm text-stone-300">Exige GXEON_R100_DB_SCHEMA_OPERATOR_APPLY_ENABLED=true no backend e action APPLY_R100_DB_MIRROR_SCHEMA_OPERATOR_APPROVED. O botão fica bloqueado quando a flag backend não confirma permissão.</p><p className="mt-3 text-sm text-cyan-100">schemaApplyEnabled: {yesNo(diagnostics.schemaApplyEnabled)}</p></CardContent></Card><Card className="border-white/10 bg-[#090909]/85 text-white"><CardContent className="p-5"><h2 className="text-xl font-black">Etapa 3 — Ativar Mirror</h2><p className="mt-2 text-sm text-stone-300">Setar GXEON_R100_DB_MIRROR_ENABLED=true apenas no backend Railway/API e redeploy. Este console não altera env automaticamente.</p></CardContent></Card></section>{loading ? <p className="text-sm text-stone-500">Loading DB mirror console...</p> : null}</main>;
}
