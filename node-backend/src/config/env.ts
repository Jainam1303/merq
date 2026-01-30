import dotenv from "dotenv";

dotenv.config();

const requireEnv = (key: string) => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
};

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 4000),
  apiBaseUrl: process.env.API_BASE_URL || "http://localhost:4000",
  db: {
    host: requireEnv("DB_HOST"),
    port: Number(process.env.DB_PORT || 5432),
    name: requireEnv("DB_NAME"),
    user: requireEnv("DB_USER"),
    password: requireEnv("DB_PASSWORD")
  },
  jwt: {
    accessSecret: requireEnv("JWT_ACCESS_SECRET"),
    refreshSecret: requireEnv("JWT_REFRESH_SECRET"),
    accessTtl: process.env.JWT_ACCESS_TTL || "15m",
    refreshTtl: process.env.JWT_REFRESH_TTL || "30d"
  },
  cookies: {
    domain: process.env.COOKIE_DOMAIN || "localhost",
    secure: process.env.COOKIE_SECURE === "true",
    sameSite: (process.env.COOKIE_SAMESITE || "lax") as
      | "lax"
      | "strict"
      | "none"
  },
  brokerKeyMaster: requireEnv("BROKER_KEY_MASTER_KEY"),
  killSwitch: process.env.NODE_KILL_SWITCH === "true",
  rateLimits: {
    authWindowMs: Number(process.env.RATE_LIMIT_AUTH_WINDOW_MS || 900000),
    authMax: Number(process.env.RATE_LIMIT_AUTH_MAX || 20),
    apiWindowMs: Number(process.env.RATE_LIMIT_API_WINDOW_MS || 60000),
    apiMax: Number(process.env.RATE_LIMIT_API_MAX || 120),
    strategyMax: Number(process.env.RATE_LIMIT_STRATEGY_MAX || 30),
    tradesMax: Number(process.env.RATE_LIMIT_TRADES_MAX || 60),
    analyticsMax: Number(process.env.RATE_LIMIT_ANALYTICS_MAX || 60)
  },
  logRetentionDays: Number(process.env.LOG_RETENTION_DAYS || 30),
  algo: {
    url: requireEnv("ALGO_BACKEND_URL"),
    key: requireEnv("ALGO_BACKEND_KEY")
  },
  razorpay: {
    keyId: requireEnv("RAZORPAY_KEY_ID"),
    keySecret: requireEnv("RAZORPAY_KEY_SECRET")
  }
};
