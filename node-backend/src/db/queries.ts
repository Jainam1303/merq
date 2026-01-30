import { pool, query } from "./index";

export type DbUser = {
  id: string;
  username: string;
  password_hash: string;
  is_admin: boolean;
  email?: string | null;
  phone?: string | null;
  is_active?: boolean | null;
};

export const findUserByUsername = async (username: string) => {
  const result = await query(
    "SELECT id, username, password_hash, is_admin, email, phone, is_active FROM users WHERE username = $1",
    [username]
  );
  return result.rows[0] as DbUser | undefined;
};

export const findUserById = async (userId: string) => {
  const result = await query(
    "SELECT id, username, is_admin, email, phone, is_active FROM users WHERE id = $1",
    [userId]
  );
  return result.rows[0] as { id: string; username: string; is_admin: boolean } | undefined;
};

export const createUser = async (
  username: string,
  passwordHash: string,
  email?: string | null,
  phone?: string | null
) => {
  const result = await query(
    "INSERT INTO users (username, password_hash, is_admin, email, phone, is_active) VALUES ($1, $2, false, $3, $4, true) RETURNING id, username, is_admin, email, phone, is_active",
    [username, passwordHash, email || null, phone || null]
  );
  return result.rows[0] as { id: string; username: string; is_admin: boolean };
};

export const insertRefreshToken = async (
  userId: string,
  tokenHash: string,
  expiresAt: Date,
  replacedByHash?: string | null
) => {
  await query(
    "INSERT INTO refresh_tokens (user_id, token_hash, expires_at, replaced_by_hash) VALUES ($1, $2, $3, $4)",
    [userId, tokenHash, expiresAt, replacedByHash || null]
  );
};

export const revokeRefreshToken = async (tokenHash: string) => {
  await query(
    "UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1",
    [tokenHash]
  );
};

export const findRefreshToken = async (tokenHash: string) => {
  const result = await query(
    "SELECT id, user_id, expires_at, revoked_at, replaced_by_hash FROM refresh_tokens WHERE token_hash = $1",
    [tokenHash]
  );
  return result.rows[0] as
    | {
      id: string;
      user_id: string;
      expires_at: Date;
      revoked_at: Date | null;
      replaced_by_hash: string | null;
    }
    | undefined;
};

export const rotateRefreshToken = async (
  oldTokenHash: string,
  newTokenHash: string
) => {
  await query(
    "UPDATE refresh_tokens SET revoked_at = NOW(), replaced_by_hash = $2 WHERE token_hash = $1",
    [oldTokenHash, newTokenHash]
  );
};

export const revokeAllRefreshTokensForUser = async (userId: string) => {
  await query("UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1", [
    userId
  ]);
};

export const getUserProfile = async (userId: string) => {
  const result = await query(
    "SELECT user_id, broker_name, api_key_enc, client_code_enc, password_enc, totp_enc, updated_at, backtest_api_key_enc, backtest_client_code_enc, backtest_password_enc, backtest_totp_enc, whatsapp_number, callmebot_api_key FROM user_profiles WHERE user_id = $1",
    [userId]
  );
  return result.rows[0];
};

export const upsertUserProfile = async (
  userId: string,
  profile: {
    broker_name: string;
    api_key_enc: string;
    client_code_enc: string;
    password_enc: string;
    totp_enc: string;
    backtest_api_key_enc?: string | null;
    backtest_client_code_enc?: string | null;
    backtest_password_enc?: string | null;
    backtest_totp_enc?: string | null;
    whatsapp_number?: string | null;
    callmebot_api_key?: string | null;
  }
) => {
  const result = await query(
    `INSERT INTO user_profiles (
        user_id,
        broker_name,
        api_key_enc,
        client_code_enc,
        password_enc,
        totp_enc,
        backtest_api_key_enc,
        backtest_client_code_enc,
        backtest_password_enc,
        backtest_totp_enc,
        whatsapp_number,
        callmebot_api_key
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     ON CONFLICT (user_id)
     DO UPDATE SET broker_name = EXCLUDED.broker_name,
                   api_key_enc = EXCLUDED.api_key_enc,
                   client_code_enc = EXCLUDED.client_code_enc,
                   password_enc = EXCLUDED.password_enc,
                   totp_enc = EXCLUDED.totp_enc,
                   backtest_api_key_enc = EXCLUDED.backtest_api_key_enc,
                   backtest_client_code_enc = EXCLUDED.backtest_client_code_enc,
                   backtest_password_enc = EXCLUDED.backtest_password_enc,
                   backtest_totp_enc = EXCLUDED.backtest_totp_enc,
                   whatsapp_number = EXCLUDED.whatsapp_number,
                   callmebot_api_key = EXCLUDED.callmebot_api_key,
                   updated_at = NOW()
     RETURNING user_id, broker_name, updated_at`,
    [
      userId,
      profile.broker_name,
      profile.api_key_enc,
      profile.client_code_enc,
      profile.password_enc,
      profile.totp_enc,
      profile.backtest_api_key_enc || null,
      profile.backtest_client_code_enc || null,
      profile.backtest_password_enc || null,
      profile.backtest_totp_enc || null,
      profile.whatsapp_number || null,
      profile.callmebot_api_key || null
    ]
  );
  return result.rows[0];
};

