import threading
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

    def log(self, message, type="INFO"):
        timestamp = datetime.datetime.now().strftime("%H:%M:%S")
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
        
        # 5. Keep thread alive while active
        while self.active and not self.stop_event.is_set():
            time.sleep(1)

    def _load_symbol_tokens(self):
        """Map symbol names to Angel One tokens using searchScrip API with optimized rate limiting"""
        symbols = self.config.get('symbols', [])
        failed_lookups = []
        
        # Process in batches with controlled timing
        batch_size = 5  # Process 5 symbols, then pause
        
        for idx, sym in enumerate(symbols):
            try:
                # Clean symbol name (remove -EQ suffix if present)
                clean = sym.upper().replace("-EQ", "")
                
                # Retry logic for API calls
                max_retries = 2  # Reduced from 3
                search = None
                
                for attempt in range(max_retries):
                    # Shorter base delay: 0.5s between calls
                    delay = 0.5 + (attempt * 0.3)  # 0.5s, 0.8s
                    time.sleep(delay)
                    
                    try:
                        search = self.smartApi.searchScrip("NSE", clean)
                        
                        if search and search.get('status') and search.get('data'):
                            break  # Success
                        
                        # Check for rate limit
                        error_code = search.get('errorcode', '') if search else ''
                        if error_code == 'AB1004' and attempt < max_retries - 1:
                            time.sleep(1.5)  # Reduced from 2s
                            continue
                        break
                        
                    except Exception as e:
                        if attempt < max_retries - 1:
                            continue
                        break
                
                if search and search.get('status') and search.get('data'):
                    # Find exact match or first result
                    for item in search['data']:
                        if item.get('tradingsymbol') == clean or item.get('tradingsymbol') == f"{clean}-EQ":
                            self.symbol_tokens[sym] = item['symboltoken']
                            break
                    else:
                        # Use first result if no exact match
                        self.symbol_tokens[sym] = search['data'][0]['symboltoken']
                else:
                    failed_lookups.append(sym)
                
                # Batch pause: after every batch_size symbols, pause longer
                if (idx + 1) % batch_size == 0 and idx < len(symbols) - 1:
                    time.sleep(2)  # 2s pause between batches
                    
            except Exception as e:
                self.log(f"Token lookup error for {sym}: {e}", "WARNING")
                failed_lookups.append(sym)
        
        self.log(f"Loaded tokens for {len(self.symbol_tokens)} symbols")
        if failed_lookups:
            self.log(f"Could not find tokens for: {', '.join(failed_lookups[:5])}{'...' if len(failed_lookups) > 5 else ''}", "WARNING")

    def _calculate_orb_levels(self):
        """Fetch 09:15-09:30 candles and calculate ORB High/Low with optimized rate limiting"""
        symbols = self.config.get('symbols', [])
        
        # Angel One interval format mapping
        interval_input = self.config.get('interval', 'FIVE_MINUTE')
        interval_map = {
            'FIVE_MINUTE': 'FIVE_MINUTE',
            'FIFTEEN_MINUTE': 'FIFTEEN_MINUTE',
            'THIRTY_MINUTE': 'THIRTY_MINUTE',
            'ONE_HOUR': 'ONE_HOUR',
            'ONE_DAY': 'ONE_DAY',
            '5': 'FIVE_MINUTE',
            '15': 'FIFTEEN_MINUTE',
            '30': 'THIRTY_MINUTE',
            '60': 'ONE_HOUR'
        }
        interval = interval_map.get(interval_input, 'FIVE_MINUTE')
        
        failed_symbols = []
        success_count = 0
        batch_size = 5  # Process 5 symbols, then pause
        
        for idx, symbol in enumerate(symbols):
            try:
                token = self.symbol_tokens.get(symbol)
                if not token:
                    self.log(f"No token for {symbol}, skipping ORB calc", "WARNING")
                    failed_symbols.append(symbol)
                    continue
                
                # Fetch today's data - use correct datetime format
                today = datetime.date.today()
                from_date = f"{today.strftime('%Y-%m-%d')} 09:15"
                to_date = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
                
                params = {
                    "exchange": "NSE",
                    "symboltoken": token,
                    "interval": interval,
                    "fromdate": from_date,
                    "todate": to_date
                }
                
                # Retry logic with faster timing
                max_retries = 2  # Reduced from 3
                res = None
                
                for attempt in range(max_retries):
                    # Faster base delay: 0.8s between calls
                    delay = 0.8 + (attempt * 0.5)  # 0.8s, 1.3s
                    time.sleep(delay)
                    
                    try:
                        res = self.smartApi.getCandleData(params)
                        
                        if res and res.get('status'):
                            break  # Success, exit retry loop
                        
                        # Check for rate limit error
                        error_code = res.get('errorcode', '') if res else ''
                        if error_code == 'AB1004':
                            if attempt < max_retries - 1:
                                self.log(f"Rate limited on {symbol}, retrying in {delay + 1.5}s...", "WARNING")
                                time.sleep(1.5)  # Reduced from 2s
                                continue
                        else:
                            break  # Other error, don't retry
                            
                    except Exception as e:
                        if attempt < max_retries - 1:
                            self.log(f"API call failed for {symbol}, retrying... ({e})", "WARNING")
                            continue
                        break
                
                if not res:
                    failed_symbols.append(symbol)
                    continue
                
                if not res.get('status'):
                    error_msg = res.get('message', 'Unknown error')
                    error_code = res.get('errorcode', 'N/A')
                    # Only log if it's not a rate limit error (already logged above)
                    if error_code != 'AB1004':
                        self.log(f"API Error {symbol}: {error_msg} (Code: {error_code})", "WARNING")
                    failed_symbols.append(symbol)
                    continue
                    
                if not res.get('data'):
                    self.log(f"Empty data for {symbol} (token: {token})", "WARNING")
                    failed_symbols.append(symbol)
                    continue
                
                df = pd.DataFrame(res['data'], columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])
                df['timestamp'] = pd.to_datetime(df['timestamp'])
                
                # Filter for Opening Range (09:15 - 09:30)
                or_df = df[(df['timestamp'].dt.time >= datetime.time(9, 15)) & 
                           (df['timestamp'].dt.time <= datetime.time(9, 30))]
                
                if or_df.empty:
                    # If no 9:15-9:30 data, use first 2-3 candles as ORB
                    if len(df) >= 2:
                        or_df = df.head(3)
                        self.log(f"Using first 3 candles for ORB of {symbol}", "INFO")
                    else:
                        self.log(f"Not enough data for {symbol} ORB", "WARNING")
                        failed_symbols.append(symbol)
                        continue
                
                or_high = float(or_df['high'].max())
                or_low = float(or_df['low'].min())
                
                self.orb_levels[symbol] = {
                    'or_high': or_high,
                    'or_low': or_low,
                    'or_mid': (or_high + or_low) / 2
                }
                
                success_count += 1
                self.log(f"ORB {symbol}: High={or_high:.2f}, Low={or_low:.2f}")
                
                # Batch pause: after every batch_size symbols, pause longer
                if (idx + 1) % batch_size == 0 and idx < len(symbols) - 1:
                    time.sleep(2)  # 2s pause between batches
                
            except Exception as e:
                self.log(f"ORB Calc Error {symbol}: {e}", "ERROR")
                failed_symbols.append(symbol)
        
        # Summary log
        if success_count > 0:
            self.log(f"✓ Successfully calculated ORB for {success_count}/{len(symbols)} symbols", "SUCCESS")
        if failed_symbols:
            self.log(f"⚠ Failed to get data for {len(failed_symbols)} symbols: {', '.join(failed_symbols[:5])}{'...' if len(failed_symbols) > 5 else ''}", "WARNING")
        
        # If we have at least some symbols ready, continue to WebSocket
        if success_count > 0:
            self.log(f"Proceeding with {success_count} symbols. WebSocket will provide real-time data.", "INFO")

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
            
            # Find symbol for this token
            symbol = None
            for sym, tok in self.symbol_tokens.items():
                if tok == token:
                    symbol = sym
                    break
            
            if not symbol:
                return
            
            # Update LTP cache
            self.ltp_cache[symbol] = ltp
            
            # Update positions with live PnL
            self._update_position_pnl(symbol, ltp)
            
            # Check for signals (only if ORB levels calculated)
            if symbol in self.orb_levels:
                # Heartbeat log (every 100 ticks or random) to prevent spam
                import random
                if random.random() < 0.05: # 5% chance to log
                    self.log(f"Tick Rx: {symbol} @ {ltp}", "DEBUG")
                self._check_signal(symbol, ltp)
                
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

    def _check_signal(self, symbol, ltp):
        """Check if price breaks ORB levels and generate signal"""
        current_date = datetime.date.today()
        current_time = datetime.datetime.now().time()
        
        # Only trade after 09:30
        if current_time < datetime.time(9, 30):
            return
        
        # Check if already triggered today
        today_key = f"{symbol}_{current_date}"
        if today_key in self.signals_triggered:
            return
        
        # Check if position already open
        for p in self.positions:
            if p['symbol'] == symbol and p['status'] == 'OPEN':
                return
        
        orb = self.orb_levels.get(symbol)
        if not orb:
            return
        
        or_high = orb['or_high']
        or_low = orb['or_low']
        
        # Calculate qty based on capital (no artificial cap)
        capital = float(self.config.get('capital', 100000))
        qty = int(capital / ltp) if ltp > 0 else 1
        qty = max(1, qty)  # At least 1 share
        
        # DEBUG: Explain Logic
        if ltp > or_high:
             self.log(f"{symbol} BREAKOUT CHECK: {ltp} > {or_high} -> BUY!", "DEBUG")
        elif ltp < or_low:
             self.log(f"{symbol} BREAKDOWN CHECK: {ltp} < {or_low} -> SELL!", "DEBUG")
        else:
             # Log only occasionally to verify logic is running
             import random
             if random.random() < 0.01: 
                 self.log(f"{symbol} Logic: {ltp} is inside range ({or_low} - {or_high})", "INFO")
        
        # BUY Signal: Price breaks above ORB High
        if ltp > or_high:
            tp = round(ltp * 1.01, 2)  # 1% target
            sl = round(or_high * 0.99, 2)  # SL just below breakout
            self._place_order(symbol, "BUY", qty, ltp, tp, sl)
            self.signals_triggered[today_key] = True
            self.log(f"🟢 BUY SIGNAL: {symbol} @ {ltp:.2f} (broke ORB High {or_high:.2f})", "SUCCESS")
        
        # SELL Signal: Price breaks below ORB Low
        elif ltp < or_low:
            tp = round(ltp * 0.99, 2)  # 1% target
            sl = round(or_low * 1.01, 2)  # SL just above breakdown
            self._place_order(symbol, "SELL", qty, ltp, tp, sl)
            self.signals_triggered[today_key] = True
            self.log(f"🔴 SELL SIGNAL: {symbol} @ {ltp:.2f} (broke ORB Low {or_low:.2f})", "SUCCESS")

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
            "time": datetime.datetime.now().strftime("%H:%M:%S"),
            "date": datetime.datetime.now().strftime("%Y-%m-%d"),
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
            try:
                order_params = {
                    "variety": "NORMAL",
                    "tradingsymbol": symbol.replace("-EQ", ""),
                    "symboltoken": self.symbol_tokens.get(symbol),
                    "transactiontype": type,
                    "exchange": "NSE",
                    "ordertype": "MARKET",
                    "producttype": "INTRADAY",
                    "duration": "DAY",
                    "quantity": str(qty)
                }
                order_id = self.smartApi.placeOrder(order_params)
                pos['order_id'] = order_id
                self.log(f"Real Order Placed: {order_id}", "SUCCESS")
            except Exception as e:
                self.log(f"Order Failed: {e}", "ERROR")

    def _close_position(self, pos, price, reason):
        pos['status'] = "CLOSED"
        pos['exit'] = price
        if pos['type'] == 'BUY':
            pos['pnl'] = (price - pos['entry']) * pos['qty']
        else:
            pos['pnl'] = (pos['entry'] - price) * pos['qty']
        
        self.pnl += pos['pnl']
        self.log(f"Closed {pos['symbol']} ({reason}) PnL: {pos['pnl']:.2f}", "INFO" if pos['pnl'] > 0 else "WARNING")
        
        # Real Order Exit
        if self.mode == "LIVE":
            try:
                exit_type = "SELL" if pos['type'] == "BUY" else "BUY"
                order_params = {
                    "variety": "NORMAL",
                    "tradingsymbol": pos['symbol'].replace("-EQ", ""),
                    "symboltoken": self.symbol_tokens.get(pos['symbol']),
                    "transactiontype": exit_type,
                    "exchange": "NSE",
                    "ordertype": "MARKET",
                    "producttype": "INTRADAY",
                    "duration": "DAY",
                    "quantity": str(pos['qty'])
                }
                order_id = self.smartApi.placeOrder(order_params)
                self.log(f"Exit Order Placed: {order_id}", "SUCCESS")
            except Exception as e:
                self.log(f"Exit Order Failed: {e}", "ERROR")

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
