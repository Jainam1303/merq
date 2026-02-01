# Internal API Contract (Node <-> Python)
**Version:** 1.0 (Phase 4)

## Architecture
- **Protocol:** HTTP (REST)
- **Format:** JSON
- **Direction:** Node.js (Client) -> Python (Server)
- **Auth:** HMAC-SHA256 Signature (Header `X-Internal-Sig`)

## 1. Authentication Headers
ALL requests from Node to Python must include:
```json
{
  "X-Service-ID": "merq-node-core",
  "X-Timestamp": "1738302011",
  "X-Internal-Sig": "HMAC_HASH(body + timestamp + secret)"
}
```

## 2. API Endpoints

### A. Engine Control
#### 1. Start Strategy Session
**POST** `/engine/start`
**Payload:**
```json
{
  "user_id": "uuid-string",
  "session_token": "temp-session-token",
  "strategy_config": {
    "name": "ORB",
    "params": { "time_frame": "5m", "sl_pct": 1.0 }
  },
  "broker_credentials": {
    "encrypted_blob": "..."  // Python decrypts this in memory
  }
}
```
**Response:**
```json
{ "status": "started", "session_id": "sid_123" }
```

#### 2. Stop Strategy Session
**POST** `/engine/stop`
**Payload:**
```json
{ "user_id": "uuid-string", "session_id": "sid_123" }
```

### B. State Retrieval (Poll/Relay)
#### 3. Get Live Status
**GET** `/engine/status/:user_id`
**Response:**
```json
{
  "active": true,
  "pnl_live": 150.50,
  "open_positions": [
    { "symbol": "NIFTY", "qty": 50, "ltp": 21000 }
  ],
  "last_heartbeat": "2026-01-31T11:45:00Z"
}
```

#### 4. Update Risk Parameters
**POST** `/engine/update-risk`
**Payload:**
```json
{
  "user_id": "uuid-string",
  "max_loss": 5000,
  "force_exit_all": false
}
```

### C. System Health
#### 5. Health Check
**GET** `/health`
- Returns 200 OK only if Broker Socket is connected and Thread is alive.

---

## 3. Idempotency & Retry
- Node.js MUST include `request_id` in mutative calls (Start/Stop).
- Python MUST cache `request_id` for 1 minute to prevent double-execution on Retry.

## 4. Error Codes
- **401:** Invalid Signature.
- **403:** User License Expired (checked locally by Python as safeguard).
- **409:** Session Already Active.
- **503:** Broker API Disconnected.
