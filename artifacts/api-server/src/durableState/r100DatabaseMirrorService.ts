import { count, desc } from "drizzle-orm";
import { getDb, isDatabaseConfigured, r100StateAuditEvents, r100StateSnapshots } from "@workspace/db";
import { listClientOfferSendPacks } from "../clientOffer/clientOfferSendStore";
import { listLedgerPreviews } from "../ledger/ledgerStore";
import { listManualPaymentRequests } from "../manualPayment/manualPaymentRequestStore";
import { listOperatorWorkflowHandoffs } from "../operatorWorkflow/operatorWorkflowStore";
import { listManualProspects } from "../prospect/manualProspectStore";
import { listOperatorConfirmedRevenue, listRevenueCloseLoops } from "../revenueCloseLoop/revenueCloseLoopStore";
import { r100CollectionNames, r100DurableSafety, type R100DurableCollectionName } from "./r100DurableStateTypes";
import { listR100DurabilityProbes } from "./r100DurabilityProbeStore";
import { getR100DatabaseMirrorReadiness } from "./r100DatabaseMirrorReadinessService";
import type { R100DatabaseMirrorSnapshot, R100DatabaseMirrorStatus, R100DatabaseMirrorWriteResult } from "./r100DatabaseMirrorTypes";

const source = "R100_DURABLE_STATE_MIRROR_P2" as const;
const redactKeys = new Set(["manualPaymentLink", "pixKeyLabel", "email", "phone", "whatsapp", "privateNotes", "notes", "token", "apiKey", "secret", "credential", "databaseUrl", "DATABASE_URL"]);

const mirrorEnabled = () => process.env.GXEON_R100_DB_MIRROR_ENABLED === "true";
const safeWriteEnabled = () => process.env.GXEON_R100_DB_SAFE_WRITE_ENABLED === "true";
const nowId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

export const r100DatabaseMirrorSafety = { ...r100DurableSafety, previewOnly: true, noSecrets: true, dbMirrorOnly: true, notPaymentSettlement: true } as const;

function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, nested]) => [key, redactKeys.has(key) ? "REDACTED_SAFE_DB_MIRROR" : redact(nested)]));
  }
  return value;
}

function safeCount(fn: () => unknown[]): number { try { return fn().length; } catch { return 0; } }

function getR100MirrorCollectionCounts(): Record<R100DurableCollectionName, number> {
  return {
    manualProspects: safeCount(listManualProspects),
    clientOfferSendPacks: safeCount(listClientOfferSendPacks),
    manualPaymentRequests: safeCount(listManualPaymentRequests),
    revenueCloseLoops: safeCount(listRevenueCloseLoops),
    operatorConfirmedRevenue: safeCount(listOperatorConfirmedRevenue),
    ledgerPreviews: safeCount(listLedgerPreviews),
    operatorWorkflowHandoffs: safeCount(listOperatorWorkflowHandoffs),
    durabilityProbes: safeCount(listR100DurabilityProbes),
  };
}

function currentCollections(): Record<R100DurableCollectionName, unknown[]> {
  return {
    manualProspects: listManualProspects(),
    clientOfferSendPacks: listClientOfferSendPacks(),
    manualPaymentRequests: listManualPaymentRequests(),
    revenueCloseLoops: listRevenueCloseLoops(),
    operatorConfirmedRevenue: listOperatorConfirmedRevenue(),
    ledgerPreviews: listLedgerPreviews(),
    operatorWorkflowHandoffs: listOperatorWorkflowHandoffs(),
    durabilityProbes: listR100DurabilityProbes(),
  };
}


