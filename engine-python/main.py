from fastapi import FastAPI, HTTPException, Header, BackgroundTasks
from pydantic import BaseModel
import hmac
import hashlib
import os
import uvicorn
import json

# Initialize FastAPI (Internal Only)
app = FastAPI(title="MerQ Python Engine", docs_url=None)

INTERNAL_SECRET = os.getenv("INTERNAL_SECRET", "shared_secret_key_must_match_python")

# Models source from Contract
class StrategyStartRequest(BaseModel):
    user_id: str
    strategy_config: dict
    broker_credentials: dict

class EventRequest(BaseModel):
    user_id: str
    event: str
    data: dict

# Middleware for HMAC Validation
def validate_hmac(x_internal_sig: str = Header(None), x_timestamp: str = Header(None)):
    if not x_internal_sig or not x_timestamp:
        raise HTTPException(status_code=401, detail="Missing Signature")
        
    # In a real app, validate timestamp freshness (e.g. within 60s)
    
    # We can't validate body hash easily in Depends without reading stream,
    # so we assume firewall trust + secret for this MVP V1.
    return True

@app.get("/")
def health_check():
    return {"status": "active", "engine": "python-v1"}

@app.post("/engine/start")
def start_engine(request: StrategyStartRequest):
    # This is where we will hook into the Legacy Logic
    # user_id = request.user_id
    # creds = request.broker_credentials
    # Start Thread...
    return {"status": "started", "session_id": "simulated_session_123"}

@app.post("/engine/stop")
def stop_engine(user_id: str):
    return {"status": "stopped"}

@app.post("/backtest")
def run_backtest(data: dict):
    # Simulated Result for now since actual logic files might be missing or complex to integrate in one go
    # In future: from backtester import run_backtest_logic
    from backtest_runner import login_and_run_backtest
    
    results = login_and_run_backtest(data)
    
    return {
        "status": "success",
        "results": results
    }

@app.get("/engine/status/{user_id}")
def get_status(user_id: str):
    return {"active": False, "pnl": 0.0, "positions": []}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5001)
