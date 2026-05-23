import { Router, type IRouter } from "express";
import healthRouter from "./health";
import jobsRouter from "./jobs";
import authRouter from "./auth";
import adminDriversRouter from "./admin-drivers";
import driverSignupsRouter from "./driver-signups";
import drivers from "./drivers";
import pricing from "./pricing";
import adminConfig from "./admin-config";

const router: IRouter = Router();

router.use(authRouter);
router.use(healthRouter);
router.use(jobsRouter);
router.use(adminDriversRouter);
router.use(driverSignupsRouter);
router.use("/drivers", drivers);
router.use("/pricing", pricing);
router.use(adminConfig);

export default router;
