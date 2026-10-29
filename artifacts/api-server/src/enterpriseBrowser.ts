import { randomBytes } from "node:crypto";
import { Router, json, type ErrorRequestHandler, type Request, type RequestHandler } from "express";
import * as oidc from "openid-client";
import { EnterpriseIdentityError, enterpriseEmailHash, enterpriseScopes, identityHash, type VerifiedEnterpriseIdentity } from "./enterpriseIdentity";
import type { EnterpriseIdentityStore } from "./enterpriseIdentityStore";
import { loadEnterpriseBrowserConfig, type EnterpriseBrowserConfig } from "./enterpriseBrowserConfig";

// __Host requires Path=/; __Secure plus no Domain keeps these host-only while
// limiting delivery to the shared enterprise/inbox API surface requested here.
const loginCookie = "__Secure-omnix-login", sessionCookie = "__Secure-omnix-session", cookiePath = "/api/";
const opaque = () => randomBytes(32).toString("base64url");
const deny = (status: number, code: string): never => { throw new EnterpriseIdentityError(status, code); };
type Pending = { state: string; nonce: string; verifier: string; expiresAt: number; invitationToken?: string };
type Session = { token: string; expiresAt: number; issuer: string; subject: string };
function cookie(req: Request, name: string) {
  const raw = req.get("cookie") ?? "";
  if (raw.length > 8192) return deny(400, "ENTERPRISE_BROWSER_COOKIE_INVALID");
  const values = raw.split(";").map(value => value.trim()).filter(value => value.startsWith(name + "="));
  if (values.length > 1) return deny(400, "ENTERPRISE_BROWSER_COOKIE_INVALID");
  if (!values.length) return;
  const value = values[0]!.slice(name.length + 1);
  if (!/^[A-Za-z0-9_-]{43}$/.test(value)) return deny(401, "ENTERPRISE_BROWSER_SESSION_REQUIRED");
  return value;
}
function sameOrigin(req: Request, origin: string) {
  const supplied = req.get("origin"), site = req.get("sec-fetch-site");
  if ((supplied && supplied !== origin) || (site && site !== "same-origin") ||
      (supplied !== origin && site !== "same-origin")) return deny(403, "ENTERPRISE_BROWSER_ORIGIN_DENIED");
  if (req.method !== "GET" && supplied !== origin) return deny(403, "ENTERPRISE_BROWSER_ORIGIN_DENIED");
}

