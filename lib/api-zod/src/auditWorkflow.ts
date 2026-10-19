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
      evidence: z.array(
        z.object({
          id: z.string().uuid(),
          sha256: z.string(),
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
