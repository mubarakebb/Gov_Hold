import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import reportsRouter from "./reports";
import profileRouter from "./profile";
import adminRouter from "./admin";
import analyticsRouter from "./analytics";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(reportsRouter);
router.use(profileRouter);
router.use(adminRouter);
router.use(analyticsRouter);

export default router;
