"""
MerQPrime Custom Stock Scanner Engine
Computes ATR, EMA, SMA indicators using pandas/numpy and applies
VCP (Volatility Contraction Pattern) and IPO Base filter conditions.
"""

import pandas as pd
import numpy as np
from SmartApi import SmartConnect
import pyotp
import time
import json
import os
from datetime import datetime, timedelta
from logzero import logger

# ── Cache for scan results (in-memory, 30 min TTL) ──
_scan_cache = {}
CACHE_TTL_SECONDS = 1800  # 30 minutes

# ── Scanner Definitions ──
SCANNERS = {
    "vcp": {
        "id": "vcp",
        "name": "VCP Scanner",
        "description": "Volatility Contraction Pattern — finds stocks where volatility is shrinking near 52-week highs with bullish EMA alignment. Ideal for swing trading breakouts.",
        "conditions": [
            "ATR(14) today < ATR(14) 10 days ago (volatility contracting)",
            "ATR(14) / Close < 0.08 (tight price range)",
            "Close > 75% of 52-week High (near yearly high)",
            "EMA(50) > EMA(150) (short > medium trend)",
            "EMA(150) > EMA(200) (medium > long trend)",
            "Close > EMA(50) (price above short-term trend)",
            "Close > ₹10 (no penny stocks)",
            "Close × Volume > ₹10,00,000 (liquidity filter)"
        ],
        "condition_count": 8,
        "segment": "Cash (NSE Equity)"
    },
    "ipo_base": {
        "id": "ipo_base",
        "name": "IPO Base Scanner",
        "description": "Finds recently listed stocks (IPOs) with less than 400 trading days that are forming a price base with good volume. Great for catching early movers.",
        "conditions": [
            "Stock listed < 400 trading days (recently listed / IPO)",
            "Close > ₹50 (no penny stocks)",
            "Volume > 1,00,000 (minimum liquidity)"
        ],
        "condition_count": 3,
        "segment": "Cash (NSE Equity)"
    }
}

# ── Progress tracking ──
_scan_progress = {}


def get_scan_progress(scan_id):
    """Get current progress of a running scan"""
    return _scan_progress.get(scan_id, {"status": "idle", "current": 0, "total": 0, "symbol": ""})


# ═══════════════════════════════════════════
# INDICATOR FUNCTIONS
# ═══════════════════════════════════════════

def calculate_atr(df, period=14):
    """Calculate Average True Range"""
    high = df['high']
    low = df['low']
    close = df['close']
    
    tr1 = high - low
    tr2 = abs(high - close.shift(1))
    tr3 = abs(low - close.shift(1))
    
    true_range = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
    atr = true_range.rolling(window=period).mean()
    return atr


def calculate_ema(series, span):
    """Calculate Exponential Moving Average"""
    return series.ewm(span=span, adjust=False).mean()


def calculate_sma(series, period):
    """Calculate Simple Moving Average"""
    return series.rolling(window=period).mean()


# ═══════════════════════════════════════════
# SCANNER FILTER FUNCTIONS
# ═══════════════════════════════════════════

def scan_vcp(df):
    """
    VCP (Volatility Contraction Pattern) Scanner
    Returns: (match: bool, indicators: dict)
    """
    try:
        if df is None or len(df) < 210:  # Need at least 210 days for EMA(200)
            return False, {}
        
        close = df['close'].iloc[-1]
        volume = df['volume'].iloc[-1]
        prev_close = df['close'].iloc[-2] if len(df) > 1 else close
        change_pct = ((close - prev_close) / prev_close * 100) if prev_close > 0 else 0
        
        # Calculate indicators
        atr = calculate_atr(df, 14)
        atr_today = atr.iloc[-1]
        atr_10d_ago = atr.iloc[-11] if len(atr) > 11 else atr_today + 1
        
        ema50 = calculate_ema(df['close'], 50).iloc[-1]
        ema150 = calculate_ema(df['close'], 150).iloc[-1]
        ema200 = calculate_ema(df['close'], 200).iloc[-1]
        
        # 52-week high (252 trading days)
        lookback = min(252, len(df))
        high_52w = df['high'].tail(lookback).max()
        
        indicators = {
            "close": round(close, 2),
            "volume": int(volume),
            "change_pct": round(change_pct, 2),
            "atr_14": round(atr_today, 2),
            "atr_10d_ago": round(atr_10d_ago, 2),
            "atr_ratio": round(atr_today / close, 4) if close > 0 else 0,
            "ema50": round(ema50, 2),
            "ema150": round(ema150, 2),
            "ema200": round(ema200, 2),
            "high_52w": round(high_52w, 2),
            "pct_from_52w": round((close / high_52w * 100), 1) if high_52w > 0 else 0,
            "turnover": round(close * volume, 0)
        }
        
        # ── Apply 8 VCP Conditions ──
        
        # 1. ATR contracting: today's ATR < 10 days ago ATR
        if atr_today >= atr_10d_ago:
            return False, indicators
        
        # 2. Tight range: ATR / Close < 0.08
        if close <= 0 or (atr_today / close) >= 0.08:
            return False, indicators
        
        # 3. Near 52-week high: Close > 75% of 52W high
        if close <= high_52w * 0.75:
            return False, indicators
        
        # 4. EMA stack: EMA(50) > EMA(150)
        if ema50 <= ema150:
            return False, indicators
        
        # 5. EMA stack: EMA(150) > EMA(200)
        if ema150 <= ema200:
            return False, indicators
        
        # 6. Price above short-term: Close > EMA(50)
        if close <= ema50:
            return False, indicators
        
        # 7. Min price: Close > 10
        if close <= 10:
            return False, indicators
        
        # 8. Liquidity: Close × Volume > 10,00,000
        if (close * volume) <= 1000000:
            return False, indicators
        
        return True, indicators  # ✅ All 8 conditions passed
        
    except Exception as e:
        logger.error(f"VCP scan error: {e}")
        return False, {}


