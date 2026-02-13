"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { LiveTrading } from "@/components/dashboard/LiveTrading";
import { Backtesting } from "@/components/dashboard/Backtesting";
import { BacktestHistory } from "@/components/dashboard/BacktestHistory";
import { Analytics } from "@/components/dashboard/Analytics";
import { OrderBook } from "@/components/dashboard/OrderBook";
import { Referrals } from "@/components/dashboard/Referrals";
import { Profile } from "@/components/dashboard/Profile";
import { StarPerformers } from "@/components/dashboard/StarPerformers";
import { MobileDashboard } from "@/components/mobile";
import { fetchJson } from "@/lib/api";
import { toast } from "sonner";

export default function DashboardNewPage() {
    const router = useRouter();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("live-trading");
    const [tradingMode, setTradingMode] = useState<'LIVE' | 'PAPER'>('PAPER');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [isSystemRunning, setIsSystemRunning] = useState(false);

    // Enable dark mode by default
    useEffect(() => {
        document.documentElement.classList.add('dark');
    }, []);

    // Check Authentication & System Status on Mount
    useEffect(() => {
        const checkAuthAndStatus = async () => {
            try {
                // 1. Check Auth
                const res = await fetchJson('/check_auth');
                if (res.authenticated) {
                    setIsAuthenticated(true);
                    setUser({ username: res.user });

                    // 2. Fetch Profile
                    try {
                        const profile = await fetchJson('/get_profile');
                        setUser((prev: any) => ({ ...prev, ...profile }));
                    } catch (err) {
                        console.error("Failed to load profile details", err);
                    }

                    // 3. Fetch System Status & Mode
                    try {
                        const statusData = await fetchJson('/status');
                        console.log("Initial Status Fetch:", statusData);


                        if (statusData) {
                            setIsSystemRunning(statusData.active === true);

                            // Correctly set mode based on backend config
                            // If backend explicitly says simulated=false, it's LIVE.
                            // Otherwise default to PAPER (safest).
                            if (statusData.config && statusData.config.simulated === false) {
                                setTradingMode('LIVE');
                            } else {
                                setTradingMode('PAPER');
                            }
                        }
                    } catch (err) {
                        console.error("Failed to load system status", err);
                    }

                } else {
                    router.push('/'); // Redirect to landing/login if not authenticated
                }
            } catch (e) {
                console.error("Auth check failed", e);
                router.push('/');
            }
        };
        checkAuthAndStatus();
    }, [router]);

    // Poll system status to ensure lock is active even if user switches tabs
    useEffect(() => {
        if (!isAuthenticated) return;

        const pollStatus = async () => {
            try {
                const statusData = await fetchJson('/status');
                if (statusData && statusData.active !== undefined) {
                    setIsSystemRunning(statusData.active === true);

                    // Sync mode if running
                    if (statusData.active === true && statusData.config) {
                        const serverMode = statusData.config.simulated === false ? 'LIVE' : 'PAPER';
                        if (serverMode !== tradingMode) {
                            setTradingMode(serverMode);
                        }
                    }
                }
            } catch (e) {
                // ignore
            }
        };

        const interval = setInterval(pollStatus, 5000); // 5 seconds
        return () => clearInterval(interval);
    }, [isAuthenticated, tradingMode]);

    const handleLogout = async () => {
        try {
            await fetchJson('/logout', { method: 'POST' });
            toast.success("Logged out successfully");
            window.location.href = '/';
        } catch (e) {
            console.error("Logout failed", e);
            toast.error("Logout failed");
        }
    };

    const handleToggleTradingMode = () => {
        // Prevent mode switch while system is running
        if (isSystemRunning) {
            toast.error("Stop the bot before switching trading modes");
            return;
        }
        const newMode = tradingMode === 'LIVE' ? 'PAPER' : 'LIVE';
        setTradingMode(newMode);
        toast.info(`Switched to ${newMode} mode`);
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'live-trading':
                return <LiveTrading tradingMode={tradingMode} onSystemStatusChange={setIsSystemRunning} />;
            case 'backtesting':
                return <Backtesting />;
            case 'backtest-history':
                return <BacktestHistory />;
            case 'star-performers':
                return <StarPerformers />;
            case 'analytics':
                return <Analytics />;
            case 'order-book':
                return <OrderBook />;
            case 'referrals':
                return <Referrals />;
            case 'profile':
                return <Profile />;
            default:
                return <LiveTrading tradingMode={tradingMode} onSystemStatusChange={setIsSystemRunning} />;
        }
    };

    const getPageTitle = () => {
        switch (activeTab) {
            case 'live-trading': return 'Live Trading';
            case 'backtesting': return 'Backtesting';
            case 'backtest-history': return 'Backtest History';
            case 'star-performers': return 'Star Performers';
            case 'analytics': return 'Analytics';
            case 'order-book': return 'Order Book';
            case 'referrals': return 'Refer & Earn';
            case 'profile': return 'Profile & Settings';
            default: return 'Dashboard';
        }
    };

    // Prevent rendering if not authenticated (optional, avoids flash)
    if (!isAuthenticated) return null;

    return (
        <div className="min-h-screen bg-background">
            {/* ===== MOBILE VIEW (< 1024px) ===== */}
            <MobileDashboard
                tradingMode={tradingMode}
                user={user}
                onSystemStatusChange={setIsSystemRunning}
            />

            {/* ===== DESKTOP VIEW (>= 768px) ===== */}
            <div className="hidden md:flex md:flex-col md:h-screen md:overflow-hidden">
                <DashboardHeader
                    isSidebarOpen={isSidebarOpen}
                    onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                    tradingMode={tradingMode}
                    onToggleTradingMode={handleToggleTradingMode}
                    onTabChange={setActiveTab}
                    onLogout={handleLogout}
                    user={user}
                    isSystemRunning={isSystemRunning}
                />

                <div className="flex flex-1 overflow-hidden">
                    <DashboardSidebar
                        isOpen={isSidebarOpen}
                        onClose={() => setIsSidebarOpen(false)}
                        activeTab={activeTab}
                        onTabChange={setActiveTab}
                    />

                    <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
                        <div className="mb-6">
                            <h1 className="text-2xl font-bold">{getPageTitle()}</h1>
                        </div>

                        {renderContent()}
                    </main>
                </div>
            </div>
        </div>
    );
}

