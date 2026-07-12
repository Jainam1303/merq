import re

def update_file():
    with open("scanner.py", "r") as f:
        content = f.read()

    # Add yfinance import
    if "import yfinance as yf" not in content:
        content = content.replace("import pandas as pd", "import pandas as pd\nimport yfinance as yf")

    # Replace fetch_daily_data
    # We don't need fetch_daily_data anymore, but we can leave it or remove it.
    
    # Replace run_scanner completely
    new_run_scanner = '''
def run_scanner(scanner_id, broker_credentials, sentiment_map={}, filter_sentiment=False):
    """Execute scan over entire universe using yfinance bulk download"""
    global _scan_cache, _scan_progress
    
    # Check cache first
    cache_key = scanner_id
    if cache_key in _scan_cache:
        cached = _scan_cache[cache_key]
        if time.time() - cached['timestamp'] < CACHE_TTL_SECONDS:
            logger.info(f"Returning cached results for {scanner_id}")
            return cached['data']
    
    # Load universe
    universe = load_stock_universe()
    # Limit to 500 stocks for speed if we don't want to scan all 2400 in one go, 
    # but yfinance can handle 2400. Let's just do the whole universe!
    total_stocks = len(universe)
    
    scan_id = f"{scanner_id}_{int(time.time())}"
    _scan_progress[scanner_id] = {
        "status": "running",
        "current": 0,
        "total": total_stocks,
        "symbol": "",
        "matches": 0
    }
    
    results = []
    errors = 0
    
    logger.info(f"Starting {scanner_id} scan on {total_stocks} stocks via yfinance...")
    
    # Prepare tickers for yfinance (Append .NS for NSE)
    tickers = []
    ticker_to_info = {}
    for stock in universe:
        sym = stock.get("symbol", "").replace("-EQ", "")
        if not sym:
            continue
        yf_ticker = f"{sym}.NS"
        tickers.append(yf_ticker)
        ticker_to_info[yf_ticker] = stock
    
    # Bulk Download
    days_to_fetch = "2y" # Approx 500 trading days
    logger.info(f"Downloading data for {len(tickers)} tickers...")
    try:
        data = yf.download(tickers, period=days_to_fetch, group_by="ticker", threads=True, progress=False)
    except Exception as e:
        logger.error(f"yfinance download failed: {e}")
        return {"status": "error", "message": "Failed to fetch market data"}
        
    logger.info("Download complete. Processing...")
    
    for i, yf_ticker in enumerate(tickers):
        try:
            stock_info = ticker_to_info[yf_ticker]
            symbol = stock_info.get('symbol', '').replace('-EQ', '')
            name = stock_info.get('name', symbol)
            
            # Update progress
            _scan_progress[scanner_id] = {
                "status": "running",
                "current": i + 1,
                "total": total_stocks,
                "symbol": symbol,
                "matches": len(results)
            }
            
            if len(tickers) == 1:
                df = data
            else:
                if yf_ticker not in data:
                    errors += 1
                    continue
                df = data[yf_ticker]
                
            df = df.dropna(how='all')
            if df.empty or len(df) < 50:
                errors += 1
                continue
                
            # Convert yfinance columns to match our expected format (lowercase)
            df.columns = [c.lower() for c in df.columns]
            
            # Apply scanner filter
            match = False
            indicators = {}
            
            if scanner_id == "vcp":
                match, indicators = scan_vcp(df)
            elif scanner_id == "ipo_base":
                match, indicators = scan_ipo_base(df, len(df))
            
            if match:
                sentiment = sentiment_map.get(symbol, 0.0)
                if filter_sentiment and sentiment < 0.05:
                    continue
                    
                results.append({
                    "sr": len(results) + 1,
                    "symbol": symbol,
                    "name": name,
                    "sentiment": sentiment,
                    **indicators
                })
                logger.info(f"[{scanner_id.upper()}] MATCH: {symbol} (Sentiment: {sentiment})")
            
        except Exception as e:
            logger.error(f"Error processing {yf_ticker}: {e}")
            errors += 1
            
    logger.info(f"Scan complete. Found {len(results)} matches, {errors} errors.")
    
    final_data = {
        "status": "success",
        "scanner": scanner_id,
        "matches": len(results),
        "results": results
    }
    
    _scan_cache[cache_key] = {
        "timestamp": time.time(),
        "data": final_data
    }
    
    _scan_progress[scanner_id]["status"] = "completed"
    
    return final_data
'''

    # We need to replace the old run_scanner with the new one.
    import re
    pattern = re.compile(r'def run_scanner\(.*?\):.*?(?=def |\Z)', re.DOTALL)
    
    if pattern.search(content):
        content = pattern.sub(new_run_scanner + "\n", content)
    else:
        print("Could not find run_scanner")
        
    with open("scanner.py", "w") as f:
        f.write(content)

    print("Updated scanner.py")

if __name__ == "__main__":
    update_file()
