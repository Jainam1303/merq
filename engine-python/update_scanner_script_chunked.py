import re

def update_file():
    with open("scanner.py", "r") as f:
        content = f.read()

    new_run_scanner = '''
def run_scanner(scanner_id, broker_credentials, sentiment_map={}, filter_sentiment=False):
    """Execute scan over entire universe using yfinance bulk download (Chunked)"""
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
    total_stocks = len(universe)
    
    scan_id = f"{scanner_id}_{int(time.time())}"
    _scan_progress[scanner_id] = {
        "status": "running",
        "current": 0,
        "total": total_stocks,
        "symbol": "Initializing...",
        "matches": 0
    }
    
    results = []
    errors = 0
    
    logger.info(f"Starting {scanner_id} scan on {total_stocks} stocks via yfinance...")
    
    # Prepare tickers
    tickers = []
    ticker_to_info = {}
    for stock in universe:
        sym = stock.get("symbol", "").replace("-EQ", "")
        if not sym:
            continue
        yf_ticker = f"{sym}.NS"
        tickers.append(yf_ticker)
        ticker_to_info[yf_ticker] = stock
    
    days_to_fetch = "2y"
    batch_size = 50
    
    for i in range(0, len(tickers), batch_size):
        batch_tickers = tickers[i:i+batch_size]
        
        try:
            data = yf.download(batch_tickers, period=days_to_fetch, group_by="ticker", threads=True, progress=False)
        except Exception as e:
            logger.error(f"yfinance download failed for batch {i}: {e}")
            errors += len(batch_tickers)
            continue
            
        for j, yf_ticker in enumerate(batch_tickers):
            try:
                stock_info = ticker_to_info[yf_ticker]
                symbol = stock_info.get('symbol', '').replace('-EQ', '')
                name = stock_info.get('name', symbol)
                
                # Update progress
                current_idx = i + j + 1
                _scan_progress[scanner_id] = {
                    "status": "running",
                    "current": current_idx,
                    "total": total_stocks,
                    "symbol": symbol,
                    "matches": len(results)
                }
                
                if len(batch_tickers) == 1:
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
                    logger.info(f"[{scanner_id.upper()}] MATCH: {symbol}")
                
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

    pattern = re.compile(r'def run_scanner\(.*?\):.*?(?=def |\Z)', re.DOTALL)
    
    if pattern.search(content):
        content = pattern.sub(new_run_scanner + "\n", content)
    else:
        print("Could not find run_scanner")
        
    with open("scanner.py", "w") as f:
        f.write(content)

    print("Updated scanner.py with chunking")

if __name__ == "__main__":
    update_file()
