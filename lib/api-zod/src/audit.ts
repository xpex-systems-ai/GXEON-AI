import { z } from "zod";

export const auditModuleKeys = ["website_audit", "ecommerce_audit", "ux_checkout_audit", "seo_basic_audit", "tracking_pixel_audit", "security_basic_audit", "github_repository_audit", "codebase_audit", "supabase_database_audit", "deployment_audit", "api_backend_audit", "ai_automation_audit", "business_offer_audit", "funnel_audit", "content_landing_page_audit"] as const;
export const auditAssetTypes = ["website", "ecommerce", "landing_page", "github_repository", "codebase", "supabase_project", "deployment", "api_backend", "business_funnel", "content_page", "other"] as const;
export const auditPriorities = ["low", "medium", "high", "critical"] as const;
export const auditSources = ["operator_manual", "mission_control", "internal_referral", "client_request"] as const;

const safeReference = z.string().trim().min(3).max(2048).refine((value) => {
  if (/^https?:\/\//i.test(value)) {
    return /^https?:\/\/[\w.-]+(?::\d+)?(?:[\/?#][^\s]*)?$/i.test(value);
  }
  return /^(git@|[\w.-]+\/[\w./-]+|[\w./:@-]+)$/i.test(value);
}, "Provide a valid URL or repository reference. External fetches are not executed.");

export const auditCaseIntakeRequestSchema = z.object({
  assetName: z.string().trim().min(2).max(180),
  assetUrl: safeReference,
  assetType: z.enum(auditAssetTypes),
  auditGoal: z.string().trim().min(8).max(1000),
  selectedModules: z.array(z.enum(auditModuleKeys)).min(1).max(10),
  priority: z.enum(auditPriorities),
  source: z.enum(auditSources),
  clientName: z.string().trim().min(2).max(160).optional(),
  clientEmail: z.string().trim().email().max(180).optional(),
  clientPhone: z.string().trim().min(6).max(40).optional(),
  operatorNotes: z.string().trim().max(2000).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(12).optional(),
  expectedDelivery: z.string().trim().max(80).optional(),
  commercialIntent: z.enum(["none", "internal_review", "proposal_candidate"]).optional(),
});

export const auditCasePreviewSchema = z.object({
  previewId: z.string(),
  caseTitle: z.string(),
  initialStatus: z.literal("DRAFT"),
  writeMode: z.enum(["disabled", "preview_only", "enabled"]),
  writeAllowed: z.boolean(),
  degradedSafe: z.boolean(),
  selectedModules: z.array(z.object({ key: z.enum(auditModuleKeys), name: z.string(), category: z.string(), defaultWeight: z.number() })),
  intake: auditCaseIntakeRequestSchema,
  warnings: z.array(z.string()),
  nextSafeAction: z.string(),
});

export const auditCasePreviewResponseSchema = z.object({ system: z.literal("GXEON Audit OS"), ok: z.literal(true), preview: auditCasePreviewSchema });
export const auditCaseCreateResponseSchema = z.object({ system: z.literal("GXEON Audit OS"), ok: z.boolean(), code: z.string(), caseId: z.string().optional(), preview: auditCasePreviewSchema, message: z.string() });

export const auditHealthResponseSchema = z.object({
  system: z.literal("GXEON Audit OS"),
  readiness: z.string(),
  databaseConfigured: z.boolean(),
  schemaRegistered: z.boolean(),
  safeMode: z.literal(true),
  productionMutationEnabled: z.boolean(),
});
export const auditModuleContractSchema = z.object({ key: z.string(), name: z.string(), description: z.string(), category: z.string(), defaultWeight: z.number(), checklistItems: z.array(z.string()), riskSignals: z.array(z.string()), recommendedEvidenceTypes: z.array(z.string()), safeMode: z.literal(true) });
export const auditModulesResponseSchema = z.object({ system: z.literal("GXEON Audit OS"), count: z.number(), modules: z.array(auditModuleContractSchema) });
export const auditSchemaMapResponseSchema = z.object({ system: z.literal("GXEON Audit OS"), sourceOfTruth: z.string(), safeMode: z.boolean(), productionMigrationsExecuted: z.boolean(), enums: z.array(z.string()), tables: z.array(z.object({ name: z.string(), purpose: z.string() })), invariants: z.array(z.string()) });

export type AuditCaseIntakeRequest = z.infer<typeof auditCaseIntakeRequestSchema>;
export type AuditCasePreviewResponse = z.infer<typeof auditCasePreviewResponseSchema>;
export type AuditCaseCreateResponse = z.infer<typeof auditCaseCreateResponseSchema>;
export type AuditHealthResponse = z.infer<typeof auditHealthResponseSchema>;
export type AuditModulesResponse = z.infer<typeof auditModulesResponseSchema>;
export type AuditSchemaMapResponse = z.infer<typeof auditSchemaMapResponseSchema>;
