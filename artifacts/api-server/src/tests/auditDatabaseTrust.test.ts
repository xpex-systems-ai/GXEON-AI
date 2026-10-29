import assert from "node:assert/strict";
import { test } from "node:test";
import { randomBytes } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createServer, connect } from "node:tls";
import { once } from "node:events";
import { loadAuditDatabaseNetwork, isPublicAuditAddress } from "../auditDatabaseTrust";
import { auditPilotConnectionOptions } from "../auditPilotConnection";
import type { AuditPilotConfig } from "../auditPilotConfig";

const host = "dpg-00000000000000000000-a.oregon-postgres.render.com"; // synthetic configuration fixture, not a deployment
const commit = "a".repeat(40), reference = "https://github.com/xpex-systems-ai/GXEON-AI/pull/456#pullrequestreview-123";
const env = { GXEON_AUDIT_DATABASE_NETWORK: "render-external-public-ca", GXEON_AUDIT_DATABASE_HOST: host,
  RENDER_GIT_COMMIT: commit, GXEON_AUDIT_DATABASE_REVIEW_COMMIT: commit, GXEON_AUDIT_DATABASE_REVIEW_REFERENCE: reference };
const url = new URL(`postgresql://gx01_pilot_app:${randomBytes(32).toString("base64url")}@${host}/gx01_pilot`);
test("external candidate is Render-specific, explicit, hostname-bound and has a separate review configuration", () => {
  assert.equal(loadAuditDatabaseNetwork({}, "private", url), "private-ca");
  assert.equal(loadAuditDatabaseNetwork(env, "render", url), "render-external-public-ca");
  for (const patch of [{ GXEON_AUDIT_DATABASE_REVIEW_REFERENCE: "" }, { GXEON_AUDIT_DATABASE_REVIEW_COMMIT: "b".repeat(40) },
    { GXEON_AUDIT_DATABASE_TLS_CA: "-----BEGIN CERTIFICATE-----\nUNAUTHENTICATED FIXTURE" },
    { GXEON_AUDIT_DATABASE_HOST: "attacker.invalid" }, { GXEON_AUDIT_DATABASE_NETWORK: "public" }])
    assert.throws(() => loadAuditDatabaseNetwork({ ...env, ...patch }, "render", url), /AUDIT_DATABASE_IDENTITY_REVIEW_REQUIRED/);
  for (const mode of ["private", "railway"]) assert.throws(() => loadAuditDatabaseNetwork(env, mode, url), /AUDIT_DATABASE_IDENTITY_REVIEW_REQUIRED/);
  for (const changed of [new URL(url.href.replace(host, "attacker.render.com")), new URL(url.href.replace(host, host + ":443"))])
    assert.throws(() => loadAuditDatabaseNetwork(env, "render", changed), /AUDIT_DATABASE_IDENTITY_REVIEW_REQUIRED/);
});