export function getR100DatabaseMirrorStatusSync(): R100DatabaseMirrorStatus {
  const databaseConfigured = isDatabaseConfigured();
  const enabled = mirrorEnabled();
  const status = !databaseConfigured ? "R100_DB_NOT_CONFIGURED" : !enabled ? "R100_DB_MIRROR_DISABLED" : "R100_DB_MIRROR_P2_READY";
  return {
    status,
    mode: "MANUAL_FIRST",
    databaseConfigured,
    mirrorEnabled: enabled,
    schemaApplyEnabled: process.env.GXEON_R100_DB_SCHEMA_OPERATOR_APPLY_ENABLED === "true",
    safeWriteEnabled: safeWriteEnabled(),
    safeToWrite: databaseConfigured && enabled && safeWriteEnabled(),
    safeToProceed: databaseConfigured && enabled && safeWriteEnabled(),
    providerVerifiedRevenueBrl: 0,
    realRevenueClaimedAutomatically: false,
    latestSnapshotAt: null,
    snapshotCount: 0,
    warnings: ["DB mirror P2 is readiness only, not payment settlement.", ...(databaseConfigured ? [] : ["DATABASE_URL is not configured; database writes stay disabled."]), ...(enabled ? [] : ["GXEON_R100_DB_MIRROR_ENABLED=true is required before writes."])],
    safety: r100DatabaseMirrorSafety,
  };
}

export async function getR100DatabaseMirrorStatus(): Promise<R100DatabaseMirrorStatus> {
  const readiness = await getR100DatabaseMirrorReadiness();
  let latestSnapshotAt: string | null = null;
  let snapshotCount = 0;
  const warnings = [...readiness.warnings, "DB mirror P2 is readiness only, not payment settlement.", "No payment provider API, checkout, invoice, webhook, or external contact is used."];

  if (readiness.databaseConfigured && readiness.schemaReady) {
    try {
      const [countRow] = await getDb().select({ value: count() }).from(r100StateSnapshots);
      snapshotCount = Number(countRow?.value ?? 0);
      const latest = await getDb().select({ createdAt: r100StateSnapshots.createdAt }).from(r100StateSnapshots).orderBy(desc(r100StateSnapshots.createdAt)).limit(1);
      latestSnapshotAt = latest[0]?.createdAt?.toISOString() ?? null;
    } catch {
      warnings.push("Snapshot metadata read failed; no write was attempted.");
    }
  } else if (readiness.databaseConfigured) {
    warnings.push("DB schema is not ready; snapshotCount remains 0 until mirror tables exist.");
  }

  const status = !readiness.databaseConfigured ? "R100_DB_NOT_CONFIGURED" : !readiness.schemaReady ? "R100_DB_MIRROR_UNHEALTHY" : !readiness.mirrorEnabled ? "R100_DB_MIRROR_DISABLED" : "R100_DB_MIRROR_P2_READY";
  return {
    status,
    mode: "MANUAL_FIRST",
    databaseConfigured: readiness.databaseConfigured,
    mirrorEnabled: readiness.mirrorEnabled,
    schemaApplyEnabled: readiness.schemaApplyEnabled,
    safeWriteEnabled: readiness.safeWriteEnabled,
    safeToWrite: readiness.safeToWrite,
    safeToProceed: readiness.safeToWrite,
    providerVerifiedRevenueBrl: 0,
    realRevenueClaimedAutomatically: false,
    latestSnapshotAt,
    snapshotCount,
    warnings,
    safety: r100DatabaseMirrorSafety,
  };
}

export async function getLatestR100DatabaseMirrorSnapshot(): Promise<R100DatabaseMirrorSnapshot> {
  const readiness = await getR100DatabaseMirrorReadiness();
  if (!readiness.databaseConfigured || !readiness.schemaReady) return { snapshotId: null, snapshotMode: "SAFE_REDACTED", source, collectionCounts: getR100MirrorCollectionCounts(), collections: {}, metadata: { fallback: readiness.status, nextManualAction: readiness.nextManualAction }, createdAt: null, safety: r100DatabaseMirrorSafety };
  try {
    const rows = await getDb().select().from(r100StateSnapshots).orderBy(desc(r100StateSnapshots.createdAt)).limit(1);
    const row = rows[0];
    if (!row) return { snapshotId: null, snapshotMode: "SAFE_REDACTED", source, collectionCounts: getR100MirrorCollectionCounts(), collections: {}, metadata: { empty: true }, createdAt: null, safety: r100DatabaseMirrorSafety };
    return { snapshotId: row.snapshotId, snapshotMode: "SAFE_REDACTED", source, collectionCounts: { manualProspects: row.prospectsCount, clientOfferSendPacks: row.clientOffersCount, manualPaymentRequests: row.manualPaymentRequestsCount, revenueCloseLoops: row.closeLoopsCount, operatorConfirmedRevenue: 0, ledgerPreviews: row.ledgerPreviewsCount, operatorWorkflowHandoffs: 0, durabilityProbes: 0 }, collections: {}, metadata: row.summaryJson as Record<string, unknown>, createdAt: row.createdAt.toISOString(), safety: r100DatabaseMirrorSafety };
  } catch {
    return { snapshotId: null, snapshotMode: "SAFE_REDACTED", source, collectionCounts: getR100MirrorCollectionCounts(), collections: {}, metadata: { fallback: "R100_DB_MIRROR_UNHEALTHY" }, createdAt: null, safety: r100DatabaseMirrorSafety };
  }
}

