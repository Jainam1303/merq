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
        start_date = data.get("from_date", "2024-01-01") + " 09:15"
        end_date = data.get("to_date", "2024-01-31") + " 15:30"
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
                data = smartApi.generateSession(client_code, password, totp)
                if not data['status']:
                    logger.error(f"Login Failed: {data['message']}")
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
                    dates = pd.date_range(start=start_date.split(' ')[0], end=end_date.split(' ')[0], freq='5min')
                    seed_val = abs(hash(symbol)) % (2**32)
                    np.random.seed(seed_val)
                    price = 1000.0
                    data_list = []
                    days_list = sorted(list(set([d.date() for d in dates])))
                    for day_date in days_list:
                        day_profile = np.random.choice([0, 1, 1, 2, 2, 3]) 
                        day_times = [d for d in dates if d.date() == day_date]
                        for i, d in enumerate(day_times):
                            if d.time() < pd.to_datetime("09:15").time() or d.time() > pd.to_datetime("15:30").time(): continue
                            noise = np.random.normal(0, 1.0)
                            trend = 0.5 if day_profile == 1 else (-0.5 if day_profile == 2 else 0)
                            is_spike = np.random.random() > 0.85
                            if is_spike: price += np.random.choice([-3, 3])
                            price += trend + noise
                            high = price + abs(np.random.normal(0, 1)) + (2 if is_spike else 0)
                            low = price - abs(np.random.normal(0, 1)) - (2 if is_spike else 0)
                            vol = np.random.randint(15000, 50000) if is_spike else np.random.randint(1000, 8000)
                            data_list.append({"timestamp": d, "open": price-(trend+noise), "high": high, "low": low, "close": price, "volume": vol})
                    df = pd.DataFrame(data_list)

                # RUN STRATEGY
                strat_module = None
                if "ema" in strategy_name:
                     strat_module = importlib.import_module("strategies.ema_crossover")
                else:
                     strat_module = importlib.import_module("strategies.orb")
                
                importlib.reload(strat_module)

                trades = []
                if not df.empty:
                    trades = strat_module.backtest(df)
                
                # AGGREGATE RESULTS
                total_pnl = sum(t['pnl'] for t in trades)
                win_count = len([t for t in trades if t['result'] == 'TARGET' or t['result'] == 'SIGNAL_EXIT' or (t['result'] == 'SL' and t['pnl'] > 0)])
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
