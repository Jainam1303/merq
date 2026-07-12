import yfinance as yf
from scanner import scan_vcp
import pandas as pd

def run_test():
    print('Fetching RELIANCE.NS...')
    # Fetch 300 days of data for RELIANCE
    ticker = yf.Ticker("RELIANCE.NS")
    df = ticker.history(period="1y")
    
    # yfinance column names are capitalized, convert to lower for our scanner
    df.columns = [c.lower() for c in df.columns]
    
    match, ind = scan_vcp(df)
    print(f"Match: {match}")
    print(f"Indicators: {ind}")
    
    # Try testing the conditions manually
    atr = ind.get('atr_14')
    atr_10 = ind.get('atr_10d_ago')
    print(f"Cond 1 (ATR < ATR10): {atr} < {atr_10} -> {atr < atr_10}")

if __name__ == "__main__":
    run_test()
