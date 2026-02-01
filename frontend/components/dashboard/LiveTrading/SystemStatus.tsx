import { Power } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface SystemStatusProps {
  isActive: boolean;
  onToggle: () => void;
}

export function SystemStatus({ isActive, onToggle }: SystemStatusProps) {
  return (
    <Card className="border-border bg-card">
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex items-center gap-4">
          <div className={cn(
            "flex h-12 w-12 items-center justify-center rounded-full transition-colors",
            isActive ? "bg-profit/20" : "bg-muted"
          )}>
            <Power className={cn(
              "h-6 w-6 transition-colors",
              isActive ? "text-profit" : "text-muted-foreground"
            )} />
          </div>
          <div>
            <h3 className="text-lg font-semibold">System Status</h3>
            <p className={cn(
              "text-sm",
              isActive ? "text-profit" : "text-muted-foreground"
            )}>
              {isActive ? "Trading engine is running" : "Trading engine is stopped"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className={cn(
            "text-sm font-medium",
            isActive ? "text-profit" : "text-muted-foreground"
          )}>
            {isActive ? "ON" : "OFF"}
          </span>
          <Switch
            checked={isActive}
            onCheckedChange={onToggle}
            className="data-[state=checked]:bg-profit"
          />
          {isActive && (
            <span className="h-3 w-3 rounded-full bg-profit pulse-live" />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
