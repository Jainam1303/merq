import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { requireActiveSubscription } from "../services/subscription";
import { getAnalyticsForUser } from "../db/queries";

const router = Router();

router.get("/", requireAuth, async (req, res, next) => {
  try {
    await requireActiveSubscription(req.user!.id);
    const analytics = await getAnalyticsForUser(req.user!.id);
    return res.json({ analytics });
  } catch (error) {
    return next(error);
  }
});

export default router;
