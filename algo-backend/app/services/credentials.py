from typing import Dict, Optional

from sqlalchemy import text

from app.db.session import db_session
from app.services.crypto import decrypt_secret


def load_broker_credentials(user_id: str) -> Optional[Dict[str, str]]:
    try:
        with db_session() as session:
            row = session.execute(
                text(
                    """
                    SELECT api_key_enc, client_code_enc, password_enc, totp_enc
                    FROM user_profiles
                    WHERE user_id = :user_id
                    """
                ),
                {"user_id": user_id},
            ).fetchone()
        if not row:
            return None
        if not (row.api_key_enc and row.client_code_enc and row.password_enc and row.totp_enc):
            return None
        return {
            "api_key": decrypt_secret(row.api_key_enc),
            "client_code": decrypt_secret(row.client_code_enc),
            "password": decrypt_secret(row.password_enc),
            "totp": decrypt_secret(row.totp_enc),
        }
    except Exception:
        return None


def load_backtest_credentials(user_id: str) -> Optional[Dict[str, str]]:
    try:
        with db_session() as session:
            row = session.execute(
                text(
                    """
                    SELECT backtest_api_key_enc, backtest_client_code_enc, backtest_password_enc, backtest_totp_enc
                    FROM user_profiles
                    WHERE user_id = :user_id
                    """
                ),
                {"user_id": user_id},
            ).fetchone()
        if not row:
            return None
        if not (
            row.backtest_api_key_enc
            and row.backtest_client_code_enc
            and row.backtest_password_enc
            and row.backtest_totp_enc
        ):
            return None
        return {
            "api_key": decrypt_secret(row.backtest_api_key_enc),
            "client_code": decrypt_secret(row.backtest_client_code_enc),
            "password": decrypt_secret(row.backtest_password_enc),
            "totp": decrypt_secret(row.backtest_totp_enc),
        }
    except Exception:
        return None
