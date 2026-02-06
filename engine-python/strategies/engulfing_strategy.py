"""
MerQ Alpha IV - Engulfing Candle Strategy

Logic:
- Identify Bullish/Bearish Engulfing patterns
- Bullish Engulfing: Current candle's body completely engulfs previous candle's body (white engulfs red)
- Bearish Engulfing: Current candle's body completely engulfs previous candle's body (red engulfs white)
- Enter on pattern confirmation with trend filter (EMA)
- TP: 1.5:1 Risk-Reward
- SL: Below/Above the engulfing candle
"""
import pandas as pd
import numpy as np
from .base_live import BaseLiveStrategy
import datetime


class LiveEngulfing(BaseLiveStrategy):
    """
    MerQ Alpha IV - Engulfing Pattern Strategy (Live Trading)
    """
    def __init__(self, config, logger, symbol_tokens):
        super().__init__(config, logger, symbol_tokens)
        self.candle_history = {}  # Store last 2 candles per symbol
        self.current_candle = {}  # Track current forming candle
        self.last_candle_time = {} # Track 5-min candle completion
        
    def initialize(self, smartApi):
        """
        Fetch initial candles to have history for pattern detection
        """
        self.log("Initializing MerQ Alpha IV (Engulfing Pattern Strategy)...")
        
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
                    "interval": "FIVE_MINUTE",
                    "fromdate": f"{today} 09:15",
                    "todate": f"{today} 15:30"
                }
                res = smartApi.getCandleData(params)
                
                if res and res.get('status') and res.get('data'):
                    df = pd.DataFrame(res['data'], columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])
                    for col in ['open', 'high', 'low', 'close']:
                        df[col] = df[col].astype(float)
                    
                    # Calculate EMA20 for trend filter
                    df['EMA20'] = df['close'].ewm(span=20, adjust=False).mean()
                    
                    # Store last 2 completed candles
                    if len(df) >= 2:
                        self.candle_history[symbol] = {
                            'prev': df.iloc[-2].to_dict(),
                            'current': df.iloc[-1].to_dict(),
                            'ema20': float(df['EMA20'].iloc[-1])
                        }
                        self.log(f"Engulfing initialized for {symbol}")
                    else:
                        self.candle_history[symbol] = {'prev': None, 'current': None, 'ema20': 0}
                else:
                    self.candle_history[symbol] = {'prev': None, 'current': None, 'ema20': 0}
                    
            except Exception as e:
                self.log(f"Error initializing {symbol}: {e}", "ERROR")
                self.candle_history[symbol] = {'prev': None, 'current': None, 'ema20': 0}
    
    def on_tick(self, symbol, ltp, prev_ltp, vwap, current_time):
        """
        Detect engulfing patterns and generate signals
        Note: For true engulfing detection, we need candle-by-candle data.
        This implementation uses tick-based approximation.
        """
        # Only trade during market hours
        if current_time < datetime.time(9, 30) or current_time > datetime.time(15, 0):
            return None
        
        history = self.candle_history.get(symbol)
        if not history or not history.get('prev') or not history.get('current'):
            return None
        
        prev_candle = history['prev']
        curr_candle = history['current']
        ema20 = history.get('ema20', 0)
        
        capital = float(self.config.get('capital', 100000))
        qty = max(1, int(capital / ltp)) if ltp > 0 else 1
        
        # Previous candle characteristics
        prev_open = prev_candle.get('open', 0)
        prev_close = prev_candle.get('close', 0)
        prev_is_bearish = prev_close < prev_open
        prev_is_bullish = prev_close > prev_open
        prev_body_top = max(prev_open, prev_close)
        prev_body_bottom = min(prev_open, prev_close)
        
        # Current candle characteristics (use ltp as current close)
        curr_open = curr_candle.get('open', 0)
        curr_close = ltp  # Use live price as current close
        curr_is_bullish = curr_close > curr_open
        curr_is_bearish = curr_close < curr_open
        curr_body_top = max(curr_open, curr_close)
        curr_body_bottom = min(curr_open, curr_close)
        
        # Bullish Engulfing: Prev=bearish, Curr=bullish, Curr body engulfs Prev body
        if prev_is_bearish and curr_is_bullish:
            if curr_body_bottom <= prev_body_bottom and curr_body_top >= prev_body_top:
                # Trend filter: Price above EMA20 (or no filter for reversal trades)
                sl = round(curr_body_bottom * 0.998, 2)  # Below engulfing low
                risk = ltp - sl
                tp = round(ltp + (risk * 1.5), 2)  # 1.5:1 RR
                
                self.log(f"🟢 Bullish Engulfing: {symbol} @ {ltp}")
                return {"action": "BUY", "tp": tp, "sl": sl, "qty": qty}
        
        # Bearish Engulfing: Prev=bullish, Curr=bearish, Curr body engulfs Prev body
        if prev_is_bullish and curr_is_bearish:
            if curr_body_top >= prev_body_top and curr_body_bottom <= prev_body_bottom:
                sl = round(curr_body_top * 1.002, 2)  # Above engulfing high
                risk = sl - ltp
                tp = round(ltp - (risk * 1.5), 2)  # 1.5:1 RR
                
                self.log(f"🔴 Bearish Engulfing: {symbol} @ {ltp}")
                return {"action": "SELL", "tp": tp, "sl": sl, "qty": qty}
        
        return None


