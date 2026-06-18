import { Router } from "express";
import { auditModuleCatalog } from "@workspace/db";

const router = Router();
const databaseConfigured = () => Boolean(process.env["DATABASE_URL"]);
const generatedAt = () => new Date().toISOString();

const connectorCatalog = [
  { key: "supabase", label: "Supabase database", status: "setup-required", mode: "read-only", writeEnabled: false },
  { key: "github", label: "GitHub connector", status: "inactive", mode: "read-only", writeEnabled: false },
  { key: "payment_provider", label: "Payment provider", status: "inactive", mode: "disabled", writeEnabled: false },
  { key: "external_scraping", label: "External scraping", status: "blocked", mode: "disabled", writeEnabled: false },
];

const emptySummary = (resource: string) => ({
  resource,
  status: databaseConfigured() ? "empty" : "degraded-safe",
  databaseConfigured: databaseConfigured(),
  readOnly: true,
  count: 0,
  items: [],
  nextSafeAction: databaseConfigured()
    ? `Create ${resource} only after an approved intake mission.`
    : "Configure DATABASE_URL and run only approved read paths before any intake mission.",
});

const schemaMap = {
  system: "GXEON Audit OS",
  sourceOfTruth: "lib/db/src/schema/audit.ts",
  safeMode: true,
  productionMigrationsExecuted: false,
  enums: ["audit_case_status", "audit_asset_type", "audit_module_key", "audit_severity", "audit_evidence_type", "audit_report_type", "audit_task_status", "audit_proposal_status", "audit_revenue_status", "audit_connector_status"],
  tables: ["audit_clients", "audit_assets", "audit_cases", "audit_modules", "audit_checklists", "audit_findings", "audit_evidences", "audit_scores", "audit_reports", "audit_tasks", "audit_proposals", "audit_revenue_events", "audit_connector_runs", "audit_operator_notes"].map((name) => ({ name, purpose: "See AUDIT_OS_SCHEMA_MAP.json for the full table contract." })),
  invariants: ["No payment provider secrets stored.", "Evidence URLs are stored as references only.", "No production migration or Supabase db push was executed."],
};
const noStore = (_req: unknown, res: { setHeader(name: string, value: string): void }, next: () => void) => { res.setHeader("Cache-Control", "no-store"); next(); };

function healthPayload() {
  return {
    system: "GXEON Audit OS",
    readiness: databaseConfigured() ? "read-only-ready" : "degraded-safe",
    databaseConfigured: databaseConfigured(),
    schemaRegistered: true,
    safeMode: true,
    productionMutationEnabled: false,
    generatedAt: generatedAt(),
  };
}

router.get("/v1/audit/health", noStore, (_req, res) => {
  res.json(healthPayload());
});

router.get("/v1/audit/modules", noStore, (_req, res) => {
  res.json({ system: "GXEON Audit OS", count: auditModuleCatalog.length, modules: auditModuleCatalog, readOnly: true });
});

router.get("/v1/audit/schema-map", noStore, (_req, res) => {
  res.json(schemaMap);
});

router.get("/v1/audit/cases/summary", noStore, (_req, res) => res.json(emptySummary("audit_cases")));
router.get("/v1/audit/findings/summary", noStore, (_req, res) => res.json(emptySummary("audit_findings")));
router.get("/v1/audit/reports/summary", noStore, (_req, res) => res.json(emptySummary("audit_reports")));

router.get("/v1/audit/connectors/status", noStore, (_req, res) => {
  res.json({
    system: "GXEON Audit OS",
    status: "read-only",
    databaseConfigured: databaseConfigured(),
    productionMutationEnabled: false,
    connectors: connectorCatalog,
    nextSafeAction: "Keep connectors inactive until a dedicated connector activation mission is approved.",
  });
});

router.get("/v1/audit/mission-control", noStore, (_req, res) => {
  const cases = emptySummary("audit_cases");
  const findings = emptySummary("audit_findings");
  const reports = emptySummary("audit_reports");
  const connectors = { status: "read-only", connectors: connectorCatalog };
  res.json({
    system: "GXEON Audit OS",
    mode: "INTERNAL_OPERATOR_READ_ONLY",
    generatedAt: generatedAt(),
    health: healthPayload(),
    modules: { count: auditModuleCatalog.length, items: auditModuleCatalog },
    cases,
    evidence: emptySummary("audit_evidences"),
    scores: emptySummary("audit_scores"),
    findings,
    reports,
    tasks: emptySummary("audit_tasks"),
    proposals: emptySummary("audit_proposals"),
    revenue: { ...emptySummary("audit_revenue_events"), totalEstimatedBrl: 0, totalConfirmedBrl: 0, providerVerifiedBrl: 0, note: "No revenue is claimed without real accepted/paid events." },
    connectors,
    operatorReview: { required: true, status: "waiting-for-approved-intake", nextSafeAction: "Review readiness, then run MISSION_003_AUDIT_OS_INTAKE_AND_CASES." },
  });
});

export default router;
