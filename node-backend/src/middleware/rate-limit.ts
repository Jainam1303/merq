import rateLimit from "express-rate-limit";
import { env } from "../config/env";
import { Request } from "express";
import { verifyAccessToken } from "../services/tokens";

const keyGenerator = (req: Request) => {
  if (req.user?.id) return `user:${req.user.id}`;
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const payload = verifyAccessToken(authHeader.slice(7));
      return `user:${payload.sub}`;
    } catch (_error) {
      return req.ip;
    }
  }
  return req.ip;
};

const createLimiter = (max: number, windowMs: number) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: "draft-7",
    keyGenerator
  });

export const authLimiter = createLimiter(
  env.rateLimits.authMax,
  env.rateLimits.authWindowMs
);

export const apiLimiter = createLimiter(
  env.rateLimits.apiMax,
  env.rateLimits.apiWindowMs
);

export const strategyLimiter = createLimiter(
  env.rateLimits.strategyMax,
  env.rateLimits.apiWindowMs
);

export const tradesLimiter = createLimiter(
  env.rateLimits.tradesMax,
  env.rateLimits.apiWindowMs
);

export const analyticsLimiter = createLimiter(
  env.rateLimits.analyticsMax,
  env.rateLimits.apiWindowMs
);
