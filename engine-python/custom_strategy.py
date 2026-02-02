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

def check_signal(df):
    """
    Analyzes the latest live data to generate signals.
    Returns: 
       signal: 'BUY' | 'SELL' | None
       data: { 'sl': float, 'target': float, 'entry': float } or None
    """
    try:
        # 1. Prepare Data
        if df.empty or len(df) < 20: 
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
        
        if len(today_df) < 5: return None, None
        
        today_df["cum_vol"] = today_df["volume"].cumsum()
        today_df["cum_vol_price"] = (today_df["close"] * today_df["volume"]).cumsum()
        today_df["vwap"] = today_df["cum_vol_price"] / today_df["cum_vol"]
        
        # Opening Range
        opening_range = today_df.between_time(OR_START, OR_END)
        # If we are strictly checking ORB, we need OR data.
        # If missing, we can't trade.
        if opening_range.empty: return None, None 
        
        OR_high = opening_range["high"].max()
        OR_low = opening_range["low"].min()
        OR_mid = (OR_high + OR_low) / 2
        
        current_time = latest.name.time()
        or_end_time = pd.to_datetime(OR_END).time()
        
        # Trading Constraints
        if current_time <= or_end_time:
            return None, None
            
        row = today_df.iloc[-1]
        
        # 3. Signals
        
        # BUY Logic
        if (row["close"] > OR_high and 
            row["close"] > row["vwap"] and 
            row["volume"] > 1.5 * row.get('avg_volume', 0)):
            
            return 'BUY', {
                'entry': row["close"],
                'sl': OR_mid,
                'target': row["close"] * (1 + TARGET_PCT)
            }
            
        # SELL Logic
        elif (row["close"] < OR_low and 
              row["close"] < row["vwap"] and 
              row["volume"] > 1.5 * row.get('avg_volume', 0)):
              
            return 'SELL', {
                'entry': row["close"],
                'sl': OR_mid,
                'target': row["close"] * (1 - TARGET_PCT)
            }
            
        return None, None
        
    except Exception as e:
        logger.error(f"Signal Check Error: {e}")
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
        historicParam = {
            "exchange": exchange,
            "symboltoken": symbol_token,
            "interval": interval,
            "fromdate": from_date,
            "todate": to_date
        }
        response = smartApi.getCandleData(historicParam)
        return response
    except Exception as e:
        logger.exception(f"Historic Api failed: {e}")
        return None

def backtest(smartApi, selected_symbols=[], interval="FIVE_MINUTE", from_date="2022-01-01 09:15", to_date="2022-03-31 15:30", stock_list=[]):
    logger.info("Starting Backtest...")
    
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

    exchange = "NSE"
    summary_results = []

    for stock in target_stocks:
        trading_symbol = stock['symbol']
        symbol_token = stock['token']
        
        data_response = fetch_historical_data(smartApi, exchange, symbol_token, interval, from_date, to_date)
        
        if data_response and data_response.get('status') and data_response.get('data'):
            raw_data = data_response['data']
            df = pd.DataFrame(raw_data, columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])
            df['timestamp'] = pd.to_datetime(df['timestamp'])
            df['Open'] = df['open'].astype(float)
            df['High'] = df['high'].astype(float)
            df['Low'] = df['low'].astype(float)
            df['Close'] = df['close'].astype(float)
            df['volume'] = df['volume'].astype(float) # Fix type

            df['avg_volume'] = df['volume'].rolling(20).mean()
            df['date'] = df['timestamp'].dt.date
            trades = []

            for date, day_df in df.groupby('date'):
                day_df = day_df.set_index('timestamp')
                day_df = day_df.between_time("09:15", "15:15")
                if day_df.empty: continue

                day_df["cum_vol"] = day_df["volume"].cumsum()
                day_df["cum_vol_price"] = (day_df["Close"] * day_df["volume"]).cumsum()
                day_df["vwap"] = day_df["cum_vol_price"] / day_df["cum_vol"]

                opening_range = day_df.between_time(OR_START, OR_END)
                if opening_range.empty: continue
                
                OR_high = opening_range["High"].max()
                OR_low = opening_range["Low"].min()
                OR_mid = (OR_high + OR_low) / 2
                
                trade_count = 0
                position = None
                TRADE_LIMIT_DAILY = 2
                TARGET_PCT = 0.006

                for idx, row in day_df.iterrows():
                    if idx.time() <= pd.to_datetime(OR_END).time(): continue
                    if trade_count >= TRADE_LIMIT_DAILY: break

                    # EXIT
                    if position:
                        if position["type"] == "BUY":
                            if row["Low"] <= position["sl"]:
                                pnl = (position["sl"] - position["entry"]) * position["qty"]
                                trades.append({"type": "BUY", "result": "SL", "pnl": pnl})
                                position = None; trade_count += 1
                            elif row["High"] >= position["target"]:
                                pnl = (position["target"] - position["entry"]) * position["qty"]
                                trades.append({"type": "BUY", "result": "TARGET", "pnl": pnl})
                                position = None; trade_count += 1
                        elif position["type"] == "SELL":
                            if row["High"] >= position["sl"]:
                                pnl = (position["entry"] - position["sl"]) * position["qty"]
                                trades.append({"type": "SELL", "result": "SL", "pnl": pnl})
                                position = None; trade_count += 1
                            elif row["Low"] <= position["target"]:
                                pnl = (position["entry"] - position["target"]) * position["qty"]
                                trades.append({"type": "SELL", "result": "TARGET", "pnl": pnl})
                                position = None; trade_count += 1

                    # ENTRY
                    if position is None and trade_count < TRADE_LIMIT_DAILY:
                        if (row["Close"] > OR_high and row["Close"] > row["vwap"] and row["volume"] > 1.5 * row.get('avg_volume', 0)):
                            position = {"type": "BUY", "entry": row["Close"], "sl": OR_mid, "target": row["Close"]*(1+TARGET_PCT), "qty": INITIAL_CAPITAL/row["Close"]}
                        elif (row["Close"] < OR_low and row["Close"] < row["vwap"] and row["volume"] > 1.5 * row.get('avg_volume', 0)):
                            position = {"type": "SELL", "entry": row["Close"], "sl": OR_mid, "target": row["Close"]*(1-TARGET_PCT), "qty": INITIAL_CAPITAL/row["Close"]}

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
