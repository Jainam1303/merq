# Decommissioning & Rollback Protocol (Phase 8)
**Status:** DRAFT
**Goal:** Safely retire the legacy Flask UI while retaining the Trading Engine core.

## 1. Decommissioning the Legacy Flask UI

### A. Code Cleanup (Python Side)
The legacy `app.py` contained both HTML rendering and Trading Logic. We must separate them.
1.  **Stop Running `app.py`:**
    *   Do NOT run `python app.py`.
    *   Run `uvicorn main:app --port 5001` instead.
2.  **Refactor Imports (If needed):**
    *   If `main.py` needs classes from `app.py` (e.g., `StrategySession`), import them as modules.
    *   *Action:* verify `custom_strategy.py` or `strategy_engine.py` contains the core logic, minimizing dependencies on `app.py`.
3.  **Firewall Rules:**
    *   Block external access to Port 5001 (Python).
    *   Allow ONLY `localhost:3001` (Node) to talk to `localhost:5001`.

### B. Route Redirection
1.  **Frontend/Nginx:**
    *   Ensure NO traffic hits the old Flask routes (`/login`, `/dashboard`).
    *   All user traffic must hit Node.js via Next.js Proxy or Nginx.

## 2. Archival Process
1.  **Legacy Folder (`Angel-algo`):**
    *   **Do NOT Delete.** Rename to `Angel-algo-LEGACY_ARCHIVE`.
    *   Compress into `legacy_backup_[DATE].zip`.
    *   Store in S3 / Google Drive / Local Backup.

## 3. Rollback Plan (Emergency Reversion)
**Trigger:** Critical Failure in Trading Execution or Data Sync during the first 48 hours.

### Steps to Rollback (< 10 Minutes):
1.  **Stop New System:**
    *   `pm2 stop backend-node`
    *   `pkill uvicorn`
2.  **Restore Legacy:**
    *   `cd d:/Jainam/MerQ/Angel-algo`
    *   `python app.py` (Starts on Port 5001 - Legacy Mode).
    *   *Note:* Can run on Port 5001 because the new Python engine is stopped.
3.  **Frontend Revert:**
    *   If Frontend was deployed to Vercel/Netlify, rollback to the previous "Stable Legacy" deployment.
    *   If local, run `npm run dev` in the old `algo_dashboard` folder.
4.  **Database Sync:**
    *   Legacy app uses the *same* `users` and `trades` tables (backward compatible schema was maintained).
    *   *Risk:* New users created in Node might not work in Flask if `password_hash` format significantly changed (Node uses bcrypt, Legacy used bcrypt - compatible).

## 4. Post-Migration Monitoring
| Metric | Threshold | Action |
| :--- | :--- | :--- |
| **Node API Latency** | > 500ms | Check DB Connection / Node Logs |
| **Python Heartbeat** | > 5s Late | Restart Python Service |
| **Trade Execution** | Failed Order | Alert Admin immediately |
| **Socket Disconnects** | > 10/min | Check Redis/Socket.io adapter |

## 5. Final verification
- [ ] Verify `Angel-algo` folder is untouched (ReadOnly).
- [ ] Verify `MerQPrime` folder works independently.
- [ ] Verify `INTERNAL_API_CONTRACT.md` is respected.
