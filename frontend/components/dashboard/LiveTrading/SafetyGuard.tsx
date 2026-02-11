import { useState, useEffect, useRef } from "react";
import { Shield } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { fetchJson } from "@/lib/api"; // Assuming api util exists from other files

export function SafetyGuard() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [maxLoss, setMaxLoss] = useState('5000');
  const [loading, setLoading] = useState(false);
  const isInteractingRef = useRef(false);

  // Fetch initial state
  useEffect(() => {
    async function loadConfig() {
      // Don't update if user is actively interacting
      if (isInteractingRef.current) return;

      try {
        const config = await fetchJson('/config');
        if (config) {
          // Only update if values actually changed to prevent unnecessary re-renders
          if (config.safety_guard_enabled !== undefined && config.safety_guard_enabled !== isEnabled) {
            setIsEnabled(config.safety_guard_enabled);
          }
          if (config.max_daily_loss !== undefined && String(config.max_daily_loss) !== maxLoss) {
            setMaxLoss(String(config.max_daily_loss));
          }
        }
      } catch (e) {
        console.error("Failed to load safety guard config", e);
      }
    }
    loadConfig();

    // Poll every 3 seconds to keep state in sync
    const interval = setInterval(loadConfig, 3000);
    return () => clearInterval(interval);
  }, [isEnabled, maxLoss]);

  // Sync to Backend
  const handleToggle = async (enabled: boolean) => {
    isInteractingRef.current = true;
    setIsEnabled(enabled);
    await saveConfig(enabled, maxLoss);
    // Allow polling to resume after a short delay
    setTimeout(() => {
      isInteractingRef.current = false;
    }, 1000);
  };

  const handleMaxLossChange = (value: string) => {
    isInteractingRef.current = true;
    setMaxLoss(value);
  };

  const handleBlur = async () => {
    await saveConfig(isEnabled, maxLoss);
    // Allow polling to resume after save completes
    setTimeout(() => {
      isInteractingRef.current = false;
    }, 500);
  }

  const saveConfig = async (enabled: boolean, loss: string) => {
    setLoading(true);
    try {
      await fetchJson('/update_safety_guard', {
        method: 'POST',
        body: JSON.stringify({ enabled, max_loss: loss })
      });
    } catch (e) {
      console.error("Failed to update safety guard", e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className={cn(
      "border-border bg-card",
      isEnabled && "border-warning/50"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg",
              isEnabled ? "bg-warning/20" : "bg-muted"
            )}>
              <Shield className={cn(
                "h-5 w-5",
                isEnabled ? "text-warning" : "text-muted-foreground"
              )} />
            </div>
            <div>
              <h3 className="font-semibold">Safety Guard</h3>
              <p className="text-sm text-muted-foreground">
                Auto-stop when daily loss limit is reached
              </p>
            </div>
          </div>
          <Switch
            checked={isEnabled}
            onCheckedChange={handleToggle}
            className="data-[state=checked]:bg-warning"
          />
        </div>

        <div className="mt-4 flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Max Daily Loss:</span>
          <div className="relative w-32">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₹</span>
            <Input
              type="number"
              value={maxLoss}
              onChange={(e) => handleMaxLossChange(e.target.value)}
              onBlur={handleBlur}
              disabled={isEnabled} // DISABLED WHEN ON
              className={cn(
                "h-8 pl-7 text-sm",
                isEnabled && "opacity-50 cursor-not-allowed bg-muted"
              )}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
