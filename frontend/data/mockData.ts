// Mock data for MerQPrime Algo Trading Dashboard

export interface Position {
  id: string;
  time: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  qty: number;
  entry: number;
  tp: number;
  sl: number;
  currentPrice: number;
  ltp?: number;  // Live LTP from WebSocket
  pnl: number;
}


export interface Trade {
  id: string;
  date: string;
  time: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  qty: number;
  entry: number;
  exit: number;
  pnl: number;
  status: 'Completed' | 'Cancelled' | 'Pending';
}

export interface LogEntry {
  id: string;
  timestamp: string;
  type: 'info' | 'success' | 'error' | 'warning';
  message: string;
}

export interface BacktestResult {
  id: string;
  strategy: string;
  symbol: string;
  dateRange: string;
  totalTrades: number;
  winRate: number;
  totalPnl: number;
  finalCapital: number;
}

export interface DailyPnL {
  day: string;
  pnl: number;
}

export interface Subscription {
  plan: string;
  duration: string;
  price: number;
  expiresAt: string;
  features: string[];
}

// Stock universe options
export const stockOptions = [
  { value: 'RELIANCE', label: 'RELIANCE' },
  { value: 'TCS', label: 'TCS' },
  { value: 'INFY', label: 'INFY' },
  { value: 'HDFCBANK', label: 'HDFCBANK' },
  { value: 'ICICIBANK', label: 'ICICIBANK' },
  { value: 'SBIN', label: 'SBIN' },
  { value: 'BHARTIARTL', label: 'BHARTIARTL' },
  { value: 'ITC', label: 'ITC' },
  { value: 'KOTAKBANK', label: 'KOTAKBANK' },
  { value: 'LT', label: 'LT' },
  { value: 'AXISBANK', label: 'AXISBANK' },
  { value: 'WIPRO', label: 'WIPRO' },
];

// Strategy options
export const strategyOptions = [
  { value: 'ORB', label: 'ORB (Opening Range Breakout)', description: 'Trades based on the first 15-30 min range' },
  { value: 'EMA', label: 'EMA 8-30 Crossover', description: '8/30 EMA crossover strategy' },
];

// Timeframe options
export const timeframeOptions = [
  { value: '5', label: '5 Min' },
  { value: '15', label: '15 Min' },
  { value: '30', label: '30 Min' },
  { value: '60', label: '1 Hour' },
];

// Mock active positions
export const mockPositions: Position[] = [
  {
    id: '1',
    time: '09:32:15',
    symbol: 'RELIANCE',
    type: 'BUY',
    qty: 50,
    entry: 2845.50,
    tp: 2890.00,
    sl: 2820.00,
    currentPrice: 2867.25,
    pnl: 1087.50,
  },
  {
    id: '2',
    time: '09:45:22',
    symbol: 'TCS',
    type: 'SELL',
    qty: 25,
    entry: 4125.00,
    tp: 4080.00,
    sl: 4150.00,
    currentPrice: 4098.75,
    pnl: 656.25,
  },
  {
    id: '3',
    time: '10:15:08',
    symbol: 'INFY',
    type: 'BUY',
    qty: 100,
    entry: 1580.25,
    tp: 1610.00,
    sl: 1565.00,
    currentPrice: 1572.50,
    pnl: -775.00,
  },
];

// Mock trade history
export const mockTrades: Trade[] = [
  { id: '1', date: '2025-01-21', time: '09:32:15', symbol: 'RELIANCE', type: 'BUY', qty: 50, entry: 2845.50, exit: 2890.00, pnl: 2225.00, status: 'Completed' },
  { id: '2', date: '2025-01-21', time: '10:15:22', symbol: 'TCS', type: 'SELL', qty: 25, entry: 4125.00, exit: 4080.00, pnl: 1125.00, status: 'Completed' },
  { id: '3', date: '2025-01-20', time: '09:45:08', symbol: 'INFY', type: 'BUY', qty: 100, entry: 1580.25, exit: 1565.00, pnl: -1525.00, status: 'Completed' },
  { id: '4', date: '2025-01-20', time: '11:22:33', symbol: 'HDFCBANK', type: 'BUY', qty: 30, entry: 1678.00, exit: 1695.50, pnl: 525.00, status: 'Completed' },
  { id: '5', date: '2025-01-19', time: '09:35:45', symbol: 'SBIN', type: 'SELL', qty: 200, entry: 825.75, exit: 818.25, pnl: 1500.00, status: 'Completed' },
  { id: '6', date: '2025-01-19', time: '10:45:12', symbol: 'ICICIBANK', type: 'BUY', qty: 75, entry: 1245.00, exit: 1238.50, pnl: -487.50, status: 'Completed' },
  { id: '7', date: '2025-01-18', time: '09:30:00', symbol: 'BHARTIARTL', type: 'BUY', qty: 40, entry: 1580.00, exit: 1598.75, pnl: 750.00, status: 'Completed' },
  { id: '8', date: '2025-01-18', time: '14:22:18', symbol: 'ITC', type: 'SELL', qty: 150, entry: 465.50, exit: 462.25, pnl: 487.50, status: 'Completed' },
  { id: '9', date: '2025-01-17', time: '09:42:55', symbol: 'KOTAKBANK', type: 'BUY', qty: 20, entry: 1825.00, exit: 0, pnl: 0, status: 'Cancelled' },
  { id: '10', date: '2025-01-17', time: '11:15:30', symbol: 'LT', type: 'BUY', qty: 15, entry: 3580.00, exit: 3625.50, pnl: 682.50, status: 'Completed' },
];

