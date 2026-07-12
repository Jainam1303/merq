import json
import pandas as pd
from scanner import scan_vcp, fetch_daily_data, login_smart_api, load_stock_universe
import traceback

def run_test():
    try:
        with open('../backend-node/.env', 'r') as f:
            lines = f.readlines()
        env = {}
        for line in lines:
            if '=' in line:
                k, v = line.strip().split('=', 1)
                env[k] = v
                
        # Since .env might not have the user's specific API keys,
        # Let's query the DB to get the user's keys directly!
        import psycopg2
        db_url = env.get('DATABASE_URL', '').replace('"', '')
        conn = psycopg2.connect(db_url)
        cur = conn.cursor()
        cur.execute("SELECT angel_api_key, angel_client_code, angel_password, angel_totp, angel_access_token FROM users WHERE id=1")
        row = cur.fetchone()
        conn.close()
        
        creds = {
            'apiKey': row[0],
            'clientCode': row[1],
            'password': row[2],
            'totp': row[3],
            'access_token': row[4]
        }
        
        print('Logging in...')
        api = login_smart_api(creds)
        print('Logged in successfully!')
        
        universe = load_stock_universe()
        print(f"Universe size: {len(universe)}")
        
        # Test just the first 50 stocks to see what data they return
        for stock in universe[:10]:
            token = stock.get('token', '')
            symbol = stock.get('symbol', '')
            print(f"\nFetching {symbol} ({token})...")
            df = fetch_daily_data(api, token, days=300)
            
            if df is None or df.empty:
                print(f"FAIL: Data is empty for {symbol}!")
                continue
            
            print(f"Data received: {len(df)} rows. Last close: {df['close'].iloc[-1]}")
            match, ind = scan_vcp(df)
            print(f"Match for {symbol}: {match}. Indicators: {ind}")

    except Exception as e:
        print(f"Error: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    run_test()
