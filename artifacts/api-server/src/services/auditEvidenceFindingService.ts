import { and, eq, sql } from "drizzle-orm";
import { parseAuditRows } from "./auditReadContracts";
import { auditAssets, auditCases, auditEvidences, auditFindings, getDb, isDatabaseConfigured } from "@workspace/db";
import { detectPotentialSecrets, getActiveAuditProviderDiagnostics, getAuditWriteMode, supabaseFetch, validateAuditCaseWriteReadiness } from "./auditCaseService";

const severities = ["INFO", "LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
const evidenceTypes = ["URL", "SCREENSHOT", "LOG_EXCERPT", "REPOSITORY_REFERENCE", "SCHEMA_REFERENCE", "REDACTED_CONFIG", "WORKFLOW_REFERENCE", "OPERATOR_NOTE", "OTHER"] as const;
const moduleKeys = ["website_audit", "ecommerce_audit", "ux_checkout_audit", "seo_basic_audit", "tracking_pixel_audit", "security_basic_audit", "github_repository_audit", "codebase_audit", "supabase_database_audit", "deployment_audit", "api_backend_audit", "ai_automation_audit", "business_offer_audit", "funnel_audit", "content_landing_page_audit"] as const;

type Severity = (typeof severities)[number];
type EvidenceType = (typeof evidenceTypes)[number];

type FindingInput = { caseId?: unknown; moduleKey?: unknown; title?: unknown; severity?: unknown; summary?: unknown; recommendation?: unknown; metadata?: unknown };
type EvidenceInput = { caseId?: unknown; findingId?: unknown; type?: unknown; title?: unknown; referenceUrl?: unknown; redactedText?: unknown; metadata?: unknown };

function fail(statusCode: number, code: string, message: string): never { const error = new Error(message) as Error & { statusCode: number; code: string }; error.statusCode = statusCode; error.code = code; throw error; }
function requiredString(value: unknown, field: string) { if (typeof value !== "string" || !value.trim()) fail(400, "INVALID_BODY", `${field} is required.`); return value.trim(); }
function optionalString(value: unknown) { return typeof value === "string" && value.trim() ? value.trim() : null; }
function metadataObject(value: unknown) { if (value == null) return {}; if (typeof value !== "object" || Array.isArray(value)) fail(400, "INVALID_METADATA", "metadata must be an object."); return value as Record<string, unknown>; }
function assertNoSecrets(...values: unknown[]) { const text = values.map((value) => typeof value === "string" ? value : JSON.stringify(value ?? {})).join("\n"); const scan = detectPotentialSecrets(text); if (scan.detected) fail(400, "POTENTIAL_SECRET_DETECTED", scan.message); }
function writeAllowed() { return getAuditWriteMode() === "enabled" && process.env.GXEON_AUDIT_ALLOW_DB_WRITES === "true"; }

export function authorizeAuditOperator(header: unknown) { const value = typeof header === "string" ? header : ""; const token = value.startsWith("Bearer ") ? value.slice(7).trim() : ""; if (!token) return { ok: false as const, status: 401, code: "OPERATOR_TOKEN_REQUIRED", message: "Authorization: Bearer token is required." }; const expected = process.env.GXEON_AUDIT_OPERATOR_TOKEN || process.env.GXEON_AUDIT_BOOTSTRAP_TOKEN; if (!expected) return { ok: false as const, status: 403, code: "OPERATOR_TOKEN_NOT_CONFIGURED", message: "Operator token is not configured." }; if (token !== expected) return { ok: false as const, status: 403, code: "OPERATOR_TOKEN_INVALID", message: "Operator token is invalid." }; return { ok: true as const }; }

export function buildFindingPreview(body: unknown) { const input = body as FindingInput; const caseId = requiredString(input.caseId, "caseId"); const title = requiredString(input.title, "title"); const summary = requiredString(input.summary, "summary"); const severity = (typeof input.severity === "string" ? input.severity : "INFO") as Severity; if (!severities.includes(severity)) fail(400, "INVALID_SEVERITY", "Allowed severities: INFO, LOW, MEDIUM, HIGH, CRITICAL."); const moduleKey = optionalString(input.moduleKey); if (moduleKey && !moduleKeys.includes(moduleKey as any)) fail(400, "INVALID_MODULE_KEY", "moduleKey is not in the official Audit OS catalog."); const recommendation = optionalString(input.recommendation); const metadata = metadataObject(input.metadata); assertNoSecrets(title, summary, recommendation, metadata); return { previewId: `finding_preview_${Buffer.from(`${caseId}:${title}`).toString("base64url").slice(0, 18)}`, writeAllowed: writeAllowed(), noWrite: true, finding: { caseId, moduleKey, title, severity, summary, recommendation, status: "OPEN", metadata }, warnings: ["Preview endpoint does not write.", "Manual-first: create requires operator token and write flags."] }; }

export function buildEvidencePreview(body: unknown) { const input = body as EvidenceInput; const caseId = requiredString(input.caseId, "caseId"); const type = (typeof input.type === "string" ? input.type : "OPERATOR_NOTE") as EvidenceType; if (!evidenceTypes.includes(type)) fail(400, "INVALID_EVIDENCE_TYPE", "Evidence type is not allowed."); const title = requiredString(input.title, "title"); const referenceUrl = optionalString(input.referenceUrl); const redactedText = optionalString(input.redactedText); const findingId = optionalString(input.findingId); const metadata = metadataObject(input.metadata); assertNoSecrets(title, referenceUrl, redactedText, metadata); return { previewId: `evidence_preview_${Buffer.from(`${caseId}:${title}`).toString("base64url").slice(0, 18)}`, writeAllowed: writeAllowed(), noWrite: true, noScraping: true, evidence: { caseId, findingId, type, title, referenceUrl, redactedText, metadata }, warnings: ["Preview endpoint does not write.", "Evidence is reference-only: GXEON will not fetch, scrape, crawl, or download referenceUrl."] }; }

export async function auditCaseExists(caseId: string) { const diagnostics = await getActiveAuditProviderDiagnostics(); if (diagnostics.activeProvider === "supabase_rest") { const rows = await (await supabaseFetch(`audit_cases?select=id&id=eq.${encodeURIComponent(caseId)}&limit=1`)).json() as Array<{ id: string }>; return Boolean(rows[0]?.id); } if (!isDatabaseConfigured()) return false; return Boolean((await getDb().select({ id: auditCases.id }).from(auditCases).where(eq(auditCases.id, caseId)).limit(1))[0]?.id); }
async function findingExists(findingId: string) { const diagnostics = await getActiveAuditProviderDiagnostics(); if (diagnostics.activeProvider === "supabase_rest") { const rows = await (await supabaseFetch(`audit_findings?select=id&id=eq.${encodeURIComponent(findingId)}&limit=1`)).json() as Array<{ id: string }>; return Boolean(rows[0]?.id); } if (!isDatabaseConfigured()) return false; return Boolean((await getDb().select({ id: auditFindings.id }).from(auditFindings).where(eq(auditFindings.id, findingId)).limit(1))[0]?.id); }

export async function createFinding(body: unknown) { const preview = buildFindingPreview(body); if (!await auditCaseExists(preview.finding.caseId)) return { status: 404, payload: { ok: false, code: "AUDIT_CASE_NOT_FOUND", message: "caseId does not exist.", preview } }; const readiness = await validateAuditCaseWriteReadiness(); if (!readiness.ok) return { status: readiness.status, payload: { ok: false, code: readiness.code, message: readiness.message, preview } }; if (readiness.provider === "supabase_rest") { const rows = await (await supabaseFetch("audit_findings", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ case_id: preview.finding.caseId, module_key: preview.finding.moduleKey, title: preview.finding.title, severity: preview.finding.severity, summary: preview.finding.summary, recommendation: preview.finding.recommendation, status: "OPEN", metadata: preview.finding.metadata }) })).json() as Array<{ id: string }>; return { status: 201, payload: { ok: true, code: "AUDIT_FINDING_CREATED", findingId: rows[0]?.id, finding: { ...preview.finding, id: rows[0]?.id } } }; } const rows = await getDb().insert(auditFindings).values({ caseId: preview.finding.caseId, moduleKey: preview.finding.moduleKey as any, title: preview.finding.title, severity: preview.finding.severity, summary: preview.finding.summary, recommendation: preview.finding.recommendation, status: "OPEN", metadata: preview.finding.metadata }).returning({ id: auditFindings.id }); return { status: 201, payload: { ok: true, code: "AUDIT_FINDING_CREATED", findingId: rows[0]?.id, finding: { ...preview.finding, id: rows[0]?.id } } }; }

