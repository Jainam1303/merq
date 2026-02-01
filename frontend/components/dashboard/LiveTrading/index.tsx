import { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { toast } from "sonner";
import { SystemStatus } from "./SystemStatus";
import { StrategyConfig, ConfigData } from "./StrategyConfig";
import { SafetyGuard } from "./SafetyGuard";
import { LivePnLCard } from "./LivePnLCard";
import { ActivePositions } from "./ActivePositions";
import { SystemLogs } from "./SystemLogs";
import { fetchJson } from "@/lib/api";
import { Position, LogEntry } from "@/data/mockData";

interface LiveTradingProps {
  tradingMode?: 'LIVE' | 'PAPER';
  onSystemStatusChange?: (isActive: boolean) => void;
}

export function LiveTrading({ tradingMode = 'PAPER', onSystemStatusChange }: LiveTradingProps) {
  const [isSystemActive, setIsSystemActive] = useState(false);
  const [pnl, setPnl] = useState(0);
  const [positions, setPositions] = useState<Position[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Notify parent whenever system status changes
  useEffect(() => {
    if (onSystemStatusChange) {
      onSystemStatusChange(isSystemActive);
    }
  }, [isSystemActive, onSystemStatusChange]);

  // Strategy Config State
  const [config, setConfig] = useState<ConfigData>({
    symbols: ['RELIANCE', 'TCS'],
    strategy: 'ORB',
    interval: '15',
    startTime: '09:15',
    stopTime: '15:15',
    capital: '100000'
  });

  // Credentials for starting the bot (fetched from profile)
  const [credentials, setCredentials] = useState({
    apiKey: '',
    clientCode: '',
    password: '',
    totp: ''
  });

  const socketRef = useRef<Socket | null>(null);
  const activeModeRef = useRef(tradingMode);

  // Sync ref
  useEffect(() => {
    activeModeRef.current = tradingMode;
  }, [tradingMode]);

  // Load Initial Data & Status
  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Get Status
        const statusData = await fetchJson('/status');
        setIsSystemActive(statusData.status === 'RUNNING');

        // 2. Get Config (if running, this might differ from local defaults)
        if (statusData.status === 'RUNNING') {
          const remoteConfig = await fetchJson('/config');
          if (remoteConfig && Object.keys(remoteConfig).length > 0) {
            const intervalMapRev: Record<string, string> = {
              'FIVE_MINUTE': '5',
              'FIFTEEN_MINUTE': '15',
              'THIRTY_MINUTE': '30',
              'ONE_HOUR': '60'
            };

            setConfig({
              symbols: remoteConfig.symbols || [],
              strategy: remoteConfig.strategy ? remoteConfig.strategy.toUpperCase() : 'ORB',
              interval: intervalMapRev[remoteConfig.interval] || '15',
              startTime: remoteConfig.startTime || '09:15',
              stopTime: remoteConfig.stopTime || '15:15',
              capital: remoteConfig.capital || '100000'
            });
          }
        }

        // 3. Get Profile Credentials (needed for start)
        const profile = await fetchJson('/get_profile');
        setCredentials({
          apiKey: profile.angel_api_key || '',
          clientCode: profile.angel_client_code || '',
          password: profile.angel_password || '',
          totp: profile.angel_totp || ''
        });

        // 4. Initial PnL & Trades
        const pnlData = await fetchJson('/pnl');
        setPnl(pnlData.pnl || 0);

        const tradesData = await fetchJson('/trades');
        if (tradesData.status === 'success') {
          setPositions(mapBackendTradesToPositions(tradesData.data));
        }

      } catch (err) {
        console.error("Failed to load initial data", err);
        // toast.error("Failed to connect to backend"); 
      }
    };

    fetchData();

    // Polling for Logs (every 2s)
    const logInterval = setInterval(async () => {
      try {
        const logData = await fetchJson('/logs');
        // logData is array of strings usually in original? No, fetchJson('/logs') in page.js implies it returns array of strings called 'data.reverse()'?
        // page.js: const data = await fetchJson('/logs'); let logsToSet = data.reverse();
        // and SystemLogs expect LogEntry objects. 
        // We need to map string logs to objects if backend returns strings.
        // Assuming backend returns strings like "10:00:00 - INFO - Message"

        // Let's inspect page.js parsing logic again if needed.
        // It mostly just filtered by time.
        // New SystemLogs expects {id, timestamp, type, message}.
        // I will map it here.
        const parsedLogs = (Array.isArray(logData) ? logData : []).slice(0, 50).map((l: string, i: number) => parseLogLine(l, i));
        setLogs(parsedLogs);
      } catch (e) { }
    }, 2000);

    return () => clearInterval(logInterval);
  }, []);

  // Socket Connection with WebSocket transport for lower latency
  // Socket Connection with WebSocket transport for lower latency
  useEffect(() => {
    let socket: Socket | null = null;

    // Only connect if system is active (Running)
    if (isSystemActive) {
      // Connect to same origin (proxied to backend)
      socket = io({
        path: '/socket.io',
        withCredentials: true,
        transports: ['websocket', 'polling'], // Allow WebSocket upgrade
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      socket.on('connect', () => {
        console.log('Socket Connected');
      });

      socket.on('tick_update', (data: any) => {
        if (data.pnl !== undefined) {
          setPnl(data.pnl);
        }
        if (data.trades) {
          setPositions(mapBackendTradesToPositions(data.trades));
        }
      });

      socketRef.current = socket;
    }

    return () => {
      if (socket) {
        socket.disconnect();
      }
      socketRef.current = null;
    };
  }, [isSystemActive]);

  // Fallback Polling for P&L (every 1s) to ensure data appears instantly if socket lags
  useEffect(() => {
    if (!isSystemActive) return;

    const interval = setInterval(async () => {
      try {
        const pnlData = await fetchJson('/pnl');
        setPnl(pnlData.pnl || 0);

        // Also refresh active positions occasionally to prevent stale data
        const tradesData = await fetchJson('/trades');
        if (tradesData.status === 'success') {
          setPositions(mapBackendTradesToPositions(tradesData.data));
        }
      } catch (e) {
        console.error("Polling failed", e);
      }
    }, 1000); // 1 second interval for snappy updates

    return () => clearInterval(interval);
  }, [isSystemActive]);

  // Map Backend Trade object to Frontend Position
  const mapBackendTradesToPositions = (backendTrades: any[]): Position[] => {
    return backendTrades.map(t => ({
      id: t.entry_order_id,
      time: t.timestamp ? t.timestamp.split(' ')[1] : '--:--',
      symbol: t.symbol,
      type: t.mode, // 'BUY' or 'SELL'
      qty: t.quantity,
      entry: parseFloat(t.entry_price || 0),
      tp: parseFloat(t.tp || 0),
      sl: parseFloat(t.sl || 0),
      currentPrice: 0, // Backend doesn't send current CMP always in this payload, maybe calculated?
      pnl: parseFloat(t.pnl || 0)
    }));
  };

  const parseLogLine = (line: string, index: number): LogEntry => {
    // Example: "10:30:05 - INFO - Bot Started"
    const parts = line.split(' - ');
    const timestamp = parts[0] || '';
    const typeStr = parts[1] || 'INFO'; // INFO, ERROR, WARNING, SUCCESS
    const message = parts.slice(2).join(' - ') || line;

    let type: LogEntry['type'] = 'info';
    if (typeStr.includes('ERROR')) type = 'error';
    if (typeStr.includes('WARNING')) type = 'warning';
    if (typeStr.includes('SUCCESS') || message.includes('Success')) type = 'success';

    return {
      id: `log-${index}-${Date.now()}`,
      timestamp,
      type,
      message
    };
  };

  const handleToggleSystem = async () => {
    if (isSystemActive) {
      // Stop
      try {
        await fetchJson('/stop', { method: 'POST' });
        setIsSystemActive(false);
        toast.success("Trading Engine Stopped");
      } catch (e) {
        toast.error("Failed to stop engine");
      }
    } else {
      // Start
      if (config.symbols.length === 0) {
        toast.error("Please select at least one stock");
        return;
      }

      // Map interval
      const intervalMap: Record<string, string> = {
        '5': 'FIVE_MINUTE',
        '15': 'FIFTEEN_MINUTE',
        '30': 'THIRTY_MINUTE',
        '60': 'ONE_HOUR'
      };

      const payload = {
        symbols: config.symbols,
        interval: intervalMap[config.interval] || 'FIVE_MINUTE',
        startTime: config.startTime,
        stopTime: config.stopTime,
        capital: config.capital,
        apiKey: credentials.apiKey,
        clientCode: credentials.clientCode,
        password: credentials.password,
        totp: credentials.totp,
        simulated: tradingMode === 'PAPER',
        strategy: config.strategy.toLowerCase() // 'orb', 'ema' etc.
      };

      try {
        const res = await fetchJson('/start', { method: 'POST', body: JSON.stringify(payload) });
        if (res.status === 'success') {
          setIsSystemActive(true);
          toast.success(`Started in ${tradingMode} mode`);
        } else {
          toast.error(res.message || "Failed to start");
        }
      } catch (e: any) {
        toast.error(e.message || "Failed to call start endpoint");
      }
    }
  };

  const handleSquareOffAll = async () => {
    // Logic for global square off
    // Since backend doesn't have bulk, loop trades
    if (positions.length === 0) return;

    const promises = positions.map(p => fetchJson('/exit_trade', { method: 'POST', body: JSON.stringify({ trade_id: p.id }) }));
    await Promise.all(promises);
    toast.success("Square off command sent for all positions");
  };

  const handleExitPosition = async (id: string) => {
    try {
      await fetchJson('/exit_trade', { method: 'POST', body: JSON.stringify({ trade_id: id }) });
      toast.success("Exit command sent");
    } catch (e) {
      toast.error("Failed to exit position");
    }
  };

  const handleUpdatePosition = async (id: string, tp: number, sl: number) => {
    // Backend expects /update_trade with trade_id, tp, and sl
    try {
      const res = await fetchJson('/update_trade', {
        method: 'POST',
        body: JSON.stringify({ trade_id: id, tp: tp, sl: sl })
      });
      if (res.status === 'success') {
        toast.success(res.message || "Orders updated");
        // Update local state
        setPositions(prev => prev.map(p =>
          p.id === id ? { ...p, tp, sl } : p
        ));
      } else {
        toast.error(res.message || "Update failed");
      }
    } catch (e: any) {
      toast.error(e.message || "Update failed");
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Row - Status, P&L, and Safety Guard */}
      <div className="grid gap-6 md:grid-cols-3">
        <SystemStatus
          isActive={isSystemActive}
          onToggle={handleToggleSystem}
        />
        <LivePnLCard pnl={pnl} percentChange={0} />
        <SafetyGuard />
      </div>

      {/* Strategy Config */}
      <div className="grid gap-6">
        <StrategyConfig
          config={config}
          onConfigChange={setConfig}
          disabled={isSystemActive} // Disable config while running
        />
      </div>

      {/* Active Positions */}
      <ActivePositions
        positions={positions}
        onSquareOffAll={handleSquareOffAll}
        onExitPosition={handleExitPosition}
        onUpdatePosition={handleUpdatePosition}
      />

      {/* System Logs */}
      <SystemLogs logs={logs} />
    </div>
  );
}
