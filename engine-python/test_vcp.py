import json
import pandas as pd
from scanner import scan_vcp, fetch_daily_data, login_smart_api, load_stock_universe

def run_test():
    with open('../backend-node/.env', 'r') as f:
        lines = f.readlines()
    env = {}
    for line in lines:
        if '=' in line:
            k, v = line.strip().split('=', 1)
            env[k] = v
            
    creds = {
        'apiKey': env.get('ANGEL_API_KEY', ''),
        'clientCode': env.get('ANGEL_CLIENT_CODE', ''),
        'password': env.get('ANGEL_PASSWORD', ''),
        'totp': env.get('ANGEL_TOTP', '')
    }
    
    print('Logging in...')
    api = login_smart_api(creds)
    print('Logged in')
    
    universe = load_stock_universe()
    print(f"Loaded {len(universe)} stocks")
    
    matches = []
    failed_at = {i: 0 for i in range(1, 9)} # tracking which of the 8 conditions failed
    
    for i, stock in enumerate(universe[:200]): # test first 200 stocks
        token = stock.get('token', '')
        symbol = stock.get('symbol', '')
        df = fetch_daily_data(api, token, days=300)
        
        if df is not None and not df.empty:
            match, ind = scan_vcp(df)
            if match:
                matches.append(symbol)
                
    print(f'Matches in first 200: {len(matches)}')
    print('Matched symbols:', matches)

if __name__ == "__main__":
    run_test()
