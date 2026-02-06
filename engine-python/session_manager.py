import threading
import requests
import time
import pandas as pd
from logzero import logger
from strategies import orb, ema_crossover
from SmartApi import SmartConnect
from SmartApi.smartWebSocketV2 import SmartWebSocketV2
import pyotp
import datetime

class TradingSession:
    def __init__(self, user_id, config, credentials):
        self.user_id = user_id
        self.config = config
        self.credentials = credentials
        self.active = False
        self.mode = 'PAPER' if config.get('simulated', True) else 'LIVE'
        self.strategy_name = config.get('strategy', 'orb')
        
        # State
        self.pnl = 0.0
        self.positions = []  # {symbol, qty, entry, type, pnl, status, time}
        self.logs = []
        self.trades_history = []
        self.signals_triggered = {}  # Track which symbols fired today {symbol_date: True}
        
        # ORB State (per symbol)
        self.orb_levels = {}  # {symbol: {or_high, or_low, calculated: bool}}
        self.ltp_cache = {}   # {symbol: last_traded_price}
        self.prev_ltp_cache = {}  # {symbol: previous_ltp} - for crossover detection
        
        # Connection
        self.smartApi = None
        self.sws = None  # WebSocket
        self.auth_token = None
        self.feed_token = None
        self.stop_event = threading.Event()
        self.thread = None
        self.ws_thread = None
        
        # Symbol Token Mapping
        self.symbol_tokens = {}  # {symbol: token}
        
        # Sync Throttle
        self.last_sync_time = 0

    def log(self, message, type="INFO"):
        timestamp = self._get_ist_time().strftime("%H:%M:%S")
        log_entry = f"{timestamp} - {type} - {message}"
        self.logs.append(log_entry)
        logger.info(log_entry)  # Also log to console
        # Keep only last 100 logs
        if len(self.logs) > 100: self.logs.pop(0)

    def start(self):
        if self.active: return
        self.log(f"Starting Session in {self.mode} mode...")
        
        # Mark as active immediately so UI updates
        self.active = True
        self.stop_event.clear()
        
        # Start background thread which will handle login + WebSocket
        self.thread = threading.Thread(target=self._login_and_run, daemon=True)
        self.thread.start()

    def _login_and_run(self):
        """Background thread: login, calculate ORB, then start WebSocket"""
        # 1. Login
        try:
            api_key = self.credentials.get('apiKey')
            client_code = self.credentials.get('clientCode')
            pwd = self.credentials.get('password')
            totp_key = self.credentials.get('totp')
            
            self.smartApi = SmartConnect(api_key=api_key)
            totp = pyotp.TOTP(totp_key).now()
            data = self.smartApi.generateSession(client_code, pwd, totp)
            
            if data['status']:
                self.auth_token = data['data']['jwtToken']
                self.feed_token = data['data']['feedToken']
                self.log("Angel One Login Successful", "SUCCESS")
            else:
                self.log(f"Login Failed: {data['message']}", "ERROR")
                self.active = False
                return
                
        except Exception as e:
            self.log(f"Login Exception: {e}", "ERROR")
            self.active = False
            return
        
        # 2. Load Symbol Tokens
        self._load_symbol_tokens()
        
        # 3. Calculate ORB Levels (need historical data)
        self._calculate_orb_levels()
        
        # 4. Start WebSocket for Live Data
        self._start_websocket()

    def _sync_to_backend(self):
        """Send live PnL and trades to Node.js backend via webhook"""
        try:
            # Throttle: Max 1 update per second
            if time.time() - self.last_sync_time < 1.0:
                return

            total_pnl = sum([p['pnl'] for p in self.positions if p['status'] == 'OPEN'])
            
            # Format trades for frontend
            clean_trades = []
            for p in self.positions:
                if p['status'] == 'OPEN':
                     # Map fields to match what frontend expects
                     clean_trades.append({
                         "entry_order_id": p.get('order_id', p.get('id', f"pos_{p['symbol']}")),
                         "symbol": p['symbol'],
                         "quantity": p['qty'],
                         "entry_price": p['entry'],
                         "tp": p.get('tp'),
                         "sl": p.get('sl'),
                         "pnl": round(p['pnl'], 2),
                         "status": p['status'],
                         "mode": p['type'], # matches frontend expectation
                         "timestamp": f"{p.get('date')} {p.get('time')}"
                     })

            payload = {
                "user_id": self.user_id,
                "pnl": round(total_pnl, 2),
                "trades": clean_trades
            }
            
            # Use backend internal URL
            requests.post('http://localhost:5001/webhook/tick', json=payload, timeout=2.0)
            self.last_sync_time = time.time()
            
        except Exception:
            pass # Silent fail to avoid interrupting trading loop
        
        # 5. Keep thread alive while active
        while self.active and not self.stop_event.is_set():
            self._sync_to_backend()
            time.sleep(1)

    def _load_symbol_tokens(self):
        """
        Load symbol tokens - For LIVE mode, always fetch from API for accuracy.
        For PAPER mode, use file cache as fallback.
        """
        symbols = self.config.get('symbols', [])
        
        # For LIVE mode, ALWAYS fetch fresh tokens from API
        if self.mode == "LIVE":
            self.log("🔍 LIVE MODE: Fetching fresh symbol tokens from Angel One API...", "INFO")
            self._fetch_tokens_from_api(symbols)
            self.log(f"✅ Token fetch complete. Loaded {len(self.symbol_tokens)}/{len(symbols)} tokens", "INFO")
            if len(self.symbol_tokens) < len(symbols):
                missing = [s for s in symbols if s not in self.symbol_tokens]
                self.log(f"⚠️  Missing tokens for: {', '.join(missing)}", "WARNING")
            return
        
        # For PAPER mode, try to use cached file first
        token_map = {}
        token_file_paths = [
            '../backend-node/token -symbol.txt',
            './token_symbol.txt',
            '/root/merq/backend-node/token -symbol.txt',
            '/home/ubuntu/merq/backend-node/token -symbol.txt'
        ]
        
        import os
        token_file = None
        for path in token_file_paths:
            if os.path.exists(path):
                token_file = path
                break
        
        if token_file:
            try:
                with open(token_file, 'r') as f:
                    for line in f:
                        parts = line.strip().split()
                        if len(parts) >= 2 and parts[0].isdigit():
                            token = parts[0]
                            symbol = parts[1]
                            token_map[symbol] = token
                            token_map[symbol.replace('-EQ', '')] = token
                self.log(f"Loaded {len(token_map)} tokens from file", "SUCCESS")
            except Exception as e:
                self.log(f"Error loading token file: {e}", "WARNING")
        
        # Map user's symbols to tokens
        not_found = []
        for sym in symbols:
            clean = sym.upper()
            if clean in token_map:
                self.symbol_tokens[sym] = token_map[clean]
            elif clean.replace('-EQ', '') in token_map:
                self.symbol_tokens[sym] = token_map[clean.replace('-EQ', '')]
            elif f"{clean}-EQ" in token_map:
                self.symbol_tokens[sym] = token_map[f"{clean}-EQ"]
            else:
                not_found.append(sym)
        
        # Fetch missing symbols from API
        if not_found:
            self._fetch_tokens_from_api(not_found)
        
        self.log(f"✓ Loaded tokens for {len(self.symbol_tokens)}/{len(symbols)} symbols")
        if len(self.symbol_tokens) < len(symbols):
            missing = [s for s in symbols if s not in self.symbol_tokens]
            self.log(f"Missing: {', '.join(missing[:5])}", "WARNING")

    def _fetch_tokens_from_api(self, symbols):
        """Fetch symbol tokens from Angel One searchScrip API"""
        for sym in symbols:
            try:
                clean = sym.upper().replace("-EQ", "")
                time.sleep(0.5)  # Rate limit: 2 requests per second
                
                search = self.smartApi.searchScrip("NSE", clean)
                
                if search and search.get('status') and search.get('data'):
                    data_list = search['data']
                    selected_script = None
                    
                    # 1. Try finding exact trading symbol match (e.g. "IGL-EQ")
                    target_symbol = f"{clean}-EQ"
                    for scrip in data_list:
                        if scrip['tradingsymbol'] == target_symbol:
                            selected_script = scrip
                            break
                            
                    # 2. If not found, try just exact name match on symbol name
                    if not selected_script:
                        for scrip in data_list:
                            if scrip['symboltoken'] and scrip['tradingsymbol'].endswith('-EQ'):
                                selected_script = scrip
                                break
                    
                    # 3. Fallback to first result but log warning
                    if not selected_script:
                        selected_script = data_list[0]
                        self.log(f"⚠️ Precise match not found for {sym}, using: {selected_script['tradingsymbol']}", "WARNING")

                    self.symbol_tokens[sym] = selected_script['symboltoken']
                    # ALSO store the actual trading symbol to use in orders
                    self.symbol_tokens[f"{sym}_TS"] = selected_script['tradingsymbol'] 
                    
                    self.log(f"✓ {sym} -> {selected_script['tradingsymbol']} (Token: {selected_script['symboltoken']})", "DEBUG")
                else:
                    self.log(f"⚠️ Could not find token for {sym}: {search}", "WARNING")
                    
            except Exception as e:
                self.log(f"❌ Token lookup failed for {sym}: {e}", "ERROR")

    def _get_ist_time(self):
        """Get current time in Indian Standard Time (UTC+5:30)"""
        utc_now = datetime.datetime.utcnow()
        ist_now = utc_now + datetime.timedelta(hours=5, minutes=30)
        return ist_now

    def _calculate_orb_levels(self):
        """
        NEW APPROACH: Skip REST API calls entirely!
        ORB levels will be calculated from WebSocket data in real-time.
        This eliminates all rate limiting issues.
        """
        symbols = self.config.get('symbols', [])
        
        # FIX: Use IST Time, not Server Time (UTC)
        ist_now = self._get_ist_time()
        current_time = ist_now.time()
        
        self.log(f"🕒 Current Time (IST): {current_time.strftime('%H:%M:%S')}", "INFO")
        
        # Check if we're before 9:30 (ORB period not complete)
        if current_time < datetime.time(9, 30):
            self.log(f"⏳ Market opens at 9:15. ORB will be calculated from live WebSocket data.", "INFO")
            # Initialize empty ORB levels - will be filled by WebSocket
            for symbol in symbols:
                if symbol in self.symbol_tokens:
                    self.orb_levels[symbol] = {
                        'or_high': 0,
                        'or_low': 999999999,
                        'or_mid': 0,
                        'collecting': True,  # Flag to collect data
                        'candles': []  # Store ticks for ORB calculation
                    }
            self.log(f"🚀 Starting WebSocket. Will calculate ORB from 9:15-9:30 ticks.", "SUCCESS")
        else:
            # Market already open - try to get data, but don't block if rate limited
            self.log(f"⚡ Market is open. Attempting quick ORB fetch...", "INFO")
            
            success_count = 0
            for symbol in symbols:
                if symbol not in self.symbol_tokens:
                    continue
                    
                token = self.symbol_tokens.get(symbol)
                # Use IST for date
                today = ist_now.date() 
                
                # RETRY LOGIC: Up to 3 attempts with increasing delays
                max_retries = 3
                for attempt in range(max_retries):
                    try:
                        params = {
                            "exchange": "NSE",
                            "symboltoken": token,
                            "interval": "FIVE_MINUTE",
                            "fromdate": f"{today.strftime('%Y-%m-%d')} 09:15",
                            "todate": f"{today.strftime('%Y-%m-%d')} 09:30"
                        }
                        
                        delay = 0.5 * (attempt + 1)  # 0.5s, 1s, 1.5s
                        time.sleep(delay)
                        res = self.smartApi.getCandleData(params)
                        
                        if res and res.get('status') and res.get('data'):
                            df = pd.DataFrame(res['data'], columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])
                            or_high = float(df['high'].max())
                            or_low = float(df['low'].min())
                            
                            self.orb_levels[symbol] = {
                                'or_high': or_high,
                                'or_low': or_low,
                                'or_mid': (or_high + or_low) / 2,
                                'collecting': False
                            }
                            success_count += 1
                            break  # Success, exit retry loop
                        else:
                            if attempt < max_retries - 1:
                                self.log(f"Retry {attempt+1}/{max_retries} for {symbol}...", "INFO")
                                continue  # Retry
                            else:
                                # All retries failed
                                self.log(f"Could not fetch ORB for {symbol} after {max_retries} attempts - trading disabled", "WARNING")
                                self.orb_levels[symbol] = {
                                    'or_high': 999999999,
                                    'or_low': 0,
                                    'or_mid': 0,
                                    'collecting': False
                                }
                    except Exception as e:
                        if attempt < max_retries - 1:
                            self.log(f"Exception for {symbol} (attempt {attempt+1}): {e}", "WARNING")
                            continue  # Retry
                        else:
                            self.log(f"Exception fetching ORB for {symbol}: {e} - trading disabled", "WARNING")
                            self.orb_levels[symbol] = {
                                'or_high': 999999999,
                                'or_low': 0,
                                'or_mid': 0,
                                'collecting': False
                            }
            
            if success_count > 0:
                self.log(f"✓ Got ORB data for {success_count} symbols from API", "SUCCESS")
        
        self.log(f"🚀 Ready! Starting WebSocket for real-time trading.", "SUCCESS")

    def _start_websocket(self):
        """Initialize and connect Angel One WebSocket for live data"""
        try:
            api_key = self.credentials.get('apiKey')
            client_code = self.credentials.get('clientCode')
            
            self.sws = SmartWebSocketV2(
                auth_token=self.auth_token,
                api_key=api_key,
                client_code=client_code,
                feed_token=self.feed_token
            )
            
            # Callbacks
            self.sws.on_open = self._on_ws_open
            self.sws.on_data = self._on_ws_data
            self.sws.on_error = self._on_ws_error
            self.sws.on_close = self._on_ws_close
            
            # Connect in separate thread
            self.ws_thread = threading.Thread(target=self.sws.connect, daemon=True)
            self.ws_thread.start()
            
            self.log("WebSocket Connecting...", "INFO")
            
        except Exception as e:
            self.log(f"WebSocket Init Error: {e}", "ERROR")
            # Fallback to polling if WebSocket fails
            self.log("Falling back to polling mode", "WARNING")
            self._run_polling_loop()

    def _on_ws_open(self, wsapp):
        """Called when WebSocket connects - subscribe to symbols"""
        self.log("WebSocket Connected", "SUCCESS")
        
        # Subscribe to all symbols
        tokens = list(self.symbol_tokens.values())
        if not tokens:
            self.log("No tokens to subscribe", "WARNING")
            return
        
        # Mode: 1=LTP, 2=Quote, 3=SnapQuote
        # Exchange Type: 1=NSE, 2=NFO, 3=BSE
        token_list = [{"exchangeType": 1, "tokens": tokens}]
        
        try:
            self.sws.subscribe("live_feed", 1, token_list)  # LTP mode
            self.log(f"Subscribed to {len(tokens)} symbols", "SUCCESS")
        except Exception as e:
            self.log(f"Subscribe Error: {e}", "ERROR")

    def _on_ws_data(self, wsapp, message):
        """Called when live tick data arrives"""
        try:
            # Message format: {subscription_mode, exchange_type, token, ltp, ...}
            token = str(message.get('token'))
            ltp = message.get('last_traded_price', 0) / 100  # Angel sends price * 100
            vwap = message.get('average_traded_price', 0) / 100 # VWAP
            
            # Find symbol for this token
            symbol = None
            for sym, tok in self.symbol_tokens.items():
                if tok == token:
                    symbol = sym
                    break
            
            if not symbol or ltp <= 0:
                return
            
            # Track previous LTP for crossover detection
            prev_ltp = self.prev_ltp_cache.get(symbol, 0)
            self.prev_ltp_cache[symbol] = ltp
            
            # Update LTP cache
            self.ltp_cache[symbol] = ltp
            
            # Update positions with live PnL
            self._update_position_pnl(symbol, ltp)
            
            # DYNAMIC ORB: Update ORB levels from WebSocket if we're collecting
            if symbol in self.orb_levels:
                orb = self.orb_levels[symbol]
                ist_now = self._get_ist_time()
                current_time = ist_now.time()
                
                # If collecting ORB data (9:15-9:30)
                if orb.get('collecting', False):
                    if datetime.time(9, 15) <= current_time <= datetime.time(9, 30):
                        # Update high/low from live ticks
                        if ltp > orb.get('or_high', 0):
                            orb['or_high'] = ltp
                        if ltp < orb.get('or_low', 999999999):
                            orb['or_low'] = ltp
                        orb['or_mid'] = (orb['or_high'] + orb['or_low']) / 2
                    
                    # After 9:30, stop collecting
                    elif current_time > datetime.time(9, 30) and orb['or_high'] > 0:
                        orb['collecting'] = False
                        self.log(f"📊 ORB {symbol}: High={orb['or_high']:.2f}, Low={orb['or_low']:.2f} (from WebSocket)", "SUCCESS")
                
                # Check for signals (only after ORB is ready)
                if not orb.get('collecting', False) and orb.get('or_high', 0) > 0:
                    self._check_signal(symbol, ltp, vwap, prev_ltp)
                
        except Exception as e:
            # Don't spam logs for every tick error
            pass

    def _on_ws_error(self, wsapp, error):
        self.log(f"WebSocket Error: {error}", "ERROR")

    def _on_ws_close(self, wsapp):
        self.log("WebSocket Disconnected", "WARNING")
        # Attempt reconnect if still active
        if self.active and not self.stop_event.is_set():
            self._reconnect_websocket()

    def _reconnect_websocket(self):
        """Reconnect WebSocket with exponential backoff"""
        retry_delays = [5, 10, 30, 60]  # Seconds between retries
        
        for attempt, delay in enumerate(retry_delays):
            if not self.active or self.stop_event.is_set():
                return
            
            self.log(f"Reconnecting WebSocket in {delay}s (attempt {attempt + 1}/{len(retry_delays)})...", "INFO")
            time.sleep(delay)
            
            try:
                # Re-login to get fresh tokens
                api_key = self.credentials.get('apiKey')
                client_code = self.credentials.get('clientCode')
                pwd = self.credentials.get('password')
                totp_key = self.credentials.get('totp')
                
                totp = pyotp.TOTP(totp_key).now()
                data = self.smartApi.generateSession(client_code, pwd, totp)
                
                if data['status']:
                    self.auth_token = data['data']['jwtToken']
                    self.feed_token = data['data']['feedToken']
                    
                    # Create new WebSocket
                    self.sws = SmartWebSocketV2(
                        auth_token=self.auth_token,
                        api_key=api_key,
                        client_code=client_code,
                        feed_token=self.feed_token
                    )
                    
                    self.sws.on_open = self._on_ws_open
                    self.sws.on_data = self._on_ws_data
                    self.sws.on_error = self._on_ws_error
                    self.sws.on_close = self._on_ws_close
                    
                    self.ws_thread = threading.Thread(target=self.sws.connect, daemon=True)
                    self.ws_thread.start()
                    
                    self.log("WebSocket Reconnected", "SUCCESS")
                    return  # Success
                else:
                    self.log(f"Re-login failed: {data.get('message')}", "ERROR")
                    
            except Exception as e:
                self.log(f"Reconnection attempt {attempt + 1} failed: {e}", "ERROR")
        
        # All retries failed, fall back to polling
        self.log("WebSocket reconnection failed. Falling back to polling mode.", "WARNING")
        self._run_polling_loop()

    def _check_signal(self, symbol, ltp, vwap=0, prev_ltp=0):
        """Check if price breaks ORB levels and generate signal"""
        current_date = datetime.date.today()
        ist_now = self._get_ist_time()
        current_time = ist_now.time()
        
        today_key = f"{symbol}_{current_date}"
        
        # Check if already triggered today (Common for ALL strategies)
        if today_key in self.signals_triggered:
            return

        # Check if position already open
        for p in self.positions:
            if p['symbol'] == symbol and p['status'] == 'OPEN':
                return

        # ==========================================
        # AUTO SQUARE OFF CHECK (3:05 PM Safety)
        # ==========================================
        # Parse stop time from config or default to 15:15 (3:15 PM)
        # But per user request: "Auto Square off at 3:05 PM"
        
        # Hard safety stop at 15:05
        square_off_time = datetime.time(15, 5)
        
        # Or use config stop time if it's earlier
        config_stop_str = self.config.get('stopTime', '15:15')
        try:
            h, m = map(int, config_stop_str.split(':'))
            config_stop = datetime.time(h, m)
            if config_stop < square_off_time:
                square_off_time = config_stop
        except:
            pass

        if current_time >= square_off_time:
            # 1. Close all OPEN positions for this symbol
            active_smart_orders = 0
            for p in self.positions:
                 if p['symbol'] == symbol and p['status'] == 'OPEN':
                     self._close_position(p, ltp, "AUTO_SQUARE_OFF")
                     active_smart_orders += 1
            
            if active_smart_orders > 0:
                 self.log(f"⏰ Auto Square Off Triggered for {symbol} at {current_time}", "WARNING")
            
            # 2. Block new signals
            return

        # ==========================================
        # STRATEGY: TEST (Immediate Buy)
        # ==========================================
        strategy_name = self.config.get('strategy', 'ORB').upper()
        
        if strategy_name == 'TEST':
            # Buy immediately, no time check, no ORB check
            capital = float(self.config.get('capital', 100000))
            qty = int(capital / ltp) if ltp > 0 else 1
            qty = max(1, qty)
            
            tp = round(ltp * 1.006, 2)  # 0.6% Target (Updated)
            sl = round(ltp * 0.99, 2)   # 1% SL
            
            self._place_order(symbol, "BUY", qty, ltp, tp, sl)
            self.signals_triggered[today_key] = True
            self.log(f"🧪 TEST STRATEGY: Immediate BUY for {symbol} @ {ltp}", "SUCCESS")
            return

        # ==========================================
        # STRATEGY: ORB (Original Logic)
        # ==========================================
        # Only trade after 09:30
        if current_time < datetime.time(9, 30):
            return
        
        orb = self.orb_levels.get(symbol)
        if not orb:
            return
        
        or_high = orb['or_high']
        or_low = orb['or_low']
        or_mid = orb.get('or_mid', (or_high+or_low)/2)
        
        # SAFETY CHECK: If ORB levels are explicitly 0, it means initialization failed or is invalid
        if or_high <= 0 or or_low <= 0:
            return
        
        # ==========================================
        # CROSSOVER DETECTION (Critical Fix)
        # ==========================================
        # Only trigger if price CROSSES from inside range to outside
        # This prevents false signals when price is already beyond ORB at startup
        
        # If we don't have a previous price yet (first tick), skip this tick
        if prev_ltp <= 0:
            return
        
        # Calculate qty based on capital (no artificial cap)
        capital = float(self.config.get('capital', 100000))
        qty = int(capital / ltp) if ltp > 0 else 1
        qty = max(1, qty)  # At least 1 share
        
        # BUY Signal: Price CROSSES above ORB High (prev was below, now above)
        # Condition: prev_ltp <= or_high AND ltp > or_high  AND ltp > vwap
        if ltp > or_high and prev_ltp <= or_high:
            if vwap > 0 and ltp <= vwap:
                return # Filtered by VWAP

            tp = round(ltp * 1.006, 2)  # 0.6% target
            sl = round(or_mid, 2)       # SL at OR Mid (User Logic)
            
            self._place_order(symbol, "BUY", qty, ltp, tp, sl)
            self.signals_triggered[today_key] = True
            self.log(f"🟢 BUY CROSSOVER: {symbol} @ {ltp:.2f} (crossed High:{or_high}, VWAP:{vwap})", "SUCCESS")
        
        # SELL Signal: Price CROSSES below ORB Low (prev was above, now below)
        # Condition: prev_ltp >= or_low AND ltp < or_low AND ltp < vwap
        elif ltp < or_low and prev_ltp >= or_low:
            if vwap > 0 and ltp >= vwap:
                return # Filtered by VWAP
                
            tp = round(ltp * 0.994, 2)  # 0.6% target
            sl = round(or_mid, 2)       # SL at OR Mid (User Logic)
            
            self._place_order(symbol, "SELL", qty, ltp, tp, sl)
            self.signals_triggered[today_key] = True
            self.log(f"🔴 SELL CROSSOVER: {symbol} @ {ltp:.2f} (crossed Low:{or_low}, VWAP:{vwap})", "SUCCESS")

    def _update_position_pnl(self, symbol, ltp):
        """Update unrealized PnL for open positions"""
        for p in self.positions:
            if p['symbol'] == symbol and p['status'] == 'OPEN':
                if p['type'] == 'BUY':
                    p['pnl'] = (ltp - p['entry']) * p['qty']
                else:
                    p['pnl'] = (p['entry'] - ltp) * p['qty']
                
                # Check SL/TP hit
                if p['type'] == 'BUY':
                    if ltp >= p['tp']:
                        self._close_position(p, ltp, "TARGET")
                    elif ltp <= p['sl']:
                        self._close_position(p, ltp, "SL")
                else:
                    if ltp <= p['tp']:
                        self._close_position(p, ltp, "TARGET")
                    elif ltp >= p['sl']:
                        self._close_position(p, ltp, "SL")

    def _place_order(self, symbol, type, qty, price, tp, sl):
        id = len(self.positions) + len(self.trades_history) + 1
        pos = {
            "id": id,
            "symbol": symbol,
            "type": type,
            "mode": self.mode,  # PAPER or LIVE
            "time": self._get_ist_time().strftime("%H:%M:%S"),
            "date": self._get_ist_time().strftime("%Y-%m-%d"),
            "qty": qty,
            "entry": round(price, 2),
            "tp": round(tp, 2),
            "sl": round(sl, 2),
            "status": "OPEN",
            "pnl": 0.0
        }
        self.positions.append(pos)
        
        # Also add to trade history / order book (Store Reference, NOT COPY)
        self.trades_history.append(pos)
        
        self.log(f"Placed {type} Order for {symbol} @ {price:.2f} ({self.mode})", "SUCCESS")
        
        # Real Order Placement (Angel One)
        if self.mode == "LIVE":
            self._execute_live_order(pos, symbol, type, qty, price)

    def _execute_live_order(self, pos, symbol, order_type, qty, price, retry_count=0):
        """Execute a live order on Angel One with retry and re-auth logic"""
        try:
            # Rate limit protection - wait between order attempts
            if retry_count > 0:
                delay = 3 * retry_count  # 3s, 6s delays
                self.log(f"⏳ Waiting {delay}s before retry to avoid rate limits...", "INFO")
                time.sleep(delay)
            
            # Validate symbol token exists
            token = self.symbol_tokens.get(symbol)
            self.log(f"🔍 Token lookup for {symbol}: {token}", "DEBUG")
            if not token:
                self.log(f"❌ LIVE ORDER BLOCKED: No symbol token for {symbol}. Check token mapping.", "ERROR")
                self.log(f"Available tokens: {list(self.symbol_tokens.keys())}", "DEBUG")
                return False
            
            # Clean trading symbol (remove -EQ suffix)
            # Use exact trading symbol from token map if available (best practice)
            trading_symbol = self.symbol_tokens.get(f"{symbol}_TS")
            if not trading_symbol:
                trading_symbol = symbol.replace("-EQ", "")
                self.log(f"⚠️ Using fallback symbol logic: {trading_symbol}", "WARNING")
            
            # Build order params - SmartAPI v2 format
            order_params = {
                "variety": "NORMAL",
                "tradingsymbol": trading_symbol,
                "symboltoken": str(token),
                "transactiontype": order_type,  # BUY or SELL
                "exchange": "NSE",
                "ordertype": "MARKET",
                "producttype": "INTRADAY",  # MIS for intraday
                "duration": "DAY",
                "price": "0",
                "squareoff": "0",
                "stoploss": "0",
                "quantity": str(qty)
            }
            
            self.log(f"📤 Placing LIVE ORDER: {order_params}", "INFO")
            
            # Try SDK method first
            response = None
            try:
                response = self.smartApi.placeOrder(order_params)
            except Exception as sdk_error:
                self.log(f"⚠️ SDK placeOrder exception: {sdk_error}", "WARNING")
            
            self.log(f"📥 Angel API Response: {response}", "DEBUG")
            
            # If SDK returns None, try direct HTTP API call
            if response is None:
                self.log(f"⚠️ SDK returned None. Trying direct API call...", "WARNING")
                response = self._place_order_direct_api(order_params)
                
                # If direct API also returns Invalid Token, refresh session and retry
                if response and isinstance(response, dict):
                    error_code = response.get('errorcode', '')
                    if error_code in ['AG8001', 'AB1010'] and retry_count < 2:
                        self.log(f"⚠️ Token error from direct API. Refreshing session...", "WARNING")
                        time.sleep(2)
                        if self._refresh_session():
                            return self._execute_live_order(pos, symbol, order_type, qty, price, retry_count + 1)
            
            # Handle response
            if response is None:
                self.log(f"❌ Both SDK and Direct API failed.", "ERROR")
                
                if retry_count < 2:
                    self.log(f"🔄 Attempting re-authentication...", "INFO")
                    time.sleep(2)  # Wait before re-auth to avoid rate limit
                    if self._refresh_session():
                        return self._execute_live_order(pos, symbol, order_type, qty, price, retry_count + 1)
                    else:
                        self.log(f"❌ Re-authentication failed. Order not placed.", "ERROR")
                        return False
                else:
                    self.log(f"❌ Max retries reached. Order failed.", "ERROR")
                    return False
            
            # Parse response
            if isinstance(response, dict):
                if response.get('status') == True:
                    order_id = response.get('data', {}).get('orderid')
                    pos['order_id'] = order_id
                    self.log(f"✅ LIVE ORDER PLACED: OrderID={order_id}", "SUCCESS")
                    return True
                else:
                    error_msg = response.get('message', str(response))
                    error_code = response.get('errorcode', 'Unknown')
                    self.log(f"❌ Order Rejected [{error_code}]: {error_msg}", "ERROR")
                    
                    # Check for session expiry/token errors - AG8001 = Invalid Token
                    if error_code in ['AB1010', 'AB1004', 'AG8002', 'AG8001'] and retry_count < 2:
                        time.sleep(2)
                        if self._refresh_session():
                            return self._execute_live_order(pos, symbol, order_type, qty, price, retry_count + 1)
                    return False
            elif isinstance(response, str):
                # Direct order_id returned (older SDK versions)
                pos['order_id'] = response
                self.log(f"✅ LIVE ORDER PLACED: {response}", "SUCCESS")
                return True
            else:
                self.log(f"❌ Unexpected response type: {type(response)} - {response}", "ERROR")
                return False
                
        except Exception as e:
            import traceback
            self.log(f"❌ Order Exception: {e}", "ERROR")
            self.log(f"Traceback: {traceback.format_exc()}", "DEBUG")
            return False

    def _get_current_token(self):
        """Get the current valid JWT token - prefer SDK's internal token"""
        # Try to get token from SDK's internal state
        if hasattr(self.smartApi, 'access_token') and self.smartApi.access_token:
            return self.smartApi.access_token
        # Fallback to our stored token
        return self.auth_token

    def _place_order_direct_api(self, order_params, use_fresh_token=False):
        """
        Fallback: Place order using direct HTTP API call
        This bypasses the SDK to get actual error messages
        """
        try:
            import requests as req
            
            # Get fresh token if requested or use current
            current_token = self._get_current_token()
            
            if not current_token:
                self.log("❌ No valid auth token available", "ERROR")
                return None
            
            url = "https://apiconnect.angelbroking.com/rest/secure/angelbroking/order/v1/placeOrder"
            
            headers = {
                "Authorization": f"Bearer {current_token}",
                "Content-Type": "application/json",
                "Accept": "application/json",
                "X-UserType": "USER",
                "X-SourceID": "WEB",
                "X-ClientLocalIP": "127.0.0.1",
                "X-ClientPublicIP": "127.0.0.1",
                "X-MACAddress": "00:00:00:00:00:00",
                "X-PrivateKey": self.credentials.get('apiKey', '')
            }
            
            self.log(f"📡 Direct API call with token: {current_token[:20]}...", "DEBUG")
            
            resp = req.post(url, json=order_params, headers=headers, timeout=30)
            
            self.log(f"📥 Direct API Status: {resp.status_code}", "DEBUG")
            self.log(f"📥 Direct API Response: {resp.text}", "DEBUG")
            
            if resp.status_code == 200:
                json_resp = resp.json()
                # Check if it's an error response
                if json_resp.get('success') == False:
                    error_code = json_resp.get('errorCode', 'Unknown')
                    # Return as dict with error info for proper handling
                    return {
                        'status': False,
                        'message': json_resp.get('message', 'Unknown error'),
                        'errorcode': error_code
                    }
                return json_resp
            else:
                self.log(f"❌ Direct API Error: {resp.status_code} - {resp.text}", "ERROR")
                return None
                
        except Exception as e:
            self.log(f"❌ Direct API Exception: {e}", "ERROR")
            return None

    def _refresh_session(self):
        """Re-authenticate with Angel One to get fresh tokens"""
        try:
            api_key = self.credentials.get('apiKey')
            client_code = self.credentials.get('clientCode')
            pwd = self.credentials.get('password')
            totp_key = self.credentials.get('totp')
            
            self.log("🔐 Attempting to refresh Angel One session...", "INFO")
            
            # Wait a bit to avoid rate limiting
            time.sleep(1)
            
            totp = pyotp.TOTP(totp_key).now()
            
            # Create a fresh SmartConnect instance to avoid stale state
            self.smartApi = SmartConnect(api_key=api_key)
            data = self.smartApi.generateSession(client_code, pwd, totp)
            
            if data and data.get('status'):
                self.auth_token = data['data']['jwtToken']
                self.feed_token = data['data']['feedToken']
                self.log("✅ Session refreshed successfully", "SUCCESS")
                return True
            else:
                self.log(f"❌ Session refresh failed: {data}", "ERROR")
                return False
        except Exception as e:
            self.log(f"❌ Session refresh exception: {e}", "ERROR")
            return False



    def _close_position(self, pos, price, reason):
        pos['status'] = "CLOSED"
        pos['exit'] = price
        if pos['type'] == 'BUY':
            pos['pnl'] = (price - pos['entry']) * pos['qty']
        else:
            pos['pnl'] = (pos['entry'] - price) * pos['qty']
        
        self.pnl += pos['pnl']
        self.log(f"Closed {pos['symbol']} ({reason}) PnL: {pos['pnl']:.2f}", "INFO" if pos['pnl'] > 0 else "WARNING")
        
        # ----------------------------------------------------
        # PERSIST TO BACKEND DB (Fix for data loss)
        # ----------------------------------------------------
        try:
            payload = {
                "user_id": self.user_id,
                "symbol": pos['symbol'],
                "mode": pos['type'],
                "qty": pos['qty'],
                "entry": pos['entry'],
                "exit": pos['exit'],
                "tp": pos.get('tp', 0),
                "sl": pos.get('sl', 0),
                "pnl": round(pos['pnl'], 2),
                "status": "COMPLETED",
                "date": pos.get('date', datetime.date.today().strftime('%Y-%m-%d')),
                "time": self._get_ist_time().strftime("%H:%M:%S"),
                "trade_mode": self.mode,
                "strategy": self.strategy_name.upper()
            }
            # Use backend internal URL (localhost)
            requests.post('http://localhost:5001/webhook/save_trade', json=payload, timeout=2)
            self.log(f"Synced {pos['symbol']} trade to DB", "DEBUG")
        except Exception as e:
            self.log(f"Failed to sync trade to DB: {e}", "ERROR")

        # Real Order Exit (Close position on Angel One)
        if self.mode == "LIVE":
            self._execute_exit_order(pos)

    def _execute_exit_order(self, pos, retry_count=0):
        """Execute an exit order on Angel One"""
        try:
            token = self.symbol_tokens.get(pos['symbol'])
            if not token:
                self.log(f"EXIT ORDER BLOCKED: No token for {pos['symbol']}", "ERROR")
                return False
            
            # Use exact trading symbol from token map if available (best practice)
            trading_symbol = self.symbol_tokens.get(f"{pos['symbol']}_TS")
            if not trading_symbol:
                trading_symbol = pos['symbol'].replace("-EQ", "")
                self.log(f"⚠️ Using fallback symbol logic for exit: {trading_symbol}", "WARNING")
            exit_type = "SELL" if pos['type'] == "BUY" else "BUY"
            
            order_params = {
                "variety": "NORMAL",
                "tradingsymbol": trading_symbol,
                "symboltoken": str(token),
                "transactiontype": exit_type,
                "exchange": "NSE",
                "ordertype": "MARKET",
                "producttype": "INTRADAY",
                "duration": "DAY",
                "price": "0",
                "squareoff": "0",
                "stoploss": "0",
                "quantity": str(pos['qty'])
            }
            
            self.log(f"📤 Placing EXIT ORDER: {order_params}", "INFO")
            
            response = self.smartApi.placeOrder(order_params)
            self.log(f"📥 Exit API Response: {response}", "DEBUG")
            
            if response is None:
                if retry_count < 2:
                    self.log(f"⚠️ Exit API returned None. Attempting re-auth...", "WARNING")
                    if self._refresh_session():
                        return self._execute_exit_order(pos, retry_count + 1)
                self.log(f"❌ Exit Order Failed: API returned None", "ERROR")
                return False
            
            if isinstance(response, dict):
                if response.get('status') == True:
                    order_id = response.get('data', {}).get('orderid')
                    self.log(f"✅ EXIT ORDER PLACED: {order_id}", "SUCCESS")
                    return True
                else:
                    error_msg = response.get('message', str(response))
                    error_code = response.get('errorcode', 'Unknown')
                    self.log(f"❌ Exit Rejected [{error_code}]: {error_msg}", "ERROR")
                    
                    if error_code in ['AB1010', 'AB1004', 'AG8002'] and retry_count < 2:
                        if self._refresh_session():
                            return self._execute_exit_order(pos, retry_count + 1)
                    return False
            elif isinstance(response, str):
                self.log(f"✅ EXIT ORDER PLACED: {response}", "SUCCESS")
                return True
            else:
                self.log(f"❌ Exit Order Issue: {response}", "WARNING")
                return False
                
        except Exception as e:
            self.log(f"❌ Exit Order Exception: {e}", "ERROR")
            return False

    def _run_polling_loop(self):
        """Fallback polling mode if WebSocket fails"""
        symbols = self.config.get('symbols', [])
        
        while not self.stop_event.is_set() and self.active:
            try:
                for symbol in symbols:
                    if self.stop_event.is_set(): break
                    
                    token = self.symbol_tokens.get(symbol)
                    if not token: continue
                    
                    # Fetch LTP
                    ltp_data = self.smartApi.ltpData("NSE", symbol.replace("-EQ", ""), token)
                    if ltp_data and ltp_data.get('data'):
                        ltp = float(ltp_data['data']['ltp'])
                        self.ltp_cache[symbol] = ltp
                        self._update_position_pnl(symbol, ltp)
                        
                        if symbol in self.orb_levels:
                            self._check_signal(symbol, ltp)
                
                # Poll every 5 seconds in fallback mode
                self.stop_event.wait(5)
            except Exception as e:
                self.log(f"Polling Error: {e}", "ERROR")
                time.sleep(5)

    def stop(self):
        self.active = False
        self.stop_event.set()
        
        # Close WebSocket
        if self.sws:
            try:
                self.sws.close_connection()
            except:
                pass
        
        if self.thread:
            self.thread.join(timeout=5)
        
        self.log("Session Stopped", "WARNING")

    def get_state(self):
        # Calculate live unrealized P&L from open positions
        open_positions = [p for p in self.positions if p['status'] == 'OPEN']
        unrealized_pnl = sum(p.get('pnl', 0) for p in open_positions)
        
        # Total P&L = realized (closed) + unrealized (open)
        total_pnl = self.pnl + unrealized_pnl
        
        return {
            "active": self.active,
            "mode": self.mode,
            "pnl": round(total_pnl, 2),  # Live total P&L
            "realized_pnl": round(self.pnl, 2),
            "unrealized_pnl": round(unrealized_pnl, 2),
            "positions": open_positions,
            "trades_history": self.trades_history,  # Order Book
            "logs": self.logs,
            "config": self.config,
            "orb_levels": self.orb_levels,
            "ltp": self.ltp_cache
        }

    def update_position(self, position_id, new_tp=None, new_sl=None):
        """Update TP/SL for an open position"""
        for p in self.positions:
            if str(p['id']) == str(position_id) and p['status'] == 'OPEN':
                if new_tp is not None:
                    p['tp'] = round(float(new_tp), 2)
                if new_sl is not None:
                    p['sl'] = round(float(new_sl), 2)
                self.log(f"Updated {p['symbol']}: TP={p['tp']}, SL={p['sl']}", "INFO")
                return True
        return False

    def exit_position(self, position_id):
        """Manually exit a position"""
        for p in self.positions:
            if str(p['id']) == str(position_id) and p['status'] == 'OPEN':
                ltp = self.ltp_cache.get(p['symbol'], p['entry'])
                self._close_position(p, ltp, "MANUAL")
                return True
        return False

# Global Session Store
sessions = {}

def get_session(user_id):
    return sessions.get(user_id)

def create_session(user_id, config, creds):
    if user_id in sessions:
        sessions[user_id].stop()
    sessions[user_id] = TradingSession(user_id, config, creds)
    return sessions[user_id]
