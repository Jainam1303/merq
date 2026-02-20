from SmartApi import SmartConnect
from logzero import logger
import pandas as pd
import numpy as np
import importlib 

def fetch_historical_data(smartApi, exchange, symbol_token, interval, from_date, to_date):
    try:
        # MAP INTERVAL INT TO STRING (Angel One API Requirement)
        interval_map = {
            "1": "ONE_MINUTE", "3": "THREE_MINUTE", "5": "FIVE_MINUTE", 
            "10": "TEN_MINUTE", "15": "FIFTEEN_MINUTE", "30": "THIRTY_MINUTE", 
            "60": "ONE_HOUR", "D": "ONE_DAY"
        }
        if str(interval) in interval_map:
            interval = interval_map[str(interval)]

        # Convert DD-MM-YYYY to YYYY-MM-DD for Angel One API if needed
        def convert_date(d_str):
            try:
                if not d_str: return d_str
                d_str = d_str.replace("T", " ")
                if len(d_str) > 5 and d_str[2] == '-' and d_str[5] == '-': 
                    parts = d_str.split(' ')
                    date_parts = parts[0].split('-')
                    time_part = parts[1] if len(parts) > 1 else ""
                    return f"{date_parts[2]}-{date_parts[1]}-{date_parts[0]} {time_part}".strip()
                return d_str
            except:
                return d_str

        historicParam = {
            "exchange": exchange,
            "symboltoken": symbol_token,
            "interval": interval,
            "fromdate": convert_date(from_date),
            "todate": convert_date(to_date)
        }
        logger.info(f"Fetching Data for {symbol_token}: {historicParam}")
        response = smartApi.getCandleData(historicParam)
        return response
    except Exception as e:
        logger.exception(f"Historic Api failed: {e}")
        return None

