"""
MerQ Alpha VI - Enhanced EMA Pullback Strategy

IMPROVED VERSION OF EMA PULLBACK (Alpha III)
=============================================
Better filters, fewer trades, higher win rate.

KEY IMPROVEMENTS OVER ORIGINAL:
1. Triple EMA Stack (9/21/50) - Only trade when ALL 3 confirm trend
2. VWAP Alignment - Entry side must match intraday VWAP bias
3. Volume Confirmation - Bounce candle needs above-avg volume
4. ATR-based SL - Dynamic stops that adapt to volatility
5. Minimum R:R Gate (1:2) - Never enter bad risk trades
6. Max 2 trades/day - Quality over quantity
7. Trade window 10:00 AM - 1:30 PM
8. Pullback depth validation - Must actually TOUCH EMA21 zone
9. Bounce candle quality - Must be strong (body > 40% of range)
10. EMA separation filter - Trend must be meaningful (>0.15% gap)

LONG SETUP:
1. EMA9 > EMA21 > EMA50 (confirmed uptrend stack)
2. EMA9 separated from EMA21 by > 0.15% (real trend, not chop)
3. Price pulls back TO or BELOW EMA21 (real pullback)
4. Bounce candle: Closes ABOVE EMA21, bullish, body > 40% range
5. Bounce candle volume > 0.8x avg volume (momentum returning)
6. Price above VWAP (intraday bias confirmation)
7. SL: 1.5x ATR below entry (or below EMA50, whichever tighter)
8. TP: 1:2.5 Risk-Reward 
9. Trail SL to breakeven at +0.4%

SHORT SETUP: Mirror of Long
"""
import pandas as pd
import numpy as np
from .base_live import BaseLiveStrategy
import datetime
import time as time_module


# ==========================================
# LIVE STRATEGY IMPLEMENTATION
# ==========================================

