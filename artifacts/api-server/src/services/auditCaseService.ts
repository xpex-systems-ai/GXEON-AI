import { and, eq, sql } from "drizzle-orm";
import { auditCaseIntakeRequestSchema, type AuditCaseIntakeRequest } from "@workspace/api-zod";
import { auditAssets, auditCases, auditClients, auditModuleCatalog, auditOperatorNotes, getDb, getPool, isDatabaseConfigured } from "@workspace/db";

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

const expectedAuditTables = ["audit_assets", "audit_cases", "audit_operator_notes"] as const;
const publicAuditEnums = ["audit_case_status", "audit_asset_type", "audit_module_key", "audit_severity", "audit_evidence_type", "audit_report_type", "audit_task_status", "audit_proposal_status", "audit_revenue_status", "audit_connector_status"] as const;

type AuditSchemaDiagnosticCode = "AUDIT_TABLES_MISSING" | "DATABASE_CONNECTION_FAILED" | "PUBLIC_SCHEMA_NOT_VISIBLE" | "AUDIT_SCHEMA_NOT_READY";

function sanitizeDatabaseError(error: unknown) {
  const candidate = error as { name?: unknown; code?: unknown; message?: unknown };
  const code = typeof candidate?.code === "string" ? candidate.code : undefined;
  const message = typeof candidate?.message === "string" ? candidate.message.toLowerCase() : "";
  const messageClass = code === "42P01" ? "UNDEFINED_TABLE" : code === "42501" ? "INSUFFICIENT_PRIVILEGE" : message.includes("connect") || message.includes("timeout") ? "CONNECTION_ERROR" : "DATABASE_ERROR";
  return { name: typeof candidate?.name === "string" ? candidate.name : "DatabaseError", code, messageClass };
}

function deriveProjectRefHintMasked() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return null;
  try {
    const host = new URL(databaseUrl).hostname;
    const match = host.match(/([a-z0-9]{20})\.supabase\.(?:co|com)$/i) ?? host.match(/db\.([a-z0-9]{20})\.supabase\.(?:co|com)$/i);
    const ref = match?.[1];
    return ref ? `${ref.slice(0, 4)}…${ref.slice(-4)}` : null;
  } catch {
    return null;
  }
}

function classifyAuditSchemaProblem(foundTables: string[], error?: unknown): AuditSchemaDiagnosticCode {
  const sanitized = error ? sanitizeDatabaseError(error) : null;
  if (sanitized?.messageClass === "CONNECTION_ERROR") return "DATABASE_CONNECTION_FAILED";
  if (sanitized?.code === "42P01") return "AUDIT_TABLES_MISSING";
  if (sanitized?.code === "42501" || sanitized?.messageClass === "INSUFFICIENT_PRIVILEGE") return "PUBLIC_SCHEMA_NOT_VISIBLE";
  if (expectedAuditTables.some((table) => !foundTables.includes(table))) return "AUDIT_TABLES_MISSING";
  return "AUDIT_SCHEMA_NOT_READY";
}

export async function getAuditSchemaDiagnostics() {
  const databaseConfigured = isDatabaseConfigured();
  const base = { system: "GXEON Audit OS", readOnly: true, databaseConfigured, expectedTables: [...expectedAuditTables], projectRefHintMasked: deriveProjectRefHintMasked(), safeMode: true };
  if (!databaseConfigured) return { ...base, schemaReady: false, foundTables: [], missingTables: [...expectedAuditTables], foundEnums: [], currentSchema: null, currentDatabase: null, code: "DATABASE_CONNECTION_FAILED" as AuditSchemaDiagnosticCode, error: null };
  try {
    const pool = getPool();
    const [tablesResult, enumsResult, contextResult] = await Promise.all([
      pool.query<{ table_name: string }>("select table_name from information_schema.tables where table_schema = 'public' and table_name like 'audit_%' order by table_name"),
      pool.query<{ typname: string }>("select t.typname from pg_type t join pg_namespace n on n.oid = t.typnamespace where n.nspname = 'public' and t.typname like 'audit_%' order by t.typname"),
      pool.query<{ current_schema: string; current_database: string }>("select current_schema() as current_schema, current_database() as current_database"),
    ]);
    const foundTables = tablesResult.rows.map((row) => row.table_name);
    const missingTables = expectedAuditTables.filter((table) => !foundTables.includes(table));
    const schemaReady = missingTables.length === 0;
    return { ...base, schemaReady, foundTables, missingTables, foundEnums: enumsResult.rows.map((row) => row.typname).filter((name) => publicAuditEnums.includes(name as (typeof publicAuditEnums)[number])), currentSchema: contextResult.rows[0]?.current_schema ?? null, currentDatabase: contextResult.rows[0]?.current_database ?? null, code: schemaReady ? null : classifyAuditSchemaProblem(foundTables), error: null };
  } catch (error) {
    return { ...base, schemaReady: false, foundTables: [], missingTables: [...expectedAuditTables], foundEnums: [], currentSchema: null, currentDatabase: null, code: classifyAuditSchemaProblem([], error), error: sanitizeDatabaseError(error) };
  }
}

