import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { requireActiveSubscription } from "../services/subscription";
import { ensureStrategyAccess, getStrategiesForUser } from "../db/queries";
import { callAlgoBackend } from "../services/algo-client";
import { env } from "../config/env";
import { isKillSwitchEnabled } from "../services/kill-switch";
import { getUserProfile } from "../db/queries";
import { decryptSecret } from "../utils/crypto";
import { validateBody } from "../middleware/validate";
import { startSchema } from "../utils/validation";

const router = Router();

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const strategies = await getStrategiesForUser(req.user!.id);
    return res.json({ strategies });
  } catch (error) {
    return next(error);
  }
});

router.post("/:id/start", requireAuth, validateBody(startSchema), async (req, res, next) => {
  try {
    if (env.killSwitch || isKillSwitchEnabled()) {
      return res.status(503).json({ message: "Kill switch enabled" });
    }
    await requireActiveSubscription(req.user!.id);
    const strategyId = req.params.id;
    const hasAccess = await ensureStrategyAccess(req.user!.id, strategyId);
    if (!hasAccess) {
      return res.status(404).json({ message: "Not found" });
    }
    const profile = await getUserProfile(req.user!.id);
    if (!profile?.api_key_enc || !profile?.client_code_enc || !profile?.password_enc || !profile?.totp_enc) {
      return res.status(400).json({ message: "Missing API credentials" });
    }
    const risk_config = {
      symbols: req.body.symbols || [],
      interval: req.body.interval,
      startTime: req.body.startTime,
      stopTime: req.body.stopTime,
      capital: req.body.capital,
      simulated: req.body.simulated ?? false,
      strategy: strategyId,
      api_key: decryptSecret(profile.api_key_enc),
      client_code: decryptSecret(profile.client_code_enc),
      password: decryptSecret(profile.password_enc),
      totp: decryptSecret(profile.totp_enc)
    };
    const response = await callAlgoBackend<{ success: boolean; result: string }>({
      path: "/start_strategy",
      method: "POST",
      body: { user_id: req.user!.id, strategy_id: strategyId, risk_config }
    });
    return res.json({ status: "success", message: response.result });
  } catch (error) {
    return next(error);
  }
});

router.post("/:id/stop", requireAuth, async (req, res, next) => {
  try {
    const strategyId = req.params.id;
    const response = await callAlgoBackend<{ success: boolean; result: string }>({
      path: "/stop_strategy",
      method: "POST",
      body: { user_id: req.user!.id, strategy_id: strategyId }
    });
    return res.json({ status: "success", message: response.result });
  } catch (error) {
    return next(error);
  }
});


export default router;
