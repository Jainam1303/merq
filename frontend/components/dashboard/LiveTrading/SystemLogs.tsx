import { useState } from "react";
import { Terminal, ChevronDown, ChevronUp, Pause, Play } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogEntry } from "@/data/mockData";
import { cn } from "@/lib/utils";

interface SystemLogsProps {
  logs: LogEntry[];
}

export function SystemLogs({ logs = [] }: SystemLogsProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'success': return 'text-profit';
      case 'error': return 'text-loss';
      case 'warning': return 'text-warning';
      default: return 'text-muted-foreground';
    }
  };

  // If paused, we could technically freeze the displayed logs, but for simplicity
  // we will just display what is passed. 
  // TODO: Implement actual pause functionality if needed by maintaining local frozen state.

  return (
    <Card className="border-border bg-card">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <Terminal className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-lg">System Logs</CardTitle>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsPaused(!isPaused)}
          >
            {isPaused ? (
              <Play className="h-4 w-4" />
            ) : (
              <Pause className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0">
          <div className="scrollbar-thin max-h-48 overflow-y-auto rounded-lg bg-secondary/50 p-3 font-mono text-xs">
            {logs.length === 0 ? (
              <div className="text-muted-foreground text-center py-2">No logs yet...</div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="flex gap-3 py-0.5">
                  <span className="text-muted-foreground">[{log.timestamp}]</span>
                  <span className={getLogColor(log.type)}>{log.message}</span>
                </div>
              ))
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