def scan_ipo_base(df, total_days):
    """
    IPO Base Scanner — Recently listed stocks forming a base
    Returns: (match: bool, indicators: dict)
    """
    try:
        if df is None or len(df) < 5:
            return False, {}
        
        close = df['close'].iloc[-1]
        volume = df['volume'].iloc[-1]
        prev_close = df['close'].iloc[-2] if len(df) > 1 else close
        change_pct = ((close - prev_close) / prev_close * 100) if prev_close > 0 else 0
        
        indicators = {
            "close": round(close, 2),
            "volume": int(volume),
            "change_pct": round(change_pct, 2),
            "listing_days": total_days,
            "turnover": round(close * volume, 0)
        }
        
        # 1. Stock listed < 400 trading days
        if total_days >= 400:
            return False, indicators
        
        # 2. Close > 50
        if close <= 50:
            return False, indicators
        
        # 3. Volume > 100,000
        if volume <= 100000:
            return False, indicators
        
        return True, indicators  # ✅ All 3 conditions passed
        
    except Exception as e:
        logger.error(f"IPO Base scan error: {e}")
        return False, {}


# ═══════════════════════════════════════════
# DATA FETCHING
# ═══════════════════════════════════════════

def login_smart_api(credentials):
    """Login to Angel One SmartAPI and return the session"""
    try:
        api_key = credentials.get("api_key") or credentials.get("apiKey")
        client_code = credentials.get("client_code") or credentials.get("clientCode")
        password = credentials.get("password")
        totp_key = credentials.get("totp")
        
        if not all([api_key, client_code, password, totp_key]):
            raise ValueError("Missing broker credentials")
        
        smart_api = SmartConnect(api_key=api_key)
        totp = pyotp.TOTP(totp_key).now()
        session_data = smart_api.generateSession(client_code, password, totp)
        
        if not session_data.get('status'):
            raise ValueError(f"Login failed: {session_data.get('message', 'Unknown error')}")
        
        logger.info("SmartAPI login successful for scanner")
        return smart_api
        
    except Exception as e:
        logger.error(f"SmartAPI login failed: {e}")
        raise


def fetch_daily_data(smart_api, symbol_token, days=500):
    """Fetch daily OHLCV data for a stock"""
    try:
        to_date = datetime.now().strftime("%Y-%m-%d 15:30")
        from_date = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d 09:15")
        
        params = {
            "exchange": "NSE",
            "symboltoken": str(symbol_token),
            "interval": "ONE_DAY",
            "fromdate": from_date,
            "todate": to_date
        }
        
        response = smart_api.getCandleData(params)
        
        if response and response.get('status') and response.get('data'):
            raw = response['data']
            df = pd.DataFrame(raw, columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])
            df['timestamp'] = pd.to_datetime(df['timestamp'])
            for col in ['open', 'high', 'low', 'close', 'volume']:
                df[col] = df[col].astype(float)
            return df
        
        return None
        
    except Exception as e:
        logger.error(f"Data fetch error for token {symbol_token}: {e}")
        return None


# ═══════════════════════════════════════════
# STOCK UNIVERSE LOADING
# ═══════════════════════════════════════════

