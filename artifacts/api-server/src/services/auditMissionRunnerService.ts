import { eq } from "drizzle-orm";
import {
  auditReports,
  auditScores,
  getDb,
  isDatabaseConfigured,
} from "@workspace/db";
import {
  getActiveAuditProviderDiagnostics,
  getAuditSchemaDiagnostics,
  getAuditWriteMode,
  supabaseFetch,
  validateAuditCaseWriteReadiness,
} from "./auditCaseService";
import {
  createFirstBaselineEvidenceFinding,
  findFirstInternalAuditCase,
  listEvidencesByCase,
  listFindingsByCase,
} from "./auditEvidenceFindingService";

const reportKey = "gxeon_internal_first_cycle";
const scoreBaselineKey = "gxeon_internal_first_cycle_score";

export const baselineScoreSpecs = [
  {
    moduleKey: "supabase_database_audit",
    score: "80.00",
    maxScore: "100.00",
    rationale:
      "Schema, provider and case persistence confirmed via Supabase REST; production write windows remain guarded.",
  },
  {
    moduleKey: "github_repository_audit",
    score: "70.00",
    maxScore: "100.00",
    rationale:
      "Repository audit case established; deeper code/repo evidence still requires operator-reviewed findings.",
  },
  {
    moduleKey: "deployment_audit",
    score: "75.00",
    maxScore: "100.00",
    rationale:
      "Railway/Vercel deploy path operational; score remains preliminary until report validation.",
  },
  {
    moduleKey: "api_backend_audit",
    score: "75.00",
    maxScore: "100.00",
    rationale:
      "Protected Audit OS endpoints exist and no-terminal flow works; additional endpoint hardening can improve score.",
  },
] as const;

export function authorizeMissionRunner(header: unknown) {
  const value = typeof header === "string" ? header : "";
  const token = value.startsWith("Bearer ") ? value.slice(7).trim() : "";
  if (!token)
    return {
      ok: false as const,
      status: 401,
      code: "MISSION_RUNNER_TOKEN_REQUIRED",
      message: "Authorization: Bearer token is required.",
    };
  const expected =
    process.env.GXEON_AUDIT_MISSION_RUNNER_TOKEN ||
    process.env.GXEON_AUDIT_OPERATOR_TOKEN;
  if (!expected)
    return {
      ok: false as const,
      status: 403,
      code: "MISSION_RUNNER_TOKEN_NOT_CONFIGURED",
      message: "Mission runner token is not configured.",
    };
  if (token !== expected)
    return {
      ok: false as const,
      status: 403,
      code: "MISSION_RUNNER_TOKEN_INVALID",
      message: "Mission runner token is invalid.",
    };
  return { ok: true as const };
}

function safePayload(extra: Record<string, unknown>) {
  return {
    system: "GXEON Audit OS",
    ok: true,
    sanitized: true,
    revenueConfirmed: 0,
    fakeClientCreated: false,
    fakeRevenueCreated: false,
    paymentCalls: false,
    connectorWrites: false,
    scrapingPerformed: false,
    secretsLogged: false,
    ...extra,
  };
}

async function existingScores(caseId: string) {
  const diagnostics = await getActiveAuditProviderDiagnostics();
  if (diagnostics.activeProvider === "supabase_rest") {
    return (await (
      await supabaseFetch(
        `audit_scores?select=*&case_id=eq.${encodeURIComponent(caseId)}&order=created_at.asc&limit=100`,
      )
    ).json()) as any[];
  }
  if (!isDatabaseConfigured()) return [];
  return await getDb()
    .select()
    .from(auditScores)
    .where(eq(auditScores.caseId, caseId))
    .limit(100);
}

async function existingReports(caseId: string) {
  const diagnostics = await getActiveAuditProviderDiagnostics();
  if (diagnostics.activeProvider === "supabase_rest") {
    return (await (
      await supabaseFetch(
        `audit_reports?select=*&case_id=eq.${encodeURIComponent(caseId)}&order=created_at.asc&limit=100`,
      )
    ).json()) as any[];
  }
  if (!isDatabaseConfigured()) return [];
  return await getDb()
    .select()
    .from(auditReports)
    .where(eq(auditReports.caseId, caseId))
    .limit(100);
}

