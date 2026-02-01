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
import { Profile } from "@/components/dashboard/Profile";
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

    // Check Authentication on Mount
    useEffect(() => {
        const checkAuth = async () => {
            try {
                const res = await fetchJson('/check_auth');
                if (res.authenticated) {
                    setIsAuthenticated(true);
                    setUser({ username: res.user });
                    // Fetch full profile for email/details
                    try {
                        const profile = await fetchJson('/get_profile');
                        setUser((prev: any) => ({ ...prev, ...profile }));
                    } catch (err) {
                        console.error("Failed to load profile details", err);
                    }
                } else {
                    router.push('/'); // Redirect to landing/login if not authenticated
                }
            } catch (e) {
                console.error("Auth check failed", e);
                router.push('/');
            }
        };
        checkAuth();
    }, [router]);

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
            case 'analytics':
                return <Analytics />;
            case 'order-book':
                return <OrderBook />;
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
            case 'analytics': return 'Analytics';
            case 'order-book': return 'Order Book';
            case 'profile': return 'Profile & Settings';
            default: return 'Dashboard';
        }
    };

    const getPageDescription = () => {
        if (tradingMode === 'LIVE') {
            return <span className="text-loss">Live trading mode - Real money at risk</span>;
        }
        return <span className="text-primary">Paper trading mode - Simulation only</span>;
    };

    // Prevent rendering if not authenticated (optional, avoids flash)
    if (!isAuthenticated) return null;

    return (
        <div className="min-h-screen bg-background">


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

            <div className="flex">
                <DashboardSidebar
                    isOpen={isSidebarOpen}
                    onClose={() => setIsSidebarOpen(false)}
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                />

                <main className="flex-1 p-4 md:p-6 lg:p-8">
                    <div className="mb-6">
                        <h1 className="text-2xl font-bold">{getPageTitle()}</h1>
                        <p className="text-muted-foreground">
                            {getPageDescription()}
                        </p>
                    </div>

                    {renderContent()}
                </main>
            </div>
        </div>
    );
}
