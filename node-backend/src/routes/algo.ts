import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import {
  backtestSchema,
  testOrderSchema,
  tradeActionSchema,
  updateTradeSchema
} from "../utils/validation";
import { callAlgoBackend } from "../services/algo-client";
import { getUserProfile } from "../db/queries";
import { decryptSecret } from "../utils/crypto";

const router = Router();

router.get("/status", requireAuth, async (req, res, next) => {
  try {
    const status = await callAlgoBackend<{ running: boolean }>({
      path: `/status?user_id=${req.user!.id}`,
      method: "GET"
    });
    return res.json({ status: status.running ? "RUNNING" : "OFFLINE" });
  } catch (error) {
    return next(error);
  }
});

router.get("/config", requireAuth, async (req, res, next) => {
  try {
    const config = await callAlgoBackend<Record<string, unknown>>({
      path: `/config?user_id=${req.user!.id}`,
      method: "GET"
    });
    return res.json(config);
  } catch (error) {
    return next(error);
  }
});

router.get("/trades", requireAuth, async (req, res, next) => {
  try {
    const trades = await callAlgoBackend<{ trades: unknown[] }>({
      path: `/trades?user_id=${req.user!.id}`,
      method: "GET"
    });
    return res.json({ status: "success", data: trades.trades });
  } catch (error) {
    return next(error);
  }
});

router.get("/pnl", requireAuth, async (req, res, next) => {
  try {
    const pnl = await callAlgoBackend<{ pnl: number }>({
      path: `/pnl?user_id=${req.user!.id}`,
      method: "GET"
    });
    return res.json({ pnl: pnl.pnl });
  } catch (error) {
    return next(error);
  }
});

router.get("/logs", requireAuth, async (req, res, next) => {
  try {
    const logs = await callAlgoBackend<{ logs: string[] }>({
      path: `/logs?user_id=${req.user!.id}`,
      method: "GET"
    });
    return res.json(logs.logs || []);
  } catch (error) {
    return next(error);
  }
});

router.get("/symbols", async (_req, res, next) => {
  try {
    const symbols = await callAlgoBackend<string[]>({
      path: "/symbols",
      method: "GET"
    });
    return res.json(symbols);
  } catch (error) {
    return next(error);
  }
});

router.get("/search_scrip", requireAuth, async (req, res, next) => {
  try {
    const query = req.query.q ? String(req.query.q) : "";
    const results = await callAlgoBackend<unknown[]>({
      path: `/search_scrip?q=${encodeURIComponent(query)}`,
      method: "GET"
    });
    return res.json(results);
  } catch (error) {
    return next(error);
  }
});

router.post("/add_token", requireAuth, async (req, res, next) => {
  try {
    const response = await callAlgoBackend<{ status: string; message: string }>({
      path: "/add_token",
      method: "POST",
      body: req.body
    });
    return res.json(response);
  } catch (error) {
    return next(error);
  }
});

router.post("/test_order", requireAuth, validateBody(testOrderSchema), async (req, res, next) => {
  try {
    const response = await callAlgoBackend<{ status: string; message: string }>({
      path: "/test_order",
      method: "POST",
      body: { ...req.body, user_id: req.user!.id }
    });
    return res.json(response);
  } catch (error) {
    return next(error);
  }
});

router.post("/exit_trade", requireAuth, validateBody(tradeActionSchema), async (req, res, next) => {
  try {
    const response = await callAlgoBackend<{ status: string; message: string }>({
      path: "/exit_trade",
      method: "POST",
      body: { trade_id: req.body.trade_id, user_id: req.user!.id }
    });
    return res.json(response);
  } catch (error) {
    return next(error);
  }
});

router.post(
  "/delete_active_trade",
  requireAuth,
  validateBody(tradeActionSchema),
  async (req, res, next) => {
    try {
      const response = await callAlgoBackend<{ status: string; message: string }>({
        path: "/delete_active_trade",
        method: "POST",
        body: { trade_id: req.body.trade_id, user_id: req.user!.id }
      });
      return res.json(response);
    } catch (error) {
      return next(error);
    }
  }
);

router.post("/update_trade", requireAuth, validateBody(updateTradeSchema), async (req, res, next) => {
  try {
    const response = await callAlgoBackend<{ status: string; message: string }>({
      path: "/update_trade",
      method: "POST",
      body: { ...req.body, user_id: req.user!.id }
    });
    return res.json(response);
  } catch (error) {
    return next(error);
  }
});

router.post("/backtest", requireAuth, validateBody(backtestSchema), async (req, res, next) => {
  try {
    const profile = await getUserProfile(req.user!.id);
    if (
      !profile?.backtest_api_key_enc ||
      !profile?.backtest_client_code_enc ||
      !profile?.backtest_password_enc ||
      !profile?.backtest_totp_enc
    ) {
      return res.status(400).json({ status: "error", message: "Missing backtest credentials" });
    }
    const response = await callAlgoBackend<Record<string, unknown>>({
      path: "/backtest",
      method: "POST",
      body: {
        ...req.body,
        api_key: decryptSecret(profile.backtest_api_key_enc),
        client_code: decryptSecret(profile.backtest_client_code_enc),
        password: decryptSecret(profile.backtest_password_enc),
        totp: decryptSecret(profile.backtest_totp_enc)
      }
    });
    return res.json(response);
  } catch (error) {
    return next(error);
  }
});

router.get("/market_data", async (_req, res, next) => {
  try {
    const data = await callAlgoBackend<unknown[]>({
      path: "/market_data",
      method: "GET"
    });
    return res.json(data);
  } catch (error) {
    return next(error);
  }
});

export default router;
