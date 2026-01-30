-- MerQPrime Algo (Python) DB schema
-- Owns: trades, executions, logs

BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Global ENUMs
DO $$ BEGIN
  CREATE TYPE trade_status_enum AS ENUM ('open', 'closed', 'canceled', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE order_side_enum AS ENUM ('buy', 'sell');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE execution_status_enum AS ENUM ('created', 'pending', 'filled', 'partial', 'canceled', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE run_status_enum AS ENUM ('running', 'stopped', 'failed', 'completed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS strategy_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  strategy_id TEXT NOT NULL,
  status run_status_enum NOT NULL DEFAULT 'running',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  stopped_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version INTEGER NOT NULL DEFAULT 1,
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  strategy_id TEXT NOT NULL,
  strategy_run_id UUID REFERENCES strategy_runs(id) ON DELETE SET NULL,
  symbol TEXT NOT NULL,
  status trade_status_enum NOT NULL,
  side order_side_enum,
  quantity NUMERIC(20,8) NOT NULL,
  entry_price NUMERIC(20,8) NOT NULL,
  exit_price NUMERIC(20,8) NOT NULL DEFAULT 0,
  sl NUMERIC(20,8) NOT NULL DEFAULT 0,
  tp NUMERIC(20,8) NOT NULL DEFAULT 0,
  pnl NUMERIC(20,8) NOT NULL DEFAULT 0,
  idempotency_key TEXT,
  is_simulated BOOLEAN NOT NULL DEFAULT FALSE,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  ,CHECK (quantity > 0)
  ,CHECK (entry_price >= 0)
  ,CHECK (exit_price >= 0)
  ,CHECK (sl >= 0)
  ,CHECK (tp >= 0)
);

CREATE TABLE IF NOT EXISTS executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id UUID NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
  side order_side_enum NOT NULL,
  quantity NUMERIC(20,8) NOT NULL,
  price NUMERIC(20,8) NOT NULL,
  provider_order_id TEXT,
  provider TEXT,
  status execution_status_enum,
  idempotency_key TEXT,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  exchange_timestamp TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  ,CHECK (quantity > 0)
  ,CHECK (price >= 0)
);

CREATE TABLE IF NOT EXISTS positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  strategy_id TEXT NOT NULL,
  symbol TEXT NOT NULL,
  side order_side_enum NOT NULL,
  quantity NUMERIC(20,8) NOT NULL,
  avg_price NUMERIC(20,8) NOT NULL,
  unrealized_pnl NUMERIC(20,8) NOT NULL DEFAULT 0,
  realized_pnl NUMERIC(20,8) NOT NULL DEFAULT 0,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version INTEGER NOT NULL DEFAULT 1
  ,CHECK (quantity > 0)
  ,CHECK (avg_price >= 0)
);

CREATE TABLE IF NOT EXISTS logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  level TEXT NOT NULL,
  event_type TEXT NOT NULL,
  correlation_id TEXT,
  message TEXT NOT NULL,
  context JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_trades_user ON trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_status ON trades(status);
CREATE INDEX IF NOT EXISTS idx_trades_opened ON trades(opened_at);
CREATE INDEX IF NOT EXISTS idx_trades_strategy_run ON trades(strategy_run_id);
CREATE INDEX IF NOT EXISTS idx_trades_user_opened ON trades(user_id, opened_at DESC);
CREATE INDEX IF NOT EXISTS idx_executions_trade ON executions(trade_id);
CREATE INDEX IF NOT EXISTS idx_executions_time ON executions(executed_at);
CREATE INDEX IF NOT EXISTS idx_logs_user ON logs(user_id);
CREATE INDEX IF NOT EXISTS idx_logs_created ON logs(created_at);
CREATE INDEX IF NOT EXISTS idx_positions_user ON positions(user_id);
CREATE INDEX IF NOT EXISTS idx_positions_symbol ON positions(symbol);
CREATE UNIQUE INDEX IF NOT EXISTS uq_trades_idempotency_key ON trades(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_executions_idempotency_key ON executions(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_executions_provider_order ON executions(provider, provider_order_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_strategy_runs_active ON strategy_runs(user_id, strategy_id) WHERE status = 'running';

COMMIT;
