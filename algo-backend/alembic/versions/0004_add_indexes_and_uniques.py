from alembic import op
import sqlalchemy as sa


revision = "0004_add_indexes_and_uniques"
down_revision = "0003_create_executions_and_logs"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index("idx_trades_user", "trades", ["user_id"])
    op.create_index("idx_trades_status", "trades", ["status"])
    op.create_index("idx_trades_opened", "trades", ["opened_at"])
    op.create_index("idx_trades_strategy_run", "trades", ["strategy_run_id"])
    op.execute("CREATE INDEX IF NOT EXISTS idx_trades_user_opened ON trades (user_id, opened_at DESC);")

    op.create_index("idx_executions_trade", "executions", ["trade_id"])
    op.create_index("idx_executions_time", "executions", ["executed_at"])
    op.create_index("idx_logs_user", "logs", ["user_id"])
    op.create_index("idx_logs_created", "logs", ["created_at"])
    op.create_index("idx_positions_user", "positions", ["user_id"])
    op.create_index("idx_positions_symbol", "positions", ["symbol"])

    op.create_index(
        "uq_trades_idempotency_key",
        "trades",
        ["idempotency_key"],
        unique=True,
        postgresql_where=sa.text("idempotency_key IS NOT NULL"),
    )
    op.create_index(
        "uq_executions_idempotency_key",
        "executions",
        ["idempotency_key"],
        unique=True,
        postgresql_where=sa.text("idempotency_key IS NOT NULL"),
    )
    op.create_index(
        "uq_executions_provider_order",
        "executions",
        ["provider", "provider_order_id"],
        unique=True,
    )
    op.create_index(
        "uq_strategy_runs_active",
        "strategy_runs",
        ["user_id", "strategy_id"],
        unique=True,
        postgresql_where=sa.text("status = 'running'"),
    )


def downgrade() -> None:
    op.drop_index("uq_strategy_runs_active", table_name="strategy_runs")
    op.drop_index("uq_executions_provider_order", table_name="executions")
    op.drop_index("uq_executions_idempotency_key", table_name="executions")
    op.drop_index("uq_trades_idempotency_key", table_name="trades")

    op.drop_index("idx_positions_symbol", table_name="positions")
    op.drop_index("idx_positions_user", table_name="positions")
    op.drop_index("idx_logs_created", table_name="logs")
    op.drop_index("idx_logs_user", table_name="logs")
    op.drop_index("idx_executions_time", table_name="executions")
    op.drop_index("idx_executions_trade", table_name="executions")
    op.drop_index("idx_trades_strategy_run", table_name="trades")
    op.drop_index("idx_trades_opened", table_name="trades")
    op.drop_index("idx_trades_status", table_name="trades")
    op.drop_index("idx_trades_user", table_name="trades")
    op.execute("DROP INDEX IF EXISTS idx_trades_user_opened;")
