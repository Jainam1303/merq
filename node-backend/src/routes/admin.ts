import { Router } from "express";
import { requireAdmin, requireAuth } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import {
  assignPlanSchema,
  createPlanSchema
} from "../utils/validation";
import {
  assignPlanToUser,
  createPlan,
  deactivatePlan,
  getAdminStats,
  getPlans,
  listTradesByDate,
  listUsers,
  toggleUserActive
} from "../db/queries";
import { setKillSwitch, isKillSwitchEnabled } from "../services/kill-switch";
import { callAlgoBackend } from "../services/algo-client";
import { readErrorLogs, pruneOldLogs } from "../services/logs";

const router = Router();

router.use(requireAuth, requireAdmin);

router.get("/stats", async (_req, res, next) => {
  try {
    const stats = await getAdminStats();
    return res.json(stats);
  } catch (error) {
    return next(error);
  }
});

router.get("/users", async (_req, res, next) => {
  try {
    const users = await listUsers();
    return res.json(users);
  } catch (error) {
    return next(error);
  }
});

router.get("/trades", async (req, res, next) => {
  try {
    const date = String(req.query.date || "");
    if (!date) {
      return res.status(400).json({ message: "Missing date" });
    }
    const trades = await listTradesByDate(date);
    return res.json({ trades });
  } catch (error) {
    return next(error);
  }
});

router.get("/plans", async (_req, res, next) => {
  try {
    const plans = await getPlans();
    return res.json(plans);
  } catch (error) {
    return next(error);
  }
});

router.get("/logs/error", async (_req, res) => {
  const logs = await readErrorLogs();
  const formatted = logs.map((log) =>
    JSON.stringify({
      time: log.created_at,
      level: log.level,
      service: log.service,
      message: log.message,
      context: log.context || {}
    })
  );
  return res.json({ logs: formatted });
});

router.post("/logs/clear", async (_req, res) => {
  const deleted = await pruneOldLogs();
  return res.json({ success: true, pruned: deleted });
});

router.get("/connectivity", async (_req, res) => {
  try {
    const algo = await callAlgoBackend<{ ok: boolean; kill_switch: boolean }>({
      path: "/health",
      method: "GET"
    });
    return res.json({ algo });
  } catch (_error) {
    return res.json({ algo: { ok: false } });
  }
});

router.post("/kill_switch", async (_req, res) => {
  const newState = !isKillSwitchEnabled();
  setKillSwitch(newState);
  return res.json({ message: newState ? "Enabled" : "Disabled" });
});

router.post("/user/:id/toggle_active", async (req, res, next) => {
  try {
    const result = await toggleUserActive(req.params.id);
    if (!result) {
      return res.status(404).json({ message: "Not found" });
    }
    return res.json({ status: "success", new_state: result.is_active });
  } catch (error) {
    return next(error);
  }
});

router.post(
  "/user/:id/assign_plan",
  validateBody(assignPlanSchema),
  async (req, res, next) => {
    try {
      await assignPlanToUser(req.params.id, req.body.plan_id, req.body.days);
      return res.json({ message: "Plan assigned" });
    } catch (error) {
      return next(error);
    }
  }
);

router.post("/plan", validateBody(createPlanSchema), async (req, res, next) => {
  try {
    const plan = await createPlan({
      name: req.body.name,
      price: req.body.price,
      duration_days: req.body.duration,
      features: req.body.features || []
    });
    return res.json(plan);
  } catch (error) {
    return next(error);
  }
});

router.delete("/plan/:id", async (req, res, next) => {
  try {
    await deactivatePlan(req.params.id);
    return res.json({ success: true });
  } catch (error) {
    return next(error);
  }
});

export default router;
