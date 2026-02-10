import { useState, useEffect } from "react";
import { fetchJson } from "@/lib/api";
import {
  TrendingUp,
  History,
  BarChart3,
  BookOpen,
  Settings,
  X,
  Play,
  Gift
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DashboardSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const menuItems = [
  { id: 'live-trading', label: 'Live Trading', icon: TrendingUp },
  { id: 'backtesting', label: 'Backtesting', icon: Play },
  { id: 'backtest-history', label: 'Backtest History', icon: History },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'order-book', label: 'Order Book', icon: BookOpen },
  { id: 'referrals', label: 'Refer & Earn', icon: Gift },
  { id: 'profile', label: 'Settings', icon: Settings },
];

export function DashboardSidebar({
  isOpen,
  onClose,
  activeTab,
  onTabChange,
}: DashboardSidebarProps) {
  const [planInfo, setPlanInfo] = useState({ name: 'Loading...', expiry: null });

  const fetchPlanInfo = () => {
    fetchJson('/get_profile').then(data => {
      if (data && data.plan_name) {
        setPlanInfo({ name: data.plan_name, expiry: data.plan_expiry });
      }
    }).catch(() => setPlanInfo({ name: 'Free', expiry: null }));
  };

  useEffect(() => {
    fetchPlanInfo();

    // Listen for plan updates from Profile component
    window.addEventListener('plan-updated', fetchPlanInfo);

    return () => {
      window.removeEventListener('plan-updated', fetchPlanInfo);
    };
  }, []);
  const handleTabClick = (tabId: string) => {
    onTabChange(tabId);
    onClose();
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-16 z-40 h-[calc(100vh-4rem)] w-64 border-r border-border bg-card transition-transform duration-300 md:relative md:top-0 md:h-full md:translate-x-0 flex flex-col",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Mobile close button */}
        <div className="flex items-center justify-between p-4 md:hidden border-b border-border">
          <span className="font-semibold">Menu</span>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-1 p-4 flex-1 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleTabClick(item.id)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                activeTab === item.id
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </button>
          ))}
        </nav>

        {/* Bottom section - Moved up below info */}
        <div className="border-t border-border p-3 mt-auto">
          <div className="rounded-lg bg-secondary/50 p-3">
            <p className="text-xs font-medium text-muted-foreground">Current Plan</p>
            <p className="text-sm font-semibold text-primary">{planInfo.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">Expires: {planInfo.expiry ? new Date(planInfo.expiry).toLocaleDateString() : 'N/A'}</p>
          </div>
        </div>
      </aside>
    </>
  );
}
