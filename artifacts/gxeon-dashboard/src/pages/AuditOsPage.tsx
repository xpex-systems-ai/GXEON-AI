import { useEffect, useState } from "react";
import { auditOsService } from "@/services/auditOsService";
import { getApiBaseDiagnostics } from "@/services/apiBase";

const requiredSections = ["Audit Cases placeholder", "Official modules", "Evidence-first rule", "Score engine preview", "Findings preview", "Report builder preview", "Proposal and revenue preview", "Connector status placeholder"];
const fallbackModules = ["website_audit", "ecommerce_audit", "ux_checkout_audit", "seo_basic_audit", "tracking_pixel_audit", "security_basic_audit", "github_repository_audit", "codebase_audit", "supabase_database_audit", "deployment_audit", "api_backend_audit", "ai_automation_audit", "business_offer_audit", "funnel_audit", "content_landing_page_audit"].map((key) => ({ key, name: key.replaceAll("_", " "), description: "Static degraded-safe module placeholder.", category: "safe_mode", defaultWeight: 1, checklistItems: [], riskSignals: [], recommendedEvidenceTypes: [], safeMode: true }));

export default function AuditOsPage() {
  const [health, setHealth] = useState<any>();
  const [modules, setModules] = useState<any[]>(fallbackModules);
  const [schemaMap, setSchemaMap] = useState<any>();
  const apiDiagnostics = getApiBaseDiagnostics();

  useEffect(() => {
    auditOsService.healthV1().then(setHealth).catch(() => setHealth({ readiness: "degraded-safe", databaseConfigured: false, schemaRegistered: true, safeMode: true }));
    auditOsService.modulesV1().then((r) => setModules(r.modules)).catch(() => undefined);
    auditOsService.schemaMapV1().then(setSchemaMap).catch(() => undefined);
  }, []);

  return <main className="space-y-6 p-6 text-white">
    <section className="rounded-[2rem] border border-amber-300/25 bg-gradient-to-br from-amber-500/15 via-cyan-500/10 to-black/30 p-7">
      <p className="text-xs font-black uppercase tracking-[0.35em] text-amber-200">Internal placeholder · degraded-safe · read-only</p>
      <h1 className="mt-3 text-5xl font-black">Audit OS Mission Control</h1>
      <p className="mt-3 max-w-4xl text-lg text-stone-200">Foundation screen for GXEON Audit OS. It shows static module inventory, evidence-first operating rules, scoring/reporting previews, and connector safety status without login, payments, writes, or production migrations.</p>
      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <Badge label="DB configured" value={health?.databaseConfigured ? "yes" : "no"} />
        <Badge label="Schema registered" value={health?.schemaRegistered ? "yes" : "no"} />
        <Badge label="Safe mode" value={health?.safeMode ? "on" : "unknown"} />
        <Badge label="Readiness" value={health?.readiness ?? "degraded-safe"} />
      </div>
    </section>

    {!apiDiagnostics.configured ? <section className="rounded-3xl border border-amber-300/30 bg-amber-500/10 p-5">
      <p className="text-xs font-black uppercase tracking-[0.25em] text-amber-200">Runtime binding warning · {apiDiagnostics.warningCode}</p>
      <h2 className="mt-2 text-2xl font-black text-amber-50">API base URL is not configured</h2>
      <p className="mt-2 text-sm text-amber-50/90">Set <code className="rounded bg-black/30 px-1 py-0.5">VITE_GXEON_API_BASE_URL</code> to the Railway API origin. Audit OS remains degraded-safe and read-only using static fallbacks until the backend responds.</p>
      <p className="mt-2 text-xs text-amber-100">Expected value: https://gxeon-api-server-production.up.railway.app</p>
    </section> : null}

    <section className="grid gap-4 md:grid-cols-4">{requiredSections.map((section) => <article key={section} className="rounded-3xl border border-white/10 bg-white/[0.04] p-4"><h2 className="font-black text-cyan-100">{section}</h2><p className="mt-2 text-sm text-stone-300">Prepared for Mission Control activation; all actions remain read-only/manual-first in this mission.</p></article>)}</section>

    <section className="rounded-3xl border border-amber-300/20 bg-amber-400/10 p-5"><h2 className="text-2xl font-black">Official modules</h2><div className="mt-4 grid gap-3 md:grid-cols-3">{modules.map((m) => <article key={m.key} className="rounded-2xl bg-black/30 p-4"><p className="text-xs font-black uppercase tracking-[0.2em] text-amber-200">{m.category} · weight {m.defaultWeight}</p><h3 className="mt-2 text-lg font-black">{m.name}</h3><p className="mt-2 text-sm text-stone-300">{m.description}</p><p className="mt-3 text-xs text-cyan-100">Evidence: {(m.recommendedEvidenceTypes ?? []).join(", ") || "operator_note"}</p></article>)}</div></section>

    <section className="grid gap-4 lg:grid-cols-3"><Info title="Evidence-first rule" text="Findings must be backed by a case or finding evidence reference. URLs are references only; screenshots/configs must be redacted before storage."/><Info title="Score engine preview" text="Scores are case-scoped snapshots by module and rationale. They do not claim customer revenue or automatic validation."/><Info title="Proposal and revenue preview" text="Revenue events intentionally separate estimated, proposed, accepted, paid, lost, refunded and cancelled states with no provider secrets."/></section>

    <section className="rounded-3xl border border-emerald-300/20 bg-emerald-400/10 p-5"><h2 className="text-2xl font-black">Schema map readiness</h2><p className="mt-2 text-sm text-emerald-50">{schemaMap ? `${schemaMap.tables.length} tables and ${schemaMap.enums.length} enums exposed through degraded-safe schema-map route.` : "Static fallback active until API responds."}</p></section>
  </main>;
}
function Badge({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl border border-white/10 bg-black/30 p-3"><p className="text-xs uppercase tracking-[0.2em] text-stone-400">{label}</p><p className="text-xl font-black text-amber-100">{value}</p></div>; }
function Info({ title, text }: { title: string; text: string }) { return <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5"><h2 className="text-xl font-black text-white">{title}</h2><p className="mt-2 text-sm text-stone-300">{text}</p></div>; }
