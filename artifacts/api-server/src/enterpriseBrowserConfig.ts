import { isIP } from "node:net";
import { EnterpriseIdentityError, type EnterpriseIdentityConfig } from "./enterpriseIdentity";

export type EnterpriseBrowserConfig = {
  identity: EnterpriseIdentityConfig; origin: string; redirectUri: string; returnUri: string;
  clientId: string; clientSecret: string; authorizationEndpoint: string; tokenEndpoint: string;
  recoveryUrl?: string;
};
const fail = (): never => { throw new EnterpriseIdentityError(503, "ENTERPRISE_BROWSER_CONFIGURATION_REQUIRED"); };
function https(value: string) {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || url.hash || url.port ||
      isIP(url.hostname) || url.hostname === "localhost" || !url.hostname.includes(".") || value.length > 1000) return fail();
  return url;
}
export function loadEnterpriseBrowserConfig(env: NodeJS.ProcessEnv = process.env, identity?: EnterpriseIdentityConfig): EnterpriseBrowserConfig | undefined {
  if (!env.GXEON_OMNIX_BROWSER_ENABLED || env.GXEON_OMNIX_BROWSER_ENABLED === "false") return;
  try {
    if (env.GXEON_OMNIX_BROWSER_ENABLED !== "true" || !identity || env.NODE_TLS_REJECT_UNAUTHORIZED === "0") return fail();
    const origin = env.GXEON_OMNIX_BROWSER_ORIGIN ?? "", application = https(origin), issuer = https(identity.issuer);
    if (application.origin !== origin || application.search) return fail();
    const authorizationEndpoint = env.GXEON_OMNIX_OIDC_AUTHORIZATION_ENDPOINT ?? "", tokenEndpoint = env.GXEON_OMNIX_OIDC_TOKEN_ENDPOINT ?? "";
    for (const value of [authorizationEndpoint, tokenEndpoint, identity.jwksUri]) {
      const endpoint = https(value);
      if (endpoint.origin !== issuer.origin || endpoint.search) return fail();
    }
    if (new Set([authorizationEndpoint, tokenEndpoint, identity.jwksUri]).size !== 3) return fail();
    const clientId = env.GXEON_OMNIX_OIDC_CLIENT_ID ?? "", clientSecret = env.GXEON_OMNIX_OIDC_CLIENT_SECRET ?? "";
    if (!/^[A-Za-z0-9_.:-]{3,200}$/.test(clientId) || !/^[\x21-\x7e]{24,500}$/.test(clientSecret)) return fail();
    const recoveryUrl = env.GXEON_OMNIX_PROVIDER_RECOVERY_URL;
    if (recoveryUrl && (https(recoveryUrl).origin !== issuer.origin || https(recoveryUrl).search)) return fail();
    return { identity, origin, redirectUri: origin + "/api/omnix-enterprise/browser/callback", returnUri: origin + "/omnix?identity=enterprise",
      clientId, clientSecret, authorizationEndpoint, tokenEndpoint, ...(recoveryUrl ? { recoveryUrl } : {}) };
  } catch { return fail(); }
}
