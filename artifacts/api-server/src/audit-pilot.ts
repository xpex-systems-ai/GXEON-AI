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
import { createAuditTelemetry } from "./auditTelemetry";
import { loadOmnixRuntimeExtensions } from "./omnixRuntimeExtensions";
import { createEnterpriseTokenVerifier, EnterpriseIdentityError } from "./enterpriseIdentity";
import { createEnterpriseIdentityStore } from "./enterpriseIdentityStore";
import { resolveEnterpriseRequest } from "./enterpriseIdentityRouter";
import { createCommercialService } from "./omnixCommercial";
import { createEnterpriseBrowser } from "./enterpriseBrowser";
import { createLeadIntakeService, leadUuid, type LeadPrincipal } from "./omnixLeadIntake";

async function start() {
  Object.assign(process.env, loadAuditPilotSecretFiles());
  const config = loadAuditPilotConfig();
  const extensions = loadOmnixRuntimeExtensions();
  if (extensions.browser && config.origins[0] !== extensions.browser.origin) throw new Error("ENTERPRISE_BROWSER_ORIGIN_APPROVAL_REQUIRED");
  const pool = new Pool(await auditPilotConnectionOptions(config));
  pool.on("error", () => console.error(JSON.stringify({ event: "audit_database_unavailable" })));
  try { await assertAuditPilotDatabase(pool, { enterprise: !!extensions.enterprise, commercial: !!extensions.commercial, lead: !!extensions.lead }); }
  catch { await pool.end(); throw new Error("AUDIT_DATABASE_NOT_READY"); }
  const service = createAuditWorkflowService(() => pool.connect());
  const enterprise = extensions.enterprise ? { verify: createEnterpriseTokenVerifier(extensions.enterprise), store: createEnterpriseIdentityStore(() => pool.connect()) } : undefined;
  const browser = extensions.browser && enterprise ? await createEnterpriseBrowser({ config: extensions.browser, ...enterprise }) : undefined;
  const lead = extensions.lead && enterprise ? {
    token: extensions.lead.token, sourceOrigin: config.origins[0]!,
    service: createLeadIntakeService(() => pool.connect(), { channelId: extensions.lead.channelId, mode: extensions.lead.mode,
      resolveRecipient: async (channel,client) => {
        if (!leadUuid.test(channel.recipient_user_id) || !leadUuid.test(channel.recipient_organization_id)) return;
        const row = (await client.query<LeadPrincipal>(`SELECT u.id AS "userId",m.organization_id AS "organizationId",m.role
          FROM omnix_users u JOIN omnix_memberships m ON m.user_id=u.id JOIN omnix_organizations o ON o.id=m.organization_id
          WHERE u.id=$1 AND m.organization_id=$2 AND u.status='active' AND o.status='active' AND o.test_data=true
          AND m.revoked_at IS NULL AND m.role IN ('owner','admin')`, [channel.recipient_user_id,channel.recipient_organization_id])).rows[0];
        return row;
      },
      // Commercial signatures, delivery and payment are not inferred from a flag.
      // No evidence adapter is enabled until scoped human-reviewed records exist.
    }),
    authorizeInbox: async (req: import("express").Request) => {
      const {principal} = await resolveEnterpriseRequest(req.get("authorization"),req.get("x-omnix-organization-id"),{...enterprise,workflow:service});
      const scope = req.method === "GET" ? "omnix:commercial:read" : "omnix:commercial:ack";
      if (principal.delegated || !["owner","admin"].includes(principal.role) || !principal.scopes.includes(scope))
        throw new EnterpriseIdentityError(403,"LEAD_INBOX_DENIED");
      return {userId:principal.userId,organizationId:principal.organizationId,role:principal.role as "owner"|"admin"};
    },
  } : undefined;
  const commercial = extensions.commercial && enterprise ? {
    token: extensions.commercial.token, sourceOrigin: config.origins[0]!,
    service: createCommercialService(() => pool.connect(), extensions.commercial.recipient),
    authorizeInbox: async (req: import("express").Request) => {
      const { principal } = await resolveEnterpriseRequest(req.get("authorization"), req.get("x-omnix-organization-id"), { ...enterprise, workflow: service });
      const scope = req.method === "GET" ? "omnix:commercial:read" : "omnix:commercial:ack";
      if (principal.delegated || !["owner", "admin"].includes(principal.role) || !principal.scopes.includes(scope) ||
          principal.userId !== extensions.commercial!.recipient.userId || principal.organizationId !== extensions.commercial!.recipient.organizationId)
        throw new EnterpriseIdentityError(403, "COMMERCIAL_RECIPIENT_DENIED");
      return { userId: principal.userId, organizationId: principal.organizationId, role: principal.role as "owner" | "admin" };
    },
  } : undefined;
  const app = createAuditPilotApp({ origins: config.origins, enterprise, browser, commercial, lead,
    renderIngress: config.renderIngress,
    frontendRoot: config.frontendRoot,
    portal: loadOmnixPreviewConfig(),
    service,
    ready: async () => { await pool.query("SELECT 1"); },
    operationalLog: createAuditTelemetry(record => console.log(JSON.stringify(record))),
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
