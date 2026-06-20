import { Router } from "express";
import { auditModuleCatalog } from "@workspace/db";
import { bootstrapFirstInternalAuditCase, buildAuditCasePreview, createAuditCase, getAuditCaseById, getAuditCaseTimeline, getAuditSchemaDiagnostics, getAuditWriteMode, listAuditCases } from "../services/auditCaseService";
import { authorizeAuditOperator, buildEvidencePreview, buildFindingPreview, createEvidence, createFinding, getFinding, listEvidencesByCase, listEvidencesByFinding, listFindingsByCase } from "../services/auditEvidenceFindingService";

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

function validateBootstrapAuthorization(authorization: string | undefined) {
  const expected = process.env.GXEON_AUDIT_BOOTSTRAP_TOKEN;
  if (!expected) return { ok: false as const, status: 401, code: "BOOTSTRAP_TOKEN_REQUIRED", message: "Bootstrap token is not configured in the backend environment." };
  if (!authorization?.startsWith("Bearer ")) return { ok: false as const, status: 401, code: "BOOTSTRAP_TOKEN_REQUIRED", message: "Authorization bearer token is required." };
  const provided = authorization.slice("Bearer ".length).trim();
  if (!provided) return { ok: false as const, status: 401, code: "BOOTSTRAP_TOKEN_REQUIRED", message: "Authorization bearer token is required." };
  if (provided !== expected) return { ok: false as const, status: 403, code: "BOOTSTRAP_TOKEN_INVALID", message: "Bootstrap token is invalid." };
  return { ok: true as const };
}

function blockedBootstrapPayload(code: string, message: string) {
  return { system: "GXEON Audit OS", ok: false, created: false, status: "BLOCKED", code, message, caseId: null, revenueConfirmed: 0, fakeClientCreated: false, connectorWrites: false, safeMode: true };
}

const noStore = (_req: unknown, res: { setHeader(name: string, value: string): void }, next: () => void) => { res.setHeader("Cache-Control", "no-store"); next(); };

