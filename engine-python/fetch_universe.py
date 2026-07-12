import urllib.request
import json

url = "https://margincalculator.angelbroking.com/OpenAPI_File/files/OpenAPIScripMaster.json"
print("Downloading Angel One Scrip Master...")
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req) as response:
    data = json.loads(response.read().decode('utf-8'))

nse_eq = []
for item in data:
    # Filter for NSE Equity segment and '-EQ' symbols to get standard equities
    if item.get('exch_seg') == 'NSE' and item.get('symbol', '').endswith('-EQ'):
        nse_eq.append({
            "symbol": item['symbol'],
            "token": item['token'],
            "name": item['name']
        })

print(f"Found {len(nse_eq)} NSE Equity stocks.")

# The user wants ~1600 stocks. The NSE has about ~2000 equities.
# We will just write all of them to stock_universe.json
with open('stock_universe.json', 'w') as f:
    json.dump(nse_eq, f, indent=4)

print("Saved to stock_universe.json")