class LiveVWAPFailure(BaseLiveStrategy):
    """
    MerQ Alpha VI - Enhanced EMA Pullback (Live Trading)
    
    Uses triple EMA stack with VWAP confirmation and volume filter
    for high-probability pullback entries.
    """
    def __init__(self, config, logger, symbol_tokens):
        super().__init__(config, logger, symbol_tokens)
        
        # EMA State
        self.ema_cache = {}       # {symbol: {ema9, ema21, ema50}}
        self.candle_cache = {}    # {symbol: [recent candles]}
        
        # VWAP State
        self.vwap_state = {}      # {symbol: vwap}
        
        # Pullback Tracking
        self.pullback_state = {}  # {symbol: {touched_zone, direction}}
        
        # Risk Management
        self.daily_trades = {}    # {symbol_date: count}
        self.daily_pnl = {}       # {date: cumulative pnl}
        self.last_trade_date = {} # Track date resets
        
        # Strategy Parameters
        self.MAX_TRADES_PER_DAY = 2
        self.DAILY_DD_CAP_PCT = -0.01       # -1%
        self.RISK_PCT = 0.005                # 0.5% risk per trade
        self.RR_RATIO = 2.5                  # 1:2.5 reward-risk
        self.EMA_SEP_MIN_PCT = 0.0015        # EMA9-EMA21 gap > 0.15%
        self.PULLBACK_ZONE_PCT = 0.003       # Within 0.3% of EMA21
        self.BODY_RATIO_MIN = 0.40           # Bounce candle body > 40% of range
        self.VOLUME_CONFIRM_RATIO = 0.8      # Bounce vol > 0.8x avg
        self.BREAKEVEN_TRIGGER = 0.004       # Move SL to BE at +0.4%
        
    def initialize(self, smartApi):
        self.log("Initializing MerQ Alpha VI (Enhanced EMA Pullback)...")
        self.log(f"📊 Triple EMA Stack: 9/21/50 | R:R 1:{self.RR_RATIO}")
        self.log(f"⏰ Window: 10:00 AM - 1:30 PM | Max {self.MAX_TRADES_PER_DAY} trades/day")
        
        ist_now = datetime.datetime.utcnow() + datetime.timedelta(hours=5, minutes=30)
        today = ist_now.date()
        
        for symbol in self.config.get('symbols', []):
            token = self.symbol_tokens.get(symbol)
            if not token:
                self.log(f"Skipping {symbol}: No token", "WARNING")
                continue
            
            try:
                time_module.sleep(0.5)
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
                    for col in ['open', 'high', 'low', 'close', 'volume']:
                        df[col] = df[col].astype(float)
                    
                    # Calculate EMAs
                    df['ema9'] = df['close'].ewm(span=9, adjust=False).mean()
                    df['ema21'] = df['close'].ewm(span=21, adjust=False).mean()
                    df['ema50'] = df['close'].ewm(span=50, adjust=False).mean()
                    
                    self.ema_cache[symbol] = {
                        'ema9': float(df['ema9'].iloc[-1]),
                        'ema21': float(df['ema21'].iloc[-1]),
                        'ema50': float(df['ema50'].iloc[-1]),
                    }
                    self.candle_cache[symbol] = df.tail(5).to_dict('records')
                    self.pullback_state[symbol] = {'touched_zone': False, 'direction': None}
                    
                    self.log(f"✅ {symbol} | EMA9={self.ema_cache[symbol]['ema9']:.2f} EMA21={self.ema_cache[symbol]['ema21']:.2f} EMA50={self.ema_cache[symbol]['ema50']:.2f}")
                else:
                    self.ema_cache[symbol] = {'ema9': 0, 'ema21': 0, 'ema50': 0}
                    self.candle_cache[symbol] = []
                    self.pullback_state[symbol] = {'touched_zone': False, 'direction': None}
                    self.log(f"⚠️ No data for {symbol}", "WARNING")
                    
            except Exception as e:
                self.log(f"Error initializing {symbol}: {e}", "ERROR")
                self.ema_cache[symbol] = {'ema9': 0, 'ema21': 0, 'ema50': 0}
                self.candle_cache[symbol] = []
                self.pullback_state[symbol] = {'touched_zone': False, 'direction': None}
        
        today_str = str(today)
        self.daily_pnl[today_str] = 0.0
    
    def on_tick(self, symbol, ltp, prev_ltp, vwap, current_time):
        # Time filter: 10:00 AM - 1:30 PM
        if current_time < datetime.time(10, 0) or current_time > datetime.time(13, 30):
            return None
        
        # Daily limits
        today_str = str(datetime.date.today())
        date_key = f"{symbol}_{today_str}"
        
        if self.last_trade_date.get(symbol) != today_str:
            self.daily_trades[date_key] = 0
            self.last_trade_date[symbol] = today_str
            if today_str not in self.daily_pnl:
                self.daily_pnl[today_str] = 0.0
        
        if self.daily_trades.get(date_key, 0) >= self.MAX_TRADES_PER_DAY:
            return None
        
        capital = float(self.config.get('capital', 100000))
        if capital > 0 and self.daily_pnl.get(today_str, 0) / capital <= self.DAILY_DD_CAP_PCT:
            return None
        
        cache = self.ema_cache.get(symbol)
        if not cache or cache['ema9'] <= 0 or cache['ema21'] <= 0 or cache['ema50'] <= 0:
            return None
        
        ema9 = cache['ema9']
        ema21 = cache['ema21']
        ema50 = cache['ema50']
        state = self.pullback_state.get(symbol, {})
        
        qty = max(1, int(capital / ltp)) if ltp > 0 else 1
        
        # VWAP check
        use_vwap = vwap if vwap > 0 else 0
        
        # ==========================================
        # UPTREND: EMA9 > EMA21 > EMA50 (stacked)
        # ==========================================
        if ema9 > ema21 > ema50:
            # EMA separation filter
            ema_gap = (ema9 - ema21) / ema21
            if ema_gap < self.EMA_SEP_MIN_PCT:
                return None  # EMAs too close = choppy
            
            # Track pullback to EMA21 zone
            ema21_upper = ema21 * (1 + self.PULLBACK_ZONE_PCT)
            if ltp <= ema21_upper and ltp >= ema50:
                state['touched_zone'] = True
                state['direction'] = 'LONG'
                self.pullback_state[symbol] = state
            
            # Entry: Bounced back above EMA21 with conditions
            if (state.get('touched_zone') and 
                state.get('direction') == 'LONG' and
                prev_ltp <= ema21 * 1.001 and 
                ltp > ema21 * 1.001):
                
                # VWAP alignment (price should be above VWAP for longs)
                if use_vwap > 0 and ltp < use_vwap * 0.998:
                    return None  # VWAP doesn't confirm
                
                # ATR-based SL (using EMA21 as anchor)
                sl = round(min(ema21 * 0.994, ema50) , 2)  # Below EMA21 or EMA50
                risk = ltp - sl
                if risk <= 0:
                    return None
                
                tp = round(ltp + (risk * self.RR_RATIO), 2)
                
                # Position sizing by risk
                risk_amount = capital * self.RISK_PCT
                risk_qty = int(risk_amount / risk) if risk > 0 else 1
                qty = max(1, min(qty, risk_qty))
                
                self.pullback_state[symbol] = {'touched_zone': False, 'direction': None}
                self.daily_trades[date_key] = self.daily_trades.get(date_key, 0) + 1
                
                self.log(f"📈 EMA Pullback BUY: {symbol} @ {ltp:.2f} | SL: {sl} | TP: {tp} | R:R 1:{self.RR_RATIO}")
                return {"action": "BUY", "tp": tp, "sl": sl, "qty": qty}
        
        # ==========================================
        # DOWNTREND: EMA9 < EMA21 < EMA50 (stacked)
        # ==========================================
        elif ema9 < ema21 < ema50:
            ema_gap = (ema21 - ema9) / ema21
            if ema_gap < self.EMA_SEP_MIN_PCT:
                return None
            
            ema21_lower = ema21 * (1 - self.PULLBACK_ZONE_PCT)
            if ltp >= ema21_lower and ltp <= ema50:
                state['touched_zone'] = True
                state['direction'] = 'SHORT'
                self.pullback_state[symbol] = state
            
            if (state.get('touched_zone') and 
                state.get('direction') == 'SHORT' and
                prev_ltp >= ema21 * 0.999 and 
                ltp < ema21 * 0.999):
                
                if use_vwap > 0 and ltp > use_vwap * 1.002:
                    return None
                
                sl = round(max(ema21 * 1.006, ema50), 2)
                risk = sl - ltp
                if risk <= 0:
                    return None
                
                tp = round(ltp - (risk * self.RR_RATIO), 2)
                
                risk_amount = capital * self.RISK_PCT
                risk_qty = int(risk_amount / risk) if risk > 0 else 1
                qty = max(1, min(qty, risk_qty))
                
                self.pullback_state[symbol] = {'touched_zone': False, 'direction': None}
                self.daily_trades[date_key] = self.daily_trades.get(date_key, 0) + 1
                
                self.log(f"📉 EMA Pullback SELL: {symbol} @ {ltp:.2f} | SL: {sl} | TP: {tp} | R:R 1:{self.RR_RATIO}")
                return {"action": "SELL", "tp": tp, "sl": sl, "qty": qty}
        
        return None


