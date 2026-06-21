import { asc, eq } from "drizzle-orm";
import { auditCases, auditProposals, getDb } from "@workspace/db";
import {
  detectPotentialSecrets,
  getActiveAuditProviderDiagnostics,
  supabaseFetch,
  validateAuditCaseWriteReadiness,
} from "./auditCaseService";
import { buildProposalPreview } from "./auditProposalService";
import { getAuditOffer } from "./auditOfferCatalogService";

const SOURCE = "mission_007_2_close_loop";
const LEGACY_SOURCE = "mission_007_1_autorunner";
const IDEMPOTENCY_KEY = "mission_007_2_first_proposal_draft_close_loop";
const LEGACY_IDEMPOTENCY_KEY = "mission_007_1_internal_first_proposal";
const TITLE = "Proposta Interna — Auditoria Técnica Completa GXEON";
const NEXT =
  "Review first proposal DRAFT manually and decide whether to send outside the system.";
type Provider = "supabase_rest" | "postgres";
type RunCode =
  | "CREATED"
  | "REUSED"
  | "ALREADY_EXISTS"
  | "WRITE_DISABLED"
  | "BLOCKED_NO_CASE"
  | "BLOCKED_NO_OFFER"
  | "BLOCKED_PROVIDER_NOT_READY"
  | "BLOCKED_TABLE_NOT_READY"
  | "BLOCKED_SECRET_LIKE_CONTENT"
  | "BLOCKED_SCHEMA_MISMATCH"
  | "BLOCKED";
let lastAutorunResult: any = null;
let startupAttempted = false;

function allowedLanguage() {
  return process.env.GXEON_AUDIT_DEFAULT_PROPOSAL_LANGUAGE === "en-US"
    ? "en-US"
    : "pt-BR";
}
function selectOfferKey() {
  const requested =
    process.env.GXEON_AUDIT_DEFAULT_OFFER_KEY || "technical_audit";
  if (getAuditOffer(requested)) return requested;
  if (getAuditOffer("technical_audit")) return "technical_audit";
  if (getAuditOffer("audit_express")) return "audit_express";
  return null;
}
function rowStatus(row: any) {
  return row?.status ?? row?.metadata?.proposalStatus ?? "DRAFT";
}
function rowOfferKey(row: any) {
  return row?.offer_key ?? row?.offerKey ?? row?.metadata?.offerKey;
}
function sanitizeProposal(row: any) {
  const metadata =
    row?.metadata &&
    !detectPotentialSecrets(JSON.stringify(row.metadata)).detected
      ? row.metadata
      : {};
  return {
    proposalId: row?.id,
    caseId: row?.case_id ?? row?.caseId ?? metadata.caseId,
    offerKey: rowOfferKey({ ...row, metadata }) ?? "technical_audit",
    proposalStatus: rowStatus({ ...row, metadata }),
    status: rowStatus({ ...row, metadata }),
    priceTarget: Number(row?.amount ?? metadata.priceTarget ?? 0),
    currency: row?.currency ?? "BRL",
  };
}
function payload(code: RunCode, extra: Record<string, unknown> = {}) {
  return {
    system: "GXEON Audit OS",
    ok: ["CREATED", "REUSED", "ALREADY_EXISTS"].includes(code),
    code,
    status: code,
    sanitized: true,
    activeProvider: null,
    caseExists: false,
    proposalExists: false,
    proposalId: null,
    proposalStatus: null,
    proposalCount: 0,
    offerKey: null,
    readyForManualReview: false,
    readyForRevenueProof: false,
    autoSend: false,
    paymentCalls: false,
    checkoutCreated: false,
    invoiceCreated: false,
    revenueEventCreated: false,
    fakeClientCreated: false,
    fakeRevenueCreated: false,
    connectorWrites: false,
    confirmedRevenue: 0,
    nextOperatorAction: NEXT,
    ...extra,
  };
}
async function firstCaseId(provider: Provider) {
  if (provider === "supabase_rest")
    return (
      (await (
        await supabaseFetch(
          "audit_cases?select=id,created_at&order=created_at.asc&limit=1",
        )
      ).json()) as any[]
    )[0]?.id as string | undefined;
  return (
    await getDb()
      .select({ id: auditCases.id })
      .from(auditCases)
      .orderBy(asc(auditCases.createdAt))
      .limit(1)
  )[0]?.id;
}
async function proposalsForCase(provider: Provider, caseId: string) {
  if (provider === "supabase_rest")
    return (await (
      await supabaseFetch(
        `audit_proposals?select=*&case_id=eq.${encodeURIComponent(caseId)}&order=created_at.asc&limit=100`,
      )
    ).json()) as any[];
  return getDb()
    .select()
    .from(auditProposals)
    .where(eq(auditProposals.caseId, caseId))
    .orderBy(asc(auditProposals.createdAt))
    .limit(100);
}
async function countForCase(provider: Provider, caseId: string) {
  return (await proposalsForCase(provider, caseId)).length;
}
function isReusableFirst(row: any) {
  const m = row?.metadata ?? {};
  const status = rowStatus(row);
  const safeStatus =
    status === "DRAFT" || status === "READY_FOR_OPERATOR_REVIEW";
  const internal =
    m.internal_first_proposal === true &&
    [SOURCE, LEGACY_SOURCE].includes(m.source) &&
    [IDEMPOTENCY_KEY, LEGACY_IDEMPOTENCY_KEY].includes(m.idempotencyKey);
  const offerMatch =
    (rowOfferKey(row) === "technical_audit" ||
      rowOfferKey(row) === selectOfferKey()) &&
    safeStatus;
  return safeStatus && (internal || offerMatch);
}
async function proposalTableReady(provider: Provider) {
  try {
    if (provider === "supabase_rest")
      return (await supabaseFetch("audit_proposals?select=id&limit=1")).ok;
    await getDb()
      .select({ id: auditProposals.id })
      .from(auditProposals)
      .limit(1);
    return true;
  } catch {
    return false;
  }
}

