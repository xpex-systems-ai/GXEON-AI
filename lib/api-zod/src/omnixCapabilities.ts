import { z } from "zod";
import { auditCheckIds } from "./auditWorkflow";

export const omnixCapabilityStates = ["PLANNED", "IMPLEMENTED", "TESTED", "RELEASE_BLOCKED", "AVAILABLE", "DEPRECATED"] as const;
export const omnixSpecialistIds = ["vercel", "github", "railway", "agent_economy", "web_api", "commerce"] as const;
export const omnixReadScopes = ["omnix:capabilities:read", "omnix:audits:read", "omnix:evidence:read", "omnix:reports:read", "omnix:approvals:read"] as const;
const permission = z.enum([...omnixReadScopes, "omnix:audits:write", "omnix:approvals:write"]);
export const omnixReadTools = ["omnix_get_capabilities", "omnix_list_audits", "omnix_get_audit", "omnix_get_findings", "omnix_get_evidence", "omnix_get_report", "omnix_get_pending_approvals"] as const;
const label = z.string().min(1).max(500);
const version = z.string().regex(/^\d+\.\d+\.\d+$/);
const environment = z.object({ local: z.enum(["SYNTHETIC_TEST_ONLY", "UNAVAILABLE"]), ci: z.enum(["SYNTHETIC_TEST_ONLY", "UNAVAILABLE"]), protectedRemote: z.literal("NOT_VERIFIED"), production: z.literal("BLOCKED") }).strict();
const testEvidence = z.object({ kind: z.enum(["AUTOMATED_SYNTHETIC", "SOURCE_TEST"]), reference: label }).strict();
export const omnixSpecialistSchema = z.object({
  id: z.enum(omnixSpecialistIds), name: label, version, provider: label,
  assetTypes: z.array(z.enum(["DEPLOYMENT", "GITHUB_REPOSITORY", "API_BACKEND", "ECOMMERCE", "OTHER"])).min(1).max(5),
  permissions: z.array(permission).max(7), connector: label,
  rules: z.array(z.string().min(1).max(100)).max(12), limits: z.array(label).min(1).max(12), dependencies: z.array(label).max(12),
  evidenceProduced: z.array(label).max(8), status: z.enum(omnixCapabilityStates), reviewRequired: z.literal(true),
  allowedActions: z.array(z.enum(["READ", "ANALYZE_SUBMITTED_CONFIG"])).max(2), environmentAvailability: environment,
}).strict();
export const omnixCapabilitySchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9_]{2,99}$/), version, specialist: z.enum(omnixSpecialistIds),
  method: label, scope: label, permissions: z.array(permission).max(7),
  actionType: z.enum(["READ", "ANALYZE_SUBMITTED_CONFIG"]), inputCriteria: z.array(label).min(1).max(8),
  dependencies: z.array(label).max(12), testEvidence: z.array(testEvidence).max(8),
  status: z.enum(omnixCapabilityStates), environmentAvailability: environment,
  approvalRequired: z.literal(true), limits: z.array(label).min(1).max(12),
  canonicalCheckId: z.enum(auditCheckIds).optional(),
}).strict();
export const omnixCapabilityRegistrySchema = z.object({
  version, engine: z.object({ id: z.literal("gxeon-audit-os"), workflowVersion: z.literal("gx01-v1") }).strict(),
  release: z.object({ status: z.literal("RELEASE_BLOCKED"), customerDataAllowed: z.literal(false), publicMcpPublished: z.literal(false),
    gates: z.array(label).min(1).max(10) }).strict(),
  specialists: z.array(omnixSpecialistSchema).length(6), capabilities: z.array(omnixCapabilitySchema).min(2).max(30),
}).strict().superRefine((value, ctx) => {
  if (new Set(value.specialists.map(s => s.id)).size !== value.specialists.length || new Set(value.capabilities.map(c => c.id)).size !== value.capabilities.length)
    ctx.addIssue({ code: "custom", message: "Catalog identifiers must be unique." });
  for (const capability of value.capabilities) if (!value.specialists.some(s => s.id === capability.specialist))
    ctx.addIssue({ code: "custom", message: "Capability must reference an existing specialist." });
  // This catalog is an engineering candidate. A caller cannot promote it to a
  // verified release by setting environment strings or editing a request.
  if (value.specialists.some(s => s.status === "AVAILABLE") || value.capabilities.some(c => c.status === "AVAILABLE"))
    ctx.addIssue({ code: "custom", message: "This candidate has no approved AVAILABLE capability." });
});
export type OmnixCapabilityRegistry = z.infer<typeof omnixCapabilityRegistrySchema>;
export type OmnixReadScope = typeof omnixReadScopes[number];
export type OmnixReadTool = typeof omnixReadTools[number];
export const omnixReadToolSchema = z.enum(omnixReadTools);

export const omnixAuditIdArgumentsSchema = z.object({ caseId: z.string().uuid() }).strict();
export const omnixEvidenceArgumentsSchema = z.object({ caseId: z.string().uuid(), evidenceId: z.string().uuid() }).strict();
export type OmnixEvidenceArguments = z.infer<typeof omnixEvidenceArgumentsSchema>;
export const omnixEmptyArgumentsSchema = z.object({}).strict();
export const omnixRpcRequestSchema = z.object({ jsonrpc: z.literal("2.0"), id: z.union([z.string().max(64), z.number().int().safe(), z.null()]).optional(),
  method: z.string().min(1).max(100), params: z.unknown().optional() }).strict();
export const omnixRpcToolCallSchema = z.object({ name: omnixReadToolSchema, arguments: z.unknown().optional() }).strict();
export const omnixRpcInitializeSchema = z.object({ protocolVersion: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), capabilities: z.record(z.string(), z.unknown()),
  clientInfo: z.object({ name: z.string().min(1).max(80), version: z.string().min(1).max(40) }).passthrough() }).passthrough();
export const omnixConversationSchema = z.discriminatedUnion("intent", [
  z.object({ intent: z.literal("capabilities") }).strict(),
  z.object({ intent: z.literal("latest_report") }).strict(),
  z.object({ intent: z.literal("findings"), caseId: z.string().uuid() }).strict(),
  z.object({ intent: z.literal("capability_status"), capabilityId: z.string().regex(/^[a-z][a-z0-9_]{2,99}$/) }).strict(),
]);
export type OmnixConversationInput = z.infer<typeof omnixConversationSchema>;
