import { dryRunR100DatabaseMirrorSchema } from "./r100DatabaseMirrorOperatorActivationRunner";
import { getR100DatabaseMirrorSchemaDiagnostics } from "./r100DatabaseMirrorDiagnostics";
import { getR100DatabaseMirrorReadiness } from "./r100DatabaseMirrorReadinessService";
import { getLatestR100DatabaseMirrorSnapshot, getR100DatabaseMirrorStatus, r100DatabaseMirrorSafety } from "./r100DatabaseMirrorService";
import type { R100DatabaseMirrorSchemaDiagnostics, R100DatabaseMirrorSnapshot, R100DatabaseMirrorStatus } from "./r100DatabaseMirrorTypes";

export type R100DatabaseMirrorActivationStage = "DB_NOT_CONFIGURED" | "SCHEMA_MISSING" | "SCHEMA_APPLY_FLAG_REQUIRED" | "SCHEMA_READY_MIRROR_DISABLED" | "MIRROR_READY_NO_SNAPSHOT" | "SNAPSHOT_EXPORTED" | "UNHEALTHY_SAFE_FALLBACK";

export type R100DatabaseMirrorOperatorSummary = {
  status: "R100_DB_MIRROR_OPERATOR_SUMMARY_P2_1";
  mode: "MANUAL_FIRST_PREVIEW_ONLY";
  activationStage: R100DatabaseMirrorActivationStage;
  currentBlocker: string;
  nextManualAction: string;
  operatorChecklist: string[];
  backendOnlyEnvChecklist: string[];
  copySafeHttpCommands: Array<{ label: string; method: "GET" | "POST"; path: string; body?: Record<string, string>; writesOnlyWhenBackendGuardsPass: boolean }>;
  disabledActions: string[];
  allowedActions: string[];
  warnings: string[];
  latestSnapshot: Pick<R100DatabaseMirrorSnapshot, "snapshotId" | "snapshotMode" | "createdAt" | "collectionCounts">;
  counts: { snapshotCount: number; collectionCounts: R100DatabaseMirrorSnapshot["collectionCounts"] };
  safety: R100DatabaseMirrorStatus["safety"] & { noDatabaseUrlDisplay: true; noFrontendSecretPersistence: true; providerVerifiedRevenueBrl: 0; realRevenueClaimedAutomatically: false };
};

export function selectR100DatabaseMirrorActivationStage(input: { databaseConfigured: boolean; schemaReady: boolean; schemaApplyEnabled: boolean; mirrorEnabled: boolean; snapshotCount: number; metadataHealthy?: boolean }): R100DatabaseMirrorActivationStage {
  if (input.metadataHealthy === false) return "UNHEALTHY_SAFE_FALLBACK";
  if (!input.databaseConfigured) return "DB_NOT_CONFIGURED";
  if (!input.schemaReady && !input.schemaApplyEnabled) return "SCHEMA_APPLY_FLAG_REQUIRED";
  if (!input.schemaReady) return "SCHEMA_MISSING";
  if (!input.mirrorEnabled) return "SCHEMA_READY_MIRROR_DISABLED";
  if (input.snapshotCount >= 1) return "SNAPSHOT_EXPORTED";
  return "MIRROR_READY_NO_SNAPSHOT";
}

const commands: R100DatabaseMirrorOperatorSummary["copySafeHttpCommands"] = [
  { label: "Readiness", method: "GET", path: "/api/r100-db/readiness", writesOnlyWhenBackendGuardsPass: false },
  { label: "Schema diagnostics", method: "GET", path: "/api/r100-db/schema-diagnostics", writesOnlyWhenBackendGuardsPass: false },
  { label: "Schema dry-run", method: "POST", path: "/api/r100-db/schema-dry-run", body: {}, writesOnlyWhenBackendGuardsPass: false },
  { label: "Apply guarded schema", method: "POST", path: "/api/r100-db/apply-schema", body: { action: "APPLY_R100_DB_MIRROR_SCHEMA_OPERATOR_APPROVED" }, writesOnlyWhenBackendGuardsPass: true },
  { label: "Activation smoke test", method: "POST", path: "/api/r100-db/activation-smoke-test", body: { action: "RUN_R100_DB_MIRROR_ACTIVATION_SMOKE_TEST" }, writesOnlyWhenBackendGuardsPass: false },
  { label: "Create safe mirror probe", method: "POST", path: "/api/r100-db/probe", body: { action: "CREATE_SAFE_R100_DB_MIRROR_PROBE" }, writesOnlyWhenBackendGuardsPass: true },
  { label: "Export SAFE_REDACTED snapshot", method: "POST", path: "/api/r100-db/export-safe-snapshot", body: { action: "EXPORT_SAFE_R100_SNAPSHOT_TO_DB_MIRROR" }, writesOnlyWhenBackendGuardsPass: true },
];

