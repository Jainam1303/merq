import { apiRequest } from "./client";

export type NodeHealth = { status: string; service: string };
export type AlgoHealth = {
  status: string;
  service: string;
  dependency?: { status: string; service: string; kill_switch: boolean };
};

export const getNodeHealth = () => apiRequest<NodeHealth>("GET", "/health");
export const getAlgoHealth = () => apiRequest<AlgoHealth>("GET", "/health/algo");

export const getStrategies = (token: string) =>
  apiRequest<{ strategies: Array<{ id: string; name: string }> }>(
    "GET",
    "/strategies",
    undefined,
    token
  );

export const getAnalytics = (token: string) =>
  apiRequest<{ analytics: Record<string, unknown> }>("GET", "/analytics", undefined, token);

export const getTradeHistory = (token: string) =>
  apiRequest<{ status: string; data: unknown[] }>("GET", "/trades/orderbook", undefined, token);

export const getAlgoStatus = (token: string) =>
  apiRequest<{ status: string }>("GET", "/algo/status", undefined, token);

export const getAlgoTrades = (token: string) =>
  apiRequest<{ status: string; data: unknown[] }>("GET", "/algo/trades", undefined, token);

export const getAlgoPnl = (token: string) =>
  apiRequest<{ pnl: number }>("GET", "/algo/pnl", undefined, token);

export const getSymbols = () => apiRequest<string[]>("GET", "/algo/symbols");

export const runBacktest = (
  token: string,
  payload: {
    strategy?: string;
    symbols?: string[];
    interval?: string;
    fromDate?: string;
    toDate?: string;
  }
) => apiRequest<Record<string, unknown>>("POST", "/algo/backtest", payload, token);

export const startStrategy = (
  token: string,
  strategyId: string,
  payload: Record<string, unknown>
) =>
  apiRequest<{ status: string; message: string }>(
    "POST",
    `/strategies/${strategyId}/start`,
    payload,
    token
  );

export const stopStrategy = (token: string, strategyId: string) =>
  apiRequest<{ status: string; message: string }>(
    "POST",
    `/strategies/${strategyId}/stop`,
    {},
    token
  );

export const exitTrade = (token: string, tradeId: string) =>
  apiRequest<{ status: string; message: string }>(
    "POST",
    "/algo/exit_trade",
    { trade_id: tradeId },
    token
  );

export const updateTrade = (token: string, tradeId: string, sl: number, tp: number) =>
  apiRequest<{ status: string; message: string }>(
    "POST",
    "/algo/update_trade",
    { trade_id: tradeId, sl, tp },
    token
  );
