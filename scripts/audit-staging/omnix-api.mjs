import { createHash, timingSafeEqual } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createAuditPilotApp } from "../../artifacts/api-server/src/auditPilotApp.ts";
import { createAuditWorkflowService } from "../../artifacts/api-server/src/services/auditWorkflowService.ts";
import { loadConfig, repoRoot, databaseUrl, apiRequire } from "./config.mjs";
import { Pool } from "../../lib/db/src/pool.ts";

if (process.env.NODE_ENV !== "test" || process.env.GXEON_AUDIT_STAGING !== "true") throw new Error("EXPLICIT_LOCAL_TEST_REQUIRED");
const config = await loadConfig(), url = new URL(databaseUrl(config));
if (!["127.0.0.1", "localhost"].includes(url.hostname) || url.pathname !== "/gx01_staging") throw new Error("OWN_LOOPBACK_DATABASE_REQUIRED");
const privateAccess = JSON.parse(await readFile(path.join(repoRoot, ".gx019/access.json"), "utf8"));
const express = apiRequire("express"), pool = new Pool({ connectionString: url.href, max: 4, statement_timeout: 5000, connectionTimeoutMillis: 5000 });
pool.on("error", () => console.error("OMNIX_LOCAL_DATABASE_UNAVAILABLE"));
const safe = (await pool.query("SELECT EXISTS(SELECT 1 FROM audit_cases WHERE metadata->'scope'->>'testData' IS DISTINCT FROM 'true') AS unsafe")).rows[0];
if (safe.unsafe) { await pool.end(); throw new Error("SYNTHETIC_DATA_ONLY"); }
const identities = privateAccess.identities.map(({ code, ...user }) => ({ ...user, accessCodeSha256: createHash("sha256").update(code).digest("hex") }));
const harness = express(); let server;
const same = (value, expected) => { const a = Buffer.from(value ?? ""), b = Buffer.from(expected); return a.length === b.length && timingSafeEqual(a, b); };
harness.get("/api/staging/health", (req, res) => {
  if (!same(req.get("authorization"), "Bearer " + config.operatorToken)) { res.status(401).json({ ok: false }); return; }
  res.json({ ok: true, testData: true, instanceId: config.instanceId, pid: process.pid, service: "omnix-local-preview", customerDataAllowed: false });
});
harness.post("/__stage/stop", (req, res) => {
  if (!same(req.get("x-gx-stage-control"), config.controlToken)) { res.status(403).end(); return; }
  res.status(200).end(); server.closeAllConnections(); server.close(() => { void pool.end().finally(() => process.exit(0)); });
});
harness.use(createAuditPilotApp({ origins: [`http://127.0.0.1:${config.uiPort}`], service: createAuditWorkflowService(() => pool.connect()), ready: async () => { await pool.query("SELECT 1"); }, portal: { identities, secureCookies: false }, log: record => console.log(JSON.stringify(record)) }));
server = harness.listen(config.apiPort, "127.0.0.1", () => console.log("OMNIX local synthetic preview, loopback only. No customer accounts."));
server.requestTimeout = 15000; server.headersTimeout = 10000;
