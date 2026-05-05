# MerQPrime Stock Scanner Workflow

This document explains the end-to-end workflow of the Stock Scanner functionality, from the frontend UI down to the core calculation engine.

## 1. The User Interface (Frontend - React/Next.js)
**Files:** `Scanner.tsx` & `MobileScannerView.tsx`

* **Initialization:** When you open the Scanner page, the frontend calls the `/scanner/list` endpoint to get the available scanners (currently **VCP Scanner** and **IPO Base Scanner**) along with their descriptions and exact filtering conditions.
* **Running a Scan:** When you click **"Run Scan"**, the frontend sends a POST request to the backend with the chosen `scanner_id`. 
* **Real-time Progress:** Because scanning takes time, the frontend starts polling a `/scanner/progress` endpoint every 2 seconds. This updates a live progress bar showing exactly which stock is currently being evaluated and how many matches have been found so far.
* **Displaying Results:** Once the scan completes, a sortable data table appears showing matching stocks, their CMP (Close Price), Change %, Volume, and technical indicators (like ATR, EMA50, and distance from 52-week high). You can also click to export the results directly to a CSV file.

## 2. The Relay (Backend - Node.js)
**File:** `engineService.js`

* The Node.js backend acts as a secure bridge. It receives the scan request from the frontend and attaches your active **Broker Credentials** (Angel One API key, Client Code, Password, TOTP).
* It securely forwards this request via a signed HMAC internal request to the Python Engine (`/engine/scanner/run`). 
* It sets a long timeout (up to 10 minutes) to ensure the request doesn't drop while the Python engine crunches the data.

## 3. The API Gateway (Python Engine)
**File:** `main.py`

The FastAPI Python server exposes three new endpoints:
1. `GET /engine/scanner/list`: Returns the scanner dictionary.
2. `POST /engine/scanner/run`: Validates that broker credentials exist and triggers the core scanner function.
3. `GET /engine/scanner/progress/{scanner_id}`: Allows the frontend to read the real-time progress dictionary.

## 4. The Core Logic & Number Crunching (Scanner Engine)
**File:** `scanner.py`

This is where the heavy lifting happens. When `run_scanner()` is triggered, it follows these exact steps:

1. **Smart Cache System:** First, it checks its in-memory cache. If someone ran this exact scan in the last 30 minutes, it instantly returns the cached results to save API calls and time.
2. **Broker Login:** It uses your Angel One credentials to generate a fresh `SmartConnect` session.
3. **Load Stock Universe:** It loads a list of target stocks from a local `stock_universe.json` file (falling back to Nifty 50 tokens if the file is missing).
4. **Data Fetching Loop:** It loops through every single stock in the universe:
   * It fetches the last **500 to 600 days** of daily candlestick data (OHLCV) directly from the Angel One SmartAPI.
   * It applies a `0.35-second` delay between requests to ensure it respects Angel One's API rate limits (avoiding bans).
5. **Indicator Calculation (Pandas & Numpy):**
   * It loads the historical data into a Pandas DataFrame.
   * Based on the scanner chosen, it calculates complex technicals: **ATR(14)**, **EMA(50)**, **EMA(150)**, **EMA(200)**, and **52-week Highs**.
6. **Condition Filtering:**
   * **For VCP (Volatility Contraction Pattern):** It checks 8 strict rules (e.g., Is today's ATR lower than 10 days ago? Is the price > 75% of the 52W High? Are the EMAs perfectly stacked bullishly?). All 8 rules must pass.
   * **For IPO Base:** It checks if the stock was listed less than 400 days ago, has a price > ₹50, and has good volume. All 3 rules must pass.
7. **Return Results:** It collects all the stocks that passed the filters, sorts them (VCP sorts by closest to 52-week high), caches the final JSON, marks the progress tracker as "complete", and sends the data back up the chain to your screen.