async function assertWritable() { const status = await getR100DatabaseMirrorStatus(); if (!status.safeToWrite) throw new Error(status.status); }

export async function createR100DatabaseMirrorProbe(): Promise<R100DatabaseMirrorWriteResult> {
  await assertWritable();
  const eventId = nowId("r100_db_probe");
  await getDb().insert(r100StateAuditEvents).values({ eventId, eventType: "CREATE_SAFE_R100_DB_MIRROR_PROBE", status: "SAFE_REDACTED", safeRedacted: true, operatorAction: "CREATE_SAFE_R100_DB_MIRROR_PROBE", message: "Safe R$100 DB mirror probe created; no business/payment record was created.", metadataJson: { harmlessProbe: true, businessRecordCreated: false, providerVerifiedRevenueBrl: 0 } });
  return { status: "R100_DB_MIRROR_PROBE_WRITTEN", probeCreated: true, eventId, auditEventId: eventId, safeRedacted: true, message: "Safe probe audit event created.", wroteToDatabase: true, providerVerifiedRevenueBrl: 0, realRevenueClaimedAutomatically: false, safety: r100DatabaseMirrorSafety };
}

export async function exportSafeR100SnapshotToDatabaseMirror(): Promise<R100DatabaseMirrorWriteResult> {
  await assertWritable();
  const snapshotId = nowId("r100_safe_snapshot");
  const collections = Object.fromEntries(r100CollectionNames.map((name) => [name, redact(currentCollections()[name])]));
  const counts = getR100MirrorCollectionCounts();
  await getDb().insert(r100StateSnapshots).values({ snapshotId, source, status: "SAFE_REDACTED", schemaVersion: "R100_DB_MIRROR_P2_SAFE_SCHEMA_V1", snapshotMode: "SAFE_REDACTED", safeRedacted: true, operatorConfirmedRevenueBrl: "0", providerVerifiedRevenueBrl: "0", forecastRevenueBrl: "0", pendingReviewBrl: "0", lostBrl: "0", prospectsCount: counts.manualProspects, clientOffersCount: counts.clientOfferSendPacks, manualPaymentRequestsCount: counts.manualPaymentRequests, closeLoopsCount: counts.revenueCloseLoops, ledgerPreviewsCount: counts.ledgerPreviews, executionPacksCount: 0, deliveryWorkspacesCount: 0, safetyFlagsJson: r100DatabaseMirrorSafety, summaryJson: { manualFirst: true, previewOnly: true, providerVerifiedRevenueBrl: 0, realRevenueClaimedAutomatically: false, counts, collections } });
  const status = await getR100DatabaseMirrorStatus();
  return { status: "R100_DB_MIRROR_SNAPSHOT_EXPORTED", snapshotCreated: true, snapshotId, snapshotCount: status.snapshotCount, safeRedacted: true, operatorConfirmedRevenueBrl: 0, message: "SAFE_REDACTED snapshot exported to DB mirror.", wroteToDatabase: true, providerVerifiedRevenueBrl: 0, realRevenueClaimedAutomatically: false, safety: r100DatabaseMirrorSafety };
}
