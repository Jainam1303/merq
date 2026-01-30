import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { requireActiveSubscription } from "../services/subscription";
import { deleteTradesByIds, getTradesForUser, listTrades } from "../db/queries";
import { validateBody } from "../middleware/validate";
import { deleteOrdersSchema } from "../utils/validation";

const router = Router();

router.get("/", requireAuth, async (req, res, next) => {
  try {
    await requireActiveSubscription(req.user!.id);
    const trades = await getTradesForUser(req.user!.id);
    return res.json({ trades });
  } catch (error) {
    return next(error);
  }
});

router.get("/orderbook", requireAuth, async (req, res, next) => {
  try {
    const trades = await listTrades(
      req.user!.id,
      req.query.startDate ? String(req.query.startDate) : undefined,
      req.query.endDate ? String(req.query.endDate) : undefined
    );
    return res.json({ status: "success", data: trades });
  } catch (error) {
    return next(error);
  }
});

router.post("/delete_orders", requireAuth, validateBody(deleteOrdersSchema), async (req, res, next) => {
  try {
    const deleted = await deleteTradesByIds(req.user!.id, req.body.order_ids);
    return res.json({ status: "success", message: `Deleted ${deleted} orders` });
  } catch (error) {
    return next(error);
  }
});

export default router;
