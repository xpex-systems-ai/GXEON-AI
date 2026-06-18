import { z } from "zod";

export const auditHealthResponseSchema = z.object({
  system: z.literal("GXEON Audit OS"),
  readiness: z.literal("degraded-safe"),
  databaseConfigured: z.boolean(),
  schemaRegistered: z.boolean(),
  safeMode: z.literal(true),
  productionMutationEnabled: z.literal(false),
});

export const auditModuleContractSchema = z.object({
  key: z.string(), name: z.string(), description: z.string(), category: z.string(), defaultWeight: z.number(),
  checklistItems: z.array(z.string()), riskSignals: z.array(z.string()), recommendedEvidenceTypes: z.array(z.string()), safeMode: z.literal(true),
});

export const auditModulesResponseSchema = z.object({ system: z.literal("GXEON Audit OS"), count: z.number(), modules: z.array(auditModuleContractSchema) });
export const auditSchemaMapResponseSchema = z.object({ system: z.literal("GXEON Audit OS"), sourceOfTruth: z.string(), safeMode: z.boolean(), productionMigrationsExecuted: z.boolean(), enums: z.array(z.string()), tables: z.array(z.object({ name: z.string(), purpose: z.string() })), invariants: z.array(z.string()) });

export type AuditHealthResponse = z.infer<typeof auditHealthResponseSchema>;
export type AuditModulesResponse = z.infer<typeof auditModulesResponseSchema>;
export type AuditSchemaMapResponse = z.infer<typeof auditSchemaMapResponseSchema>;