function healthPayload() {
  return {
    system: "GXEON Audit OS",
    readiness: databaseConfigured() ? "read-only-ready" : "degraded-safe",
    databaseConfigured: databaseConfigured(),
    schemaRegistered: true,
    safeMode: true,
    productionMutationEnabled: getAuditWriteMode() === "enabled" && process.env.GXEON_AUDIT_ALLOW_DB_WRITES === "true",
    intakeReadiness: { writeMode: getAuditWriteMode(), allowDbWrites: process.env.GXEON_AUDIT_ALLOW_DB_WRITES === "true", previewAvailable: true },
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

router.get("/v1/audit/schema-diagnostics", noStore, async (_req, res) => {
  const diagnostics = await getAuditSchemaDiagnostics();
  res.status(diagnostics.schemaReady ? 200 : 503).json(diagnostics);
});

router.get("/v1/audit/cases/summary", noStore, (_req, res) => res.json({ ...emptySummary("audit_cases"), writeMode: getAuditWriteMode(), nextSafeAction: getAuditWriteMode() === "enabled" ? "Create first Audit Case only with GXEON_AUDIT_ALLOW_DB_WRITES=true and schema ready." : "Create preview of first Audit Case; writes are disabled." }));
router.post("/v1/audit/intake/preview", noStore, (req, res) => {
  try { res.json({ system: "GXEON Audit OS", ok: true, preview: buildAuditCasePreview(req.body) }); }
  catch (error: any) { res.status(error.statusCode ?? 400).json({ system: "GXEON Audit OS", ok: false, code: error.code ?? "INTAKE_VALIDATION_FAILED", message: error.message }); }
});
router.post("/v1/audit/cases", noStore, async (req, res) => {
  try { const result = await createAuditCase(req.body); res.status(result.status).json(result.payload); }
  catch (error: any) { res.status(error.statusCode ?? 400).json({ system: "GXEON Audit OS", ok: false, code: error.code ?? "AUDIT_CASE_CREATE_FAILED", message: error.message }); }
});

router.post("/v1/audit/bootstrap/first-case", noStore, async (req, res) => {
  const auth = validateBootstrapAuthorization(req.get("authorization"));
  if (!auth.ok) {
    res.status(auth.status).json(blockedBootstrapPayload(auth.code, auth.message));
    return;
  }

  try {
    const result = await bootstrapFirstInternalAuditCase();
    res.status(result.status).json(result.payload);
  } catch {
    res.status(503).json(blockedBootstrapPayload("AUDIT_BOOTSTRAP_FAILED", "Audit bootstrap failed safely before any external connector or payment write."));
  }
});

router.get("/v1/audit/cases", noStore, async (_req, res) => { res.json({ system: "GXEON Audit OS", ...(await listAuditCases()) }); });
router.get("/v1/audit/cases/:caseId", noStore, async (req, res) => { const item = await getAuditCaseById(req.params.caseId); res.status(item ? 200 : 404).json({ system: "GXEON Audit OS", degradedSafe: !item, item }); });
router.get("/v1/audit/cases/:caseId/timeline", noStore, (req, res) => res.json({ system: "GXEON Audit OS", ...getAuditCaseTimeline(req.params.caseId) }));
router.get("/v1/audit/findings/summary", noStore, (_req, res) => res.json(emptySummary("audit_findings")));

router.post("/v1/audit/findings/preview", noStore, (req, res) => {
  try { res.json({ system: "GXEON Audit OS", ok: true, preview: buildFindingPreview(req.body) }); }
  catch (error: any) { res.status(error.statusCode ?? 400).json({ system: "GXEON Audit OS", ok: false, code: error.code ?? "FINDING_PREVIEW_FAILED", message: error.message }); }
});
router.post("/v1/audit/findings", noStore, async (req, res) => {
  const auth = authorizeAuditOperator(req.get("authorization"));
  if (!auth.ok) { res.status(auth.status).json({ system: "GXEON Audit OS", ok: false, code: auth.code, message: auth.message }); return; }
  try { const result = await createFinding(req.body); res.status(result.status).json({ system: "GXEON Audit OS", ...result.payload }); }
  catch (error: any) { res.status(error.statusCode ?? 400).json({ system: "GXEON Audit OS", ok: false, code: error.code ?? "AUDIT_FINDING_CREATE_FAILED", message: error.message }); }
});
router.post("/v1/audit/evidences/preview", noStore, (req, res) => {
  try { res.json({ system: "GXEON Audit OS", ok: true, preview: buildEvidencePreview(req.body) }); }
  catch (error: any) { res.status(error.statusCode ?? 400).json({ system: "GXEON Audit OS", ok: false, code: error.code ?? "EVIDENCE_PREVIEW_FAILED", message: error.message }); }
});
router.post("/v1/audit/evidences", noStore, async (req, res) => {
  const auth = authorizeAuditOperator(req.get("authorization"));
  if (!auth.ok) { res.status(auth.status).json({ system: "GXEON Audit OS", ok: false, code: auth.code, message: auth.message }); return; }
  try { const result = await createEvidence(req.body); res.status(result.status).json({ system: "GXEON Audit OS", ...result.payload }); }
  catch (error: any) { res.status(error.statusCode ?? 400).json({ system: "GXEON Audit OS", ok: false, code: error.code ?? "AUDIT_EVIDENCE_CREATE_FAILED", message: error.message }); }
});
router.get("/v1/audit/cases/:caseId/findings", noStore, async (req, res) => { const result = await listFindingsByCase(req.params.caseId); res.json({ system: "GXEON Audit OS", count: result.items.length, ...result }); });
router.get("/v1/audit/findings/:findingId", noStore, async (req, res) => { const item = await getFinding(req.params.findingId); res.status(item ? 200 : 404).json({ system: "GXEON Audit OS", item }); });
router.get("/v1/audit/cases/:caseId/evidences", noStore, async (req, res) => { const result = await listEvidencesByCase(req.params.caseId); res.json({ system: "GXEON Audit OS", count: result.items.length, ...result }); });
router.get("/v1/audit/findings/:findingId/evidences", noStore, async (req, res) => { const result = await listEvidencesByFinding(req.params.findingId); res.json({ system: "GXEON Audit OS", count: result.items.length, ...result }); });

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

router.get("/v1/audit/mission-control", noStore, async (_req, res) => {
  const cases = { ...emptySummary("audit_cases"), ...(await listAuditCases()) };
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
    operatorReview: { required: true, status: getAuditWriteMode() === "enabled" ? "intake-write-guard-ready" : "preview-only", nextSafeAction: getAuditWriteMode() === "enabled" ? "Criar primeiro Audit Case after schema readiness check." : "Criar preview de Audit Case." },
    intakeReadiness: { previewAvailable: true, writeMode: getAuditWriteMode(), allowDbWrites: process.env.GXEON_AUDIT_ALLOW_DB_WRITES === "true", databaseConfigured: databaseConfigured(), schemaRegistered: true },
  });
});

export default router;
