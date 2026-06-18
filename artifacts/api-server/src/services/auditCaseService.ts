import { eq, sql } from "drizzle-orm";
import { auditCaseIntakeRequestSchema, type AuditCaseIntakeRequest } from "@workspace/api-zod";
import { auditAssets, auditCases, auditClients, auditModuleCatalog, auditOperatorNotes, getDb, isDatabaseConfigured } from "@workspace/db";

const writeModes = ["disabled", "preview_only", "enabled"] as const;
type WriteMode = (typeof writeModes)[number];

export function getAuditWriteMode(): WriteMode {
  const value = process.env.GXEON_AUDIT_WRITE_MODE;
  return writeModes.includes(value as WriteMode) ? (value as WriteMode) : "disabled";
}

export function detectPotentialSecrets(text = "") {
  const patterns = [/service_role/i, /DATABASE_URL/i, /postgres(?:ql)?:\/\//i, /sk-[A-Za-z0-9_-]{16,}/, /api[_ -]?key\s*[:=]/i, /password\s*=/i, /eyJ[A-Za-z0-9_-]{30,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/];
  return { detected: patterns.some((pattern) => pattern.test(text)), message: "Potential secret detected. Remove credentials, tokens, service_role keys, DATABASE_URL values, passwords, and API keys before continuing." };
}

function normalizePriority(priority: AuditCaseIntakeRequest["priority"]) {
  return { low: 1, medium: 2, high: 3, critical: 4 }[priority];
}
function toDbAssetType(type: AuditCaseIntakeRequest["assetType"]) { return type.toUpperCase() as any; }
function selectedModuleSummaries(keys: AuditCaseIntakeRequest["selectedModules"]) {
  return keys.map((key) => auditModuleCatalog.find((module) => module.key === key)!).map(({ key, name, category, defaultWeight }) => ({ key, name, category, defaultWeight }));
}

export function parseAuditCaseIntake(body: unknown) {
  const intake = auditCaseIntakeRequestSchema.parse(body);
  const secretScan = detectPotentialSecrets([intake.operatorNotes, intake.auditGoal, intake.tags?.join(" ")].filter(Boolean).join("\n"));
  if (secretScan.detected) {
    const error = new Error(secretScan.message) as Error & { statusCode?: number; code?: string };
    error.statusCode = 400;
    error.code = "POTENTIAL_SECRET_DETECTED";
    throw error;
  }
  return intake;
}

export function buildAuditCasePreview(body: unknown) {
  const intake = parseAuditCaseIntake(body);
  const writeMode = getAuditWriteMode();
  const writeAllowed = writeMode === "enabled" && process.env.GXEON_AUDIT_ALLOW_DB_WRITES === "true";
  const warnings = [
    "Preview does not write to the database or external connectors.",
    ...(writeAllowed ? [] : ["Audit case writes are disabled until GXEON_AUDIT_WRITE_MODE=enabled and GXEON_AUDIT_ALLOW_DB_WRITES=true."]),
    ...(isDatabaseConfigured() ? [] : ["DATABASE_URL is not configured; create remains degraded-safe."]),
  ];
  return {
    previewId: `preview_${Buffer.from(`${intake.assetName}:${intake.assetUrl}`).toString("base64url").slice(0, 18)}`,
    caseTitle: `${intake.assetName} · ${intake.auditGoal.slice(0, 80)}`,
    initialStatus: "DRAFT" as const,
    writeMode,
    writeAllowed,
    degradedSafe: !writeAllowed,
    selectedModules: selectedModuleSummaries(intake.selectedModules),
    intake,
    warnings,
    nextSafeAction: writeAllowed ? "Schema readiness will be checked before INSERT." : "Create and review preview only; do not claim a case was saved.",
  };
}

export async function validateAuditCaseWriteReadiness() {
  const writeMode = getAuditWriteMode();
  if (writeMode !== "enabled" || process.env.GXEON_AUDIT_ALLOW_DB_WRITES !== "true") return { ok: false as const, status: 409, code: "WRITE_DISABLED", message: "Audit writes are disabled by feature flags." };
  if (!isDatabaseConfigured()) return { ok: false as const, status: 503, code: "DATABASE_NOT_CONFIGURED", message: "DATABASE_URL is not configured in the backend environment." };
  try {
    await getDb().execute(sql`select 1 from audit_cases limit 1`);
    return { ok: true as const };
  } catch {
    return { ok: false as const, status: 503, code: "AUDIT_SCHEMA_NOT_READY", message: "Audit schema is not accessible; no write was attempted." };
  }
}

export async function createAuditCase(body: unknown) {
  const preview = buildAuditCasePreview(body);
  const readiness = await validateAuditCaseWriteReadiness();
  if (!readiness.ok) return { status: readiness.status, payload: { system: "GXEON Audit OS", ok: false, code: readiness.code, message: readiness.message, preview } };
  const db = getDb();
  const clientRows = preview.intake.clientName ? await db.insert(auditClients).values({ displayName: preview.intake.clientName, contactReference: preview.intake.clientEmail ?? preview.intake.clientPhone ?? null, metadata: { source: preview.intake.source } }).returning({ id: auditClients.id }) : [];
  const assetRows = await db.insert(auditAssets).values({ clientId: clientRows[0]?.id, type: toDbAssetType(preview.intake.assetType), label: preview.intake.assetName, referenceUrl: preview.intake.assetUrl, metadata: { tags: preview.intake.tags ?? [], selectedModules: preview.intake.selectedModules } }).returning({ id: auditAssets.id });
  const caseRows = await db.insert(auditCases).values({ clientId: clientRows[0]?.id, assetId: assetRows[0]?.id, title: preview.caseTitle, status: "DRAFT", priority: normalizePriority(preview.intake.priority), metadata: { auditGoal: preview.intake.auditGoal, source: preview.intake.source, expectedDelivery: preview.intake.expectedDelivery, commercialIntent: preview.intake.commercialIntent ?? "none", selectedModules: preview.intake.selectedModules } }).returning({ id: auditCases.id });
  if (preview.intake.operatorNotes) await db.insert(auditOperatorNotes).values({ caseId: caseRows[0]?.id, note: preview.intake.operatorNotes, operatorReference: "internal_operator", metadata: { redactionRequired: false } });
  return { status: 201, payload: { system: "GXEON Audit OS", ok: true, code: "AUDIT_CASE_CREATED", message: "Audit case saved with guarded write flags enabled.", caseId: caseRows[0]?.id, preview } };
}

export async function listAuditCases() {
  if (!isDatabaseConfigured()) return { degradedSafe: true, databaseConfigured: false, count: 0, items: [], nextSafeAction: "Configure DATABASE_URL before read-backed case listing." };
  try { const items = await getDb().select().from(auditCases).limit(50); return { degradedSafe: false, databaseConfigured: true, count: items.length, items, nextSafeAction: "Open a case detail or create a preview for a new case." }; } catch { return { degradedSafe: true, databaseConfigured: true, count: 0, items: [], nextSafeAction: "Audit schema not ready; validate schema before enabling writes." }; }
}
export async function getAuditCaseById(caseId: string) {
  if (!isDatabaseConfigured()) return null;
  try { return (await getDb().select().from(auditCases).where(eq(auditCases.id, caseId)).limit(1))[0] ?? null; } catch { return null; }
}
export function getAuditCaseTimeline(caseId: string) { return { caseId, degradedSafe: true, items: [{ status: "DRAFT", label: "Intake preview/create initialized", generatedAt: new Date().toISOString() }] }; }
