# MerQPrime Internal API Contract (Node → Python)

This document defines the service-to-service contract between the public Node backend and the internal Python algo backend.

## Authentication & Signing

All requests to the Python backend MUST be signed with a shared secret.

**Headers (required):**
- `x-internal-timestamp`: Unix epoch seconds
- `x-internal-nonce`: UUID v4 (unique per request)
- `x-internal-signature`: HMAC-SHA256 hex digest

**Signature payload:**
```
${timestamp}.${nonce}.${METHOD}.${path}.${body}
```

Notes:
- `METHOD` is uppercase (GET/POST/etc.)
- `path` is the URL path only (e.g. `/strategies/ema/start`)
- `body` is the raw JSON string (empty string if no body)
- Clock skew allowed: ±30 seconds (configurable)
- Nonce replay window: 2x skew window

If any of the headers are missing or invalid, the Python backend returns `401 Unauthorized`.

## Security Guarantees

- Python **does not trust frontend input**.
- Python **trusts `user_id` only when** the request signature is valid.
- Node must verify the user session/JWT before calling Python.

## Endpoints

### POST `/strategies/{strategy_id}/start`
**Request body:**
```json
{
  "user_id": "uuid-or-string",
  "risk_config": {
    "api_key": "string",
    "client_code": "string",
    "password": "string",
    "totp": "string",
    "simulated": true,
    "safety_guard_enabled": true,
    "max_daily_loss": 5000
  }
}
```

**Response 200:**
```json
{
  "success": true,
  "result": "Started"
}
```

### POST `/strategies/{strategy_id}/stop`
**Request body:**
```json
{
  "user_id": "uuid-or-string"
}
```

**Response 200:**
```json
{
  "success": true,
  "result": "Stopped"
}
```

### GET `/status?user_id=...`
**Response 200:**
```json
{ "running": true }
```

### GET `/trades?user_id=...`
**Response 200:**
```json
{ "trades": [/* trade objects */] }
```

### GET `/pnl?user_id=...`
**Response 200:**
```json
{ "pnl": 1234.56 }
```

## Error Mapping

| Python Status | Node Mapping | Meaning |
| --- | --- | --- |
| 401 | 401 | Invalid/missing signature or replay |
| 400 | 400 | Invalid input schema |
| 403 | 403 | Subscription/access denied (Node-side checks) |
| 404 | 404 | Strategy not found (Node-side checks) |
| 503 | 503 | Kill switch enabled |
| 500 | 502 | Internal algo error (Node returns Bad Gateway) |

