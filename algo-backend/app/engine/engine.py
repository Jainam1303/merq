from app.engine.session import StrategySession
from app.services import symbols
from app.config import settings


SESSIONS = {}
ALL_TOKENS = None


def get_tokens():
    global ALL_TOKENS
    if ALL_TOKENS is None:
        ALL_TOKENS = symbols.load_tokens()
    return ALL_TOKENS


def start_bot(config):
    uid = config.get("user_id")
    if uid in SESSIONS and SESSIONS[uid].is_running:
        return "Already Running"
    sess = StrategySession(uid, config, get_tokens(), settings.data_dir)
    SESSIONS[uid] = sess
    return sess.start()


def stop_bot(user_id):
    if user_id in SESSIONS:
        return SESSIONS[user_id].stop()
    return "Session Not Found"


def get_live_trades(user_id):
    if user_id in SESSIONS:
        return SESSIONS[user_id].active_trades
    return []


def get_logs(user_id):
    if user_id in SESSIONS:
        return SESSIONS[user_id].log_queue
    return []


def get_status(user_id):
    if user_id in SESSIONS:
        return SESSIONS[user_id].is_running
    return False


def get_live_pnl(user_id):
    if user_id in SESSIONS:
        return SESSIONS[user_id].current_pnl
    return 0.0


def get_active_config(user_id):
    if user_id in SESSIONS:
        return SESSIONS[user_id].config
    return {}


def execute_test_order(user_id, symbol, quantity, sl, tp, mode):
    if user_id in SESSIONS and SESSIONS[user_id].is_running:
        return SESSIONS[user_id].execute_test_order(symbol, quantity, sl, tp, mode)
    return {"status": "error", "message": "Bot is Offline. Start Bot first."}


def force_exit_trade(user_id, entry_id):
    if user_id in SESSIONS:
        return SESSIONS[user_id].force_exit_trade(entry_id)
    return "Session Not Active"


def delete_active_trade(user_id, entry_id):
    if user_id in SESSIONS:
        return SESSIONS[user_id].delete_trade(entry_id)
    return "Session Not Active"


def update_trade_params(user_id, entry_id, sl, tp):
    if user_id in SESSIONS:
        return SESSIONS[user_id].update_trade_params(entry_id, sl, tp)
    return "Trade Not Found (Bot Offline)"


def run_backtest(args):
    from app.brokers.angel_client import AngelBrokerClient
    from app.execution.angel_execution import backtest

    api_key = args.get("api_key")
    client_code = args.get("client_code")
    password = args.get("password")
    totp_token = args.get("totp")
    symbols_list = args.get("symbols", [])
    interval = args.get("interval", "FIVE_MINUTE")
    from_date = args.get("fromDate") or args.get("from_date")
    to_date = args.get("toDate") or args.get("to_date")

    if not (api_key and client_code and password and totp_token):
        return {
            "status": "error",
            "message": "Missing Backtest Credentials. Please update Profile.",
        }

    try:
        broker = AngelBrokerClient(api_key)
        import pyotp

        totp = pyotp.TOTP(totp_token).now()
        data = broker.login(client_code, password, totp)
        if not data["status"]:
            return {
                "status": "error",
                "message": f"Backtest Login Failed: {data.get('message')}",
            }
        results = backtest(
            broker, symbols_list, interval, from_date, to_date, symbols.load_tokens()
        )
        return {"status": "success", "results": results}
    except Exception as exc:
        return {"status": "error", "message": str(exc)}
