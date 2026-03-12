"""
Strategy Name: ORB Improved Version
"""
import pandas as pd
import numpy as np

def backtest(df):
    """
    ORB Strategy Logic
    """
    trades = []
    
    # Constants
    OR_START = "09:15"
    OR_END = "09:30"
    TARGET_PCT = 0.01 # 1.0%
    MAX_RISK_PCT = 0.01 # 1.0% Maximum SL Risk
    INITIAL_CAPITAL = 100000

    df['date'] = df['timestamp'].dt.date
    
    prev_close = None

    for date, day_df in df.groupby('date'):
        day_df_time = day_df.set_index('timestamp')
        
        # Determine gap direction
        day_open = day_df_time.iloc[0]['open'] if len(day_df_time) > 0 else 0
        gap_direction = None
        if prev_close is not None and prev_close > 0:
            if day_open > prev_close: gap_direction = "UP"
            elif day_open < prev_close: gap_direction = "DOWN"

        day_df = day_df_time.between_time("09:15", "15:15")
        if day_df.empty: 
            prev_close = day_df_time.iloc[-1]['close'] if len(day_df_time) > 0 else prev_close
            continue

        # Intraday Indicators
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

        for idx, row in day_df.iterrows():
            current_time = idx.time()
            if current_time <= pd.to_datetime(OR_END).time(): continue
            if trade_count >= TRADE_LIMIT_DAILY: break

            # EXIT
            if position:
                if position["type"] == "BUY":
                    if row["low"] <= position["sl"]:
                        pnl = (position["sl"] - position["entry"]) * position["qty"]
                        trades.append({"type": "BUY", "result": "SL", "pnl": pnl, "date": date})
                        position = None; trade_count += 1
                    elif row["high"] >= position["target"]:
                        pnl = (position["target"] - position["entry"]) * position["qty"]
                        trades.append({"type": "BUY", "result": "TARGET", "pnl": pnl, "date": date})
                        position = None; trade_count += 1
                elif position["type"] == "SELL":
                    if row["high"] >= position["sl"]:
                        pnl = (position["entry"] - position["sl"]) * position["qty"]
                        trades.append({"type": "SELL", "result": "SL", "pnl": pnl, "date": date})
                        position = None; trade_count += 1
                    elif row["low"] <= position["target"]:
                        pnl = (position["entry"] - position["target"]) * position["qty"]
                        trades.append({"type": "SELL", "result": "TARGET", "pnl": pnl, "date": date})
                        position = None; trade_count += 1

            # ENTRY
            if position is None and trade_count < TRADE_LIMIT_DAILY:
                # Time window filter: No new trades after 11:00 AM
                if current_time > pd.to_datetime("11:00").time():
                    continue

                qty = int(INITIAL_CAPITAL / row["close"]) if row["close"] > 0 else 0
                
                # Check Signals
                if (row["close"] > OR_high and row["close"] > row["vwap"]):
                    sl = max(OR_mid, row["close"] * (1 - MAX_RISK_PCT)) # Cap SL risk for BUY
                    position = {"type": "BUY", "entry": row["close"], "sl": sl, "target": row["close"]*(1+TARGET_PCT), "qty": qty}
                elif (row["close"] < OR_low and row["close"] < row["vwap"]):
                    sl = min(OR_mid, row["close"] * (1 + MAX_RISK_PCT)) # Cap SL risk for SELL
                    position = {"type": "SELL", "entry": row["close"], "sl": sl, "target": row["close"]*(1-TARGET_PCT), "qty": qty}
        
        # End of day update
        prev_close = day_df.iloc[-1]['close'] if len(day_df) > 0 else prev_close
    
    return trades

# ==========================================
# LIVE STRATEGY IMPLEMENTATION
# ==========================================
try:
    from .base_live import BaseLiveStrategy
except ImportError:
    class BaseLiveStrategy:
        def __init__(self, *args, **kwargs): pass
        def log(self, *args, **kwargs): pass
import datetime
import time

