import assert from "node:assert/strict";
import test from "node:test";
import { once } from "node:events";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import express, { type ErrorRequestHandler } from "express";
import { PGlite } from "@electric-sql/pglite";
import { Pool, type PoolClient } from "@workspace/db/pool";
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from "jose";
import { createEnterpriseBrowser } from "../enterpriseBrowser";
import { loadEnterpriseBrowserConfig } from "../enterpriseBrowserConfig";
import { createEnterpriseTokenVerifier, enterpriseScopes, EnterpriseIdentityError } from "../enterpriseIdentity";
import { createEnterpriseIdentityStore } from "../enterpriseIdentityStore";
import { createEnterpriseIdentityRouter } from "../enterpriseIdentityRouter";
import { createAuditWorkflowService } from "../services/auditWorkflowService";

const issuer = "https://idp.example.invalid/realm", origin = "https://omnix.example.invalid", clientId = "gx050-browser-client";
const identityConfig = { issuer, audience: origin + "/api", jwksUri: issuer + "/jwks", requireMfa: true };
const environment = () => ({ GXEON_OMNIX_BROWSER_ENABLED: "true", GXEON_OMNIX_BROWSER_ORIGIN: origin,
  GXEON_OMNIX_OIDC_CLIENT_ID: clientId, GXEON_OMNIX_OIDC_CLIENT_SECRET: randomBytes(32).toString("base64url"),
  GXEON_OMNIX_OIDC_AUTHORIZATION_ENDPOINT: issuer + "/auth", GXEON_OMNIX_OIDC_TOKEN_ENDPOINT: issuer + "/token" });

test("GX050 browser OIDC defaults off and rejects unsafe origins, endpoint discovery and missing confidential configuration", () => {
  assert.equal(loadEnterpriseBrowserConfig({}), undefined);
  const env = environment(), config = loadEnterpriseBrowserConfig(env, identityConfig)!;
  assert.equal(config.redirectUri, origin + "/api/omnix-enterprise/browser/callback");
  assert.equal(config.returnUri, origin + "/omnix?identity=enterprise");
  assert.throws(() => loadEnterpriseBrowserConfig(env), /ENTERPRISE_BROWSER_CONFIGURATION_REQUIRED/);
  for (const patch of [{ GXEON_OMNIX_BROWSER_ENABLED: "yes" }, { GXEON_OMNIX_BROWSER_ORIGIN: "http://localhost" },
    { GXEON_OMNIX_BROWSER_ORIGIN: origin + "/another" }, { GXEON_OMNIX_OIDC_CLIENT_SECRET: "" },
    { GXEON_OMNIX_OIDC_AUTHORIZATION_ENDPOINT: "https://other.example.invalid/auth" },
    { GXEON_OMNIX_OIDC_TOKEN_ENDPOINT: issuer + "/token?redirect=elsewhere" },
    { GXEON_OMNIX_PROVIDER_RECOVERY_URL: "https://other.example.invalid/recovery" },
    { GXEON_OMNIX_PROVIDER_RECOVERY_URL: issuer + "/recovery?code=TEST-DATA" }, { NODE_TLS_REJECT_UNAUTHORIZED: "0" }])
    assert.throws(() => loadEnterpriseBrowserConfig({ ...env, ...patch }, identityConfig), /ENTERPRISE_BROWSER_CONFIGURATION_REQUIRED/);
});

async function database() {
  const target = process.env.TEST_AUDIT_DATABASE_URL;
  if (!target) {
    const db = await PGlite.create();
    return { exec: (sql: string) => db.exec(sql), query: async (sql: string, params?: unknown[]) => {
      const result = await db.query(sql, params); return { rows: result.rows as Record<string, unknown>[], rowCount: result.affectedRows };
    }, close: () => db.close() };
  }
  const url = new URL(target);
  assert.ok(["localhost", "127.0.0.1"].includes(url.hostname) && url.pathname === "/gx01_test" && url.username === "gx01_test" && !url.search && !url.hash);
  const admin = new Pool({ connectionString: target, max: 1 }), name = "gx050_browser_" + randomUUID().replaceAll("-", "");
  try { await admin.query('CREATE DATABASE "' + name + '"'); } finally { await admin.end(); }
  url.pathname = "/" + name; const pool = new Pool({ connectionString: url.href, max: 1 });
  return { exec: (sql: string) => pool.query(sql), query: async (sql: string, params?: unknown[]) => {
    const result = await pool.query(sql, params); return { rows: result.rows as Record<string, unknown>[], rowCount: result.rowCount ?? undefined };
  }, close: () => pool.end() };
}

