import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Menu,
  Sun,
  Moon,
  User,
  Settings,
  LogOut,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface DashboardHeaderProps {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  tradingMode: 'LIVE' | 'PAPER';
  onToggleTradingMode: () => void;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
  user?: any;
  isSystemRunning?: boolean;
}

interface TickerItem {
  symbol: string;
  price: string;
  change: string;
  isGainer: boolean;
}

// Static fallback data in case API is unreachable
const FALLBACK_TICKERS: TickerItem[] = [
  { symbol: "NIFTY 50", price: "24,350.50", change: "+0.45%", isGainer: true },
  { symbol: "BANKNIFTY", price: "52,100.20", change: "-0.12%", isGainer: false },
  { symbol: "SENSEX", price: "80,123.45", change: "+0.30%", isGainer: true },
  { symbol: "FINNIFTY", price: "23,456.78", change: "+0.10%", isGainer: true },
  { symbol: "INDIA VIX", price: "12.45", change: "-2.30%", isGainer: false },
  { symbol: "MIDCAP NIFTY", price: "10,987.65", change: "+0.75%", isGainer: true },
];

const TICKER_REFRESH_INTERVAL = 30 * 1000; // 30 seconds

export function DashboardHeader({
  isSidebarOpen,
  onToggleSidebar,
  tradingMode,
  onToggleTradingMode,
  onTabChange,
  onLogout,
  user,
  isSystemRunning = false,
}: DashboardHeaderProps) {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [tickers, setTickers] = useState<TickerItem[]>(FALLBACK_TICKERS);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  // Fetch live market data from Yahoo Finance backend
  const fetchMarketData = useCallback(async () => {
    try {
      const res = await fetch('/api/market_data');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (Array.isArray(data) && data.length > 0) {
        const mapped: TickerItem[] = data.map((item: any) => ({
          symbol: item.symbol || 'UNKNOWN',
          price: item.price || '0.00',
          change: item.change || '0.00%',
          isGainer: item.isGainer ?? (item.change && !item.change.startsWith('-')),
        }));
        setTickers(mapped);
      }
    } catch (err) {
      console.warn('[Marquee] Failed to fetch market data, using fallback:', err);
      // Keep existing tickers (either previous live data or fallback)
    }
  }, []);

  useEffect(() => {
    // Initial fetch
    fetchMarketData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchMarketData, TICKER_REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchMarketData]);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="flex h-16 items-center justify-between px-4 md:px-6 relative">
        {/* Left section */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleSidebar}
            className="md:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <TrendingUp className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight">
              MerQ<span className="text-primary">Prime</span>
            </span>
          </Link>
        </div>

        {/* Features Dropdown - Desktop (Centered) */}


        {/* Right section */}
        <div className="flex items-center gap-3">
          {/* Trading Mode Toggle */}
          <div className={cn(
            "flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-3 py-1.5",
            isSystemRunning && "opacity-50 pointer-events-none cursor-not-allowed"
          )}>
            <span className={cn(
              "text-xs font-semibold transition-colors",
              tradingMode === 'PAPER' ? "text-primary" : "text-muted-foreground"
            )}>
              PAPER
            </span>
            <Switch
              checked={tradingMode === 'LIVE'}
              onCheckedChange={onToggleTradingMode}
              className="data-[state=checked]:bg-loss"
              disabled={isSystemRunning}
            />
            <span className={cn(
              "text-xs font-semibold transition-colors",
              tradingMode === 'LIVE' ? "text-loss" : "text-muted-foreground"
            )}>
              REAL
            </span>
            {tradingMode === 'LIVE' && (
              <span className="ml-1 h-2 w-2 rounded-full bg-loss pulse-live" />
            )}
          </div>

          {/* Theme Toggle */}
          <Button variant="ghost" size="icon" onClick={toggleTheme}>
            {isDarkMode ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20">
                  <User className="h-4 w-4 text-primary" />
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{user?.username || 'Trader'}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email || 'user@example.com'}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onTabChange('profile')}>
                <Settings className="mr-2 h-4 w-4" />
                Profile Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={onLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Live Marquee Ticker */}
      <div className="border-t border-border bg-muted/30 overflow-hidden py-1">
        <div className="flex animate-marquee whitespace-nowrap hover:[animation-play-state:paused]">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="flex gap-8 px-4">
              {tickers.map((ticker, j) => (
                <span key={`${i}-${j}`} className="flex items-center gap-2 text-sm font-medium">
                  {ticker.symbol}{' '}
                  <span className={ticker.isGainer ? "text-profit" : "text-loss"}>
                    {ticker.price} ({ticker.change})
                  </span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </header>
  );
}