def load_stock_universe():
    """Load stock universe from JSON file"""
    universe_path = os.path.join(os.path.dirname(__file__), 'stock_universe.json')
    
    if os.path.exists(universe_path):
        with open(universe_path, 'r') as f:
            return json.load(f)
    
    # Fallback: Nifty 50 tokens (minimal set)
    logger.warning("stock_universe.json not found, using Nifty 50 fallback")
    return [
        {"symbol": "RELIANCE-EQ", "token": "2885", "name": "Reliance Industries"},
        {"symbol": "TCS-EQ", "token": "11536", "name": "Tata Consultancy Services"},
        {"symbol": "HDFCBANK-EQ", "token": "1333", "name": "HDFC Bank"},
        {"symbol": "INFY-EQ", "token": "1594", "name": "Infosys"},
        {"symbol": "ICICIBANK-EQ", "token": "4963", "name": "ICICI Bank"},
        {"symbol": "HINDUNILVR-EQ", "token": "1394", "name": "Hindustan Unilever"},
        {"symbol": "ITC-EQ", "token": "1660", "name": "ITC"},
        {"symbol": "SBIN-EQ", "token": "3045", "name": "State Bank of India"},
        {"symbol": "BHARTIARTL-EQ", "token": "10604", "name": "Bharti Airtel"},
        {"symbol": "KOTAKBANK-EQ", "token": "1922", "name": "Kotak Mahindra Bank"},
        {"symbol": "LT-EQ", "token": "11483", "name": "Larsen & Toubro"},
        {"symbol": "AXISBANK-EQ", "token": "5900", "name": "Axis Bank"},
        {"symbol": "BAJFINANCE-EQ", "token": "317", "name": "Bajaj Finance"},
        {"symbol": "MARUTI-EQ", "token": "10999", "name": "Maruti Suzuki"},
        {"symbol": "SUNPHARMA-EQ", "token": "3351", "name": "Sun Pharma"},
        {"symbol": "TITAN-EQ", "token": "3506", "name": "Titan Company"},
        {"symbol": "ASIANPAINT-EQ", "token": "236", "name": "Asian Paints"},
        {"symbol": "WIPRO-EQ", "token": "3787", "name": "Wipro"},
        {"symbol": "ULTRACEMCO-EQ", "token": "11532", "name": "UltraTech Cement"},
        {"symbol": "TATAMOTORS-EQ", "token": "3456", "name": "Tata Motors"},
        {"symbol": "NTPC-EQ", "token": "11630", "name": "NTPC"},
        {"symbol": "POWERGRID-EQ", "token": "14977", "name": "Power Grid"},
        {"symbol": "TATASTEEL-EQ", "token": "3499", "name": "Tata Steel"},
        {"symbol": "HCLTECH-EQ", "token": "7229", "name": "HCL Technologies"},
        {"symbol": "ONGC-EQ", "token": "2475", "name": "ONGC"},
        {"symbol": "COALINDIA-EQ", "token": "20374", "name": "Coal India"},
        {"symbol": "ADANIENT-EQ", "token": "25", "name": "Adani Enterprises"},
        {"symbol": "ADANIPORTS-EQ", "token": "15083", "name": "Adani Ports"},
        {"symbol": "JSWSTEEL-EQ", "token": "11723", "name": "JSW Steel"},
        {"symbol": "TECHM-EQ", "token": "13538", "name": "Tech Mahindra"},
        {"symbol": "M&M-EQ", "token": "2031", "name": "Mahindra & Mahindra"},
        {"symbol": "INDUSINDBK-EQ", "token": "5258", "name": "IndusInd Bank"},
        {"symbol": "BAJAJFINSV-EQ", "token": "16675", "name": "Bajaj Finserv"},
        {"symbol": "EICHERMOT-EQ", "token": "910", "name": "Eicher Motors"},
        {"symbol": "DRREDDY-EQ", "token": "881", "name": "Dr. Reddys"},
        {"symbol": "DIVISLAB-EQ", "token": "10940", "name": "Divi's Labs"},
        {"symbol": "BPCL-EQ", "token": "526", "name": "BPCL"},
        {"symbol": "GRASIM-EQ", "token": "1232", "name": "Grasim Industries"},
        {"symbol": "CIPLA-EQ", "token": "694", "name": "Cipla"},
        {"symbol": "APOLLOHOSP-EQ", "token": "157", "name": "Apollo Hospitals"},
        {"symbol": "BRITANNIA-EQ", "token": "547", "name": "Britannia"},
        {"symbol": "HEROMOTOCO-EQ", "token": "1348", "name": "Hero MotoCorp"},
        {"symbol": "NESTLEIND-EQ", "token": "17963", "name": "Nestle India"},
        {"symbol": "TATACONSUM-EQ", "token": "3432", "name": "Tata Consumer"},
        {"symbol": "HINDALCO-EQ", "token": "1363", "name": "Hindalco"},
        {"symbol": "SBILIFE-EQ", "token": "21808", "name": "SBI Life Insurance"},
        {"symbol": "BAJAJ-AUTO-EQ", "token": "16669", "name": "Bajaj Auto"},
        {"symbol": "SHRIRAMFIN-EQ", "token": "4306", "name": "Shriram Finance"},
        {"symbol": "HDFCLIFE-EQ", "token": "467", "name": "HDFC Life"},
        {"symbol": "TRENT-EQ", "token": "1964", "name": "Trent"},
    ]


