import { Router, type IRouter } from "express";
import healthRouter from "./health";
import registerRouter from "./register";
import stateRouter from "./state";
import aiRouter from "./ai";

const router: IRouter = Router();

router.use(healthRouter);
router.use(registerRouter);
router.use(stateRouter);
router.use(aiRouter);

export default router;
