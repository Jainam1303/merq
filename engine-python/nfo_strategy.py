
from custom_strategy import fetch_historical_data
from custom_strategy import OR_START, OR_END
from logzero import logger
import pandas as pd
import numpy as np

# ===============================
# NFO CONFIGURATION
# ===============================
TARGET_POINTS = 50.0  
LOT_SIZE = 65         

def check_signal(df):
    try:
        if df.empty or len(df) < 20: return None, None
        
        # Ensure proper datetime index
        if 'timestamp' in df.columns and not isinstance(df.index, pd.DatetimeIndex):
            df['timestamp'] = pd.to_datetime(df['timestamp'])
            df = df.set_index('timestamp')

        # Create Standardized Columns (Matches Stock Logic)
        # Note: Stock logic uses Capitalized Open/High/Low/Close and lowercase volume
        if 'open' in df.columns: df['Open'] = df['open'].astype(float)
        if 'high' in df.columns: df['High'] = df['high'].astype(float)
        if 'low' in df.columns: df['Low'] = df['low'].astype(float)
        if 'close' in df.columns: df['Close'] = df['close'].astype(float)
        if 'volume' in df.columns: df['volume'] = df['volume'].astype(float)

        df['avg_volume'] = df['volume'].rolling(20).mean()
        
        latest = df.iloc[-1]
        current_time = latest.name.time()
        start = pd.to_datetime(OR_START).time()
        end = pd.to_datetime("14:30").time()
        
        if not (start <= current_time <= end): return None, None

        today_data = df[df.index.date == latest.name.date()]
        if len(today_data) < 5: return None, None
        
        opening_range = today_data.between_time(OR_START, OR_END)
        if opening_range.empty: return None, None
        
        OR_high = opening_range["High"].max()
        OR_low = opening_range["Low"].min()
        OR_mid = (OR_high + OR_low) / 2
        
        close = float(latest['Close'])
        volume = float(latest['volume'])
        avg_vol = float(latest['avg_volume']) if not pd.isna(latest['avg_volume']) else 0
        
        entry_price = close
        
        if close > OR_high and volume > 1.5 * avg_vol:
            sl = OR_mid
            target = entry_price + TARGET_POINTS
            return 'BUY', {'sl': sl, 'target': target, 'entry': entry_price, 'quantity': LOT_SIZE}

        elif close < OR_low and volume > 1.5 * avg_vol:
            sl = OR_mid
            target = entry_price - TARGET_POINTS
            return 'SELL', {'sl': sl, 'target': target, 'entry': entry_price, 'quantity': LOT_SIZE}
            
        return None, None
    except Exception as e:
        logger.error(f"NFO Signal Error: {e}")
        return None, None