test("external candidate rejects an untrusted certificate even with a matching original hostname", async () => {
  const directory = mkdtempSync(path.join(tmpdir(), "gx040-tls-test-"));
  const key = path.join(directory, "key.pem"), cert = path.join(directory, "cert.pem");
  let server: ReturnType<typeof createServer> | undefined;
  try {
    execFileSync(process.env.GXEON_OPENSSL_BIN ?? "openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-sha256", "-days", "1",
      "-subj", "/CN=" + host, "-addext", "subjectAltName=DNS:" + host, "-keyout", key, "-out", cert], { stdio: "ignore", windowsHide: true, timeout: 15000 });
    server = createServer({ key: readFileSync(key), cert: readFileSync(cert) }, socket => socket.end());
    server.on("tlsClientError", () => undefined); server.listen(0, "127.0.0.1"); await once(server, "listening");
    const address = server.address(); assert.ok(address && typeof address !== "string");
    const options = await auditPilotConnectionOptions({ port: 10000, origins: ["https://fixture.onrender.com"], databaseUrl: url.href,
      deploymentMode: "render", bindHost: "0.0.0.0", databaseNetwork: "render-external-public-ca" }, async () => [{ address: "8.8.8.8", family: 4 }]);
    const error = await new Promise<Error>((resolve, reject) => {
      // Loopback transport is a local hostile-server fixture, never a DNS allowlist exception.
      const socket = connect({ ...options.ssl, host: "127.0.0.1", port: address.port });
      socket.setTimeout(5000, () => { socket.destroy(); reject(new Error("TLS_FIXTURE_TIMEOUT")); });
      socket.once("secureConnect", () => { socket.destroy(); reject(new Error("UNTRUSTED_TLS_ACCEPTED")); });
      socket.once("error", resolve);
    });
    assert.match(error.message, /self.signed|unable to verify|certificate/i);
  } finally {
    if (server) await new Promise<void>(resolve => server!.close(() => resolve()));
    assert.equal(path.dirname(directory), path.resolve(tmpdir())); assert.ok(path.basename(directory).startsWith("gx040-tls-test-"));
    rmSync(directory, { recursive: true });
  }
});
test("public profile rejects DNS rebinding to private/reserved networks and retains public roots, SNI and original-host verification", async () => {
  const config: AuditPilotConfig = { port: 10000, origins: ["https://fixture.onrender.com"], databaseUrl: url.href,
    deploymentMode: "render", bindHost: "0.0.0.0", databaseNetwork: "render-external-public-ca" };
  const options = await auditPilotConnectionOptions(config, async name => { assert.equal(name, host); return [{ address: "8.8.8.8", family: 4 }]; });
  assert.equal(options.host, "8.8.8.8"); assert.equal(options.ssl.servername, host); assert.equal(options.ssl.rejectUnauthorized, true);
  assert.equal(options.ssl.minVersion, "TLSv1.2"); assert.ok(Array.isArray(options.ssl.ca) && options.ssl.ca.length > 100);
  assert.ok(options.ssl.checkServerIdentity("8.8.8.8", { subjectaltname: "DNS:attacker.invalid" } as Parameters<typeof options.ssl.checkServerIdentity>[1]));
  assert.equal(options.ssl.checkServerIdentity("8.8.8.8", { subjectaltname: "DNS:" + host } as Parameters<typeof options.ssl.checkServerIdentity>[1]), undefined);
  for (const address of ["127.0.0.1", "10.1.2.3", "169.254.169.254", "100.64.0.1", "192.0.2.1", "203.0.113.1", "224.0.0.1", "::1", "fd12::1", "2001:db8::1", "2001:0db8::1", "3fff::1", "3fff:fff::1", "::ffff:8.8.8.8"]) {
    assert.equal(isPublicAuditAddress(address), false, address);
    await assert.rejects(auditPilotConnectionOptions(config, async () => [{ address, family: address.includes(":") ? 6 : 4 }]), /PUBLIC_AUDIT_DATABASE_ADDRESS_REQUIRED/);
  }
  assert.equal(isPublicAuditAddress("2606:4700:4700::1111"), true);
  await assert.rejects(auditPilotConnectionOptions(config, async () => [{ address: "8.8.8.8", family: 4 }, { address: "127.0.0.1", family: 4 }]), /PUBLIC_AUDIT_DATABASE_ADDRESS_REQUIRED/);
  // Existing private contract remains private even when a public route is requested accidentally.
  await assert.rejects(auditPilotConnectionOptions({ ...config, databaseNetwork: "private-ca" }, async () => [{ address: "8.8.8.8", family: 4 }]), /PRIVATE_AUDIT_DATABASE_ADDRESS_REQUIRED/);
});

const supabaseRef = "bdxqxunosdkdvnxuamid"; // Non-secret canonical project ref, never connection authority alone.
const supabaseHost = `db.${supabaseRef}.supabase.co`;
const supabaseUrl = new URL(`postgresql://gx01_pilot_app:${randomBytes(32).toString("base64url")}@${supabaseHost}/postgres`);
const supabaseCa = "-----BEGIN CERTIFICATE-----\\nSYNTHETIC PEM SHAPE ONLY\\n-----END CERTIFICATE-----";
const supabaseEnv = { GXEON_AUDIT_DATABASE_NETWORK: "supabase-direct-ca", GXEON_AUDIT_DATABASE_HOST: supabaseHost,
  GXEON_AUDIT_SUPABASE_PROJECT_REF: supabaseRef, GXEON_AUDIT_SUPABASE_SANDBOX: "true", GXEON_AUDIT_DATABASE_TLS_CA: supabaseCa };

