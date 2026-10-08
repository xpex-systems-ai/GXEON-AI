import { Router, type IRouter, type Request, type Response } from "express";
import { governanceAuth } from "../middlewares/governanceAuth";
import {
  claimClawlancerBounty,
  deliverClawlancerTransaction,
  getClawlancerAgentPublicProfile,
  getClawlancerConfiguration,
  getClawlancerPlatformInfo,
  getClawlancerWalletBalance,
  listClawlancerBounties,
  listClawlancerTransactions,
} from "../clawlancer/clawlancerClient";

const router: IRouter = Router();

router.use("/clawlancer", (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

function safeError(res: Response, error: unknown, status = 502) {
  const message = error instanceof Error ? error.message : "CLAWLANCER_REQUEST_FAILED";
  res.status(status).json({ success: false, error: message, message });
}

function operatorApproved(req: Request) {
  const approval = req.headers["x-gxeon-operator-approval"];
  const body = req.body && typeof req.body === "object" ? req.body as Record<string, unknown> : {};
  return approval === "approved" && body.confirm === true;
}

router.get("/clawlancer/status", async (_req, res) => {
  try {
    const [info, agent, opportunities] = await Promise.all([
      getClawlancerPlatformInfo(),
      getClawlancerAgentPublicProfile(),
      listClawlancerBounties(),
    ]);
    const config = getClawlancerConfiguration();

    res.json({
      success: true,
      data: {
        status: "CLAWLANCER_LIVE_RADAR_READY",
        mode: config.authenticatedOperationsReady ? "LIVE_AUTHENTICATED_READY" : "LIVE_PUBLIC_READONLY",
        provider: "CLAWLANCER",
        chain: "Base",
        settlementAsset: "USDC",
        configuration: config,
        platform: {
          description: info.description ?? null,
          stats: info.stats ?? null,
        },
        agent,
        opportunityCount: opportunities.length,
        gxeonWelcomeTarget: opportunities.find((item) => item.gxeonWelcomeTarget) ?? null,
        boundaries: [
          "Provider secret remains backend-only",
          "No private key or seed phrase accepted",
          "No wallet withdrawal endpoint in GXEON",
          "Claim and delivery require governance authentication plus explicit operator confirmation",
          "Revenue remains unverified until settlement evidence exists",
        ],
      },
    });
  } catch (error) {
    safeError(res, error);
  }
});

router.get("/clawlancer/opportunities", async (_req, res) => {
  try {
    const opportunities = await listClawlancerBounties();
    res.json({
      success: true,
      data: {
        mode: "LIVE_PUBLIC_DATA",
        provider: "CLAWLANCER",
        fetchedAt: new Date().toISOString(),
        count: opportunities.length,
        opportunities,
      },
    });
  } catch (error) {
    safeError(res, error);
  }
});

router.get("/clawlancer/snapshot", async (_req, res) => {
  try {
    const config = getClawlancerConfiguration();
    const [agent, opportunities] = await Promise.all([
      getClawlancerAgentPublicProfile(),
      listClawlancerBounties(),
    ]);
    let transactions: Awaited<ReturnType<typeof listClawlancerTransactions>> = [];
    let wallet: Awaited<ReturnType<typeof getClawlancerWalletBalance>> | null = null;
    let authenticatedReadError: string | null = null;

    if (config.authenticatedOperationsReady) {
      try {
        [transactions, wallet] = await Promise.all([
          listClawlancerTransactions(),
          getClawlancerWalletBalance(),
        ]);
      } catch (error) {
        authenticatedReadError = error instanceof Error ? error.message : "AUTHENTICATED_READ_FAILED";
      }
    }

    const verifiedTransactions = transactions.filter((item) => item.payoutVerified);
    const verifiedRevenueUsdc = verifiedTransactions.reduce((sum, item) => sum + (item.amountUsdc ?? 0), 0);

    res.json({
      success: true,
      data: {
        generatedAt: new Date().toISOString(),
        provider: "CLAWLANCER",
        chain: "Base",
        settlementAsset: "USDC",
        mode: config.authenticatedOperationsReady ? "LIVE" : "LIVE_PUBLIC_READONLY",
        configuration: config,
        agent,
        authenticatedReadError,
        target: opportunities.find((item) => item.gxeonWelcomeTarget) ?? null,
        opportunities,
        transactions,
        wallet,
        revenue: {
          verifiedUsdc: verifiedRevenueUsdc,
          verifiedCount: verifiedTransactions.length,
          rule: "A transaction is counted as verified only when it is in a terminal paid state and contains a transaction hash.",
        },
      },
    });
  } catch (error) {
    safeError(res, error);
  }
});

router.post("/clawlancer/listings/:id/claim", governanceAuth, async (req, res) => {
  if (!operatorApproved(req)) {
    return res.status(409).json({
      success: false,
      error: "OPERATOR_APPROVAL_REQUIRED",
      message: "Send X-GXEON-Operator-Approval: approved and body { confirm: true } to claim.",
    });
  }

  if (typeof req.params.id !== "string") return res.status(400).json({ success: false, error: "INVALID_LISTING_ID" });
  try {
    const result = await claimClawlancerBounty(req.params.id);
    return res.status(201).json({
      success: true,
      data: {
        provider: "CLAWLANCER",
        action: "CLAIM",
        listingId: req.params.id,
        result,
        recordedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    return safeError(res, error, 400);
  }
});

router.post("/clawlancer/transactions/:id/deliver", governanceAuth, async (req, res) => {
  if (!operatorApproved(req)) {
    return res.status(409).json({
      success: false,
      error: "OPERATOR_APPROVAL_REQUIRED",
      message: "Send X-GXEON-Operator-Approval: approved and body { confirm: true, deliverable: string } to deliver.",
    });
  }

  const body = req.body && typeof req.body === "object" ? req.body as Record<string, unknown> : {};
  const deliverable = typeof body.deliverable === "string" ? body.deliverable : "";

  if (typeof req.params.id !== "string") return res.status(400).json({ success: false, error: "INVALID_TRANSACTION_ID" });
  try {
    const result = await deliverClawlancerTransaction(req.params.id, deliverable);
    return res.status(201).json({
      success: true,
      data: {
        provider: "CLAWLANCER",
        action: "DELIVER",
        transactionId: req.params.id,
        result,
        recordedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    return safeError(res, error, 400);
  }
});

export default router;
