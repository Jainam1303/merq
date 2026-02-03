"use client";
import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';
import {
    MobileNavigation,
    MobileStatusView,
    MobileTradesView,
    MobileLogsView,
    MobileSettingsView,
    type MobileTab
} from '@/components/mobile';
import { MobileHeader } from './MobileHeader';
import { fetchJson } from '@/lib/api';

interface Position {
    id: string;
    symbol: string;
    type: 'BUY' | 'SELL';
    qty: number;
    entry: number;
    tp: number;
    sl: number;
    pnl: number;
    time: string;
}

interface LogEntry {
    id: string;
    timestamp: string;
    type: 'info' | 'success' | 'warning' | 'error';
    message: string;
}

interface ConfigData {
    symbols: string[];
    strategy: string;
    interval: string;
    startTime: string;
    stopTime: string;
    capital: string;
}

interface MobileDashboardProps {
    tradingMode: 'PAPER' | 'LIVE';
    user: any;
    onSystemStatusChange?: (isActive: boolean) => void;
}

export function MobileDashboard({ tradingMode, user, onSystemStatusChange }: MobileDashboardProps) {
    const [activeTab, setActiveTab] = useState<MobileTab>('status');
    const [isSystemActive, setIsSystemActive] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [pnl, setPnl] = useState(0);
    const [positions, setPositions] = useState<Position[]>([]);
    const [logs, setLogs] = useState<LogEntry[]>([]);

    const [config, setConfig] = useState<ConfigData>({
        symbols: ['RELIANCE-EQ', 'TCS-EQ'],
        strategy: 'ORB',
        interval: '15',
        startTime: '09:15',
        stopTime: '15:15',
        capital: '100000'
    });

    const [maxLoss, setMaxLoss] = useState('5000');
    const [isSafetyGuardOn, setIsSafetyGuardOn] = useState(false);

    const [credentials, setCredentials] = useState({
        apiKey: '',
        clientCode: '',
        password: '',
        totp: ''
    });

    const socketRef = useRef<Socket | null>(null);

    // Notify parent of status changes
    useEffect(() => {
        onSystemStatusChange?.(isSystemActive);
    }, [isSystemActive, onSystemStatusChange]);

    // Load initial data
    useEffect(() => {
        const fetchData = async () => {
            try {
                // Get status
                const statusData = await fetchJson('/status');
                setIsSystemActive(statusData.active === true);

                // Get profile credentials
                const profile = await fetchJson('/get_profile');
                setCredentials({
                    apiKey: profile.angel_api_key || '',
                    clientCode: profile.angel_client_code || '',
                    password: profile.angel_password || '',
                    totp: profile.angel_totp || ''
                });

                // Get P&L
                const pnlData = await fetchJson('/pnl');
                setPnl(pnlData.pnl || 0);

                // Get trades
                const tradesData = await fetchJson('/trades');
                if (tradesData.status === 'success') {
                    setPositions(mapBackendTrades(tradesData.data));
                }
            } catch (err) {
                console.error("Failed to load initial data", err);
            }
        };

        fetchData();

        // Polling for status and logs
        const pollInterval = setInterval(async () => {
            try {
                const statusData = await fetchJson('/status');
                if (!isLoading) {
                    setIsSystemActive(statusData.active === true);
                }

                // Parse logs
                const logData = statusData.logs || [];
                const parsedLogs = (Array.isArray(logData) ? logData : [])
                    .slice(0, 50)
                    .map((l: string, i: number) => parseLogLine(l, i));
                setLogs(parsedLogs);
            } catch (e) { }
        }, 3000);

        return () => clearInterval(pollInterval);
    }, [isLoading]);

    // Socket connection for real-time updates
    useEffect(() => {
        let socket: Socket | null = null;

        if (isSystemActive) {
            socket = io({
                path: '/socket.io',
                withCredentials: true,
                transports: ['polling'],
                reconnectionAttempts: 5,
                reconnectionDelay: 1000,
            });

            socket.on('connect', () => {
                console.log('[Mobile] Socket connected');
            });

            socket.on('tick_update', (data: any) => {
                if (data.pnl !== undefined) {
                    setPnl(data.pnl);
                }
                if (data.trades) {
                    setPositions(mapBackendTrades(data.trades));
                }
            });

            socketRef.current = socket;
        }

        return () => {
            socket?.disconnect();
            socketRef.current = null;
        };
    }, [isSystemActive]);

    // Faster P&L polling when active
    useEffect(() => {
        if (!isSystemActive) return;

        const interval = setInterval(async () => {
            try {
                const pnlData = await fetchJson('/pnl');
                setPnl(pnlData.pnl || 0);

                const tradesData = await fetchJson('/trades');
                if (tradesData.status === 'success') {
                    setPositions(mapBackendTrades(tradesData.data));
                }
            } catch (e) { }
        }, 1000);

        return () => clearInterval(interval);
    }, [isSystemActive]);

    // Map backend trade format to frontend
    const mapBackendTrades = (trades: any[]): Position[] => {
        if (!Array.isArray(trades)) return [];
        return trades.map((t, idx) => ({
            id: String(t.id ?? t.entry_order_id ?? idx),
            time: t.time || (t.timestamp ? t.timestamp.split(' ')[1] : '--:--'),
            symbol: t.symbol || '',
            type: t.type || t.mode || 'BUY',
            qty: Number(t.qty ?? t.quantity ?? 0),
            entry: parseFloat(t.entry ?? t.entry_price ?? 0),
            tp: parseFloat(t.tp ?? 0),
            sl: parseFloat(t.sl ?? 0),
            pnl: parseFloat(t.pnl ?? 0)
        }));
    };

    const parseLogLine = (line: string, index: number): LogEntry => {
        const parts = line.split(' - ');
        const timestamp = parts[0] || '';
        const typeStr = parts[1] || 'INFO';
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

    // Toggle system on/off
    const handleToggleSystem = async () => {
        if (isLoading) return;

        if (isSystemActive) {
            // Stop
            setIsLoading(true);
            setIsSystemActive(false);
            try {
                await fetchJson('/stop', { method: 'POST' });
                toast.success("Trading Engine Stopped");
            } catch (e) {
                setIsSystemActive(true);
                toast.error("Failed to stop engine");
            } finally {
                setIsLoading(false);
            }
        } else {
            // Start
            if (config.symbols.length === 0) {
                toast.error("Please select at least one stock");
                setActiveTab('settings');
                return;
            }

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

            setIsLoading(true);
            setIsSystemActive(true);
            toast.info(`Starting in ${tradingMode} mode...`);

            try {
                const res = await fetchJson('/start', { method: 'POST', body: JSON.stringify(payload) });
                if (res.status === 'success') {
                    toast.success("Engine Started Successfully");
                } else {
                    setIsSystemActive(false);
                    toast.error(res.message || "Failed to start");
                }
            } catch (e: any) {
                setIsSystemActive(false);
                toast.error(e.message || "Failed to start engine");
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handleStopBot = async () => {
        setIsLoading(true);
        try {
            await fetchJson('/stop', { method: 'POST' });
            setIsSystemActive(false);
            toast.success("Engine stopped");
        } catch (e) {
            toast.error("Failed to stop");
        } finally {
            setIsLoading(false);
        }
    };

    const handleExitTrade = async (id: string) => {
        try {
            await fetchJson('/exit-position', { method: 'POST', body: JSON.stringify({ positionId: id }) });
            toast.success("Exit command sent");
            setPositions(prev => prev.filter(p => p.id !== id));
        } catch (e) {
            toast.error("Failed to exit position");
        }
    };

    const handleUpdateTrade = async (id: string, tp: number, sl: number) => {
        try {
            const res = await fetchJson('/update-position', {
                method: 'POST',
                body: JSON.stringify({ positionId: id, tp, sl })
            });
            if (res.status === 'updated') {
                toast.success("TP/SL updated");
                setPositions(prev => prev.map(p => p.id === id ? { ...p, tp, sl } : p));
            } else {
                toast.error(res.message || "Update failed");
            }
        } catch (e: any) {
            toast.error(e.message || "Update failed");
        }
    };

    const handleSquareOffAll = async () => {
        if (positions.length === 0) return;

        try {
            const promises = positions.map(p =>
                fetchJson('/exit-position', { method: 'POST', body: JSON.stringify({ positionId: p.id }) })
            );
            await Promise.all(promises);
            toast.success("All positions closed");
            setPositions([]);
        } catch (e) {
            toast.error("Failed to close all positions");
        }
    };

    const totalPnl = positions.reduce((sum, p) => sum + p.pnl, 0);

    // Render active tab content
    const renderContent = () => {
        switch (activeTab) {
            case 'status':
                return (
                    <MobileStatusView
                        isSystemActive={isSystemActive}
                        isLoading={isLoading}
                        pnl={pnl}
                        mode={tradingMode}
                        positionsCount={positions.length}
                        onToggleSystem={handleToggleSystem}
                        onStopBot={handleStopBot}
                        onViewTrades={() => setActiveTab('trades')}
                    />
                );
            case 'trades':
                return (
                    <MobileTradesView
                        trades={positions}
                        onExitTrade={handleExitTrade}
                        onUpdateTrade={handleUpdateTrade}
                        onSquareOffAll={handleSquareOffAll}
                        totalPnl={totalPnl}
                    />
                );
            case 'logs':
                return <MobileLogsView logs={logs} />;
            case 'settings':
                return (
                    <MobileSettingsView
                        config={config}
                        onConfigChange={setConfig}
                        isSystemActive={isSystemActive}
                        maxLoss={maxLoss}
                        onMaxLossChange={setMaxLoss}
                        isSafetyGuardOn={isSafetyGuardOn}
                        onSafetyGuardToggle={setIsSafetyGuardOn}
                    />
                );
            default:
                return null;
        }
    };

    const handleLogout = async () => {
        try {
            await fetchJson('/logout', { method: 'POST' });
            toast.success("Logged out successfully");
            window.location.href = '/';
        } catch (e) {
            toast.error("Logout failed");
        }
    };

    return (
        <div className="lg:hidden min-h-screen bg-zinc-50 dark:bg-zinc-950">
            {/* Mobile Header */}
            <MobileHeader
                isSystemActive={isSystemActive}
                tradingMode={tradingMode}
                user={user}
                onLogout={handleLogout}
            />

            {/* Content */}
            <main className="pt-16 has-mobile-nav">
                {renderContent()}
            </main>

            {/* Bottom Navigation */}
            <MobileNavigation
                activeTab={activeTab}
                onTabChange={setActiveTab}
                isSystemActive={isSystemActive}
                pnl={pnl}
            />
        </div>
    );
}