export async function getFirstProposalDraftStatus() {
  const diagnostics = await getActiveAuditProviderDiagnostics();
  const activeProvider = diagnostics.activeProvider;
  if (!activeProvider)
    return payload("BLOCKED_PROVIDER_NOT_READY", {
      activeProvider,
      lastAutorunResult,
    });
  const caseId = await firstCaseId(activeProvider);
  if (!caseId)
    return payload("BLOCKED_NO_CASE", {
      activeProvider,
      caseExists: false,
      lastAutorunResult,
    });
  if (!(await proposalTableReady(activeProvider)))
    return payload("BLOCKED_TABLE_NOT_READY", {
      activeProvider,
      caseExists: true,
      caseId,
      lastAutorunResult,
    });
  const proposals = await proposalsForCase(activeProvider, caseId);
  const proposal = proposals.find(isReusableFirst);
  const safe = proposal ? sanitizeProposal(proposal) : {};
  const proposalStatus = proposal ? (safe as any).proposalStatus : null;
  return payload(proposal ? "ALREADY_EXISTS" : "BLOCKED", {
    activeProvider,
    caseExists: true,
    caseId,
    proposalExists: Boolean(proposal),
    proposalCount: proposals.length,
    proposalStatus,
    readyForManualReview:
      proposalStatus === "DRAFT" ||
      proposalStatus === "READY_FOR_OPERATOR_REVIEW",
    ...safe,
    lastAutorunResult,
  });
}

export async function previewFirstProposalDraftRun() {
  const diagnostics = await getActiveAuditProviderDiagnostics();
  const activeProvider = diagnostics.activeProvider;
  if (!activeProvider)
    return payload("BLOCKED_PROVIDER_NOT_READY", {
      activeProvider,
      providerReady: false,
      tableReady: false,
    });
  const caseId = await firstCaseId(activeProvider);
  if (!caseId)
    return payload("BLOCKED_NO_CASE", {
      activeProvider,
      providerReady: true,
      tableReady: false,
    });
  const tableReady = await proposalTableReady(activeProvider);
  const offerKey = selectOfferKey();
  if (!offerKey)
    return payload("BLOCKED_NO_OFFER", {
      activeProvider,
      caseExists: true,
      caseId,
      providerReady: true,
      tableReady,
    });
  const proposals = tableReady
    ? await proposalsForCase(activeProvider, caseId)
    : [];
  const existing = proposals.find(isReusableFirst);
  const preview = await buildProposalPreview({
    caseId,
    offerKey,
    language: allowedLanguage(),
    assetName: "GXEON-AI Repository",
  });
  return payload(
    existing
      ? "ALREADY_EXISTS"
      : tableReady
        ? "BLOCKED"
        : "BLOCKED_TABLE_NOT_READY",
    {
      activeProvider,
      noWrite: true,
      providerReady: true,
      tableReady,
      caseExists: true,
      caseId,
      proposalExists: Boolean(existing),
      proposalCount: proposals.length,
      ...(existing ? sanitizeProposal(existing) : {}),
      wouldCreate: !existing && tableReady,
      proposalPayloadPreview: existing
        ? null
        : {
            case_id: caseId,
            title: TITLE,
            status: "DRAFT",
            currency: "BRL",
            amount: preview.proposal.priceTarget,
            metadata: {
              internal_first_proposal: true,
              source: SOURCE,
              idempotencyKey: IDEMPOTENCY_KEY,
              offerKey,
              proposalStatus: "DRAFT",
              language: preview.proposal.language,
              proofRequired: true,
              autoSend: false,
              paymentCalls: false,
            },
          },
    },
  );
}

