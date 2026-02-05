"""
Test Order Execution Module
Direct Angel Smart API order placement for diagnostic purposes
"""

from flask import Flask, request, jsonify
from SmartApi import SmartConnect
import pyotp
import time

app = Flask(__name__)

@app.route('/execute_test_order', methods=['POST'])
def execute_test_order():
    try:
        data = request.json
        symbol = data['symbol']
        qty = int(data['qty'])
        order_type = data['orderType']  # 'BUY' or 'SELL'
        credentials = data['credentials']
        price = data.get('price', None)  # Optional limit price
        tp = data.get('tp', None)
        sl = data.get('sl', None)
        
        # Initialize Angel API
        api_key = credentials['apiKey']
        client_code = credentials['clientCode']
        password = credentials['password']
        totp_key = credentials['totp']
        
        smart_api = SmartConnect(api_key=api_key)
        
        # Generate TOTP
        totp = pyotp.TOTP(totp_key).now()
        
        # Login
        session_data = smart_api.generateSession(client_code, password, totp)
        
        if not session_data or not session_data.get('status'):
            return jsonify({
                'success': False,
                'message': f"Login failed: {session_data.get('message', 'Unknown error')}"
            }), 400
        
        # Get symbol token
        clean_symbol = symbol.upper().replace("-EQ", "")
        search_result = smart_api.searchScrip("NSE", clean_symbol)
        
        if not search_result or not search_result.get('status') or not search_result.get('data'):
            return jsonify({
                'success': False,
                'message': f"Symbol {symbol} not found in NSE"
            }), 400
        
        symbol_token = search_result['data'][0]['symboltoken']
        trading_symbol = search_result['data'][0]['tradingsymbol']
        
        # Prepare order parameters
        order_params = {
            "variety": "NORMAL",
            "tradingsymbol": trading_symbol,
            "symboltoken": str(symbol_token),
            "transactiontype": order_type,
            "exchange": "NSE",
            "ordertype": "MARKET" if not price else "LIMIT",
            "producttype": "INTRADAY",  # MIS
            "duration": "DAY",
            "quantity": str(qty)
        }
        
        if price:
            order_params["price"] = str(price)
        else:
            order_params["price"] = "0"
        
        # These are required even for market orders in some API versions
        order_params["squareoff"] = "0"
        order_params["stoploss"] = "0"
        
        # Place order
        try:
            response = smart_api.placeOrder(order_params)
            
            if not response:
                return jsonify({
                    'success': False,
                    'message': 'Angel API returned None/Empty response',
                    'orderParams': order_params
                }), 500
            
            # Parse response
            if isinstance(response, dict):
                if response.get('status') == True:
                    order_id = response.get('data', {}).get('orderid')
                    
                    result = {
                        'success': True,
                        'orderId': order_id,
                        'symbol': symbol,
                        'quantity': qty,
                        'type': order_type,
                        'message': f"✅ Order placed successfully. OrderID: {order_id}",
                        'apiResponse': response
                    }
                    
                    # If TP/SL provided, place GTT order
                    if order_id and (tp or sl):
                        try:
                            # Note: GTT/OCO orders require separate API calls
                            # This is a placeholder for SL/TP order modification
                            result['sltp_status'] = 'SL/TP order placement requires separate API implementation'
                        except Exception as gtt_error:
                            result['sltp_error'] = str(gtt_error)
                    
                    return jsonify(result)
                else:
                    return jsonify({
                        'success': False,
                        'message': response.get('message', 'Order rejected'),
                        'errorCode': response.get('errorcode', 'Unknown'),
                        'apiResponse': response,
                        'orderParams': order_params
                    }), 400
            else:
                # String response (order ID directly)
                return jsonify({
                    'success': True,
                    'orderId': str(response),
                    'symbol': symbol,
                    'quantity': qty,
                    'type': order_type,
                    'message': f"✅ Order placed successfully. OrderID: {response}"
                })
                
        except Exception as order_error:
            return jsonify({
                'success': False,
                'message': f"Order placement failed: {str(order_error)}",
                'orderParams': order_params
            }), 500
        
    except Exception as e:
        import traceback
        return jsonify({
            'success': False,
            'message': str(e),
            'traceback': traceback.format_exc()
        }), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5002, debug=True)