test("GX050 real loopback OIDC protocol validates PKCE/state/nonce/signatures and reuses live SQL membership/session/invitation authorization", async () => {
  const config = loadEnterpriseBrowserConfig(environment(), identityConfig)!, db = await database();
  await db.exec(await readFile(new URL("../../../../lib/db/drizzle/0002_audit_os_schema.sql", import.meta.url), "utf8"));
  await db.exec(await readFile(new URL("../../../../lib/db/drizzle/0003_omnix_enterprise_identity.sql", import.meta.url), "utf8"));
  let timeOffset = 0, waiting = Promise.resolve(); const now = () => Date.now() + timeOffset;
  const connect = async () => { let release!: () => void; const previous = waiting; waiting = new Promise<void>(resolve => { release = resolve; }); await previous;
    return { query: (sql: string, params?: unknown[]) => db.query(sql, params), release } as unknown as Pick<PoolClient, "query" | "release">; };
  const keys = await generateKeyPair("RS256"), foreign = await generateKeyPair("RS256"), jwk = await exportJWK(keys.publicKey);
  jwk.kid = "GX050_TEST_DATA";
  const verify = createEnterpriseTokenVerifier(identityConfig, { keyResolver: createLocalJWKSet({ keys: [jwk] }), now });
  const store = createEnterpriseIdentityStore(connect, { now });
  const org = randomUUID(), otherOrg = randomUUID(), user = randomUUID(), owner = randomUUID();
  await db.query("INSERT INTO omnix_organizations(id,name,kind) VALUES($1,'GX050 TEST DATA client','client'),($2,'GX050 TEST DATA other','client')", [org, otherOrg]);
  await db.query("INSERT INTO omnix_users(id,issuer,subject) VALUES($1,$2,'GX050_USER'),($3,$2,'GX050_OWNER')", [user, issuer, owner]);
  await db.query("INSERT INTO omnix_memberships(organization_id,user_id,role) VALUES($1,$2,'operator'),($1,$3,'owner')", [org, user, owner]);
  const access = (subject: string, patch: Record<string, unknown> = {}) => new SignJWT({ iss: issuer, aud: identityConfig.audience, sub: subject,
    iat: Math.floor(Date.now() / 1000) - 2, exp: Math.floor(Date.now() / 1000) + 600, jti: randomUUID(),
    scope: ["omnix:access", ...enterpriseScopes].join(" "), amr: ["mfa"], email: "gx050-invited@example.invalid", email_verified: true, ...patch })
    .setProtectedHeader({ alg: "RS256", typ: "at+jwt", kid: jwk.kid }).sign(keys.privateKey);
  let mode = "valid", subject = "GX050_USER", metadataAttack = false, tokenRequests = 0, pkceChecks = 0, grantFailure = "none";
  const codes = new Map<string, { challenge: string; nonce: string }>(), observedPaths: string[] = [];
  const provider = express(); provider.use(express.urlencoded({ extended: false, limit: "4kb" }));
  provider.get("/realm/.well-known/openid-configuration", (_req, res) => res.json({ issuer,
    authorization_endpoint: config.authorizationEndpoint, token_endpoint: metadataAttack ? "https://attacker.example.invalid/token" : config.tokenEndpoint,
    jwks_uri: identityConfig.jwksUri, response_types_supported: ["code"], subject_types_supported: ["public"],
    id_token_signing_alg_values_supported: ["RS256"], token_endpoint_auth_methods_supported: ["client_secret_basic"], code_challenge_methods_supported: ["S256"] }));
  provider.get("/realm/jwks", (_req, res) => res.json({ keys: [jwk] }));
  provider.get("/realm/auth", (req, res) => {
    assert.equal(req.query.client_id, clientId); assert.equal(req.query.redirect_uri, config.redirectUri);
    assert.equal(req.query.response_type, "code"); assert.equal(req.query.code_challenge_method, "S256");
    assert.ok(typeof req.query.nonce === "string" && typeof req.query.state === "string" && typeof req.query.code_challenge === "string");
    const code = randomBytes(32).toString("base64url"); codes.set(code, { challenge: String(req.query.code_challenge), nonce: String(req.query.nonce) });
    const callback = new URL(config.redirectUri); callback.searchParams.set("code", code); callback.searchParams.set("state", String(req.query.state)); callback.searchParams.set("iss", issuer);
    res.redirect(302, callback.href);
  });
  provider.post("/realm/token", async (req, res) => {
    tokenRequests++; const code = codes.get(req.body.code); codes.delete(req.body.code);
    const proof = createHash("sha256").update(String(req.body.code_verifier ?? "")).digest("base64url");
    // RFC6749 client_secret_basic form-encodes both credentials before Basic
    // encoding. The provider fixture must decode them, not compare raw base64.
    let clientAuthenticated = false;
    try {
      const header = req.get("authorization") ?? "";
      if (header.startsWith("Basic ")) {
        const credentials = Buffer.from(header.slice(6), "base64").toString("utf8"), separator = credentials.indexOf(":");
        const decode = (value: string) => decodeURIComponent(value.replaceAll("+", " "));
        clientAuthenticated = separator >= 0 && decode(credentials.slice(0, separator)) === clientId && decode(credentials.slice(separator + 1)) === config.clientSecret;
      }
    } catch { clientAuthenticated = false; }
    if (!code || code.challenge !== proof || mode === "pkce" || req.body.redirect_uri !== config.redirectUri ||
        !clientAuthenticated) {
      grantFailure = !code ? "missing_code" : code.challenge !== proof ? "pkce_proof" : mode === "pkce" ? "intentional_pkce_rejection" :
        req.body.redirect_uri !== config.redirectUri ? "redirect_uri" : "client_auth";
      res.status(400).json({ error: "invalid_grant" }); return;
    }
    grantFailure = "none";
    pkceChecks++;
    const now = Math.floor(Date.now() / 1000), id = new SignJWT({ iss: issuer, aud: mode === "id-audience" ? "wrong-client" : clientId,
      sub: mode === "subject" ? "GX050_OTHER" : subject, iat: now - 2, exp: mode === "id-expired" ? now - 60 : now + 600,
      nonce: mode === "nonce" ? "WRONG_TEST_NONCE" : code.nonce, email: "gx050-invited@example.invalid", email_verified: mode !== "unverified-email" })
      .setProtectedHeader({ alg: "RS256", typ: "JWT", kid: jwk.kid });
    const token = await access(subject, mode === "access-audience" ? { aud: "wrong-api" } : mode === "access-expired" ? { exp: now - 60 } : mode === "mfa" ? { amr: ["pwd"] } :
      ["id-email", "unverified-email"].includes(mode) ? { email: undefined, email_verified: undefined } : {});
    res.json({ token_type: "Bearer", expires_in: 600, access_token: token, id_token: await id.sign(mode === "signature" ? foreign.privateKey : keys.privateKey) });
  });
  const providerServer = provider.listen(0, "127.0.0.1"); await once(providerServer, "listening");
  const providerAddress = providerServer.address(); assert.ok(providerAddress && typeof providerAddress !== "string");
  // Only this injected test transport rewrites fixed HTTPS fixture URLs to an
  // actual loopback protocol server. Production does not permit HTTP or TLS bypass.
  const transport: typeof fetch = async (input, init) => {
    const target = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    assert.equal(target.origin, new URL(issuer).origin); observedPaths.push(target.pathname);
    return fetch("http://127.0.0.1:" + providerAddress.port + target.pathname + target.search, init);
  };
  let loginEvent: { stage: string; reason: string } | undefined;
  const browser = await createEnterpriseBrowser({ config, verify, store, transport, now, log: event => { loginEvent = event; } }).catch(async error => {
    providerServer.closeAllConnections(); await new Promise<void>(resolve => providerServer.close(() => resolve())); await db.close(); throw error;
  });
  const app = express(); app.use("/api/omnix-enterprise/browser", browser.router);
  app.use("/api/omnix-enterprise", browser.middleware, createEnterpriseIdentityRouter({ verify, store, workflow: createAuditWorkflowService(connect), origins: [origin] }));
  const errors: ErrorRequestHandler = (error: unknown, _req, res, _next) => res.status(error instanceof EnterpriseIdentityError ? error.status : 503)
    .json({ ok: false, code: error instanceof EnterpriseIdentityError ? error.code : "TEST_FIXTURE_ERROR" });
  app.use(errors);
  const server = app.listen(0, "127.0.0.1"); await once(server, "listening"); const address = server.address(); assert.ok(address && typeof address !== "string");
  const request = (route: string, options: { cookie?: string; body?: unknown; headers?: Record<string, string> } = {}) => fetch("http://127.0.0.1:" + address.port + route,
    { method: options.body === undefined ? "GET" : "POST", redirect: "manual", signal: AbortSignal.timeout(15000), headers: {
      Origin: origin, "Sec-Fetch-Site": "same-origin", "Content-Type": "application/json", ...(options.cookie ? { Cookie: options.cookie } : {}), ...options.headers },
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }) });
  const browserPath = "/api/omnix-enterprise/browser";
  const begin = async (body: unknown = {}) => {
    const response = await request(browserPath + "/login", { body }); assert.equal(response.status, 200);
    const binding = response.headers.get("set-cookie")!;
    assert.ok(/HttpOnly/.test(binding) && /Secure/.test(binding) && /SameSite=Lax/.test(binding) && /Path=\/api\//.test(binding), "Login binding cookie attributes required");
    const json = await response.json(), authorization = new URL(json.authorizationUrl); assert.equal(authorization.origin, new URL(issuer).origin);
    assert.equal(authorization.searchParams.has("code_verifier"), false); assert.equal(authorization.searchParams.has("client_secret"), false);
    const providerResponse = await fetch("http://127.0.0.1:" + providerAddress.port + authorization.pathname + authorization.search, { redirect: "manual" });
    assert.equal(providerResponse.status, 302);
    return { binding: binding.split(";")[0]!, callback: new URL(providerResponse.headers.get("location")!), authorization };
  };
  const finish = (transaction: Awaited<ReturnType<typeof begin>>, binding = transaction.binding) => request(transaction.callback.pathname + transaction.callback.search, { cookie: binding });
  const login = async () => { const transaction = await begin(), response = await finish(transaction); assert.equal(response.status, 303);
    assert.equal(response.headers.get("location"), config.returnUri); const cookie = response.headers.getSetCookie().find(value => value.startsWith("__Secure-omnix-session="))!;
    assert.ok(/HttpOnly/.test(cookie) && /Secure/.test(cookie) && /SameSite=Strict/.test(cookie) && /Path=\/api\//.test(cookie) && !/Domain=/i.test(cookie), "Host-only secure session cookie attributes required");
    assert.equal(cookie.includes("eyJ"), false); return cookie.split(";")[0]!; };
  try {
    assert.equal((await request(browserPath + "/status")).status, 200);
    assert.equal((await request(browserPath + "/login", { body: {}, headers: { Origin: "https://attacker.example.invalid" } })).status, 403);
    assert.equal((await request(browserPath + "/login", { body: { returnTo: "https://attacker.example.invalid" } })).status, 400);
    const wrongState = await begin(), before = tokenRequests; wrongState.callback.searchParams.set("state", "wrong-state");
    assert.equal((await finish(wrongState)).status, 401); assert.equal(tokenRequests, before, "State mismatch is rejected before token exchange");
    const missingBinding = await begin(); assert.equal((await finish(missingBinding, "")).status, 401);
    for (const invalid of ["nonce", "signature", "id-audience", "id-expired", "subject", "access-audience", "access-expired", "mfa", "pkce"]) {
      mode = invalid; const transaction = await begin(); assert.equal((await finish(transaction)).status, 401, invalid);
    }
    mode = "valid";
    const transaction = await begin(), response = await finish(transaction); assert.equal(response.status, 303, JSON.stringify({ loginEvent, grantFailure }));
    assert.equal((await finish(transaction)).status, 401, "Callback is one-time even after success");
    const session = response.headers.getSetCookie().find(value => value.startsWith("__Secure-omnix-session="))!.split(";")[0]!;
    const publicSession = await (await request(browserPath + "/session", { cookie: session })).json();
    assert.equal(publicSession.userId, user); assert.equal(publicSession.organizations.length, 1); assert.equal(publicSession.principal, undefined);
    assert.equal(publicSession.customerDataAllowed, false); assert.equal(JSON.stringify(publicSession).includes("access_token"), false);
    assert.equal((await request("/api/omnix-enterprise/session", { cookie: session, headers: { "X-Omnix-Organization-Id": org } })).status, 200);
    assert.equal((await request(browserPath + "/session", { cookie: session, headers: { "X-Omnix-Organization-Id": otherOrg } })).status, 403);
    assert.equal((await request(browserPath + "/session", { cookie: session, headers: { Origin: "https://attacker.example.invalid", "Sec-Fetch-Site": "cross-site" } })).status, 403);
    assert.equal((await request("/api/omnix-enterprise/session", { cookie: session, headers: { Authorization: "Bearer " + await access(subject), "X-Omnix-Organization-Id": org } })).status, 400);
    await db.query("UPDATE omnix_memberships SET revoked_at=now() WHERE user_id=$1", [user]);
    assert.equal((await request(browserPath + "/session", { cookie: session })).status, 403, "Membership revocation blocks next cookie request");
    await db.query("UPDATE omnix_memberships SET revoked_at=NULL WHERE user_id=$1", [user]);
    const replacement = await login();
    assert.equal((await request("/api/omnix-enterprise/session/revoke", { cookie: replacement, body: {}, headers: { "X-Omnix-Organization-Id": org } })).status, 200);
    assert.equal((await request(browserPath + "/session", { cookie: replacement })).status, 401, "SQL JTI revocation is not cached by BFF");
    const ownerIdentity = await verify(await access("GX050_OWNER")), invitation = await store.createInvitation(ownerIdentity, org, "gx050-invited@example.invalid", "reader");
    subject = "GX050_INVITEE"; mode = "unverified-email";
    assert.equal((await finish(await begin({ invitationToken: invitation.token }))).status, 401, "Unverified ID-token email cannot accept invitation");
    mode = "id-email"; const invited = await begin({ invitationToken: invitation.token }), accepted = await finish(invited); assert.equal(accepted.status, 303, "Verified ID-token email binds the invite without a duplicate email claim in access token");
    assert.equal((await db.query("SELECT role FROM omnix_memberships m JOIN omnix_users u ON u.id=m.user_id WHERE u.subject='GX050_INVITEE'")).rows[0]!.role, "reader");
    assert.equal((await finish(invited)).status, 401);
    subject = "GX050_USER"; mode = "valid"; const logoutSession = await login();
    assert.equal((await request(browserPath + "/recovery")).status, 503, "No invented password recovery without provider configuration");
    const logout = await request(browserPath + "/logout", { cookie: logoutSession, body: {} }); assert.equal(logout.status, 200);
    assert.equal((await request(browserPath + "/session", { cookie: logoutSession })).status, 401);
    const expired = await login(); timeOffset += 901000; assert.equal((await request(browserPath + "/session", { cookie: expired })).status, 401);
    metadataAttack = true;
    await assert.rejects(createEnterpriseBrowser({ config, verify, store, transport }), /ENTERPRISE_BROWSER_PROVIDER_UNAVAILABLE/);
    assert.ok(pkceChecks >= 3); assert.ok(observedPaths.every(path => ["/realm/.well-known/openid-configuration", "/realm/token", "/realm/jwks"].includes(path)));
  } finally {
    server.closeAllConnections(); providerServer.closeAllConnections();
    await Promise.all([new Promise<void>(resolve => server.close(() => resolve())), new Promise<void>(resolve => providerServer.close(() => resolve()))]);
    await db.close();
  }
});