class LiveORB(BaseLiveStrategy):
    def __init__(self, config, logger, symbol_tokens):
        super().__init__(config, logger, symbol_tokens)
        self.orb_levels = {} # {symbol: {or_high, or_low, or_mid, collecting}}

    def initialize(self, smartApi):
        """
        Fetch ORB levels (9:15-9:30 candle)
        """
        self.log(f"Initializing ORB Strategy for {len(self.symbol_tokens)//2} symbols...")
        
        # Initialize default state for all symbols to prevent "key error" later
        for symbol in self.config['symbols']:
            self.orb_levels[symbol] = {
                'or_high': 0, 'or_low': 999999999, 'or_mid': 0, 'collecting': True
            }

        # Determine 9:15-9:30 range (IST)
        ist_now = datetime.datetime.utcnow() + datetime.timedelta(hours=5, minutes=30)
        current_time = ist_now.time()
        
        if current_time < datetime.time(9, 30):
            self.log("Market not yet 09:30. ORB levels will be collected from live ticks.")
            return

        # Market Open: Fetch Data
        today = ist_now.date() 
        for symbol in self.config['symbols']:
            token = self.symbol_tokens.get(symbol)
            if not token: 
                self.log(f"Skipping {symbol}: No token available", "WARNING")
                continue
            
            # Retry up to 3 times for each symbol
            for attempt in range(3):
                try:
                    time.sleep(0.5) # Rate limit delay for Angel One API (3 req/sec limit)
                    
                    params = {
                        "exchange": "NSE",
                        "symboltoken": token,
                        "interval": "FIVE_MINUTE",
                        "fromdate": f"{today.strftime('%Y-%m-%d')} 09:15",
                        "todate": f"{today.strftime('%Y-%m-%d')} 09:30"
                    }
                    res = smartApi.getCandleData(params)
                    
                    if res and res.get('status') and res.get('data'):
                        df = pd.DataFrame(res['data'], columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])
                        or_high = float(df['high'].max())
                        or_low = float(df['low'].min())
                        self.orb_levels[symbol] = {
                            'or_high': or_high, 'or_low': or_low, 
                            'or_mid': (or_high + or_low) / 2, 'collecting': False
                        }
                        self.log(f"ORB Level for {symbol}: High={or_high}, Low={or_low}")
                        break # Success, move to next symbol
                        
                    else:
                        if attempt == 2: # Last attempt
                            self.log(f"Failed to fetch ORB for {symbol} after 3 attempts. Last Response: {res}", "WARNING")
                        else:
                            time.sleep(1.0) # Wait before retry
                            
                except Exception as e:
                    if attempt == 2:
                        self.log(f"Error fetching ORB for {symbol}: {e}", "ERROR")
                    time.sleep(1.0)

    def on_tick(self, symbol, ltp, prev_ltp, vwap, current_time):
        # 1. Update Levels if Collecting
        if symbol in self.orb_levels and self.orb_levels[symbol].get('collecting'):
             orb = self.orb_levels[symbol]
             if datetime.time(9, 15) <= current_time <= datetime.time(9, 30):
                 if ltp > orb['or_high']: orb['or_high'] = ltp
                 if ltp < orb['or_low']: orb['or_low'] = ltp
                 orb['or_mid'] = (orb['or_high'] + orb['or_low']) / 2
             elif current_time > datetime.time(9, 30) and orb['or_high'] > 0:
                 orb['collecting'] = False
                 self.log(f"ORB Live Collected for {symbol}: {orb['or_high']}/{orb['or_low']}")
             return None

        # 2. Check Signals (Only after 09:30)
        if current_time < datetime.time(9, 30): return None
        
        orb = self.orb_levels.get(symbol)
        if not orb or orb.get('collecting') or orb['or_high'] <= 0: return None

        # Signal Logic
        or_high = orb['or_high']
        or_low = orb['or_low']
        or_mid = orb['or_mid']
        
        capital = float(self.config.get('capital', 100000))
        qty = int(capital / ltp) if ltp > 0 else 1
        qty = max(1, qty)

        MAX_RISK_PCT = 0.01 # 1% Maximum Stop-Loss Cap
        TARGET_PCT = 0.01   # 1% Target Profit
        
        # BUY: Cross Above High
        if ltp > or_high and prev_ltp <= or_high:
            if vwap > 0 and ltp <= vwap: return None # VWAP Filter
            tp = round(ltp * (1 + TARGET_PCT), 2)
            capped_sl = max(or_mid, ltp * (1 - MAX_RISK_PCT)) # Max 1% risk
            sl = round(capped_sl, 2)
            return {"action": "BUY", "tp": tp, "sl": sl, "qty": qty}
        
        # SELL: Cross Below Low
        elif ltp < or_low and prev_ltp >= or_low:
            if vwap > 0 and ltp >= vwap: return None # VWAP Filter
            tp = round(ltp * (1 - TARGET_PCT), 2)
            capped_sl = min(or_mid, ltp * (1 + MAX_RISK_PCT)) # Max 1% risk
            sl = round(capped_sl, 2)
            return {"action": "SELL", "tp": tp, "sl": sl, "qty": qty}
            
        return None
