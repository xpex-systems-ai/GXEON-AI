import { Router, type IRouter } from "express";
import healthRouter from "./health";
import governanceRouter from "./governance";
import conversionRouter from "./conversion";

const router: IRouter = Router();

router.use(healthRouter);
router.use(governanceRouter);
router.use(conversionRouter);

export default router;
