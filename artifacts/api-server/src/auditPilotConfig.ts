import { loadRenderIngress, type RenderIngressConfig } from "./auditRenderIngress";

export type AuditPilotConfig = {
  port: number;
  origins: readonly string[];
  databaseUrl: string;
  databaseCa?: string;
  deploymentMode: "railway" | "private" | "render";
  renderIngress?: RenderIngressConfig;
  bindHost: string;
  frontendRoot?: string;
  https?: { keyFile: string; certFile: string };
};

// This is a proposed runtime, disabled until explicitly configured. No provisioning.
export function loadAuditPilotConfig(env: NodeJS.ProcessEnv = process.env): AuditPilotConfig {
  const refuse = (): never => { throw new Error("AUDIT_PILOT_CONFIGURATION_REQUIRED"); };
  if (env.NODE_ENV !== "production" || env.GXEON_AUDIT_PILOT_ENABLED !== "true" ||
      env.GXEON_AUDIT_DB_PROVIDER !== "postgres" ||
      env.GXEON_AUDIT_AUTO_RUN_MISSION_006 !== "false" ||
      env.GXEON_AUDIT_AUTO_CREATE_FIRST_PROPOSAL !== "false") refuse();
  const operator = env.GXEON_AUDIT_OPERATOR_TOKEN ?? "", reviewer = env.GXEON_AUDIT_REVIEWER_TOKEN ?? "";
  if (!/^[A-Za-z0-9_-]{43,128}$/.test(operator) || !/^[A-Za-z0-9_-]{43,128}$/.test(reviewer) || operator === reviewer) refuse();
  const writeMode = env.GXEON_AUDIT_WRITE_MODE ?? "disabled", allow = env.GXEON_AUDIT_ALLOW_DB_WRITES ?? "false";
  if (!((writeMode === "disabled" && allow === "false") || (writeMode === "enabled" && allow === "true"))) refuse();
  const port = Number(env.PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535) refuse();
  let database: URL;
  try { database = new URL(env.DATABASE_URL ?? ""); } catch { return refuse(); }
  const mode = env.GXEON_AUDIT_DEPLOYMENT_MODE ?? "railway";
  if (!["railway", "private", "render"].includes(mode) || env.NODE_TLS_REJECT_UNAUTHORIZED === "0") refuse();
  if (!["postgres:", "postgresql:"].includes(database.protocol) ||
      database.username !== "gx01_pilot_app" ||
      database.pathname !== "/gx01_pilot" || database.search || database.hash || database.password.length < 24) refuse();
  if (mode === "railway" && !database.hostname.endsWith(".railway.internal")) refuse();
  const certFile = env.GXEON_AUDIT_HTTPS_CERT_FILE, keyFile = env.GXEON_AUDIT_HTTPS_KEY_FILE;
  if (!!certFile !== !!keyFile) refuse();
  if (["private", "render"].includes(mode) && (env.GXEON_AUDIT_DATABASE_HOST !== database.hostname ||
      !env.GXEON_AUDIT_DATABASE_TLS_CA?.includes("-----BEGIN CERTIFICATE-----"))) refuse();
  if (mode === "private" && (!certFile || !keyFile)) refuse();
  const renderIngress = mode === "render" ? loadRenderIngress(env) : undefined;
  if (mode === "render" && (certFile || keyFile || !env.GXEON_AUDIT_FRONTEND_ROOT)) refuse();
  const bindHost = env.GXEON_AUDIT_BIND_HOST ?? (mode === "private" ? "127.0.0.1" : "0.0.0.0");
  if (!["127.0.0.1", "::1", "0.0.0.0", "::"].includes(bindHost)) refuse();
  const origins = (env.GXEON_AUDIT_ALLOWED_ORIGINS ?? "").split(",").map(s => s.trim());
  if (!origins.length || origins.length > 5 || origins.some(value => {
    try { const u = new URL(value); return u.protocol !== "https:" || u.origin !== value || !!u.username || !!u.password; }
    catch { return true; }
  })) refuse();
  if (renderIngress && bindHost !== "0.0.0.0") refuse();
  return { port, origins: [...new Set(origins)], databaseUrl: database.href, deploymentMode: mode as AuditPilotConfig["deploymentMode"], bindHost,
    ...(renderIngress ? { renderIngress } : {}),
    ...(env.GXEON_AUDIT_FRONTEND_ROOT ? { frontendRoot: env.GXEON_AUDIT_FRONTEND_ROOT } : {}),
    ...(certFile && keyFile ? { https: { certFile, keyFile } } : {}),
    ...(env.GXEON_AUDIT_DATABASE_TLS_CA ? { databaseCa: env.GXEON_AUDIT_DATABASE_TLS_CA } : {}) };
}
