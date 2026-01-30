from alembic import op
import sqlalchemy as sa


revision = "0002_create_trades_and_positions"
down_revision = "0001_create_enums_and_strategy_runs"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "trades",
        sa.Column("id", sa.UUID(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("strategy_id", sa.Text(), nullable=False),
        sa.Column("strategy_run_id", sa.UUID(), sa.ForeignKey("strategy_runs.id", ondelete="SET NULL")),
        sa.Column("symbol", sa.Text(), nullable=False),
        sa.Column(
            "status",
            sa.Enum("open", "closed", "canceled", "rejected", name="trade_status_enum", create_type=False),
            nullable=False,
        ),
        sa.Column(
            "side",
            sa.Enum("buy", "sell", name="order_side_enum", create_type=False),
        ),
        sa.Column("quantity", sa.Numeric(20, 8), nullable=False),
        sa.Column("entry_price", sa.Numeric(20, 8), nullable=False),
        sa.Column("exit_price", sa.Numeric(20, 8), nullable=False, server_default="0"),
        sa.Column("sl", sa.Numeric(20, 8), nullable=False, server_default="0"),
        sa.Column("tp", sa.Numeric(20, 8), nullable=False, server_default="0"),
        sa.Column("pnl", sa.Numeric(20, 8), nullable=False, server_default="0"),
        sa.Column("idempotency_key", sa.Text()),
        sa.Column("is_simulated", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("opened_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("closed_at", sa.TIMESTAMP(timezone=True)),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.CheckConstraint("quantity > 0", name="ck_trades_quantity_positive"),
        sa.CheckConstraint("entry_price >= 0", name="ck_trades_entry_price_non_negative"),
        sa.CheckConstraint("exit_price >= 0", name="ck_trades_exit_price_non_negative"),
        sa.CheckConstraint("sl >= 0", name="ck_trades_sl_non_negative"),
        sa.CheckConstraint("tp >= 0", name="ck_trades_tp_non_negative"),
    )

    op.create_table(
        "positions",
        sa.Column("id", sa.UUID(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("strategy_id", sa.Text(), nullable=False),
        sa.Column("symbol", sa.Text(), nullable=False),
        sa.Column(
            "side",
            sa.Enum("buy", "sell", name="order_side_enum", create_type=False),
            nullable=False,
        ),
        sa.Column("quantity", sa.Numeric(20, 8), nullable=False),
        sa.Column("avg_price", sa.Numeric(20, 8), nullable=False),
        sa.Column("unrealized_pnl", sa.Numeric(20, 8), nullable=False, server_default="0"),
        sa.Column("realized_pnl", sa.Numeric(20, 8), nullable=False, server_default="0"),
        sa.Column("opened_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("closed_at", sa.TIMESTAMP(timezone=True)),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.CheckConstraint("quantity > 0", name="ck_positions_quantity_positive"),
        sa.CheckConstraint("avg_price >= 0", name="ck_positions_avg_price_non_negative"),
    )


def downgrade() -> None:
    op.drop_table("positions")
    op.drop_table("trades")
