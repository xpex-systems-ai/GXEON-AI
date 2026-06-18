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
  const apiDiagnostics = getApiBaseDiagnostics();

  useEffect(() => {
    auditOsService.missionControlV1().then((data) => { setMission(data); setApiReachable("reachable"); }).catch(() => { setMission(fallbackMission); setApiReachable("unreachable"); });
    auditOsService.schemaMapV1().then(setSchemaMap).catch(() => undefined);
  }, []);

  const health = mission.health ?? fallbackMission.health;
  const modules = mission.modules?.items ?? fallbackModules;

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
      <Panel title="Audit Cases panel" summary={`${mission.cases?.count ?? 0} cases`} action={mission.cases?.nextSafeAction} />
      <Panel title="Evidence Vault preview" summary={`${mission.evidence?.count ?? 0} evidence records`} action="Store only approved, redacted references in a future intake mission." />
      <Panel title="Score Engine preview" summary={`${mission.scores?.count ?? 0} score snapshots`} action="Scores require real case evidence before any claim." />
      <Panel title="Findings board preview" summary={`${mission.findings?.count ?? 0} findings`} action="Findings stay empty until operator-reviewed evidence exists." />
      <Panel title="Report Builder preview" summary={`${mission.reports?.count ?? 0} reports`} action="Reports are not generated automatically in this mission." />
      <Panel title="Task Engine preview" summary={`${mission.tasks?.count ?? 0} tasks`} action="No task writes. Manual operator review required." />
      <Panel title="Proposal Engine preview" summary={`${mission.proposals?.count ?? 0} proposals`} action="No customer-facing proposal is created here." />
      <Panel title="Revenue Preview panel" summary={`Estimated R$${mission.revenue?.totalEstimatedBrl ?? 0} · Confirmed R$${mission.revenue?.totalConfirmedBrl ?? 0}`} action="No fake revenue and no provider-verified claim." />
      <Panel title="Operator Review panel" summary={mission.operatorReview?.status ?? "waiting"} action={mission.operatorReview?.nextSafeAction} />
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
