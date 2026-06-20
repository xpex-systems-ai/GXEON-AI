import { useEffect, useState } from "react";
import { auditOsService } from "@/services/auditOsService";
import { getApiBaseDiagnostics } from "@/services/apiBase";

const fallbackModules = ["website_audit", "ecommerce_audit", "ux_checkout_audit", "seo_basic_audit", "tracking_pixel_audit", "security_basic_audit", "github_repository_audit", "codebase_audit", "supabase_database_audit", "deployment_audit", "api_backend_audit", "ai_automation_audit", "business_offer_audit", "funnel_audit", "content_landing_page_audit"].map((key) => ({ key, name: key.replaceAll("_", " "), description: "Static degraded-safe module placeholder from official Audit OS catalog key.", category: "safe_mode", defaultWeight: 1, checklistItems: [], riskSignals: [], recommendedEvidenceTypes: [], safeMode: true }));
const empty = (resource: string) => ({ resource, status: "degraded-safe", count: 0, items: [], nextSafeAction: "Wait for approved intake mission before creating records." });
const fallbackMission = { mode: "INTERNAL_OPERATOR_READ_ONLY", health: { readiness: "degraded-safe", databaseConfigured: false, schemaRegistered: true, safeMode: true, productionMutationEnabled: false }, modules: { count: fallbackModules.length, items: fallbackModules }, cases: empty("audit_cases"), evidence: empty("audit_evidences"), scores: empty("audit_scores"), findings: empty("audit_findings"), reports: empty("audit_reports"), tasks: empty("audit_tasks"), proposals: empty("audit_proposals"), revenue: { ...empty("audit_revenue_events"), totalEstimatedBrl: 0, totalConfirmedBrl: 0, providerVerifiedBrl: 0 }, connectors: { status: "read-only", connectors: [] }, operatorReview: { status: "waiting-for-approved-intake", nextSafeAction: "Review readiness, then run MISSION_003_AUDIT_OS_INTAKE_AND_CASES." } };

