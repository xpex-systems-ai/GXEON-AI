import { spawn, spawnSync } from "node:child_process";
import { readFile, writeFile, access, open } from "node:fs/promises";
import path from "node:path";
import { loadConfig, repoRoot, stateDir, apiRequire, childEnvironment, databaseUrl, query, sleep } from "./config.mjs";

const compose = path.join(import.meta.dirname, "compose.yaml");
const extension = process.platform === "win32" ? ".exe" : "";
function command(executable, args, env = process.env) {
  // A daemon must not keep a captured pipe alive after pg_ctl exits on Windows.
  const result = spawnSync(executable, args, { env, stdio: "ignore", windowsHide: true });
  if (result.error || result.status !== 0) throw new Error("STAGING_COMMAND_FAILED: " + path.basename(executable));
  return result.stdout;
}
async function waitFor(check, name) {
  for (let n = 0; n < 60; n++) { try { const value = await check(); if (value) return value; } catch { /* readiness only */ } await sleep(500); }
  throw new Error("STAGING_NOT_READY: " + name);
}
function native(config, name, args) {
  if (!config.pgBin || !path.isAbsolute(config.pgBin)) throw new Error("POSTGRES_BIN_REQUIRED");
  return command(path.join(config.pgBin, name + extension), args);
}
export async function startDatabase(config) {
  if (config.mode === "docker") {
    command("docker", ["compose", "-f", compose, "up", "-d", "--wait", "postgres"]);
  } else {
    const data = path.join(stateDir, "pgdata");
    let initialized = true;
    try { await access(path.join(data, "PG_VERSION")); } catch { initialized = false; }
    if (!initialized) native(config, "initdb", ["-D", data, "-U", "gx01_stage_admin", "--pwfile", path.join(stateDir, "admin-password"), "--auth=scram-sha-256", "--encoding=UTF8", "--locale=C"]);
    const status = spawnSync(path.join(config.pgBin, "pg_ctl" + extension), ["-D", data, "status"], { windowsHide: true });
    if (status.status !== 0) native(config, "pg_ctl", ["-D", data, "-l", path.join(stateDir, "database.log"), "-o", "-h 127.0.0.1 -p 55432 -c shared_buffers=32MB -c max_connections=20 -c log_min_error_statement=panic", "-w", "start"]);
  }
  await waitFor(() => query(config, "SELECT 1", [], true, config.mode === "native" ? "postgres" : config.database), "PostgreSQL");
}
export async function stopDatabase(config) {
  if (config.mode === "docker") command("docker", ["compose", "-f", compose, "stop", "postgres"]);
  else native(config, "pg_ctl", ["-D", path.join(stateDir, "pgdata"), "-m", "fast", "-w", "stop"]);
}
async function initializeDatabase(config) {
  const adminDatabase = config.mode === "native" ? "postgres" : config.database;
  const version = (await query(config, "SHOW server_version_num", [], true, adminDatabase)).rows[0].server_version_num;
  if (Number(version) < 170000 || Number(version) >= 180000) throw new Error("POSTGRES17_REQUIRED");
  if (config.mode === "native") {
    if (!(await query(config, "SELECT 1 FROM pg_database WHERE datname='gx01_staging'", [], true, "postgres")).rows.length) {
      await query(config, "CREATE DATABASE gx01_staging OWNER gx01_stage_admin", [], true, "postgres");
    }
  }
  const exists = (await query(config, "SELECT to_regclass('public.audit_cases') AS name", [], true)).rows[0].name;
  if (!exists) await query(config, await readFile(path.join(repoRoot, "lib/db/drizzle/0002_audit_os_schema.sql"), "utf8"), [], true);
  const hasRole = (await query(config, "SELECT 1 FROM pg_roles WHERE rolname='gx01_app'", [], true)).rows.length;
  // Password is generated base64url, validated by loadConfig, and never sent to logs.
  await query(config, `${hasRole ? "ALTER" : "CREATE"} ROLE gx01_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION CONNECTION LIMIT 8 PASSWORD '${config.appPassword}'`, [], true);
  await query(config, `
    REVOKE ALL ON DATABASE gx01_staging FROM PUBLIC;
    GRANT CONNECT ON DATABASE gx01_staging TO gx01_app;
    REVOKE CREATE ON SCHEMA public FROM PUBLIC;
    GRANT USAGE ON SCHEMA public TO gx01_app;
    REVOKE ALL ON ALL TABLES IN SCHEMA public FROM gx01_app;
    GRANT SELECT, INSERT ON audit_assets, audit_evidences, audit_findings, audit_reports TO gx01_app;
    GRANT SELECT, INSERT, UPDATE ON audit_cases TO gx01_app;
  `, [], true);
}
async function launch(name, executable, args, env) {
  const log = await open(path.join(stateDir, name + ".log"), "a");
  const child = spawn(executable, args, { cwd: repoRoot, env, detached: true, windowsHide: true, stdio: ["ignore", log.fd, log.fd] });
  child.unref();
  await log.close();
  child.on("error", () => { /* health check reports a redacted startup failure */ });
}
export async function apiHealth(config) {
  const response = await fetch("http://127.0.0.1:3479/api/staging/health", { headers: { Authorization: "Bearer " + config.operatorToken }, signal: AbortSignal.timeout(2000) });
  if (!response.ok) throw new Error("STAGING_API_UNAVAILABLE");
  const data = await response.json();
  if (data.instanceId !== config.instanceId || data.testData !== true) throw new Error("STAGING_INSTANCE_MISMATCH");
  return data;
}
export async function startApps(config, writeEnabled = true) {
  await access(path.join(repoRoot, "artifacts/gxeon-dashboard/dist/public/index.html"));
  let running;
  try { running = await apiHealth(config); } catch { /* not running */ }
  if (running) throw new Error("STAGING_API_ALREADY_RUNNING");
  const env = childEnvironment(config, writeEnabled);
  await launch("api", process.execPath, [apiRequire.resolve("tsx/cli"), path.join(repoRoot, "artifacts/api-server/src/tests/auditStagingServer.ts")], env);
  await waitFor(() => apiHealth(config), "API");
  await launch("frontend", process.execPath, [path.join(import.meta.dirname, "frontend.mjs")], env);
  await waitFor(async () => {
    const response = await fetch("http://127.0.0.1:5174/__stage/health", { signal: AbortSignal.timeout(2000) });
    const data = await response.json();
    return data.instanceId === config.instanceId;
  }, "frontend");
}
export async function stopApps(config) {
  for (const port of [5174, 3479]) {
    const response = await fetch(`http://127.0.0.1:${port}/__stage/stop`, {
      method: "POST", headers: { "x-gx-stage-control": config.controlToken }, signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error("STAGING_SHUTDOWN_DENIED");
  }
  await sleep(500);
}
export async function restart(config, writeEnabled = true) {
  await stopApps(config);
  await stopDatabase(config);
  await startDatabase(config);
  await startApps(config, writeEnabled);
}
export async function initialize(config) {
  await startDatabase(config);
  await initializeDatabase(config);
}
async function main() {
  const action = process.argv[2];
  if (!["init", "up", "status", "restart", "stop", "test-db"].includes(action)) throw new Error("Use init, up, status, restart, stop or test-db.");
  const config = await loadConfig(action === "init");
  if (action === "init") await initialize(config);
  if (action === "up") await startApps(config);
  if (action === "status") console.log(JSON.stringify(await apiHealth(config)));
  if (action === "restart") await restart(config);
  if (action === "stop") { await stopApps(config); await stopDatabase(config); }
  if (action === "test-db") {
    if (!(await query(config, "SELECT 1 FROM pg_database WHERE datname='gx01_test'", [], true)).rows.length) await query(config, "CREATE DATABASE gx01_test OWNER gx01_stage_admin", [], true);
    // Private local connection file; value is never printed or committed.
    await writeFile(path.join(stateDir, "test-database-url"), databaseUrl(config, true, "gx01_test"), { mode: 0o600 });
  }
  console.log("GX-01.2 " + action + " completed (TEST DATA, loopback, no production credentials).");
}
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  main().catch((error) => { console.error(error.message.startsWith("STAGING_") || /REQUIRED|UNSAFE/.test(error.message) ? error.message : "STAGING_OPERATION_FAILED"); process.exitCode = 1; });
}