export async function createOrReuseFirstProposalDraftCloseLoop() {
  const readiness = await validateAuditCaseWriteReadiness();
  if (!readiness.ok)
    return {
      status: readiness.status,
      payload: payload(
        readiness.code === "WRITE_DISABLED"
          ? "WRITE_DISABLED"
          : "BLOCKED_PROVIDER_NOT_READY",
        { message: readiness.message },
      ),
    };
  const provider = readiness.provider;
  if (!(await proposalTableReady(provider)))
    return {
      status: 503,
      payload: payload("BLOCKED_TABLE_NOT_READY", { activeProvider: provider }),
    };
  const caseId = await firstCaseId(provider);
  if (!caseId)
    return {
      status: 409,
      payload: payload("BLOCKED_NO_CASE", { activeProvider: provider }),
    };
  const existing = (await proposalsForCase(provider, caseId)).find(
    isReusableFirst,
  );
  if (existing)
    return {
      status: 200,
      payload: payload("REUSED", {
        activeProvider: provider,
        caseExists: true,
        proposalExists: true,
        ...sanitizeProposal(existing),
        proposalCount: await countForCase(provider, caseId),
        readyForManualReview: true,
      }),
    };
  const offerKey = selectOfferKey();
  if (!offerKey)
    return {
      status: 409,
      payload: payload("BLOCKED_NO_OFFER", {
        activeProvider: provider,
        caseExists: true,
        caseId,
      }),
    };
  const preview = await buildProposalPreview({
    caseId,
    offerKey,
    language: allowedLanguage(),
    assetName: "GXEON-AI Repository",
  });
  const metadata = {
    baseline: true,
    internal_first_proposal: true,
    source: SOURCE,
    idempotencyKey: IDEMPOTENCY_KEY,
    auto_send: false,
    payment_call: false,
    revenue_confirmed: false,
    requires_operator_review: true,
    offerKey,
    proposalStatus: "DRAFT",
    proposalCopy: preview.proposal.proposalCopy,
    scope: preview.proposal.scope,
    deliverables: preview.proposal.deliverables,
    language: preview.proposal.language,
    proofRequired: true,
    paymentCalls: false,
    autoSend: false,
  };
  if (
    detectPotentialSecrets(JSON.stringify({ title: TITLE, metadata })).detected
  )
    return {
      status: 400,
      payload: payload("BLOCKED_SECRET_LIKE_CONTENT", {
        activeProvider: provider,
        caseExists: true,
        caseId,
        offerKey,
      }),
    };
  const values = {
    case_id: caseId,
    title: TITLE,
    status: "DRAFT",
    currency: "BRL",
    amount: preview.proposal.priceTarget,
    metadata,
  };
  const rows =
    provider === "supabase_rest"
      ? ((await (
          await supabaseFetch("audit_proposals", {
            method: "POST",
            headers: { Prefer: "return=representation" },
            body: JSON.stringify(values),
          })
        ).json()) as any[])
      : await getDb()
          .insert(auditProposals)
          .values({
            caseId,
            title: TITLE,
            status: "DRAFT",
            currency: "BRL",
            amount: String(preview.proposal.priceTarget),
            metadata,
          })
          .returning();
  const safe = sanitizeProposal(rows[0]);
  const result = payload("CREATED", {
    activeProvider: provider,
    caseExists: true,
    proposalExists: true,
    ...safe,
    proposalCount: await countForCase(provider, caseId),
    proposalCountAfterRun: await countForCase(provider, caseId),
    readyForManualReview: true,
  });
  lastAutorunResult = result;
  return { status: 201, payload: result };
}

export const createOrReuseFirstProposalDraft =
  createOrReuseFirstProposalDraftCloseLoop;

export async function maybeRunFirstProposalAutorunnerOnStartup() {
  if (startupAttempted)
    return (
      lastAutorunResult ??
      payload("BLOCKED", { autoRunEnabled: false, startupAttempted: true })
    );
  startupAttempted = true;
  const enabled =
    process.env.GXEON_AUDIT_AUTO_CREATE_FIRST_PROPOSAL === "true" &&
    process.env.GXEON_AUDIT_WRITE_MODE === "enabled" &&
    process.env.GXEON_AUDIT_ALLOW_DB_WRITES === "true";
  if (!enabled)
    return payload("BLOCKED", {
      autoRunEnabled: false,
      startupAttempted: true,
    });
  const result = (await createOrReuseFirstProposalDraftCloseLoop()).payload;
  lastAutorunResult = result;
  return result;
}
