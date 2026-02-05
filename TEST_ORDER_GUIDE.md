# Test Order Execution - Setup and Usage Guide

## Overview
The Test Order feature allows you to directly test Angel Smart API connectivity by placing real market orders with optional TP/SL levels. This bypasses all strategy logic and validates:
- Angel API credentials
- Symbol token lookup
- Order placement
- MIS (Intraday) orders
- Real-time API responses

## Setup Instructions

### 1. Start the Test Order Microservice

On your AWS server (or locally):

```bash
cd ~/merq/engine-python
python3 test_order_service.py
```

The service will run on port 5002.

### 2. Ensure Backend Routing

The Node.js backend at port 5001 forwards test order requests to the Python service at port 5002. Make sure both are running:

```bash
# Check if services are running
pm2 status

# Restart if needed
pm2 restart merq-backend
pm2 restart merq-engine
```

### 3. Frontend Access

1. Navigate to **Settings** (Profile icon in sidebar)
2. Click on the **🧪 Test Orders** tab
3. Fill in the test order form

## Using Test Orders

### Basic Test Order
1. **Select Symbol**: Choose from dropdown (e.g., IGL, INFY, RELIANCE)
2. **Enter Quantity**: Start with 1-2 shares for testing
3. **Choose Order Type**: BUY or SELL
4. **Execute**: Click "Execute Test Order"

### Market Order (Recommended for Testing)
- Leave **Limit Price** blank
- Order executes at current market price immediately

### Limit Order
- Enter **Limit Price**: Specific price you want to buy/sell at
- Order may not execute if market doesn't reach that price

### With Stop Loss / Take Profit
- **Take Profit**: Target price to automatically exit with profit
- **Stop Loss**: Protection price to limit losses
- Note: SL/TP require separate GTT API calls (optional feature)

## What to Check

### Successful Order
✅ Response shows:
```json
{
  "success": true,
  "orderId": "123456789",
  "message":"✅ Order placed successfully"
}
```

### Failed Order - Check These
❌ **"Login failed"**: AngelOne credentials are incorrect
❌ **"Symbol not found"**: Stock symbol doesn't exist on NSE
❌ **"Insufficient funds"**: Not enough balance in trading account
❌ **"After market hours"**: Trading outside 9:15 AM - 3:30 PM
❌ **"Invalid Token"**: Session expired, retry (auto-refresh implemented)

## Important Notes

⚠️ **REAL MONEY**: This places ACTUAL orders on your Angel One account
⚠️ **MIS ORDERS**: All orders are Intraday (auto-square-off at 3:20 PM)
⚠️ **Market Hours**: Only works during trading hours (9:15 AM - 3:30 PM IST)
⚠️ **Start Small**: Test with 1-2 quantity first

## Troubleshooting

### Service Not Running
```bash
# On AWS server
cd ~/merq/engine-python
python3 test_order_service.py

# In another terminal
pm2 logs merq-backend
```

### "Connection Refused" Error
- Check if test_order_service.py is running on port 5002
- Verify firewall allows internal port 5002 access

### Angel API Errors
- Check if Angel API credentials are saved in Settings > API Keys
- Verify market is open
- Check if you have KYC and trading permissions

## Next Steps

After successful test:
1. Verify order in your Angel One app
2. Check order book
3. Square off position if needed
4. Proceed to Live Trading with confidence

## API Response Examples

### Success
```json
{
  "success": true,
  "orderId": "240205000123456",
  "symbol": "IGL-EQ",
  "quantity": 1,
  "type": "BUY",
  "message": "✅ Order placed successfully. OrderID: 240205000123456",
  "apiResponse": {
    "status": true,
    "data": { "orderid": "240205000123456" }
  }
}
```

### Error
```json
{
  "success": false,
  "message": "Insufficient funds",
  "errorCode": "AB2012",
  "orderParams": { ... }
}
```
