import yfinance as yf
import pandas as pd
import time

def test_yf():
    tickers = ["RELIANCE.NS", "TCS.NS", "INFY.NS", "HDFCBANK.NS", "SBIN.NS"]
    
    start = time.time()
    print("Downloading...")
    # Setting threads to True uses multiple threads for download
    data = yf.download(tickers, period="2y", group_by="ticker", threads=True)
    print(f"Downloaded in {time.time() - start:.2f} seconds")
    
    for ticker in tickers:
        df = data[ticker]
        df = df.dropna(how='all') # remove empty rows if any
        # Convert columns to lowercase to match our scanner requirements
        df.columns = [c.lower() for c in df.columns]
        print(f"{ticker} has {len(df)} rows. Last close: {df['close'].iloc[-1]}")

if __name__ == "__main__":
    test_yf()
