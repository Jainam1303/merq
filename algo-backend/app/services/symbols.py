import json
import os
import time
from logzero import logger
import requests

from app.config import settings

INSTRUMENT_URL = (
    "https://margincalculator.angelbroking.com/OpenAPI_File/files/OpenAPIScripMaster.json"
)


def _token_file_path():
    return os.path.join(settings.data_dir, "token -symbol.txt")


def _instrument_file_path():
    return os.path.join(settings.data_dir, "instruments.json")


def load_tokens():
    tokens = []
    try:
        token_file = _token_file_path()
        if not os.path.exists(token_file):
            download_instruments()
            instrument_file = _instrument_file_path()
            if os.path.exists(instrument_file):
                with open(instrument_file, "r") as f:
                    data = json.load(f)
                for item in data:
                    symbol = item.get("symbol")
                    token = item.get("token")
                    exchange = item.get("exch_seg", "NSE")
                    if symbol and token:
                        tokens.append(
                            {"token": token, "symbol": symbol, "exchange": exchange}
                        )
            return tokens
        with open(token_file, "r") as f:
            lines = f.readlines()[1:]
            for line in lines:
                parts = line.strip().split()
                if len(parts) >= 2:
                    exch = parts[2] if len(parts) > 2 else "NSE"
                    tokens.append(
                        {"token": parts[0], "symbol": parts[1], "exchange": exch}
                    )
    except Exception as exc:
        logger.error(f"Error reading tokens: {exc}")
    return tokens


def get_all_symbols(all_tokens):
    return [t["symbol"] for t in all_tokens]


def get_token_info(all_tokens, symbol):
    for t in all_tokens:
        if t["symbol"] == symbol:
            return t
    return None


def get_token_for_symbol(all_tokens, symbol):
    info = get_token_info(all_tokens, symbol)
    return info["token"] if info else None


def download_instruments():
    instrument_file = _instrument_file_path()
    try:
        if os.path.exists(instrument_file):
            file_age = time.time() - os.path.getmtime(instrument_file)
            if file_age < 86400:
                try:
                    with open(instrument_file, "r") as f:
                        json.load(f)
                    return
                except Exception:
                    logger.warning("Invalid instruments file, re-downloading...")
        logger.info("Downloading Instruments...")
        response = requests.get(INSTRUMENT_URL, timeout=60)
        response.raise_for_status()
        data = response.json()
        with open(instrument_file, "w") as f:
            f.write(response.text)
        logger.info(f"Instruments Downloaded ({len(data)} items)")
    except requests.exceptions.Timeout:
        logger.error("Download Timeout - Angel Broking API is slow")
    except requests.exceptions.RequestException as exc:
        logger.error(f"Download Network Error: {exc}")
    except Exception as exc:
        logger.error(f"Download Error: {exc}")


def search_scrip(query):
    download_instruments()
    instrument_file = _instrument_file_path()
    try:
        with open(instrument_file, "r") as f:
            data = json.load(f)
            query_parts = query.upper().split()
            results = []
            for item in data:
                symbol = item.get("symbol", "").upper()
                name = item.get("name", "").upper()
                match = True
                for part in query_parts:
                    if (part not in symbol) and (part not in name):
                        match = False
                        break
                if match:
                    if item.get("exch_seg") in ["NSE", "NFO", "BSE", "MCX"]:
                        results.append(
                            {
                                "symbol": item["symbol"],
                                "token": item["token"],
                                "exchange": item["exch_seg"],
                                "name": item.get("name", ""),
                            }
                        )
                        if len(results) > 100:
                            break
            return results
    except Exception as exc:
        logger.error(f"Search Error: {exc}")
        return []


def add_custom_token(all_tokens, symbol, token, exchange):
    try:
        token_file = _token_file_path()
        for t in all_tokens:
            if t["symbol"] == symbol:
                return "Already Exists"
        with open(token_file, "a") as f:
            f.write(f"\n{token} {symbol} {exchange}")
        all_tokens.append({"token": token, "symbol": symbol, "exchange": exchange})
        return "Added"
    except Exception as exc:
        return f"Error: {exc}"
