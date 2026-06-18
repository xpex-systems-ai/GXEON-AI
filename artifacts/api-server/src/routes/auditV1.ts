import { Router } from "express";
import { auditModuleCatalog } from "@workspace/db";

const router = Router();

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

router.get("/v1/audit/health", noStore, (_req, res) => {
  res.json({
    system: "GXEON Audit OS",
    readiness: "degraded-safe",
    databaseConfigured: Boolean(process.env["DATABASE_URL"]),
    schemaRegistered: true,
    safeMode: true,
    productionMutationEnabled: false,
  });
});

router.get("/v1/audit/modules", noStore, (_req, res) => {
  res.json({ system: "GXEON Audit OS", count: auditModuleCatalog.length, modules: auditModuleCatalog });
});

router.get("/v1/audit/schema-map", noStore, (_req, res) => {
  res.json(schemaMap);
});

export default router;
