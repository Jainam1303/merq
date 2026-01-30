import uuid
from decimal import Decimal
from typing import Optional, Tuple

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db.session import db_session


class BrokerError(Exception):
    pass


class BrokerTimeout(BrokerError):
    pass


class BrokerRejection(BrokerError):
    pass


def _advisory_lock(session: Session, key: str) -> None:
    session.execute(text("SELECT pg_advisory_xact_lock(hashtext(:key))"), {"key": key})


def _reserve_trade_intent(
    session: Session,
    *,
    user_id: str,
    strategy_id: str,
    symbol: str,
    side: str,
    quantity: Decimal,
    entry_price: Decimal,
    idempotency_key: str,
    strategy_run_id: Optional[str],
    correlation_id: str,
    is_simulated: bool,
) -> str:
    _advisory_lock(session, f"trade:{idempotency_key}")

    existing = session.execute(
        text(
            """
            SELECT id, status
            FROM trades
            WHERE idempotency_key = :idempotency_key
            FOR UPDATE
            """
        ),
        {"idempotency_key": idempotency_key},
    ).fetchone()

    if existing:
        return str(existing.id)

    trade_id = str(uuid.uuid4())
    session.execute(
        text(
            """
            INSERT INTO trades (
              id, user_id, strategy_id, strategy_run_id, symbol, status, side,
              quantity, entry_price, exit_price, sl, tp, pnl, idempotency_key,
              is_simulated, opened_at, created_at, updated_at
            )
            VALUES (
              :id, :user_id, :strategy_id, :strategy_run_id, :symbol, 'open', :side,
              :quantity, :entry_price, 0, 0, 0, 0, :idempotency_key,
              :is_simulated, now(), now(), now()
            )
            """
        ),
        {
            "id": trade_id,
            "user_id": user_id,
            "strategy_id": strategy_id,
            "strategy_run_id": strategy_run_id,
            "symbol": symbol,
            "side": side,
            "quantity": quantity,
            "entry_price": entry_price,
            "idempotency_key": idempotency_key,
            "is_simulated": is_simulated,
        },
    )

    session.execute(
        text(
            """
            INSERT INTO logs (id, user_id, level, event_type, correlation_id, message, context, created_at, updated_at)
            VALUES (gen_random_uuid(), :user_id, 'INFO', 'trade_intent', :correlation_id,
              'Trade intent reserved', jsonb_build_object('trade_id', :trade_id), now(), now())
            """
        ),
        {"user_id": user_id, "trade_id": trade_id, "correlation_id": correlation_id},
    )

    return trade_id


def _lock_position(
    session: Session,
    *,
    user_id: str,
    strategy_id: str,
    symbol: str,
    side: str,
) -> Optional[Tuple]:
    _advisory_lock(session, f"position:{user_id}:{strategy_id}:{symbol}:{side}")
    return session.execute(
        text(
            """
            SELECT id, quantity, avg_price
            FROM positions
            WHERE user_id = :user_id AND strategy_id = :strategy_id AND symbol = :symbol AND side = :side
            FOR UPDATE
            """
        ),
        {
            "user_id": user_id,
            "strategy_id": strategy_id,
            "symbol": symbol,
            "side": side,
        },
    ).fetchone()


def _apply_fill_to_position(
    session: Session,
    *,
    position_row,
    user_id: str,
    strategy_id: str,
    symbol: str,
    side: str,
    fill_qty: Decimal,
    fill_price: Decimal,
):
    if position_row:
        old_qty = position_row.quantity
        old_avg = position_row.avg_price
        new_qty = old_qty + fill_qty
        new_avg = ((old_qty * old_avg) + (fill_qty * fill_price)) / new_qty
        session.execute(
            text(
                """
                UPDATE positions
                SET quantity = :quantity,
                    avg_price = :avg_price,
                    updated_at = now(),
                    version = version + 1
                WHERE id = :id
                """
            ),
            {"quantity": new_qty, "avg_price": new_avg, "id": position_row.id},
        )
    else:
        session.execute(
            text(
                """
                INSERT INTO positions (
                  id, user_id, strategy_id, symbol, side, quantity, avg_price,
                  unrealized_pnl, realized_pnl, opened_at, created_at, updated_at, version
                )
                VALUES (
                  gen_random_uuid(), :user_id, :strategy_id, :symbol, :side,
                  :quantity, :avg_price, 0, 0, now(), now(), now(), 1
                )
                """
            ),
            {
                "user_id": user_id,
                "strategy_id": strategy_id,
                "symbol": symbol,
                "side": side,
                "quantity": fill_qty,
                "avg_price": fill_price,
            },
        )


