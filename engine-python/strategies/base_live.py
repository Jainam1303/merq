from abc import ABC, abstractmethod

class BaseLiveStrategy(ABC):
    def __init__(self, config, logger, symbol_tokens):
        self.config = config
        self.logger = logger
        self.symbol_tokens = symbol_tokens
        self.signals = [] # List of triggered signals

    @abstractmethod
    def initialize(self, smartApi):
        """
        Run at session start. 
        Fetch historical data, calculate indicators, etc.
        """
        pass

    @abstractmethod
    def on_tick(self, symbol, ltp, prev_ltp, vwap, current_time):
        """
        Run on every WebSocket tick.
        Return dict: {"action": "BUY"/"SELL", "tp": float, "sl": float, "qty": int} or None
        """
        pass

    def log(self, msg, type="INFO"):
        self.logger.info(f"[STRATEGY] {msg}")
