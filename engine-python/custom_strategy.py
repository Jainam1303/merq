
from SmartApi import SmartConnect
import pyotp
from logzero import logger
import time
import pandas as pd
import numpy as np

# ===============================
# CONFIGURATION
# ===============================
INITIAL_CAPITAL = 100000
RISK_PER_TRADE = 1.0 
SL_BUFFER_PCT = 0.0002
TRAIL_STEP_PCT = 0.001

RSI_LENGTH = 14
RSI_OVERBOUGHT = 70
RSI_OVERSOLD = 30

# Strategy Constants
OR_START = "09:15"
OR_END = "09:30"
TARGET_PCT = 0.006 # 0.6%

def login():
    # Deprecated: Logic moved to User Profile in Database
    return None

def log_debug(msg):
    try:
        with open("strategy_debug.log", "a") as f:
            f.write(f"{time.ctime()} - {msg}\n")
    except: pass   

def check_signal(df):
    """
    Analyzes the latest live data to generate signals.
    Returns: 
       signal: 'BUY' | 'SELL' | None
       data: { 'sl': float, 'target': float, 'entry': float } or None
    """
    try:
        # 1. Prepare Data
        if df.empty:
            log_debug("DataFrame is empty")
            return None, None
            
        if len(df) < 20: 
            log_debug(f"Not enough data: {len(df)} rows")
            return None, None
            
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        df['date'] = df['timestamp'].dt.date
        df = df.set_index('timestamp')
        
        # 2. Indicators
        df['avg_volume'] = df['volume'].rolling(20).mean()
        
        # VWAP (Simplified: Intraday VWAP requires filtering by today)
        latest = df.iloc[-1]
        today_date = latest.name.date()
        today_df = df[df.index.date == today_date].copy()
        
        if len(today_df) < 2: 
            # log_debug(f"Not enough intraday data: {len(today_df)}")
            return None, None
        
        today_df["cum_vol"] = today_df["volume"].cumsum()
        today_df["cum_vol_price"] = (today_df["close"] * today_df["volume"]).cumsum()
        today_df["vwap"] = today_df["cum_vol_price"] / today_df["cum_vol"]
        
        # Opening Range
        opening_range = today_df.between_time(OR_START, OR_END)
        # If we are strictly checking ORB, we need OR data.
        # If missing, we can't trade.
        if opening_range.empty: 
            log_debug(f"Opening Range empty for {today_date} (Start: {OR_START}, End: {OR_END})")
            return None, None 
        
        OR_high = opening_range["high"].max()
        OR_low = opening_range["low"].min()
        OR_mid = (OR_high + OR_low) / 2
        
        current_time = latest.name.time()
        or_end_time = pd.to_datetime(OR_END).time()
        
        # Trading Constraints
        if current_time <= or_end_time:
            # log_debug(f"Time {current_time} is during Opening Range")
            return None, None
            
        # CRITICAL FIX: Use iloc[-2] (Previous Completed Candle)
        # Using iloc[-1] (Current Forming Candle) causes Volume Mismatch because 
        # forming candle has partial volume vs Full Avg Volume.
        if len(today_df) < 2: return None, None
        row = today_df.iloc[-2]
        
        # Log values for debugging
        vwap = row["vwap"]
        close = row["close"]
        volume = row["volume"]
        avg_vol = row.get('avg_volume', 0)
        
        log_debug(f"Check {row.name}: Close={close}, OR_H={OR_high}, OR_L={OR_low}, VWAP={vwap:.2f}, Vol={volume}, Avg={avg_vol:.2f}")

        # 3. Signals
        
        # BUY Logic
        if (row["close"] > OR_high and 
            row["close"] > row["vwap"] and 
            row["volume"] > 1.5 * row.get('avg_volume', 0)):
            
            log_debug("BUY SIGNAL FOUND")
            return 'BUY', {
                'entry': row["close"],
                'sl': round(OR_mid * 20) / 20.0,
                'target': round(row["close"] * (1 + TARGET_PCT) * 20) / 20.0
            }
            
        # SELL Logic
        elif (row["close"] < OR_low and 
              row["close"] < row["vwap"] and 
              row["volume"] > 1.5 * row.get('avg_volume', 0)):
            
            log_debug("SELL SIGNAL FOUND")
            return 'SELL', {
                'entry': row["close"],
                'sl': OR_mid,
                'sl': round(OR_mid * 20) / 20.0,
                'target': round(row["close"] * (1 - TARGET_PCT) * 20) / 20.0
            }
            
        return None, None
        
    except Exception as e:
        logger.error(f"Signal Check Error: {e}")
        log_debug(f"Exception: {e}")
        return None, None