def _record_execution_and_update_trade(
    session: Session,
    *,
    trade_id: str,
    user_id: str,
    strategy_id: str,
    symbol: str,
    side: str,
    fill_qty: Decimal,
    fill_price: Decimal,
    provider: str,
    provider_order_id: str,
    execution_status: str,
    execution_idempotency_key: str,
    correlation_id: str,
) -> None:
    _advisory_lock(session, f"exec:{execution_idempotency_key}")

    existing_exec = session.execute(
        text(
            """
            SELECT id FROM executions
            WHERE idempotency_key = :idempotency_key
            FOR UPDATE
            """
        ),
        {"idempotency_key": execution_idempotency_key},
    ).fetchone()

    if existing_exec:
        return

    position_row = _lock_position(
        session, user_id=user_id, strategy_id=strategy_id, symbol=symbol, side=side
    )

    session.execute(
        text(
            """
            INSERT INTO executions (
              id, trade_id, side, quantity, price, provider_order_id, provider, status,
              idempotency_key, executed_at, exchange_timestamp, created_at, updated_at
            )
            VALUES (
              gen_random_uuid(), :trade_id, :side, :quantity, :price, :provider_order_id, :provider, :status,
              :idempotency_key, now(), now(), now(), now()
            )
            """
        ),
        {
            "trade_id": trade_id,
            "side": side,
            "quantity": fill_qty,
            "price": fill_price,
            "provider_order_id": provider_order_id,
            "provider": provider,
            "status": execution_status,
            "idempotency_key": execution_idempotency_key,
        },
    )

    session.execute(
        text(
            """
            UPDATE trades
            SET status = 'closed',
                exit_price = :exit_price,
                pnl = :pnl,
                updated_at = now()
            WHERE id = :trade_id
            """
        ),
        {
            "trade_id": trade_id,
            "exit_price": fill_price,
            "pnl": 0,
        },
    )

    _apply_fill_to_position(
        session,
        position_row=position_row,
        user_id=user_id,
        strategy_id=strategy_id,
        symbol=symbol,
        side=side,
        fill_qty=fill_qty,
        fill_price=fill_price,
    )

    session.execute(
        text(
            """
            INSERT INTO logs (id, user_id, level, event_type, correlation_id, message, context, created_at, updated_at)
            VALUES (gen_random_uuid(), :user_id, 'INFO', 'execution_recorded', :correlation_id,
              'Execution recorded', jsonb_build_object('trade_id', :trade_id), now(), now())
            """
        ),
        {"user_id": user_id, "trade_id": trade_id, "correlation_id": correlation_id},
    )


def execute_trade_flow(
    *,
    broker,
    user_id: str,
    strategy_id: str,
    strategy_run_id: Optional[str],
    symbol: str,
    side: str,
    quantity: Decimal,
    entry_price: Decimal,
    idempotency_key: str,
    correlation_id: str,
    is_simulated: bool = False,
):
    # Phase 1: short transaction to reserve intent and enforce idempotency BEFORE broker call
    with db_session() as session:
        trade_id = _reserve_trade_intent(
            session,
            user_id=user_id,
            strategy_id=strategy_id,
            strategy_run_id=strategy_run_id,
            symbol=symbol,
            side=side,
            quantity=quantity,
            entry_price=entry_price,
            idempotency_key=idempotency_key,
            correlation_id=correlation_id,
            is_simulated=is_simulated,
        )

    # Broker call OUTSIDE transaction (no long-lived transactions)
    try:
        broker_result = broker.place_order(
            symbol=symbol,
            side=side,
            quantity=quantity,
            price=entry_price,
            idempotency_key=idempotency_key,
            correlation_id=correlation_id,
        )
    except BrokerTimeout as exc:
        _record_broker_failure(trade_id, user_id, correlation_id, "timeout", str(exc))
        raise
    except BrokerRejection as exc:
        _record_broker_failure(trade_id, user_id, correlation_id, "rejection", str(exc))
        raise
    except Exception as exc:
        _record_broker_failure(trade_id, user_id, correlation_id, "network", str(exc))
        raise

    execution_idempotency_key = broker_result["execution_idempotency_key"]
    provider = broker_result["provider"]
    provider_order_id = broker_result["provider_order_id"]
    execution_status = broker_result["status"]

    # Phase 2: atomic execution write
    with db_session() as session:
        _record_execution_and_update_trade(
            session,
            trade_id=trade_id,
            user_id=user_id,
            strategy_id=strategy_id,
            symbol=symbol,
            side=side,
            fill_qty=Decimal(str(broker_result["filled_qty"])),
            fill_price=Decimal(str(broker_result["avg_price"])),
            provider=provider,
            provider_order_id=provider_order_id,
            execution_status=execution_status,
            execution_idempotency_key=execution_idempotency_key,
            correlation_id=correlation_id,
        )

    return trade_id


def _record_broker_failure(trade_id: str, user_id: str, correlation_id: str, reason: str, detail: str) -> None:
    with db_session() as session:
        session.execute(
            text(
                """
                UPDATE trades
                SET status = 'rejected',
                    updated_at = now()
                WHERE id = :trade_id
                """
            ),
            {"trade_id": trade_id},
        )
        session.execute(
            text(
                """
                INSERT INTO logs (id, user_id, level, event_type, correlation_id, message, context, created_at, updated_at)
                VALUES (gen_random_uuid(), :user_id, 'ERROR', 'broker_failure', :correlation_id,
                  :message, jsonb_build_object('trade_id', :trade_id, 'reason', :reason), now(), now())
                """
            ),
            {
                "user_id": user_id,
                "trade_id": trade_id,
                "correlation_id": correlation_id,
                "message": detail,
                "reason": reason,
            },
        )
