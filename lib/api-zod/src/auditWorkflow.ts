import { z } from "zod";

export const auditCheckIds = [
  "vercel_api_routing",
  "vercel_security_headers",
] as const;
const text = (max: number) => z.string().trim().min(3).max(max);
export const auditWorkflowIntakeSchema = z
  .object({
    requestId: z.string().uuid(),
    assetName: text(180),
    assetReference: text(500),
    authorizationReference: text(500),
    authorized: z.literal(true),
    testData: z.boolean(),
    checks: z
      .array(z.enum(auditCheckIds))
      .min(1)
      .max(2)
      .refine((v) => new Set(v).size === v.length),
    artifact: z
      .object({
        name: z.literal("vercel.json"),
        content: z.string().min(2).max(16000),
      })
      .strict(),
  })
  .strict();
export const auditWorkflowReviewSchema = z
  .object({
    decision: z.enum(["approve", "reject"]),
    humanReviewed: z.literal(true),
    reviewReference: text(500),
  })
  .strict();
export const auditWorkflowCaseSchema = z
  .object({
    id: z.string().uuid(),
    title: z.string(),
    status: z.enum(["DRAFT", "IN_REVIEW", "READY_FOR_REPORT", "CLOSED"]),
    metadata: z.record(z.unknown()),
  })
  .passthrough();
export const auditWorkflowActionSchema = z.object({
  ok: z.literal(true),
  caseId: z.string().uuid(),
  status: z.enum(["DRAFT", "IN_REVIEW", "READY_FOR_REPORT", "CLOSED"]),
  evidenceId: z.string().uuid().optional(),
  reportId: z.string().uuid().optional(),
  reused: z.boolean().optional(),
});
export const auditWorkflowReportSchema = z.object({
  ok: z.literal(true),
  caseId: z.string().uuid(),
  reportId: z.string().uuid(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  report: z
    .object({
      version: z.literal("gx01-v1"),
      caseId: z.string().uuid(),
      title: z.string(),
      testData: z.boolean(),
      finalStatus: z.literal("CLOSED"),
      scope: auditWorkflowIntakeSchema.omit({ artifact: true }),
      review: z.object({
        decision: z.literal("approve"),
        reference: z.string().min(3),
        reviewedAt: z.string(),
        role: z.literal("reviewer"),
      }),
      evidence: z.array(
        z.object({
          id: z.string().uuid(),
          sha256: z.string().regex(/^[a-f0-9]{64}$/),
          capturedAt: z.string(),
          source: z.literal("operator_submitted_artifact"),
          content: z.string(),
        }),
      ),
      findings: z.array(
        z.object({
          id: z.string().uuid(),
          title: z.string(),
          summary: z.string(),
          recommendation: z.string(),
          evidenceIds: z.array(z.string().uuid()),
        }),
      ),
      limitations: z.array(z.string()),
      generatedAt: z.string(),
    })
    .passthrough(),
}).superRefine((value, ctx) => {
  if (value.caseId !== value.report.caseId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["report", "caseId"], message: "Report case must match its envelope." });
  }
  const ids = new Set(value.report.evidence.map((e) => e.id));
  if (ids.size !== value.report.evidence.length || ids.size !== 1) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["report", "evidence"], message: "GX-01 requires one identified submitted artifact." });
  }
  for (const [index, finding] of value.report.findings.entries()) {
    if (!finding.evidenceIds.length || finding.evidenceIds.some((id) => !ids.has(id))) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["report", "findings", index, "evidenceIds"], message: "Finding must reference this report's evidence." });
    }
  }
});
export const auditWorkflowDetailSchema = z.object({
  ok: z.literal(true),
  item: auditWorkflowCaseSchema,
  evidences: z.array(
    z
      .object({
        id: z.string().uuid(),
        case_id: z.string().uuid(),
        redacted_text: z.string(),
        metadata: z.record(z.unknown()),
      })
      .passthrough(),
  ),
  findings: z.array(
    z
      .object({
        id: z.string().uuid(),
        case_id: z.string().uuid(),
        title: z.string(),
        summary: z.string(),
        metadata: z.record(z.unknown()),
      })
      .passthrough(),
  ),
  reports: z.array(
    z
      .object({ id: z.string().uuid(), content: z.record(z.unknown()) })
      .passthrough(),
  ),
});
export type AuditWorkflowIntake = z.infer<typeof auditWorkflowIntakeSchema>;
export type AuditWorkflowDetail = z.infer<typeof auditWorkflowDetailSchema>;
