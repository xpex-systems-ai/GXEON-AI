import { asc, eq, sql } from "drizzle-orm";
import { auditCases, auditProposals, getDb, isDatabaseConfigured } from "@workspace/db";
import { detectPotentialSecrets, getActiveAuditProviderDiagnostics, supabaseFetch, validateAuditCaseWriteReadiness } from "./auditCaseService";
import { buildProposalPreview } from "./auditProposalService";
import { getAuditOffer } from "./auditOfferCatalogService";

const SOURCE = "mission_007_1_autorunner";
const IDEMPOTENCY_KEY = "mission_007_1_internal_first_proposal";
const TITLE = "Proposta Interna — Auditoria Técnica Completa GXEON";
const NEXT = "Review first proposal DRAFT manually and decide whether to send outside the system.";
type RunCode = "CREATED" | "REUSED" | "ALREADY_EXISTS" | "WRITE_DISABLED" | "BLOCKED_NO_CASE" | "BLOCKED_NO_OFFER" | "BLOCKED_PROVIDER_NOT_READY" | "BLOCKED_SECRET_LIKE_CONTENT" | "BLOCKED";
let lastAutorunResult: any = null;
let startupAttempted = false;

function allowedLanguage() { return process.env.GXEON_AUDIT_DEFAULT_PROPOSAL_LANGUAGE === "en-US" ? "en-US" : "pt-BR"; }
function selectOfferKey() { const requested = process.env.GXEON_AUDIT_DEFAULT_OFFER_KEY || "technical_audit"; if (getAuditOffer(requested)) return requested; if (getAuditOffer("technical_audit")) return "technical_audit"; if (getAuditOffer("audit_express")) return "audit_express"; return null; }
function sanitizeProposal(row: any) { const metadata = row?.metadata && !detectPotentialSecrets(JSON.stringify(row.metadata)).detected ? row.metadata : {}; return { proposalId: row?.id, caseId: row?.case_id ?? row?.caseId ?? metadata.caseId, offerKey: metadata.offerKey, status: row?.status ?? metadata.proposalStatus ?? "DRAFT", priceTarget: Number(row?.amount ?? metadata.priceTarget ?? 0), currency: row?.currency ?? "BRL" }; }
function payload(code: RunCode, extra: Record<string, unknown> = {}) { return { system: "GXEON Audit OS", ok: ["CREATED", "REUSED", "ALREADY_EXISTS"].includes(code), code, status: code, sanitized: true, autoSend: false, paymentCalls: false, checkoutCreated: false, invoiceCreated: false, revenueEventCreated: false, fakeClientCreated: false, fakeRevenueCreated: false, connectorWrites: false, confirmedRevenue: 0, readyForRevenueProof: false, nextOperatorAction: NEXT, ...extra }; }
async function firstCaseId(provider: "supabase_rest" | "postgres") { if (provider === "supabase_rest") return ((await (await supabaseFetch("audit_cases?select=id&order=created_at.asc&limit=1")).json()) as any[])[0]?.id as string | undefined; return (await getDb().select({ id: auditCases.id }).from(auditCases).orderBy(asc(auditCases.createdAt)).limit(1))[0]?.id; }
async function proposalsForCase(provider: "supabase_rest" | "postgres", caseId: string) { if (provider === "supabase_rest") return (await (await supabaseFetch(`audit_proposals?select=*&case_id=eq.${encodeURIComponent(caseId)}&order=created_at.asc&limit=100`)).json()) as any[]; return await getDb().select().from(auditProposals).where(eq(auditProposals.caseId, caseId)).orderBy(asc(auditProposals.createdAt)).limit(100); }
function isInternalFirst(row: any) { const m = row?.metadata ?? {}; return m.internal_first_proposal === true && m.source === SOURCE && m.idempotencyKey === IDEMPOTENCY_KEY && (row?.status ?? m.proposalStatus) !== "ARCHIVED"; }
async function countAll(provider: "supabase_rest" | "postgres") { if (provider === "supabase_rest") return ((await (await supabaseFetch("audit_proposals?select=id&limit=1000")).json()) as any[]).length; return (await getDb().select({ id: auditProposals.id }).from(auditProposals).limit(1000)).length; }