def place_buy_order(smartApi, symbol_token, trading_symbol, quantity, price):
    try:
        orderparams = {
            "variety": "NORMAL",
            "tradingsymbol": trading_symbol,
            "symboltoken": symbol_token,
            "transactiontype": "BUY",
            "exchange": "NSE",
            "ordertype": "LIMIT",
            "producttype": "INTRADAY",
            "duration": "DAY",
            "price": price,
            "squareoff": "0",
            "stoploss": "0",
            "quantity": quantity
        }
        orderid = smartApi.placeOrder(orderparams)
        logger.info(f"PlaceOrder : {orderid}")
        return orderid
    except Exception as e:
        logger.exception(f"Order placement failed: {e}")
        return None

def place_sell_order(smartApi, symbol_token, trading_symbol, quantity, price):
    try:
        orderparams = {
            "variety": "NORMAL",
            "tradingsymbol": trading_symbol,
            "symboltoken": symbol_token,
            "transactiontype": "SELL",
            "exchange": "NSE",
            "ordertype": "LIMIT",
            "producttype": "INTRADAY",
            "duration": "DAY",
            "price": price,
            "squareoff": "0",
            "stoploss": "0",
            "quantity": quantity
        }
        orderid = smartApi.placeOrder(orderparams)
        logger.info(f"Place Sell Order : {orderid}")
        return orderid
    except Exception as e:
        logger.exception(f"Sell Order placement failed: {e}")
        return None

def fetch_historical_data(smartApi, exchange, symbol_token, interval, from_date, to_date):
    try:
        # MAP INTERVAL INT TO STRING (Angel One API Requirement)
        interval_map = {
            "1": "ONE_MINUTE", "3": "THREE_MINUTE", "5": "FIVE_MINUTE", 
            "10": "TEN_MINUTE", "15": "FIFTEEN_MINUTE", "30": "THIRTY_MINUTE", 
            "60": "ONE_HOUR", "D": "ONE_DAY"
        }
        if str(interval) in interval_map:
            interval = interval_map[str(interval)]

        # Convert DD-MM-YYYY to YYYY-MM-DD for Angel One API if needed
        def convert_date(d_str):
            try:
                if not d_str: return d_str
                # Ensure acceptable format by replacing T
                d_str = d_str.replace("T", " ")
                
                # If matches DD-MM-YYYY HH:MM
                if len(d_str) > 5 and d_str[2] == '-' and d_str[5] == '-': 
                    parts = d_str.split(' ')
                    date_parts = parts[0].split('-')
                    # day=0, month=1, year=2 -> year-month-day
                    time_part = parts[1] if len(parts) > 1 else ""
                    return f"{date_parts[2]}-{date_parts[1]}-{date_parts[0]} {time_part}".strip()
                return d_str
            except:
                return d_str

        historicParam = {
            "exchange": exchange,
            "symboltoken": symbol_token,
            "interval": interval,
            "fromdate": convert_date(from_date),
            "todate": convert_date(to_date)
        }
        response = smartApi.getCandleData(historicParam)
        return response
    except Exception as e:
        logger.exception(f"Historic Api failed: {e}")
        return None