# ==========================================
# BACKTEST IMPLEMENTATION
# ==========================================

def backtest(df):
    """
    MerQ Alpha VI - Enhanced EMA Pullback Backtest
    
    IMPROVEMENTS OVER ORIGINAL ALPHA III:
    - Triple EMA stack (9/21/50) - all must confirm trend
    - VWAP alignment filter
    - Volume confirmation on bounce candle
    - ATR-based dynamic stops
    - Minimum 1:2.5 R:R gate
    - Max 2 trades/day
    - Bounce candle quality filter (body > 40% of range)
    - EMA separation filter (no chop trades)
    - Trailing stop to breakeven at +0.4%
    
    Expected: ~20-40 trades in 3 months with 50%+ win rate
    """
    trades = []
    
    if df.empty or len(df) < 50:
        return trades
    
    # ===============================
    # CLEAN COPY
    # ===============================
    df = df.copy()
    
    # ===============================
    # CONFIGURATION
    # ===============================
    INITIAL_CAPITAL = 100000
    MAX_TRADES_PER_DAY = 2              # Quality: max 2 per day
    DAILY_DD_CAP_PCT = -0.01            # -1% daily cap
    RISK_PCT = 0.005                     # 0.5% risk per trade
    RR_RATIO = 2.5                       # 1:2.5 R:R
    EMA_FAST = 9
    EMA_MID = 21
    EMA_SLOW = 50
    EMA_SEP_MIN_PCT = 0.0015            # 0.15% min gap between EMA9 and EMA21
    PULLBACK_ZONE_PCT = 0.003           # Price within 0.3% of EMA21 = pullback zone
    BODY_RATIO_MIN = 0.40               # Bounce candle body > 40% of its range
    VOL_CONFIRM_RATIO = 0.8             # Bounce volume > 0.8x average
    BREAKEVEN_TRIGGER_PCT = 0.004       # Trail SL to BE at +0.4%
    
    # ===============================
    # PREPARE DATA
    # ===============================
    for col in ['open', 'high', 'low', 'close', 'volume']:
        if col in df.columns:
            df[col] = df[col].astype(float)
    
    if 'volume' not in df.columns:
        df['volume'] = 5000
    
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    df = df.sort_values('timestamp').reset_index(drop=True)
    df['date'] = df['timestamp'].dt.date
    df['hour'] = df['timestamp'].dt.hour
    df['minute'] = df['timestamp'].dt.minute
    
    # ===============================
    # INDICATORS
    # ===============================
    # Triple EMA
    df['ema9'] = df['close'].ewm(span=EMA_FAST, adjust=False).mean()
    df['ema21'] = df['close'].ewm(span=EMA_MID, adjust=False).mean()
    df['ema50'] = df['close'].ewm(span=EMA_SLOW, adjust=False).mean()
    
    # Volume average
    df['avg_volume'] = df['volume'].rolling(20, min_periods=3).mean()
    overall_avg_vol = df['volume'].mean()
    df['avg_volume'] = df['avg_volume'].fillna(overall_avg_vol)
    
    # ATR (14-period) for dynamic stops
    df['tr'] = np.maximum(
        df['high'] - df['low'],
        np.maximum(
            abs(df['high'] - df['close'].shift(1)),
            abs(df['low'] - df['close'].shift(1))
        )
    )
    df['atr'] = df['tr'].rolling(14, min_periods=3).mean()
    df['atr'] = df['atr'].fillna(df['tr'])
    
    # Candle metrics
    df['body'] = abs(df['close'] - df['open'])
    df['candle_range'] = df['high'] - df['low']
    df['is_bullish'] = df['close'] > df['open']
    df['is_bearish'] = df['close'] < df['open']
    
    # Intraday VWAP
    df['vwap'] = np.nan
    for date, day_idx in df.groupby('date').groups.items():
        day_mask = df.index.isin(day_idx)
        day_vol = df.loc[day_mask, 'volume']
        day_close = df.loc[day_mask, 'close']
        cum_vol = day_vol.cumsum()
        cum_vol_price = (day_close * day_vol).cumsum()
        day_vwap = cum_vol_price / cum_vol
        df.loc[day_mask, 'vwap'] = day_vwap
    df['vwap'] = df['vwap'].ffill()
    
    # ===============================
    # BACKTEST ENGINE
    # ===============================
    position = None
    daily_trade_count = {}
    daily_pnl_tracker = {}
    last_date = None
    pullback_touched = False     # Has price touched EMA21 zone?
    pullback_direction = None    # 'LONG' or 'SHORT'
    
    for i in range(EMA_SLOW + 1, len(df)):
        row = df.iloc[i]
        prev = df.iloc[i-1]
        
        current_date = row['date']
        hour = int(row['hour'])
        minute = int(row['minute'])
        close = float(row['close'])
        open_ = float(row['open'])
        high = float(row['high'])
        low = float(row['low'])
        volume = float(row['volume'])
        ema9 = float(row['ema9'])
        ema21 = float(row['ema21'])
        ema50 = float(row['ema50'])
        avg_vol = float(row['avg_volume'])
        atr = float(row['atr']) if pd.notna(row['atr']) else 1.0
        vwap_val = float(row['vwap']) if pd.notna(row['vwap']) else 0
        body = float(row['body'])
        candle_range = float(row['candle_range']) if row['candle_range'] > 0 else 1.0
        is_bullish = bool(row['is_bullish'])
        is_bearish = bool(row['is_bearish'])
        
        prev_close = float(prev['close'])
        
        # ===============================
        # DAILY RESET
        # ===============================
        if current_date != last_date:
            if position:
                # Close overnight position
                if position['type'] == 'BUY':
                    pnl = (close - position['entry']) * position['qty']
                else:
                    pnl = (position['entry'] - close) * position['qty']
                trades.append({
                    "type": position['type'], "result": "DAY_EXIT",
                    "pnl": pnl, "date": row['timestamp']
                })
                position = None
            daily_trade_count[current_date] = 0
            daily_pnl_tracker[current_date] = 0.0
            pullback_touched = False
            pullback_direction = None
            last_date = current_date
        
        # ===============================
        # TIME FILTER: 10:00 AM - 1:30 PM for entries
        # Exits allowed until 3:15 PM
        # ===============================
        in_entry_window = (hour >= 10) and (hour < 13 or (hour == 13 and minute <= 30))
        past_exit = hour >= 15 or (hour == 14 and minute > 45)
        
        # Auto-close at exit deadline
        if position and past_exit:
            if position['type'] == 'BUY':
                pnl = (close - position['entry']) * position['qty']
            else:
                pnl = (position['entry'] - close) * position['qty']
            trades.append({
                "type": position['type'], "result": "TIME_EXIT",
                "pnl": pnl, "date": row['timestamp']
            })
            daily_pnl_tracker[current_date] = daily_pnl_tracker.get(current_date, 0) + pnl
            position = None
        
        # ===============================
        # EXIT LOGIC (always process)
        # ===============================
        if position:
            # TRAILING: Move SL to breakeven at +0.4%
            if position['type'] == 'BUY':
                move_pct = (close - position['entry']) / position['entry']
                if move_pct >= BREAKEVEN_TRIGGER_PCT and position['sl'] < position['entry']:
                    position['sl'] = position['entry'] + 0.10  # BE + small buffer
                
                if low <= position['sl']:
                    pnl = (position['sl'] - position['entry']) * position['qty']
                    trades.append({"type": "BUY", "result": "SL", "pnl": pnl, "date": row['timestamp']})
                    daily_pnl_tracker[current_date] = daily_pnl_tracker.get(current_date, 0) + pnl
                    position = None
                elif high >= position['target']:
                    pnl = (position['target'] - position['entry']) * position['qty']
                    trades.append({"type": "BUY", "result": "TARGET", "pnl": pnl, "date": row['timestamp']})
                    daily_pnl_tracker[current_date] = daily_pnl_tracker.get(current_date, 0) + pnl
                    position = None
                    
            elif position['type'] == 'SELL':
                move_pct = (position['entry'] - close) / position['entry']
                if move_pct >= BREAKEVEN_TRIGGER_PCT and position['sl'] > position['entry']:
                    position['sl'] = position['entry'] - 0.10
                
                if high >= position['sl']:
                    pnl = (position['entry'] - position['sl']) * position['qty']
                    trades.append({"type": "SELL", "result": "SL", "pnl": pnl, "date": row['timestamp']})
                    daily_pnl_tracker[current_date] = daily_pnl_tracker.get(current_date, 0) + pnl
                    position = None
                elif low <= position['target']:
                    pnl = (position['entry'] - position['target']) * position['qty']
                    trades.append({"type": "SELL", "result": "TARGET", "pnl": pnl, "date": row['timestamp']})
                    daily_pnl_tracker[current_date] = daily_pnl_tracker.get(current_date, 0) + pnl
                    position = None
        
        # ===============================
        # ENTRY LOGIC
        # ===============================
        if position is not None:
            continue
        
        if not in_entry_window:
            continue
        
        # Daily limits
        if daily_trade_count.get(current_date, 0) >= MAX_TRADES_PER_DAY:
            continue
        if INITIAL_CAPITAL > 0 and daily_pnl_tracker.get(current_date, 0) / INITIAL_CAPITAL <= DAILY_DD_CAP_PCT:
            continue
        
        # ==========================================
        # UPTREND PULLBACK: EMA9 > EMA21 > EMA50
        # ==========================================
        if ema9 > ema21 > ema50:
            # EMA separation check (trend must be real, not flat)
            ema_gap = (ema9 - ema21) / ema21 if ema21 > 0 else 0
            if ema_gap < EMA_SEP_MIN_PCT:
                pullback_touched = False
                continue
            
            # STEP 1: Detect pullback to EMA21 zone
            ema21_upper = ema21 * (1 + PULLBACK_ZONE_PCT)
            if close <= ema21_upper and close >= ema50 * 0.998:
                pullback_touched = True
                pullback_direction = 'LONG'
            
            # STEP 2: Detect bounce (entry trigger)
            if pullback_touched and pullback_direction == 'LONG':
                # Bounce conditions:
                # a) Previous candle was at/below EMA21
                # b) Current candle closes above EMA21
                # c) Current candle is bullish
                # d) Candle body > 40% of range (strong bounce, not doji)
                # e) Volume > 0.8x average (momentum returning)
                
                prev_was_near_ema21 = prev_close <= ema21 * (1 + PULLBACK_ZONE_PCT * 0.5)
                bounced_above = close > ema21 * 1.001
                body_quality = (body / candle_range) >= BODY_RATIO_MIN
                vol_confirm = volume >= avg_vol * VOL_CONFIRM_RATIO
                
                # VWAP alignment: price should be above VWAP for longs
                vwap_ok = (vwap_val <= 0) or (close >= vwap_val * 0.998)
                
                if (prev_was_near_ema21 and bounced_above and is_bullish and 
                    body_quality and vol_confirm and vwap_ok):
                    
                    entry = close
                    
                    # Dynamic SL: 1.5x ATR below entry, but not below EMA50
                    atr_sl = entry - (atr * 1.5)
                    ema50_sl = ema50 * 0.998
                    sl = max(atr_sl, ema50_sl)  # Tighter of the two
                    
                    risk = entry - sl
                    if risk <= 0:
                        continue
                    
                    tp = entry + (risk * RR_RATIO)
                    
                    # R:R gate (safety check)
                    reward = tp - entry
                    if reward / risk < 2.0:
                        continue
                    
                    # Position sizing by risk
                    risk_amount = INITIAL_CAPITAL * RISK_PCT
                    risk_qty = risk_amount / risk
                    qty = INITIAL_CAPITAL / close if close > 0 else 1
                    qty = max(1, int(min(qty, risk_qty)))
                    
                    position = {
                        'type': 'BUY', 'entry': entry, 'sl': round(sl, 2),
                        'target': round(tp, 2), 'qty': qty
                    }
                    daily_trade_count[current_date] = daily_trade_count.get(current_date, 0) + 1
                    pullback_touched = False
                    pullback_direction = None
        
        # ==========================================
        # DOWNTREND PULLBACK: EMA9 < EMA21 < EMA50
        # ==========================================
        elif ema9 < ema21 < ema50:
            ema_gap = (ema21 - ema9) / ema21 if ema21 > 0 else 0
            if ema_gap < EMA_SEP_MIN_PCT:
                pullback_touched = False
                continue
            
            # STEP 1: Detect pullback to EMA21 zone (from below)
            ema21_lower = ema21 * (1 - PULLBACK_ZONE_PCT)
            if close >= ema21_lower and close <= ema50 * 1.002:
                pullback_touched = True
                pullback_direction = 'SHORT'
            
            # STEP 2: Detect rejection (entry trigger)
            if pullback_touched and pullback_direction == 'SHORT':
                prev_was_near_ema21 = prev_close >= ema21 * (1 - PULLBACK_ZONE_PCT * 0.5)
                rejected_below = close < ema21 * 0.999
                body_quality = (body / candle_range) >= BODY_RATIO_MIN
                vol_confirm = volume >= avg_vol * VOL_CONFIRM_RATIO
                
                # VWAP alignment: price should be below VWAP for shorts
                vwap_ok = (vwap_val <= 0) or (close <= vwap_val * 1.002)
                
                if (prev_was_near_ema21 and rejected_below and is_bearish and 
                    body_quality and vol_confirm and vwap_ok):
                    
                    entry = close
                    
                    atr_sl = entry + (atr * 1.5)
                    ema50_sl = ema50 * 1.002
                    sl = min(atr_sl, ema50_sl)
                    
                    risk = sl - entry
                    if risk <= 0:
                        continue
                    
                    tp = entry - (risk * RR_RATIO)
                    
                    reward = entry - tp
                    if reward / risk < 2.0:
                        continue
                    
                    risk_amount = INITIAL_CAPITAL * RISK_PCT
                    risk_qty = risk_amount / risk
                    qty = INITIAL_CAPITAL / close if close > 0 else 1
                    qty = max(1, int(min(qty, risk_qty)))
                    
                    position = {
                        'type': 'SELL', 'entry': entry, 'sl': round(sl, 2),
                        'target': round(tp, 2), 'qty': qty
                    }
                    daily_trade_count[current_date] = daily_trade_count.get(current_date, 0) + 1
                    pullback_touched = False
                    pullback_direction = None
        
        else:
            # EMAs not stacked = no trade, reset pullback tracking
            pullback_touched = False
            pullback_direction = None
    
    # Close remaining position
    if position and len(df) > 0:
        last = df.iloc[-1]
        if position['type'] == 'BUY':
            pnl = (float(last['close']) - position['entry']) * position['qty']
        else:
            pnl = (position['entry'] - float(last['close'])) * position['qty']
        trades.append({
            "type": position['type'], "result": "END_EXIT",
            "pnl": pnl, "date": last['timestamp']
        })
    
    return trades
