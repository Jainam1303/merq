import { TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface LivePnLCardProps {
  pnl: number;
  percentChange: number;
}

export function LivePnLCard({ pnl, percentChange }: LivePnLCardProps) {
  const isPositive = pnl >= 0;

  return (
    <Card className="border-border bg-card">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Live P&L</p>
            <p className={cn(
              "text-3xl font-bold",
              isPositive ? "text-profit" : "text-loss"
            )}>
              {isPositive ? '+' : ''}₹{Math.abs(pnl).toLocaleString()}
            </p>
            <div className={cn(
              "mt-1 flex items-center gap-1 text-sm",
              isPositive ? "text-profit" : "text-loss"
            )}>
              {isPositive ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              <span>{isPositive ? '+' : ''}{percentChange.toFixed(2)}%</span>
            </div>
          </div>

          {/* Mini sparkline chart simulation */}
          <div className="flex h-12 items-end gap-0.5">
            {[40, 65, 55, 75, 60, 80, 70, 90, 85].map((height, i) => (
              <div
                key={i}
                className={cn(
                  "w-1.5 rounded-sm",
                  isPositive ? "bg-profit" : "bg-loss"
                )}
                style={{
                  height: `${height}%`,
                  opacity: 0.3 + (i * 0.08)
                }}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
