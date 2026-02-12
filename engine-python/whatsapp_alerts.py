"""
WhatsApp Alert Service for MerQPrime Trading Engine.
Uses the free CallMeBot API to send WhatsApp alerts PER-USER.

Each user configures their own phone number and API key in their Profile page.
When the engine starts a session, it receives the user's WhatsApp credentials 
and uses them to send personalized alerts.

Setup for Users:
1. Go to https://www.callmebot.com/blog/free-api-whatsapp-messages/
2. Send the activation message to the CallMeBot WhatsApp number
3. Copy the API key you receive
4. Go to Profile > WhatsApp Alerts and enter your phone number and API key

Usage in engine:
    from whatsapp_alerts import WhatsAppAlerter
    alerter = WhatsAppAlerter(phone="919876543210", api_key="abc123")
    alerter.send("Hello from MerQPrime!")
"""

import threading
import requests


CALLMEBOT_URL = "https://api.callmebot.com/whatsapp.php"


class WhatsAppAlerter:
    """Per-user WhatsApp alerter. Created once per trading session."""
    
    def __init__(self, phone: str = '', api_key: str = ''):
        self.phone = phone.strip() if phone else ''
        self.api_key = api_key.strip() if api_key else ''
        self.enabled = bool(self.phone and self.api_key)
        
        if self.enabled:
            print(f"[WhatsApp] ✅ Alerts enabled for phone: ...{self.phone[-4:]}")
        else:
            print(f"[WhatsApp] ℹ️ Alerts disabled (no phone/key configured)")
    
    def send(self, message: str):
        """Send a WhatsApp alert asynchronously (non-blocking)."""
        if not self.enabled:
            return
        thread = threading.Thread(target=self._send_sync, args=(message,), daemon=True)
        thread.start()
    
    def _send_sync(self, message: str):
        """Internal sync method to send WhatsApp message via CallMeBot API."""
        try:
            params = {
                'phone': self.phone,
                'text': message,
                'apikey': self.api_key
            }
            resp = requests.get(CALLMEBOT_URL, params=params, timeout=10)
            if resp.status_code == 200:
                print(f"[WhatsApp] ✅ Alert sent: {message[:50]}...")
            else:
                print(f"[WhatsApp] ⚠️ Failed (HTTP {resp.status_code}): {resp.text[:100]}")
        except Exception as e:
            print(f"[WhatsApp] ❌ Error: {e}")

    # ----- Pre-built alert methods -----

    def order_placed(self, symbol: str, order_type: str, price: float, qty: int, mode: str):
        """Alert when a new order is placed."""
        emoji = "🟢" if order_type == "BUY" else "🔴"
        mode_tag = "📄 PAPER" if mode == "PAPER" else "🔥 LIVE"
        self.send(
            f"{emoji} *Order Placed*\n"
            f"Symbol: {symbol}\n"
            f"Type: {order_type}\n"
            f"Price: ₹{price:.2f}\n"
            f"Qty: {qty}\n"
            f"Mode: {mode_tag}"
        )

    def tp_hit(self, symbol: str, entry: float, exit_price: float, pnl: float, mode: str):
        """Alert when Take Profit is hit."""
        self.send(
            f"🎯 *Target Hit!*\n"
            f"Symbol: {symbol}\n"
            f"Entry: ₹{entry:.2f} → Exit: ₹{exit_price:.2f}\n"
            f"PnL: ₹{pnl:+.2f}\n"
            f"Mode: {'📄 PAPER' if mode == 'PAPER' else '🔥 LIVE'}"
        )

    def sl_hit(self, symbol: str, entry: float, exit_price: float, pnl: float, mode: str):
        """Alert when Stop Loss is hit."""
        self.send(
            f"🛑 *Stop Loss Hit!*\n"
            f"Symbol: {symbol}\n"
            f"Entry: ₹{entry:.2f} → Exit: ₹{exit_price:.2f}\n"
            f"PnL: ₹{pnl:+.2f}\n"
            f"Mode: {'📄 PAPER' if mode == 'PAPER' else '🔥 LIVE'}"
        )

    def trade_closed(self, symbol: str, reason: str, pnl: float, mode: str):
        """Generic alert for any trade close."""
        emoji = "✅" if pnl >= 0 else "❌"
        self.send(
            f"{emoji} *Trade Closed*\n"
            f"Symbol: {symbol}\n"
            f"Reason: {reason}\n"
            f"PnL: ₹{pnl:+.2f}\n"
            f"Mode: {'📄 PAPER' if mode == 'PAPER' else '🔥 LIVE'}"
        )

    def session_started(self, user_id, mode: str, strategy: str, symbols: list):
        """Alert when trading session starts."""
        self.send(
            f"🚀 *Session Started*\n"
            f"Mode: {'📄 PAPER' if mode == 'PAPER' else '🔥 LIVE'}\n"
            f"Strategy: {strategy}\n"
            f"Symbols: {', '.join(symbols[:5])}"
        )

    def session_stopped(self, total_pnl: float, total_trades: int):
        """Alert when trading session stops."""
        emoji = "💰" if total_pnl >= 0 else "📉"
        self.send(
            f"{emoji} *Session Stopped*\n"
            f"Total PnL: ₹{total_pnl:+.2f}\n"
            f"Trades: {total_trades}"
        )
