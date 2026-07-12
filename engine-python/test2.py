import yfinance as yf
import json

universe = json.load(open('stock_universe.json'))
tickers = [s['symbol'].replace('-EQ', '') + '.NS' for s in universe]
print('Downloading', len(tickers))
yf.download(tickers, period='2y', group_by='ticker', threads=True, progress=True)
print('Done')