export const updateUserContact = async (
  userId: string,
  email?: string | null,
  phone?: string | null
) => {
  const result = await query(
    "UPDATE users SET email = $2, phone = $3 WHERE id = $1 RETURNING id, username, email, phone",
    [userId, email || null, phone || null]
  );
  return result.rows[0];
};

export const updateUserPassword = async (userId: string, passwordHash: string) => {
  await query("UPDATE users SET password_hash = $2 WHERE id = $1", [
    userId,
    passwordHash
  ]);
};

export const listUsers = async () => {
  const result = await query(
    "SELECT id, username, email, phone, is_admin, is_active, created_at FROM users ORDER BY created_at DESC"
  );
  return result.rows;
};

export const toggleUserActive = async (userId: string) => {
  const result = await query(
    "UPDATE users SET is_active = NOT is_active WHERE id = $1 RETURNING is_active",
    [userId]
  );
  return result.rows[0] as { is_active: boolean } | undefined;
};

export const createPlan = async (plan: {
  name: string;
  price: number;
  duration_days: number;
  features: string[];
}) => {
  const result = await query(
    "INSERT INTO plans (name, price, interval, duration_days, features, is_active) VALUES ($1, $2, $3, $4, $5, true) RETURNING id",
    [plan.name, plan.price, "custom", plan.duration_days, JSON.stringify(plan.features)]
  );
  return result.rows[0];
};

export const deactivatePlan = async (planId: string) => {
  await query("UPDATE plans SET is_active = false WHERE id = $1", [planId]);
};

export const assignPlanToUser = async (
  userId: string,
  planId: string,
  days: number
) => {
  const start = new Date();
  const end = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  await query(
    `INSERT INTO subscriptions (user_id, plan_id, status, current_period_start, current_period_end)
     VALUES ($1, $2, 'active', $3, $4)`,
    [userId, planId, start, end]
  );
  return { start, end };
};

export const getAdminStats = async () => {
  const users = await query("SELECT COUNT(*)::int AS count FROM users");
  const trades = await query("SELECT COUNT(*)::int AS count FROM trades");
  const backtests = await query("SELECT COUNT(*)::int AS count FROM backtests");
  return {
    total_users: users.rows[0]?.count || 0,
    total_trades: trades.rows[0]?.count || 0,
    total_backtests: backtests.rows[0]?.count || 0
  };
};

export const listTradesByDate = async (date: string) => {
  const start = `${date} 00:00:00`;
  const end = `${date} 23:59:59`;
  const result = await query(
    "SELECT id, user_id, symbol, pnl, status, timestamp, is_simulated FROM trades WHERE timestamp >= $1 AND timestamp <= $2 ORDER BY timestamp DESC",
    [start, end]
  );
  return result.rows;
};

export type LogLevel = "INFO" | "WARN" | "ERROR" | "CRITICAL";

export const insertLog = async (entry: {
  service: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
}) => {
  await query(
    "INSERT INTO logs (service, level, message, context) VALUES ($1, $2, $3, $4)",
    [entry.service, entry.level, entry.message, entry.context || null]
  );
};

export const listLogs = async (levels: LogLevel[], limit = 200) => {
  const result = await query(
    "SELECT id, service, level, message, context, created_at FROM logs WHERE level = ANY($1) ORDER BY created_at DESC LIMIT $2",
    [levels, limit]
  );
  return result.rows;
};