export async function validateAuditCaseWriteReadiness() {
  const writeMode = getAuditWriteMode();
  if (writeMode !== "enabled" || process.env.GXEON_AUDIT_ALLOW_DB_WRITES !== "true") return { ok: false as const, status: 409, code: "WRITE_DISABLED", message: "Audit writes are disabled by feature flags." };
  if (!isDatabaseConfigured()) return { ok: false as const, status: 503, code: "DATABASE_NOT_CONFIGURED", message: "DATABASE_URL is not configured in the backend environment." };
  try {
    await validateAuditSchemaReadiness();
    return { ok: true as const };
  } catch (error) {
    const diagnostics = await getAuditSchemaDiagnostics();
    return { ok: false as const, status: 503, code: diagnostics.code ?? classifyAuditSchemaProblem([], error), message: "Audit schema is not accessible; no write was attempted.", diagnostics: { databaseConfigured: diagnostics.databaseConfigured, expectedTables: diagnostics.expectedTables, foundTables: diagnostics.foundTables, missingTables: diagnostics.missingTables, schemaReady: diagnostics.schemaReady, currentSchema: diagnostics.currentSchema, sqlState: diagnostics.error?.code, errorClass: diagnostics.error?.messageClass } };
  }
}

export async function validateAuditSchemaReadiness() {
  const db = getDb();
  await db.execute(sql`select 1 from public.audit_assets limit 1`);
  await db.execute(sql`select 1 from public.audit_cases limit 1`);
  await db.execute(sql`select 1 from public.audit_operator_notes limit 1`);
  return { ok: true as const };
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

const firstInternalAuditCaseOperatorNotes = "Primeiro caso interno oficial do Audit OS. Não contém secrets. Não representa cliente externo. Não representa receita.";

const firstInternalAuditCasePayload: AuditCaseIntakeRequest = {
  assetName: "GXEON-AI Repository",
  assetUrl: "https://github.com/xpex-systems-ai/GXEON-AI",
  assetType: "github_repository",
  auditGoal: "Auditar o próprio repositório GXEON-AI como primeiro caso interno do Audit OS, verificando estrutura, módulos, schema, deploy readiness e segurança operacional.",
  selectedModules: ["github_repository_audit", "codebase_audit", "supabase_database_audit", "deployment_audit", "api_backend_audit", "ai_automation_audit"],
  priority: "high",
  source: "operator_manual",
  operatorNotes: firstInternalAuditCaseOperatorNotes,
};

function firstCaseResponse(created: boolean, status: "CREATED" | "ALREADY_EXISTS" | "BLOCKED", caseId: string | null, extra: Record<string, unknown> = {}) {
  return {
    system: "GXEON Audit OS",
    ok: status !== "BLOCKED",
    created,
    status,
    caseId,
    revenueConfirmed: 0,
    fakeClientCreated: false,
    connectorWrites: false,
    safeMode: true,
    ...extra,
  };
}

export async function bootstrapFirstInternalAuditCase() {
  const readiness = await validateAuditCaseWriteReadiness();
  if (!readiness.ok) return { status: readiness.status, payload: firstCaseResponse(false, "BLOCKED", null, { code: readiness.code, message: readiness.message, diagnostics: "diagnostics" in readiness ? readiness.diagnostics : undefined }) };

  const db = getDb();
  const existing = await db
    .select({ id: auditCases.id, assetId: auditCases.assetId })
    .from(auditCases)
    .leftJoin(auditAssets, eq(auditCases.assetId, auditAssets.id))
    .where(and(eq(auditAssets.referenceUrl, firstInternalAuditCasePayload.assetUrl), sql`${auditCases.metadata}->>'source' = ${firstInternalAuditCasePayload.source}`))
    .limit(1);

  if (existing[0]?.id) {
    return { status: 200, payload: firstCaseResponse(false, "ALREADY_EXISTS", existing[0].id, { assetId: existing[0].assetId }) };
  }

  const preview = buildAuditCasePreview(firstInternalAuditCasePayload);
  const assetRows = await db.insert(auditAssets).values({
    type: toDbAssetType(preview.intake.assetType),
    label: preview.intake.assetName,
    referenceUrl: preview.intake.assetUrl,
    metadata: {
      internal_case: true,
      bootstrap_source: "railway_protected_endpoint",
      tags: preview.intake.tags ?? [],
      selectedModules: preview.intake.selectedModules,
      fakeClientCreated: false,
    },
  }).returning({ id: auditAssets.id });
  const caseRows = await db.insert(auditCases).values({
    assetId: assetRows[0]?.id,
    title: preview.caseTitle,
    status: "DRAFT",
    priority: normalizePriority(preview.intake.priority),
    metadata: {
      auditGoal: preview.intake.auditGoal,
      source: preview.intake.source,
      selectedModules: preview.intake.selectedModules,
      internal_case: true,
      bootstrap_source: "railway_protected_endpoint",
      revenueConfirmed: 0,
      fakeClientCreated: false,
      connectorWrites: false,
    },
  }).returning({ id: auditCases.id });
  const caseId = caseRows[0]?.id;
  if (!caseId) throw new Error("AUDIT_BOOTSTRAP_CASE_ID_MISSING");
  await db.insert(auditOperatorNotes).values({ caseId, note: preview.intake.operatorNotes ?? firstInternalAuditCaseOperatorNotes, operatorReference: "internal_operator", metadata: { bootstrap_source: "railway_protected_endpoint", redactionRequired: false } });
  return { status: 201, payload: firstCaseResponse(true, "CREATED", caseId, { assetId: assetRows[0]?.id }) };
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