test("Supabase direct candidate is exact-project, CA-bound, and synthetic-only by explicit opt-in", () => {
  assert.equal(loadAuditDatabaseNetwork(supabaseEnv, "private", supabaseUrl), "supabase-direct-ca");
  assert.equal(loadAuditDatabaseNetwork(supabaseEnv, "render", supabaseUrl), "supabase-direct-ca");
  for (const patch of [
    { GXEON_AUDIT_SUPABASE_PROJECT_REF: "aaaaaaaaaaaaaaaaaaaa" },
    { GXEON_AUDIT_SUPABASE_SANDBOX: "false" },
    { GXEON_AUDIT_DATABASE_HOST: "db.untrusted.supabase.co" },
    { GXEON_AUDIT_DATABASE_TLS_CA: "" },
    { NODE_TLS_REJECT_UNAUTHORIZED: "0" },
  ]) assert.throws(() => loadAuditDatabaseNetwork({ ...supabaseEnv, ...patch }, "private", supabaseUrl), /AUDIT_DATABASE_IDENTITY_REVIEW_REQUIRED/);
  for (const url of [
    new URL(supabaseUrl.href.replace("/postgres", "/shared")),
    new URL(supabaseUrl.href.replace(supabaseHost, `db.aaaaaaaaaaaaaaaaaaaa.supabase.co`)),
    new URL(supabaseUrl.href.replace("/postgres", ":6543/postgres")),
  ]) assert.throws(() => loadAuditDatabaseNetwork(supabaseEnv, "private", url), /AUDIT_DATABASE_IDENTITY_REVIEW_REQUIRED/);
  assert.equal(loadAuditDatabaseNetwork(supabaseEnv, "railway", supabaseUrl), "supabase-direct-ca");
});

test("Supabase direct PostgreSQL candidate pins IPv6 public endpoint, CA and private search path", async () => {
  const config: AuditPilotConfig = { port: 8443, origins: ["https://omnix.example.invalid"], databaseUrl: supabaseUrl.href,
    databaseCa: supabaseCa, databaseNetwork: "supabase-direct-ca", deploymentMode: "private", bindHost: "127.0.0.1",
    supabaseProjectRef: supabaseRef };
  const options = await auditPilotConnectionOptions(config, async hostname => {
    assert.equal(hostname, supabaseHost);
    return [{ address: "2606:4700:4700::1111", family: 6 }];
  });
  assert.equal(options.host, "2606:4700:4700::1111");
  assert.equal(options.database, "postgres");
  assert.equal(options.user, "gx01_pilot_app");
  assert.equal(options.options, "-c search_path=omnix_audit,pg_catalog");
  assert.equal(options.ssl.servername, supabaseHost);
  assert.equal(options.ssl.rejectUnauthorized, true);
  assert.equal(options.ssl.minVersion, "TLSv1.2");
  assert.equal(options.ssl.ca, supabaseCa);
  assert.equal(options.ssl.checkServerIdentity("2606:4700:4700::1111",
    { subjectaltname: "DNS:" + supabaseHost } as Parameters<typeof options.ssl.checkServerIdentity>[1]), undefined);
  assert.ok(options.ssl.checkServerIdentity("2606:4700:4700::1111",
    { subjectaltname: "DNS:attacker.invalid" } as Parameters<typeof options.ssl.checkServerIdentity>[1]));
  for (const address of ["127.0.0.1", "169.254.169.254", "::1", "fd12::1", "2001:db8::1"]) {
    await assert.rejects(auditPilotConnectionOptions(config, async () => [{ address, family: address.includes(":") ? 6 : 4 }]),
      /PUBLIC_AUDIT_DATABASE_ADDRESS_REQUIRED/);
  }
  await assert.rejects(auditPilotConnectionOptions({ ...config, supabaseProjectRef: "aaaaaaaaaaaaaaaaaaaa" },
    async () => [{ address: "2606:4700:4700::1111", family: 6 }]), /AUDIT_DATABASE_IDENTITY_REVIEW_REQUIRED/);
});