export async function createEvidence(body: unknown) { const preview = buildEvidencePreview(body); if (!await auditCaseExists(preview.evidence.caseId)) return { status: 404, payload: { ok: false, code: "AUDIT_CASE_NOT_FOUND", message: "caseId does not exist.", preview } }; if (preview.evidence.findingId && !await findingExists(preview.evidence.findingId)) return { status: 404, payload: { ok: false, code: "AUDIT_FINDING_NOT_FOUND", message: "findingId does not exist.", preview } }; const readiness = await validateAuditCaseWriteReadiness(); if (!readiness.ok) return { status: readiness.status, payload: { ok: false, code: readiness.code, message: readiness.message, preview } }; if (readiness.provider === "supabase_rest") { const rows = await (await supabaseFetch("audit_evidences", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ case_id: preview.evidence.caseId, finding_id: preview.evidence.findingId, type: preview.evidence.type, title: preview.evidence.title, reference_url: preview.evidence.referenceUrl, redacted_text: preview.evidence.redactedText, metadata: preview.evidence.metadata }) })).json() as Array<{ id: string }>; return { status: 201, payload: { ok: true, code: "AUDIT_EVIDENCE_CREATED", evidenceId: rows[0]?.id, evidence: { ...preview.evidence, id: rows[0]?.id } } }; } const rows = await getDb().insert(auditEvidences).values({ caseId: preview.evidence.caseId, findingId: preview.evidence.findingId, type: preview.evidence.type, title: preview.evidence.title, referenceUrl: preview.evidence.referenceUrl, redactedText: preview.evidence.redactedText, metadata: preview.evidence.metadata }).returning({ id: auditEvidences.id }); return { status: 201, payload: { ok: true, code: "AUDIT_EVIDENCE_CREATED", evidenceId: rows[0]?.id, evidence: { ...preview.evidence, id: rows[0]?.id } } }; }

