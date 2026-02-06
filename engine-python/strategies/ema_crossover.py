import pandas as pd
import numpy as np

def backtest(df):
    """
    Advanced EMA 8-30 Strategy with ATR & Patterns
    (Matched with Angel-algo/strategies/ema_strategy.py)
    """
    trades = []
    
    # ===============================
    # CONFIGURATION
    # ===============================
    INITIAL_CAPITAL = 100000
    EMA_FAST = 8
    EMA_SLOW = 30
    ATR_PERIOD = 14
    RR_RATIO = 3.0  # Risk-Reward Ratio
    BODY_RATIO = 0.6  # Minimum body percentage for dominant candles

    if df.empty or len(df) < max(EMA_SLOW, ATR_PERIOD) + 5:
        return []

    # Ensure float types
    for col in ['open', 'high', 'low', 'close', 'volume']:
        df[col] = df[col].astype(float)
    
    # ===============================
    # INDICATORS (Global Calculation)
    # ===============================
    df['EMA_FAST'] = df['close'].ewm(span=EMA_FAST, adjust=False).mean()
    df['EMA_SLOW'] = df['close'].ewm(span=EMA_SLOW, adjust=False).mean()
    
    high_low = df['high'] - df['low']
    high_close = np.abs(df['high'] - df['close'].shift())
    low_close = np.abs(df['low'] - df['close'].shift())
    tr = pd.concat([high_low, high_close, low_close], axis=1).max(axis=1)
    df['ATR'] = tr.rolling(ATR_PERIOD).mean()
    
    df['BULL_BIAS'] = df['EMA_FAST'] > df['EMA_SLOW']
    df['BEAR_BIAS'] = df['EMA_FAST'] < df['EMA_SLOW']
    df['BULL_CROSS'] = (df['EMA_FAST'] > df['EMA_SLOW']) & (df['EMA_FAST'].shift(1) <= df['EMA_SLOW'].shift(1))
    df['BEAR_CROSS'] = (df['EMA_FAST'] < df['EMA_SLOW']) & (df['EMA_FAST'].shift(1) >= df['EMA_SLOW'].shift(1))
    
    # ===============================
    # BACKTEST ENGINE
    # ===============================
    position = None
    start_idx = max(EMA_SLOW, ATR_PERIOD) + 1
    
    # We iterate properly using range to access by index
    # Note: df is likely sorted by timestamp from fetcher
    
    for i in range(start_idx, len(df)):
        row = df.iloc[i]
        date = row['timestamp'] # Access timestamp for reporting
        open_ = row['open']
        high = row['high']
        low = row['low']
        close = row['close']
        ema_slow_val = row['EMA_SLOW']
        atr_val = row['ATR']
        
        # ===============================
        # EXIT LOGIC
        # ===============================
        if position:
            if position['type'] == 'BUY':
                # Stop Loss
                if low <= position['sl']:
                    pnl = (position['sl'] - position['entry']) * position['qty']
                    trades.append({"type": "BUY", "result": "SL", "pnl": pnl, "date": date})
                    position = None
                # Take Profit
                elif high >= position['target']:
                    pnl = (position['target'] - position['entry']) * position['qty']
                    trades.append({"type": "BUY", "result": "TARGET", "pnl": pnl, "date": date})
                    position = None
                # Reversal Exit
                elif row['BEAR_CROSS']:
                    pnl = (close - position['entry']) * position['qty']
                    trades.append({"type": "BUY", "result": "SIGNAL_EXIT", "pnl": pnl, "date": date})
                    position = None
            
            elif position['type'] == 'SELL':
                # Stop Loss
                if high >= position['sl']:
                    pnl = (position['entry'] - position['sl']) * position['qty']
                    trades.append({"type": "SELL", "result": "SL", "pnl": pnl, "date": date})
                    position = None
                # Take Profit
                elif low <= position['target']:
                    pnl = (position['entry'] - position['target']) * position['qty']
                    trades.append({"type": "SELL", "result": "TARGET", "pnl": pnl, "date": date})
                    position = None
                # Reversal Exit
                elif row['BULL_CROSS']:
                    pnl = (position['entry'] - close) * position['qty']
                    trades.append({"type": "SELL", "result": "SIGNAL_EXIT", "pnl": pnl, "date": date})
                    position = None
        
        # ===============================
        # ENTRY LOGIC
        # ===============================
        if position is None:
            if pd.isna(atr_val):
                continue
            
            body = abs(close - open_)
            range_ = high - low if high != low else 1.0
            
            # Candlestick Patterns
            dominant_bull = (close > open_) and ((close - open_) / range_ >= BODY_RATIO)
            dominant_bear = (open_ > close) and ((open_ - close) / range_ >= BODY_RATIO)
            
            # Lower Shadow Bull: Low dips below EMA, but body closes above, long tail
            lower_shadow_bull = (low < ema_slow_val and (open_ - low) > 2 * body and (close - open_) / range_ < 0.3)
            
            # Upper Shadow Bear: High goes above EMA, but body closes below, long wick
            upper_shadow_bear = (high > ema_slow_val and (high - close) > 2 * body and (open_ - close) / range_ < 0.3)
            
            # Angel-algo uses float division for qty in backtest
            qty = INITIAL_CAPITAL / close if close > 0 else 0
            
            # LONG Entry
            if row['BULL_BIAS'] and low <= ema_slow_val and (dominant_bull or lower_shadow_bull):
                entry = close
                sl = low - (0.5 * atr_val)
                tp = entry + ((entry - sl) * RR_RATIO)
                position = {'type': 'BUY', 'entry': entry, 'sl': sl, 'target': tp, 'qty': qty}
            
            # SHORT Entry
            elif row['BEAR_BIAS'] and high >= ema_slow_val and (dominant_bear or upper_shadow_bear):
                entry = close
                sl = high + (0.5 * atr_val)
                tp = entry - ((sl - entry) * RR_RATIO)
                position = {'type': 'SELL', 'entry': entry, 'sl': sl, 'target': tp, 'qty': qty}

    return trades

# ==========================================
# LIVE STRATEGY IMPLEMENTATION
# ==========================================
from .base_live import BaseLiveStrategy
import datetime

class LiveEMA(BaseLiveStrategy):
    def initialize(self, smartApi):
        self.log("Initializing EMA Strategy... (Not yet fully implemented for Live)")
        # In future: Fetch 30-40 candles for historical EMA calc
        pass

    def on_tick(self, symbol, ltp, prev_ltp, vwap, current_time):
        # In future: Update candles, calculate live EMA, check cross
        # For now, return None so no trades are taken (fixing the ORB issue)
        return None
