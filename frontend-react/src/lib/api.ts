const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3001";
const ACCESS_TOKEN_KEY = "merq_access_token";

type FetchJsonOptions = RequestInit & { body?: string };

const getToken = () => localStorage.getItem(ACCESS_TOKEN_KEY);
const setToken = (token?: string) => {
  if (token) {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
  }
};

const normalizeStrategyId = (raw?: string) => {
  if (!raw) return "orb";
  return raw.toLowerCase();
};

const rememberStrategy = (strategy?: string) => {
  if (!strategy) return;
  localStorage.setItem("merq_last_strategy", normalizeStrategyId(strategy));
};

const getRememberedStrategy = () =>
  localStorage.getItem("merq_last_strategy") || "orb";

const mapRequest = (url: string, options: FetchJsonOptions) => {
  const bodyJson = options.body ? JSON.parse(options.body) : undefined;

  switch (url) {
    case "/login":
      return { url: "/auth/login", options };
    case "/register":
      return { url: "/auth/register", options };
    case "/logout":
      return { url: "/auth/logout", options };
    case "/check_auth":
      return { url: "/me", options };
    case "/get_profile":
      return { url: "/profile", options };
    case "/update_profile": {
      const payload = {
        email: bodyJson?.email,
        phone: bodyJson?.phone,
        brokerName: bodyJson?.broker_name || bodyJson?.brokerName || "angel",
        apiKey: bodyJson?.angel_api_key,
        clientCode: bodyJson?.angel_client_code,
        password: bodyJson?.angel_password,
        totp: bodyJson?.angel_totp,
        backtestApiKey: bodyJson?.backtest_api_key,
        backtestClientCode: bodyJson?.backtest_client_code,
        backtestPassword: bodyJson?.backtest_password,
        backtestTotp: bodyJson?.backtest_totp,
        whatsappNumber: bodyJson?.whatsapp_number,
        callmebotApiKey: bodyJson?.callmebot_api_key,
        newPassword: bodyJson?.new_password,
        currentPassword: bodyJson?.current_password
      };
      return {
        url: "/profile",
        options: { ...options, method: "PUT", body: JSON.stringify(payload) }
      };
    }
    case "/change_password": {
      const payload = {
        currentPassword: bodyJson?.current_password,
        newPassword: bodyJson?.new_password
      };
      return {
        url: "/profile",
        options: { ...options, method: "PUT", body: JSON.stringify(payload) }
      };
    }
    case "/plans":
      return { url: "/plans", options };
    case "/razorpay/create_order":
      return {
        url: "/payments/create",
        options: {
          ...options,
          body: JSON.stringify({ planId: bodyJson?.plan_id })
        }
      };
    case "/razorpay/verify_payment":
      return {
        url: "/payments/verify",
        options: {
          ...options,
          body: JSON.stringify({
            orderId: bodyJson?.razorpay_order_id,
            paymentId: bodyJson?.razorpay_payment_id,
            signature: bodyJson?.razorpay_signature,
            planId: bodyJson?.plan_id
          })
        }
      };
    case "/create_order":
      return {
        url: "/payments/create",
        options: {
          ...options,
          body: JSON.stringify({ planId: bodyJson?.plan_id })
        }
      };
    case "/verify_payment":
      return {
        url: "/payments/verify",
        options: {
          ...options,
          body: JSON.stringify({
            orderId: bodyJson?.razorpay_order_id,
            paymentId: bodyJson?.razorpay_payment_id,
            signature: bodyJson?.razorpay_signature,
            planId: bodyJson?.plan_id
          })
        }
      };
    case "/status":
      return { url: "/algo/status", options };
    case "/config":
      return { url: "/algo/config", options };
    case "/trades":
      return { url: "/algo/trades", options };
    case "/orderbook":
      return { url: "/trades/orderbook", options };
    case "/delete_orders":
      return { url: "/trades/delete_orders", options };
    case "/pnl":
      return { url: "/algo/pnl", options };
    case "/logs":
      return { url: "/algo/logs", options };
    case "/symbols":
      return { url: "/algo/symbols", options };
    case "/search_scrip":
      return { url: "/algo/search_scrip", options };
    case "/add_token":
      return { url: "/algo/add_token", options };
    case "/test_order":
      return { url: "/algo/test_order", options };
    case "/exit_trade":
      return { url: "/algo/exit_trade", options };
    case "/update_trade":
      return { url: "/algo/update_trade", options };
    case "/backtest": {
      const payload = {
        strategy: bodyJson?.strategy,
        symbols: bodyJson?.symbols,
        interval: bodyJson?.interval,
        fromDate: bodyJson?.fromDate || bodyJson?.from_date,
        toDate: bodyJson?.toDate || bodyJson?.to_date
      };
      return { url: "/algo/backtest", options: { ...options, body: JSON.stringify(payload) } };
    }
    case "/start": {
      const strategy = normalizeStrategyId(bodyJson?.strategy);
      rememberStrategy(strategy);
      const payload = {
        symbols: bodyJson?.symbols,
        interval: bodyJson?.interval,
        startTime: bodyJson?.startTime,
        stopTime: bodyJson?.stopTime,
        capital: bodyJson?.capital,
        simulated: bodyJson?.simulated,
        strategy
      };
      return {
        url: `/strategies/${strategy}/start`,
        options: { ...options, body: JSON.stringify(payload) }
      };
    }
    case "/stop": {
      const strategy = normalizeStrategyId(bodyJson?.strategy) || getRememberedStrategy();
      return {
        url: `/strategies/${strategy}/stop`,
        options: { ...options, body: JSON.stringify({}) }
      };
    }
    default:
      return { url, options };
  }
};

