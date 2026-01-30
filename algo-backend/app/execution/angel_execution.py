import pandas as pd
from logzero import logger


INITIAL_CAPITAL = 100000
RISK_PER_TRADE = 1.0
SL_BUFFER_PCT = 0.0002
TRAIL_STEP_PCT = 0.001

RSI_LENGTH = 14
RSI_OVERBOUGHT = 70
RSI_OVERSOLD = 30

OR_START = "09:15"
OR_END = "09:30"
TARGET_PCT = 0.006


def check_signal(df):
    try:
        if df.empty:
            return None, None
        if len(df) < 20:
            return None, None

        df["timestamp"] = pd.to_datetime(df["timestamp"])
        df["date"] = df["timestamp"].dt.date
        df = df.set_index("timestamp")

        df["avg_volume"] = df["volume"].rolling(20).mean()

        latest = df.iloc[-1]
        today_date = latest.name.date()
        today_df = df[df.index.date == today_date].copy()

        if len(today_df) < 2:
            return None, None

        today_df["cum_vol"] = today_df["volume"].cumsum()
        today_df["cum_vol_price"] = (today_df["close"] * today_df["volume"]).cumsum()
        today_df["vwap"] = today_df["cum_vol_price"] / today_df["cum_vol"]

        opening_range = today_df.between_time(OR_START, OR_END)
        if opening_range.empty:
            return None, None

        OR_high = opening_range["high"].max()
        OR_low = opening_range["low"].min()
        OR_mid = (OR_high + OR_low) / 2

        current_time = latest.name.time()
        or_end_time = pd.to_datetime(OR_END).time()
        if current_time <= or_end_time:
            return None, None

        if len(today_df) < 2:
            return None, None
        row = today_df.iloc[-2]

        if (
            row["close"] > OR_high
            and row["close"] > row["vwap"]
            and row["volume"] > 1.5 * row.get("avg_volume", 0)
        ):
            return "BUY", {
                "entry": row["close"],
                "sl": round(OR_mid * 20) / 20.0,
                "target": round(row["close"] * (1 + TARGET_PCT) * 20) / 20.0,
            }

        if (
            row["close"] < OR_low
            and row["close"] < row["vwap"]
            and row["volume"] > 1.5 * row.get("avg_volume", 0)
        ):
            return "SELL", {
                "entry": row["close"],
                "sl": round(OR_mid * 20) / 20.0,
                "target": round(row["close"] * (1 - TARGET_PCT) * 20) / 20.0,
            }

        return None, None
    except Exception as exc:
        logger.error(f"Signal Check Error: {exc}")
        return None, None


def place_buy_order(broker, symbol_token, trading_symbol, quantity, price):
    try:
        orderparams = {
            "variety": "NORMAL",
            "tradingsymbol": trading_symbol,
            "symboltoken": symbol_token,
            "transactiontype": "BUY",
            "exchange": "NSE",
            "ordertype": "LIMIT",
            "producttype": "INTRADAY",
            "duration": "DAY",
            "price": price,
            "squareoff": "0",
            "stoploss": "0",
            "quantity": quantity,
        }
        orderid = broker.place_order(orderparams)
        logger.info(f"PlaceOrder : {orderid}")
        return orderid
    except Exception as exc:
        logger.exception(f"Order placement failed: {exc}")
        return None


def place_sell_order(broker, symbol_token, trading_symbol, quantity, price):
    try:
        orderparams = {
            "variety": "NORMAL",
            "tradingsymbol": trading_symbol,
            "symboltoken": symbol_token,
            "transactiontype": "SELL",
            "exchange": "NSE",
            "ordertype": "LIMIT",
            "producttype": "INTRADAY",
            "duration": "DAY",
            "price": price,
            "squareoff": "0",
            "stoploss": "0",
            "quantity": quantity,
        }
        orderid = broker.place_order(orderparams)
        logger.info(f"Place Sell Order : {orderid}")
        return orderid
    except Exception as exc:
        logger.exception(f"Sell Order placement failed: {exc}")
        return None


def fetch_historical_data(broker, exchange, symbol_token, interval, from_date, to_date):
    try:
        interval_map = {
            "1": "ONE_MINUTE",
            "3": "THREE_MINUTE",
            "5": "FIVE_MINUTE",
            "10": "TEN_MINUTE",
            "15": "FIFTEEN_MINUTE",
            "30": "THIRTY_MINUTE",
            "60": "ONE_HOUR",
            "D": "ONE_DAY",
        }
        if str(interval) in interval_map:
            interval = interval_map[str(interval)]

        def convert_date(d_str):
            try:
                if not d_str:
                    return d_str
                d_str = d_str.replace("T", " ")
                if len(d_str) > 5 and d_str[2] == "-" and d_str[5] == "-":
                    parts = d_str.split(" ")
                    date_parts = parts[0].split("-")
                    time_part = parts[1] if len(parts) > 1 else ""
                    return f"{date_parts[2]}-{date_parts[1]}-{date_parts[0]} {time_part}".strip()
                return d_str
            except Exception:
                return d_str

        historicParam = {
            "exchange": exchange,
            "symboltoken": symbol_token,
            "interval": interval,
            "fromdate": convert_date(from_date),
            "todate": convert_date(to_date),
        }
        response = broker.get_candle_data(historicParam)
        return response
    except Exception as exc:
        logger.exception(f"Historic Api failed: {exc}")
        return None


