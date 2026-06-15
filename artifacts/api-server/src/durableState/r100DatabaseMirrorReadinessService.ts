import { isDatabaseConfigured, getPool } from "@workspace/db";
import type { R100DatabaseMirrorReadiness } from "./r100DatabaseMirrorTypes";

const mirrorEnabled = () => process.env.GXEON_R100_DB_MIRROR_ENABLED === "true";

async function tableExists(tableName: string): Promise<boolean> {
  const result = await getPool().query<{ exists: boolean }>(
    "select exists (select 1 from information_schema.tables where table_schema = current_schema() and table_name = $1) as exists",
    [tableName],
  );
  return Boolean(result.rows[0]?.exists);
}

export async function getR100DatabaseMirrorReadiness(): Promise<R100DatabaseMirrorReadiness> {
  const databaseConfigured = isDatabaseConfigured();
  const enabled = mirrorEnabled();
  const warnings = [
    "Readiness is manual-first and preview-only; it is not payment settlement.",
    "No secrets, DATABASE_URL values, Pix keys, payment links, phone, email, or WhatsApp data are exposed.",
  ];

  if (!databaseConfigured) {
    warnings.push("DATABASE_URL is not configured in the backend environment; schema checks and DB writes stay disabled.");
    return build(false, false, false, enabled, warnings, "Configure DATABASE_URL in the backend environment, then redeploy and run the readiness check again.");
  }

  try {
    const [snapshotsTableReady, auditEventsTableReady] = await Promise.all([
      tableExists("r100_state_snapshots"),
      tableExists("r100_state_audit_events"),
    ]);
    const schemaReady = snapshotsTableReady && auditEventsTableReady;
    if (!schemaReady) warnings.push("R$100 DB mirror tables are missing; run the DB migration/push before enabling writes.");
    if (!enabled) warnings.push("GXEON_R100_DB_MIRROR_ENABLED=true is required before guarded probe/snapshot writes.");
    return build(databaseConfigured, snapshotsTableReady, auditEventsTableReady, enabled, warnings, schemaReady ? (enabled ? "Run the safe DB probe, then export a redacted snapshot and verify the dashboard latest snapshot." : "Set GXEON_R100_DB_MIRROR_ENABLED=true in the backend only, redeploy, then run the safe probe.") : "Run the database migration/push for r100_state_snapshots and r100_state_audit_events, then re-check readiness.");
  } catch {
    warnings.push("Database connection or metadata query failed; no write was attempted.");
    return build(databaseConfigured, false, false, enabled, warnings, "Verify the backend database connection and run the readiness check again.");
  }
}

function build(databaseConfigured: boolean, snapshotsTableReady: boolean, auditEventsTableReady: boolean, enabled: boolean, warnings: string[], nextManualAction: string): R100DatabaseMirrorReadiness {
  const schemaReady = snapshotsTableReady && auditEventsTableReady;
  return {
    status: "R100_DB_MIRROR_SCHEMA_READINESS_P2",
    mode: "MANUAL_FIRST",
    databaseConfigured,
    schemaReady,
    snapshotsTableReady,
    auditEventsTableReady,
    mirrorEnabled: enabled,
    safeToWrite: databaseConfigured && schemaReady && enabled,
    nextManualAction,
    warnings,
    safety: { manualFirst: true, previewOnly: true, noPaymentProviderApi: true, noCheckout: true, noInvoice: true, noWebhookPaymentCapture: true, noAutoSend: true, noExternalContact: true, noGithubRuntimeWrite: true, noScraping: true, noSecrets: true, dbMirrorOnly: true, notPaymentSettlement: true, providerVerifiedRevenueBrl: 0, realRevenueClaimedAutomatically: false },
  };
}