function blocker(stage: R100DatabaseMirrorActivationStage, diagnostics: R100DatabaseMirrorSchemaDiagnostics): string {
  if (stage === "DB_NOT_CONFIGURED") return "Backend database is not configured. Add DATABASE_URL only to the backend environment; this summary never displays its value.";
  if (stage === "SCHEMA_APPLY_FLAG_REQUIRED") return "Schema is missing and GXEON_R100_DB_SCHEMA_OPERATOR_APPLY_ENABLED is not enabled; guarded apply remains blocked until the backend flag and exact action are provided.";
  if (stage === "SCHEMA_MISSING") return "Schema is missing. Review diagnostics and dry-run before any operator-approved schema apply.";
  if (stage === "SCHEMA_READY_MIRROR_DISABLED") return "Schema is ready, but GXEON_R100_DB_MIRROR_ENABLED is not enabled in the backend.";
  if (stage === "MIRROR_READY_NO_SNAPSHOT") return "Mirror is ready for guarded writes, but no SAFE_REDACTED snapshot has been exported yet.";
  if (stage === "SNAPSHOT_EXPORTED") return "At least one SAFE_REDACTED snapshot exists; keep monitoring without claiming provider-verified revenue.";
  return diagnostics.nextManualAction || "Metadata query failed; no write was attempted. Inspect backend connectivity and run diagnostics again.";
}

export async function buildR100DatabaseMirrorOperatorSummary(): Promise<R100DatabaseMirrorOperatorSummary> {
  const [status, readiness, diagnostics] = await Promise.all([getR100DatabaseMirrorStatus(), getR100DatabaseMirrorReadiness(), getR100DatabaseMirrorSchemaDiagnostics()]);
  const metadataHealthy = !(diagnostics.databaseConfigured && diagnostics.tables.length > 0 && diagnostics.tables.every((table) => !table.exists) && diagnostics.warnings.some((warning) => warning.toLowerCase().includes("metadata query failed")));
  const dryRun = !diagnostics.schemaReady && diagnostics.databaseConfigured ? await dryRunR100DatabaseMirrorSchema() : null;
  const latestSnapshot = await getLatestR100DatabaseMirrorSnapshot();
  const stage = selectR100DatabaseMirrorActivationStage({ databaseConfigured: readiness.databaseConfigured, schemaReady: readiness.schemaReady, schemaApplyEnabled: diagnostics.schemaApplyEnabled, mirrorEnabled: readiness.mirrorEnabled, snapshotCount: status.snapshotCount, metadataHealthy });
  const safeToWrite = readiness.safeToWrite;
  return {
    status: "R100_DB_MIRROR_OPERATOR_SUMMARY_P2_1",
    mode: "MANUAL_FIRST_PREVIEW_ONLY",
    activationStage: stage,
    currentBlocker: blocker(stage, diagnostics),
    nextManualAction: stage === "SNAPSHOT_EXPORTED" ? "Verify snapshotCount >= 1 and keep providerVerifiedRevenueBrl=0 unless a future verified provider integration exists." : diagnostics.nextManualAction || readiness.nextManualAction,
    operatorChecklist: ["Confirm DATABASE_URL exists only in backend Railway/API; never paste it into the dashboard.", "Run readiness, schema diagnostics, and schema dry-run.", "If schema is missing, enable GXEON_R100_DB_SCHEMA_OPERATOR_APPLY_ENABLED=true temporarily and call apply-schema with the exact action.", "Disable GXEON_R100_DB_SCHEMA_OPERATOR_APPLY_ENABLED again after schema apply.", "Enable GXEON_R100_DB_MIRROR_ENABLED=true, redeploy API, run smoke/probe/snapshot, then verify snapshotCount >= 1."],
    backendOnlyEnvChecklist: ["DATABASE_URL configured only in backend Railway/API.", "GXEON_R100_DB_SCHEMA_OPERATOR_APPLY_ENABLED=true only during approved schema apply, then false again.", "GXEON_R100_DB_MIRROR_ENABLED=true only after schema is ready and operator approves guarded writes."],
    copySafeHttpCommands: commands,
    disabledActions: [safeToWrite ? "None for guarded probe/snapshot" : "Rodar probe seguro", safeToWrite ? "None for guarded snapshot" : "Exportar snapshot SAFE_REDACTED", diagnostics.schemaApplyEnabled && !diagnostics.schemaReady ? "None for guarded schema apply" : "Aplicar schema guardado"].filter((item) => !item.startsWith("None")),
    allowedActions: ["Verificar prontidão", "Ver diagnóstico de schema", "Dry-run do schema", ...(diagnostics.schemaApplyEnabled && !diagnostics.schemaReady ? ["Aplicar schema guardado"] : []), "Activation smoke test", ...(safeToWrite ? ["Rodar probe seguro", "Exportar snapshot SAFE_REDACTED"] : [])],
    warnings: [...new Set([...status.warnings, ...readiness.warnings, ...diagnostics.warnings, ...(dryRun ? [dryRun.nextManualAction] : []), "Aplique o schema primeiro; nenhuma escrita de espelho será tentada quando schemaReady=false.", "No payment, checkout, invoice, webhook capture, scraping, auto-send, or external contact is introduced."])],
    latestSnapshot: { snapshotId: latestSnapshot.snapshotId, snapshotMode: latestSnapshot.snapshotMode, createdAt: latestSnapshot.createdAt, collectionCounts: latestSnapshot.collectionCounts },
    counts: { snapshotCount: status.snapshotCount, collectionCounts: latestSnapshot.collectionCounts },
    safety: { ...r100DatabaseMirrorSafety, noDatabaseUrlDisplay: true, noFrontendSecretPersistence: true, providerVerifiedRevenueBrl: 0, realRevenueClaimedAutomatically: false },
  };
}
