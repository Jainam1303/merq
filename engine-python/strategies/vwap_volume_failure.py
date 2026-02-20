"""
MerQ Alpha VI - VWAP Mean Reversion (Volume Exhaustion)

REDESIGNED: High-conviction, low-frequency mean reversion
===========================================================
EDGE: Institutional VWAP anchoring + retail exhaustion

WHY IT WORKS:
- Institutions defend VWAP (their avg execution price)
- When retail pushes price away from VWAP with high volume,
  they run out of fuel (exhaustion)
- Price reverts to VWAP = our profit

KEY IMPROVEMENTS FROM V1:
- Max 1 trade/day (quality > quantity)
- 0.7% target with minimum 1:2 R:R
- Volume spike must be 2x+ avg (strict filter)
- VWAP deviation > 0.3% required (meaningful move)
- EMA20 trend filter (no counter-trend)
- Double confirmation (spike + 2 weak candles)
- Trailing stop to lock profits

SETUP RULES:
- Timeframe: Any (adapts to data)
- Trade window: 10:15 AM - 1:30 PM IST (best reversion hours)
- Max 1 trade/day (take the BEST setup only)
- Risk per trade: 0.5% of capital
- Minimum R:R: 1:2
- Daily DD cap: -1%

LONG SETUP (All must be true):
1. Price is > 0.3% BELOW VWAP (meaningful deviation)
2. EMA20 is flat or rising (not fighting strong downtrend)
3. Volume spike candle (>2x avg vol, RED candle)
4. Next 1-2 candles show exhaustion (smaller body/vol)
5. Entry: Close of confirmation candle
6. SL: Low of spike candle minus small buffer
7. Target: VWAP or 0.7% (whichever is first hit)
8. Trailing: Move SL to breakeven after 0.3% move

SHORT SETUP (Mirror of Long)

SKIP:
- Opening range > 1.5% (strong trend day)
- Before 10:15 AM (let pattern develop)
- After 1:30 PM (not enough time for reversion)
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
    MerQ Alpha VI - VWAP Mean Reversion (Volume Exhaustion) - Live Trading
    
    Builds candles from ticks, detects volume exhaustion near VWAP,
    and trades the mean reversion with strict R:R.
    """
    def __init__(self, config, logger, symbol_tokens):
        super().__init__(config, logger, symbol_tokens)
        
        # Candle Building State (3-minute candles from ticks)
        self.candle_history = {}      # {symbol: [list of completed candles]}
        self.current_candle = {}      # {symbol: {open, high, low, close, volume, start_time}}
        self.last_candle_minute = {}  # Track candle boundaries
        
        # VWAP Calculation State
        self.vwap_state = {}          # {symbol: {cum_vol, cum_vol_price, vwap}}
        
        # EMA State
        self.ema20 = {}               # {symbol: ema20_value}
        
        # Volume Tracking
        self.avg_volume = {}          # {symbol: rolling avg volume}
        
        # Risk Management State
        self.daily_traded = {}        # {symbol_date: bool} - only 1 trade/day
        self.daily_pnl = {}           # {date: cumulative_pnl_pct}
        self.last_trade_date = {}     # Track date resets
        
        # Signal State
        self.pending_signal = {}      # {symbol: {type, entry_price, sl, direction}}
        self.exhaustion_count = {}    # {symbol: consecutive_exhaustion_candles}
        
        # Strategy Parameters
        self.MAX_TRADES_PER_DAY = 1             # Quality over quantity
        self.DAILY_DD_CAP_PCT = -0.01           # -1%
        self.VOLUME_SPIKE_MULTIPLIER = 2.0      # Strict: 2x avg volume
        self.TARGET_PCT = 0.007                  # 0.7% fixed target
        self.RISK_PCT = 0.005                    # 0.5% risk per trade
        self.MIN_VWAP_DEVIATION = 0.003          # Price must be > 0.3% from VWAP
        self.MIN_RR_RATIO = 2.0                  # Minimum 1:2 risk-reward
        self.BREAKEVEN_TRIGGER_PCT = 0.003       # Move SL to BE after 0.3%
        self.FAILURE_BODY_RATIO = 0.6            # Failure candle < 60% of spike body
        
    def initialize(self, smartApi):
        """
        Fetch initial candle data for pattern detection and volume baseline.
        """
        self.log("Initializing MerQ Alpha VI (VWAP Mean Reversion)...")
        self.log("⚡ Redesigned: Quality > Quantity | Max 1 trade/day")
        self.log(f"📊 Target: {self.TARGET_PCT*100}% | Min R:R: 1:{self.MIN_RR_RATIO}")
        self.log(f"⏰ Trade window: 10:15 AM - 1:30 PM IST")
        
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
                    
                    # Calculate EMA20
                    if len(df) >= 20:
                        self.ema20[symbol] = float(df['close'].ewm(span=20, adjust=False).mean().iloc[-1])
                    else:
                        self.ema20[symbol] = float(df['close'].mean())
                    
                    # Initialize VWAP state from today's data
                    cum_vol = float(df['volume'].sum())
                    cum_vol_price = float((df['close'] * df['volume']).sum())
                    self.vwap_state[symbol] = {
                        'cum_vol': cum_vol,
                        'cum_vol_price': cum_vol_price,
                        'vwap': cum_vol_price / cum_vol if cum_vol > 0 else 0
                    }
                    
                    self.exhaustion_count[symbol] = 0
                    self.log(f"✅ VWAP Reversion init for {symbol} | {len(candles)} candles | AvgVol: {self.avg_volume[symbol]:.0f} | EMA20: {self.ema20[symbol]:.2f}")
                else:
                    self.candle_history[symbol] = []
                    self.avg_volume[symbol] = 10000
                    self.ema20[symbol] = 0
                    self.vwap_state[symbol] = {'cum_vol': 0, 'cum_vol_price': 0, 'vwap': 0}
                    self.exhaustion_count[symbol] = 0
                    self.log(f"⚠️ No data for {symbol}, will build from ticks", "WARNING")
                    
            except Exception as e:
                self.log(f"Error initializing {symbol}: {e}", "ERROR")
                self.candle_history[symbol] = []
                self.avg_volume[symbol] = 10000
                self.ema20[symbol] = 0
                self.vwap_state[symbol] = {'cum_vol': 0, 'cum_vol_price': 0, 'vwap': 0}
                self.exhaustion_count[symbol] = 0
        
        # Initialize daily risk counters
        today_str = str(today)
        self.daily_pnl[today_str] = 0.0
    
    def on_tick(self, symbol, ltp, prev_ltp, vwap, current_time):
        """
        Process each tick:
        1. Build 3-min candles from ticks
        2. Detect volume spike + exhaustion pattern
        3. Check pending entry triggers
        4. Apply strict risk management
        """
        # ==========================================
        # TIME FILTER: Only trade 10:15 AM - 1:30 PM
        # (Best mean reversion window)
        # ==========================================
        if current_time < datetime.time(10, 15) or current_time > datetime.time(13, 30):
            return None
        
        # ==========================================
        # DAILY RISK MANAGEMENT CHECK
        # ==========================================
        today_str = str(datetime.date.today())
        date_key = f"{symbol}_{today_str}"
        
        # Reset daily counters on new day
        if self.last_trade_date.get(symbol) != today_str:
            self.daily_traded[date_key] = False
            self.last_trade_date[symbol] = today_str
            if today_str not in self.daily_pnl:
                self.daily_pnl[today_str] = 0.0
        
        # Check: already traded today for this symbol
        if self.daily_traded.get(date_key, False):
            return None
        
        # Check daily DD cap
        capital = float(self.config.get('capital', 100000))
        if capital > 0 and self.daily_pnl.get(today_str, 0) / capital <= self.DAILY_DD_CAP_PCT:
            return None
        
        # ==========================================
        # USE BROKER VWAP IF AVAILABLE
        # ==========================================
        computed_vwap = vwap  # From WebSocket
        if computed_vwap <= 0:
            vs = self.vwap_state.get(symbol, {})
            computed_vwap = vs.get('vwap', 0)
        
        if computed_vwap <= 0:
            return None
        
        # ==========================================
        # CHECK VWAP DEVIATION (must be > 0.3%)
        # ==========================================
        vwap_deviation = abs(ltp - computed_vwap) / computed_vwap if computed_vwap > 0 else 0
        if vwap_deviation < self.MIN_VWAP_DEVIATION:
            return None  # Not far enough from VWAP — no edge
        
        # ==========================================
        # PATTERN DETECTION (from candle history)
        # ==========================================
        candles = self.candle_history.get(symbol, [])
        if len(candles) < 4:
            return None
        
        avg_vol = self.avg_volume.get(symbol, 10000)
        ema = self.ema20.get(symbol, 0)
        
        # Look at last 3 completed candles
        spike_candle = candles[-3]   # The volume spike candle
        fail_1 = candles[-2]         # First exhaustion candle
        fail_2 = candles[-1]         # Second exhaustion candle (confirmation)
        
        spike_volume = float(spike_candle.get('volume', 0))
        spike_body = abs(float(spike_candle['close']) - float(spike_candle['open']))
        
        fail1_volume = float(fail_1.get('volume', 0))
        fail1_body = abs(float(fail_1['close']) - float(fail_1['open']))
        
        fail2_volume = float(fail_2.get('volume', 0))
        fail2_body = abs(float(fail_2['close']) - float(fail_2['open']))
        
        # ==========================================
        # LONG SETUP CHECK
        # ==========================================
        spike_is_bearish = float(spike_candle['close']) < float(spike_candle['open'])
        
        if (ltp < computed_vwap and                                           # Below VWAP
            (ema <= 0 or ltp > ema * 0.99) and                                # Not in strong downtrend (EMA filter)
            spike_is_bearish and                                               # Spike candle is bearish
            spike_volume > avg_vol * self.VOLUME_SPIKE_MULTIPLIER and         # Strong volume spike (2x+)
            spike_body > 0 and
            fail1_body < spike_body * self.FAILURE_BODY_RATIO and            # Exhaustion candle 1
            fail1_volume < spike_volume and                                    # Declining volume
            fail2_body < spike_body * self.FAILURE_BODY_RATIO and            # Exhaustion candle 2 (double confirm)
            fail2_volume < spike_volume and                                    # Still declining
            symbol not in self.pending_signal):
            
            entry_price = ltp
            sl_price = min(float(spike_candle['low']), float(fail_1['low']), float(fail_2['low']))
            sl_price = sl_price * 0.999  # Small buffer below
            
            # Calculate target
            vwap_target = computed_vwap
            fixed_target = ltp * (1 + self.TARGET_PCT)
            tp_price = min(vwap_target, fixed_target)  # Hit whichever comes first
            if tp_price <= entry_price:
                tp_price = fixed_target
            
            # R:R check
            risk = entry_price - sl_price
            reward = tp_price - entry_price
            if risk > 0 and reward / risk >= self.MIN_RR_RATIO:
                qty = max(1, int(capital / ltp)) if ltp > 0 else 1
                
                # Position size by risk
                risk_amount = capital * self.RISK_PCT
                risk_qty = int(risk_amount / risk) if risk > 0 else 1
                qty = max(1, min(qty, risk_qty))
                
                self.daily_traded[date_key] = True
                
                self.log(f"🟢 VWAP REVERSION LONG: {symbol} @ {ltp:.2f} | SL: {sl_price:.2f} | TP: {tp_price:.2f} | R:R 1:{reward/risk:.1f}")
                return {"action": "BUY", "tp": round(tp_price, 2), "sl": round(sl_price, 2), "qty": qty}
        
        # ==========================================
        # SHORT SETUP CHECK (Mirror)
        # ==========================================
        spike_is_bullish = float(spike_candle['close']) > float(spike_candle['open'])
        
        if (ltp > computed_vwap and                                            # Above VWAP
            (ema <= 0 or ltp < ema * 1.01) and                                # Not in strong uptrend
            spike_is_bullish and                                                # Spike candle is bullish
            spike_volume > avg_vol * self.VOLUME_SPIKE_MULTIPLIER and          # Strong volume spike
            spike_body > 0 and
            fail1_body < spike_body * self.FAILURE_BODY_RATIO and
            fail1_volume < spike_volume and
            fail2_body < spike_body * self.FAILURE_BODY_RATIO and
            fail2_volume < spike_volume and
            symbol not in self.pending_signal):
            
            entry_price = ltp
            sl_price = max(float(spike_candle['high']), float(fail_1['high']), float(fail_2['high']))
            sl_price = sl_price * 1.001  # Small buffer above
            
            vwap_target = computed_vwap
            fixed_target = ltp * (1 - self.TARGET_PCT)
            tp_price = max(vwap_target, fixed_target)
            if tp_price >= entry_price:
                tp_price = fixed_target
            
            risk = sl_price - entry_price
            reward = entry_price - tp_price
            if risk > 0 and reward / risk >= self.MIN_RR_RATIO:
                qty = max(1, int(capital / ltp)) if ltp > 0 else 1
                
                risk_amount = capital * self.RISK_PCT
                risk_qty = int(risk_amount / risk) if risk > 0 else 1
                qty = max(1, min(qty, risk_qty))
                
                self.daily_traded[date_key] = True
                
                self.log(f"🔴 VWAP REVERSION SHORT: {symbol} @ {ltp:.2f} | SL: {sl_price:.2f} | TP: {tp_price:.2f} | R:R 1:{reward/risk:.1f}")
                return {"action": "SELL", "tp": round(tp_price, 2), "sl": round(sl_price, 2), "qty": qty}
        
        return None