function isBaselineScore(row: any, moduleKey: string) {
  return row?.module_key === moduleKey || row?.moduleKey === moduleKey
    ? row?.metadata?.baseline === true &&
        row?.metadata?.score_key === scoreBaselineKey
    : false;
}
function isBaselineReport(row: any) {
  return (
    row?.metadata?.baseline === true && row?.metadata?.report_key === reportKey
  );
}

async function createOrReuseScores(
  caseId: string,
  provider: "supabase_rest" | "postgres",
) {
  const rows = await existingScores(caseId);
  const scoreIds: string[] = [];
  let created = 0;
  for (const spec of baselineScoreSpecs) {
    const existing = rows.find((row) => isBaselineScore(row, spec.moduleKey));
    if (existing?.id) {
      scoreIds.push(existing.id);
      continue;
    }
    const metadata = {
      baseline: true,
      score_key: scoreBaselineKey,
      internal_case: true,
      operatorReviewed: false,
      commercialFinalScore: false,
      revenueConfirmed: 0,
      fakeClientCreated: false,
    };
    if (provider === "supabase_rest") {
      const inserted = (await (
        await supabaseFetch("audit_scores", {
          method: "POST",
          headers: { Prefer: "return=representation" },
          body: JSON.stringify({
            case_id: caseId,
            module_key: spec.moduleKey,
            score: spec.score,
            max_score: spec.maxScore,
            rationale: spec.rationale,
            metadata,
          }),
        })
      ).json()) as Array<{ id: string }>;
      if (inserted[0]?.id) scoreIds.push(inserted[0].id);
    } else {
      const inserted = await getDb()
        .insert(auditScores)
        .values({
          caseId,
          moduleKey: spec.moduleKey as any,
          score: spec.score,
          maxScore: spec.maxScore,
          rationale: spec.rationale,
          metadata,
        })
        .returning({ id: auditScores.id });
      if (inserted[0]?.id) scoreIds.push(inserted[0].id);
    }
    created += 1;
  }
  return { scoreIds, created, reused: scoreIds.length - created };
}

function buildReportContent(
  caseId: string,
  findingId: string | null,
  evidenceId: string | null,
  scoreIds: string[],
) {
  return {
    executive_summary:
      "Primeiro ciclo interno do GXEON Audit OS criado de forma protegida, idempotente e sem ações comerciais externas.",
    case_context: {
      first_case_confirmed: true,
      caseId,
      provider: "supabase_rest",
      internalOnly: true,
    },
    baseline_finding: { findingId, exists: Boolean(findingId) },
    baseline_evidence: {
      evidenceId,
      exists: Boolean(evidenceId),
      referenceOnly: true,
      noScraping: true,
    },
    initial_scores: {
      scoreIds,
      baseline: true,
      operatorReviewed: false,
      commercialFinalScore: false,
      scores: baselineScoreSpecs,
    },
    safety_posture: {
      fakeClientCreated: false,
      fakeRevenueCreated: false,
      connectorWrites: false,
      revenueConfirmed: 0,
      noPaymentCalls: true,
      noScraping: true,
      secretsLogged: false,
    },
    monetization_readiness: {
      readyForProposal: false,
      reason: "readyForProposal=false until commercial proposal layer is added",
      nextMission: "MISSION_007_AUDIT_OS_PROPOSAL_AND_OFFER",
    },
    next_actions: [
      "Review internal report",
      "Keep revenue confirmed at 0",
      "Add commercial proposal layer in MISSION_007",
    ],
  };
}

async function createOrReuseReport(
  caseId: string,
  provider: "supabase_rest" | "postgres",
  findingId: string | null,
  evidenceId: string | null,
  scoreIds: string[],
) {
  const existing = (await existingReports(caseId)).find(isBaselineReport);
  if (existing?.id) return { reportId: existing.id as string, created: false };
  const metadata = {
    baseline: true,
    report_key: reportKey,
    internal_case: true,
    fakeClientCreated: false,
    fakeRevenueCreated: false,
    revenueConfirmed: 0,
  };
  const content = buildReportContent(caseId, findingId, evidenceId, scoreIds);
  if (provider === "supabase_rest") {
    const rows = (await (
      await supabaseFetch("audit_reports", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({
          case_id: caseId,
          type: "INTERNAL_BRIEF",
          title: "Relatório Interno GXEON Audit OS — Primeiro Ciclo",
          content,
          generated_by: "gxeon_audit_mission_runner",
          metadata,
        }),
      })
    ).json()) as Array<{ id: string }>;
    return { reportId: rows[0]?.id ?? null, created: Boolean(rows[0]?.id) };
  }
  const rows = await getDb()
    .insert(auditReports)
    .values({
      caseId,
      type: "INTERNAL_BRIEF",
      title: "Relatório Interno GXEON Audit OS — Primeiro Ciclo",
      content,
      generatedBy: "gxeon_audit_mission_runner",
      metadata,
    })
    .returning({ id: auditReports.id });
  return { reportId: rows[0]?.id ?? null, created: Boolean(rows[0]?.id) };
}