export const pruneLogs = async (cutoff: Date) => {
  const result = await query("DELETE FROM logs WHERE created_at < $1", [cutoff]);
  return result.rowCount;
};

export const saveBacktestResults = async (
  userId: string,
  results: Array<{
    symbol: string;
    interval: string;
    pnl: number;
    win_rate: number;
    total_trades: number;
    final_capital: number;
    from_date: string;
    to_date: string;
  }>
) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    let saved = 0;
    for (const r of results) {
      await client.query(
        `INSERT INTO backtests (user_id, symbol, interval, pnl, win_rate, total_trades, final_capital, from_date, to_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          userId,
          r.symbol,
          r.interval,
          r.pnl,
          r.win_rate,
          r.total_trades,
          r.final_capital,
          r.from_date,
          r.to_date
        ]
      );
      saved += 1;
    }
    await client.query("COMMIT");
    return saved;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const listBacktests = async (userId: string) => {
  const result = await query(
    "SELECT id, symbol, interval, pnl, win_rate, total_trades, final_capital, from_date, to_date, date_run FROM backtests WHERE user_id = $1 ORDER BY date_run DESC LIMIT 50",
    [userId]
  );
  return result.rows;
};

export const deleteTradesByIds = async (userId: string, ids: string[]) => {
  const result = await query(
    "DELETE FROM trades WHERE user_id = $1 AND id = ANY($2::uuid[])",
    [userId, ids]
  );
  return result.rowCount;
};

export const listTrades = async (userId: string, startDate?: string, endDate?: string) => {
  let text =
    "SELECT id, symbol, entry_price, quantity, sl, tp, status, pnl, entry_order_id, sl_order_id, tp_order_id, txn_type, mode, timestamp, is_simulated FROM trades WHERE user_id = $1";
  const params: unknown[] = [userId];
  if (startDate) {
    params.push(`${startDate} 00:00:00`);
    text += ` AND timestamp >= $${params.length}`;
  }
  if (endDate) {
    params.push(`${endDate} 23:59:59`);
    text += ` AND timestamp <= $${params.length}`;
  }
  text += " ORDER BY timestamp DESC";
  const result = await query(text, params);
  return result.rows;
};

export const getPlans = async () => {
  const result = await query(
    "SELECT id, name, price, interval, duration_days, features, max_backtests, max_live_trades, is_active FROM plans WHERE is_active = true ORDER BY price ASC"
  );
  return result.rows;
};

export const getPlanById = async (planId: string) => {
  const result = await query(
    "SELECT id, name, price, interval, duration_days, features, max_backtests, max_live_trades, is_active FROM plans WHERE id = $1",
    [planId]
  );
  return result.rows[0];
};

export const getActiveSubscription = async (userId: string) => {
  const result = await query(
    "SELECT id, plan_id, status, current_period_end FROM subscriptions WHERE user_id = $1 AND status = 'active' ORDER BY current_period_end DESC LIMIT 1",
    [userId]
  );
  return result.rows[0] as
    | { id: string; plan_id: string; status: string; current_period_end: Date }
    | undefined;
};

export const getTradesForUser = async (userId: string) => {
  const result = await query(
    "SELECT id, symbol, status, pnl, created_at FROM trades WHERE user_id = $1 ORDER BY created_at DESC LIMIT 500",
    [userId]
  );
  return result.rows;
};

export const getAnalyticsForUser = async (userId: string) => {
  const result = await query(
    "SELECT total_trades, win_rate, pnl, updated_at FROM analytics WHERE user_id = $1 LIMIT 1",
    [userId]
  );
  return result.rows[0];
};

export const getStrategiesForUser = async (userId: string) => {
  const result = await query(
    "SELECT s.id, s.name, s.is_active FROM strategies s JOIN user_strategies us ON us.strategy_id = s.id WHERE us.user_id = $1 ORDER BY s.name",
    [userId]
  );
  return result.rows;
};

export const ensureStrategyAccess = async (userId: string, strategyId: string) => {
  const result = await query(
    "SELECT 1 FROM user_strategies WHERE user_id = $1 AND strategy_id = $2",
    [userId, strategyId]
  );
  return result.rowCount > 0;
};
