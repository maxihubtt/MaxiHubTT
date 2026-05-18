import { Router, type IRouter } from "express";
import healthRouter from "./health";
import jobsRouter from "./jobs";
import authRouter from "./auth";
import adminDriversRouter from "./admin-drivers";
import drivers from "./drivers";
import pricing from "./pricing";

const router: IRouter = Router();

router.use(authRouter);
router.use(healthRouter);
router.use(jobsRouter);
router.use(adminDriversRouter);
router.use("/drivers", drivers);

export default router;
