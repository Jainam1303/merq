from alembic import op
import sqlalchemy as sa


revision = "0003_create_executions_and_logs"
down_revision = "0002_create_trades_and_positions"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "executions",
        sa.Column("id", sa.UUID(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("trade_id", sa.UUID(), sa.ForeignKey("trades.id", ondelete="CASCADE"), nullable=False),
        sa.Column(
            "side",
            sa.Enum("buy", "sell", name="order_side_enum", create_type=False),
            nullable=False,
        ),
        sa.Column("quantity", sa.Numeric(20, 8), nullable=False),
        sa.Column("price", sa.Numeric(20, 8), nullable=False),
        sa.Column("provider_order_id", sa.Text()),
        sa.Column("provider", sa.Text()),
        sa.Column(
            "status",
            sa.Enum(
                "created", "pending", "filled", "partial", "canceled", "rejected",
                name="execution_status_enum",
                create_type=False,
            ),
        ),
        sa.Column("idempotency_key", sa.Text()),
        sa.Column("executed_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("exchange_timestamp", sa.TIMESTAMP(timezone=True)),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.CheckConstraint("quantity > 0", name="ck_executions_quantity_positive"),
        sa.CheckConstraint("price >= 0", name="ck_executions_price_non_negative"),
    )

    op.create_table(
        "logs",
        sa.Column("id", sa.UUID(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("level", sa.Text(), nullable=False),
        sa.Column("event_type", sa.Text(), nullable=False),
        sa.Column("correlation_id", sa.Text()),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("context", sa.JSON()),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("deleted_at", sa.TIMESTAMP(timezone=True)),
    )


def downgrade() -> None:
    op.drop_table("logs")
    op.drop_table("executions")
