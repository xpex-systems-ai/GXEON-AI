import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import net from "node:net";
import { spawn, execFileSync } from "node:child_process";
import { once } from "node:events";
import { isBuiltin } from "node:module";
import { verifyPortable } from "./verify.mjs";
import { root, loadProfile, baseEnvironment, sql, web, waitReady } from "./test-support.mjs";
import { canonical } from "../../scripts/audit-staging/canonical.mjs";

const profile = process.argv[2] ?? "native";
let c, child, databaseRunning = false;
let phase = "preflight";
function pg(name, args) {
  phase = name;
  execFileSync(path.join(c.pgBin, name + (process.platform === "win32" ? ".exe" : "")), args,
    { windowsHide: true, stdio: "ignore", env: baseEnvironment(), timeout: name === "initdb" ? 120000 : 30000 });
}
function pgdata() {
  const dir = path.resolve(c.dir, "pgdata");
  assert.equal(path.dirname(dir), path.resolve(c.dir)); assert.ok(dir.startsWith(path.resolve(root, ".gx-selfhost") + path.sep)); return dir;
}
async function free(port) {
  const server = net.createServer(); server.listen(port, "127.0.0.1"); await once(server, "listening"); await new Promise(r => server.close(r));
}
async function startApp() {
  const secretPath = name => path.join(c.dir, name), env = { ...baseEnvironment(), NODE_ENV: "production", PORT: String(c.port),
    GXEON_AUDIT_DEPLOYMENT_MODE: "private", GXEON_AUDIT_DATABASE_HOST: c.host, DATABASE_URL_FILE: secretPath("database-url"),
    GXEON_AUDIT_DATABASE_TLS_CA_FILE: secretPath("ca.crt"), GXEON_AUDIT_HTTPS_CERT_FILE: secretPath("web.crt"), GXEON_AUDIT_HTTPS_KEY_FILE: secretPath("web.key"),
    GXEON_AUDIT_FRONTEND_ROOT: path.join(c.dir, "app/public"), GXEON_AUDIT_ALLOWED_ORIGINS: c.origin,
    GXEON_AUDIT_PILOT_ENABLED: "true", GXEON_AUDIT_DB_PROVIDER: "postgres", GXEON_AUDIT_OPERATOR_TOKEN_FILE: secretPath("operator-token"),
    GXEON_AUDIT_REVIEWER_TOKEN_FILE: secretPath("reviewer-token"), GXEON_AUDIT_WRITE_MODE: "enabled", GXEON_AUDIT_ALLOW_DB_WRITES: "true",
    GXEON_AUDIT_AUTO_RUN_MISSION_006: "false", GXEON_AUDIT_AUTO_CREATE_FIRST_PROPOSAL: "false", GXEON_OMNIX_PREVIEW_ENABLED: "true",
    GXEON_OMNIX_PREVIEW_IDENTITIES_FILE: secretPath("identities.json") };
  const log = fs.openSync(secretPath("runtime.log"), "a", 0o600);
  child = spawn(process.execPath, [path.join(c.dir, "app/audit-pilot.mjs")], { cwd: path.join(c.dir, "app"), env,
    windowsHide: true, stdio: ["ignore", log, log] }); fs.closeSync(log); await waitReady(c);
}
async function stopApp() { if (child && child.exitCode === null && child.signalCode === null) { const exited = once(child, "exit"); child.kill(); await exited; } child = undefined; }
function startDb() { pg("pg_ctl", ["-D", pgdata(), "-l", path.join(c.dir, "postgres.log"), "-w", "start"]); databaseRunning = true; }
function stopDb() { if (databaseRunning) { pg("pg_ctl", ["-D", pgdata(), "-m", "fast", "-w", "stop"]); databaseRunning = false; } }
try {
  await Promise.all([free(55439), free(8449)]);
  const pgBin = process.env.GXEON_STAGING_PG_BIN;
  if (!pgBin || !path.isAbsolute(pgBin)) throw new Error("POSTGRES17_BINARY_REQUIRED");
  assert.match(execFileSync(path.join(pgBin, "postgres" + (process.platform === "win32" ? ".exe" : "")), ["--version"], { encoding: "utf8" }), /17\./);
  execFileSync(process.execPath, [path.join(root, "deploy/self-hosted/init.mjs"), profile, "--native"],
    { env: { ...baseEnvironment(), GXEON_STAGING_PG_BIN: pgBin, ...(process.env.GXEON_OPENSSL_BIN ? { GXEON_OPENSSL_BIN: process.env.GXEON_OPENSSL_BIN } : {}) }, stdio: "inherit" });
  c = loadProfile(profile); assert.ok(c.native); const dir = pgdata();
  const boundary = JSON.parse(fs.readFileSync(path.join(root, "artifacts/api-server/dist/audit-pilot-boundary.json")));
  assert.equal(boundary.forbiddenImports.length, 0); assert.ok(boundary.externalImports.every(i => isBuiltin(i.path) || i.path === "pg-native"));
  fs.mkdirSync(path.join(c.dir, "app"));
  fs.copyFileSync(path.join(root, "artifacts/api-server/dist/audit-pilot.mjs"), path.join(c.dir, "app/audit-pilot.mjs"), fs.constants.COPYFILE_EXCL);
  fs.cpSync(path.join(root, "artifacts/gxeon-dashboard/dist/public"), path.join(c.dir, "app/public"), { recursive: true, force: false, errorOnExist: true });
  pg("initdb", ["-D", dir, "-U", "gx01_pilot_owner", "--pwfile", path.join(c.dir, "admin-password"), "--auth=scram-sha-256", "--encoding=UTF8", "--locale=C"]);
  const tlsDir = path.join(dir, "omnix-tls"); fs.mkdirSync(tlsDir, { mode: 0o700 });
  for (const [source, target, mode] of [["postgres.key", "server.key", 0o600], ["postgres.crt", "server.crt", 0o644], ["ca.crt", "ca.crt", 0o644]]) {
    fs.copyFileSync(path.join(c.dir, source), path.join(tlsDir, target), fs.constants.COPYFILE_EXCL); fs.chmodSync(path.join(tlsDir, target), mode);
  }
  const quoted = s => s.replaceAll("\\", "/").replaceAll("'", "''");
  fs.appendFileSync(path.join(dir, "postgresql.conf"), `\nlisten_addresses='127.0.0.1'\nport=${c.dbPort}\nssl=on\nssl_min_protocol_version='TLSv1.2'\nssl_cert_file='${quoted(path.join(tlsDir, "server.crt"))}'\nssl_key_file='${quoted(path.join(tlsDir, "server.key"))}'\nssl_ca_file='${quoted(path.join(tlsDir, "ca.crt"))}'\nlog_statement='none'\nlog_min_error_statement='panic'\nshared_buffers='32MB'\nmax_connections=20\n`);
  const hba = path.join(dir, "pg_hba.conf"); fs.writeFileSync(hba, "hostnossl all all all reject\n" + fs.readFileSync(hba, "utf8"));
  startDb(); sql(c, "CREATE DATABASE gx01_pilot OWNER gx01_pilot_owner;", "postgres");
  sql(c, fs.readFileSync(path.join(root, "lib/db/drizzle/0002_audit_os_schema.sql"), "utf8"));
  const appPassword = fs.readFileSync(path.join(c.dir, "app-password"), "utf8").trim(); assert.match(appPassword, /^[A-Za-z0-9_-]{43}$/);
  sql(c, `SET log_statement='none'; SET log_min_error_statement='panic'; CREATE ROLE gx01_pilot_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 8 PASSWORD '${appPassword}';`);
  sql(c, fs.readFileSync(path.join(root, "deploy/audit-pilot/grants.example.sql"), "utf8"));
  phase = "application-start"; await startApp(); phase = "acceptance"; const proof = await verifyPortable(profile);
  const identity = JSON.parse(fs.readFileSync(path.join(c.dir, "access.json"))).identities[0];
  const login = await web(c, "/api/omnix/login", { method: "POST", body: { identity: identity.id, code: identity.code } }); assert.equal(login.status, 200);
  const cookie = login.headers["set-cookie"][0].split(";")[0];
  await stopApp(); stopDb(); startDb(); await startApp();
  assert.equal((await web(c, "/api/omnix/session", { cookie })).status, 401);
  const token = fs.readFileSync(path.join(c.dir, "operator-token"), "utf8").trim();
  const after = await web(c, `/api/v1/audit/workflow/cases/${proof.caseId}/report`, { token }); assert.equal(after.status, 200);
  const before = JSON.parse(fs.readFileSync(path.join(c.dir, "evidence/portable-report.json")));
  assert.equal(canonical(after.json), canonical(before));
  const restart = { checkedAt: new Date().toISOString(), caseId: proof.caseId, reportId: proof.reportId,
    reportSha256: proof.reportSha256, restartApiAndPostgres: true, persistedReportUnchanged: true, sessionInvalidated: true,
    databaseTls: sql(c, "SELECT bool_and(ssl) FROM pg_stat_ssl s JOIN pg_stat_activity a USING(pid) WHERE a.usename='gx01_pilot_app';") === "t" };
  fs.writeFileSync(path.join(c.dir, "evidence/portable-restart.json"), JSON.stringify(restart, null, 2), { flag: "wx" });
  console.log(JSON.stringify({ ...proof, restart }));
} catch (error) {
  console.error(JSON.stringify({ event: "PORTABLE_NATIVE_PROOF_FAILED", kind: error.name, code: error.code,
    phase,
    source: error.stack?.split("\n").find(l => l.trim().startsWith("at ")) })); process.exitCode = 1;
} finally { await stopApp(); stopDb(); }
