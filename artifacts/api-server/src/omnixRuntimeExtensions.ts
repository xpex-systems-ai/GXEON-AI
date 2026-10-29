import { loadEnterpriseIdentityConfig } from "./enterpriseIdentity";
import { loadEnterpriseBrowserConfig } from "./enterpriseBrowserConfig";

const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
export function loadOmnixRuntimeExtensions(env: NodeJS.ProcessEnv = process.env) {
  if (env.GXEON_OMNIX_ALLOW_CUSTOMER_DATA && env.GXEON_OMNIX_ALLOW_CUSTOMER_DATA !== "false") throw new Error("CUSTOMER_ADMISSION_REVIEW_REQUIRED");
  const enterprise = loadEnterpriseIdentityConfig(env);
  const browser = loadEnterpriseBrowserConfig(env, enterprise);
  if (browser && [env.GXEON_AUDIT_OPERATOR_TOKEN, env.GXEON_AUDIT_REVIEWER_TOKEN,
    env.GXEON_OMNIX_COMMERCIAL_TOKEN, env.GXEON_OMNIX_LEAD_TOKEN].includes(browser.clientSecret))
    throw new Error("BROWSER_CREDENTIAL_SEPARATION_REQUIRED");
  let lead: { token: string; channelId: string; mode: "synthetic" | "real" } | undefined;
  if (env.GXEON_OMNIX_LEAD_ENABLED && env.GXEON_OMNIX_LEAD_ENABLED !== "false") {
    const token = env.GXEON_OMNIX_LEAD_TOKEN ?? "", channelId = env.GXEON_OMNIX_LEAD_CHANNEL_ID ?? "", mode = env.GXEON_OMNIX_LEAD_MODE;
    if (env.GXEON_OMNIX_LEAD_ENABLED !== "true" || !enterprise || !/^[A-Za-z0-9_-]{43,128}$/.test(token) || !uuid.test(channelId) ||
        !["synthetic", "real"].includes(mode ?? "") || [env.GXEON_AUDIT_OPERATOR_TOKEN, env.GXEON_AUDIT_REVIEWER_TOKEN, env.GXEON_OMNIX_COMMERCIAL_TOKEN, env.GXEON_OMNIX_OIDC_CLIENT_SECRET].includes(token))
      throw new Error("LEAD_RUNTIME_CONFIGURATION_REQUIRED");
    lead = { token, channelId, mode: mode as "synthetic" | "real" };
  }
  if (!env.GXEON_OMNIX_COMMERCIAL_ENABLED || env.GXEON_OMNIX_COMMERCIAL_ENABLED === "false") return { enterprise, browser, lead };
  const token = env.GXEON_OMNIX_COMMERCIAL_TOKEN ?? "", userId = env.GXEON_OMNIX_COMMERCIAL_RECIPIENT_USER_ID ?? "",
    organizationId = env.GXEON_OMNIX_COMMERCIAL_RECIPIENT_ORGANIZATION_ID ?? "";
  if (env.GXEON_OMNIX_COMMERCIAL_ENABLED !== "true" || !enterprise || !/^[A-Za-z0-9_-]{43,128}$/.test(token) ||
      token === env.GXEON_AUDIT_OPERATOR_TOKEN || token === env.GXEON_AUDIT_REVIEWER_TOKEN || token === env.GXEON_OMNIX_OIDC_CLIENT_SECRET || !uuid.test(userId) || !uuid.test(organizationId))
    throw new Error("COMMERCIAL_RUNTIME_CONFIGURATION_REQUIRED");
  return { enterprise, browser, lead, commercial: { token, recipient: { userId, organizationId } } };
}