# ═══════════════════════════════════════════
# MAIN SCANNER RUNNER
# ═══════════════════════════════════════════

def run_scanner(scanner_id, broker_credentials):
    """
    Main scanner runner
    1. Login to SmartAPI
    2. Load stock universe
    3. Fetch daily data for each stock
    4. Apply scanner filter
    5. Return matching stocks
    """
    global _scan_cache, _scan_progress
    
    # Check cache first
    cache_key = scanner_id
    if cache_key in _scan_cache:
        cached = _scan_cache[cache_key]
        if time.time() - cached['timestamp'] < CACHE_TTL_SECONDS:
            logger.info(f"Returning cached results for {scanner_id}")
            return cached['data']
    
    # Login
    smart_api = login_smart_api(broker_credentials)
    
    # Load universe
    universe = load_stock_universe()
    total_stocks = len(universe)
    
    scan_id = f"{scanner_id}_{int(time.time())}"
    _scan_progress[scanner_id] = {
        "status": "running",
        "current": 0,
        "total": total_stocks,
        "symbol": "",
        "matches": 0
    }
    
    results = []
    errors = 0
    
    logger.info(f"Starting {scanner_id} scan on {total_stocks} stocks...")
    
    for i, stock in enumerate(universe):
        try:
            symbol = stock.get('symbol', '')
            token = stock.get('token', '')
            name = stock.get('name', symbol.replace('-EQ', ''))
            
            # Update progress
            _scan_progress[scanner_id] = {
                "status": "running",
                "current": i + 1,
                "total": total_stocks,
                "symbol": symbol,
                "matches": len(results)
            }
            
            # Fetch daily data
            days_to_fetch = 600 if scanner_id == "ipo_base" else 500
            df = fetch_daily_data(smart_api, token, days=days_to_fetch)
            
            if df is None or df.empty:
                errors += 1
                continue
            
            # Apply scanner filter
            match = False
            indicators = {}
            
            if scanner_id == "vcp":
                match, indicators = scan_vcp(df)
            elif scanner_id == "ipo_base":
                match, indicators = scan_ipo_base(df, len(df))
            
            if match:
                results.append({
                    "sr": len(results) + 1,
                    "symbol": symbol.replace('-EQ', ''),
                    "name": name,
                    **indicators
                })
            
            # Rate limit: SmartAPI allows ~10 requests/sec
            time.sleep(0.35)
            
        except Exception as e:
            errors += 1
            logger.error(f"Error scanning {stock.get('symbol', '?')}: {e}")
            time.sleep(0.5)
    
    # Sort results
    if scanner_id == "vcp":
        results.sort(key=lambda x: x.get('pct_from_52w', 0), reverse=True)
    elif scanner_id == "ipo_base":
        results.sort(key=lambda x: x.get('turnover', 0), reverse=True)
    
    # Re-number after sort
    for i, r in enumerate(results):
        r['sr'] = i + 1
    
    scan_result = {
        "status": "success",
        "scanner": SCANNERS[scanner_id]['name'],
        "scanner_id": scanner_id,
        "count": len(results),
        "total_scanned": total_stocks,
        "errors": errors,
        "scan_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "stocks": results
    }
    
    # Cache results
    _scan_cache[cache_key] = {
        "timestamp": time.time(),
        "data": scan_result
    }
    
    # Update progress to complete
    _scan_progress[scanner_id] = {
        "status": "complete",
        "current": total_stocks,
        "total": total_stocks,
        "symbol": "Done",
        "matches": len(results)
    }
    
    logger.info(f"Scanner {scanner_id} complete: {len(results)} matches from {total_stocks} stocks ({errors} errors)")
    
    return scan_result
