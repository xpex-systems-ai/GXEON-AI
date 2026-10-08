import type { R100DurableCollectionName, R100DurableSafetyMetadata } from "./r100DurableStateTypes";

export type R100DatabaseMirrorStatusCode = "R100_DB_MIRROR_P2_READY" | "R100_DB_MIRROR_DISABLED" | "R100_DB_NOT_CONFIGURED" | "R100_DB_MIRROR_UNHEALTHY";

export type R100DatabaseMirrorStatus = {
  status: R100DatabaseMirrorStatusCode;
  mode: "MANUAL_FIRST";
  databaseConfigured: boolean;
  mirrorEnabled: boolean;
  schemaApplyEnabled: boolean;
  safeWriteEnabled: boolean;
  safeToWrite: boolean;
  activationStage?: string;
  blockedReasons?: string[];
  safeFlags?: Record<string, boolean | number | string>;
  safeToProceed: boolean;
  providerVerifiedRevenueBrl: 0;
  realRevenueClaimedAutomatically: false;
  latestSnapshotAt: string | null;
  snapshotCount: number;
  warnings: string[];
  safety: R100DurableSafetyMetadata & { previewOnly: true; noSecrets: true; dbMirrorOnly: true; notPaymentSettlement: true };
};

export type R100DatabaseMirrorSnapshot = {
  snapshotId: string | null;
  snapshotMode: "SAFE_REDACTED";
  source: "R100_DURABLE_STATE_MIRROR_P2";
  collectionCounts: Record<R100DurableCollectionName, number>;
  collections: Partial<Record<R100DurableCollectionName, unknown[]>>;
  metadata: Record<string, unknown>;
  createdAt: string | null;
  safety: R100DatabaseMirrorStatus["safety"];
};

export type R100DatabaseMirrorWriteResult = {
  status: "R100_DB_MIRROR_PROBE_WRITTEN" | "R100_DB_MIRROR_SNAPSHOT_EXPORTED";
  probeCreated?: boolean;
  snapshotCreated?: boolean;
  eventId?: string;
  auditEventId?: string;
  snapshotId?: string;
  snapshotCount?: number;
  safeRedacted?: true;
  operatorConfirmedRevenueBrl?: number;
  message?: string;
  wroteToDatabase: true;
  providerVerifiedRevenueBrl: 0;
  realRevenueClaimedAutomatically: false;
  safety: R100DatabaseMirrorStatus["safety"];
};

export type R100DatabaseMirrorReadiness = {
  status: "R100_DB_MIRROR_SCHEMA_READINESS_P2";
  mode: "MANUAL_FIRST";
  databaseConfigured: boolean;
  schemaReady: boolean;
  snapshotsTableReady: boolean;
  auditEventsTableReady: boolean;
  mirrorEnabled: boolean;
  schemaApplyEnabled: boolean;
  safeWriteEnabled: boolean;
  safeToWrite: boolean;
  activationStage?: string;
  blockedReasons?: string[];
  safeFlags?: Record<string, boolean | number | string>;
  nextManualAction: string;
  warnings: string[];
  safety: R100DatabaseMirrorStatus["safety"] & { manualFirst: true; previewOnly: true; dbMirrorOnly: true; notPaymentSettlement: true; providerVerifiedRevenueBrl: 0; realRevenueClaimedAutomatically: false; noCheckout: true; noInvoice: true; noWebhookPaymentCapture: true; };
};

export type R100DatabaseMirrorActivationPlan = {
  status: "R100_DB_MIRROR_ACTIVATION_PLAN_P2";
  mode: "MANUAL_FIRST";
  readinessStatus: R100DatabaseMirrorReadiness["status"];
  currentReadiness: R100DatabaseMirrorReadiness;
  checklist: string[];
  rollback: string[];
  nextManualAction: string;
  warnings: string[];
  safety: R100DatabaseMirrorReadiness["safety"];
};

export type R100DatabaseMirrorTableDiagnostics = {
  tableName: "r100_state_snapshots" | "r100_state_audit_events";
  exists: boolean;
  requiredColumns: string[];
  availableColumns: string[];
  missingColumns: string[];
  extraColumns: string[];
  ready: boolean;
};

export type R100DatabaseMirrorSchemaDiagnostics = {
  status: "R100_DB_MIRROR_SCHEMA_DIAGNOSTICS_P2";
  mode: "MANUAL_FIRST";
  databaseConfigured: boolean;
  schemaReady: boolean;
  mirrorEnabled: boolean;
  schemaApplyEnabled: boolean;
  safeWriteEnabled?: boolean;
  safeToApply?: boolean;
  missingTables?: string[];
  missingColumns?: Record<string, string[]>;
  existingTables?: string[];
  requiredFlags?: string[];
  blockedReasons?: string[];
  safeToWrite: boolean;
  tables: R100DatabaseMirrorTableDiagnostics[];
  warnings: string[];
  nextManualAction: string;
  safety: R100DatabaseMirrorStatus["safety"];
};

export type R100DatabaseMirrorSchemaDryRun = {
  status: "R100_DB_MIRROR_SCHEMA_DRY_RUN_P2";
  mode: "MANUAL_FIRST";
  wouldWrite: false;
  schemaApplyEnabled: boolean;
  requiredAction: "APPLY_R100_DB_MIRROR_SCHEMA_OPERATOR_APPROVED";
  plan: Array<{ index: number; sqlPreview: string }>;
  diagnostics: R100DatabaseMirrorSchemaDiagnostics;
  nextManualAction: string;
  safety: R100DatabaseMirrorStatus["safety"];
};

export type R100DatabaseMirrorSchemaApplyResult = {
  status: "R100_DB_MIRROR_SCHEMA_APPLY_CONFIRMATION_REQUIRED" | "R100_DB_MIRROR_SCHEMA_APPLY_BLOCKED_BY_FLAG" | "R100_DB_MIRROR_SCHEMA_APPLY_BLOCKED_NO_DATABASE" | "R100_DB_MIRROR_SCHEMA_APPLIED_P2" | "R100_DB_MIRROR_SCHEMA_APPLY_FAILED_SAFE";
  mode: "MANUAL_FIRST";
  applied: boolean;
  blocked: boolean;
  schemaReady?: boolean;
  safeRedacted?: true;
  auditEventId?: string;
  message?: string;
  diagnostics?: R100DatabaseMirrorSchemaDiagnostics;
  nextManualAction: string;
  safety: R100DatabaseMirrorStatus["safety"];
};

export type R100DatabaseMirrorActivationSmokeTest = {
  status: "R100_DB_MIRROR_ACTIVATION_SMOKE_TEST_P2";
  mode: "MANUAL_FIRST";
  wroteToDatabase: false;
  ok?: boolean;
  databaseReachable?: boolean;
  schemaReady?: boolean;
  safeToWrite?: boolean;
  message?: string;
  safeFlags?: Record<string, boolean | number | string>;
  readiness: R100DatabaseMirrorReadiness;
  diagnostics: R100DatabaseMirrorSchemaDiagnostics;
  mirrorStatus: R100DatabaseMirrorStatus;
  latestSnapshot: R100DatabaseMirrorSnapshot;
  nextManualAction: string;
  safety: R100DatabaseMirrorStatus["safety"];
};