export async function getFirstProposalDraftStatus() {
  const diagnostics = await getActiveAuditProviderDiagnostics();
  if (!diagnostics.activeProvider) return payload("BLOCKED_PROVIDER_NOT_READY", { caseExists: false, proposalExists: false, proposalId: null, offerKey: null, proposalStatus: null, proposalCount: 0, readyForManualReview: false, lastAutorunResult });
  const caseId = await firstCaseId(diagnostics.activeProvider);
  if (!caseId) return payload("BLOCKED_NO_CASE", { caseExists: false, proposalExists: false, proposalId: null, offerKey: null, proposalStatus: null, proposalCount: 0, readyForManualReview: false, lastAutorunResult });
  const proposals = await proposalsForCase(diagnostics.activeProvider, caseId);
  const proposal = proposals.find(isInternalFirst) ?? proposals.find((p) => (p.status ?? p.metadata?.proposalStatus) === "DRAFT");
  const safe = proposal ? sanitizeProposal(proposal) : {};
  return payload(proposal ? "ALREADY_EXISTS" : "BLOCKED", { caseExists: true, caseId, proposalExists: Boolean(proposal), proposalCount: await countAll(diagnostics.activeProvider), proposalStatus: proposal ? safe.status : null, readyForManualReview: proposal ? safe.status === "DRAFT" : false, ...safe, lastAutorunResult });
}

export async function createOrReuseFirstProposalDraft() {
  const readiness = await validateAuditCaseWriteReadiness();
  if (!readiness.ok) return { status: readiness.status, payload: payload(readiness.code === "WRITE_DISABLED" ? "WRITE_DISABLED" : "BLOCKED_PROVIDER_NOT_READY", { message: readiness.message }) };
  const provider = readiness.provider;
  const caseId = await firstCaseId(provider);
  if (!caseId) return { status: 409, payload: payload("BLOCKED_NO_CASE", { caseId: null, proposalId: null }) };
  const existing = (await proposalsForCase(provider, caseId)).find(isInternalFirst);
  if (existing) return { status: 200, payload: payload("REUSED", { ...sanitizeProposal(existing), proposalCount: await countAll(provider), readyForManualReview: true }) };
  const offerKey = selectOfferKey();
  if (!offerKey) return { status: 409, payload: payload("BLOCKED_NO_OFFER", { caseId }) };
  const preview = await buildProposalPreview({ caseId, offerKey, language: allowedLanguage(), assetName: "GXEON-AI Repository" });
  const metadata = { baseline: true, internal_first_proposal: true, source: SOURCE, idempotencyKey: IDEMPOTENCY_KEY, auto_send: false, payment_call: false, revenue_confirmed: false, requires_operator_review: true, offerKey, proposalStatus: "DRAFT", proposalCopy: preview.proposal.proposalCopy, scope: preview.proposal.scope, deliverables: preview.proposal.deliverables, language: preview.proposal.language, proofRequired: true, paymentCalls: false, autoSend: false };
  const text = JSON.stringify({ title: TITLE, metadata });
  if (detectPotentialSecrets(text).detected) return { status: 400, payload: payload("BLOCKED_SECRET_LIKE_CONTENT", { caseId, offerKey }) };
  const values = { case_id: caseId, title: TITLE, status: "DRAFT", currency: "BRL", amount: preview.proposal.priceTarget, metadata };
  const rows = provider === "supabase_rest" ? await (await supabaseFetch("audit_proposals", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(values) })).json() as any[] : await getDb().insert(auditProposals).values({ caseId, title: TITLE, status: "DRAFT", currency: "BRL", amount: String(preview.proposal.priceTarget), metadata }).returning();
  const safe = sanitizeProposal(rows[0]);
  const result = payload("CREATED", { ...safe, proposalCount: await countAll(provider), readyForManualReview: true });
  lastAutorunResult = result;
  return { status: 201, payload: result };
}

export async function maybeRunFirstProposalAutorunnerOnStartup() {
  if (startupAttempted) return lastAutorunResult ?? payload("BLOCKED", { autoRunEnabled: false, startupAttempted: true });
  startupAttempted = true;
  const enabled = process.env.GXEON_AUDIT_AUTO_CREATE_FIRST_PROPOSAL === "true" && process.env.GXEON_AUDIT_WRITE_MODE === "enabled" && process.env.GXEON_AUDIT_ALLOW_DB_WRITES === "true";
  if (!enabled) return payload("BLOCKED", { autoRunEnabled: false, startupAttempted: true });
  const result = (await createOrReuseFirstProposalDraft()).payload;
  lastAutorunResult = result;
  return result;
}
