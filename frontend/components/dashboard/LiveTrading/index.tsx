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
  const [isLoading, setIsLoading] = useState(false); // Loading state for toggle
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
        // 1. Get Status - backend returns { active: boolean, pnl, positions, logs }
        const statusData = await fetchJson('/status');
        const isRunning = statusData.active === true;
        setIsSystemActive(isRunning);

        // 2. Get Config (if running, this might differ from local defaults)
        if (isRunning) {
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

    // Polling for Status & Logs (every 3s)
    const pollInterval = setInterval(async () => {
      try {
        // Check engine status to keep UI in sync
        const statusData = await fetchJson('/status');
        const isRunning = statusData.active === true;

        // Only update if not currently in a loading state (user initiated action)
        if (!isLoading) {
          setIsSystemActive(isRunning);
        }

        // Parse and set logs
        const logData = statusData.logs || [];
        const parsedLogs = (Array.isArray(logData) ? logData : []).slice(0, 50).map((l: string, i: number) => parseLogLine(l, i));
        setLogs(parsedLogs);
      } catch (e) { }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [isLoading]);

  // Socket Connection with WebSocket transport for lower latency
  useEffect(() => {
    let socket: Socket | null = null;
    let connectionTimeout: NodeJS.Timeout;

    // Only connect if system is active (Running)
    if (isSystemActive) {
      // Connect directly to Backend URL (Vercel cannot proxy WebSockets properly)
      const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL || 'https://api.merqprime.in';

      // Small delay to ensure backend is ready
      connectionTimeout = setTimeout(() => {
        try {
          socket = io(socketUrl, {
            path: '/socket.io',
            withCredentials: true,
            transports: ['polling', 'websocket'], // Try polling first (more reliable), then upgrade to WS
            reconnectionAttempts: 3,
            reconnectionDelay: 2000,
            timeout: 10000,
            autoConnect: true,
          });

          socket.on('connect', () => {
            console.log('Socket Connected');
          });

          socket.on('connect_error', (error) => {
            console.log('Socket connection error (falling back to polling):', error.message);
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
        } catch (e) {
          console.log('Socket init error:', e);
        }
      }, 500); // 500ms delay before connecting
    }

    return () => {
      if (connectionTimeout) {
        clearTimeout(connectionTimeout);
      }
      if (socket) {
        socket.removeAllListeners();
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
    if (!Array.isArray(backendTrades)) return [];

    return backendTrades.map((t, idx) => ({
      id: String(t.id ?? t.entry_order_id ?? idx), // Python sends "id" as int
      time: t.time || (t.timestamp ? t.timestamp.split(' ')[1] : '--:--'),
      symbol: t.symbol || '',
      type: t.type || t.mode || 'BUY', // Python sends "type"
      qty: Number(t.qty ?? t.quantity ?? 0),
      entry: parseFloat(t.entry ?? t.entry_price ?? 0),
      tp: parseFloat(t.tp ?? 0),
      sl: parseFloat(t.sl ?? 0),
      currentPrice: parseFloat(t.currentPrice ?? t.entry ?? 0),
      pnl: parseFloat(t.pnl ?? 0)
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
    if (isLoading) return; // Prevent double-click

    if (isSystemActive) {
      // Stop
      setIsLoading(true);
      setIsSystemActive(false); // Optimistic
      try {
        await fetchJson('/stop', { method: 'POST' });
        toast.success("Trading Engine Stopped");
      } catch (e) {
        setIsSystemActive(true); // Revert on failure
        toast.error("Failed to stop engine");
      } finally {
        setIsLoading(false);
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
        strategy: config.strategy.toLowerCase()
      };

      // OPTIMISTIC UPDATE: Turn ON immediately
      setIsLoading(true);
      setIsSystemActive(true);
      toast.info(`Starting in ${tradingMode} mode...`);

      try {
        const res = await fetchJson('/start', { method: 'POST', body: JSON.stringify(payload) });
        if (res.status === 'success') {
          toast.success(`Engine Started Successfully`);
        } else {
          // API returned non-success
          setIsSystemActive(false); // Revert
          toast.error(res.message || "Failed to start");
        }
      } catch (e: any) {
        // Network/server error
        setIsSystemActive(false); // Revert
        toast.error(e.message || "Failed to start engine");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleSquareOffAll = async () => {
    // Logic for global square off
    if (positions.length === 0) return;

    const promises = positions.map(p => fetchJson('/exit-position', {
      method: 'POST',
      body: JSON.stringify({ positionId: p.id })
    }));
    await Promise.all(promises);
    toast.success("Square off command sent for all positions");
  };

  const handleExitPosition = async (id: string) => {
    try {
      await fetchJson('/exit-position', { method: 'POST', body: JSON.stringify({ positionId: id }) });
      toast.success("Exit command sent");
      // Remove from local state
      setPositions(prev => prev.filter(p => p.id !== id));
    } catch (e) {
      toast.error("Failed to exit position");
    }
  };

  const handleUpdatePosition = async (id: string, tp: number, sl: number) => {
    try {
      const res = await fetchJson('/update-position', {
        method: 'POST',
        body: JSON.stringify({ positionId: id, tp: tp, sl: sl })
      });
      if (res.status === 'updated') {
        toast.success("TP/SL updated successfully");
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

  // LAYER 2: Dismiss a stale position WITHOUT placing exit order
  // Use when position was already manually exited from broker app
  const handleDismissPosition = async (id: string) => {
    try {
      await fetchJson('/dismiss-position', {
        method: 'POST',
        body: JSON.stringify({ positionId: id })
      });
      toast.success("Position dismissed (no exit order placed)");
      // Remove from local state
      setPositions(prev => prev.filter(p => p.id !== id));
    } catch (e) {
      // Even if backend fails, remove from local state
      // (position is likely stale anyway)
      setPositions(prev => prev.filter(p => p.id !== id));
      toast.info("Position removed from dashboard");
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Row - Status, P&L, and Safety Guard */}
      <div className="grid gap-6 md:grid-cols-3">
        <SystemStatus
          isActive={isSystemActive}
          isLoading={isLoading}
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
        onDismissPosition={handleDismissPosition}
      />

      {/* System Logs */}
      <SystemLogs logs={logs} />
    </div>
  );
}