export default function AuditOsPage() {
  const [mission, setMission] = useState<any>(fallbackMission);
  const [schemaMap, setSchemaMap] = useState<any>();
  const [apiReachable, setApiReachable] = useState("checking");
  const [showIntake, setShowIntake] = useState(false);
  const [intake, setIntake] = useState({ assetName: "", assetUrl: "", assetType: "website", auditGoal: "", selectedModules: ["website_audit"], priority: "medium", source: "operator_manual", operatorNotes: "" });
  const [preview, setPreview] = useState<any>();
  const [caseList, setCaseList] = useState<any>();
  const [intakeMessage, setIntakeMessage] = useState("");
  const [bootstrapToken, setBootstrapToken] = useState("");
  const [bootstrapDiagnostics, setBootstrapDiagnostics] = useState<any>();
  const [bootstrapResult, setBootstrapResult] = useState<any>();
  const [verifyResult, setVerifyResult] = useState<any>();
  const [operatorToken, setOperatorToken] = useState("");
  const [findingDraft, setFindingDraft] = useState({ moduleKey: "supabase_database_audit", title: "Audit OS bootstrap concluído com provider Supabase REST", severity: "INFO", summary: "Primeiro caso interno confirmado no Mission Control sem cliente falso, sem receita falsa e sem escrita em conectores externos.", recommendation: "Manter fluxo manual-first e registrar evidências redigidas antes de qualquer relatório.", metadata: { mission: "MISSION_005_AUDIT_OS_EVIDENCE_AND_FINDINGS" } });
  const [evidenceDraft, setEvidenceDraft] = useState({ type: "OPERATOR_NOTE", title: "Print do Mission Control com 1 caso confirmado", referenceUrl: "", redactedText: "Operador confirmou manualmente Mission Control com 1 caso interno GXEON-AI.", metadata: { manual_first: true, no_scraping: true } });
  const [findingPreview, setFindingPreview] = useState<any>();
  const [evidencePreview, setEvidencePreview] = useState<any>();
  const [evidenceFindingMessage, setEvidenceFindingMessage] = useState("");
  const [caseEvidenceFindings, setCaseEvidenceFindings] = useState<any>({ findings: { count: 0, items: [] }, evidences: { count: 0, items: [] } });
  const apiDiagnostics = getApiBaseDiagnostics();

  useEffect(() => {
    auditOsService.missionControlV1().then((data) => { setMission(data); setApiReachable("reachable"); }).catch(() => { setMission(fallbackMission); setApiReachable("unreachable"); });
    auditOsService.schemaMapV1().then(setSchemaMap).catch(() => undefined);
    auditOsService.casesV1().then(setCaseList).catch(() => setCaseList({ degradedSafe: true, count: 0, items: [] }));
  }, []);

  const health = mission.health ?? fallbackMission.health;
  const modules = mission.modules?.items ?? fallbackModules;
  const writeMode = mission.intakeReadiness?.writeMode ?? mission.health?.intakeReadiness?.writeMode ?? "disabled";
  const submitPreview = async () => { setIntakeMessage(""); try { const data = await auditOsService.intakePreviewV1(intake); setPreview(data.preview); } catch (error: any) { setIntakeMessage(error.message); } };
  const submitCreate = async () => { setIntakeMessage(""); try { const data = await auditOsService.createCaseV1(intake); setPreview(data.preview); setIntakeMessage(data.message ?? "Preview generated; write may be disabled."); } catch (error: any) { setIntakeMessage(error.message); } };
  const runBootstrapDiagnostics = async () => { setBootstrapResult(undefined); const data = await auditOsService.schemaDiagnosticsV1(); setBootstrapDiagnostics(data); };
  const runFirstCaseBootstrap = async () => { setBootstrapResult(undefined); const data = await auditOsService.bootstrapFirstCaseV1(bootstrapToken); setBootstrapResult(data); };
  const verifyFirstCase = async () => { const [cases, missionControl] = await Promise.all([auditOsService.casesV1(), auditOsService.missionControlV1()]); setCaseList(cases); setMission(missionControl); setVerifyResult({ cases, missionControl }); };
  const bootstrapAllowed = Boolean(bootstrapDiagnostics?.schemaReady || (bootstrapDiagnostics?.activeProvider === "supabase_rest" && (bootstrapDiagnostics?.missingTables?.length ?? 1) === 0));
  const selectedCase = caseList?.items?.[0] ?? mission.cases?.items?.[0];
  const selectedCaseId = selectedCase?.id;
  const refreshEvidenceFindings = async () => { if (!selectedCaseId) return; const [findings, evidences] = await Promise.all([auditOsService.caseFindingsV1(selectedCaseId), auditOsService.caseEvidencesV1(selectedCaseId)]); setCaseEvidenceFindings({ findings, evidences }); };
  useEffect(() => { if (selectedCaseId) refreshEvidenceFindings().catch(() => undefined); }, [selectedCaseId]);
  const withCase = (draft: any) => ({ ...draft, caseId: selectedCaseId });
  const runFindingPreview = async () => { setEvidenceFindingMessage(""); try { setFindingPreview((await auditOsService.findingPreviewV1(withCase(findingDraft))).preview); } catch (error: any) { setEvidenceFindingMessage(error.message); } };
  const saveFinding = async () => { setEvidenceFindingMessage(""); try { const data = await auditOsService.createFindingV1(withCase(findingDraft), operatorToken); setEvidenceFindingMessage(`${data.code ?? "OK"} · findingId ${data.findingId ?? "none"}`); await refreshEvidenceFindings(); } catch (error: any) { setEvidenceFindingMessage(error.message); } };
  const runEvidencePreview = async () => { setEvidenceFindingMessage(""); try { setEvidencePreview((await auditOsService.evidencePreviewV1(withCase(evidenceDraft))).preview); } catch (error: any) { setEvidenceFindingMessage(error.message); } };
  const saveEvidence = async () => { setEvidenceFindingMessage(""); try { const data = await auditOsService.createEvidenceV1(withCase(evidenceDraft), operatorToken); setEvidenceFindingMessage(`${data.code ?? "OK"} · evidenceId ${data.evidenceId ?? "none"}`); await refreshEvidenceFindings(); } catch (error: any) { setEvidenceFindingMessage(error.message); } };

  return <main className="min-h-screen space-y-6 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,.18),transparent_30%),radial-gradient(circle_at_top_right,rgba(34,211,238,.12),transparent_34%),#05060a] p-6 text-white">
    <section className="rounded-[2rem] border border-amber-300/25 bg-gradient-to-br from-amber-500/15 via-cyan-500/10 to-black/30 p-7 shadow-2xl shadow-cyan-950/30">
      <p className="text-xs font-black uppercase tracking-[0.35em] text-amber-200">Internal operator mode · read-only · degraded-safe</p>
      <h1 className="mt-3 text-5xl font-black">Audit OS Mission Control</h1>
      <p className="mt-3 max-w-5xl text-lg text-stone-200">Operational cockpit for GXEON Audit OS. It displays readiness, cases, modules, evidence, scores, findings, reports, proposals, revenue preview, and connector status without writes, migrations, external actions, fake clients, or fake revenue.</p>
      <div className="mt-5 grid gap-3 md:grid-cols-5">
        <Badge label="API" value={apiReachable} tone={apiReachable === "reachable" ? "green" : "amber"} />
        <Badge label="Database" value={health.databaseConfigured ? "configured" : "missing"} />
        <Badge label="Schema" value={health.schemaRegistered ? "registered" : "unknown"} tone="cyan" />
        <Badge label="Safe mode" value={health.safeMode ? "on" : "unknown"} tone="green" />
        <Badge label="Connectors" value={mission.connectors?.status ?? "read-only"} tone="cyan" />
      </div>
    </section>

    <section className="grid gap-4 lg:grid-cols-5">
      <Diagnostic title="VITE_GXEON_API_BASE_URL" value={apiDiagnostics.configured ? apiDiagnostics.baseUrl : "missing · same-origin fallback"} />
      <Diagnostic title="API reachability" value={apiReachable} />
      <Diagnostic title="DB configured" value={health.databaseConfigured ? "yes" : "no · empty operational state"} />
      <Diagnostic title="Production mutation" value={health.productionMutationEnabled ? "enabled" : "disabled"} />
      <Diagnostic title="Runtime mode" value={mission.mode ?? "INTERNAL_OPERATOR_READ_ONLY"} />
    </section>

    <section className="grid gap-4 lg:grid-cols-3">
      <Panel title="Audit Cases panel" summary={`${caseList?.count ?? mission.cases?.count ?? 0} cases`} action={mission.cases?.nextSafeAction} />
      <Panel title="Evidence Vault preview" summary={`${mission.evidence?.count ?? 0} evidence records`} action="Store only approved, redacted references in a future intake mission." />
      <Panel title="Score Engine preview" summary={`${mission.scores?.count ?? 0} score snapshots`} action="Scores require real case evidence before any claim." />
      <Panel title="Findings board preview" summary={`${mission.findings?.count ?? 0} findings`} action="Findings stay empty until operator-reviewed evidence exists." />
      <Panel title="Report Builder preview" summary={`${mission.reports?.count ?? 0} reports`} action="Reports are not generated automatically in this mission." />
      <Panel title="Task Engine preview" summary={`${mission.tasks?.count ?? 0} tasks`} action="No task writes. Manual operator review required." />
      <Panel title="Proposal Engine preview" summary={`${mission.proposals?.count ?? 0} proposals`} action="No customer-facing proposal is created here." />
      <Panel title="Revenue Preview panel" summary={`Estimated R$${mission.revenue?.totalEstimatedBrl ?? 0} · Confirmed R$${mission.revenue?.totalConfirmedBrl ?? 0}`} action="No fake revenue and no provider-verified claim." />
      <Panel title="Operator Review panel" summary={mission.operatorReview?.status ?? "waiting"} action={mission.operatorReview?.nextSafeAction} />
    </section>


    <section className="rounded-3xl border border-cyan-300/25 bg-cyan-400/10 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-100">Operator-only · no terminal</p><h2 className="text-2xl font-black">Bootstrap sem terminal</h2><p className="mt-2 text-sm text-stone-200">Cole o token temporariamente apenas em memória. O painel não usa localStorage, sessionStorage, cookies nem imprime o token.</p></div><Badge label="Provider" value={bootstrapDiagnostics?.activeProvider ?? "not checked"} tone="cyan" /></div>
      <input className="mt-4 w-full rounded-xl bg-black/40 p-3" type="password" autoComplete="off" placeholder="GXEON_AUDIT_BOOTSTRAP_TOKEN temporário" value={bootstrapToken} onChange={(e) => setBootstrapToken(e.target.value)} />
      <div className="mt-4 flex flex-wrap gap-3">
        <button onClick={runBootstrapDiagnostics} className="rounded-2xl border border-cyan-200 px-5 py-3 font-black text-cyan-100">1. Rodar diagnóstico</button>
        <button disabled={!bootstrapAllowed || !bootstrapToken} onClick={runFirstCaseBootstrap} className="rounded-2xl border border-emerald-200 px-5 py-3 font-black text-emerald-100 disabled:cursor-not-allowed disabled:opacity-40">2. Criar primeiro caso</button>
        <button onClick={verifyFirstCase} className="rounded-2xl border border-amber-200 px-5 py-3 font-black text-amber-100">3. Verificar caso</button>
      </div>
      {bootstrapDiagnostics && <div className="mt-4 rounded-2xl bg-black/30 p-4 text-sm"><p className="font-black text-cyan-100">schemaReady: {String(bootstrapDiagnostics.schemaReady)} · activeProvider: {bootstrapDiagnostics.activeProvider ?? "none"} · code: {bootstrapDiagnostics.code ?? "READY"}</p><p className="mt-2 text-emerald-100">foundTables: {(bootstrapDiagnostics.foundTables ?? []).join(", ") || "none"}</p><p className="text-amber-100">missingTables: {(bootstrapDiagnostics.missingTables ?? []).join(", ") || "none"}</p></div>}
      {bootstrapResult && <div className={`mt-4 rounded-2xl p-4 text-sm ${bootstrapResult.status === "CREATED" || bootstrapResult.status === "ALREADY_EXISTS" ? "bg-emerald-500/15 text-emerald-100" : "bg-amber-500/15 text-amber-100"}`}><p className="font-black">{bootstrapResult.status} · {bootstrapResult.code ?? "READY"}</p><p>caseId: {bootstrapResult.caseId ?? "none"} · fakeClientCreated: {String(bootstrapResult.fakeClientCreated)} · connectorWrites: {String(bootstrapResult.connectorWrites)} · revenueConfirmed: {bootstrapResult.revenueConfirmed}</p>{bootstrapResult.status === "BLOCKED" && <p className="mt-2">Próxima ação: rode diagnóstico, confirme tabelas acessíveis e tente novamente com token válido.</p>}</div>}
      {verifyResult && <p className="mt-4 rounded-2xl bg-black/30 p-4 text-sm text-emerald-100">Verificação concluída: {verifyResult.cases?.count ?? 0} casos retornados e Mission Control atualizado.</p>}
      {(bootstrapResult?.status === "CREATED" || bootstrapResult?.status === "ALREADY_EXISTS") && <ul className="mt-4 list-disc pl-6 text-sm text-emerald-100"><li>Depois do sucesso: set GXEON_AUDIT_WRITE_MODE=preview_only.</li><li>Set GXEON_AUDIT_ALLOW_DB_WRITES=false.</li><li>Rotacionar ou remover GXEON_AUDIT_BOOTSTRAP_TOKEN.</li></ul>}
    </section>


    <section className="rounded-3xl border border-fuchsia-300/25 bg-fuchsia-400/10 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.25em] text-fuchsia-100">Evidence + Findings · manual-first</p><h2 className="text-2xl font-black">Camada oficial de Evidências + Achados</h2><p className="mt-2 text-sm text-stone-200">Sem scraping, sem secrets, sem pagamento e sem conector externo. O token de operador fica somente em memória.</p></div><Badge label="Case" value={selectedCaseId ? "confirmed" : "missing"} tone={selectedCaseId ? "green" : "amber"} /></div>
      <div className="mt-4 grid gap-3 md:grid-cols-3"><Panel title="Primeiro Audit Case" summary={selectedCase?.title ?? "Aguardando caso"} action={selectedCaseId ?? "GET /api/v1/audit/cases"} /><Panel title="Findings" summary={`${caseEvidenceFindings.findings?.count ?? 0} achados`} action="Read-only count from active provider." /><Panel title="Evidências" summary={`${caseEvidenceFindings.evidences?.count ?? 0} evidências`} action="Reference-only; no fetch/download." /></div>
      <input className="mt-4 w-full rounded-xl bg-black/40 p-3" type="password" autoComplete="off" placeholder="GXEON_AUDIT_OPERATOR_TOKEN temporário (memória apenas)" value={operatorToken} onChange={(e) => setOperatorToken(e.target.value)} />
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-black/25 p-4"><h3 className="font-black text-fuchsia-100">Baseline achado</h3><input className="mt-3 w-full rounded-xl bg-black/40 p-3" value={findingDraft.title} onChange={(e) => setFindingDraft({ ...findingDraft, title: e.target.value })} /><textarea className="mt-3 w-full rounded-xl bg-black/40 p-3" value={findingDraft.summary} onChange={(e) => setFindingDraft({ ...findingDraft, summary: e.target.value })} /><div className="mt-3 flex flex-wrap gap-3"><button disabled={!selectedCaseId} onClick={runFindingPreview} className="rounded-2xl border border-cyan-200 px-5 py-3 font-black text-cyan-100 disabled:opacity-40">Criar prévia de achado</button><button disabled={!selectedCaseId || !operatorToken} onClick={saveFinding} className="rounded-2xl border border-emerald-200 px-5 py-3 font-black text-emerald-100 disabled:opacity-40">Salvar achado</button></div>{findingPreview && <pre className="mt-3 max-h-48 overflow-auto rounded-xl bg-black/40 p-3 text-xs">{JSON.stringify(findingPreview, null, 2)}</pre>}</div>
        <div className="rounded-2xl border border-white/10 bg-black/25 p-4"><h3 className="font-black text-fuchsia-100">Baseline evidência</h3><input className="mt-3 w-full rounded-xl bg-black/40 p-3" value={evidenceDraft.title} onChange={(e) => setEvidenceDraft({ ...evidenceDraft, title: e.target.value })} /><textarea className="mt-3 w-full rounded-xl bg-black/40 p-3" value={evidenceDraft.redactedText} onChange={(e) => setEvidenceDraft({ ...evidenceDraft, redactedText: e.target.value })} /><div className="mt-3 flex flex-wrap gap-3"><button disabled={!selectedCaseId} onClick={runEvidencePreview} className="rounded-2xl border border-cyan-200 px-5 py-3 font-black text-cyan-100 disabled:opacity-40">Criar prévia de evidência</button><button disabled={!selectedCaseId || !operatorToken} onClick={saveEvidence} className="rounded-2xl border border-emerald-200 px-5 py-3 font-black text-emerald-100 disabled:opacity-40">Salvar evidência</button></div>{evidencePreview && <pre className="mt-3 max-h-48 overflow-auto rounded-xl bg-black/40 p-3 text-xs">{JSON.stringify(evidencePreview, null, 2)}</pre>}</div>
      </div>
      {evidenceFindingMessage && <p className="mt-4 rounded-2xl bg-black/30 p-4 text-sm text-amber-100">{evidenceFindingMessage.includes("WRITE_DISABLED") ? "Bloqueado: flags de escrita desativadas (WRITE_DISABLED). " : ""}{evidenceFindingMessage}</p>}
      {((caseEvidenceFindings.findings?.count ?? 0) > 0 || (caseEvidenceFindings.evidences?.count ?? 0) > 0) && <ul className="mt-4 list-disc pl-6 text-sm text-emerald-100"><li>Sucesso: primeiro achado/evidência registrado no provider ativo.</li><li>Checklist: set GXEON_AUDIT_WRITE_MODE=preview_only.</li><li>Checklist: set GXEON_AUDIT_ALLOW_DB_WRITES=false.</li><li>Rotacionar/remover token temporário. Não alterar Railway automaticamente.</li></ul>}
    </section>

    <section className="rounded-3xl border border-emerald-300/20 bg-emerald-400/10 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-2xl font-black">Audit Case Intake</h2><p className="mt-1 text-sm text-emerald-100">Operator-only preview-first flow. Write mode: <b>{writeMode}</b>.</p></div><button onClick={() => setShowIntake(!showIntake)} className="rounded-2xl bg-amber-300 px-5 py-3 font-black text-black">Novo Audit Case</button></div>
      <AuditWriteModeWarning writeMode={writeMode} />
      {showIntake && <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <input className="rounded-xl bg-black/40 p-3" placeholder="Asset name" value={intake.assetName} onChange={(e) => setIntake({ ...intake, assetName: e.target.value })} />
        <input className="rounded-xl bg-black/40 p-3" placeholder="URL or repository reference" value={intake.assetUrl} onChange={(e) => setIntake({ ...intake, assetUrl: e.target.value })} />
        <select className="rounded-xl bg-black/40 p-3" value={intake.assetType} onChange={(e) => setIntake({ ...intake, assetType: e.target.value })}>{["website", "ecommerce", "landing_page", "github_repository", "codebase", "supabase_project", "deployment", "api_backend", "business_funnel", "content_page", "other"].map((type) => <option key={type}>{type}</option>)}</select>
        <select className="rounded-xl bg-black/40 p-3" value={intake.priority} onChange={(e) => setIntake({ ...intake, priority: e.target.value })}>{["low", "medium", "high", "critical"].map((priority) => <option key={priority}>{priority}</option>)}</select>
        <textarea className="rounded-xl bg-black/40 p-3 lg:col-span-2" placeholder="Audit goal" value={intake.auditGoal} onChange={(e) => setIntake({ ...intake, auditGoal: e.target.value })} />
        <AuditModuleSelector modules={modules} selected={intake.selectedModules} onChange={(selectedModules: string[]) => setIntake({ ...intake, selectedModules })} />
        <textarea className="rounded-xl bg-black/40 p-3 lg:col-span-2" placeholder="Operator notes (no secrets, passwords, tokens, DATABASE_URL, service_role)" value={intake.operatorNotes} onChange={(e) => setIntake({ ...intake, operatorNotes: e.target.value })} />
        <div className="flex gap-3"><button onClick={submitPreview} className="rounded-2xl border border-cyan-200 px-5 py-3 font-black text-cyan-100">Preview</button><button onClick={submitCreate} className="rounded-2xl border border-amber-200 px-5 py-3 font-black text-amber-100">Save guarded</button></div>
        {intakeMessage && <p className="rounded-xl bg-black/40 p-3 text-sm text-amber-100">{intakeMessage}</p>}
      </div>}
      {preview && <AuditCasePreviewCard preview={preview} />}
      <AuditCaseListPanel list={caseList} />
    </section>

    <section className="rounded-3xl border border-amber-300/20 bg-amber-400/10 p-5"><h2 className="text-2xl font-black">Official Modules panel</h2><div className="mt-4 grid gap-3 md:grid-cols-3">{modules.map((m: any) => <article key={m.key} className="rounded-2xl border border-white/10 bg-black/35 p-4"><p className="text-xs font-black uppercase tracking-[0.2em] text-amber-200">{m.category} · weight {m.defaultWeight}</p><h3 className="mt-2 text-lg font-black capitalize">{m.name}</h3><p className="mt-2 text-sm text-stone-300">{m.description}</p><p className="mt-3 text-xs text-cyan-100">Evidence: {(m.recommendedEvidenceTypes ?? []).join(", ") || "operator_note"}</p></article>)}</div></section>

    <section className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-3xl border border-cyan-300/20 bg-cyan-400/10 p-5"><h2 className="text-2xl font-black">Connector Status panel</h2><div className="mt-4 grid gap-3">{(mission.connectors?.connectors ?? []).map((c: any) => <div key={c.key} className="rounded-2xl bg-black/30 p-4"><p className="font-black text-cyan-100">{c.label}</p><p className="text-sm text-stone-300">{c.status} · {c.mode} · writes {c.writeEnabled ? "enabled" : "disabled"}</p></div>)}</div></div>
      <div className="rounded-3xl border border-emerald-300/20 bg-emerald-400/10 p-5"><h2 className="text-2xl font-black">Next Safe Action panel</h2><p className="mt-3 text-stone-100">Review this Mission Control state, verify the API binding, then proceed only with <b>MISSION_003_AUDIT_OS_INTAKE_AND_CASES</b>. Do not run migrations, db push, connector writes, scraping, or production activation.</p><p className="mt-4 text-sm text-emerald-100">Schema map: {schemaMap ? `${schemaMap.tables.length} tables · ${schemaMap.enums.length} enums` : "waiting for API or static fallback"}</p></div>
    </section>
  </main>;
}
function Badge({ label, value, tone = "amber" }: { label: string; value: string; tone?: "amber" | "green" | "cyan" }) { const color = tone === "green" ? "text-emerald-100" : tone === "cyan" ? "text-cyan-100" : "text-amber-100"; return <div className="rounded-2xl border border-white/10 bg-black/35 p-3"><p className="text-xs uppercase tracking-[0.2em] text-stone-400">{label}</p><p className={`text-xl font-black ${color}`}>{value}</p></div>; }
function Diagnostic({ title, value }: { title: string; value: string }) { return <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-4"><p className="text-xs font-black uppercase tracking-[0.2em] text-stone-400">{title}</p><p className="mt-2 break-words text-sm font-bold text-stone-100">{value}</p></article>; }
function Panel({ title, summary, action }: { title: string; summary: string; action?: string }) { return <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-5"><h2 className="text-xl font-black text-white">{title}</h2><p className="mt-2 text-2xl font-black text-amber-100">{summary}</p><p className="mt-2 text-sm text-stone-300">{action}</p></article>; }

function AuditWriteModeWarning({ writeMode }: { writeMode: string }) { return <p className="mt-3 rounded-2xl border border-amber-200/30 bg-black/30 p-3 text-sm text-amber-100">{writeMode === "enabled" ? "Writes still require GXEON_AUDIT_ALLOW_DB_WRITES=true and schema readiness." : "Writes are disabled. Preview is available and no case will be saved."}</p>; }
function AuditModuleSelector({ modules, selected, onChange }: { modules: any[]; selected: string[]; onChange: (value: string[]) => void }) { return <div className="lg:col-span-2 grid gap-2 md:grid-cols-3">{modules.map((m) => <label key={m.key} className="rounded-xl bg-black/30 p-3 text-sm"><input type="checkbox" checked={selected.includes(m.key)} onChange={(e) => onChange(e.target.checked ? [...selected, m.key] : selected.filter((key) => key !== m.key))} /> <span className="font-bold text-cyan-100">{m.name}</span></label>)}</div>; }
function AuditCasePreviewCard({ preview }: { preview: any }) { return <article className="mt-4 rounded-2xl border border-cyan-200/30 bg-black/35 p-4"><p className="text-xs uppercase tracking-[0.2em] text-cyan-100">Preview · not saved</p><h3 className="mt-2 text-xl font-black">{preview.caseTitle}</h3><p className="mt-2 text-sm text-stone-300">Status inicial: {preview.initialStatus} · Modules: {preview.selectedModules?.map((m: any) => m.key).join(", ")}</p><p className="mt-2 text-sm text-amber-100">{preview.nextSafeAction}</p></article>; }
function AuditCaseListPanel({ list }: { list: any }) { return <div className="mt-4 rounded-2xl border border-white/10 bg-black/25 p-4"><h3 className="font-black">Audit Cases list</h3>{(list?.items?.length ?? 0) === 0 ? <p className="mt-2 text-sm text-stone-300">No audit cases found. Degraded-safe empty state is active.</p> : list.items.map((item: any) => <p key={item.id} className="mt-2 text-sm">{item.title}</p>)}</div>; }
