import { Router, type IRouter } from "express";
import {
  financialMetricsService,
  ledgerService,
  transactionService,
  walletService,
} from "../services/financial";

const router: IRouter = Router();

function readLimit(value: unknown): number | undefined {
  if (typeof value !== "string") return undefined;
  const limit = Number(value);
  return Number.isFinite(limit) ? limit : undefined;
}

router.get("/v1/financial/health", async (_req, res, next) => {
  try {
    const health = await financialMetricsService.health();
    res.status(health.status === "healthy" ? 200 : 503).json({ success: health.status === "healthy", ...health });
  } catch (error) {
    next(error);
  }
});

router.get("/v1/financial/wallets", async (req, res, next) => {
  try {
    const health = await financialMetricsService.health();
    if (health.status !== "healthy") {
      res.status(503).json({ success: false, ...health });
      return;
    }

    const wallets = await walletService.listWallets({ limit: readLimit(req.query.limit) });
    res.json({ success: true, data: wallets, metrics: health.metrics });
  } catch (error) {
    next(error);
  }
});

router.get("/v1/financial/transactions", async (req, res, next) => {
  try {
    const health = await financialMetricsService.health();
    if (health.status !== "healthy") {
      res.status(503).json({ success: false, ...health });
      return;
    }

    const [transactions, ledgerEntries] = await Promise.all([
      transactionService.listTransactions({ limit: readLimit(req.query.limit) }),
      ledgerService.listLedgerEntries({ limit: readLimit(req.query.ledgerLimit) }),
    ]);
    res.json({
      success: true,
      data: transactions,
      ledger: ledgerEntries,
      metrics: health.metrics,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