def backtest(broker, selected_symbols=None, interval="FIVE_MINUTE", from_date="2022-01-01 09:15", to_date="2022-03-31 15:30", stock_list=None):
    logger.info("Starting Backtest (Hybrid Mode)...")
    selected_symbols = selected_symbols or []
    stock_list = stock_list or []

    DEFAULT_STOCKS = [
        {"symbol": "ADANIPOWER-EQ", "token": "17388"},
        {"symbol": "IDEA-EQ", "token": "14366"},
    ]

    target_stocks = []
    if stock_list and selected_symbols:
        if "ALL" in selected_symbols:
            target_stocks = stock_list[:50]
        else:
            target_stocks = [s for s in stock_list if s["symbol"] in selected_symbols]
    elif not stock_list:
        if not selected_symbols or "ALL" in selected_symbols:
            target_stocks = DEFAULT_STOCKS
        else:
            target_stocks = [s for s in DEFAULT_STOCKS if s["symbol"] in selected_symbols]

    nse_stocks = [s for s in target_stocks if s.get("exchange", "NSE") == "NSE"]
    nfo_stocks = [s for s in target_stocks if s.get("exchange", "NSE") != "NSE"]
    summary_results = []

    if nfo_stocks:
        try:
            from app.strategies import nfo_strategy

            nfo_res = nfo_strategy.backtest(
                broker, selected_symbols, interval, from_date, to_date, nfo_stocks
            )
            summary_results.extend(nfo_res)
        except Exception as exc:
            logger.error(f"NFO Backtest Error: {exc}")

    for stock in nse_stocks:
        trading_symbol = stock["symbol"]
        symbol_token = stock["token"]

        data_response = fetch_historical_data(
            broker, "NSE", symbol_token, interval, from_date, to_date
        )

        if data_response and data_response.get("status") and data_response.get("data"):
            raw_data = data_response["data"]
            df = pd.DataFrame(
                raw_data, columns=["timestamp", "open", "high", "low", "close", "volume"]
            )
            df["timestamp"] = pd.to_datetime(df["timestamp"])
            for col in ["open", "high", "low", "close", "volume"]:
                df[col] = df[col].astype(float)

            df["avg_volume"] = df["volume"].rolling(20).mean()
            df["date"] = df["timestamp"].dt.date
            trades = []

            for _, day_df in df.groupby("date"):
                day_df = day_df.set_index("timestamp")
                day_df = day_df.between_time("09:15", "15:15")
                if day_df.empty:
                    continue

                day_df["cum_vol"] = day_df["volume"].cumsum()
                day_df["cum_vol_price"] = (day_df["close"] * day_df["volume"]).cumsum()
                day_df["vwap"] = day_df["cum_vol_price"] / day_df["cum_vol"]

                opening_range = day_df.between_time(OR_START, OR_END)
                if opening_range.empty:
                    continue

                OR_high = opening_range["high"].max()
                OR_low = opening_range["low"].min()
                OR_mid = (OR_high + OR_low) / 2

                trade_count = 0
                position = None
                TRADE_LIMIT_DAILY = 1
                TARGET_PCT = 0.006

                for idx, row in day_df.iterrows():
                    if idx.time() <= pd.to_datetime(OR_END).time():
                        continue
                    if trade_count >= TRADE_LIMIT_DAILY:
                        break

                    if position:
                        if position["type"] == "BUY":
                            if row["low"] <= position["sl"]:
                                pnl = (position["sl"] - position["entry"]) * position["qty"]
                                trades.append({"type": "BUY", "result": "SL", "pnl": pnl})
                                position = None
                                trade_count += 1
                            elif row["high"] >= position["target"]:
                                pnl = (position["target"] - position["entry"]) * position["qty"]
                                trades.append(
                                    {"type": "BUY", "result": "TARGET", "pnl": pnl}
                                )
                                position = None
                                trade_count += 1
                        elif position["type"] == "SELL":
                            if row["high"] >= position["sl"]:
                                pnl = (position["entry"] - position["sl"]) * position["qty"]
                                trades.append({"type": "SELL", "result": "SL", "pnl": pnl})
                                position = None
                                trade_count += 1
                            elif row["low"] <= position["target"]:
                                pnl = (position["entry"] - position["target"]) * position["qty"]
                                trades.append(
                                    {"type": "SELL", "result": "TARGET", "pnl": pnl}
                                )
                                position = None
                                trade_count += 1

                    if position is None and trade_count < TRADE_LIMIT_DAILY:
                        qty = int(INITIAL_CAPITAL / row["close"])
                        if (
                            row["close"] > OR_high
                            and row["close"] > row["vwap"]
                            and row["volume"] > 1.5 * row.get("avg_volume", 0)
                        ):
                            position = {
                                "type": "BUY",
                                "entry": row["close"],
                                "sl": OR_mid,
                                "target": row["close"] * (1 + TARGET_PCT),
                                "qty": qty,
                            }
                        elif (
                            row["close"] < OR_low
                            and row["close"] < row["vwap"]
                            and row["volume"] > 1.5 * row.get("avg_volume", 0)
                        ):
                            position = {
                                "type": "SELL",
                                "entry": row["close"],
                                "sl": OR_mid,
                                "target": row["close"] * (1 - TARGET_PCT),
                                "qty": qty,
                            }

            total_pnl = sum(t["pnl"] for t in trades)
            final_capital = INITIAL_CAPITAL + total_pnl
            total_trades = len(trades)
            win_count = len([t for t in trades if t["result"] == "TARGET"])
            profitability_pct = (
                win_count / total_trades * 100 if total_trades > 0 else 0
            )

            result_data = {
                "Symbol": trading_symbol,
                "Total Trades": total_trades,
                "Win Rate %": f"{profitability_pct:.2f}%",
                "Total P&L": f"{total_pnl:.2f}",
                "Final Capital": f"{final_capital:.2f}",
            }
            summary_results.append(result_data)

    return summary_results
