import { createHash } from "node:crypto";
import { isIP } from "node:net";
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";

export class EnterpriseIdentityError extends Error {
  constructor(public status: number, public code: string) { super(code); }
}
export const enterpriseReadScopes = ["omnix:capabilities:read", "omnix:audits:read", "omnix:evidence:read", "omnix:reports:read", "omnix:approvals:read"] as const;
export const enterpriseScopes = [...enterpriseReadScopes, "omnix:audits:write", "omnix:approvals:write", "omnix:memberships:write", "omnix:delegations:write", "omnix:commercial:read", "omnix:commercial:ack"] as const;
export type EnterpriseScope = typeof enterpriseScopes[number];
export type EnterpriseRole = "owner" | "admin" | "operator" | "reviewer" | "reader";
export type EnterpriseIdentityConfig = { issuer: string; audience: string; jwksUri: string; requireMfa: boolean; requiredAcr?: string };
export type VerifiedEnterpriseIdentity = {
  issuer: string; subject: string; jti: string; issuedAt: number; expiresAt: number;
  scopes: readonly EnterpriseScope[]; emailSha256?: string; mfa: boolean;
};
export const identityHash = (value: string) => createHash("sha256").update(value).digest("hex");
export function enterpriseEmailHash(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return;
  return identityHash(value.trim().toLowerCase());
}
export function loadEnterpriseIdentityConfig(env: NodeJS.ProcessEnv = process.env): EnterpriseIdentityConfig | undefined {
  if (!env.GXEON_OMNIX_ENTERPRISE_ENABLED || env.GXEON_OMNIX_ENTERPRISE_ENABLED === "false") return;
  const refuse = (): never => { throw new EnterpriseIdentityError(503, "ENTERPRISE_IDENTITY_CONFIGURATION_REQUIRED"); };
  if (env.GXEON_OMNIX_ENTERPRISE_ENABLED !== "true" || env.NODE_TLS_REJECT_UNAUTHORIZED === "0") return refuse();
  try {
    const issuer = env.GXEON_OMNIX_OIDC_ISSUER ?? "", jwksUri = env.GXEON_OMNIX_OIDC_JWKS_URI ?? "", audience = env.GXEON_OMNIX_OIDC_AUDIENCE ?? "";
    const url = new URL(issuer), jwks = new URL(jwksUri);
    for (const candidate of [url, jwks]) if (candidate.protocol !== "https:" || candidate.username || candidate.password || candidate.search || candidate.hash ||
      isIP(candidate.hostname) || candidate.hostname === "localhost" || !candidate.hostname.includes(".") || candidate.port) return refuse();
    if (url.origin !== jwks.origin || issuer.length > 500 || jwksUri.length > 500 || !/^[\x21-\x7e]{3,300}$/.test(audience)) return refuse();
    const mfa = env.GXEON_OMNIX_OIDC_REQUIRE_MFA ?? "true";
    if (!["true", "false"].includes(mfa)) return refuse();
    const requiredAcr = env.GXEON_OMNIX_OIDC_REQUIRED_ACR;
    if (requiredAcr && (!/^[\x21-\x7e]{1,300}$/.test(requiredAcr))) return refuse();
    return { issuer, audience, jwksUri, requireMfa: mfa === "true", ...(requiredAcr ? { requiredAcr } : {}) };
  } catch { return refuse(); }
}

// This is API access-token verification, not browser sign-in or password recovery.
// The only key endpoint comes from trusted server configuration, never iss/jku in input.
export function createEnterpriseTokenVerifier(config: EnterpriseIdentityConfig, options: { keyResolver?: JWTVerifyGetKey; now?: () => number } = {}) {
  const key = options.keyResolver ?? createRemoteJWKSet(new URL(config.jwksUri), { timeoutDuration: 5000, cooldownDuration: 30000, cacheMaxAge: 300000 });
  return async (token: string): Promise<VerifiedEnterpriseIdentity> => {
    try {
      if (token.length > 12000 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)) throw new Error("TOKEN_FORMAT");
      const { payload, protectedHeader } = await jwtVerify(token, key, { issuer: config.issuer, audience: config.audience,
        algorithms: ["RS256"], typ: "at+jwt", clockTolerance: 0, maxTokenAge: 900,
        requiredClaims: ["iss", "sub", "aud", "exp", "iat", "jti"], currentDate: new Date(options.now?.() ?? Date.now()) });
      if (protectedHeader.jku || protectedHeader.jwk || protectedHeader.x5u || payload.aud !== config.audience ||
          typeof payload.sub !== "string" || payload.sub.length < 1 || payload.sub.length > 255 || Array.from(payload.sub).some(c => c.codePointAt(0)! < 32 || c.codePointAt(0) === 127) ||
          typeof payload.jti !== "string" || payload.jti.length < 8 || payload.jti.length > 255 ||
          !Number.isInteger(payload.iat) || !Number.isInteger(payload.exp) || payload.exp! - payload.iat! > 900 || payload.exp! <= payload.iat! ||
          typeof payload.scope !== "string" || payload.scope.length > 1000) throw new Error("CLAIMS_REQUIRED");
      const rawScopes = payload.scope.split(" ");
      if (!rawScopes.includes("omnix:access")) throw new Error("ACCESS_SCOPE_REQUIRED");
      const mfa = Array.isArray(payload.amr) && payload.amr.includes("mfa");
      if ((config.requireMfa && !mfa) || (config.requiredAcr && payload.acr !== config.requiredAcr)) throw new Error("ASSURANCE_REQUIRED");
      const emailSha256 = payload.email_verified === true ? enterpriseEmailHash(payload.email) : undefined;
      return { issuer: config.issuer, subject: payload.sub, jti: payload.jti, issuedAt: payload.iat!, expiresAt: payload.exp!,
        scopes: enterpriseScopes.filter(scope => rawScopes.includes(scope)), ...(emailSha256 ? { emailSha256 } : {}), mfa };
    } catch { throw new EnterpriseIdentityError(401, "ENTERPRISE_TOKEN_INVALID"); }
  };
}
