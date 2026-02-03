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
        """Load symbol tokens from pre-built file - NO API CALLS NEEDED"""
        symbols = self.config.get('symbols', [])
        
        # Load the master token map from file (no API calls!)
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
                            # Also map without -EQ suffix
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
        
        # If file not found or some symbols missing, fallback to searchScrip for just those
        if not token_file or not_found:
            if not_found:
                self.log(f"Looking up {len(not_found)} missing symbols via API...", "INFO")
            for sym in not_found:
                try:
                    clean = sym.upper().replace("-EQ", "")
                    time.sleep(0.3)  # Minimal delay
                    search = self.smartApi.searchScrip("NSE", clean)
                    if search and search.get('status') and search.get('data'):
                        self.symbol_tokens[sym] = search['data'][0]['symboltoken']
                except Exception as e:
                    self.log(f"Token lookup failed for {sym}: {e}", "WARNING")
        
        self.log(f"✓ Loaded tokens for {len(self.symbol_tokens)}/{len(symbols)} symbols")
        if len(self.symbol_tokens) < len(symbols):
            missing = [s for s in symbols if s not in self.symbol_tokens]
            self.log(f"Missing: {', '.join(missing[:5])}", "WARNING")

    def _calculate_orb_levels(self):
        """
        NEW APPROACH: Skip REST API calls entirely!
        ORB levels will be calculated from WebSocket data in real-time.
        This eliminates all rate limiting issues.
        """
        symbols = self.config.get('symbols', [])
        current_time = datetime.datetime.now().time()
        
        # Check if we're before 9:30 (ORB period not complete)
        if current_time < datetime.time(9, 30):
            self.log(f"⏳ Market opens at 9:15. ORB will be calculated from live WebSocket data.", "INFO")
            # Initialize empty ORB levels - will be filled by WebSocket
            for symbol in symbols:
                if symbol in self.symbol_tokens:
                    self.orb_levels[symbol] = {
                        'or_high': 0,
                        'or_low': 999999999,  # Large number (not inf, for JSON)
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
                today = datetime.date.today()
                
                try:
                    # Single quick attempt - no retries
                    params = {
                        "exchange": "NSE",
                        "symboltoken": token,
                        "interval": "FIVE_MINUTE",
                        "fromdate": f"{today.strftime('%Y-%m-%d')} 09:15",
                        "todate": f"{today.strftime('%Y-%m-%d')} 09:30"
                    }
                    
                    time.sleep(0.3)  # Minimal delay
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
                    else:
                        # Failed - will use dynamic ORB from WebSocket
                        self.orb_levels[symbol] = {
                            'or_high': 0,
                            'or_low': 999999999,  # Large number (not inf, for JSON)
                            'or_mid': 0,
                            'collecting': True
                        }
                except Exception as e:
                    # Failed - will use dynamic ORB from WebSocket
                    self.orb_levels[symbol] = {
                        'or_high': 0,
                        'or_low': 999999999,  # Large number (not inf, for JSON)
                        'or_mid': 0,
                        'collecting': True
                    }
            
            dynamic_count = len([s for s in self.orb_levels.values() if s.get('collecting')])
            
            if success_count > 0:
                self.log(f"✓ Got ORB data for {success_count} symbols from API", "SUCCESS")
            if dynamic_count > 0:
                self.log(f"📊 Using dynamic ORB for {dynamic_count} symbols (from WebSocket ticks)", "INFO")
        
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
            
            # Find symbol for this token
            symbol = None
            for sym, tok in self.symbol_tokens.items():
                if tok == token:
                    symbol = sym
                    break
            
            if not symbol or ltp <= 0:
                return
            
            # Update LTP cache
            self.ltp_cache[symbol] = ltp
            
            # Update positions with live PnL
            self._update_position_pnl(symbol, ltp)
            
            # DYNAMIC ORB: Update ORB levels from WebSocket if we're collecting
            if symbol in self.orb_levels:
                orb = self.orb_levels[symbol]
                current_time = datetime.datetime.now().time()
                
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
