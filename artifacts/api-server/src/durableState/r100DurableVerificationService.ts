import { listClientOfferSendPacks } from "../clientOffer/clientOfferSendStore";
import { listLedgerPreviews } from "../ledger/ledgerStore";
import { listManualPaymentRequests } from "../manualPayment/manualPaymentRequestStore";
import { listOperatorWorkflowHandoffs } from "../operatorWorkflow/operatorWorkflowStore";
import { listManualProspects } from "../prospect/manualProspectStore";
import { listOperatorConfirmedRevenue, listRevenueCloseLoops } from "../revenueCloseLoop/revenueCloseLoopStore";
import { getR100DatabaseMirrorStatus } from "./r100DatabaseMirrorService";
import { r100DurableStateRegistry } from "./r100DurableStateRegistry";
import { listR100DurabilityProbes } from "./r100DurabilityProbeStore";
import type { R100DurabilityLevel, R100DurableCollectionCounts, R100DurableVerificationSafety, R100DurableVerificationSummary, R100OperatorTrustLevel } from "./r100DurableVerificationTypes";

export const r100DurableVerificationSafety: R100DurableVerificationSafety = {
  manualFirst: true,
  previewOnly: true,
  noPaymentProviderApi: true,
  noAutoSend: true,
  noGithubWrite: true,
  noExternalContact: true,
  noScraping: true,
  providerVerifiedRevenueBrl: 0,
  realRevenueClaimedAutomatically: false,
};

function safeCount(fn: () => unknown[]): number { try { return fn().length; } catch { return 0; } }

export function getR100CollectionCounts(): R100DurableCollectionCounts {
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

function durabilityLevel(healthy: boolean, fallbackUsed: boolean, mode: string): R100DurabilityLevel {
  if (!healthy || fallbackUsed) return "UNHEALTHY_FALLBACK";
  return mode === "SERVER_LOCAL_JSON" ? "SERVER_LOCAL_JSON" : "MEMORY_ONLY";
}

function trustLevel(level: R100DurabilityLevel): R100OperatorTrustLevel {
  if (level === "SERVER_LOCAL_JSON") return "HIGH";
  if (level === "MEMORY_ONLY") return "MEDIUM";
  return "LOW";
}

function warnings(level: R100DurabilityLevel): string[] {
  const base = [
    "Manual-first.",
    "Preview-only.",
    "Operator-approved only.",
    "No payment provider API.",
    "No checkout.",
    "No invoice.",
    "No auto-send.",
    "No external contact.",
    "No GitHub write.",
    "No scraping.",
    "Provider verified revenue remains R$0.",
    "Real revenue is operator-confirmed only.",
  ];
  if (level === "MEMORY_ONLY") return ["SAFE_MEMORY_FALLBACK does not survive process restart.", ...base];
  if (level === "SERVER_LOCAL_JSON") return ["SERVER_LOCAL_JSON only persists on the local server filesystem and is not a production database.", ...base];
  return ["Adapter is unhealthy or using fallback; verify before scaling.", ...base];
}

export function buildR100DurableVerificationSummary(): R100DurableVerificationSummary {
  const status = r100DurableStateRegistry.getStatus();
  const level = durabilityLevel(status.healthy, status.fallbackUsed, status.persistenceMode);
  const counts = getR100CollectionCounts();
  const dbMirror = getR100DatabaseMirrorStatus();
  const mirrorReady = dbMirror.status === "R100_DB_MIRROR_P2_READY";
  return {
    status: "R100_DURABLE_STATE_VERIFICATION_P1_READY",
    mode: "MANUAL_FIRST",
    persistenceMode: status.persistenceMode,
    healthy: status.healthy,
    fallbackUsed: status.fallbackUsed,
    durabilityLevel: level,
    operatorTrustLevel: mirrorReady ? "HIGH" : trustLevel(level),
    safeToProceed: status.healthy,
    needsDatabaseBeforeScale: !mirrorReady,
    lastLoadedAt: status.lastLoadedAt,
    lastSavedAt: status.lastSavedAt,
    collectionCounts: counts,
    restoredCollections: status.restoredCollections,
    warnings: [...warnings(level), "Database mirror P2 is a safe readiness mirror only and is not payment settlement."],
    nextManualAction: level === "SERVER_LOCAL_JSON" ? "Run a safe probe, verify snapshot redaction, then continue the manual R$100 flow." : level === "MEMORY_ONLY" ? "Enable server-local JSON only if the runtime has durable storage; otherwise treat restart recovery as unavailable." : "Keep manual flow operational, export redacted snapshot for audit, and inspect adapter health before relying on recovery.",
    safety: r100DurableVerificationSafety,
    dbMirror: { status: dbMirror.status, databaseConfigured: dbMirror.databaseConfigured, mirrorEnabled: dbMirror.mirrorEnabled, safeToWrite: dbMirror.safeToWrite, safeToProceed: dbMirror.safeToProceed, providerVerifiedRevenueBrl: 0, realRevenueClaimedAutomatically: false, latestSnapshotAt: dbMirror.latestSnapshotAt, snapshotCount: dbMirror.snapshotCount, warnings: dbMirror.warnings },
  };
}