export async function auditScoreReportCounts(caseId: string) {
  const [scores, reports] = await Promise.all([
    existingScores(caseId),
    existingReports(caseId),
  ]);
  return { scoresCount: scores.length, reportsCount: reports.length };
}

export async function runBaselineScoreReportMission() {
  const readiness = await validateAuditCaseWriteReadiness();
  if (!readiness.ok)
    return {
      status: readiness.status,
      payload: {
        system: "GXEON Audit OS",
        ok: false,
        sanitized: true,
        status: "BLOCKED",
        code: readiness.code,
        message: readiness.message,
        revenueConfirmed: 0,
        fakeClientCreated: false,
        fakeRevenueCreated: false,
        connectorWrites: false,
        paymentCalls: false,
        scrapingPerformed: false,
        secretsLogged: false,
      },
    };
  const schema = await getAuditSchemaDiagnostics();
  if (!schema.schemaReady)
    return {
      status: 503,
      payload: {
        system: "GXEON Audit OS",
        ok: false,
        sanitized: true,
        status: "BLOCKED",
        code: schema.code ?? "AUDIT_SCHEMA_NOT_READY",
        message: "Audit schema is not ready.",
      },
    };
  const firstCase = await findFirstInternalAuditCase();
  if (!firstCase)
    return {
      status: 404,
      payload: {
        system: "GXEON Audit OS",
        ok: false,
        sanitized: true,
        status: "BLOCKED",
        code: "FIRST_INTERNAL_CASE_NOT_FOUND",
        message: "First internal GXEON-AI Audit Case was not found.",
      },
    };
  const baseline = await createFirstBaselineEvidenceFinding();
  if (!baseline.payload.ok)
    return { status: baseline.status, payload: baseline.payload };
  const scoreResult = await createOrReuseScores(
    firstCase.caseId,
    readiness.provider,
  );
  const reportResult = await createOrReuseReport(
    firstCase.caseId,
    readiness.provider,
    (baseline.payload as any).findingId ?? null,
    (baseline.payload as any).evidenceId ?? null,
    scoreResult.scoreIds,
  );
  const [findings, evidences, counts] = await Promise.all([
    listFindingsByCase(firstCase.caseId),
    listEvidencesByCase(firstCase.caseId),
    auditScoreReportCounts(firstCase.caseId),
  ]);
  const created =
    (baseline.payload as any).status === "CREATED" ||
    scoreResult.created > 0 ||
    reportResult.created;
  return {
    status: created ? 201 : 200,
    payload: safePayload({
      status: created ? "CREATED" : "ALREADY_EXISTS",
      code: created
        ? "MISSION_BASELINE_SCORE_REPORT_CREATED"
        : "MISSION_BASELINE_SCORE_REPORT_REUSED",
      caseId: firstCase.caseId,
      findingId: (baseline.payload as any).findingId ?? null,
      evidenceId: (baseline.payload as any).evidenceId ?? null,
      scoreIds: scoreResult.scoreIds,
      reportId: reportResult.reportId,
      counts: {
        findingsCount: findings.items.length,
        evidencesCount: evidences.items.length,
        scoresCount: counts.scoresCount,
        reportsCount: counts.reportsCount,
      },
      first_case_confirmed: true,
      baseline_finding_exists: Boolean((baseline.payload as any).findingId),
      baseline_evidence_exists: Boolean((baseline.payload as any).evidenceId),
      score_rows_created_or_reused: scoreResult.scoreIds.length > 0,
      internal_report_created_or_reused: Boolean(reportResult.reportId),
      readyForProposal: false,
      nextRecommendedMission: "MISSION_007_AUDIT_OS_PROPOSAL_AND_OFFER",
      writeMode: getAuditWriteMode(),
    }),
  };
}
