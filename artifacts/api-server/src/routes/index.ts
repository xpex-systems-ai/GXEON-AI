import { Router, type IRouter } from "express";
import healthRouter from "./health";
import governanceRouter from "./governance";
import conversionRouter from "./conversion";
import phase8Router from "./phase8";
import runtimeRouter from "./runtime";
import financialRouter from "./financial";
import githubConnectorRouter from "./connectors/github";

const router: IRouter = Router();

router.use(healthRouter);
router.use(governanceRouter);
router.use(conversionRouter);
router.use(phase8Router);
router.use(runtimeRouter);
router.use(financialRouter);
router.use(githubConnectorRouter);

export default router;
