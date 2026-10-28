import { loadEnterpriseIdentityConfig } from "./enterpriseIdentity";

const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
export function loadOmnixRuntimeExtensions(env: NodeJS.ProcessEnv = process.env) {
  if (env.GXEON_OMNIX_ALLOW_CUSTOMER_DATA && env.GXEON_OMNIX_ALLOW_CUSTOMER_DATA !== "false") throw new Error("CUSTOMER_ADMISSION_REVIEW_REQUIRED");
  const enterprise = loadEnterpriseIdentityConfig(env);
  if (!env.GXEON_OMNIX_COMMERCIAL_ENABLED || env.GXEON_OMNIX_COMMERCIAL_ENABLED === "false") return { enterprise };
  const token = env.GXEON_OMNIX_COMMERCIAL_TOKEN ?? "", userId = env.GXEON_OMNIX_COMMERCIAL_RECIPIENT_USER_ID ?? "",
    organizationId = env.GXEON_OMNIX_COMMERCIAL_RECIPIENT_ORGANIZATION_ID ?? "";
  if (env.GXEON_OMNIX_COMMERCIAL_ENABLED !== "true" || !enterprise || !/^[A-Za-z0-9_-]{43,128}$/.test(token) ||
      token === env.GXEON_AUDIT_OPERATOR_TOKEN || token === env.GXEON_AUDIT_REVIEWER_TOKEN || !uuid.test(userId) || !uuid.test(organizationId))
    throw new Error("COMMERCIAL_RUNTIME_CONFIGURATION_REQUIRED");
  return { enterprise, commercial: { token, recipient: { userId, organizationId } } };
}