export async function listFindingsByCase(caseId: string) { const diagnostics = await getActiveAuditProviderDiagnostics(); if (diagnostics.activeProvider === "supabase_rest") return { provider: "supabase_rest", items: await (await supabaseFetch(`audit_findings?select=*&case_id=eq.${encodeURIComponent(caseId)}&order=created_at.desc`)).json().then(parseAuditRows) }; if (!isDatabaseConfigured()) return { provider: null, items: [] }; return { provider: "postgres", items: await getDb().select().from(auditFindings).where(eq(auditFindings.caseId, caseId)).limit(100) }; }
export async function getFinding(findingId: string) { const diagnostics = await getActiveAuditProviderDiagnostics(); if (diagnostics.activeProvider === "supabase_rest") return (await (await supabaseFetch(`audit_findings?select=*&id=eq.${encodeURIComponent(findingId)}&limit=1`)).json() as any[])[0] ?? null; if (!isDatabaseConfigured()) return null; return (await getDb().select().from(auditFindings).where(eq(auditFindings.id, findingId)).limit(1))[0] ?? null; }
export async function listEvidencesByCase(caseId: string) { const diagnostics = await getActiveAuditProviderDiagnostics(); if (diagnostics.activeProvider === "supabase_rest") return { provider: "supabase_rest", items: await (await supabaseFetch(`audit_evidences?select=*&case_id=eq.${encodeURIComponent(caseId)}&order=created_at.desc`)).json().then(parseAuditRows) }; if (!isDatabaseConfigured()) return { provider: null, items: [] }; return { provider: "postgres", items: await getDb().select().from(auditEvidences).where(eq(auditEvidences.caseId, caseId)).limit(100) }; }
export async function listEvidencesByFinding(findingId: string) { const diagnostics = await getActiveAuditProviderDiagnostics(); if (diagnostics.activeProvider === "supabase_rest") return { provider: "supabase_rest", items: await (await supabaseFetch(`audit_evidences?select=*&finding_id=eq.${encodeURIComponent(findingId)}&order=created_at.desc`)).json().then(parseAuditRows) }; if (!isDatabaseConfigured()) return { provider: null, items: [] }; return { provider: "postgres", items: await getDb().select().from(auditEvidences).where(eq(auditEvidences.findingId, findingId)).limit(100) }; }
export async function auditEvidenceFindingCounts(caseId: string) { const [findings, evidences] = await Promise.all([listFindingsByCase(caseId), listEvidencesByCase(caseId)]); return { findingsCount: findings.items.length, evidencesCount: evidences.items.length, provider: findings.provider ?? evidences.provider }; }