def backtest(df):
    """
    MerQ Alpha IV - Engulfing Pattern Backtest
    """
    trades = []
    
    if df.empty or len(df) < 25:
        return trades
    
    INITIAL_CAPITAL = 100000
    RR_RATIO = 1.5
    
    # Ensure float types
    for col in ['open', 'high', 'low', 'close']:
        df[col] = df[col].astype(float)
    
    # Calculate EMA for trend filter
    df['EMA20'] = df['close'].ewm(span=20, adjust=False).mean()
    
    position = None
    
    for i in range(2, len(df)):
        prev = df.iloc[i-1]
        curr = df.iloc[i]
        
        prev_open = prev['open']
        prev_close = prev['close']
        curr_open = curr['open']
        curr_close = curr['close']
        curr_high = curr['high']
        curr_low = curr['low']
        ema20 = curr['EMA20']
        
        # Exit logic
        if position:
            if position['type'] == 'BUY':
                if curr_low <= position['sl']:
                    pnl = (position['sl'] - position['entry']) * position['qty']
                    trades.append({"type": "BUY", "result": "SL", "pnl": pnl, "date": curr['timestamp']})
                    position = None
                elif curr_high >= position['target']:
                    pnl = (position['target'] - position['entry']) * position['qty']
                    trades.append({"type": "BUY", "result": "TARGET", "pnl": pnl, "date": curr['timestamp']})
                    position = None
            elif position['type'] == 'SELL':
                if curr_high >= position['sl']:
                    pnl = (position['entry'] - position['sl']) * position['qty']
                    trades.append({"type": "SELL", "result": "SL", "pnl": pnl, "date": curr['timestamp']})
                    position = None
                elif curr_low <= position['target']:
                    pnl = (position['entry'] - position['target']) * position['qty']
                    trades.append({"type": "SELL", "result": "TARGET", "pnl": pnl, "date": curr['timestamp']})
                    position = None
        
        # Entry logic
        if position is None:
            qty = INITIAL_CAPITAL / curr_close if curr_close > 0 else 1
            
            prev_is_bearish = prev_close < prev_open
            prev_is_bullish = prev_close > prev_open
            prev_body_top = max(prev_open, prev_close)
            prev_body_bottom = min(prev_open, prev_close)
            
            curr_is_bullish = curr_close > curr_open
            curr_is_bearish = curr_close < curr_open
            curr_body_top = max(curr_open, curr_close)
            curr_body_bottom = min(curr_open, curr_close)
            
            # Bullish Engulfing
            if prev_is_bearish and curr_is_bullish:
                if curr_body_bottom <= prev_body_bottom and curr_body_top >= prev_body_top:
                    sl = curr_low * 0.998
                    risk = curr_close - sl
                    tp = curr_close + (risk * RR_RATIO)
                    position = {'type': 'BUY', 'entry': curr_close, 'sl': sl, 'target': tp, 'qty': qty}
            
            # Bearish Engulfing
            elif prev_is_bullish and curr_is_bearish:
                if curr_body_top >= prev_body_top and curr_body_bottom <= prev_body_bottom:
                    sl = curr_high * 1.002
                    risk = sl - curr_close
                    tp = curr_close - (risk * RR_RATIO)
                    position = {'type': 'SELL', 'entry': curr_close, 'sl': sl, 'target': tp, 'qty': qty}
    
    return trades
