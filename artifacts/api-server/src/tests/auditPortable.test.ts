import assert from "node:assert/strict";
import { test } from "node:test";
import { randomBytes } from "node:crypto";
import { mkdtemp, writeFile, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, dirname, basename } from "node:path";
import { once } from "node:events";
import { loadAuditPilotConfig } from "../auditPilotConfig";
import { auditPilotConnectionOptions, isPrivateAuditAddress } from "../auditPilotConnection";
import { loadAuditPilotSecretFiles } from "../auditPilotFiles";
import { createAuditPilotApp } from "../auditPilotApp";
import { createAuditWorkflowService } from "../services/auditWorkflowService";

const secret = () => randomBytes(32).toString("base64url");
async function cleanup(dir: string) {
  assert.equal(dirname(resolve(dir)), resolve(tmpdir())); assert.ok(basename(dir).startsWith("omnix-"));
  await rm(dir, { recursive: true });
}
function privateConfig() {
  return { NODE_ENV: "production", PORT: "8080", GXEON_AUDIT_PILOT_ENABLED: "true", GXEON_AUDIT_DB_PROVIDER: "postgres",
    GXEON_AUDIT_AUTO_RUN_MISSION_006: "false", GXEON_AUDIT_AUTO_CREATE_FIRST_PROPOSAL: "false",
    GXEON_AUDIT_OPERATOR_TOKEN: secret(), GXEON_AUDIT_REVIEWER_TOKEN: secret(),
    GXEON_AUDIT_ALLOWED_ORIGINS: "https://localhost:8443", GXEON_AUDIT_DEPLOYMENT_MODE: "private",
    GXEON_AUDIT_DATABASE_HOST: "postgres", GXEON_AUDIT_DATABASE_TLS_CA: "-----BEGIN CERTIFICATE-----\nTEST FIXTURE\n-----END CERTIFICATE-----",
    GXEON_AUDIT_HTTPS_KEY_FILE: "/run/secrets/https_key", GXEON_AUDIT_HTTPS_CERT_FILE: "/run/secrets/https_cert",
    DATABASE_URL: `postgresql://gx01_pilot_app:${secret()}@postgres/gx01_pilot` };
}
test("portable mode is explicit and preserves TLS, database identity, private-network and HTTPS requirements", () => {
  const env = privateConfig(); assert.equal(loadAuditPilotConfig(env).deploymentMode, "private");
  for (const patch of [{ GXEON_AUDIT_DEPLOYMENT_MODE: "unknown" }, { GXEON_AUDIT_DEPLOYMENT_MODE: "railway" },
    { GXEON_AUDIT_DATABASE_HOST: "elsewhere" }, { GXEON_AUDIT_DATABASE_TLS_CA: "" },
    { GXEON_AUDIT_HTTPS_KEY_FILE: "" }, { GXEON_AUDIT_HTTPS_CERT_FILE: "" }, { NODE_TLS_REJECT_UNAUTHORIZED: "0" },
    { DATABASE_URL: env.DATABASE_URL + "?sslmode=no-verify" }, { DATABASE_URL: env.DATABASE_URL.replace("gx01_pilot_app", "postgres") }])
    assert.throws(() => loadAuditPilotConfig({ ...env, ...patch }), /AUDIT_PILOT_CONFIGURATION_REQUIRED/);
});
test("private DNS results are pinned and public, metadata and mixed DNS results are rejected", async () => {
  const config = loadAuditPilotConfig(privateConfig());
  const options = await auditPilotConnectionOptions(config, async name => { assert.equal(name, "postgres"); return [{ address: "172.20.0.2", family: 4 }]; });
  assert.equal(options.host, "172.20.0.2"); assert.equal(options.ssl.servername, "postgres");
  assert.equal(options.ssl.rejectUnauthorized, true); assert.equal(options.user, "gx01_pilot_app");
  for (const address of ["127.0.0.1", "10.0.0.3", "172.16.0.1", "172.31.255.1", "192.168.1.2", "::1", "fd12:3456::1", "::ffff:127.0.0.1"])
    assert.equal(isPrivateAuditAddress(address), true, address);
  for (const address of ["8.8.8.8", "169.254.169.254", "172.32.0.1", "fe80::1", "2001:4860:4860::8888", "invalid"])
    assert.equal(isPrivateAuditAddress(address), false, address);
  for (const addresses of [[], [{ address: "8.8.8.8", family: 4 }], [{ address: "127.0.0.1", family: 4 }, { address: "8.8.8.8", family: 4 }]])
    await assert.rejects(auditPilotConnectionOptions(config, async () => addresses), /PRIVATE_AUDIT_DATABASE_ADDRESS_REQUIRED/);
  assert.ok(options.ssl.checkServerIdentity("172.20.0.2", { subjectaltname: "DNS:unapproved", subject: { CN: "unapproved" } } as Parameters<typeof options.ssl.checkServerIdentity>[1]), "IP pinning must retain original-host certificate verification");
});
test("runtime file secrets are bounded, explicit and never interpolate arbitrary environment keys", async () => {
  const dir = await mkdtemp(join(tmpdir(), "omnix-secrets-")), value = secret(), file = join(dir, "operator");
  try {
    await writeFile(file, value, { mode: 0o600 });
    const env = { GXEON_AUDIT_OPERATOR_TOKEN_FILE: file, UNRELATED_FILE: "/not-read" };
    assert.equal(loadAuditPilotSecretFiles(env).GXEON_AUDIT_OPERATOR_TOKEN, value);
    assert.equal(loadAuditPilotSecretFiles(env).UNRELATED, undefined);
    for (const patch of [{ GXEON_AUDIT_OPERATOR_TOKEN: value }, { GXEON_AUDIT_OPERATOR_TOKEN_FILE: "relative" },
      { GXEON_AUDIT_OPERATOR_TOKEN_FILE: dir }, { GXEON_AUDIT_OPERATOR_TOKEN_FILE: join(dir, "missing") }]) {
      assert.throws(() => loadAuditPilotSecretFiles({ ...env, ...patch }), error => {
        assert.ok(error instanceof Error); assert.equal(error.message, "AUDIT_SECRET_FILES_REQUIRED"); assert.ok(!error.message.includes(value)); return true;
      });
    }
  } finally { await cleanup(dir); }
});
test("same-origin portable frontend serves only the portal/assets and keeps every API miss JSON", async () => {
  const dir = await mkdtemp(join(tmpdir(), "omnix-ui-")); await mkdir(join(dir, "assets"));
  await writeFile(join(dir, "index.html"), "<!doctype html><h1>OMNIX SYNTHETIC UI</h1>");
  await writeFile(join(dir, "assets/app.js"), "/* TEST DATA */"); await writeFile(join(dir, "assets/.secret"), secret());
  const service = createAuditWorkflowService(async () => { throw new Error("NO_DATABASE_FOR_STATIC_REQUEST"); });
  const app = createAuditPilotApp({ origins: ["https://localhost:8443"], frontendRoot: dir, service, ready: async () => undefined });
  const server = app.listen(0, "127.0.0.1"); await once(server, "listening"); const a = server.address(); assert.ok(a && typeof a !== "string"); const base = `http://127.0.0.1:${a.port}`;
  try {
    const root = await fetch(base + "/", { redirect: "manual" }); assert.equal(root.status, 302); assert.equal(root.headers.get("location"), "/omnix");
    const html = await fetch(base + "/omnix?case=test"); assert.equal(html.status, 200); assert.match(await html.text(), /OMNIX SYNTHETIC UI/);
    assert.equal((await fetch(base + "/assets/app.js")).status, 200);
    for (const route of ["/api/unknown", "/api/omnix/not-enabled", "/financial", "/assets/missing.js", "/assets/.secret"] ) {
      const r = await fetch(base + route); assert.notEqual(r.status, 200, route); assert.match(r.headers.get("content-type") ?? "", /application\/json/);
      assert.ok(!(await r.text()).includes(dir));
    }
  } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); await cleanup(dir); }
});
