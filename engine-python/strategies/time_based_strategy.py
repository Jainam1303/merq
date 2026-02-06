"""
MerQ Alpha V - Time-Based Strategy

Logic:
- Enter at specific times during the trading day (configurable)
- Default entry times: 10:00 AM and 2:00 PM
- Direction based on trend (EMA comparison)
- Fixed holding period or TP/SL exit
- Auto square-off before market close
"""
import pandas as pd
import numpy as np
from .base_live import BaseLiveStrategy
import datetime


class LiveTimeBased(BaseLiveStrategy):
    """
    MerQ Alpha V - Time-Based Strategy (Live Trading)
    """
    def __init__(self, config, logger, symbol_tokens):
        super().__init__(config, logger, symbol_tokens)
        self.ema_cache = {}
        self.entry_times = [
            datetime.time(10, 0),   # 10:00 AM
            datetime.time(14, 0),   # 2:00 PM
        ]
        self.traded_times = {}  # Track which time slots have been used today
        self.last_trade_date = {}  # Track last trade date per symbol
        
    def initialize(self, smartApi):
        """
        Fetch initial EMA data for trend direction
        """
        self.log("Initializing MerQ Alpha V (Time-Based Strategy)...")
        self.log(f"Entry times: {[t.strftime('%H:%M') for t in self.entry_times]}")
        
        ist_now = datetime.datetime.utcnow() + datetime.timedelta(hours=5, minutes=30)
        today = ist_now.date()
        
        for symbol in self.config.get('symbols', []):
            token = self.symbol_tokens.get(symbol)
            if not token:
                self.log(f"Skipping {symbol}: No token", "WARNING")
                continue
            
            try:
                params = {
                    "exchange": "NSE",
                    "symboltoken": token,
                    "interval": "FIFTEEN_MINUTE",
                    "fromdate": f"{today} 09:15",
                    "todate": f"{today} 15:30"
                }
                res = smartApi.getCandleData(params)
                
                if res and res.get('status') and res.get('data'):
                    df = pd.DataFrame(res['data'], columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])
                    df['close'] = df['close'].astype(float)
                    
                    # Calculate EMAs
                    df['EMA9'] = df['close'].ewm(span=9, adjust=False).mean()
                    df['EMA21'] = df['close'].ewm(span=21, adjust=False).mean()
                    
                    self.ema_cache[symbol] = {
                        'ema9': float(df['EMA9'].iloc[-1]),
                        'ema21': float(df['EMA21'].iloc[-1]),
                        'last_close': float(df['close'].iloc[-1])
                    }
                    self.traded_times[symbol] = set()
                    self.last_trade_date[symbol] = None
                    self.log(f"Time-Based initialized for {symbol}")
                else:
                    self.ema_cache[symbol] = {'ema9': 0, 'ema21': 0, 'last_close': 0}
                    self.traded_times[symbol] = set()
                    self.last_trade_date[symbol] = None
                    
            except Exception as e:
                self.log(f"Error initializing {symbol}: {e}", "ERROR")
                self.ema_cache[symbol] = {'ema9': 0, 'ema21': 0, 'last_close': 0}
                self.traded_times[symbol] = set()
                self.last_trade_date[symbol] = None
    
    def on_tick(self, symbol, ltp, prev_ltp, vwap, current_time):
        """
        Check if current time matches an entry time and generate signal
        """
        # Only trade during market hours
        if current_time < datetime.time(9, 45) or current_time > datetime.time(15, 0):
            return None
        
        cache = self.ema_cache.get(symbol)
        if not cache or cache['ema9'] <= 0:
            return None
        
        # Reset traded times if new day
        today = datetime.date.today()
        if self.last_trade_date.get(symbol) != today:
            self.traded_times[symbol] = set()
            self.last_trade_date[symbol] = today
        
        # Check if current time is within 2 minutes of an entry time
        current_minutes = current_time.hour * 60 + current_time.minute
        
        for entry_time in self.entry_times:
            entry_minutes = entry_time.hour * 60 + entry_time.minute
            
            # Within 2-minute window of entry time
            if abs(current_minutes - entry_minutes) <= 2:
                time_key = f"{entry_time.hour}:{entry_time.minute}"
                
                # Already traded at this time today
                if time_key in self.traded_times.get(symbol, set()):
                    continue
                
                # Mark as traded
                self.traded_times[symbol].add(time_key)
                
                ema9 = cache['ema9']
                ema21 = cache['ema21']
                
                capital = float(self.config.get('capital', 100000))
                qty = max(1, int(capital / ltp)) if ltp > 0 else 1
                
                # Trend direction determines entry
                if ema9 > ema21:  # Uptrend
                    sl = round(ltp * 0.995, 2)  # 0.5% SL
                    tp = round(ltp * 1.01, 2)   # 1% TP (2:1 RR)
                    self.log(f"⏰ Time-Based BUY at {current_time}: {symbol} @ {ltp}")
                    return {"action": "BUY", "tp": tp, "sl": sl, "qty": qty}
                    
                elif ema9 < ema21:  # Downtrend
                    sl = round(ltp * 1.005, 2)  # 0.5% SL
                    tp = round(ltp * 0.99, 2)   # 1% TP (2:1 RR)
                    self.log(f"⏰ Time-Based SELL at {current_time}: {symbol} @ {ltp}")
                    return {"action": "SELL", "tp": tp, "sl": sl, "qty": qty}
        
        return None