const firstInternalAuditCaseReferenceUrl = "https://github.com/xpex-systems-ai/GXEON-AI";
const baselineFinding = {
  title: "Audit OS bootstrap concluído com provider Supabase REST",
  severity: "INFO" as const,
  moduleKey: "supabase_database_audit",
  summary: "Primeiro caso interno confirmado no Mission Control com provider Supabase REST, sem cliente falso, sem receita falsa e sem escrita em conectores externos.",
  recommendation: "Manter fluxo manual-first, registrar evidências redigidas e avançar para score e relatório somente após revisão do operador.",
  status: "OPEN",
  metadata: { baseline: true, internal_case: true, source: "operator_manual", monetization_safe: true, fakeClientCreated: false, fakeRevenueCreated: false, connectorWrites: false },
};
const baselineEvidence = {
  type: "OPERATOR_NOTE" as const,
  title: "Mission Control confirmou primeiro caso interno",
  redactedText: "Print/operator note: Mission Control mostra 1 caso interno GXEON-AI confirmado, provider Supabase REST pronto e receita confirmada R$0.",
  metadata: { baseline: true, internal_case: true, referenceOnly: true, noScraping: true, noPayment: true, noConnectorWrite: true },
};

type InternalCaseRow = { id: string; asset_id?: string | null; assetId?: string | null; metadata?: Record<string, unknown> | null; title?: string | null };
function isBaselineRow(row: any) { return row?.metadata?.baseline === true && row?.metadata?.internal_case === true; }
function safeCounts(findings: any[], evidences: any[]) { return { findingsCount: findings.length, evidencesCount: evidences.length, findingExists: findings.length > 0, evidenceExists: evidences.length > 0, readyForReports: findings.length > 0 && evidences.length > 0 }; }

export async function findFirstInternalAuditCase() {
  const diagnostics = await getActiveAuditProviderDiagnostics();
  if (diagnostics.activeProvider === "supabase_rest") {
    const assets = await (await supabaseFetch(`audit_assets?select=id&reference_url=eq.${encodeURIComponent(firstInternalAuditCaseReferenceUrl)}&limit=1`)).json() as Array<{ id: string }>;
    if (assets[0]?.id) {
      const cases = await (await supabaseFetch(`audit_cases?select=id,asset_id,metadata,title&asset_id=eq.${assets[0].id}&order=created_at.asc&limit=1`)).json() as InternalCaseRow[];
      if (cases[0]?.id) return { provider: "supabase_rest" as const, caseId: cases[0].id, case: cases[0] };
    }
    const cases = await (await supabaseFetch("audit_cases?select=id,asset_id,metadata,title&order=created_at.asc&limit=50")).json() as InternalCaseRow[];
    const found = cases.find((item) => item.metadata?.internal_case === true || item.metadata?.source === "operator_manual");
    return found?.id ? { provider: "supabase_rest" as const, caseId: found.id, case: found } : null;
  }
  if (!isDatabaseConfigured()) return null;
  const byAsset = await getDb().select({ id: auditCases.id, assetId: auditCases.assetId, metadata: auditCases.metadata, title: auditCases.title }).from(auditCases).leftJoin(auditAssets, eq(auditCases.assetId, auditAssets.id)).where(eq(auditAssets.referenceUrl, firstInternalAuditCaseReferenceUrl)).limit(1);
  if (byAsset[0]?.id) return { provider: "postgres" as const, caseId: byAsset[0].id, case: byAsset[0] };
  const byMetadata = await getDb().select({ id: auditCases.id, assetId: auditCases.assetId, metadata: auditCases.metadata, title: auditCases.title }).from(auditCases).where(sql`${auditCases.metadata}->>'internal_case' = 'true' or ${auditCases.metadata}->>'source' = 'operator_manual'`).limit(1);
  return byMetadata[0]?.id ? { provider: "postgres" as const, caseId: byMetadata[0].id, case: byMetadata[0] } : null;
}

async function baselineRows(caseId: string) {
  const diagnostics = await getActiveAuditProviderDiagnostics();
  if (diagnostics.activeProvider === "supabase_rest") {
    const [findings, evidences] = await Promise.all([
      (await supabaseFetch(`audit_findings?select=*&case_id=eq.${encodeURIComponent(caseId)}&order=created_at.asc&limit=100`)).json() as Promise<any[]>,
      (await supabaseFetch(`audit_evidences?select=*&case_id=eq.${encodeURIComponent(caseId)}&order=created_at.asc&limit=100`)).json() as Promise<any[]>,
    ]);
    return { provider: "supabase_rest" as const, findings: findings.filter(isBaselineRow), evidences: evidences.filter(isBaselineRow) };
  }
  if (!isDatabaseConfigured()) return { provider: null, findings: [], evidences: [] };
  const [findings, evidences] = await Promise.all([
    getDb().select().from(auditFindings).where(and(eq(auditFindings.caseId, caseId), sql`${auditFindings.metadata}->>'baseline' = 'true'`, sql`${auditFindings.metadata}->>'internal_case' = 'true'`)).limit(100),
    getDb().select().from(auditEvidences).where(and(eq(auditEvidences.caseId, caseId), sql`${auditEvidences.metadata}->>'baseline' = 'true'`, sql`${auditEvidences.metadata}->>'internal_case' = 'true'`)).limit(100),
  ]);
  return { provider: "postgres" as const, findings, evidences };
}

