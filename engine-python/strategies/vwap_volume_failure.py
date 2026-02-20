"""
MerQ Alpha VI - VWAP + Volume Failure Scalping Strategy

HIGH WIN-RATE + LOW DRAWDOWN INTRADAY STRATEGY
================================================
Core Concept: Trade FAILURE, not breakout.
- Institutions anchor VWAP
- Retail chases momentum  
- Volume spikes -> move stalls
- Price snaps back to VWAP

SETUP RULES:
- Timeframe: 3-minute candles
- Trade window: 10:00 AM - 2:30 PM IST
- Risk per trade: 0.25-0.4%
- Max trades/day: 3
- 2 consecutive losses = STOP for the day
- Daily DD cap: -0.8%

LONG SETUP (All must be true):
1. Market is NOT trending hard (ADX filter)
2. Price goes BELOW VWAP
3. One large RED candle with volume spike (>1.5x avg volume)
4. Next candle: Smaller body, lower volume, fails to continue down
5. Entry: Buy above HIGH of the failure candle
6. SL: Low of the failure candle (fixed, no mercy)
7. Target: VWAP or fixed 0.3%

SHORT SETUP (Mirror):
1. Price ABOVE VWAP
2. Big GREEN candle + volume spike
3. Failure candle (smaller body, lower vol, fails to continue up)
4. Short below its LOW
5. Target: VWAP

SKIP CONDITIONS:
- One-directional move from open (trend day)
- VWAP never tested
- Opening range > 1%
- News/event spikes
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
    MerQ Alpha VI - VWAP + Volume Failure Scalping (Live Trading)
    
    This strategy builds 3-minute candles from tick data,
    detects volume spike + failure pattern, and trades the
    mean reversion back to VWAP.
    """
    def __init__(self, config, logger, symbol_tokens):
        super().__init__(config, logger, symbol_tokens)
        
        # Candle Building State (3-minute candles from ticks)
        self.candle_history = {}      # {symbol: [list of completed 3-min candles]}
        self.current_candle = {}      # {symbol: {open, high, low, close, volume, start_time}}
        self.last_candle_minute = {}  # Track candle boundaries
        
        # VWAP Calculation State
        self.vwap_state = {}          # {symbol: {cum_vol, cum_vol_price}}
        
        # Volume Tracking
        self.avg_volume = {}          # {symbol: rolling avg volume}
        
        # Risk Management State
        self.daily_trades = {}        # {symbol_date: count}
        self.daily_losses = {}        # {symbol_date: consecutive_loss_count}
        self.daily_pnl = {}           # {date: cumulative_pnl_pct}
        self.last_trade_date = {}     # Track date resets
        
        # Signal State
        self.pending_signal = {}      # {symbol: {type, entry_price, sl, direction}}
        
        # Strategy Parameters
        self.MAX_TRADES_PER_DAY = 3
        self.MAX_CONSECUTIVE_LOSSES = 2
        self.DAILY_DD_CAP_PCT = -0.008    # -0.8%
        self.VOLUME_SPIKE_MULTIPLIER = 1.5
        self.TARGET_PCT = 0.003            # 0.3% fixed target
        self.RISK_PCT = 0.003              # 0.3% risk per trade
        self.OPENING_RANGE_MAX_PCT = 0.01  # 1% max opening range
        
    def initialize(self, smartApi):
        """
        Fetch initial 3-minute candle data for pattern detection and volume baseline.
        """
        self.log("Initializing MerQ Alpha VI (VWAP + Volume Failure Scalping)...")
        self.log("⚡ Strategy: Trade FAILURE, not breakout")
        self.log(f"📊 Max trades/day: {self.MAX_TRADES_PER_DAY} | DD Cap: {self.DAILY_DD_CAP_PCT*100}%")
        self.log(f"⏰ Trade window: 10:00 AM - 2:30 PM IST")
        
        ist_now = datetime.datetime.utcnow() + datetime.timedelta(hours=5, minutes=30)
        today = ist_now.date()
        
        for symbol in self.config.get('symbols', []):
            token = self.symbol_tokens.get(symbol)
            if not token:
                self.log(f"Skipping {symbol}: No token", "WARNING")
                continue
            
            try:
                time_module.sleep(0.5)  # Rate limit
                
                params = {
                    "exchange": "NSE",
                    "symboltoken": token,
                    "interval": "THREE_MINUTE",
                    "fromdate": f"{today} 09:15",
                    "todate": f"{today} 15:30"
                }
                res = smartApi.getCandleData(params)
                
                if res and res.get('status') and res.get('data'):
                    df = pd.DataFrame(res['data'], columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])
                    for col in ['open', 'high', 'low', 'close', 'volume']:
                        df[col] = df[col].astype(float)
                    
                    # Store candle history
                    candles = df.to_dict('records')
                    self.candle_history[symbol] = candles
                    
                    # Calculate average volume (baseline for spike detection)
                    if len(df) >= 5:
                        self.avg_volume[symbol] = float(df['volume'].rolling(20, min_periods=5).mean().iloc[-1])
                    else:
                        self.avg_volume[symbol] = float(df['volume'].mean()) if len(df) > 0 else 10000
                    
                    # Initialize VWAP state from today's data
                    cum_vol = float(df['volume'].sum())
                    cum_vol_price = float((df['close'] * df['volume']).sum())
                    self.vwap_state[symbol] = {
                        'cum_vol': cum_vol,
                        'cum_vol_price': cum_vol_price,
                        'vwap': cum_vol_price / cum_vol if cum_vol > 0 else 0
                    }
                    
                    # Check trend day filter (opening range)
                    if len(df) >= 2:
                        open_price = float(df.iloc[0]['open'])
                        or_high = float(df.iloc[:5]['high'].max())  # First 15 min
                        or_low = float(df.iloc[:5]['low'].min())
                        or_range_pct = (or_high - or_low) / open_price if open_price > 0 else 0
                        
                        if or_range_pct > self.OPENING_RANGE_MAX_PCT:
                            self.log(f"⚠️ {symbol}: Opening range {or_range_pct*100:.2f}% > 1% - TREND DAY filter active", "WARNING")
                    
                    self.log(f"✅ VWAP Failure initialized for {symbol} | {len(candles)} candles | AvgVol: {self.avg_volume[symbol]:.0f}")
                else:
                    self.candle_history[symbol] = []
                    self.avg_volume[symbol] = 10000
                    self.vwap_state[symbol] = {'cum_vol': 0, 'cum_vol_price': 0, 'vwap': 0}
                    self.log(f"⚠️ No data for {symbol}, will build from ticks", "WARNING")
                    
            except Exception as e:
                self.log(f"Error initializing {symbol}: {e}", "ERROR")
                self.candle_history[symbol] = []
                self.avg_volume[symbol] = 10000
                self.vwap_state[symbol] = {'cum_vol': 0, 'cum_vol_price': 0, 'vwap': 0}
        
        # Initialize daily risk counters
        today_str = str(today)
        self.daily_pnl[today_str] = 0.0
    
    def on_tick(self, symbol, ltp, prev_ltp, vwap, current_time):
        """
        Process each tick:
        1. Build 3-min candles from ticks
        2. Detect volume spike + failure pattern
        3. Check pending entry triggers
        4. Apply risk management filters
        """
        # ==========================================
        # TIME FILTER: Only trade 10:00 AM - 2:30 PM
        # ==========================================
        if current_time < datetime.time(10, 0) or current_time > datetime.time(14, 30):
            return None
        
        # ==========================================
        # DAILY RISK MANAGEMENT CHECK
        # ==========================================
        today_str = str(datetime.date.today())
        date_key = f"{symbol}_{today_str}"
        
        # Reset daily counters on new day
        if self.last_trade_date.get(symbol) != today_str:
            self.daily_trades[date_key] = 0
            self.daily_losses[date_key] = 0
            self.last_trade_date[symbol] = today_str
            if today_str not in self.daily_pnl:
                self.daily_pnl[today_str] = 0.0
        
        # Check max trades per day
        if self.daily_trades.get(date_key, 0) >= self.MAX_TRADES_PER_DAY:
            return None
        
        # Check consecutive losses (2 losses = STOP)
        if self.daily_losses.get(date_key, 0) >= self.MAX_CONSECUTIVE_LOSSES:
            return None
        
        # Check daily DD cap
        capital = float(self.config.get('capital', 100000))
        if capital > 0 and self.daily_pnl.get(today_str, 0) / capital <= self.DAILY_DD_CAP_PCT:
            return None
        
        # ==========================================
        # USE BROKER VWAP IF AVAILABLE
        # ==========================================
        computed_vwap = vwap  # From WebSocket (broker provides this)
        if computed_vwap <= 0:
            # Fallback to computed VWAP
            vs = self.vwap_state.get(symbol, {})
            computed_vwap = vs.get('vwap', 0)
        
        if computed_vwap <= 0:
            return None  # Can't trade without VWAP
        
        # ==========================================
        # CHECK PENDING ENTRY TRIGGER
        # ==========================================
        pending = self.pending_signal.get(symbol)
        if pending:
            if pending['direction'] == 'LONG':
                # Entry: Buy above HIGH of the failure candle
                if ltp > pending['entry_price']:
                    sl = pending['sl']
                    # Target: VWAP or fixed %
                    vwap_target = computed_vwap
                    fixed_target = ltp * (1 + self.TARGET_PCT)
                    
                    # Use closer target (VWAP if it's reasonable, else fixed)
                    if vwap_target > ltp and (vwap_target - ltp) < (ltp * 0.005):
                        tp = round(vwap_target, 2)
                    else:
                        tp = round(fixed_target, 2)
                    
                    qty = max(1, int(capital / ltp)) if ltp > 0 else 1
                    
                    # Apply position sizing based on risk
                    risk_amount = capital * self.RISK_PCT
                    risk_per_share = ltp - sl
                    if risk_per_share > 0:
                        risk_qty = int(risk_amount / risk_per_share)
                        qty = max(1, min(qty, risk_qty))
                    
                    self.daily_trades[date_key] = self.daily_trades.get(date_key, 0) + 1
                    del self.pending_signal[symbol]
                    
                    self.log(f"🟢 VWAP Failure LONG: {symbol} @ {ltp:.2f} | SL: {sl:.2f} | TP: {tp:.2f}")
                    return {"action": "BUY", "tp": tp, "sl": round(sl, 2), "qty": qty}
                    
            elif pending['direction'] == 'SHORT':
                # Entry: Short below LOW of the failure candle
                if ltp < pending['entry_price']:
                    sl = pending['sl']
                    vwap_target = computed_vwap
                    fixed_target = ltp * (1 - self.TARGET_PCT)
                    
                    if vwap_target < ltp and (ltp - vwap_target) < (ltp * 0.005):
                        tp = round(vwap_target, 2)
                    else:
                        tp = round(fixed_target, 2)
                    
                    qty = max(1, int(capital / ltp)) if ltp > 0 else 1
                    
                    risk_amount = capital * self.RISK_PCT
                    risk_per_share = sl - ltp
                    if risk_per_share > 0:
                        risk_qty = int(risk_amount / risk_per_share)
                        qty = max(1, min(qty, risk_qty))
                    
                    self.daily_trades[date_key] = self.daily_trades.get(date_key, 0) + 1
                    del self.pending_signal[symbol]
                    
                    self.log(f"🔴 VWAP Failure SHORT: {symbol} @ {ltp:.2f} | SL: {sl:.2f} | TP: {tp:.2f}")
                    return {"action": "SELL", "tp": tp, "sl": round(sl, 2), "qty": qty}
            
            # Invalidate stale pending signals (older than 2 candles = 6 minutes)
            if pending.get('created_time'):
                created = pending['created_time']
                now_minutes = current_time.hour * 60 + current_time.minute
                created_minutes = created.hour * 60 + created.minute
                if now_minutes - created_minutes > 6:
                    del self.pending_signal[symbol]
        
        # ==========================================
        # PATTERN DETECTION (from candle history)
        # ==========================================
        candles = self.candle_history.get(symbol, [])
        if len(candles) < 3:
            return None
        
        avg_vol = self.avg_volume.get(symbol, 10000)
        
        # Look at last 2 completed candles
        spike_candle = candles[-2]  # The volume spike candle
        failure_candle = candles[-1]  # The failure candle (current completed)
        
        spike_volume = float(spike_candle.get('volume', 0))
        failure_volume = float(failure_candle.get('volume', 0))
        
        spike_body = abs(float(spike_candle['close']) - float(spike_candle['open']))
        failure_body = abs(float(failure_candle['close']) - float(failure_candle['open']))
        
        spike_range = float(spike_candle['high']) - float(spike_candle['low'])
        failure_range = float(failure_candle['high']) - float(failure_candle['low'])
        
        # ==========================================
        # LONG SETUP CHECK
        # ==========================================
        # Conditions:
        # 1. Price below VWAP
        # 2. Spike candle: Large RED candle with volume spike
        # 3. Failure candle: Smaller body, lower volume, didn't continue down
        
        spike_is_bearish = float(spike_candle['close']) < float(spike_candle['open'])
        failure_failed_down = float(failure_candle['close']) >= float(failure_candle['open'])  # Not continuing down
        
        if (ltp < computed_vwap and                                         # Below VWAP
            spike_is_bearish and                                             # Spike candle is bearish
            spike_volume > avg_vol * self.VOLUME_SPIKE_MULTIPLIER and       # Volume spike
            spike_body > 0 and                                               # Has body
            failure_body < spike_body * 0.7 and                              # Smaller body (exhaustion)
            failure_volume < spike_volume and                                # Lower volume
            failure_failed_down and                                          # Failed to continue down
            symbol not in self.pending_signal):                              # No existing pending
            
            entry_price = float(failure_candle['high'])  # Buy above failure candle high
            sl_price = float(failure_candle['low'])      # SL at failure candle low
            
            # Validate risk:reward makes sense
            risk = entry_price - sl_price
            potential_reward = computed_vwap - entry_price
            
            if risk > 0 and (potential_reward > 0 or self.TARGET_PCT * entry_price > risk * 0.5):
                self.pending_signal[symbol] = {
                    'direction': 'LONG',
                    'entry_price': entry_price,
                    'sl': sl_price,
                    'created_time': current_time
                }
                self.log(f"📋 LONG Setup detected for {symbol} | Entry above: {entry_price:.2f} | SL: {sl_price:.2f} | VWAP: {computed_vwap:.2f}")
        
        # ==========================================
        # SHORT SETUP CHECK (Mirror)
        # ==========================================
        spike_is_bullish = float(spike_candle['close']) > float(spike_candle['open'])
        failure_failed_up = float(failure_candle['close']) <= float(failure_candle['open'])  # Not continuing up
        
        if (ltp > computed_vwap and                                          # Above VWAP
            spike_is_bullish and                                              # Spike candle is bullish
            spike_volume > avg_vol * self.VOLUME_SPIKE_MULTIPLIER and        # Volume spike
            spike_body > 0 and                                                # Has body
            failure_body < spike_body * 0.7 and                               # Smaller body
            failure_volume < spike_volume and                                 # Lower volume
            failure_failed_up and                                             # Failed to continue up
            symbol not in self.pending_signal):                               # No existing pending
            
            entry_price = float(failure_candle['low'])   # Short below failure candle low
            sl_price = float(failure_candle['high'])     # SL at failure candle high
            
            risk = sl_price - entry_price
            potential_reward = entry_price - computed_vwap
            
            if risk > 0 and (potential_reward > 0 or self.TARGET_PCT * entry_price > risk * 0.5):
                self.pending_signal[symbol] = {
                    'direction': 'SHORT',
                    'entry_price': entry_price,
                    'sl': sl_price,
                    'created_time': current_time
                }
                self.log(f"📋 SHORT Setup detected for {symbol} | Entry below: {entry_price:.2f} | SL: {sl_price:.2f} | VWAP: {computed_vwap:.2f}")
        
        return None