def backtest(smartApi, selected_symbols=[], interval="FIVE_MINUTE", from_date="2022-01-01 09:15", to_date="2022-03-31 15:30", stock_list=[]):
    logger.info("Starting NFO Backtest (Robust Mode)...")
    summary_results = []
    
    target_stocks = []
    if stock_list:
        target_stocks = [s for s in stock_list if s['symbol'] in selected_symbols]
        
    for stock in target_stocks:
        trading_symbol = stock['symbol']
        symbol_token = stock['token']
        exchange = stock.get('exchange', 'NSE') 
        
        logger.info(f"[NFO BACKTEST] Processing {trading_symbol}")
        
        data_response = fetch_historical_data(smartApi, exchange, symbol_token, interval, from_date, to_date)
        
        if data_response and data_response.get('status') and data_response.get('data'):
            raw_data = data_response['data']
            # Replicate STOCK LOGIC Dataframe creation EXACTLY
            df = pd.DataFrame(raw_data, columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])
            df['timestamp'] = pd.to_datetime(df['timestamp'])
            
            # Create Capitalized Columns manually to match stock logic refs
            df['Open'] = df['open'].astype(float)
            df['High'] = df['high'].astype(float)
            df['Low'] = df['low'].astype(float)
            df['Close'] = df['close'].astype(float)
            df['volume'] = df['volume'].astype(float)

            df['avg_volume'] = df['volume'].rolling(20).mean()
            df['date'] = df['timestamp'].dt.date
            trades = []

            for date, day_df in df.groupby('date'):
                day_df = day_df.set_index('timestamp')
                day_df = day_df.between_time("09:15", "15:15")
                if day_df.empty: continue

                day_df["cum_vol"] = day_df["volume"].cumsum()
                day_df["cum_vol_price"] = (day_df["Close"] * day_df["volume"]).cumsum()
                day_df["vwap"] = day_df["cum_vol_price"] / day_df["cum_vol"]

                opening_range = day_df.between_time(OR_START, OR_END)
                if opening_range.empty: continue
                
                OR_high = opening_range["High"].max()
                OR_low = opening_range["Low"].min()
                OR_mid = (OR_high + OR_low) / 2
                
                trade_count = 0
                position = None
                TRADE_LIMIT_DAILY = 2
                
                # NFO Fixed Params
                QTY = LOT_SIZE
                TGT_PTS = TARGET_POINTS

                for idx, row in day_df.iterrows():
                    if idx.time() <= pd.to_datetime(OR_END).time(): continue
                    if trade_count >= TRADE_LIMIT_DAILY: break

                    # EXIT
                    if position:
                        if position["type"] == "BUY":
                            if row["Low"] <= position["sl"]:
                                pnl = (position["sl"] - position["entry"]) * QTY
                                trades.append({"type": "BUY", "result": "SL", "pnl": pnl})
                                position = None; trade_count += 1
                            elif row["High"] >= position["target"]:
                                pnl = (position["target"] - position["entry"]) * QTY
                                trades.append({"type": "BUY", "result": "TARGET", "pnl": pnl})
                                position = None; trade_count += 1
                        elif position["type"] == "SELL":
                            if row["High"] >= position["sl"]:
                                pnl = (position["entry"] - position["sl"]) * QTY
                                trades.append({"type": "SELL", "result": "SL", "pnl": pnl})
                                position = None; trade_count += 1
                            elif row["Low"] <= position["target"]:
                                pnl = (position["entry"] - position["target"]) * QTY
                                trades.append({"type": "SELL", "result": "TARGET", "pnl": pnl})
                                position = None; trade_count += 1

                    # ENTRY
                    if position is None and trade_count < TRADE_LIMIT_DAILY:
                        avg_vol = row.get('avg_volume', 0)
                        if pd.isna(avg_vol): avg_vol = 0
                        
                        if (row["Close"] > OR_high and row["Close"] > row["vwap"] and row["volume"] > 1.5 * avg_vol):
                            position = {"type": "BUY", "entry": row["Close"], "sl": OR_mid, "target": row["Close"] + TGT_PTS, "qty": QTY}
                            logger.info(f"[NFO TRADE] BUY {trading_symbol} @ {row['Close']} {date}")
                        elif (row["Close"] < OR_low and row["Close"] < row["vwap"] and row["volume"] > 1.5 * avg_vol):
                             position = {"type": "SELL", "entry": row["Close"], "sl": OR_mid, "target": row["Close"] - TGT_PTS, "qty": QTY}
                             logger.info(f"[NFO TRADE] SELL {trading_symbol} @ {row['Close']} {date}")

            total_pnl = sum(t['pnl'] for t in trades)
            # final_capital = INITIAL_CAPITAL + total_pnl 
            # Note: INITIAL_CAPITAL import needed or just assume 0 base? Stock logic uses INITIAL_CAPITAL from custom_strategy
            # I will use 100000 dummy or import it.
            # Imported from custom_strategy
            
            final_capital = total_pnl # Just showing PnL gain for NFO usually since Margin varies. 
            # Or assume 1L starting.
            # I'll use logic from custom_strategy: INITIAL_CAPITAL + total_pnl
            
            # Need INITIAL_CAPITAL import
            # It is imported at top? Yes, from custom_strategy imports. (Wait, I need to add that import to this new file content)
            
            total_trades = len(trades)
            win_count = len([t for t in trades if t['result'] == 'TARGET'])
            profitability_pct = (win_count / total_trades * 100) if total_trades > 0 else 0
            
            result_data = {
                "Symbol": trading_symbol,
                "Total Trades": total_trades,
                "Win Rate %": f"{profitability_pct:.2f}%",
                "Total P&L": f"{total_pnl:.2f}",
                "Final Capital": f"{total_pnl:.2f}" 
            }
            summary_results.append(result_data)
            
    return summary_results