# ==========================================
# BACKTEST IMPLEMENTATION
# ==========================================

def backtest(df):
    """
    MerQ Alpha VI - VWAP Mean Reversion (Volume Exhaustion) Backtest
    
    High-conviction, low-frequency mean reversion strategy.
    Works with ANY timeframe. Adapts filters to data provided.
    
    Target: ~15-25 trades over 3 months with positive expectancy.
    Each trade aims for 0.7% with 1:2 R:R minimum.
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
    MAX_TRADES_PER_DAY = 1             # ONE trade per day max
    DAILY_DD_CAP_PCT = -0.01           # -1% daily DD cap
    VOLUME_SPIKE_MULTIPLIER = 2.0      # Strict: 2x average volume
    TARGET_PCT = 0.007                  # 0.7% target
    RISK_PCT = 0.005                    # 0.5% risk per trade
    MIN_RR_RATIO = 2.0                  # Minimum 1:2 risk-reward
    MIN_VWAP_DEVIATION = 0.003          # Price must be > 0.3% from VWAP
    OPENING_RANGE_MAX_PCT = 0.015       # 1.5% max OR (skip wild days)
    FAILURE_BODY_RATIO = 0.6            # Failure candle body < 60% of spike
    BREAKEVEN_TRIGGER_PCT = 0.003       # Trail SL to breakeven at +0.3%
    
    # Ensure float types
    for col in ['open', 'high', 'low', 'close', 'volume']:
        if col in df.columns:
            df[col] = df[col].astype(float)
    
    if 'volume' not in df.columns:
        df['volume'] = 1000

    df['timestamp'] = pd.to_datetime(df['timestamp'])
    df = df.sort_values('timestamp').reset_index(drop=True)
    df['date'] = df['timestamp'].dt.date
    df['hour'] = df['timestamp'].dt.hour
    df['minute'] = df['timestamp'].dt.minute
    
    # ===============================
    # EMA 20 (Trend Filter)
    # ===============================
    df['ema20'] = df['close'].ewm(span=20, adjust=False).mean()
    
    # ===============================
    # ROLLING AVG VOLUME
    # ===============================
    df['avg_volume'] = df['volume'].rolling(20, min_periods=3).mean()
    overall_avg_vol = df['volume'].mean()
    df['avg_volume'] = df['avg_volume'].fillna(overall_avg_vol)
    
    # ===============================
    # INTRADAY VWAP (per-day, index-aligned)
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
    # CANDLE METRICS
    # ===============================
    df['body'] = abs(df['close'] - df['open'])
    df['candle_range'] = df['high'] - df['low']
    
    # ===============================
    # DETECT TIMEFRAME
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
    daily_pnl_tracker = {}
    last_date = None
    skip_dates = set()
    
    # Pre-calculate trend day filter (opening range > 1.5%)
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
    
    for i in range(3, len(df)):  # Need 3 lookback candles
        row = df.iloc[i]              # Current candle (entry)
        fail_2 = df.iloc[i-1]        # Second exhaustion candle
        fail_1 = df.iloc[i-2]        # First exhaustion candle
        spike_row = df.iloc[i-3]     # Volume spike candle
        
        current_date = row['date']
        hour = int(row['hour'])
        minute = int(row['minute'])
        close = float(row['close'])
        high = float(row['high'])
        low = float(row['low'])
        vwap_val = float(row['vwap']) if pd.notna(row['vwap']) else 0
        avg_vol = float(row['avg_volume']) if pd.notna(row['avg_volume']) else overall_avg_vol
        ema20 = float(row['ema20']) if pd.notna(row['ema20']) else close
        
        # ===============================
        # DAILY RESET
        # ===============================
        if current_date != last_date:
            # Close overnight position
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
            daily_pnl_tracker[current_date] = 0.0
            last_date = current_date
        
        # ===============================
        # TIME FILTER: 10:15 AM - 1:30 PM (entries)
        # Allow exits until 3:00 PM
        # ===============================
        in_entry_window = (hour == 10 and minute >= 15) or (hour >= 11 and hour < 13) or (hour == 13 and minute <= 30)
        past_exit_deadline = hour >= 15 or (hour == 14 and minute > 45)
        
        # Auto-close at exit deadline
        if position and past_exit_deadline:
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
        
        # Skip if outside entry window and no position
        if not in_entry_window and position is None:
            continue
        
        # Skip trend days
        if current_date in skip_dates:
            if position is None:
                continue
        
        # ===============================
        # EXIT LOGIC (process first, always)
        # ===============================
        if position:
            # TRAILING STOP: Move SL to breakeven after 0.3% move
            if position['type'] == 'BUY':
                unrealized_pct = (close - position['entry']) / position['entry']
                if unrealized_pct >= BREAKEVEN_TRIGGER_PCT and position['sl'] < position['entry']:
                    position['sl'] = position['entry'] + 0.05  # Breakeven + tiny buffer
                    
                # SL Hit
                if low <= position['sl']:
                    pnl = (position['sl'] - position['entry']) * position['qty']
                    trades.append({"type": "BUY", "result": "SL", "pnl": pnl, "date": row['timestamp']})
                    daily_pnl_tracker[current_date] = daily_pnl_tracker.get(current_date, 0) + pnl
                    position = None
                # Target Hit
                elif high >= position['target']:
                    pnl = (position['target'] - position['entry']) * position['qty']
                    trades.append({"type": "BUY", "result": "TARGET", "pnl": pnl, "date": row['timestamp']})
                    daily_pnl_tracker[current_date] = daily_pnl_tracker.get(current_date, 0) + pnl
                    position = None
                    
            elif position['type'] == 'SELL':
                unrealized_pct = (position['entry'] - close) / position['entry']
                if unrealized_pct >= BREAKEVEN_TRIGGER_PCT and position['sl'] > position['entry']:
                    position['sl'] = position['entry'] - 0.05
                    
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
            
        # Daily trade limit: MAX 1
        if daily_trade_count.get(current_date, 0) >= MAX_TRADES_PER_DAY:
            continue
        
        # DD cap
        if INITIAL_CAPITAL > 0 and daily_pnl_tracker.get(current_date, 0) / INITIAL_CAPITAL <= DAILY_DD_CAP_PCT:
            continue
        
        if vwap_val <= 0 or avg_vol <= 0:
            continue
        
        # ===============================
        # VWAP DEVIATION CHECK (must be > 0.3%)
        # ===============================
        vwap_deviation = abs(close - vwap_val) / vwap_val
        if vwap_deviation < MIN_VWAP_DEVIATION:
            continue  # Not far enough — no edge
        
        # ALL 3 lookback candles must be same date
        if spike_row['date'] != current_date or fail_1['date'] != current_date or fail_2['date'] != current_date:
            continue
        
        # All lookback candles within trade hours
        if int(spike_row['hour']) < 10 or int(fail_1['hour']) < 10 or int(fail_2['hour']) < 10:
            continue
        
        # ===============================
        # SPIKE CANDLE ANALYSIS
        # ===============================
        spike_open = float(spike_row['open'])
        spike_close = float(spike_row['close'])
        spike_high = float(spike_row['high'])
        spike_low = float(spike_row['low'])
        spike_volume = float(spike_row['volume'])
        spike_body = abs(spike_close - spike_open)
        
        # ===============================
        # EXHAUSTION CANDLES ANALYSIS
        # ===============================
        f1_open = float(fail_1['open'])
        f1_close = float(fail_1['close'])
        f1_high = float(fail_1['high'])
        f1_low = float(fail_1['low'])
        f1_volume = float(fail_1['volume'])
        f1_body = abs(f1_close - f1_open)
        
        f2_open = float(fail_2['open'])
        f2_close = float(fail_2['close'])
        f2_high = float(fail_2['high'])
        f2_low = float(fail_2['low'])
        f2_volume = float(fail_2['volume'])
        f2_body = abs(f2_close - f2_open)
        
        # Skip if spike has no body (doji)
        if spike_body <= 0:
            continue
        
        # ==========================================
        # LONG SETUP (Buy when price below VWAP + exhaustion)
        # ==========================================
        spike_is_bearish = spike_close < spike_open
        
        # Trend filter: EMA20 should be flat or rising (not fighting downtrend)
        ema_ok_long = close > ema20 * 0.99  # Within 1% of EMA or above
        
        if (close < vwap_val and                                       # Below VWAP
            ema_ok_long and                                             # Trend filter
            spike_is_bearish and                                        # Spike is RED
            spike_volume > avg_vol * VOLUME_SPIKE_MULTIPLIER and       # 2x+ volume spike
            f1_body < spike_body * FAILURE_BODY_RATIO and              # Exhaustion 1
            f1_volume < spike_volume and                                # Declining vol 1
            f2_body < spike_body * FAILURE_BODY_RATIO and              # Exhaustion 2 (double confirm)
            f2_volume < spike_volume):                                  # Declining vol 2
            
            entry = close
            # SL = lowest low of spike + exhaustion candles - buffer
            sl = min(spike_low, f1_low, f2_low) * 0.999
            
            # Target: VWAP or fixed %, whichever is closer
            vwap_tgt = vwap_val
            fixed_tgt = entry * (1 + TARGET_PCT)
            tp = min(vwap_tgt, fixed_tgt) if vwap_tgt > entry else fixed_tgt
            
            risk = entry - sl
            reward = tp - entry
            
            # R:R GATE: Must be at least 1:2
            if risk > 0 and reward > 0 and reward / risk >= MIN_RR_RATIO:
                risk_amount = INITIAL_CAPITAL * RISK_PCT
                risk_qty = risk_amount / risk
                qty = INITIAL_CAPITAL / close if close > 0 else 1
                qty = max(1, int(min(qty, risk_qty)))
                
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
            ema_ok_short = close < ema20 * 1.01
            
            if (close > vwap_val and                                       # Above VWAP
                ema_ok_short and                                            # Trend filter
                spike_is_bullish and                                        # Spike is GREEN
                spike_volume > avg_vol * VOLUME_SPIKE_MULTIPLIER and       # 2x+ volume
                f1_body < spike_body * FAILURE_BODY_RATIO and
                f1_volume < spike_volume and
                f2_body < spike_body * FAILURE_BODY_RATIO and
                f2_volume < spike_volume):
                
                entry = close
                sl = max(spike_high, f1_high, f2_high) * 1.001
                
                vwap_tgt = vwap_val
                fixed_tgt = entry * (1 - TARGET_PCT)
                tp = max(vwap_tgt, fixed_tgt) if vwap_tgt < entry else fixed_tgt
                
                risk = sl - entry
                reward = entry - tp
                
                if risk > 0 and reward > 0 and reward / risk >= MIN_RR_RATIO:
                    risk_amount = INITIAL_CAPITAL * RISK_PCT
                    risk_qty = risk_amount / risk
                    qty = INITIAL_CAPITAL / close if close > 0 else 1
                    qty = max(1, int(min(qty, risk_qty)))
                    
                    position = {
                        'type': 'SELL', 'entry': entry, 'sl': sl,
                        'target': tp, 'qty': qty
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