def backtest(df):
    """
    MerQ Alpha V - Time-Based Backtest
    """
    trades = []
    
    if df.empty or len(df) < 25:
        return trades
    
    INITIAL_CAPITAL = 100000
    ENTRY_HOURS = [10, 14]  # 10 AM and 2 PM
    
    # Ensure float types
    for col in ['open', 'high', 'low', 'close']:
        df[col] = df[col].astype(float)
    
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    df['hour'] = df['timestamp'].dt.hour
    df['minute'] = df['timestamp'].dt.minute
    df['date'] = df['timestamp'].dt.date
    
    # Calculate EMAs
    df['EMA9'] = df['close'].ewm(span=9, adjust=False).mean()
    df['EMA21'] = df['close'].ewm(span=21, adjust=False).mean()
    
    position = None
    traded_times = set()
    last_date = None
    
    for i in range(22, len(df)):
        row = df.iloc[i]
        
        current_date = row['date']
        hour = row['hour']
        minute = row['minute']
        close = row['close']
        high = row['high']
        low = row['low']
        ema9 = row['EMA9']
        ema21 = row['EMA21']
        
        # Reset traded times for new day
        if current_date != last_date:
            traded_times = set()
            last_date = current_date
        
        # Exit logic
        if position:
            if position['type'] == 'BUY':
                if low <= position['sl']:
                    pnl = (position['sl'] - position['entry']) * position['qty']
                    trades.append({"type": "BUY", "result": "SL", "pnl": pnl, "date": row['timestamp']})
                    position = None
                elif high >= position['target']:
                    pnl = (position['target'] - position['entry']) * position['qty']
                    trades.append({"type": "BUY", "result": "TARGET", "pnl": pnl, "date": row['timestamp']})
                    position = None
            elif position['type'] == 'SELL':
                if high >= position['sl']:
                    pnl = (position['entry'] - position['sl']) * position['qty']
                    trades.append({"type": "SELL", "result": "SL", "pnl": pnl, "date": row['timestamp']})
                    position = None
                elif low <= position['target']:
                    pnl = (position['entry'] - position['target']) * position['qty']
                    trades.append({"type": "SELL", "result": "TARGET", "pnl": pnl, "date": row['timestamp']})
                    position = None
        
        # Entry logic - at specific times
        if position is None:
            qty = INITIAL_CAPITAL / close if close > 0 else 1
            
            for entry_hour in ENTRY_HOURS:
                if hour == entry_hour and minute <= 5:
                    time_key = f"{current_date}_{entry_hour}"
                    
                    if time_key in traded_times:
                        continue
                    
                    traded_times.add(time_key)
                    
                    if ema9 > ema21:  # Uptrend - BUY
                        sl = close * 0.995
                        tp = close * 1.01
                        position = {'type': 'BUY', 'entry': close, 'sl': sl, 'target': tp, 'qty': qty}
                    
                    elif ema9 < ema21:  # Downtrend - SELL
                        sl = close * 1.005
                        tp = close * 0.99
                        position = {'type': 'SELL', 'entry': close, 'sl': sl, 'target': tp, 'qty': qty}
    
    return trades
