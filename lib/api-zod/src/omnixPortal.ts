import { z } from "zod";
import {
  auditWorkflowCaseSchema,
  auditWorkflowDetailSchema,
  auditWorkflowIntakeSchema,
} from "./auditWorkflow";
export const omnixPreviewIdentitySchema = z
  .object({
    id: z.string().regex(/^test-[a-z0-9-]{1,60}$/),
    organizationId: z.string().regex(/^test-[a-z0-9-]{1,60}$/),
    name: z.string().min(3).max(80),
    role: z.enum(["operator", "reviewer"]),
    accessCodeSha256: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();
export const omnixPreviewIdentitiesSchema = z
  .array(omnixPreviewIdentitySchema)
  .min(2)
  .max(10);
export const omnixPreviewLoginSchema = z
  .object({
    identity: z.string().min(1).max(70),
    code: z.string().regex(/^[A-Za-z0-9_-]{43,128}$/),
  })
  .strict();
export const omnixCaseIdSchema = z.string().uuid();

export const omnixProfileSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  name: z.string(),
  role: z.enum(["operator", "reviewer"]),
});
export const omnixSessionSchema = z.object({
  ok: z.literal(true),
  preview: z.literal(true),
  customerDataAllowed: z.literal(false),
  user: omnixProfileSchema,
  expiresAt: z.string().datetime(),
});
export const omnixStatusSchema = z.object({
  ok: z.literal(true),
  preview: z.literal(true),
  customerDataAllowed: z.literal(false),
});
export const omnixCasesSchema = z.object({
  ok: z.literal(true),
  hasMore: z.boolean(),
  items: z
    .array(
      z.object({
        id: z.string().uuid(),
        title: z.string(),
        status: z.enum(["DRAFT", "IN_REVIEW", "READY_FOR_REPORT", "CLOSED"]),
        createdAt: z.string().datetime(),
        updatedAt: z.string().datetime(),
        findingCount: z.number().int().nonnegative(),
      }),
    )
    .max(50),
  summary: z.object({
    total: z.number().int().nonnegative(),
    closed: z.number().int().nonnegative(),
    open: z.number().int().nonnegative(),
    findingsBySeverity: z.record(z.string(), z.number().int().nonnegative()),
  }),
});
export type OmnixSession = z.infer<typeof omnixSessionSchema>;
export type OmnixCases = z.infer<typeof omnixCasesSchema>;
export const omnixDetailSchema = auditWorkflowDetailSchema.extend({
  item: auditWorkflowCaseSchema.extend({
    metadata: z
      .object({
        workflow: z.literal("gx01-v1"),
        scope: auditWorkflowIntakeSchema.omit({ artifact: true }),
        results: z
          .array(
            z.object({
              checkId: z.enum([
                "vercel_api_routing",
                "vercel_security_headers",
              ]),
              outcome: z.enum(["observed", "not_observed", "not_verified"]),
              summary: z.string(),
              recommendation: z.string(),
            }),
          )
          .max(2)
          .optional(),
        review: z
          .object({
            role: z.literal("reviewer"),
            decision: z.enum(["approve", "reject"]),
            reference: z.string(),
            reviewedAt: z.string(),
          })
          .optional(),
      })
      .passthrough(),
  }),
  findings: z.array(
    auditWorkflowDetailSchema.shape.findings.element.extend({
      recommendation: z.string(),
      severity: z.string().optional(),
    }),
  ),
});
export type OmnixDetail = z.infer<typeof omnixDetailSchema>;
