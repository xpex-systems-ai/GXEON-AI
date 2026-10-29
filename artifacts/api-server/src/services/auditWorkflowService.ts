import { getPool, type PoolClient } from "@workspace/db/pool";
import {
  auditWorkflowReviewSchema,
  auditWorkflowReportSchema,
  type AuditWorkflowIntake,
} from "@workspace/api-zod";
import {
  AuditWorkflowError,
  checkSubmittedConfig,
  digest,
  validateWorkflowIntake,
} from "./auditWorkflowChecks";

type State = "DRAFT" | "IN_REVIEW" | "READY_FOR_REPORT" | "CLOSED";
type Metadata = {
  workflow: "gx01-v1";
  portal?: { userId: string; organizationId: string };
  scope: Omit<AuditWorkflowIntake, "artifact">;
  artifactSha256: string;
  results?: ReturnType<typeof checkSubmittedConfig>;
  requestSha256: string;
  review?: {
    decision: "approve" | "reject";
    reference: string;
    reviewedAt: string;
    role: "reviewer";
  };
  reviewFingerprint?: string;
  events: { state: State; at: string; role: string; actorId?: string }[];
};
type CaseRow = { id: string; title: string; status: State; metadata: Metadata };
type EvidenceRow = {
  id: string;
  case_id: string;
  redacted_text: string;
  metadata: { sha256: string };
  captured_at: string;
};
type FindingRow = {
  id: string;
  case_id: string;
  title: string;
  summary: string;
  recommendation: string;
  metadata: { evidenceIds: string[]; checkId: string; sha256: string };
};
type ReportRow = {
  id: string;
  content: Record<string, unknown>;
  metadata: { contentSha256: string };
};
type Connection = Pick<PoolClient, "query" | "release">;
// Server-derived preview identity. Never accepted from intake JSON.
export type AuditWorkflowActor = { userId: string; organizationId: string; role: "operator" | "reviewer" };

const now = () => new Date().toISOString();
const fail = (status: number, code: string, message: string): never => {
  throw new AuditWorkflowError(status, code, message);
};
function writesEnabled() {
  if (
    process.env.GXEON_AUDIT_WRITE_MODE !== "enabled" ||
    process.env.GXEON_AUDIT_ALLOW_DB_WRITES !== "true"
  )
    fail(409, "WRITE_DISABLED", "Audit writes are disabled.");
  if (process.env.GXEON_AUDIT_DB_PROVIDER === "supabase_rest")
    fail(
      503,
      "TRANSACTIONAL_PROVIDER_REQUIRED",
      "GX-01 requires the PostgreSQL provider; REST fallback cannot provide this transaction.",
    );
}

