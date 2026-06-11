import { Router, type IRouter } from "express";
import healthRouter from "./health";
import governanceRouter from "./governance";
import conversionRouter from "./conversion";
import phase8Router from "./phase8";
import runtimeRouter from "./runtime";
import financialRouter from "./financial";
import githubConnectorRouter from "./connectors/github";
import vercelConnectorRouter from "./connectors/vercel";
import railwayConnectorRouter from "./connectors/railway";
import supabaseConnectorRouter from "./connectors/supabase";
import microsoft365ConnectorRouter from "./connectors/microsoft365";
import monetizationRouter from "./monetization";
import radarRouter from "./radar";
import opportunitiesRouter from "./opportunities";
import agentsRouter from "./agents";

const router: IRouter = Router();

router.use(healthRouter);
router.use(governanceRouter);
router.use(conversionRouter);
router.use(phase8Router);
router.use(runtimeRouter);
router.use(financialRouter);
router.use(githubConnectorRouter);
router.use(vercelConnectorRouter);
router.use(railwayConnectorRouter);
router.use(supabaseConnectorRouter);
router.use(microsoft365ConnectorRouter);
router.use(monetizationRouter);
router.use(radarRouter);
router.use(opportunitiesRouter);
router.use(agentsRouter);

export default router;