export async function getBaselineStatus() {
  const firstCase = await findFirstInternalAuditCase();
  if (!firstCase) return { system: "GXEON Audit OS", ok: true, sanitized: true, caseConfirmed: false, caseId: null, findingExists: false, evidenceExists: false, findingsCount: 0, evidencesCount: 0, readyForReports: false, revenueConfirmed: 0, fakeClientCreated: false, fakeRevenueCreated: false, connectorWrites: false, nextSafeAction: "Criar primeiro Audit Case interno antes da MISSION_006." };
  const rows = await baselineRows(firstCase.caseId);
  return { system: "GXEON Audit OS", ok: true, sanitized: true, provider: firstCase.provider, caseConfirmed: true, caseId: firstCase.caseId, ...safeCounts(rows.findings, rows.evidences), revenueConfirmed: 0, fakeClientCreated: false, fakeRevenueCreated: false, connectorWrites: false, nextSafeAction: rows.findings.length > 0 && rows.evidences.length > 0 ? "Avançar para MISSION_006 Reports + Score" : "Criar baseline seguro." };
}

export async function createFirstBaselineEvidenceFinding() {
  const readiness = await validateAuditCaseWriteReadiness();
  if (!readiness.ok) return { status: readiness.status, payload: { ok: false, status: "BLOCKED", code: readiness.code, message: readiness.message } };
  const firstCase = await findFirstInternalAuditCase();
  if (!firstCase) return { status: 404, payload: { ok: false, status: "BLOCKED", code: "FIRST_INTERNAL_CASE_NOT_FOUND", message: "First internal GXEON-AI Audit Case was not found. Do not create a new case here." } };
  const existing = await baselineRows(firstCase.caseId);
  let findingId = existing.findings[0]?.id;
  let evidenceId = existing.evidences[0]?.id;
  let findingCreated = false;
  let evidenceCreated = false;
  if (readiness.provider === "supabase_rest") {
    if (!findingId) {
      const rows = await (await supabaseFetch("audit_findings", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ case_id: firstCase.caseId, module_key: baselineFinding.moduleKey, title: baselineFinding.title, severity: baselineFinding.severity, summary: baselineFinding.summary, recommendation: baselineFinding.recommendation, status: baselineFinding.status, metadata: baselineFinding.metadata }) })).json() as Array<{ id: string }>;
      findingId = rows[0]?.id; findingCreated = Boolean(findingId);
    }
    if (!evidenceId) {
      const rows = await (await supabaseFetch("audit_evidences", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ case_id: firstCase.caseId, finding_id: findingId, type: baselineEvidence.type, title: baselineEvidence.title, redacted_text: baselineEvidence.redactedText, metadata: baselineEvidence.metadata }) })).json() as Array<{ id: string }>;
      evidenceId = rows[0]?.id; evidenceCreated = Boolean(evidenceId);
    }
  } else {
    const db = getDb();
    if (!findingId) { const rows = await db.insert(auditFindings).values({ caseId: firstCase.caseId, moduleKey: baselineFinding.moduleKey as any, title: baselineFinding.title, severity: baselineFinding.severity, summary: baselineFinding.summary, recommendation: baselineFinding.recommendation, status: baselineFinding.status, metadata: baselineFinding.metadata }).returning({ id: auditFindings.id }); findingId = rows[0]?.id; findingCreated = Boolean(findingId); }
    if (!evidenceId) { const rows = await db.insert(auditEvidences).values({ caseId: firstCase.caseId, findingId, type: baselineEvidence.type, title: baselineEvidence.title, redactedText: baselineEvidence.redactedText, metadata: baselineEvidence.metadata }).returning({ id: auditEvidences.id }); evidenceId = rows[0]?.id; evidenceCreated = Boolean(evidenceId); }
  }
  return { status: findingCreated || evidenceCreated ? 201 : 200, payload: { ok: true, status: findingCreated || evidenceCreated ? "CREATED" : "ALREADY_EXISTS", caseId: firstCase.caseId, findingId, evidenceId, findingCreated, evidenceCreated, revenueConfirmed: 0, fakeClientCreated: false, fakeRevenueCreated: false, connectorWrites: false, paymentCalls: false, scrapingPerformed: false, secretsLogged: false, nextSafeAction: "Avançar para MISSION_006 Reports + Score" } };
}
