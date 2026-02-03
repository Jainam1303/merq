import { useState } from "react";
import { Terminal, ChevronDown, ChevronUp, Pause, Play, AlertCircle, CheckCircle, AlertTriangle, Info } from "lucide-react";
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

  const getLogIcon = (type: LogEntry['type']) => {
    switch (type) {
      case 'success': return <CheckCircle className="h-3.5 w-3.5 text-profit shrink-0 mt-0.5" />;
      case 'error': return <AlertCircle className="h-3.5 w-3.5 text-loss shrink-0 mt-0.5" />;
      case 'warning': return <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0 mt-0.5" />;
      default: return <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />;
    }
  };

  return (
    <Card className="border-border bg-card">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <Terminal className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-lg">System Logs</CardTitle>
          <span className="text-xs text-muted-foreground">
            ({logs.length})
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10"
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
            className="h-10 w-10"
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
          <div className="scrollbar-thin max-h-48 md:max-h-64 overflow-y-auto rounded-lg bg-secondary/50 p-3 space-y-1">
            {logs.length === 0 ? (
              <div className="text-muted-foreground text-center py-4">No logs yet...</div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="flex gap-2 py-1 border-b border-border/30 last:border-0">
                  {/* Icon */}
                  {getLogIcon(log.type)}

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Mobile: Stack timestamp and message */}
                    <div className="md:hidden">
                      <span className="text-[10px] text-muted-foreground font-mono block mb-0.5">
                        {log.timestamp}
                      </span>
                      <span className={cn("text-xs break-words", getLogColor(log.type))}>
                        {log.message}
                      </span>
                    </div>

                    {/* Desktop: Inline */}
                    <div className="hidden md:flex gap-3 font-mono text-xs">
                      <span className="text-muted-foreground shrink-0">[{log.timestamp}]</span>
                      <span className={cn("break-words", getLogColor(log.type))}>{log.message}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