// Existing public audit_* tables, parameterized queries and one transaction per state transition.
// Injecting a connection factory lets tests use an isolated PostgreSQL engine without remote credentials.
export function createAuditWorkflowService(
  connect: () => Promise<Connection> = () => getPool().connect(),
  actor?: AuditWorkflowActor,
) {
  const requireRole = (role: AuditWorkflowActor["role"]) => {
    if (actor && actor.role !== role) fail(403, "ROLE_DENIED", "This identity cannot perform this action.");
  };
  async function transaction<T>(
    fn: (client: Connection) => Promise<T>,
  ): Promise<T> {
    const client = await connect();
    try {
      await client.query("BEGIN");
      await client.query("SET LOCAL statement_timeout = '5s'");
      await client.query("SET LOCAL lock_timeout = '3s'");
      const result = await fn(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }
  async function locked(client: Connection, id: string) {
    const item = (
      await client.query<CaseRow>(
        "SELECT id, title, status, metadata FROM audit_cases WHERE id=$1 FOR UPDATE",
        [id],
      )
    ).rows[0];
    if (!item || item.metadata.workflow !== "gx01-v1")
      return fail(404, "CASE_NOT_FOUND", "GX-01 case was not found.");
    if (actor && (!item.metadata.portal || item.metadata.portal.organizationId !== actor.organizationId ||
        (actor.role !== "reviewer" && item.metadata.portal.userId !== actor.userId)))
      return fail(404, "CASE_NOT_FOUND", "GX-01 case was not found.");
    return item;
  }
  async function state(
    client: Connection,
    item: CaseRow,
    target: State,
    role: string,
  ) {
    item.metadata.events.push({ state: target, at: now(), role, ...(actor ? { actorId: actor.userId } : {}) });
    await client.query(
      "UPDATE audit_cases SET status=$2::audit_case_status, metadata=$3::jsonb, updated_at=now(), closed_at=CASE WHEN $2::text='CLOSED' THEN now() ELSE NULL END WHERE id=$1",
      [item.id, target, JSON.stringify(item.metadata)],
    );
    return { ok: true as const, caseId: item.id, status: target };
  }
  async function snapshot(client: Connection, id: string) {
    const evidences = (
      await client.query<EvidenceRow>(
        "SELECT * FROM audit_evidences WHERE case_id=$1 ORDER BY id",
        [id],
      )
    ).rows;
    const findings = (
      await client.query<FindingRow>(
        "SELECT * FROM audit_findings WHERE case_id=$1 ORDER BY id",
        [id],
      )
    ).rows;
    return { evidences, findings };
  }
  // JSONB can normalize object key order; hash canonical JSON, never driver-specific serialization order.
  function canonical(value: unknown): string {
    if (value instanceof Date) return JSON.stringify(value.toISOString());
    if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
    if (value && typeof value === "object")
      return `{${Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`)
        .join(",")}}`;
    return JSON.stringify(value) ?? "null";
  }
  return {
    forActor(identity: AuditWorkflowActor) { return createAuditWorkflowService(connect, identity); },
    async list() {
      if (!actor) return fail(403, "IDENTITY_REQUIRED", "An individual preview identity is required.");
      return transaction(async client => {
        const params = [actor.organizationId, actor.userId, actor.role === "reviewer"];
        const filter = "c.metadata->>'workflow'='gx01-v1' AND c.metadata->'portal'->>'organizationId'=$1 AND (c.metadata->'portal'->>'userId'=$2 OR $3::boolean)";
        const rows = (await client.query<{ id: string; title: string; status: State; createdAt: Date | string; updatedAt: Date | string; findingCount: number }>(
          `SELECT c.id,c.title,c.status,c.created_at AS "createdAt",c.updated_at AS "updatedAt",(SELECT count(*)::int FROM audit_findings f WHERE f.case_id=c.id) AS "findingCount" FROM audit_cases c WHERE ${filter} ORDER BY c.created_at DESC,c.id DESC LIMIT 51`, params)).rows;
        const counts = (await client.query<{ total: number; closed: number }>(`SELECT count(*)::int AS total,count(*) FILTER(WHERE c.status='CLOSED')::int AS closed FROM audit_cases c WHERE ${filter}`, params)).rows[0]!;
        const severity = (await client.query<{ severity: string; count: number }>(`SELECT f.severity::text AS severity,count(*)::int AS count FROM audit_findings f JOIN audit_cases c ON c.id=f.case_id WHERE ${filter} GROUP BY f.severity`, params)).rows;
        return { ok: true as const, items: rows.slice(0, 50).map(r => ({ ...r, createdAt: new Date(r.createdAt).toISOString(), updatedAt: new Date(r.updatedAt).toISOString() })), hasMore: rows.length > 50,
          summary: { total: counts.total, closed: counts.closed, open: counts.total - counts.closed, findingsBySeverity: Object.fromEntries(severity.map(r => [r.severity, r.count])) } };
      });
    },
    async create(body: unknown) {
      requireRole("operator");
      const input = validateWorkflowIntake(body);
      if (actor && !input.testData) return fail(400, "PREVIEW_TEST_DATA_REQUIRED", "Only synthetic data is permitted.");
      writesEnabled();
      return transaction(async (client) => {
        await client.query(
          "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
          [input.requestId],
        );
        const requestSha256 = digest(canonical(actor ? { input, owner: { userId: actor.userId, organizationId: actor.organizationId } } : input));
        const existing = (
          await client.query<CaseRow>(
            "SELECT id,title,status,metadata FROM audit_cases WHERE metadata->>'workflow'='gx01-v1' AND metadata->'scope'->>'requestId'=$1",
            [input.requestId],
          )
        ).rows[0];
        if (existing) {
          if (actor && (existing.metadata.portal?.userId !== actor.userId || existing.metadata.portal.organizationId !== actor.organizationId))
            return fail(404, "CASE_NOT_FOUND", "GX-01 case was not found.");
          if (existing.metadata.requestSha256 !== requestSha256)
            return fail(
              409,
              "REQUEST_ID_CONFLICT",
              "Request ID already belongs to a different intake payload.",
            );
          return {
            ok: true as const,
            caseId: existing.id,
            status: existing.status,
            reused: true,
          };
        }
        const { artifact, ...scope } = input;
        const sha256 = digest(artifact.content);
        const asset = (
          await client.query<{ id: string }>(
            "INSERT INTO audit_assets(type,label,reference_url,metadata) VALUES('DEPLOYMENT',$1,$2,$3::jsonb) RETURNING id",
            [
              scope.assetName,
              scope.assetReference,
              JSON.stringify({ workflow: "gx01-v1", testData: scope.testData }),
            ],
          )
        ).rows[0]!;
        const metadata: Metadata = {
          workflow: "gx01-v1",
          ...(actor ? { portal: { userId: actor.userId, organizationId: actor.organizationId } } : {}),
          scope,
          artifactSha256: sha256,
          requestSha256,
          events: [{ state: "DRAFT", at: now(), role: "operator", ...(actor ? { actorId: actor.userId } : {}) }],
        };
        const item = (
          await client.query<{ id: string }>(
            "INSERT INTO audit_cases(asset_id,title,status,metadata) VALUES($1,$2,'DRAFT',$3::jsonb) RETURNING id",
            [
              asset.id,
              `${scope.testData ? "[TEST DATA] " : ""}${scope.assetName}`,
              JSON.stringify(metadata),
            ],
          )
        ).rows[0]!;
        const evidence = (
          await client.query<{ id: string }>(
            "INSERT INTO audit_evidences(case_id,type,title,redacted_text,metadata) VALUES($1,'REDACTED_CONFIG','Submitted vercel.json',$2,$3::jsonb) RETURNING id",
            [
              item.id,
              artifact.content,
              JSON.stringify({
                workflow: "gx01-v1",
                sha256,
                source: "operator_submitted_artifact",
                testData: scope.testData,
              }),
            ],
          )
        ).rows[0]!;
        return {
          ok: true as const,
          caseId: item.id,
          evidenceId: evidence.id,
          status: "DRAFT" as const,
        };
      });
    },
    async detail(id: string) {
      return transaction(async (client) => {
        const item = await locked(client, id);
        const evidences = (
          await client.query<EvidenceRow>(
            "SELECT * FROM audit_evidences WHERE case_id=$1 ORDER BY captured_at,id",
            [id],
          )
        ).rows;
        const findings = (
          await client.query<FindingRow>(
            "SELECT * FROM audit_findings WHERE case_id=$1 ORDER BY created_at,id",
            [id],
          )
        ).rows;
        const reports = (
          await client.query<ReportRow>(
            "SELECT id,content FROM audit_reports WHERE case_id=$1 ORDER BY created_at,id",
            [id],
          )
        ).rows;
        // Every read surface, including the enterprise HTTP API, must anchor
        // stored evidence to the independent digest written at case intake.
        // A matching digest rewritten inside the evidence record is not proof.
        const evidence = evidences[0];
        if (evidences.length !== 1 || !evidence || evidence.case_id !== item.id ||
            typeof item.metadata.artifactSha256 !== "string" ||
            typeof evidence.metadata.sha256 !== "string" ||
            evidence.metadata.sha256 !== item.metadata.artifactSha256 ||
            digest(evidence.redacted_text) !== item.metadata.artifactSha256)
          return fail(409, "EVIDENCE_INTEGRITY_FAILED", "Submitted evidence does not match the canonical case intake hash.");
        return { ok: true as const, item, evidences, findings, reports };
      });
    },
    async run(id: string) {
      requireRole("operator");
      writesEnabled();
      return transaction(async (client) => {
        const item = await locked(client, id);
        if (item.status !== "DRAFT")
          return {
            ok: true as const,
            caseId: id,
            status: item.status,
            reused: true,
          };
        const evidence = (
          await client.query<EvidenceRow>(
            "SELECT * FROM audit_evidences WHERE case_id=$1 AND metadata->>'workflow'='gx01-v1'",
            [id],
          )
        ).rows[0];
        if (
          !evidence ||
          digest(evidence.redacted_text) !== item.metadata.artifactSha256 ||
          evidence.metadata.sha256 !== item.metadata.artifactSha256
        )
          return fail(
            409,
            "EVIDENCE_INTEGRITY_FAILED",
            "Submitted artifact hash does not match the case.",
          );
        const results = checkSubmittedConfig(
          evidence.redacted_text,
          item.metadata.scope.checks,
        );
        for (const result of results.filter((r) => r.outcome === "observed")) {
          await client.query(
            "INSERT INTO audit_findings(case_id,module_key,title,severity,summary,recommendation,metadata) VALUES($1,'deployment_audit',$2,'MEDIUM',$3,$4,$5::jsonb)",
            [
              id,
              result.checkId,
              result.summary,
              result.recommendation,
              JSON.stringify({
                workflow: "gx01-v1",
                checkId: result.checkId,
                evidenceIds: [evidence.id],
                sha256: evidence.metadata.sha256,
                testData: item.metadata.scope.testData,
              }),
            ],
          );
        }
        item.metadata.results = results;
        return state(client, item, "IN_REVIEW", "operator");
      });
    },
    async review(id: string, body: unknown) {
      requireRole("reviewer");
      const parsed = auditWorkflowReviewSchema.safeParse(body);
      if (!parsed.success)
        return fail(
          400,
          "INVALID_REVIEW",
          "A decision, human review attestation and reference are required.",
        );
      if (
        /(?:bearer\s|password|secret|token|api[_-]?key|postgres(?:ql)?:\/\/|[?#]|:\/\/[^/]*@)/i.test(
          parsed.data.reviewReference,
        )
      )
        return fail(
          400,
          "UNSAFE_REFERENCE",
          "Review reference must not contain credentials or query strings.",
        );
      writesEnabled();
      return transaction(async (client) => {
        const item = await locked(client, id);
        if (item.status !== "IN_REVIEW")
          return fail(
            409,
            "INVALID_STATE",
            "Only IN_REVIEW cases can be reviewed.",
          );
        if (actor && item.metadata.portal?.userId === actor.userId)
          return fail(403, "SELF_REVIEW_DENIED", "The case author cannot review this case, including after a role change.");
        item.metadata.review = {
          decision: parsed.data.decision,
          reference: parsed.data.reviewReference,
          reviewedAt: now(),
          role: "reviewer",
        };
        item.metadata.reviewFingerprint = digest(
          canonical(await snapshot(client, id)),
        );
        // Rejection remains in review; the immutable evidence can be reassessed by the reviewer.
        return state(
          client,
          item,
          parsed.data.decision === "approve" ? "READY_FOR_REPORT" : "IN_REVIEW",
          "reviewer",
        );
      });
    },
    async finalize(id: string) {
      requireRole("operator");
      writesEnabled();
      return transaction(async (client) => {
        const item = await locked(client, id);
        if (item.status === "CLOSED") {
          const report = (
            await client.query<{ id: string }>(
              "SELECT id FROM audit_reports WHERE case_id=$1 AND metadata->>'workflow'='gx01-v1'",
              [id],
            )
          ).rows[0];
          if (!report)
            return fail(
              409,
              "REPORT_MISSING",
              "Closed case has no GX-01 report.",
            );
          return {
            ok: true as const,
            caseId: id,
            status: "CLOSED" as const,
            reportId: report.id,
            reused: true,
          };
        }
        if (
          item.status !== "READY_FOR_REPORT" ||
          item.metadata.review?.decision !== "approve"
        )
          return fail(
            409,
            "REVIEW_REQUIRED",
            "Independent approval is required before report generation.",
          );
        const data = await snapshot(client, id);
        if (digest(canonical(data)) !== item.metadata.reviewFingerprint)
          return fail(
            409,
            "REVIEW_STALE",
            "Evidence or findings changed after review.",
          );
        const { evidences, findings } = data;
        if (
          evidences.length !== 1 ||
          evidences.some(
            (e) =>
              digest(e.redacted_text) !== item.metadata.artifactSha256 ||
              e.metadata.sha256 !== item.metadata.artifactSha256,
          )
        )
          return fail(
            409,
            "EVIDENCE_INTEGRITY_FAILED",
            "Evidence changed after intake.",
          );
        if (
          findings.some(
            (f) =>
              !f.metadata.evidenceIds?.length ||
              f.metadata.evidenceIds.some(
                (eid) =>
                  !evidences.some(
                    (e) =>
                      e.id === eid &&
                      e.case_id === id &&
                      e.metadata.sha256 === f.metadata.sha256,
                  ),
              ),
          )
        )
          return fail(
            409,
            "FINDING_REFERENCE_INVALID",
            "Every finding must reference this case's verified evidence.",
          );
        await state(client, item, "CLOSED", "operator");
        const content = {
          version: "gx01-v1",
          caseId: id,
          title: item.title,
          testData: item.metadata.scope.testData,
          scope: item.metadata.scope,
          results: item.metadata.results,
          review: item.metadata.review,
          evidence: evidences.map((e) => ({
            id: e.id,
            sha256: e.metadata.sha256,
            capturedAt: e.captured_at,
            source: "operator_submitted_artifact",
            content: e.redacted_text,
          })),
          findings: findings.map((f) => ({
            id: f.id,
            title: f.title,
            summary: f.summary,
            recommendation: f.recommendation,
            evidenceIds: f.metadata.evidenceIds,
          })),
          limitations: [
            "Static inspection of operator-submitted vercel.json only.",
            "No deployed route, runtime header, external asset ownership or remote provider was verified.",
            "Review records a separate credential holder's human-review attestation; identity is not independently verified.",
            "No payments, network scans or external connector writes.",
          ],
          generatedAt: now(),
          finalStatus: "CLOSED",
          events: item.metadata.events,
        };
        const report = (
          await client.query<{ id: string }>(
            "INSERT INTO audit_reports(case_id,type,title,content,generated_by,metadata) VALUES($1,'TECHNICAL_REPORT',$2,$3::jsonb,'gx01-v1',$4::jsonb) RETURNING id",
            [
              id,
              item.title,
              JSON.stringify(content),
              JSON.stringify({
                workflow: "gx01-v1",
                contentSha256: digest(canonical(content)),
                testData: item.metadata.scope.testData,
              }),
            ],
          )
        ).rows[0]!;
        return {
          ok: true as const,
          caseId: id,
          status: "CLOSED" as const,
          reportId: report.id,
        };
      });
    },
    async exportReport(id: string) {
      return transaction(async (client) => {
        const item = await locked(client, id);
        const report = (
          await client.query<ReportRow>(
            "SELECT id,content,metadata FROM audit_reports WHERE case_id=$1 AND metadata->>'workflow'='gx01-v1'",
            [id],
          )
        ).rows[0];
        if (item.status !== "CLOSED" || !report)
          return fail(
            409,
            "REPORT_NOT_READY",
            "The approved case must be finalized before export.",
          );
        const sha256 = digest(canonical(report.content));
        if (sha256 !== report.metadata.contentSha256)
          return fail(
            409,
            "REPORT_INTEGRITY_FAILED",
            "Stored report does not match its hash.",
          );
        const exported = {
          ok: true as const,
          caseId: id,
          reportId: report.id,
          sha256,
          report: report.content,
        };
        const verified = auditWorkflowReportSchema.safeParse(exported);
        if (!verified.success) return fail(409, "REPORT_REFERENCE_INVALID", "Stored report does not satisfy the evidence-reference contract.");
        if (verified.data.report.evidence.some((e) => digest(e.content) !== e.sha256))
          return fail(409, "REPORT_EVIDENCE_INTEGRITY_FAILED", "Embedded evidence does not match its hash.");
        // Cross-check against independently stored case facts, not just the
        // report's own content and digest.
        const content = verified.data.report;
        if (content.title !== item.title ||
            content.testData !== item.metadata.scope.testData ||
            canonical(content.scope) !== canonical(item.metadata.scope) ||
            canonical(content.review) !== canonical(item.metadata.review) ||
            content.evidence.some((e) => e.sha256 !== item.metadata.artifactSha256))
          return fail(409, "REPORT_CANONICAL_MISMATCH", "Report differs from the canonical audit case.");
        return exported;
      });
    },
  };
}
export type AuditWorkflowService = ReturnType<
  typeof createAuditWorkflowService
>;
