import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env";
import {
  apiLimiter,
  authLimiter,
  strategyLimiter,
  tradesLimiter,
  analyticsLimiter
} from "./middleware/rate-limit";
import { errorHandler } from "./middleware/error-handler";
import authRoutes from "./routes/auth";
import meRoutes from "./routes/me";
import plansRoutes from "./routes/plans";
import paymentsRoutes from "./routes/payments";
import strategiesRoutes from "./routes/strategies";
import tradesRoutes from "./routes/trades";
import analyticsRoutes from "./routes/analytics";
import profileRoutes from "./routes/profile";
import adminRoutes from "./routes/admin";
import algoRoutes from "./routes/algo";
import backtestsRoutes from "./routes/backtests";
import { callAlgoBackend } from "./services/algo-client";

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: true,
    credentials: true
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(apiLimiter);

app.get("/health", (_req, res) => res.json({ status: "ok", service: "node" }));
app.get("/health/algo", async (_req, res) => {
  try {
    const response = await callAlgoBackend<{ status: string; service: string; kill_switch: boolean }>({
      path: "/health",
      method: "GET"
    });
    return res.json({ status: "ok", service: "node", dependency: response });
  } catch (_error) {
    return res.json({ status: "degraded", service: "node", dependency: "algo" });
  }
});

app.use("/auth", authLimiter, authRoutes);
app.use("/me", meRoutes);
app.use("/plans", plansRoutes);
app.use("/payments", paymentsRoutes);
app.use("/profile", profileRoutes);
app.use("/strategies", strategyLimiter, strategiesRoutes);
app.use("/algo", strategyLimiter, algoRoutes);
app.use("/trades", tradesLimiter, tradesRoutes);
app.use("/analytics", analyticsLimiter, analyticsRoutes);
app.use("/backtests", analyticsLimiter, backtestsRoutes);
app.use("/admin", adminRoutes);

app.use((_req, res) => res.status(404).json({ message: "Not found" }));
app.use(errorHandler);

export default app;
