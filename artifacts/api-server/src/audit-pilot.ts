// Dedicated candidate runtime. Never imports app.ts, route index, financial routes or autorunners.
import { Pool } from "@workspace/db/pool";
import { loadAuditPilotConfig } from "./auditPilotConfig";
import { assertAuditPilotDatabase } from "./auditPilotDatabase";
import { createAuditPilotApp } from "./auditPilotApp";
import { createAuditWorkflowService } from "./services/auditWorkflowService";
import { loadOmnixPreviewConfig } from "./omnixPreview";
import { auditPilotConnectionOptions } from "./auditPilotConnection";
import { loadAuditPilotSecretFiles } from "./auditPilotFiles";
import { createServer } from "node:https";
import { readFileSync } from "node:fs";

async function start() {
  Object.assign(process.env, loadAuditPilotSecretFiles());
  const config = loadAuditPilotConfig();
  const pool = new Pool(await auditPilotConnectionOptions(config));
  pool.on("error", () => console.error(JSON.stringify({ event: "audit_database_unavailable" })));
  try { await assertAuditPilotDatabase(pool); }
  catch { await pool.end(); throw new Error("AUDIT_DATABASE_NOT_READY"); }
  const app = createAuditPilotApp({ origins: config.origins,
    frontendRoot: config.frontendRoot,
    portal: loadOmnixPreviewConfig(),
    service: createAuditWorkflowService(() => pool.connect()),
    ready: async () => { await pool.query("SELECT 1"); },
    log: record => console.log(JSON.stringify(record)) });
  const server = config.https ? createServer({ key: readFileSync(config.https.keyFile),
    cert: readFileSync(config.https.certFile), minVersion: "TLSv1.2" }, app).listen(config.port, config.bindHost) : app.listen(config.port, config.bindHost);
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  server.keepAliveTimeout = 5000;
  server.maxRequestsPerSocket = 100;
  server.on("error", () => { console.error(JSON.stringify({ event: "audit_listener_failed" })); void pool.end().finally(() => process.exit(1)); });
  let stopping = false;
  const stop = () => {
    if (stopping) return;
    stopping = true;
    server.close(() => { void pool.end().finally(() => process.exit(0)); });
    setTimeout(() => { server.closeAllConnections(); void pool.end().finally(() => process.exit(1)); }, 10000).unref();
  };
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);
}
start().catch(() => { console.error(JSON.stringify({ event: "audit_pilot_start_refused" })); process.exit(1); });
