"use client";
import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MobileNavigation,
    MobileStatusView,
    MobileTradesView,
    MobileLogsView,
    MobileSettingsView,
    MobileProfileSettingsView,
    MobileBacktestView,
    MobileAnalyticsView,
    MobileOrderBookView,
    MobilePlansView,
    type MobileTab
} from '@/components/mobile';
import { MobileHeader } from './MobileHeader';
import { fetchJson } from '@/lib/api';

// Dynamic Razorpay script loading
const loadRazorpayScript = async () => {
    if (typeof window === 'undefined') return;
    if ((window as any).Razorpay) return; // Already loaded

    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        script.onload = () => resolve(true);
        script.onerror = () => reject(new Error('Failed to load Razorpay'));
        document.body.appendChild(script);
    });
};

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

    const [orderBook, setOrderBook] = useState<any[]>([]);
    const [plans, setPlans] = useState<any[]>([]);
    const [profile, setProfile] = useState<any>(null);

    const [currentMode, setCurrentMode] = useState<'PAPER' | 'LIVE'>(tradingMode);
    const [showOrderBook, setShowOrderBook] = useState(false);
    const [showPlans, setShowPlans] = useState(false);
    const [showProfileSettings, setShowProfileSettings] = useState(false);

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

                // Get profile credentials and data
                const profileData = await fetchJson('/get_profile');
                setProfile(profileData);
                setCredentials({
                    apiKey: profileData.angel_api_key || '',
                    clientCode: profileData.angel_client_code || '',
                    password: profileData.angel_password || '',
                    totp: profileData.angel_totp || ''
                });

                // Get P&L
                const pnlData = await fetchJson('/pnl');
                setPnl(pnlData.pnl || 0);

                // Get trades
                const tradesData = await fetchJson('/trades');
                if (tradesData.status === 'success') {
                    setPositions(mapBackendTrades(tradesData.data));
                }

                // Get plans
                const plansData = await fetchJson('/plans');
                setPlans(plansData);
            } catch (err) {
                console.error("Failed to load initial data", err);
            }
        };

        fetchData();

        // Polling for status, logs, and orderbook
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

                // Poll Orderbook only if we are viewing the relevant tabs
                if (activeTab === 'analytics' || showOrderBook || activeTab === 'status') {
                    const isSimulated = currentMode === 'PAPER';
                    const orderBookRes = await fetchJson(`/orderbook?simulated=${isSimulated}`);
                    if (orderBookRes.status === 'success') {
                        setOrderBook(orderBookRes.data);
                    }
                }
            } catch (e) { }
        }, 3000);

        return () => clearInterval(pollInterval);
    }, [isLoading, activeTab, currentMode, showOrderBook]);

    // Fetch orderbook when mode changes
    useEffect(() => {
        const fetchOrderBook = async () => {
            try {
                const isSimulated = currentMode === 'PAPER';
                const res = await fetchJson(`/orderbook?simulated=${isSimulated}`);
                if (res.status === 'success') {
                    setOrderBook(res.data);
                }
            } catch (e) {
                console.error("Failed to fetch orderbook", e);
            }
        };
        fetchOrderBook();
    }, [currentMode]);

    // Socket connection for real-time updates
    useEffect(() => {
        let socket: Socket | null = null;

        if (isSystemActive) {
            const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL || 'https://api.merqprime.in';
            socket = io(socketUrl, {
                path: '/socket.io',
                withCredentials: true,
                transports: ['websocket', 'polling'],
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
                setActiveTab('status');
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

    const analyticsData = React.useMemo(() => {
        const filledOrders = orderBook.filter(o =>
            o.status === 'filled' ||
            (typeof o.status === 'string' && o.status.startsWith('CLOSED'))
        );
        const totalTrades = filledOrders.length;
        const totalPnl = filledOrders.reduce((sum, o) => sum + (Number(o.pnl) || 0), 0);
        const profitableTrades = filledOrders.filter(o => (Number(o.pnl) || 0) > 0).length;
        const losingTrades = filledOrders.filter(o => (Number(o.pnl) || 0) < 0).length;
        const winRate = totalTrades > 0 ? (profitableTrades / totalTrades) * 100 : 0;

        return {
            pnl: totalPnl,
            winRate,
            totalTrades,
            profitableTrades,
            losingTrades
        };
    }, [orderBook]);

    // Render active tab content
    const renderContent = () => {
        switch (activeTab) {
            case 'status':
                return (
                    <MobileStatusView
                        isSystemActive={isSystemActive}
                        isLoading={isLoading}
                        pnl={pnl}
                        mode={currentMode}
                        positionsCount={positions.length}
                        onToggleSystem={handleToggleSystem}
                        onStopBot={handleStopBot}
                        onViewTrades={() => setActiveTab('trades')}
                        config={config}
                        onConfigChange={setConfig}
                        maxLoss={maxLoss}
                        onMaxLossChange={setMaxLoss}
                        isSafetyGuardOn={isSafetyGuardOn}
                        onSafetyGuardToggle={setIsSafetyGuardOn}
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
            case 'backtest':
                return <MobileBacktestView />;
            case 'analytics':
                return (
                    <MobileAnalyticsView
                        pnl={analyticsData.pnl}
                        winRate={analyticsData.winRate}
                        totalTrades={analyticsData.totalTrades}
                        profitableTrades={analyticsData.profitableTrades}
                        losingTrades={analyticsData.losingTrades}
                    />
                );
            default:
                return null;
        }
    };

    const handleToggleTradingMode = () => {
        if (isSystemActive) {
            toast.error("Stop the bot before changing mode");
            return;
        }
        const newMode = currentMode === 'PAPER' ? 'LIVE' : 'PAPER';
        setCurrentMode(newMode);
        toast.success(`Switched to ${newMode} mode`);
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
        <div className="md:hidden min-h-screen bg-zinc-50 dark:bg-zinc-950">
            {/* Mobile Header */}
            <MobileHeader
                isSystemActive={isSystemActive}
                tradingMode={currentMode}
                user={user}
                onLogout={handleLogout}
                onToggleTradingMode={handleToggleTradingMode}
                onNavigateToOrderBook={() => {
                    setShowOrderBook(true);
                }}
                onNavigateToPlans={() => {
                    setShowPlans(true);
                }}
                onNavigateToSettings={() => {
                    setShowProfileSettings(true);
                }}
            />

            {/* Order Book Modal */}
            <AnimatePresence>
                {showOrderBook && (
                    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                            onClick={() => setShowOrderBook(false)}
                        />
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 500 }}
                            className="relative z-10 h-[90vh] bg-white dark:bg-zinc-950 rounded-t-2xl overflow-hidden shadow-xl flex flex-col"
                        >
                            <div className="h-16 flex items-center justify-between px-4 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
                                <button
                                    onClick={() => setShowOrderBook(false)}
                                    className="text-zinc-600 dark:text-zinc-400 font-medium active:scale-95 transition-transform"
                                >
                                    ← Back
                                </button>
                                <span className="text-lg font-bold text-zinc-900 dark:text-white">Order Book</span>
                                <div className="w-12" />
                            </div>
                            <div className="flex-1 overflow-hidden relative">
                                <MobileOrderBookView
                                    orders={orderBook}
                                    onDeleteOrders={async (ids) => {
                                        try {
                                            await fetchJson('/delete_orders', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ ids })
                                            });
                                            setOrderBook(prev => prev.filter(o => !ids.includes(o.id)));
                                            toast.success(`Deleted ${ids.length} order(s)`);
                                        } catch (err) {
                                            toast.error('Failed to delete orders');
                                        }
                                    }}
                                />
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Plans Modal */}
            <AnimatePresence>
                {showPlans && (
                    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                            onClick={() => setShowPlans(false)}
                        />
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 500 }}
                            className="relative z-10 h-[90vh] bg-white dark:bg-zinc-950 rounded-t-2xl overflow-hidden shadow-xl flex flex-col"
                        >
                            <div className="h-16 flex items-center justify-between px-4 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
                                <button
                                    onClick={() => setShowPlans(false)}
                                    className="text-zinc-600 dark:text-zinc-400 font-medium active:scale-95 transition-transform"
                                >
                                    ← Back
                                </button>
                                <span className="text-lg font-bold text-zinc-900 dark:text-white">Plans</span>
                                <div className="w-12" />
                            </div>
                            <div className="flex-1 overflow-hidden relative">
                                <MobilePlansView
                                    plans={plans}
                                    currentPlan={profile?.plan || null}
                                    onSubscribe={async (planId) => {
                                        try {
                                            // Find the plan details for description
                                            const selectedPlan = plans.find(p => p.id === planId);

                                            // Step 1: Load Razorpay script
                                            await loadRazorpayScript();

                                            // Step 2: Create Razorpay order (Try both endpoints)
                                            let orderData;
                                            try {
                                                // Try desktop endpoint first
                                                orderData = await fetchJson('/razorpay/create_order', {
                                                    method: 'POST',
                                                    body: JSON.stringify({ plan_id: planId })
                                                });
                                            } catch (e: any) {
                                                console.warn("Primary creating order failed, trying fallback...", e);
                                                try {
                                                    orderData = await fetchJson('/create_order', {
                                                        method: 'POST',
                                                        body: JSON.stringify({ plan_id: planId })
                                                    });
                                                } catch (e2: any) {
                                                    throw new Error("Could not create payment order. Please try again.");
                                                }
                                            }

                                            if (!orderData || orderData.status !== 'success') {
                                                toast.error(orderData?.message || 'Failed to create order');
                                                return;
                                            }

                                            // Step 3: Configure Razorpay
                                            const options = {
                                                key: orderData.key || orderData.key_id, // Handle both key formats
                                                amount: orderData.amount,
                                                currency: orderData.currency || "INR",
                                                name: 'Algo Trade', // Match desktop name
                                                description: `Subscription for ${selectedPlan?.name || 'Plan'}`,
                                                image: 'https://i.imgur.com/n5tjHFD.png',
                                                order_id: orderData.order_id,
                                                prefill: orderData.prefill, // Use prefill from backend response directly
                                                theme: { color: '#3B82F6' },
                                                handler: async function (response: any) {
                                                    try {
                                                        const verifyResult = await fetchJson('/verify_payment', {
                                                            method: 'POST',
                                                            body: JSON.stringify({
                                                                razorpay_payment_id: response.razorpay_payment_id,
                                                                razorpay_order_id: response.razorpay_order_id,
                                                                razorpay_signature: response.razorpay_signature,
                                                                plan_id: planId
                                                            })
                                                        });

                                                        if (verifyResult.status === 'success') {
                                                            toast.success('Payment successful!');
                                                            const profileData = await fetchJson('/get_profile');
                                                            setProfile(profileData);
                                                            setShowPlans(false);
                                                            // Trigger re-fetch of plans/profile if needed
                                                        } else {
                                                            toast.error(verifyResult.message || 'Payment verification failed');
                                                        }
                                                    } catch (verifyError: any) {
                                                        toast.error('Payment verification failed: ' + verifyError.message);
                                                    }
                                                }
                                            };

                                            const razorpay = new (window as any).Razorpay(options);
                                            razorpay.on('payment.failed', function (response: any) {
                                                toast.error(`Payment failed: ${response.error.description}`);
                                            });
                                            razorpay.open();

                                            // Step 4: Fix UI Responsiveness (Hack for Mobile)
                                            const fixRazorpaySize = () => {
                                                const container = document.querySelector('.razorpay-container') as HTMLElement;
                                                const frame = document.querySelector('.razorpay-checkout-frame') as HTMLElement;

                                                if (container) {
                                                    container.style.setProperty('z-index', '2147483647', 'important');
                                                    container.style.setProperty('position', 'fixed', 'important');
                                                    container.style.setProperty('top', '50%', 'important');
                                                    container.style.setProperty('left', '50%', 'important');
                                                    container.style.setProperty('transform', 'translate(-50%, -50%)', 'important');
                                                    container.style.setProperty('width', '100%', 'important'); // Mobile friendly
                                                    container.style.setProperty('height', '100%', 'important'); // Mobile friendly
                                                    container.style.setProperty('max-width', '100vw', 'important');
                                                    container.style.setProperty('max-height', '100vh', 'important');
                                                }
                                                if (frame) {
                                                    frame.style.setProperty('width', '100%', 'important');
                                                    frame.style.setProperty('height', '100%', 'important');
                                                }
                                                return !!container;
                                            };

                                            const styleInterval = setInterval(() => {
                                                if (fixRazorpaySize()) {
                                                    // Keep enforcing for a bit
                                                }
                                            }, 100);
                                            setTimeout(() => clearInterval(styleInterval), 5000);

                                        } catch (err: any) {
                                            console.error("Payment Error:", err);
                                            toast.error(err.message || 'Failed to initiate payment');
                                        }
                                    }}
                                />
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Profile Settings Modal */}
            <AnimatePresence>
                {showProfileSettings && (
                    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                            onClick={() => setShowProfileSettings(false)}
                        />
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 500 }}
                            className="relative z-10 h-[90vh] bg-white dark:bg-zinc-950 rounded-t-2xl overflow-hidden shadow-xl flex flex-col"
                        >
                            <div className="h-16 flex items-center justify-between px-4 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
                                <button
                                    onClick={() => setShowProfileSettings(false)}
                                    className="text-zinc-600 dark:text-zinc-400 font-medium active:scale-95 transition-transform"
                                >
                                    ← Back
                                </button>
                                <span className="text-lg font-bold text-zinc-900 dark:text-white">Profile Settings</span>
                                <div className="w-12" />
                            </div>
                            <div className="flex-1 overflow-hidden relative">
                                <MobileProfileSettingsView />
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Content - Animated Tab Transitions */}
            <main className="pt-16 has-mobile-nav overflow-hidden">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                        className="h-full"
                    >
                        {renderContent()}
                    </motion.div>
                </AnimatePresence>
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

