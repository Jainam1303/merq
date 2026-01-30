import { Router } from "express";
import { getPlans } from "../db/queries";

const router = Router();

router.get("/", async (_req, res, next) => {
  try {
    const plans = await getPlans();
    return res.json({ plans });
  } catch (error) {
    return next(error);
  }
});

export default router;
