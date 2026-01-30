from alembic import op
import sqlalchemy as sa


revision = "0001_create_enums_and_strategy_runs"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute('CREATE EXTENSION IF NOT EXISTS "pgcrypto";')
    op.execute(
        "DO $$ BEGIN CREATE TYPE trade_status_enum AS ENUM ('open', 'closed', 'canceled', 'rejected'); "
        "EXCEPTION WHEN duplicate_object THEN null; END $$;"
    )
    op.execute(
        "DO $$ BEGIN CREATE TYPE order_side_enum AS ENUM ('buy', 'sell'); "
        "EXCEPTION WHEN duplicate_object THEN null; END $$;"
    )
    op.execute(
        "DO $$ BEGIN CREATE TYPE execution_status_enum AS ENUM "
        "('created', 'pending', 'filled', 'partial', 'canceled', 'rejected'); "
        "EXCEPTION WHEN duplicate_object THEN null; END $$;"
    )
    op.execute(
        "DO $$ BEGIN CREATE TYPE run_status_enum AS ENUM "
        "('running', 'stopped', 'failed', 'completed'); "
        "EXCEPTION WHEN duplicate_object THEN null; END $$;"
    )

    op.create_table(
        "strategy_runs",
        sa.Column("id", sa.UUID(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("strategy_id", sa.Text(), nullable=False),
        sa.Column(
            "status",
            sa.Enum(
                "running", "stopped", "failed", "completed",
                name="run_status_enum",
                create_type=False,
            ),
            nullable=False,
            server_default="running",
        ),
        sa.Column("started_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("stopped_at", sa.TIMESTAMP(timezone=True)),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("deleted_at", sa.TIMESTAMP(timezone=True)),
    )


def downgrade() -> None:
    op.drop_table("strategy_runs")
    op.execute("DROP TYPE IF EXISTS run_status_enum;")
    op.execute("DROP TYPE IF EXISTS execution_status_enum;")
    op.execute("DROP TYPE IF EXISTS order_side_enum;")
    op.execute("DROP TYPE IF EXISTS trade_status_enum;")
