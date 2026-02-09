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

import session_manager

@app.post("/engine/start")
def start_engine(request: StrategyStartRequest):
    try:
        session = session_manager.create_session(
            request.user_id, 
            request.strategy_config, 
            request.broker_credentials
        )
        session.start()
        return {"status": "started", "session_id": request.user_id, "mode": session.mode}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/engine/stop")
def stop_engine(data: dict):
    user_id = data.get("user_id")
    if not user_id:
        # Try to find from body if key is just 'user_id' string? No, standard is dict
        pass
        
    session = session_manager.get_session(user_id)
    if session:
        session.stop()
        return {"status": "stopped"}
    return {"status": "not_found"}

@app.post("/backtest")
def run_backtest(data: dict):
    import importlib
    import backtest_runner
    importlib.reload(backtest_runner)
    results = backtest_runner.login_and_run_backtest(data)
    return {
        "status": "success",
        "results": results
    }

@app.get("/engine/status/{user_id}")
def get_status(user_id: str):
    session = session_manager.get_session(user_id)
    if session:
        return session.get_state()
    
    # Return empty/stopped state if no session exists
    return {
        "active": False, 
        "pnl": 0.0, 
        "positions": [], 
        "trades_history": [],
        "logs": []
    }

@app.post("/engine/update_position")
def update_position(data: dict):
    user_id = data.get("user_id")
    position_id = data.get("position_id")
    tp = data.get("tp")
    sl = data.get("sl")
    
    session = session_manager.get_session(user_id)
    if session:
        success = session.update_position(position_id, tp, sl)
        return {"status": "updated" if success else "not_found"}
    return {"status": "no_session"}

@app.post("/engine/exit_position")
def exit_position(data: dict):
    user_id = data.get("user_id")
    position_id = data.get("position_id")
    
    session = session_manager.get_session(user_id)
    if session:
        success = session.exit_position(position_id)
        return {"status": "exited" if success else "not_found"}
    return {"status": "no_session"}

@app.post("/engine/dismiss_position")
def dismiss_position(data: dict):
    """
    Dismiss a stale position WITHOUT placing exit order.
    Use when user manually exited from broker app.
    """
    user_id = data.get("user_id")
    position_id = data.get("position_id")
    
    session = session_manager.get_session(user_id)
    if session:
        success = session.dismiss_position(position_id)
        return {"status": "dismissed" if success else "not_found"}
    return {"status": "no_session"}

@app.post("/engine/test_order")
def execute_test_order(data: dict):
    """
    Execute a test order directly via Angel API
    Bypasses all strategy logic for diagnostic purposes
    """
    try:
        from SmartApi import SmartConnect
        import pyotp
        
        # Extract request data
        symbol = data.get("symbol")
        qty = int(data.get("qty", 1))
        order_type = data.get("orderType", "BUY")
        credentials = data.get("credentials", {})
        
        # Initialize Angel API
        api_key = credentials.get("apiKey")
        client_code = credentials.get("clientCode")
        password = credentials.get("password")
        totp_key = credentials.get("totp")
        
        if not all([api_key, client_code, password, totp_key]):
            raise HTTPException(status_code=400, detail="Missing Angel API credentials")
        
        smart_api = SmartConnect(api_key=api_key)
        
        # Generate TOTP and login
        totp = pyotp.TOTP(totp_key).now()
        session_data = smart_api.generateSession(client_code, password, totp)
        
        if not session_data or not session_data.get('status'):
            return {
                "success": False,
                "message": f"Login failed: {session_data.get('message', 'Unknown error')}"
            }
        
        # Get symbol token
        clean_symbol = symbol.upper().replace("-EQ", "")
        search_result = smart_api.searchScrip("NSE", clean_symbol)
        
        if not search_result or not search_result.get('status') or not search_result.get('data'):
            return {
                "success": False,
                "message": f"Symbol {symbol} not found in NSE"
            }
        
        # Filter for exact match or EQ series
        data_list = search_result['data']
        selected_script = None
        
        # 1. Try finding exact trading symbol match (e.g. "IGL-EQ")
        target_symbol = f"{clean_symbol}-EQ"
        for scrip in data_list:
            if scrip['tradingsymbol'] == target_symbol:
                selected_script = scrip
                break
                
        # 2. If not found, try just exact name match on symbol name (less reliable)
        if not selected_script:
            for scrip in data_list:
                if scrip['symboltoken'] and scrip['tradingsymbol'].endswith('-EQ'):
                    selected_script = scrip
                    break
                    
        # 3. Fallback to first result
        if not selected_script:
            selected_script = data_list[0]
            
        symbol_token = selected_script['symboltoken']
        trading_symbol = selected_script['tradingsymbol']
        
        # Place market order - MIS/Intraday
        order_params = {
            "variety": "NORMAL",
            "tradingsymbol": trading_symbol,
            "symboltoken": str(symbol_token),
            "transactiontype": order_type,
            "exchange": "NSE",
            "ordertype": "MARKET",
            "producttype": "INTRADAY", # INTRADAY maps to MIS in Angel One
            "duration": "DAY",
            "price": "0",
            "squareoff": "0",
            "stoploss": "0",
            "quantity": str(qty)
        }
        
        response = smart_api.placeOrder(order_params)
        
        if not response:
            return {
                "success": False,
                "message": "Angel API returned empty response",
                "orderParams": order_params
            }
        
        # Parse response
        if isinstance(response, dict):
            if response.get('status') == True:
                order_id = response.get('data', {}).get('orderid')
                return {
                    "success": True,
                    "orderId": order_id,
                    "symbol": symbol,
                    "quantity": qty,
                    "type": order_type,
                    "message": f"✅ Order placed successfully. OrderID: {order_id}",
                    "apiResponse": response
                }
            else:
                return {
                    "success": False,
                    "message": response.get('message', 'Order rejected'),
                    "errorCode": response.get('errorcode', 'Unknown'),
                    "apiResponse": response
                }
        else:
            # String response (order ID)
            return {
                "success": True,
                "orderId": str(response),
                "symbol": symbol,
                "quantity": qty,
                "type": order_type,
                "message": f"✅ Order placed successfully. OrderID: {response}"
            }
            
    except Exception as e:
        import traceback
        return {
            "success": False,
            "message": str(e),
            "traceback": traceback.format_exc()
        }


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5002)
