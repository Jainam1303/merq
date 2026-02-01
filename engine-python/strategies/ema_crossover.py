import pandas as pd
import numpy as np

def backtest(df):
    """
    EMA 8-30 Crossover Strategy
    """
    trades = []
    
    # Constants
    INITIAL_CAPITAL = 100000
    
    df['date'] = df['timestamp'].dt.date
    
    # Calculate Indicators on the full dataframe (vectorized for speed)
    df['ema_8'] = df['close'].ewm(span=8, adjust=False).mean()
    df['ema_30'] = df['close'].ewm(span=30, adjust=False).mean()
    
    for date, day_df in df.groupby('date'):
        day_df = day_df.set_index('timestamp')
        day_df = day_df.between_time("09:15", "15:15")
        if day_df.empty: continue

        trade_count = 0
        position = None
        TRADE_LIMIT_DAILY = 1 # Simple limit

        # Iterate
        prev_row = None
        
        for idx, row in day_df.iterrows():
            if prev_row is None:
                prev_row = row
                continue

            if trade_count >= TRADE_LIMIT_DAILY: break
            
            # Crossover Logic
            # BUY: 8 EMA crosses above 30 EMA
            crossover_up = (prev_row['ema_8'] <= prev_row['ema_30']) and (row['ema_8'] > row['ema_30'])
            # SELL: 8 EMA crosses below 30 EMA
            crossover_down = (prev_row['ema_8'] >= prev_row['ema_30']) and (row['ema_8'] < row['ema_30'])

            # EXIT
            if position:
                # Simple Exit on Reverse Signal or EOD (EOD handled impliedly by loop end, but for backtest reporting we should close)
                # Actually let's exit on reverse crossover for this strategy
                if position["type"] == "BUY" and crossover_down:
                     pnl = (row["close"] - position["entry"]) * position["qty"]
                     trades.append({"type": "BUY", "result": "SIGNAL_EXIT", "pnl": pnl, "date": date})
                     position = None; trade_count += 1
                elif position["type"] == "SELL" and crossover_up:
                     pnl = (position["entry"] - row["close"]) * position["qty"]
                     trades.append({"type": "SELL", "result": "SIGNAL_EXIT", "pnl": pnl, "date": date})
                     position = None; trade_count += 1

            # ENTRY
            if position is None and trade_count < TRADE_LIMIT_DAILY:
                qty = int(INITIAL_CAPITAL / row["close"]) if row["close"] > 0 else 0
                if crossover_up:
                    position = {"type": "BUY", "entry": row["close"], "qty": qty}
                elif crossover_down:
                    position = {"type": "SELL", "entry": row["close"], "qty": qty}
            
            prev_row = row

        # EOD Close (if still open)
        if position:
            last_price = day_df.iloc[-1]["close"]
            if position["type"] == "BUY":
                pnl = (last_price - position["entry"]) * position["qty"]
                trades.append({"type": "BUY", "result": "EOD", "pnl": pnl, "date": date})
            elif position["type"] == "SELL":
                pnl = (position["entry"] - last_price) * position["qty"]
                trades.append({"type": "SELL", "result": "EOD", "pnl": pnl, "date": date})

    return trades
