import { getPool, isDatabaseConfigured } from "@workspace/db";
import { getLatestR100DatabaseMirrorSnapshot, getR100DatabaseMirrorStatus, r100DatabaseMirrorSafety } from "./r100DatabaseMirrorService";
import { getR100DatabaseMirrorReadiness } from "./r100DatabaseMirrorReadinessService";
import { getR100DatabaseMirrorSchemaDiagnostics } from "./r100DatabaseMirrorDiagnostics";
import type { R100DatabaseMirrorActivationSmokeTest, R100DatabaseMirrorSchemaApplyResult, R100DatabaseMirrorSchemaDryRun } from "./r100DatabaseMirrorTypes";

export const APPLY_R100_DB_MIRROR_SCHEMA_ACTION = "APPLY_R100_DB_MIRROR_SCHEMA_OPERATOR_APPROVED";
export const RUN_R100_DB_MIRROR_ACTIVATION_SMOKE_TEST_ACTION = "RUN_R100_DB_MIRROR_ACTIVATION_SMOKE_TEST";

const schemaApplyEnabled = () => process.env.GXEON_R100_DB_SCHEMA_OPERATOR_APPLY_ENABLED === "true";

const schemaStatements = [
  'CREATE EXTENSION IF NOT EXISTS "pgcrypto"',
  'CREATE TABLE IF NOT EXISTS "r100_state_snapshots" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL, "snapshot_id" text NOT NULL, "snapshot_mode" text DEFAULT \'SAFE_REDACTED\' NOT NULL, "source" text DEFAULT \'R100_DURABLE_STATE_MIRROR_P2\' NOT NULL, "collection_counts" jsonb DEFAULT \'{}\'::jsonb NOT NULL, "collections" jsonb DEFAULT \'{}\'::jsonb NOT NULL, "safety" jsonb DEFAULT \'{}\'::jsonb NOT NULL, "metadata" jsonb DEFAULT \'{}\'::jsonb NOT NULL, "created_at" timestamp with time zone DEFAULT now() NOT NULL, "updated_at" timestamp with time zone DEFAULT now() NOT NULL)',
  'CREATE UNIQUE INDEX IF NOT EXISTS "r100_state_snapshots_snapshot_id_uq" ON "r100_state_snapshots" USING btree ("snapshot_id")',
  'CREATE INDEX IF NOT EXISTS "r100_state_snapshots_snapshot_mode_idx" ON "r100_state_snapshots" USING btree ("snapshot_mode")',
  'CREATE INDEX IF NOT EXISTS "r100_state_snapshots_source_idx" ON "r100_state_snapshots" USING btree ("source")',
  'CREATE INDEX IF NOT EXISTS "r100_state_snapshots_created_at_idx" ON "r100_state_snapshots" USING btree ("created_at")',
  'CREATE TABLE IF NOT EXISTS "r100_state_audit_events" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL, "event_id" text NOT NULL, "event_type" text NOT NULL, "source" text DEFAULT \'R100_DB_MIRROR\' NOT NULL, "payload" jsonb DEFAULT \'{}\'::jsonb NOT NULL, "safety" jsonb DEFAULT \'{}\'::jsonb NOT NULL, "created_at" timestamp with time zone DEFAULT now() NOT NULL)',
  'CREATE UNIQUE INDEX IF NOT EXISTS "r100_state_audit_events_event_id_uq" ON "r100_state_audit_events" USING btree ("event_id")',
  'CREATE INDEX IF NOT EXISTS "r100_state_audit_events_event_type_idx" ON "r100_state_audit_events" USING btree ("event_type")',
  'CREATE INDEX IF NOT EXISTS "r100_state_audit_events_source_idx" ON "r100_state_audit_events" USING btree ("source")',
  'CREATE INDEX IF NOT EXISTS "r100_state_audit_events_created_at_idx" ON "r100_state_audit_events" USING btree ("created_at")',
];

