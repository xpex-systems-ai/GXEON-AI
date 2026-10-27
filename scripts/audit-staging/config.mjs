import { randomBytes, randomUUID } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const repoRoot = fileURLToPath(new URL("../../", import.meta.url));
export const stateDir = path.join(repoRoot, ".gx012");
export const configPath = path.join(stateDir, "config.json");
export const pg = createRequire(path.join(repoRoot, "lib/db/package.json"))("pg");
export const apiRequire = createRequire(path.join(repoRoot, "artifacts/api-server/package.json"));
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function loadConfig(create = false) {
  let config;
  try {
    config = JSON.parse(await readFile(configPath, "utf8"));
  } catch (error) {
    if (!create || error.code !== "ENOENT") throw new Error("STAGING_CONFIG_UNAVAILABLE");
    const secret = () => randomBytes(32).toString("base64url");
    config = {
      version: 1,
      instanceId: randomUUID(),
      database: "gx01_staging",
      dbPort: 55432,
      apiPort: 3479,
      uiPort: 5174,
      adminPassword: secret(),
      appPassword: secret(),
      operatorToken: secret(),
      reviewerToken: secret(),
      controlToken: secret(),
      mode: process.env.GXEON_STAGING_PG_BIN ? "native" : "docker",
      pgBin: process.env.GXEON_STAGING_PG_BIN ? path.resolve(process.env.GXEON_STAGING_PG_BIN) : null,
    };
    await mkdir(stateDir, { recursive: true, mode: 0o700 });
    await writeFile(configPath, JSON.stringify(config, null, 2), { mode: 0o600 });
    await writeFile(path.join(stateDir, "admin-password"), config.adminPassword, { mode: 0o600 });
  }
  if (config.version !== 1 || config.database !== "gx01_staging" ||
      config.dbPort !== 55432 || config.apiPort !== 3479 || config.uiPort !== 5174 ||
      !["native", "docker"].includes(config.mode) ||
      !/^[0-9a-f-]{36}$/.test(config.instanceId)) throw new Error("UNSAFE_STAGING_CONFIG");
  for (const key of ["adminPassword", "appPassword", "operatorToken", "reviewerToken", "controlToken"]) {
    if (!/^[A-Za-z0-9_-]{43}$/.test(config[key])) throw new Error("INVALID_STAGING_SECRET");
  }
  if (config.operatorToken === config.reviewerToken) throw new Error("DISTINCT_ROLES_REQUIRED");
  return config;
}

export function databaseUrl(config, admin = false, database = config.database) {
  if (!["gx01_staging", "gx01_test", "postgres"].includes(database) && !/^gx01_restore_[a-f0-9]{32}$/.test(database)) throw new Error("UNSAFE_DATABASE_NAME");
  return `postgresql://${admin ? "gx01_stage_admin" : "gx01_app"}:${admin ? config.adminPassword : config.appPassword}@127.0.0.1:${config.dbPort}/${database}`;
}

// Do not inherit production/provider secrets into the child process.
export function childEnvironment(config, writeEnabled = true) {
  const env = {};
  for (const key of ["PATH", "Path", "SystemRoot", "WINDIR", "COMSPEC", "PATHEXT", "HOME", "USERPROFILE",
    "APPDATA", "LOCALAPPDATA", "TEMP", "TMP", "NODE_PATH", "ESBUILD_BINARY_PATH", "NODE_OPTIONS"]) {
    if (process.env[key]) env[key] = process.env[key];
  }
  return {
    ...env,
    NODE_ENV: "test",
    LOG_LEVEL: "info",
    PORT: String(config.apiPort),
    DATABASE_URL: databaseUrl(config),
    GXEON_AUDIT_STAGING: "true",
    GXEON_STAGING_INSTANCE: config.instanceId,
    GXEON_STAGING_CONTROL_TOKEN: config.controlToken,
    GXEON_AUDIT_OPERATOR_TOKEN: config.operatorToken,
    GXEON_AUDIT_REVIEWER_TOKEN: config.reviewerToken,
    GXEON_AUDIT_DB_PROVIDER: "postgres",
    GXEON_AUDIT_WRITE_MODE: writeEnabled ? "enabled" : "disabled",
    GXEON_AUDIT_ALLOW_DB_WRITES: writeEnabled ? "true" : "false",
    GXEON_AUDIT_AUTO_RUN_MISSION_006: "false",
    GXEON_AUDIT_AUTO_CREATE_FIRST_PROPOSAL: "false",
  };
}

export async function query(config, statement, values = [], admin = false, database = config.database) {
  const client = new pg.Client({ connectionString: databaseUrl(config, admin, database), connectionTimeoutMillis: 5000 });
  await client.connect();
  try {
    if (admin) await client.query("SET log_statement='none'; SET log_min_error_statement='panic'");
    return await client.query(statement, values);
  } finally {
    await client.end();
  }
}

export { canonical } from "./canonical.mjs";
