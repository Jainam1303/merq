"use client";
import React, { useRef, useEffect } from 'react';
import { AlertCircle, CheckCircle, Info, AlertTriangle, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LogEntry {
    id: string;
    timestamp: string;
    type: 'info' | 'success' | 'warning' | 'error';
    message: string;
}

interface MobileLogsViewProps {
    logs: LogEntry[];
    onClear?: () => void;
}

export function MobileLogsView({ logs, onClear }: MobileLogsViewProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when new logs arrive
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs.length]);

    const getLogIcon = (type: LogEntry['type']) => {
        switch (type) {
            case 'error': return <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />;
            case 'warning': return <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />;
            case 'success': return <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />;
            default: return <Info className="w-4 h-4 text-blue-500 shrink-0" />;
        }
    };

    const getLogBgClass = (type: LogEntry['type']) => {
        switch (type) {
            case 'error': return 'bg-red-50 dark:bg-red-900/10 border-l-red-500';
            case 'warning': return 'bg-amber-50 dark:bg-amber-900/10 border-l-amber-500';
            case 'success': return 'bg-emerald-50 dark:bg-emerald-900/10 border-l-emerald-500';
            default: return 'bg-zinc-50 dark:bg-zinc-800/50 border-l-blue-500';
        }
    };

    if (logs.length === 0) {
        return (
            <div className="min-h-[calc(100vh-180px)] flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
                    <Info className="w-8 h-8 text-zinc-400" />
                </div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">No Logs Yet</h3>
                <p className="text-sm text-zinc-500">
                    System logs will appear here when the engine is running.
                </p>
            </div>
        );
    }

    return (
        <div className="min-h-[calc(100vh-180px)] max-h-[calc(100vh-180px)] flex flex-col">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-zinc-50/95 dark:bg-zinc-950/95 backdrop-blur-sm px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                <div>
                    <div className="font-bold text-zinc-900 dark:text-white">System Logs</div>
                    <div className="text-xs text-zinc-500">{logs.length} entries</div>
                </div>
                {onClear && (
                    <button
                        onClick={onClear}
                        className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                    >
                        <Trash2 size={18} />
                    </button>
                )}
            </div>

            {/* Logs List */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-2 pb-24"
            >
                {logs.map((log) => (
                    <div
                        key={log.id}
                        className={cn(
                            "p-3 rounded-lg border-l-4 transition-all",
                            getLogBgClass(log.type)
                        )}
                    >
                        <div className="flex items-start gap-2">
                            {getLogIcon(log.type)}
                            <div className="flex-1 min-w-0">
                                <div className="text-[10px] text-zinc-500 mb-0.5 font-mono">
                                    {log.timestamp}
                                </div>
                                <div className="text-sm text-zinc-800 dark:text-zinc-200 break-words">
                                    {log.message}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
