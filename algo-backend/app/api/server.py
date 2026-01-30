import json
from typing import Any, Dict, Optional

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from app.config import settings
from app.security import verify_signed_request
from app.engine import engine
from app.services.credentials import load_broker_credentials, load_backtest_credentials
from app.services import symbols as symbols_service
from app.services.market_data import get_market_data


app = FastAPI(title="MerQPrime Algo Backend", docs_url=None, redoc_url=None)


class StartStrategyRequest(BaseModel):
    user_id: str = Field(..., min_length=1)
    strategy_id: Optional[str] = None
    risk_config: Optional[Dict[str, Any]] = None


class StopStrategyRequest(BaseModel):
    user_id: str = Field(..., min_length=1)
    strategy_id: Optional[str] = None


class TestOrderRequest(BaseModel):
    user_id: str = Field(..., min_length=1)
    symbol: str
    quantity: float
    sl: float = 0
    tp: float = 0
    mode: str = "BUY"


class TradeActionRequest(BaseModel):
    user_id: str = Field(..., min_length=1)
    trade_id: str = Field(..., min_length=1)


class UpdateTradeRequest(BaseModel):
    user_id: str = Field(..., min_length=1)
    trade_id: str = Field(..., min_length=1)
    sl: float
    tp: float


@app.middleware("http")
async def internal_auth_middleware(request: Request, call_next):
    if request.url.path == "/health":
        return await call_next(request)
    body = await request.body()
    try:
        verify_signed_request(request, body)
    except HTTPException as exc:
        return JSONResponse(status_code=exc.status_code, content={"message": "Unauthorized"})
    return await call_next(request)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "algo", "kill_switch": settings.kill_switch}


@app.post("/start_strategy")
async def start_strategy(payload: StartStrategyRequest):
    if settings.kill_switch:
        raise HTTPException(status_code=503, detail="Kill switch enabled")
    print(
        json.dumps(
            {
                "level": "INFO",
                "service": "algo",
                "message": "Starting strategy",
                "context": {"user_id": payload.user_id, "strategy": payload.strategy_id or "orb"},
            }
        )
    )
    config = payload.risk_config or {}
    config["user_id"] = payload.user_id
    if payload.strategy_id:
        config["strategy"] = payload.strategy_id
    creds = load_broker_credentials(payload.user_id)
    if not creds:
        return {"success": False, "message": "Broker credentials not configured."}
    config.update(
        {
            "api_key": creds["api_key"],
            "client_code": creds["client_code"],
            "password": creds["password"],
            "totp": creds["totp"],
        }
    )
    result = engine.start_bot(config)
    return {"success": True, "result": result}


@app.post("/stop_strategy")
async def stop_strategy(payload: StopStrategyRequest):
    result = engine.stop_bot(payload.user_id)
    return {"success": True, "result": result}


@app.get("/status")
async def status_endpoint(user_id: str):
    running = engine.get_status(user_id)
    return {"running": bool(running)}


@app.get("/config")
async def config_endpoint(user_id: str):
    return engine.get_active_config(user_id)


@app.get("/trades")
async def trades_endpoint(user_id: str):
    trades = engine.get_live_trades(user_id)
    return {"trades": trades}


@app.get("/pnl")
async def pnl_endpoint(user_id: str):
    pnl = engine.get_live_pnl(user_id)
    return {"pnl": pnl}


@app.get("/logs")
async def logs_endpoint(user_id: str):
    logs = engine.get_logs(user_id)
    return {"logs": logs}


@app.get("/symbols")
async def symbols_endpoint():
    return symbols_service.get_all_symbols(engine.ALL_TOKENS)


@app.get("/search_scrip")
async def search_scrip_endpoint(q: str):
    return symbols_service.search_scrip(q)


@app.post("/add_token")
async def add_token_endpoint(payload: Dict[str, Any]):
    symbol = payload.get("symbol")
    token = payload.get("token")
    exchange = payload.get("exchange", "NSE")
    if not symbol or not token:
        raise HTTPException(status_code=400, detail="Missing symbol or token")
    result = symbols_service.add_custom_token(engine.ALL_TOKENS, symbol, token, exchange)
    if result == "Added":
        return {"status": "success", "message": f"Added {symbol} to token list"}
    if result == "Already Exists":
        return {"status": "success", "message": f"{symbol} is available", "already_existed": True}
    return {"status": "error", "message": result}


@app.post("/test_order")
async def test_order_endpoint(payload: TestOrderRequest):
    result = engine.execute_test_order(
        payload.user_id, payload.symbol, payload.quantity, payload.sl, payload.tp, payload.mode
    )
    return result


@app.post("/exit_trade")
async def exit_trade_endpoint(payload: TradeActionRequest):
    msg = engine.force_exit_trade(payload.user_id, payload.trade_id)
    return {"status": "success", "message": msg}


@app.post("/delete_active_trade")
async def delete_trade_endpoint(payload: TradeActionRequest):
    msg = engine.delete_active_trade(payload.user_id, payload.trade_id)
    return {"status": "success", "message": msg}


@app.post("/update_trade")
async def update_trade_endpoint(payload: UpdateTradeRequest):
    msg = engine.update_trade_params(payload.user_id, payload.trade_id, payload.sl, payload.tp)
    return {"status": "success", "message": msg}


@app.post("/backtest")
async def backtest_endpoint(payload: Dict[str, Any]):
    user_id = payload.get("user_id")
    creds = load_backtest_credentials(user_id) if user_id else None
    if not creds:
        return {"status": "error", "message": "Broker credentials not configured."}
    payload.update(
        {
            "api_key": creds["api_key"],
            "client_code": creds["client_code"],
            "password": creds["password"],
            "totp": creds["totp"],
        }
    )
    result = engine.run_backtest(payload)
    return result


@app.get("/market_data")
async def market_data_endpoint():
    return get_market_data()
