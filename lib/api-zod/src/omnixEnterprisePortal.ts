import { z } from "zod";

const role = z.enum(["owner", "admin", "operator", "reviewer", "reader"]);
export const omnixEnterpriseBrowserStatusSchema = z.object({
  ok: z.boolean(), configured: z.boolean(), mode: z.literal("oidc_authorization_code_pkce").optional(),
  customerDataAllowed: z.literal(false), recoveryConfigured: z.boolean().optional(), realProviderAcceptanceVerified: z.literal(false).optional(),
}).passthrough();
export const omnixEnterpriseBrowserPrincipalSchema = z.object({
  userId: z.string().uuid(), organizationId: z.string().uuid(), role,
  scopes: z.array(z.string().regex(/^omnix:[a-z:]{3,70}$/)).max(24), delegated: z.boolean(),
}).strict();
export const omnixEnterpriseBrowserSessionSchema = z.object({
  ok: z.literal(true), mode: z.literal("oidc_browser"), userId: z.string().uuid(),
  organizations: z.array(z.object({ id: z.string().uuid(), name: z.string().min(3).max(180), role, delegated: z.boolean() }).strict()).max(100),
  expiresAt: z.string().datetime(), customerDataAllowed: z.literal(false), principal: omnixEnterpriseBrowserPrincipalSchema.optional(),
}).strict();
export const omnixEnterpriseLoginSchema = z.object({ ok: z.literal(true), authorizationUrl: z.url({ protocol: /^https$/ }) }).passthrough();
export const omnixEnterpriseRecoverySchema = z.object({ ok: z.literal(true), recoveryUrl: z.url({ protocol: /^https$/ }),
  providerManaged: z.literal(true), operationallyVerified: z.literal(false) }).strict();
export type OmnixEnterpriseBrowserSession = z.infer<typeof omnixEnterpriseBrowserSessionSchema>;
