# MerQ Migration Progress Checklist

## 🔒 PHASE 0 — FREEZE & SAFETY (DO THIS FIRST OR STOP)
- [x] Legacy algo is feature-frozen (no strategy changes)
- [x] Current production behavior documented (this Foreman doc = baseline)
- [x] Trade timing, SL/TP behavior recorded for reference
- [ ] A known good commit hash is tagged as legacy-stable
- [ ] One full trading day observed with:
    - [ ] SL hit
    - [ ] TP hit
    - [ ] Manual SL edit
    - [ ] Restart recovery
- [ ] Rollback plan exists (can redeploy legacy in <10 minutes)

## 🧠 PHASE 1 — DEFINE BOUNDARIES (NO CODE YET)
### Ownership Lock-In
- [x] Python owns ALL live trading state
- [x] Python owns WebSocket ticks & PnL
- [x] Python owns order execution & OCO
- [x] Node owns users, auth, plans, payments
- [x] React renders only, computes nothing

### Explicit Forbidden Actions
- [x] Node will NEVER place orders
- [x] Node will NEVER compute PnL
- [x] React will NEVER talk to broker or Python directly
- [x] Python will NEVER validate subscriptions
- [x] Boundary document written & agreed by both founders

## 🧱 PHASE 2 — STAND UP NODE BACKEND (PARALLEL, NO TRAFFIC)
- [x] Create new Node + Express project
- [x] Connect Node to existing PostgreSQL (read-only initially)
- [x] Implement models:
    - [x] User
    - [x] Plan
    - [x] Subscription
    - [x] StrategyConfig (metadata only)
- [x] Node runs on separate port / service
- [x] No Flask code touched
- [x] No Python code touched
- [x] Node API reachable but UNUSED by frontend

## 🔐 PHASE 3 — AUTH & COMMERCIAL LOGIC MIGRATION
- [x] Move login / signup logic to Node
- [x] JWT or session auth implemented in Node
- [x] Flask auth routes marked deprecated but still functional
- [ ] Payments (Razorpay) moved to Node
- [x] Plan enforcement logic implemented in Node:
    - [x] max_live_trades
    - [ ] strategy access
    - [ ] paper vs live permission
- [x] Node writes ONLY:
    - [x] plan_id
    - [x] strategy enable flags
    - [x] limits
- [x] Python still starts bots exactly as before

## 🔌 PHASE 4 — NODE ↔ PYTHON INTERNAL API (CRITICAL)
- [x] Python exposes internal-only API (not public):
    - [x] /engine/start
    - [x] /engine/stop
    - [x] /engine/status
    - [x] /engine/update-risk
- [x] Python endpoints:
    - [x] Stateless requests
    - [x] Affect only existing StrategySession logic
    - [x] NO trading logic refactor
- [x] Node calls Python using:
    - [x] Service token auth
    - [x] Retry with idempotency keys
- [x] Node does NOT wait synchronously for trade results
- [x] Python can run fully without Node (fallback safety)

## 🔄 PHASE 5 — EVENT FLOW BACK TO NODE
- [x] Python emits events:
    - [x] trade_opened
    - [x] trade_closed
    - [x] engine_error
    - [x] session_status
- [x] Node ingests events and:
    - [x] Stores summaries
    - [x] Updates dashboards
    - [x] Triggers UI updates
- [x] Node does NOT transform PnL numbers
- [x] PnL values remain Python-generated

## 🎨 PHASE 6 — FRONTEND CUTOVER (REACT)
- [x] React frontend switched to Node APIs
- [x] Flask UI routes no longer used
- [x] Frontend receives:
    - [x] Live state (from Python via Node relay OR direct WS)
    - [x] User permissions (from Node)
- [x] Frontend:
    - [x] Overwrites state on every update
    - [x] Never “derives” trading state
- [x] UI verified for:
    - [x] Live PnL sync
    - [x] Manual SL/TP update visibility
    - [x] Stop/start responsiveness

## 🧪 PHASE 7 — REGRESSION & FAILURE TESTING
- [x] Trade lifecycle test (Entry → SL → cancel TP)
- [x] Trade lifecycle test (Entry → TP → cancel SL)
- [x] Manual SL modification mid-trade
- [x] Restart Python mid-trade → recovery verified
- [x] Kill Node → Python continues trading
- [x] Kill Python → Node reports halted state
- [x] WebSocket drop → auto reconnect
- [x] API failure → retry without duplication
- [x] Results match legacy behavior exactly

## 🧹 PHASE 8 — DECOMMISSION FLASK UI
- [x] Flask UI routes removed
- [x] Flask becomes engine-only service
- [x] All user-facing routes served by Node
- [x] Legacy Flask auth code archived (not deleted)
- [x] Documentation updated

## 🚀 PHASE 9 — POST-MIGRATION HARDENING
- [x] Rate limiting on Node APIs
- [x] Internal API secrets rotated
- [x] Monitoring added (engine alive, WS alive)
- [x] Kill-switch tested
- [x] Backup strategy validated
- [x] Migration declared COMPLETE
