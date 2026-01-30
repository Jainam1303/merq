import { Router } from "express";
import { paymentCreateSchema, paymentVerifySchema } from "../utils/validation";
import { requireAuth } from "../middleware/auth";
import { createRazorpayOrder, verifyRazorpaySignature } from "../services/razorpay";
import { assignPlanToUser, getPlanById } from "../db/queries";
import { env } from "../config/env";
import { validateBody } from "../middleware/validate";

const router = Router();

router.post("/create", requireAuth, validateBody(paymentCreateSchema), async (req, res, next) => {
  try {
    const plan = await getPlanById(req.body.planId);
    if (!plan || !plan.is_active) {
      return res.status(404).json({ message: "Plan not found" });
    }

    const order = await createRazorpayOrder(plan.price * 100, "INR");

    return res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: env.razorpay.keyId,
      plan: { name: plan.name, duration_days: plan.duration_days },
      prefill: {
        name: req.user?.username || "",
        email: req.user?.email || "",
        contact: req.user?.phone || ""
      }
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/verify", requireAuth, validateBody(paymentVerifySchema), async (req, res, next) => {
  try {
    verifyRazorpaySignature(req.body.orderId, req.body.paymentId, req.body.signature);
    if (req.body.planId) {
      const plan = await getPlanById(req.body.planId);
      if (plan) {
        await assignPlanToUser(req.user!.id, plan.id, plan.duration_days);
      }
    }
    return res.json({ success: true });
  } catch (error) {
    return next(error);
  }
});

export default router;