const mapResponse = (url: string, payload: any) => {
  switch (url) {
    case "/me":
      return { authenticated: true, user: payload.user?.username || "" };
    case "/profile": {
      const user = payload.user || {};
      const profile = payload.profile || {};
      const plan = payload.plan || null;
      return {
        username: user.username || "",
        email: user.email || "",
        phone: user.phone || "",
        angel_api_key: profile.apiKey || "",
        angel_client_code: profile.clientCode || "",
        angel_password: profile.password || "",
        angel_totp: profile.totp || "",
        backtest_api_key: profile.backtestApiKey || "",
        backtest_client_code: profile.backtestClientCode || "",
        backtest_password: profile.backtestPassword || "",
        backtest_totp: profile.backtestTotp || "",
        plan_name: plan?.name || "Free",
        plan_expiry: plan?.end_date || null
      };
    }
    case "/plans":
      return payload.plans || [];
    case "/payments/create":
      return {
        status: "success",
        key_id: payload.keyId,
        key: payload.keyId,
        amount: payload.amount,
        currency: payload.currency,
        order_id: payload.orderId,
        plan: payload.plan,
        user: payload.prefill
      };
    case "/payments/verify":
      return { status: "success", message: "Payment verified" };
    case "/algo/status":
      return { status: payload.status };
    case "/algo/trades":
      return payload;
    case "/trades/orderbook":
      return payload;
    case "/algo/pnl":
      return payload;
    case "/algo/logs":
      return payload;
    default:
      return payload;
  }
};

export const fetchJson = async (url: string, options: FetchJsonOptions = {}) => {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>)
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const mapped = mapRequest(url, { ...options, headers });
  const response = await fetch(`${API_BASE}${mapped.url}`, {
    ...mapped.options,
    headers,
    credentials: "include"
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    if (mapped.url === "/me") {
      return { authenticated: false };
    }
    const message =
      typeof payload === "string"
        ? payload
        : payload?.message || "Request failed";
    throw new Error(message);
  }

  if (payload?.access_token) {
    setToken(payload.access_token);
  }

  return mapResponse(mapped.url, payload);
};