export async function dryRunR100DatabaseMirrorSchema(): Promise<R100DatabaseMirrorSchemaDryRun> {
  const diagnostics = await getR100DatabaseMirrorSchemaDiagnostics();
  return { status: "R100_DB_MIRROR_SCHEMA_DRY_RUN_P2", mode: "MANUAL_FIRST", wouldWrite: false, schemaApplyEnabled: schemaApplyEnabled(), requiredAction: APPLY_R100_DB_MIRROR_SCHEMA_ACTION, plan: schemaStatements.map((sql, index) => ({ index: index + 1, sqlPreview: sql })), diagnostics, nextManualAction: diagnostics.schemaReady ? "Schema is already ready; keep apply-schema unused and proceed to mirror flag/probe/snapshot." : "Only apply after reviewing dry-run, setting GXEON_R100_DB_SCHEMA_OPERATOR_APPLY_ENABLED=true, and sending the exact required action.", safety: r100DatabaseMirrorSafety };
}

export async function applyR100DatabaseMirrorSchema(action: unknown): Promise<R100DatabaseMirrorSchemaApplyResult> {
  if (action !== APPLY_R100_DB_MIRROR_SCHEMA_ACTION) return { status: "R100_DB_MIRROR_SCHEMA_APPLY_CONFIRMATION_REQUIRED", mode: "MANUAL_FIRST", applied: false, blocked: true, nextManualAction: `Send action=${APPLY_R100_DB_MIRROR_SCHEMA_ACTION} only after dry-run approval.`, safety: r100DatabaseMirrorSafety };
  if (!schemaApplyEnabled()) return { status: "R100_DB_MIRROR_SCHEMA_APPLY_BLOCKED_BY_FLAG", mode: "MANUAL_FIRST", applied: false, blocked: true, nextManualAction: "Temporarily set GXEON_R100_DB_SCHEMA_OPERATOR_APPLY_ENABLED=true in the backend, redeploy, then retry with the exact action. Set it back to false after apply.", safety: r100DatabaseMirrorSafety };
  if (!isDatabaseConfigured()) return { status: "R100_DB_MIRROR_SCHEMA_APPLY_BLOCKED_NO_DATABASE", mode: "MANUAL_FIRST", applied: false, blocked: true, nextManualAction: "Configure DATABASE_URL in the backend only before schema apply.", safety: r100DatabaseMirrorSafety };
  try {
    for (const sql of schemaStatements) await getPool().query(sql);
    return { status: "R100_DB_MIRROR_SCHEMA_APPLIED_P2", mode: "MANUAL_FIRST", applied: true, blocked: false, diagnostics: await getR100DatabaseMirrorSchemaDiagnostics(), nextManualAction: "Set GXEON_R100_DB_SCHEMA_OPERATOR_APPLY_ENABLED=false again; then enable GXEON_R100_DB_MIRROR_ENABLED=true when ready for guarded writes.", safety: r100DatabaseMirrorSafety };
  } catch {
    return { status: "R100_DB_MIRROR_SCHEMA_APPLY_FAILED_SAFE", mode: "MANUAL_FIRST", applied: false, blocked: true, nextManualAction: "Schema apply failed safely without exposing connection details. Inspect backend database permissions/logs manually, then run diagnostics again.", safety: r100DatabaseMirrorSafety };
  }
}

export async function runR100DatabaseMirrorActivationSmokeTest(): Promise<R100DatabaseMirrorActivationSmokeTest> {
  const [readiness, diagnostics, status, latestSnapshot] = await Promise.all([getR100DatabaseMirrorReadiness(), getR100DatabaseMirrorSchemaDiagnostics(), getR100DatabaseMirrorStatus(), getLatestR100DatabaseMirrorSnapshot()]);
  return { status: "R100_DB_MIRROR_ACTIVATION_SMOKE_TEST_P2", mode: "MANUAL_FIRST", wroteToDatabase: false, readiness, diagnostics, mirrorStatus: status, latestSnapshot, nextManualAction: status.snapshotCount >= 1 ? "DB mirror has at least one SAFE_REDACTED snapshot for operational memory." : readiness.nextManualAction, safety: r100DatabaseMirrorSafety };
}
