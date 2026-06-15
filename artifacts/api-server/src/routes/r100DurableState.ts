import { Router } from "express";
import { listClientOfferSendPacks, hydrateClientOfferSendPacksFromDurableState } from "../clientOffer/clientOfferSendStore";
import { r100DurableStateRegistry } from "../durableState/r100DurableStateRegistry";
import { r100CollectionNames, r100DurableSafety, type R100DurableCollectionName } from "../durableState/r100DurableStateTypes";
import { buildR100DurableVerificationSummary } from "../durableState/r100DurableVerificationService";
import { createR100DurabilityProbe, listR100DurabilityProbes } from "../durableState/r100DurabilityProbeStore";
import { listLedgerPreviews, hydrateLedgerPreviewsFromDurableState } from "../ledger/ledgerStore";
import { listManualPaymentRequests, hydrateManualPaymentRequestsFromDurableState } from "../manualPayment/manualPaymentRequestStore";
import { listOperatorWorkflowHandoffs, hydrateOperatorWorkflowHandoffsFromDurableState } from "../operatorWorkflow/operatorWorkflowStore";
import { listManualProspects, hydrateManualProspectsFromDurableState } from "../prospect/manualProspectStore";
import { listRevenueCloseLoops, listOperatorConfirmedRevenue, hydrateRevenueCloseLoopsFromDurableState } from "../revenueCloseLoop/revenueCloseLoopStore";

const router = Router();
const redactKeys = new Set([
  "manualPaymentLink",
  "pixKeyLabel",
  "email",
  "phone",
  "whatsapp",
  "privateNotes",
  "notes",
  "token",
  "apiKey",
  "secret",
  "credential",
]);

function noStore(res: { setHeader: (name: string, value: string) => void }) {
  res.setHeader("Cache-Control", "no-store");
}

function redact(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redact);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, nestedValue]) => [
        key,
        redactKeys.has(key) ? "REDACTED_SAFE_SNAPSHOT" : redact(nestedValue),
      ]),
    );
  }

  return value;
}

function getCollectionsSnapshot(): Record<R100DurableCollectionName, unknown[]> {
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

function isConfirmed(body: unknown, expectedAction: string): boolean {
  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  return record.action === expectedAction || record.confirm === expectedAction;
}

router.get("/r100-state/status", (_req, res) => {
  noStore(res);
  res.json({ success: true, data: r100DurableStateRegistry.getStatus() });
});

router.get("/r100-state/snapshot", (_req, res) => {
  noStore(res);
  const rawCollections = getCollectionsSnapshot();
  const safeCollections = Object.fromEntries(
    r100CollectionNames.map((name) => [name, redact(rawCollections[name])]),
  ) as Record<R100DurableCollectionName, unknown[]>;

  res.json({
    success: true,
    data: {
      redacted: true,
      snapshotMode: "SAFE_REDACTED",
      collections: safeCollections,
      safety: { ...r100DurableSafety, redacted: true, noSecrets: true },
    },
  });
});

router.get("/r100-state/verification", (_req, res) => {
  noStore(res);
  res.json({ success: true, data: buildR100DurableVerificationSummary() });
});

router.post("/r100-state/probe", (req, res) => {
  noStore(res);
  if (!isConfirmed(req.body, "CREATE_SAFE_R100_DURABILITY_PROBE")) {
    return res.status(400).json({ success: false, error: "CREATE_SAFE_R100_DURABILITY_PROBE_CONFIRMATION_REQUIRED" });
  }

  res.json({ success: true, data: createR100DurabilityProbe() });
});

router.post("/r100-state/reload", (req, res) => {
  noStore(res);
  if (!isConfirmed(req.body, "RELOAD_R100_STATE_MANUALLY")) {
    return res.status(400).json({ success: false, error: "RELOAD_R100_STATE_MANUALLY_CONFIRMATION_REQUIRED" });
  }

  hydrateManualProspectsFromDurableState();
  hydrateClientOfferSendPacksFromDurableState();
  hydrateManualPaymentRequestsFromDurableState();
  hydrateRevenueCloseLoopsFromDurableState();
  hydrateLedgerPreviewsFromDurableState();
  hydrateOperatorWorkflowHandoffsFromDurableState();
  r100DurableStateRegistry.appendEvent({
    type: "MANUAL_RELOAD",
    metadata: { noExternalCalls: true, noAutoRun: true },
  });
  res.json({
    success: true,
    data: {
      reloaded: true,
      status: r100DurableStateRegistry.getStatus(),
      verification: buildR100DurableVerificationSummary(),
    },
  });
});

export default router;
