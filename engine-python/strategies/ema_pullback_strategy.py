"""
MerQ Alpha III - EMA Pullback Strategy

Logic:
- Wait for price to be in a trend (EMA8 > EMA21 for uptrend)
- Wait for pullback to EMA21 (price touches or dips below EMA21)
- Enter when price bounces back above EMA21 with bullish candle
- TP: 1:2 Risk-Reward based on ATR
- SL: Below recent swing low (or EMA21)
"""
import pandas as pd
import numpy as np
from .base_live import BaseLiveStrategy
import datetime


class LiveEMAPullback(BaseLiveStrategy):
    """
    MerQ Alpha III - EMA Pullback Strategy (Live Trading)
    """
    def __init__(self, config, logger, symbol_tokens):
        super().__init__(config, logger, symbol_tokens)
        self.candle_cache = {}  # Store recent candles per symbol
        self.ema_cache = {}     # Store EMA values per symbol
        self.pullback_state = {} # Track if we're in pullback mode
        
    def initialize(self, smartApi):
        """
        Fetch initial historical data to calculate EMAs
        """
        self.log("Initializing MerQ Alpha III (EMA Pullback Strategy)...")
        
        ist_now = datetime.datetime.utcnow() + datetime.timedelta(hours=5, minutes=30)
        today = ist_now.date()
        
        for symbol in self.config.get('symbols', []):
            token = self.symbol_tokens.get(symbol)
            if not token:
                self.log(f"Skipping {symbol}: No token", "WARNING")
                continue
            
            try:
                # Fetch last 50 candles (5-min) for EMA calculation
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
                    df['close'] = df['close'].astype(float)
                    
                    # Calculate EMAs
                    df['EMA8'] = df['close'].ewm(span=8, adjust=False).mean()
                    df['EMA21'] = df['close'].ewm(span=21, adjust=False).mean()
                    
                    # Store latest values
                    self.ema_cache[symbol] = {
                        'ema8': float(df['EMA8'].iloc[-1]),
                        'ema21': float(df['EMA21'].iloc[-1]),
                        'candles': df.tail(5).to_dict('records')
                    }
                    self.pullback_state[symbol] = {'in_pullback': False, 'touched_ema': False}
                    self.log(f"EMA Pullback initialized for {symbol}: EMA8={self.ema_cache[symbol]['ema8']:.2f}, EMA21={self.ema_cache[symbol]['ema21']:.2f}")
                else:
                    self.log(f"No data for {symbol}", "WARNING")
                    # Initialize with placeholders for live collection
                    self.ema_cache[symbol] = {'ema8': 0, 'ema21': 0, 'candles': []}
                    self.pullback_state[symbol] = {'in_pullback': False, 'touched_ema': False}
                    
            except Exception as e:
                self.log(f"Error initializing {symbol}: {e}", "ERROR")
                self.ema_cache[symbol] = {'ema8': 0, 'ema21': 0, 'candles': []}
                self.pullback_state[symbol] = {'in_pullback': False, 'touched_ema': False}
    
    def on_tick(self, symbol, ltp, prev_ltp, vwap, current_time):
        """
        Check for EMA Pullback entry signals
        """
        # Only trade during market hours
        if current_time < datetime.time(9, 30) or current_time > datetime.time(15, 0):
            return None
        
        cache = self.ema_cache.get(symbol)
        if not cache or cache['ema8'] <= 0 or cache['ema21'] <= 0:
            return None
        
        ema8 = cache['ema8']
        ema21 = cache['ema21']
        state = self.pullback_state.get(symbol, {})
        
        capital = float(self.config.get('capital', 100000))
        qty = max(1, int(capital / ltp)) if ltp > 0 else 1
        
        # Uptrend: EMA8 > EMA21
        if ema8 > ema21:
            # Check if price pulled back to EMA21
            if ltp <= ema21 * 1.002:  # Within 0.2% of EMA21
                state['touched_ema'] = True
                self.pullback_state[symbol] = state
            
            # Entry: Price bounced back above EMA21 after touching it
            if state.get('touched_ema') and prev_ltp <= ema21 and ltp > ema21:
                sl = round(ema21 * 0.995, 2)  # SL slightly below EMA21
                risk = ltp - sl
                tp = round(ltp + (risk * 2), 2)  # 1:2 RR
                
                # Reset state
                self.pullback_state[symbol] = {'in_pullback': False, 'touched_ema': False}
                
                self.log(f"📈 EMA Pullback BUY Signal: {symbol} @ {ltp}")
                return {"action": "BUY", "tp": tp, "sl": sl, "qty": qty}
        
        # Downtrend: EMA8 < EMA21
        elif ema8 < ema21:
            # Check if price pulled back to EMA21
            if ltp >= ema21 * 0.998:  # Within 0.2% of EMA21
                state['touched_ema'] = True
                self.pullback_state[symbol] = state
            
            # Entry: Price bounced back below EMA21 after touching it
            if state.get('touched_ema') and prev_ltp >= ema21 and ltp < ema21:
                sl = round(ema21 * 1.005, 2)  # SL slightly above EMA21
                risk = sl - ltp
                tp = round(ltp - (risk * 2), 2)  # 1:2 RR
                
                # Reset state
                self.pullback_state[symbol] = {'in_pullback': False, 'touched_ema': False}
                
                self.log(f"📉 EMA Pullback SELL Signal: {symbol} @ {ltp}")
                return {"action": "SELL", "tp": tp, "sl": sl, "qty": qty}
        
        return None


def backtest(df):
    """
    MerQ Alpha III - EMA Pullback Backtest
    """
    trades = []
    
    if df.empty or len(df) < 25:
        return trades
    
    INITIAL_CAPITAL = 100000
    EMA_FAST = 8
    EMA_SLOW = 21
    RR_RATIO = 2.0
    
    # Ensure float types
    for col in ['open', 'high', 'low', 'close']:
        df[col] = df[col].astype(float)
    
    # Calculate EMAs
    df['EMA8'] = df['close'].ewm(span=EMA_FAST, adjust=False).mean()
    df['EMA21'] = df['close'].ewm(span=EMA_SLOW, adjust=False).mean()
    
    position = None
    touched_ema = False
    
    for i in range(22, len(df)):
        row = df.iloc[i]
        prev = df.iloc[i-1]
        
        ema8 = row['EMA8']
        ema21 = row['EMA21']
        close = row['close']
        prev_close = prev['close']
        high = row['high']
        low = row['low']
        
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
        
        # Entry logic
        if position is None:
            qty = INITIAL_CAPITAL / close if close > 0 else 1
            
            # Uptrend pullback
            if ema8 > ema21:
                if close <= ema21 * 1.002:
                    touched_ema = True
                if touched_ema and prev_close <= ema21 and close > ema21:
                    sl = ema21 * 0.995
                    risk = close - sl
                    tp = close + (risk * RR_RATIO)
                    position = {'type': 'BUY', 'entry': close, 'sl': sl, 'target': tp, 'qty': qty}
                    touched_ema = False
            
            # Downtrend pullback
            elif ema8 < ema21:
                if close >= ema21 * 0.998:
                    touched_ema = True
                if touched_ema and prev_close >= ema21 and close < ema21:
                    sl = ema21 * 1.005
                    risk = sl - close
                    tp = close - (risk * RR_RATIO)
                    position = {'type': 'SELL', 'entry': close, 'sl': sl, 'target': tp, 'qty': qty}
                    touched_ema = False
    
    return trades
