import hashlib
import hmac
import secrets
import time
from typing import Dict

from fastapi import HTTPException, Request

from app.config import settings


class NonceCache:
    def __init__(self) -> None:
        self._cache: Dict[str, float] = {}

    def is_replay(self, nonce: str, ttl_seconds: int) -> bool:
        now = time.time()
        self._cleanup(now, ttl_seconds)
        if nonce in self._cache:
            return True
        self._cache[nonce] = now
        return False

    def _cleanup(self, now: float, ttl_seconds: int) -> None:
        expired = [key for key, ts in self._cache.items() if now - ts > ttl_seconds]
        for key in expired:
            self._cache.pop(key, None)


nonce_cache = NonceCache()


def _signature_payload(timestamp: str, nonce: str, method: str, path: str, body: bytes) -> bytes:
    return b".".join(
        [
            timestamp.encode("utf-8"),
            nonce.encode("utf-8"),
            method.upper().encode("utf-8"),
            path.encode("utf-8"),
            body,
        ]
    )


def verify_signed_request(request: Request, body: bytes) -> None:
    if not settings.internal_secret:
        raise HTTPException(status_code=500, detail="Internal secret not configured")

    timestamp = request.headers.get("x-internal-timestamp")
    nonce = request.headers.get("x-internal-nonce")
    signature = request.headers.get("x-internal-signature")

    if not timestamp or not nonce or not signature:
        raise HTTPException(status_code=401, detail="Unauthorized")

    try:
        ts_value = int(timestamp)
    except ValueError:
        raise HTTPException(status_code=401, detail="Unauthorized")

    now = int(time.time())
    if abs(now - ts_value) > settings.allowed_skew_seconds:
        raise HTTPException(status_code=401, detail="Unauthorized")

    if nonce_cache.is_replay(nonce, settings.allowed_skew_seconds * 2):
        raise HTTPException(status_code=401, detail="Unauthorized")

    payload = _signature_payload(timestamp, nonce, request.method, request.url.path, body)
    expected = hmac.new(
        settings.internal_secret.encode("utf-8"),
        payload,
        hashlib.sha256,
    ).hexdigest()

    if not secrets.compare_digest(expected, signature):
        raise HTTPException(status_code=401, detail="Unauthorized")
