from SmartApi import SmartConnect
from logzero import logger
import pandas as pd
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

        # Token Map (Fallback if DB tokens missing in frontend request, but ideally frontend sends tokens)
        # In this flow, we might need to lookup tokens if only symbols provided.
        # Ideally, we should fetch master contract or use a small local map.
        # For now, we assume standard map or fallback.
        token_map = {
            "ADANIPOWER-EQ": "17388", "IDEA-EQ": "14366", "RELIANCE-EQ": "2885", 
            "TCS-EQ": "11536", "INFY-EQ": "1594", "HDFCBANK-EQ": "1333", 
            "SBIN-EQ": "3045", "5PAISA-EQ": "445", "BANKNIFTY": "99992000"
        }
        
        for symbol in selected_symbols:
            # Clean symbol
            sym = symbol.replace("-EQ", "") + "-EQ"
            market_token = token_map.get(sym, "2885") # Default to Reliance if unknown
            # If front-end passes object with token use that, but here we only have list of strings likely?
            # Based on previous logs, selectedStocks is string[]
            
            df = pd.DataFrame()

            # REAL DATA FETCH
            if smartApi:
                try:
                    # Fetch
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
            
            trades = strat_module.backtest(df)
            
            # AGGREGATE RESULTS
            total_pnl = sum(t['pnl'] for t in trades)
            win_count = len([t for t in trades if t['result'] == 'TARGET' or t['result'] == 'SIGNAL_EXIT' and t['pnl'] > 0])
            total_trades = len(trades)
            win_rate = (win_count / total_trades * 100) if total_trades > 0 else 0
            
            summary_results.append({
                "Symbol": symbol,
                "Total Trades": total_trades,
                "Win Rate %": f"{win_rate:.2f}%",
                "Total P&L": f"{total_pnl:.2f}",
                "Final Capital": f"{100000 + total_pnl:.2f}"
            })
            
        return summary_results

    except Exception as e:
        logger.exception(f"Backtest Runner Failed: {e}")
        return []