def login_and_run_backtest(data):
    """
    1. Login to Angel One
    2. Fetch Data
    3. Run Selected Strategy
    4. Return Results
    """
    try:
        strategy_name = data.get("strategy", "orb").lower()
        selected_symbols = data.get("symbols", [])
        
        # Handle Date Inputs - Avoid double time concatenation
        raw_from = data.get("from_date", "2024-01-01")
        raw_to = data.get("to_date", "2024-01-31")
        
        # If input doesn't look like it has time (length < 11), append default time
        start_date = raw_from if len(str(raw_from)) > 11 else f"{raw_from} 09:15"
        end_date = raw_to if len(str(raw_to)) > 11 else f"{raw_to} 15:30"
        
        logger.info(f"[Backtest] Date Range: {start_date} to {end_date}")
        
        interval = data.get("interval", "5")
        
        # CREDENTIALS
        creds = data.get("broker_credentials", {})
        api_key = creds.get("api_key")
        client_code = creds.get("client_code")
        password = creds.get("password")
        totp_key = creds.get("totp")

        smartApi = None
        if api_key and client_code and password and totp_key:
            try:
                import pyotp
                smartApi = SmartConnect(api_key=api_key)
                totp = pyotp.TOTP(totp_key).now()
                session_data = smartApi.generateSession(client_code, password, totp)
                if not session_data['status']:
                    logger.error(f"Login Failed: {session_data['message']}")
                    smartApi = None
                else:
                    logger.info("Angel One Login Successful for Backtest")
            except Exception as e:
                logger.error(f"Login Exception: {e}")
                smartApi = None
        
        summary_results = []

        # Token Map - Removed hardcoded values as requested. 
        # We rely strictly on:
        # 1. User providing token in request
        # 2. Dynamic lookup via SmartAPI
        
        import time
        from datetime import datetime
        
        for symbol_data in selected_symbols:
            try:
                # Rate limit for iteration
                time.sleep(0.4)
                
                # Determine if input is object (new) or string (old)
                symbol_name = ""
                market_token = None
                
                if isinstance(symbol_data, dict):
                    symbol_name = symbol_data.get("symbol", "")
                    if symbol_data.get("token"):
                        market_token = str(symbol_data.get("token"))
                else:
                    symbol_name = str(symbol_data)
                
                # Dynamic Search via API if token not provided
                if not market_token and smartApi:
                    try:
                        clean_search = symbol_name.upper().replace("-EQ", "")
                        search_res = smartApi.searchScrip("NSE", clean_search)
                        if search_res and search_res.get('status') and search_res.get('data'):
                            # Priority Logic: 1. Exact Match, 2. Ends with -EQ, 3. First Found
                            found_scrip = None
                            
                            # 1. Exact match with -EQ suffix (Best for Equity)
                            target_eq = f"{clean_search}-EQ"
                            for scrip in search_res['data']:
                                if scrip['tradingsymbol'] == target_eq:
                                    found_scrip = scrip
                                    break
                            
                            # 2. Exact match on raw symbol name (some indices/futures)
                            if not found_scrip:
                                for scrip in search_res['data']:
                                    if scrip['tradingsymbol'] == clean_search:
                                        found_scrip = scrip
                                        break
                                        
                            # 3. Fallback: Ends with -EQ
                            if not found_scrip:
                                for scrip in search_res['data']:
                                    if scrip['tradingsymbol'].endswith('-EQ'):
                                        found_scrip = scrip
                                        break
                                        
                            # 4. First result (Last resort)
                            if not found_scrip:
                                found_scrip = search_res['data'][0]
                                
                            market_token = found_scrip['symboltoken']
                            symbol_name = found_scrip['tradingsymbol'] 
                            logger.info(f"Dynamic Token Found: {symbol_name} -> {market_token}")
                    except Exception as ex:
                        logger.error(f"Dynamic Search Failed for {symbol_name}: {ex}")
                
                # Use the resolved symbol name for logging and results
                symbol = symbol_name
                
                df = pd.DataFrame()

                # REAL DATA FETCH
                if smartApi and market_token:
                    try:
                        time.sleep(0.3) # Rate limit for data fetch
                        res = fetch_historical_data(smartApi, "NSE", market_token, interval, start_date, end_date)
                        if res and res.get('status') and res.get('data'):
                            raw_data = res['data']
                            df = pd.DataFrame(raw_data, columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])
                            df['timestamp'] = pd.to_datetime(df['timestamp'])
                            for c in ['open','high','low','close','volume']: df[c] = df[c].astype(float)
                        else:
                            logger.warning(f"No Data for {symbol}")
                    except Exception as e:
                        logger.error(f"Data Fetch Error {symbol}: {e}")

                # FALLBACK SIMULATION (Only if Real Fetch Fails or No Creds)
                if df.empty:
                    logger.warning(f"Using Simulation for {symbol} due to missing data/creds.")
                    
                    # Create timestamps based on full start/end range
                    full_range = pd.date_range(start=start_date, end=end_date, freq=f'{interval}min')
                    
                    seed_val = abs(hash(symbol)) % (2**32)
                    np.random.seed(seed_val)
                    price = 1000.0
                    data_list = []
                    
                    # Parse start/end times for daily window logic (Market Hours Only)
                    market_open = pd.to_datetime("09:15").time()
                    market_close = pd.to_datetime("15:30").time()
                    
                    for d in full_range:
                        # Only generate data during market hours
                        if d.time() < market_open or d.time() > market_close:
                            continue
                            
                        # Important: Also respect the specific user start/end requested
                        if d < pd.to_datetime(start_date) or d > pd.to_datetime(end_date):
                            continue
                            
                        # Simulation Logic
                        noise = np.random.normal(0, 1.0)
                        # More variance
                        is_dynamic = np.random.random() > 0.5
                        trend = 0
                        if is_dynamic:
                            trend = np.random.choice([-0.5, 0.5, 0.2, -0.2])
                        
                        is_spike = np.random.random() > 0.95
                        if is_spike: price += np.random.choice([-3, 3])
                        
                        price += trend + noise
                        if price < 10: price = 10 # Floor
                        
                        high = price + abs(np.random.normal(0, 1)) + (2 if is_spike else 0)
                        low = price - abs(np.random.normal(0, 1)) - (2 if is_spike else 0)
                        vol = np.random.randint(15000, 50000) if is_spike else np.random.randint(1000, 8000)
                        
                        data_list.append({
                            "timestamp": d, 
                            "open": round(price-(trend+noise), 2), 
                            "high": round(high, 2), 
                            "low": round(low, 2), 
                            "close": round(price, 2), 
                            "volume": vol
                        })
                        
                    df = pd.DataFrame(data_list)

                # RUN STRATEGY - Use strategy map for extensibility
                # MerQ Alpha I-V + TEST
                strategy_module_map = {
                    "orb": "strategies.orb",                          # Alpha I
                    "ema": "strategies.ema_crossover",                # Alpha II
                    "pullback": "strategies.ema_pullback_strategy",   # Alpha III
                    "engulfing": "strategies.engulfing_strategy",     # Alpha IV
                    "timebased": "strategies.time_based_strategy",    # Alpha V
                    "vwapfailure": "strategies.vwap_volume_failure",  # Alpha VI
                    "test": "strategies.test"                         # Debug
                }
                
                module_name = strategy_module_map.get(strategy_name, "strategies.orb")
                strat_module = importlib.import_module(module_name)
                
                importlib.reload(strat_module)

                trades = []
                if not df.empty:
                    trades = strat_module.backtest(df)
                
                # AGGREGATE RESULTS
                total_pnl = sum(t['pnl'] for t in trades)
                win_count = len([t for t in trades if t['pnl'] > 0])
                total_trades = len(trades)
                win_rate = (win_count / total_trades * 100) if total_trades > 0 else 0
                
                summary_results.append({
                    "Symbol": symbol,
                    "Total Trades": total_trades,
                    "Win Rate %": f"{win_rate:.2f}%",
                    "Total P&L": f"{total_pnl:.2f}",
                    "Final Capital": f"{100000 + total_pnl:.2f}"
                })
            
            except Exception as symbol_error:
                logger.exception(f"Error processing {symbol_data}: {symbol_error}")
                summary_results.append({
                    "Symbol": str(symbol_data),
                    "Error": str(symbol_error)
                })

        return summary_results

    except Exception as e:
        logger.exception(f"Backtest Runner Failed: {e}")
        return []
