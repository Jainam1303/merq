# Architecture Boundaries & Ownership Protocol
**Version:** 1.0  
**Status:** DRAFT (Phase 1)  

## 1. Core Principles
- **No Shared State:** Node.js and Python share NO memory. They communicate *only* via HTTP Internal API.
- **Single Source of Truth:** 
  - **User/Commercial Data** -> Node.js (PostgreSQL)
  - **Trading State** -> Python (In-Memory/JSON/Redis)
- **Uni-directional Dependency:** Node.js calls Python. Python NEVER calls Node.js (it emits events via Queue/Webhook if needed, but for Phase 1-5, it relies on passive state retrieval).

---

## 2. Component Boundaries

### 🟢 Node.js Backend (The "Product" Layer)
**Responsibility:** Commercial logic, User Interface Support, Security Gateway.
**Allowed Actions:**
- **[WRITE]** User accounts, Passwords, API Keys.
- **[WRITE]** Subscription Plans, Payments, Invoices.
- **[WRITE]** User Preferences (Strategy Enable/Disable flags).
- **[READ]** Trading Status (via Relay from Python).
- **[READ]** Dashboard Metrics (via Relay from Python).
- **[AUTH]** Authenticates ALL incoming HTTP requests from the Frontend.

**❌ STRICTLY FORBIDDEN:**
- **NEVER** Connect to Angel One / Broker APIs directly.
- **NEVER** Calculate PnL (Must display what Python reports).
- **NEVER** Decide to place/cancel an order (can only forward user intent).
- **NEVER** Store live trade state in its own primary DB tables (it relays from Python).

---

### 🔵 Python Algo Engine (The "Execution" Layer)
**Responsibility:** Order Management, Strategy Execution, Market Data connectivity.
**Allowed Actions:**
- **[EXECUTE]** Place, Modify, Cancel Orders on Broker.
- **[COMPUTE]** Calculate Signals, PnL, Stop Loss, Take Profit.
- **[CONNECT]** Maintain WebSocket connection to Broker.
- **[STORE]** Ephemeral trading state (Active Trades, Open Positions).
- **[VALIDATE]** Strategy-specific parameters (e.g., "Is stop_loss valid for Nifty?").

**❌ STRICTLY FORBIDDEN:**
- **NEVER** Accept public traffic (Must sit behind Node.js or VPN).
- **NEVER** Handle User Login/Signup or Payments.
- **NEVER** Modify User Subscription Plans.

---

### 🟠 React Frontend (The "View" Layer)
**Responsibility:** Rendering UI, User Input.
**Allowed Actions:**
- **[DISPLAY]** Data received from Node.js API.
- **[REQUEST]** User INTENT (e.g., "Start Bot", "Stop Bot") sent to Node.js.

**❌ STRICTLY FORBIDDEN:**
- **NEVER** Calculate PnL locally (No business logic in JS).
- **NEVER** Store Broker Credentials in LocalStorage/SessionStorage.
- **NEVER** Connect to Python Backend directly.

---

## 3. Data Ownership Map

| Data Entity | Primary Owner | Persistence | access Control |
| :--- | :--- | :--- | :--- |
| **User Profile** | Node.js | PostgreSQL (Users) | Node Auth |
| **Subscription** | Node.js | PostgreSQL (Plans) | Node Auth |
| **Broker Creds** | Node.js | Encrypted PostgreSQL | Node App Only |
| **Strategy Config** | Node.js | PostgreSQL (UserStrategies) | Node Auth |
| **Live Trades** | Python | JSON / Redis | Internal API Only |
| **Historical PnL** | Python | PostgreSQL (Trades) | Internal API Only |
| **Market Ticks** | Python | In-Memory | Internal API Only |
| **Logs (Audit)** | Node.js | PostgreSQL (AuditLogs) | Admin Only |

---

## 4. Key Workflows (Boundary Crossings)

### Workflow: Start Trading
1. **Frontend:** User clicks "Start" -> `POST /api/bot/start` (Node.js)
2. **Node.js:** 
   - Check Subscription (Active?)
   - Check Plan Limits (Max live trades?)
   - Decrypt Broker Creds (Internal use only)
   - **CALLS** -> Python `POST /engine/start` (with Creds + Config)
3. **Python:** 
   - Validates Integrity
   - Starts Thread/Process
   - Returns `SessionID`
4. **Node.js:** Logs action, returns Success to Frontend.

### Workflow: PnL Update
1. **Python:** Receives Tick -> Updates PnL in Memory.
2. **Node.js:** Polling/Socket -> requests Status from Python.
3. **Frontend:** Connects to Node.js WebSocket -> Receives PnL update.

---

## 5. Emergency Procedures
- **Kill Switch:** If Node.js dies, Python CONTINUES running existing trades (Safety).
- **Rollback:** If Python dies, Node.js reports "Engine Offline" but User Data is safe.
