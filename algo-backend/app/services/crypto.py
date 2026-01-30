import base64
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes

from app.config import settings


def _load_key() -> bytes:
    key_hex = settings.encryption_key
    if not key_hex:
        raise ValueError("ENCRYPTION_KEY is required")
    key = bytes.fromhex(key_hex)
    if len(key) != 32:
        raise ValueError("ENCRYPTION_KEY must be 64 hex chars")
    return key


def decrypt_secret(payload: str) -> str:
    if not payload:
        return ""
    data = base64.b64decode(payload)
    iv = data[:12]
    tag = data[12:28]
    ciphertext = data[28:]
    key = _load_key()
    decryptor = Cipher(algorithms.AES(key), modes.GCM(iv, tag)).decryptor()
    return (decryptor.update(ciphertext) + decryptor.finalize()).decode("utf-8")
