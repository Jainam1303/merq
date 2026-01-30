import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { listBacktests, saveBacktestResults } from "../db/queries";

const router = Router();

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const history = await listBacktests(req.user!.id);
    return res.json(history);
  } catch (error) {
    return next(error);
  }
});

router.post("/", requireAuth, async (req, res, next) => {
  try {
    const results = (req.body?.results || []).map((r: Record<string, string>) => ({
      symbol: r["Symbol"],
      interval: req.body.interval || "FIVE_MINUTE",
      pnl: parseFloat(String(r["Total P&L"] || "0").replace(/[,]/g, "")),
      win_rate: parseFloat(String(r["Win Rate %"] || "0").replace(/[%]/g, "")),
      total_trades: parseInt(String(r["Total Trades"] || "0"), 10),
      final_capital: parseFloat(String(r["Final Capital"] || "0").replace(/[,]/g, "")),
      from_date: req.body.fromDate || "",
      to_date: req.body.toDate || ""
    }));
    const saved = await saveBacktestResults(req.user!.id, results);
    return res.json({ status: "success", saved });
  } catch (error) {
    return next(error);
  }
});

export default router;
