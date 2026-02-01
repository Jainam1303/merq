# Regression Test Plan (Phase 7)
**Status:** DRAFT
**Goal:** Verify correct behavior of the Hybrid Node+Python system compared to Legacy.

## 1. Setup & Pre-requisites
- [ ] Node.js Server running on Port 3001
- [ ] Python Engine running on Port 5001
- [ ] PostgreSQL Database with `users` table populated with test credentials
- [ ] Redis (or file persistence) cleared

## 2. Authentication Flow (New)
**Goal:** Verify Node handles Auth, not Python.
- [ ] **Test 2.1:** Register new user via `/api/auth/register`.
  - *Expected:* HTTP 201, User created in DB.
- [ ] **Test 2.2:** Login via `/api/auth/login`.
  - *Expected:* HTTP 200, JWT Token returned.
- [ ] **Test 2.3:** Access protected route `/api/val/profile` without Token.
  - *Expected:* HTTP 403 Forbidden.

## 3. Credential Management (User Request)
**Goal:** Verify exact credential set handling.
- [ ] **Test 3.1:** Update Profile with Broker Keys.
  - *Action:* POST to `/api/val/update_profile` (Needs implementation in controller).
  - *Payload:* `angel_api_key`, `angel_client_code`, `angel_password`, `angel_totp`.
  - *Verification:* Check DB stores these fields.
- [ ] **Test 3.2:** Verify Backtest Keys separation.
  - *Payload:* `backtest_api_key` (Different from live), `backtest_client_code` (Same/Diff), `backtest_password`, `backtest_totp`.
  - *Verification:* Check DB stores distinct values.

## 4. Trading Session Lifecycle
**Goal:** Link Node -> Internal API -> Python.
- [ ] **Test 4.1:** Start Bot via Node.
  - *Action:* POST `/api/start` with JWT.
  - *Internal:* Node queries User DB -> Decrypts Keys -> Calls Python `POST /engine/start`.
  - *Python Log:* Should show "Received Start Request for User X with Creds...".
  - *Expected:* HTTP 200 `{ "status": "started" }`.
- [ ] **Test 4.2:** Stop Bot via Node.
  - *Action:* POST `/api/stop`.
  - *Internal:* Node Calls Python `POST /engine/stop`.
  - *Expected:* HTTP 200.

## 5. Live Data Relay (Socket)
**Goal:** Verify Event Bus.
- [ ] **Test 5.1:** Python Emits Fake Event.
  - *Script:* Run `test_emit.py` on Python side.
  - *Flow:* Python -> Node Webhook (`/api/internal/events`) -> Socket.io Room.
  - *Frontend:* React Component should log "Received Event".

## 6. Failure Recovery (Hardening)
- [ ] **Test 6.1:** Python Crash.
  - *Action:* Kill Python process.
  - *Check:* Node endpoint `/status` should return `{ "status": "offline" }` or error handled gracefully.
- [ ] **Test 6.2:** Node Restart.
  - *Action:* Restart Node process.
  - *Check:* Python should continue running trading thread (No kill signal sent).

## 7. Execution Checklist
| Test ID | Description | Status | Notes |
| :--- | :--- | :--- | :--- |
| 2.1 | Register | ⚪ | |
| 2.2 | Login | ⚪ | |
| 3.1 | Save Live Creds | ⚪ | |
| 3.2 | Save Backtest Creds | ⚪ | |
| 4.1 | Start Engine | ⚪ | |
| 5.1 | Socket Event | ⚪ | |
