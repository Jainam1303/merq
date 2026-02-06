"""
TEST Strategy - For development and debugging
Immediately generates a BUY signal on first tick (no conditions)
"""
from .base_live import BaseLiveStrategy

class LiveTest(BaseLiveStrategy):
    def __init__(self, config, logger, symbol_tokens):
        super().__init__(config, logger, symbol_tokens)
        self.triggered_symbols = set()  # Track which symbols have triggered
    
    def initialize(self, smartApi):
        """No initialization needed for TEST strategy"""
        self.log("TEST Strategy Initialized - Will BUY on first tick for each symbol")
    
    def on_tick(self, symbol, ltp, prev_ltp, vwap, current_time):
        """
        Immediately return BUY signal on first tick for each symbol.
        Useful for testing order execution without waiting for market conditions.
        """
        # Only trigger once per symbol per session
        if symbol in self.triggered_symbols:
            return None
        
        self.triggered_symbols.add(symbol)
        
        # Calculate position size based on capital
        capital = float(self.config.get('capital', 100000))
        qty = int(capital / ltp) if ltp > 0 else 1
        qty = max(1, qty)
        
        # Fixed TP/SL for testing
        tp = round(ltp * 1.006, 2)  # 0.6% Target
        sl = round(ltp * 0.99, 2)   # 1% Stop Loss
        
        self.log(f"🧪 TEST: Generating immediate BUY for {symbol} @ {ltp}")
        
        return {
            "action": "BUY",
            "tp": tp,
            "sl": sl,
            "qty": qty
        }


def backtest(df):
    """
    TEST Strategy Backtest - Buy at start, sell at end
    Only for testing the backtest framework
    """
    if df.empty:
        return []
    
    first_row = df.iloc[0]
    last_row = df.iloc[-1]
    
    entry = float(first_row['close'])
    exit = float(last_row['close'])
    qty = int(100000 / entry) if entry > 0 else 1
    pnl = (exit - entry) * qty
    
    return [{
        "type": "BUY",
        "result": "TARGET" if pnl > 0 else "SL",
        "pnl": pnl,
        "date": first_row['timestamp']
    }]
