import { useState } from "react";
import Link from "next/link";
import {
  Menu,
  Sun,
  Moon,
  ChevronDown,
  User,
  Settings,
  LogOut,
  TrendingUp,
  BookOpen,
  BarChart3,
  History
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

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

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
        <div className="hidden md:flex absolute left-1/2 -translate-x-1/2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-1">
                Features
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-48">
              <DropdownMenuItem onClick={() => onTabChange('live-trading')}>
                <TrendingUp className="mr-2 h-4 w-4" />
                Live Trading
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onTabChange('order-book')}>
                <BookOpen className="mr-2 h-4 w-4" />
                Order Book
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onTabChange('backtesting')}>
                <History className="mr-2 h-4 w-4" />
                Backtest
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onTabChange('analytics')}>
                <BarChart3 className="mr-2 h-4 w-4" />
                Analytics
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

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

      {/* Marquee Ticker */}
      <div className="border-t border-border bg-muted/30 overflow-hidden py-1">
        <div className="flex animate-marquee whitespace-nowrap hover:[animation-play-state:paused]">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="flex gap-8 px-4">
              <span className="flex items-center gap-2 text-sm font-medium">
                NIFTY 50 <span className="text-profit">24,350.50 (+0.45%)</span>
              </span>
              <span className="flex items-center gap-2 text-sm font-medium">
                BANKNIFTY <span className="text-loss">52,100.20 (-0.12%)</span>
              </span>
              <span className="flex items-center gap-2 text-sm font-medium">
                SENSEX <span className="text-profit">80,123.45 (+0.30%)</span>
              </span>
              <span className="flex items-center gap-2 text-sm font-medium">
                FINNIFTY <span className="text-profit">23,456.78 (+0.10%)</span>
              </span>
              <span className="flex items-center gap-2 text-sm font-medium">
                INDIA VIX <span className="text-loss">12.45 (-2.30%)</span>
              </span>
              <span className="flex items-center gap-2 text-sm font-medium">
                MIDCAP NIFTY <span className="text-profit">10,987.65 (+0.75%)</span>
              </span>
              {/* Add more indices as needed */}
            </div>
          ))}
        </div>
      </div>
    </header>
  );
}