// Only injected transports in isolated protocol tests may map these HTTPS URLs to
// loopback. Production always uses ordinary certificate-validating fetch.
export async function createEnterpriseBrowser(options: {
  config: EnterpriseBrowserConfig; verify: (token: string) => Promise<VerifiedEnterpriseIdentity>;
  store: EnterpriseIdentityStore; transport?: typeof fetch; now?: () => number;
  log?: (record: { event: "enterprise_browser_login_verified" | "enterprise_browser_login_denied"; status: number;
    stage: "protocol" | "access" | "membership"; reason: string }) => void;
}) {
  const { config, store, verify } = options, now = options.now ?? Date.now;
  const checked = loadEnterpriseBrowserConfig({ GXEON_OMNIX_BROWSER_ENABLED: "true", GXEON_OMNIX_BROWSER_ORIGIN: config.origin,
    GXEON_OMNIX_OIDC_CLIENT_ID: config.clientId, GXEON_OMNIX_OIDC_CLIENT_SECRET: config.clientSecret,
    GXEON_OMNIX_OIDC_AUTHORIZATION_ENDPOINT: config.authorizationEndpoint, GXEON_OMNIX_OIDC_TOKEN_ENDPOINT: config.tokenEndpoint,
    ...(config.recoveryUrl ? { GXEON_OMNIX_PROVIDER_RECOVERY_URL: config.recoveryUrl } : {}),
    NODE_TLS_REJECT_UNAUTHORIZED: process.env.NODE_TLS_REJECT_UNAUTHORIZED }, config.identity)!;
  if (checked.redirectUri !== config.redirectUri || checked.returnUri !== config.returnUri) return deny(503, "ENTERPRISE_BROWSER_CONFIGURATION_REQUIRED");
  const discoveryUri = config.identity.issuer.replace(/\/$/, "") + "/.well-known/openid-configuration";
  const allowedRequests = new Set([discoveryUri, config.tokenEndpoint, config.identity.jwksUri]);
  const boundedFetch: oidc.CustomFetch = async (input, init) => {
    const target = input;
    if (!allowedRequests.has(target)) return deny(503, "ENTERPRISE_BROWSER_ENDPOINT_DENIED");
    const body = init.body;
    // This flow only sends form-encoded token requests. Refuse arbitrary stream
    // bodies instead of widening Node/browser fetch types or accepting uploads.
    if (body !== undefined && body !== null && typeof body !== "string" && !(body instanceof URLSearchParams)) return deny(503, "ENTERPRISE_BROWSER_REQUEST_INVALID");
    const signals = [AbortSignal.timeout(5000), ...(init.signal ? [init.signal] : [])];
    const response = await (options.transport ?? fetch)(input, { ...init, body, signal: AbortSignal.any(signals), redirect: "error" });
    if (response.redirected || Number(response.headers.get("content-length") ?? 0) > 65536) return deny(503, "ENTERPRISE_BROWSER_RESPONSE_INVALID");
    // Bound the stream while reading, even when Content-Length is absent/forged.
    const reader = response.body?.getReader(), chunks: Uint8Array[] = []; let size = 0;
    if (reader) try {
      while (true) { const result = await reader.read(); if (result.done) break;
        size += result.value.byteLength; if (size > 65536) { await reader.cancel(); return deny(503, "ENTERPRISE_BROWSER_RESPONSE_INVALID"); }
        chunks.push(result.value);
      }
    } finally { reader.releaseLock(); }
    return new Response(Buffer.concat(chunks), { status: response.status, statusText: response.statusText, headers: response.headers });
  };
  let client: oidc.Configuration;
  try {
    client = await oidc.discovery(new URL(config.identity.issuer), config.clientId, {
      client_secret: config.clientSecret, token_endpoint_auth_method: "client_secret_basic", id_token_signed_response_alg: "RS256",
      redirect_uris: [config.redirectUri], response_types: ["code"],
    }, oidc.ClientSecretBasic(config.clientSecret), { timeout: 5, [oidc.customFetch]: boundedFetch, execute: [oidc.enableNonRepudiationChecks] });
    const metadata = client.serverMetadata();
    if (metadata.issuer !== config.identity.issuer || metadata.authorization_endpoint !== config.authorizationEndpoint ||
        metadata.token_endpoint !== config.tokenEndpoint || metadata.jwks_uri !== config.identity.jwksUri ||
        !metadata.code_challenge_methods_supported?.includes("S256") || !metadata.response_types_supported?.includes("code") ||
        !metadata.id_token_signing_alg_values_supported?.includes("RS256") ||
        !metadata.token_endpoint_auth_methods_supported?.includes("client_secret_basic")) throw new Error();
  } catch { return deny(503, "ENTERPRISE_BROWSER_PROVIDER_UNAVAILABLE"); }
  const pending = new Map<string, Pending>(), sessions = new Map<string, Session>();
  function prune() {
    for (const [key, item] of pending) if (item.expiresAt <= now()) pending.delete(key);
    for (const [key, item] of sessions) if (item.expiresAt <= now()) sessions.delete(key);
  }
  async function resolve(req: Request) {
    const handle = cookie(req, sessionCookie);
    if (!handle) return deny(401, "ENTERPRISE_BROWSER_SESSION_REQUIRED");
    sameOrigin(req, config.origin); prune();
    const session = sessions.get(identityHash(handle));
    if (!session) return deny(401, "ENTERPRISE_BROWSER_SESSION_REQUIRED");
    try {
      const identity = await verify(session.token);
      // Reuses the SQL user/JTI/revocation checks; downstream routes recheck the
      // selected organization and its live membership/delegation before acting.
      const organizations = await store.organizations(identity);
      if (!organizations.items.length) return deny(403, "ENTERPRISE_BROWSER_MEMBERSHIP_REQUIRED");
      return { handle, session, identity, organizations };
    } catch (error) { sessions.delete(identityHash(handle)); throw error; }
  }
  async function authorizationFor(req: Request): Promise<string | undefined> {
    const handle = cookie(req, sessionCookie);
    if (!handle) return req.get("authorization");
    if (req.get("authorization")) return deny(400, "ENTERPRISE_BROWSER_AMBIGUOUS_AUTH");
    return "Bearer " + (await resolve(req)).session.token;
  }
  const middleware: RequestHandler = async (req, _res, next) => {
    try { const authorization = await authorizationFor(req); if (authorization) req.headers.authorization = authorization; next(); }
    catch (error) { next(error); }
  };
  const router = Router(); let windowAt = now(), attempts = 0, active = 0;
  router.use((req, res, next) => {
    res.setHeader("Cache-Control", "no-store"); res.setHeader("X-Content-Type-Options", "nosniff"); res.setHeader("Referrer-Policy", "no-referrer");
    if (!["GET", "POST"].includes(req.method)) { res.status(405).json({ ok: false, code: "ENTERPRISE_BROWSER_METHOD_DENIED" }); return; }
    if (now() - windowAt >= 60000) { windowAt = now(); attempts = 0; }
    if (++attempts > 60 || active >= 4) { res.setHeader("Retry-After", "60"); res.status(429).json({ ok: false, code: "ENTERPRISE_BROWSER_RATE_LIMIT" }); return; }
    active++; let released = false; const release = () => { if (!released) { active--; released = true; } };
    res.once("finish", release); res.once("close", release); next();
  });
  router.use((req, _res, next) => {
    if (req.method === "POST") {
      sameOrigin(req, config.origin);
      if (!req.is("application/json") || (req.get("content-encoding") && req.get("content-encoding") !== "identity")) return deny(415, "ENTERPRISE_BROWSER_JSON_REQUIRED");
    }
    next();
  });
  router.use(json({ limit: "4kb", strict: true, inflate: false }));
  router.get("/status", (_req, res) => res.json({ ok: true, configured: true, mode: "oidc_authorization_code_pkce", customerDataAllowed: false,
    recoveryConfigured: Boolean(config.recoveryUrl), realProviderAcceptanceVerified: false }));
  router.post("/login", async (req, res) => {
    const body = req.body;
    if (!body || Object.keys(body).some(key => key !== "invitationToken") ||
        (body.invitationToken !== undefined && (typeof body.invitationToken !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(body.invitationToken)))) return deny(400, "ENTERPRISE_BROWSER_LOGIN_INVALID");
    prune(); if (pending.size >= 128 || sessions.size >= 1024) return deny(503, "ENTERPRISE_BROWSER_CAPACITY_REACHED");
    const previous = cookie(req, loginCookie); if (previous) pending.delete(identityHash(previous));
    const handle = opaque(), state = oidc.randomState(), nonce = oidc.randomNonce(), verifier = oidc.randomPKCECodeVerifier();
    const challenge = await oidc.calculatePKCECodeChallenge(verifier);
    const authorization = oidc.buildAuthorizationUrl(client, { redirect_uri: config.redirectUri, response_type: "code", scope: ["openid", "email", "omnix:access", ...enterpriseScopes].join(" "),
      code_challenge: challenge, code_challenge_method: "S256", state, nonce,
      ...(config.identity.requiredAcr ? { acr_values: config.identity.requiredAcr } : {}) });
    pending.set(identityHash(handle), { state, nonce, verifier, expiresAt: now() + 300000,
      ...(body.invitationToken ? { invitationToken: body.invitationToken } : {}) });
    res.cookie(loginCookie, handle, { httpOnly: true, secure: true, sameSite: "lax", path: cookiePath, maxAge: 300000 });
    res.json({ ok: true, authorizationUrl: authorization.href });
  });
  router.get("/callback", async (req, res) => {
    const handle = cookie(req, loginCookie); res.clearCookie(loginCookie, { httpOnly: true, secure: true, sameSite: "lax", path: cookiePath });
    prune(); const transaction = handle ? pending.get(identityHash(handle)) : undefined;
    if (handle) pending.delete(identityHash(handle)); // Consume before backchannel IO; callback replay cannot race.
    if (!transaction) return deny(401, "ENTERPRISE_BROWSER_TRANSACTION_REQUIRED");
    let stage: "protocol" | "access" | "membership" = "protocol";
    try {
      const callback = new URL(req.originalUrl, config.origin), expected = new URL(config.redirectUri);
      if (callback.origin !== expected.origin || callback.pathname !== expected.pathname || callback.hash || callback.href.length > 8000 ||
          callback.searchParams.getAll("state").length !== 1 || callback.searchParams.getAll("code").length !== 1 ||
          [...callback.searchParams.keys()].some(key => !["state", "code", "iss", "session_state"].includes(key))) throw new Error();
      const tokens = await oidc.authorizationCodeGrant(client, callback, { pkceCodeVerifier: transaction.verifier,
        expectedState: transaction.state, expectedNonce: transaction.nonce, idTokenExpected: true });
      stage = "access";
      const identity = await verify(tokens.access_token), claims = tokens.claims();
      if (!claims || claims.sub !== identity.subject || claims.iss !== identity.issuer || identity.expiresAt * 1000 <= now() || sessions.size >= 1024) throw new Error();
      stage = "membership";
      if (transaction.invitationToken) {
        // Standard OIDC email claims may live only in the signed ID token. Its
        // issuer/sub were verified and bound to the separately verified access
        // token above; use verified email solely for the existing invite check.
        const emailSha256 = claims.email_verified === true ? enterpriseEmailHash(claims.email) : undefined;
        await store.acceptInvitation(identity.emailSha256 || !emailSha256 ? identity : { ...identity, emailSha256 }, transaction.invitationToken);
      }
      const organizations = await store.organizations(identity);
      if (!organizations.items.length) return deny(403, "ENTERPRISE_BROWSER_MEMBERSHIP_REQUIRED");
      const session = opaque(), expiresAt = Math.min(now() + 900000, identity.expiresAt * 1000, claims.exp * 1000);
      if (expiresAt <= now()) throw new Error();
      sessions.set(identityHash(session), { token: tokens.access_token, expiresAt, issuer: identity.issuer, subject: identity.subject });
      res.cookie(sessionCookie, session, { httpOnly: true, secure: true, sameSite: "strict", path: cookiePath, maxAge: expiresAt - now() });
      options.log?.({ event: "enterprise_browser_login_verified", status: 200, stage, reason: "VERIFIED" });
      res.redirect(303, config.returnUri);
    } catch (error) {
      const raw = (error as { code?: unknown })?.code;
      const allowed = ["OAUTH_INVALID_RESPONSE", "OAUTH_JWT_CLAIM_COMPARISON_FAILED", "OAUTH_JWT_TIMESTAMP_CHECK_FAILED", "OAUTH_RESPONSE_BODY_ERROR",
        "OAUTH_UNSUPPORTED_OPERATION", "OAUTH_INVALID_REQUEST", "OAUTH_KEY_SELECTION_FAILED", "ENTERPRISE_TOKEN_INVALID", "ENTERPRISE_SESSION_REVOKED", "ENTERPRISE_BROWSER_MEMBERSHIP_REQUIRED"];
      const reason = typeof raw === "string" && allowed.includes(raw) ? raw : "DENIED";
      options.log?.({ event: "enterprise_browser_login_denied", status: 401, stage, reason });
      return deny(401, "ENTERPRISE_BROWSER_LOGIN_DENIED");
    }
  });
  router.get("/session", async (req, res) => {
    const current = await resolve(req);
    const selected = req.get("x-omnix-organization-id"), principal = await store.authorize(current.identity, selected ?? current.organizations.items[0]!.id);
    const { userId, organizationId, role, scopes, delegated } = principal;
    res.json({ ok: true, mode: "oidc_browser", userId, organizations: current.organizations.items,
      ...(selected ? { principal: { userId, organizationId, role, scopes, delegated } } : {}),
      expiresAt: new Date(current.session.expiresAt).toISOString(), customerDataAllowed: false });
  });
  router.get("/recovery", (req, res) => {
    sameOrigin(req, config.origin);
    if (!config.recoveryUrl) return deny(503, "ENTERPRISE_PROVIDER_RECOVERY_NOT_CONFIGURED");
    res.json({ ok: true, recoveryUrl: config.recoveryUrl, providerManaged: true, operationallyVerified: false });
  });
  router.post("/logout", async (req, res) => {
    res.clearCookie(sessionCookie, { httpOnly: true, secure: true, sameSite: "strict", path: cookiePath });
    if (!req.body || Object.keys(req.body).some(key => key !== "all") || (req.body.all !== undefined && typeof req.body.all !== "boolean")) return deny(400, "ENTERPRISE_BROWSER_LOGOUT_INVALID");
    const current = await resolve(req); sessions.delete(identityHash(current.handle));
    await store.revokeSession(current.identity, req.body.all === true);
    if (req.body.all === true) for (const [key, item] of sessions) if (item.issuer === current.identity.issuer && item.subject === current.identity.subject) sessions.delete(key);
    res.json({ ok: true, customerDataAllowed: false });
  });
  router.use((_req, res) => res.status(404).json({ ok: false, code: "ENTERPRISE_BROWSER_ROUTE_NOT_FOUND" }));
  const errors: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
    const identityError = error instanceof EnterpriseIdentityError, status = (error as { status?: number })?.status;
    res.status(identityError ? error.status : status === 400 || status === 413 ? status : 503).json({ ok: false,
      code: identityError ? error.code : status === 400 || status === 413 ? "ENTERPRISE_BROWSER_REQUEST_INVALID" : "ENTERPRISE_BROWSER_UNAVAILABLE" });
  };
  router.use(errors);
  return { router, middleware, authorizationFor };
}