// Mock system logs
export const mockLogs: LogEntry[] = [
  { id: '1', timestamp: '10:32:15', type: 'info', message: 'System started - LIVE mode active' },
  { id: '2', timestamp: '10:32:16', type: 'success', message: 'Connected to broker API successfully' },
  { id: '3', timestamp: '10:32:20', type: 'info', message: 'Loading strategy: ORB (Opening Range Breakout)' },
  { id: '4', timestamp: '10:35:45', type: 'success', message: 'BUY signal detected for RELIANCE @ 2845.50' },
  { id: '5', timestamp: '10:35:46', type: 'success', message: 'Order placed: BUY RELIANCE x50 @ 2845.50' },
  { id: '6', timestamp: '10:35:47', type: 'success', message: 'Order filled: RELIANCE x50 @ 2845.50' },
  { id: '7', timestamp: '10:45:22', type: 'success', message: 'SELL signal detected for TCS @ 4125.00' },
  { id: '8', timestamp: '10:45:23', type: 'success', message: 'Order placed: SELL TCS x25 @ 4125.00' },
  { id: '9', timestamp: '11:15:08', type: 'warning', message: 'Position INFY approaching stop loss level' },
  { id: '10', timestamp: '11:30:00', type: 'error', message: 'Network timeout - retrying connection...' },
  { id: '11', timestamp: '11:30:05', type: 'success', message: 'Connection restored' },
];

// Mock backtest results
export const mockBacktestResults: BacktestResult[] = [
  { id: '1', strategy: 'ORB', symbol: 'RELIANCE', dateRange: '01 Jan - 15 Jan 2025', totalTrades: 45, winRate: 62.5, totalPnl: 45250, finalCapital: 145250 },
  { id: '2', strategy: 'EMA', symbol: 'TCS', dateRange: '01 Jan - 15 Jan 2025', totalTrades: 38, winRate: 55.2, totalPnl: 28750, finalCapital: 128750 },
  { id: '3', strategy: 'VWAP', symbol: 'INFY', dateRange: '01 Jan - 15 Jan 2025', totalTrades: 52, winRate: 48.5, totalPnl: -8500, finalCapital: 91500 },
];

// Mock daily P&L for analytics
export const mockDailyPnL: DailyPnL[] = [
  { day: 'Mon', pnl: 12500 },
  { day: 'Tue', pnl: -5200 },
  { day: 'Wed', pnl: 8750 },
  { day: 'Thu', pnl: 15300 },
  { day: 'Fri', pnl: -2100 },
  { day: 'Sat', pnl: 0 },
  { day: 'Sun', pnl: 0 },
];

// Mock analytics data
export const mockAnalytics = {
  totalTrades: 156,
  winRate: 58.3,
  avgProfitPerTrade: 1250,
  profitFactor: 1.85,
  bestDay: { date: '2025-01-16', pnl: 25400 },
  worstDay: { date: '2025-01-12', pnl: -12800 },
  maxDrawdown: 8.5,
  winningTrades: 91,
  losingTrades: 65,
};

// Mock subscription plans
export const subscriptionPlans: Subscription[] = [
  {
    plan: 'Starter',
    duration: '1 Month',
    price: 999,
    expiresAt: '2025-02-21',
    features: ['Paper Trading', 'Basic Strategies', 'Email Support'],
  },
  {
    plan: 'Pro',
    duration: '3 Months',
    price: 2499,
    expiresAt: '2025-04-21',
    features: ['Live Trading', 'All Strategies', 'Priority Support', 'WhatsApp Alerts'],
  },
  {
    plan: 'Premium',
    duration: '6 Months',
    price: 4499,
    expiresAt: '2025-07-21',
    features: ['Live Trading', 'All Strategies', 'Priority Support', 'WhatsApp Alerts', 'Custom Strategies'],
  },
  {
    plan: 'Enterprise',
    duration: '1 Year',
    price: 7999,
    expiresAt: '2026-01-21',
    features: ['Live Trading', 'All Strategies', 'Dedicated Support', 'WhatsApp Alerts', 'Custom Strategies', 'API Access'],
  },
];

// Current user subscription
export const currentSubscription = subscriptionPlans[1]; // Pro plan
