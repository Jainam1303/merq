import pandas as pd
import numpy as np

def backtest(df):
    """
    ORB Strategy Logic
    """
    trades = []
    
    # Constants
    OR_START = "09:15"
    OR_END = "09:30"
    TARGET_PCT = 0.006 # 0.6%
    INITIAL_CAPITAL = 100000

    df['date'] = df['timestamp'].dt.date
    
    for date, day_df in df.groupby('date'):
        day_df = day_df.set_index('timestamp')
        day_df = day_df.between_time("09:15", "15:15")
        if day_df.empty: continue

        # Indicators
        day_df["cum_vol"] = day_df["volume"].cumsum()
        day_df["cum_vol_price"] = (day_df["close"] * day_df["volume"]).cumsum()
        day_df["vwap"] = day_df["cum_vol_price"] / day_df["cum_vol"]
        day_df['avg_volume'] = day_df['volume'].rolling(20).mean()

        opening_range = day_df.between_time(OR_START, OR_END)
        if opening_range.empty: continue
        
        OR_high = opening_range["high"].max()
        OR_low = opening_range["low"].min()
        OR_mid = (OR_high + OR_low) / 2
        
        trade_count = 0
        position = None
        TRADE_LIMIT_DAILY = 1

        for idx, row in day_df.iterrows():
            if idx.time() <= pd.to_datetime(OR_END).time(): continue
            if trade_count >= TRADE_LIMIT_DAILY: break

            # EXIT
            if position:
                if position["type"] == "BUY":
                    if row["low"] <= position["sl"]:
                        pnl = (position["sl"] - position["entry"]) * position["qty"]
                        trades.append({"type": "BUY", "result": "SL", "pnl": pnl, "date": date})
                        position = None; trade_count += 1
                    elif row["high"] >= position["target"]:
                        pnl = (position["target"] - position["entry"]) * position["qty"]
                        trades.append({"type": "BUY", "result": "TARGET", "pnl": pnl, "date": date})
                        position = None; trade_count += 1
                elif position["type"] == "SELL":
                    if row["high"] >= position["sl"]:
                        pnl = (position["entry"] - position["sl"]) * position["qty"]
                        trades.append({"type": "SELL", "result": "SL", "pnl": pnl, "date": date})
                        position = None; trade_count += 1
                    elif row["low"] <= position["target"]:
                        pnl = (position["entry"] - position["target"]) * position["qty"]
                        trades.append({"type": "SELL", "result": "TARGET", "pnl": pnl, "date": date})
                        position = None; trade_count += 1

            # ENTRY
            if position is None and trade_count < TRADE_LIMIT_DAILY:
                qty = int(INITIAL_CAPITAL / row["close"]) if row["close"] > 0 else 0
                if (row["close"] > OR_high and row["close"] > row["vwap"] and row["volume"] > 1.5 * row.get('avg_volume', 0)):
                    position = {"type": "BUY", "entry": row["close"], "sl": OR_mid, "target": row["close"]*(1+TARGET_PCT), "qty": qty}
                elif (row["close"] < OR_low and row["close"] < row["vwap"] and row["volume"] > 1.5 * row.get('avg_volume', 0)):
                    position = {"type": "SELL", "entry": row["close"], "sl": OR_mid, "target": row["close"]*(1-TARGET_PCT), "qty": qty}
    
    return trades