# ==========================================
# BACKTEST IMPLEMENTATION
# ==========================================

def backtest(df):
    """
    MerQ Alpha VI - VWAP + Volume Failure Scalping Backtest
    
    Works with ANY timeframe (3m, 5m, 15m, 30m, 60m).
    Adapts volume spike detection and pattern recognition to the data provided.
    
    - VWAP calculated intraday (per-day, index-aligned)
    - Volume spike detection (adaptive rolling window)
    - Failure candle pattern
    - Daily trade limits & DD control
    """
    trades = []
    
    if df.empty or len(df) < 5:
        return trades
    
    # ===============================
    # MAKE A CLEAN COPY
    # ===============================
    df = df.copy()
    
    # ===============================
    # CONFIGURATION
    # ===============================
    INITIAL_CAPITAL = 100000
    MAX_TRADES_PER_DAY = 3
    MAX_CONSECUTIVE_LOSSES = 2
    DAILY_DD_CAP_PCT = -0.008         # -0.8% daily
    VOLUME_SPIKE_MULTIPLIER = 1.3     # Slightly relaxed for larger timeframes
    TARGET_PCT = 0.003                 # 0.3%
    RISK_PCT = 0.003                   # 0.3% risk
    OPENING_RANGE_MAX_PCT = 0.01       # 1%
    FAILURE_BODY_RATIO = 0.85          # Failure candle body < 85% of spike body
    
    # Ensure float types
    for col in ['open', 'high', 'low', 'close', 'volume']:
        if col in df.columns:
            df[col] = df[col].astype(float)
    
    if 'volume' not in df.columns:
        df['volume'] = 1000  # Default volume if not available

    df['timestamp'] = pd.to_datetime(df['timestamp'])
    df = df.sort_values('timestamp').reset_index(drop=True)
    df['date'] = df['timestamp'].dt.date
    df['hour'] = df['timestamp'].dt.hour
    df['minute'] = df['timestamp'].dt.minute
    
    # ===============================
    # CALCULATE ROLLING AVG VOLUME
    # (min_periods=2 so we get values quickly)
    # ===============================
    df['avg_volume'] = df['volume'].rolling(20, min_periods=2).mean()
    # Fill any remaining NaN with overall mean
    overall_avg_vol = df['volume'].mean()
    df['avg_volume'] = df['avg_volume'].fillna(overall_avg_vol)
    
    # ===============================
    # INTRADAY VWAP CALCULATION
    # (Index-aligned to prevent mismatches)
    # ===============================
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
    # DERIVED COLUMNS
    # ===============================
    df['body'] = abs(df['close'] - df['open'])
    df['candle_range'] = df['high'] - df['low']
    
    # ===============================
    # DETECT TIMEFRAME (for adaptive opening range filter)
    # ===============================
    if len(df) >= 2:
        td = (df['timestamp'].iloc[1] - df['timestamp'].iloc[0]).total_seconds() / 60
        candle_minutes = max(1, int(td))
    else:
        candle_minutes = 5
    
    # Opening range = first ~15 minutes of the day
    or_candle_count = max(1, int(15 / candle_minutes))
    
    # ===============================
    # BACKTEST ENGINE
    # ===============================
    position = None
    daily_trade_count = {}
    daily_consecutive_losses = {}
    daily_pnl_tracker = {}
    last_date = None
    skip_dates = set()
    
    # Pre-calculate trend day filter (opening range > 1%)
    for date, day_df in df.groupby('date'):
        if len(day_df) < or_candle_count:
            continue
        first_candles = day_df.head(or_candle_count)
        or_high = first_candles['high'].max()
        or_low = first_candles['low'].min()
        open_price = first_candles.iloc[0]['open']
        if open_price > 0:
            or_range_pct = (or_high - or_low) / open_price
            if or_range_pct > OPENING_RANGE_MAX_PCT:
                skip_dates.add(date)
    
    for i in range(2, len(df)):
        row = df.iloc[i]
        prev_row = df.iloc[i-1]       # Failure candle
        spike_row = df.iloc[i-2]      # Spike candle
        
        current_date = row['date']
        hour = row['hour']
        minute = row['minute']
        close = float(row['close'])
        high = float(row['high'])
        low = float(row['low'])
        open_ = float(row['open'])
        vwap_val = float(row['vwap']) if pd.notna(row['vwap']) else 0
        avg_vol = float(row['avg_volume']) if pd.notna(row['avg_volume']) else overall_avg_vol
        
        # ===============================
        # DAILY RESET
        # ===============================
        if current_date != last_date:
            # Close any overnight position
            if position:
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
            daily_consecutive_losses[current_date] = 0
            daily_pnl_tracker[current_date] = 0.0
            last_date = current_date
        
        # ===============================
        # TIME FILTER: 10:00 AM - 2:30 PM
        # ===============================
        in_trade_window = (hour >= 10) and (hour < 14 or (hour == 14 and minute <= 30))
        past_window = (hour > 14 or (hour == 14 and minute > 30))
        
        if not in_trade_window:
            # Auto close position at end of window
            if position and past_window:
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
            continue
        
        # ===============================
        # SKIP TREND DAYS
        # ===============================
        if current_date in skip_dates:
            continue
        
        # ===============================
        # EXIT LOGIC (always process first)
        # ===============================
        if position:
            if position['type'] == 'BUY':
                if low <= position['sl']:
                    pnl = (position['sl'] - position['entry']) * position['qty']
                    trades.append({"type": "BUY", "result": "SL", "pnl": pnl, "date": row['timestamp']})
                    daily_pnl_tracker[current_date] = daily_pnl_tracker.get(current_date, 0) + pnl
                    daily_consecutive_losses[current_date] = daily_consecutive_losses.get(current_date, 0) + 1
                    position = None
                elif high >= position['target']:
                    pnl = (position['target'] - position['entry']) * position['qty']
                    trades.append({"type": "BUY", "result": "TARGET", "pnl": pnl, "date": row['timestamp']})
                    daily_pnl_tracker[current_date] = daily_pnl_tracker.get(current_date, 0) + pnl
                    daily_consecutive_losses[current_date] = 0
                    position = None
            elif position['type'] == 'SELL':
                if high >= position['sl']:
                    pnl = (position['entry'] - position['sl']) * position['qty']
                    trades.append({"type": "SELL", "result": "SL", "pnl": pnl, "date": row['timestamp']})
                    daily_pnl_tracker[current_date] = daily_pnl_tracker.get(current_date, 0) + pnl
                    daily_consecutive_losses[current_date] = daily_consecutive_losses.get(current_date, 0) + 1
                    position = None
                elif low <= position['target']:
                    pnl = (position['entry'] - position['target']) * position['qty']
                    trades.append({"type": "SELL", "result": "TARGET", "pnl": pnl, "date": row['timestamp']})
                    daily_pnl_tracker[current_date] = daily_pnl_tracker.get(current_date, 0) + pnl
                    daily_consecutive_losses[current_date] = 0
                    position = None
        
        # ===============================
        # ENTRY LOGIC
        # ===============================
        if position is not None:
            continue
        
        # Daily limits check
        if daily_trade_count.get(current_date, 0) >= MAX_TRADES_PER_DAY:
            continue
        if daily_consecutive_losses.get(current_date, 0) >= MAX_CONSECUTIVE_LOSSES:
            continue
        if INITIAL_CAPITAL > 0 and daily_pnl_tracker.get(current_date, 0) / INITIAL_CAPITAL <= DAILY_DD_CAP_PCT:
            continue
        
        if vwap_val <= 0 or avg_vol <= 0:
            continue
        
        # ENSURE both spike and failure candles are from the SAME date
        spike_date = spike_row['date']
        prev_date = prev_row['date']
        if spike_date != current_date or prev_date != current_date:
            continue
        
        # Also ensure spike and failure are within trade window (10:00-14:30)
        spike_hour = int(spike_row['hour'])
        prev_hour = int(prev_row['hour'])
        if spike_hour < 10 or prev_hour < 10:
            continue
        
        # Spike candle characteristics
        spike_open = float(spike_row['open'])
        spike_close = float(spike_row['close'])
        spike_volume = float(spike_row['volume'])
        spike_body = abs(spike_close - spike_open)
        
        # Failure candle characteristics
        fail_open = float(prev_row['open'])
        fail_close = float(prev_row['close'])
        fail_high = float(prev_row['high'])
        fail_low = float(prev_row['low'])
        fail_volume = float(prev_row['volume'])
        fail_body = abs(fail_close - fail_open)
        
        # Skip if spike has no body (doji)
        if spike_body <= 0:
            continue
        
        # ==========================================
        # LONG SETUP
        # ==========================================
        spike_is_bearish = spike_close < spike_open
        # Failure: smaller body OR opposite color (exhaustion signs)
        failure_shows_exhaustion_long = (fail_body < spike_body * FAILURE_BODY_RATIO) or (fail_close >= fail_open)
        
        if (close < vwap_val and                                                # Below VWAP
            spike_is_bearish and                                                 # Spike bearish
            spike_volume > avg_vol * VOLUME_SPIKE_MULTIPLIER and                # Volume spike
            fail_volume < spike_volume and                                       # Lower volume
            failure_shows_exhaustion_long):                                      # Shows exhaustion
            
            # Entry at close of current candle (confirmation)
            entry = close
            sl = fail_low       # SL at failure candle low
            
            # Target: VWAP or fixed %
            vwap_dist = vwap_val - entry
            fixed_dist = entry * TARGET_PCT
            
            if vwap_dist > 0 and vwap_dist < entry * 0.006:
                tp = vwap_val
            else:
                tp = entry + fixed_dist
            
            risk = entry - sl
            if risk > 0 and tp > entry:
                risk_amount = INITIAL_CAPITAL * RISK_PCT
                risk_qty = risk_amount / risk
                qty = INITIAL_CAPITAL / close if close > 0 else 1
                qty = min(qty, risk_qty)
                qty = max(1, int(qty))
                
                position = {
                    'type': 'BUY', 'entry': entry, 'sl': sl, 
                    'target': tp, 'qty': qty
                }
                daily_trade_count[current_date] = daily_trade_count.get(current_date, 0) + 1
        
        # ==========================================
        # SHORT SETUP (Mirror)
        # ==========================================
        elif position is None:
            spike_is_bullish = spike_close > spike_open
            failure_shows_exhaustion_short = (fail_body < spike_body * FAILURE_BODY_RATIO) or (fail_close <= fail_open)
            
            if (close > vwap_val and                                                # Above VWAP
                spike_is_bullish and                                                 # Spike bullish
                spike_volume > avg_vol * VOLUME_SPIKE_MULTIPLIER and                # Volume spike
                fail_volume < spike_volume and                                       # Lower volume
                failure_shows_exhaustion_short):                                     # Shows exhaustion
                
                entry = close       # Entry at close of current candle
                sl = fail_high      # SL at failure candle high
                
                vwap_dist = entry - vwap_val
                fixed_dist = entry * TARGET_PCT
                
                if vwap_dist > 0 and vwap_dist < entry * 0.006:
                    tp = vwap_val
                else:
                    tp = entry - fixed_dist
                
                risk = sl - entry
                if risk > 0 and tp < entry:
                    risk_amount = INITIAL_CAPITAL * RISK_PCT
                    risk_qty = risk_amount / risk
                    qty_sell = INITIAL_CAPITAL / close if close > 0 else 1
                    qty_sell = min(qty_sell, risk_qty)
                    qty_sell = max(1, int(qty_sell))
                    
                    position = {
                        'type': 'SELL', 'entry': entry, 'sl': sl, 
                        'target': tp, 'qty': qty_sell
                    }
                    daily_trade_count[current_date] = daily_trade_count.get(current_date, 0) + 1
    
    # Close any remaining position at end
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