def backtest(smartApi, selected_symbols=[], interval="FIVE_MINUTE", from_date="2022-01-01 09:15", to_date="2022-03-31 15:30", stock_list=[]):
    logger.info("Starting Backtest (Hybrid Mode)...")
    
    DEFAULT_STOCKS = [
        {"symbol": "ADANIPOWER-EQ", "token": "17388"},
        {"symbol": "IDEA-EQ", "token": "14366"},
    ]
    
    target_stocks = []
    if stock_list and selected_symbols:
        if "ALL" in selected_symbols:
             target_stocks = stock_list[:50] 
        else:
             target_stocks = [s for s in stock_list if s['symbol'] in selected_symbols]
    elif not stock_list:
        if not selected_symbols or "ALL" in selected_symbols:
             target_stocks = DEFAULT_STOCKS
        else:
             target_stocks = [s for s in DEFAULT_STOCKS if s['symbol'] in selected_symbols]

    # Split NSE vs NFO
    nse_stocks = [s for s in target_stocks if s.get('exchange', 'NSE') == 'NSE']
    nfo_stocks = [s for s in target_stocks if s.get('exchange', 'NSE') != 'NSE']
    
    summary_results = []

    # 1. Run NFO Strategy
    # 1. Run NFO Strategy
    if nfo_stocks:
        try:
            import nfo_strategy
            nfo_res = nfo_strategy.backtest(smartApi, selected_symbols, interval, from_date, to_date, nfo_stocks)
            summary_results.extend(nfo_res)
        except Exception as e:
            import traceback
            traceback.print_exc()
            logger.error(f"NFO Backtest Error: {e}")

    # 2. Run NSE Strategy (Legacy Logic)
    exchange = "NSE"
    for stock in nse_stocks:
        trading_symbol = stock['symbol']
        symbol_token = stock['token']
        # Exchange is NSE
        
        data_response = fetch_historical_data(smartApi, "NSE", symbol_token, interval, from_date, to_date)
        
        if data_response and data_response.get('status') and data_response.get('data'):
            raw_data = data_response['data']
            df = pd.DataFrame(raw_data, columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])
            df['timestamp'] = pd.to_datetime(df['timestamp'])
            for c in ['open','high','low','close','volume']: df[c] = df[c].astype(float) # Safe float conversion

            df['avg_volume'] = df['volume'].rolling(20).mean()
            df['date'] = df['timestamp'].dt.date
            trades = []

            for date, day_df in df.groupby('date'):
                day_df = day_df.set_index('timestamp')
                day_df = day_df.between_time("09:15", "15:15")
                if day_df.empty: continue

                day_df["cum_vol"] = day_df["volume"].cumsum()
                day_df["cum_vol_price"] = (day_df["close"] * day_df["volume"]).cumsum()
                day_df["vwap"] = day_df["cum_vol_price"] / day_df["cum_vol"]

                opening_range = day_df.between_time(OR_START, OR_END)
                if opening_range.empty: continue
                
                OR_high = opening_range["high"].max()
                OR_low = opening_range["low"].min()
                OR_mid = (OR_high + OR_low) / 2
                
                trade_count = 0
                position = None
                TRADE_LIMIT_DAILY = 1
                TARGET_PCT = 0.006

                for idx, row in day_df.iterrows():
                    if idx.time() <= pd.to_datetime(OR_END).time(): continue
                    if trade_count >= TRADE_LIMIT_DAILY: break

                    # EXIT
                    if position:
                        if position["type"] == "BUY":
                            if row["low"] <= position["sl"]:
                                pnl = (position["sl"] - position["entry"]) * position["qty"]
                                trades.append({"type": "BUY", "result": "SL", "pnl": pnl})
                                position = None; trade_count += 1
                            elif row["high"] >= position["target"]:
                                pnl = (position["target"] - position["entry"]) * position["qty"]
                                trades.append({"type": "BUY", "result": "TARGET", "pnl": pnl})
                                position = None; trade_count += 1
                        elif position["type"] == "SELL":
                            if row["high"] >= position["sl"]:
                                pnl = (position["entry"] - position["sl"]) * position["qty"]
                                trades.append({"type": "SELL", "result": "SL", "pnl": pnl})
                                position = None; trade_count += 1
                            elif row["low"] <= position["target"]:
                                pnl = (position["entry"] - position["target"]) * position["qty"]
                                trades.append({"type": "SELL", "result": "TARGET", "pnl": pnl})
                                position = None; trade_count += 1

                    # ENTRY - NSE LOGIC (0.6% TGT)
                    if position is None and trade_count < TRADE_LIMIT_DAILY:
                        qty = int(INITIAL_CAPITAL / row["close"])
                        if (row["close"] > OR_high and row["close"] > row["vwap"] and row["volume"] > 1.5 * row.get('avg_volume', 0)):
                            position = {"type": "BUY", "entry": row["close"], "sl": OR_mid, "target": row["close"]*(1+TARGET_PCT), "qty": qty}
                        elif (row["close"] < OR_low and row["close"] < row["vwap"] and row["volume"] > 1.5 * row.get('avg_volume', 0)):
                             position = {"type": "SELL", "entry": row["close"], "sl": OR_mid, "target": row["close"]*(1-TARGET_PCT), "qty": qty}

            total_pnl = sum(t['pnl'] for t in trades)
            final_capital = INITIAL_CAPITAL + total_pnl
            total_trades = len(trades)
            win_count = len([t for t in trades if t['result'] == 'TARGET'])
            profitability_pct = (win_count / total_trades * 100) if total_trades > 0 else 0
            
            result_data = {
                "Symbol": trading_symbol,
                "Total Trades": total_trades,
                "Win Rate %": f"{profitability_pct:.2f}%",
                "Total P&L": f"{total_pnl:.2f}",
                "Final Capital": f"{final_capital:.2f}"
            }
            summary_results.append(result_data)
            
    return summary_results
