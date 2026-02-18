"use client";
import { useState, useEffect, useCallback } from "react";
import { fetchJson } from "@/lib/api";
import {
    TrendingUp, TrendingDown, Star, Rocket, Trophy, Clock,
    BarChart3, Target, ArrowUpRight, ArrowDownRight, Loader2,
    ChevronDown, ChevronUp, Zap, Shield, Activity
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ========================================
// Types
// ========================================
interface EquityPoint {
    date: string;
    equity: number;
}

interface StarPerformerData {
    id: number;
    symbol: string;
    exchange: string;
    strategy: string;
    strategy_label: string;
    timeframe: string;
    total_return_pct: number;
    total_return_inr: number;
    starting_capital: number;
    ending_capital: number;
    total_trades: number;
    winning_trades: number;
    losing_trades: number;
    win_rate: number;
    max_drawdown_pct: number;
    equity_curve: EquityPoint[];
    deploy_config: any;
    from_date: string;
    to_date: string;
    last_computed: string;
    updatedAt: string;
}

// ========================================
// Mini Sparkline Component
// ========================================
function Sparkline({ data, positive }: { data: EquityPoint[]; positive: boolean }) {
    if (!data || data.length < 2) return null;

    const values = data.map(d => d.equity);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const width = 120;
    const height = 40;
    const padding = 2;

    const points = values.map((v, i) => {
        const x = padding + (i / (values.length - 1)) * (width - 2 * padding);
        const y = height - padding - ((v - min) / range) * (height - 2 * padding);
        return `${x},${y}`;
    }).join(' ');

    const color = positive ? '#22c55e' : '#ef4444';
    const gradientId = `spark-${Math.random().toString(36).slice(2)}`;

    // Build fill area
    const firstX = padding;
    const lastX = padding + ((values.length - 1) / (values.length - 1)) * (width - 2 * padding);
    const fillPoints = `${firstX},${height} ${points} ${lastX},${height}`;

    return (
        <svg width={width} height={height} className="overflow-visible">
            <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                    <stop offset="100%" stopColor={color} stopOpacity="0.02" />
                </linearGradient>
            </defs>
            <polygon points={fillPoints} fill={`url(#${gradientId})`} />
            <polyline
                fill="none"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={points}
            />
        </svg>
    );
}

// ========================================
// Equity Chart Full Component
// ========================================
function EquityChart({ data, symbol }: { data: EquityPoint[]; symbol: string }) {
    if (!data || data.length < 2) return <div className="text-sm text-muted-foreground text-center p-4">No equity data available</div>;

    const values = data.map(d => d.equity);
    const min = Math.min(...values) * 0.998;
    const max = Math.max(...values) * 1.002;
    const range = max - min || 1;

    const width = 800;
    const height = 300;
    const padL = 70;
    const padR = 20;
    const padT = 20;
    const padB = 40;
    const chartW = width - padL - padR;
    const chartH = height - padT - padB;

    const startVal = data[0]?.equity || 100000;
    const endVal = data[data.length - 1]?.equity || 100000;
    const positive = endVal >= startVal;
    const color = positive ? '#22c55e' : '#ef4444';

    const points = values.map((v, i) => {
        const x = padL + (i / (values.length - 1)) * chartW;
        const y = padT + chartH - ((v - min) / range) * chartH;
        return `${x},${y}`;
    }).join(' ');

    const fillPoints = `${padL},${padT + chartH} ${points} ${padL + chartW},${padT + chartH}`;

    // Y-axis grid lines
    const ySteps = 5;
    const yLines = Array.from({ length: ySteps + 1 }, (_, i) => {
        const val = min + (range * i) / ySteps;
        const y = padT + chartH - (i / ySteps) * chartH;
        return { val, y };
    });

    // X-axis labels (show ~5 dates)
    const xLabels = data.filter((_, i) => {
        if (data.length <= 5) return true;
        const step = Math.floor(data.length / 5);
        return i % step === 0 || i === data.length - 1;
    }).map((d, _, arr) => {
        const idx = data.indexOf(d);
        const x = padL + (idx / (data.length - 1)) * chartW;
        return { label: d.date === 'Start' ? 'Start' : d.date.slice(5), x };
    });

    const gradientId = `equity-grad-${symbol}`;

    return (
        <div className="w-full overflow-x-auto">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ minWidth: 400 }}>
                <defs>
                    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity="0.2" />
                        <stop offset="100%" stopColor={color} stopOpacity="0.01" />
                    </linearGradient>
                </defs>

                {/* Grid */}
                {yLines.map((yl, i) => (
                    <g key={i}>
                        <line x1={padL} y1={yl.y} x2={padL + chartW} y2={yl.y} stroke="hsl(var(--border))" strokeWidth="0.5" strokeDasharray="4 4" />
                        <text x={padL - 8} y={yl.y + 4} textAnchor="end" fill="hsl(var(--muted-foreground))" fontSize="11" fontFamily="monospace">
                            ₹{Math.round(yl.val).toLocaleString('en-IN')}
                        </text>
                    </g>
                ))}

                {/* X labels */}
                {xLabels.map((xl, i) => (
                    <text key={i} x={xl.x} y={height - 8} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="10">
                        {xl.label}
                    </text>
                ))}

                {/* Fill */}
                <polygon points={fillPoints} fill={`url(#${gradientId})`} />

                {/* Line */}
                <polyline
                    fill="none"
                    stroke={color}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={points}
                />

                {/* Start / End dots */}
                {values.length > 0 && (
                    <>
                        <circle cx={padL} cy={padT + chartH - ((values[0] - min) / range) * chartH} r="4" fill={color} />
                        <circle cx={padL + chartW} cy={padT + chartH - ((values[values.length - 1] - min) / range) * chartH} r="5" fill={color} stroke="white" strokeWidth="2" />
                    </>
                )}
            </svg>
        </div>
    );
}

// ========================================
// Performance Card
// ========================================
function PerformanceCard({
    data,
    rank,
    onDeploy,
    expanded,
    onToggle
}: {
    data: StarPerformerData;
    rank: number;
    onDeploy: (config: any) => void;
    expanded: boolean;
    onToggle: () => void;
}) {
    const positive = data.total_return_pct >= 0;
    const rankEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '';

    return (
        <Card className={cn(
            "transition-all duration-300 hover:shadow-lg border",
            rank <= 3 && "ring-1",
            rank === 1 && "ring-yellow-500/30",
            rank === 2 && "ring-gray-400/30",
            rank === 3 && "ring-amber-600/30",
        )}>
            <CardContent className="p-0">
                {/* Header section */}
                <div className="p-4 pb-3">
                    <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                            {rankEmoji && <span className="text-xl">{rankEmoji}</span>}
                            <div>
                                <h3 className="font-bold text-lg leading-tight">{data.symbol}</h3>
                                <p className="text-xs text-muted-foreground">{data.exchange} • {data.strategy_label}</p>
                            </div>
                        </div>
                        <div className={cn("text-right", positive ? "text-green-500" : "text-red-500")}>
                            <div className="flex items-center gap-1 justify-end">
                                {positive ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                                <span className="text-2xl font-bold">{positive ? '+' : ''}{data.total_return_pct}%</span>
                            </div>
                            <p className="text-xs font-mono opacity-80">
                                {positive ? '+' : ''}₹{data.total_return_inr.toLocaleString('en-IN')}
                            </p>
                        </div>
                    </div>

                    {/* Metrics row */}
                    <div className="grid grid-cols-3 gap-2 mb-3">
                        <div className="bg-secondary/50 rounded-lg p-2 text-center">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Win Rate</p>
                            <p className={cn("text-sm font-bold", data.win_rate >= 50 ? "text-green-500" : "text-red-500")}>
                                {data.win_rate}%
                            </p>
                        </div>
                        <div className="bg-secondary/50 rounded-lg p-2 text-center">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Trades</p>
                            <p className="text-sm font-bold">{data.total_trades}</p>
                        </div>
                        <div className="bg-secondary/50 rounded-lg p-2 text-center">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Drawdown</p>
                            <p className="text-sm font-bold text-orange-500">{data.max_drawdown_pct}%</p>
                        </div>
                    </div>

                    {/* Mini sparkline */}
                    <div className="flex items-center justify-between mb-3">
                        <div className="text-xs text-muted-foreground font-mono">
                            ₹{data.starting_capital.toLocaleString('en-IN')} → ₹{data.ending_capital.toLocaleString('en-IN')}
                        </div>
                        <Sparkline data={data.equity_curve} positive={positive} />
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2">
                        <Button
                            size="sm"
                            className="flex-1 gap-1.5"
                            onClick={() => onDeploy(data.deploy_config)}
                        >
                            <Rocket className="h-3.5 w-3.5" />
                            Deploy This
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onToggle}
                            className="gap-1"
                        >
                            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                            {expanded ? 'Less' : 'Chart'}
                        </Button>
                    </div>
                </div>

                {/* Expanded section: Full equity chart */}
                {expanded && (
                    <div className="border-t border-border p-4 bg-secondary/20">
                        <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                            <Activity className="h-4 w-4" />
                            Equity Curve (₹1,00,000 Capital)
                        </h4>
                        <EquityChart data={data.equity_curve} symbol={data.symbol} />
                        <div className="grid grid-cols-2 gap-3 mt-3">
                            <div className="text-xs">
                                <span className="text-muted-foreground">Period: </span>
                                <span className="font-mono">{data.from_date?.split(' ')[0]} → {data.to_date?.split(' ')[0]}</span>
                            </div>
                            <div className="text-xs text-right">
                                <span className="text-muted-foreground">W/L: </span>
                                <span className="text-green-500 font-bold">{data.winning_trades}W</span>
                                {' / '}
                                <span className="text-red-500 font-bold">{data.losing_trades}L</span>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// ========================================
// Main Star Performers Component
// ========================================
export function StarPerformers() {
    const [performers, setPerformers] = useState<StarPerformerData[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTimeframe, setActiveTimeframe] = useState('30d');
    const [sortBy, setSortBy] = useState('return');
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [lastUpdated, setLastUpdated] = useState<string | null>(null);

    const timeframeTabs = [
        { key: '7d', label: '7 Days', icon: '⚡' },
        { key: '30d', label: '30 Days', icon: '📅' },
        { key: '90d', label: '90 Days', icon: '📊' },
        { key: '120d', label: '120 Days', icon: '🏆' },
    ];

    const sortOptions = [
        { key: 'return', label: 'Best Return' },
        { key: 'win_rate', label: 'Win Rate' },
        { key: 'trades', label: 'Most Trades' },
        { key: 'drawdown', label: 'Least Risk' },
    ];

    const fetchPerformers = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetchJson(`/star-performers?timeframe=${activeTimeframe}&sort=${sortBy}`);
            if (res.status === 'success') {
                setPerformers(res.data || []);
                setLastUpdated(res.last_updated);
            }
        } catch (e) {
            console.error('Failed to fetch star performers:', e);
        } finally {
            setLoading(false);
        }
    }, [activeTimeframe, sortBy]);

    useEffect(() => {
        fetchPerformers();
    }, [fetchPerformers]);

    const handleDeploy = (config: any) => {
        // Navigate to dashboard with pre-filled config
        // Store config in sessionStorage for the dashboard to pick up
        sessionStorage.setItem('deploy_config', JSON.stringify(config));
        window.location.href = '/dashboard?tab=live-trading&deploy=true';
    };

    // Summary Stats
    const totalPositive = performers.filter(p => p.total_return_pct > 0).length;
    const avgReturn = performers.length > 0
        ? performers.reduce((sum, p) => sum + p.total_return_pct, 0) / performers.length
        : 0;
    const bestPerformer = performers[0];

    return (
        <div className="space-y-6">
            {/* Hero Header */}
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-6">
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg bg-primary/10">
                            <Star className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">Star Performers</h1>
                            <p className="text-sm text-muted-foreground">Auto-backtested results • Updated daily</p>
                        </div>
                    </div>

                    <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
                        Discover top-performing stocks, auto-backtested with our MerQ Alpha strategies.
                        See real results with ₹1,00,000 starting capital and deploy winning strategies with one click.
                    </p>

                    {lastUpdated && (
                        <div className="flex items-center gap-1.5 mt-3 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            Last updated: {new Date(lastUpdated).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                        </div>
                    )}
                </div>

                {/* Decorative background elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-primary/3 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
            </div>

            {/* Summary Stats Bar */}
            {performers.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Card className="p-3">
                        <div className="flex items-center gap-2">
                            <Trophy className="h-4 w-4 text-yellow-500" />
                            <div>
                                <p className="text-[10px] text-muted-foreground uppercase">Best Return</p>
                                <p className={cn("text-lg font-bold", (bestPerformer?.total_return_pct ?? 0) >= 0 ? "text-green-500" : "text-red-500")}>
                                    {bestPerformer ? `${bestPerformer.total_return_pct >= 0 ? '+' : ''}${bestPerformer.total_return_pct}%` : '-'}
                                </p>
                            </div>
                        </div>
                    </Card>
                    <Card className="p-3">
                        <div className="flex items-center gap-2">
                            <Target className="h-4 w-4 text-blue-500" />
                            <div>
                                <p className="text-[10px] text-muted-foreground uppercase">Avg Return</p>
                                <p className={cn("text-lg font-bold", avgReturn >= 0 ? "text-green-500" : "text-red-500")}>
                                    {avgReturn >= 0 ? '+' : ''}{avgReturn.toFixed(2)}%
                                </p>
                            </div>
                        </div>
                    </Card>
                    <Card className="p-3">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-green-500" />
                            <div>
                                <p className="text-[10px] text-muted-foreground uppercase">Profitable</p>
                                <p className="text-lg font-bold">{totalPositive}/{performers.length}</p>
                            </div>
                        </div>
                    </Card>
                    <Card className="p-3">
                        <div className="flex items-center gap-2">
                            <BarChart3 className="h-4 w-4 text-purple-500" />
                            <div>
                                <p className="text-[10px] text-muted-foreground uppercase">Stocks Tested</p>
                                <p className="text-lg font-bold">{performers.length}</p>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* Timeframe Tabs + Sort */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <div className="flex gap-1 bg-secondary/50 p-1 rounded-lg">
                    {timeframeTabs.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTimeframe(tab.key)}
                            className={cn(
                                "px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                                activeTimeframe === tab.key
                                    ? "bg-primary text-primary-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                            )}
                        >
                            <span className="mr-1">{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="flex gap-1 bg-secondary/50 p-1 rounded-lg">
                    {sortOptions.map(opt => (
                        <button
                            key={opt.key}
                            onClick={() => setSortBy(opt.key)}
                            className={cn(
                                "px-2.5 py-1.5 rounded-md text-xs font-medium transition-all",
                                sortBy === opt.key
                                    ? "bg-foreground/10 text-foreground"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Loading State */}
            {loading && (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                    <Loader2 className="h-8 w-8 animate-spin mb-3" />
                    <p className="text-sm">Loading star performers...</p>
                </div>
            )}

            {/* Empty State */}
            {!loading && performers.length === 0 && (
                <Card className="p-12 text-center">
                    <Star className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                    <h3 className="text-lg font-semibold mb-2">No Results Yet</h3>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto">
                        Star Performers are computed automatically. Results will appear here once the backtesting engine
                        has processed the data for the <strong>{activeTimeframe}</strong> timeframe.
                    </p>
                    <div className="mt-4 p-3 rounded-lg bg-secondary/50 inline-block text-xs text-muted-foreground font-mono">
                        Run: <code>node cron_backtest.js --quick</code> to generate results
                    </div>
                </Card>
            )}

            {/* Performance Cards Grouped by Strategy */}
            {!loading && performers.length > 0 && (
                <div className="space-y-10">
                    {Object.entries(performers.reduce((acc, p) => {
                        const strat = p.strategy_label || 'Unknown Strategy';
                        if (!acc[strat]) acc[strat] = [];
                        acc[strat].push(p);
                        return acc;
                    }, {} as Record<string, StarPerformerData[]>)).map(([strategyName, strategyPerformers]) => (
                        <div key={strategyName} className="space-y-4">
                            <div className="flex items-center gap-2 border-b border-border pb-2">
                                <Zap className="h-5 w-5 text-yellow-500" />
                                <h2 className="text-xl font-bold">{strategyName}</h2>
                                <Badge variant="secondary" className="ml-2 text-xs">
                                    {strategyPerformers.length} Stocks
                                </Badge>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                {strategyPerformers.map((performer, index) => (
                                    <PerformanceCard
                                        key={performer.id}
                                        data={performer}
                                        rank={index + 1}
                                        onDeploy={handleDeploy}
                                        expanded={expandedId === performer.id}
                                        onToggle={() => setExpandedId(expandedId === performer.id ? null : performer.id)}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Disclaimer */}
            <div className="text-center p-4 rounded-lg bg-secondary/30 border border-border">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                    <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                    <p className="text-xs font-medium text-muted-foreground">Important Disclaimer</p>
                </div>
                <p className="text-[11px] text-muted-foreground max-w-2xl mx-auto">
                    Past performance is not indicative of future results. These backtested results are based on historical data
                    and simulated conditions. Actual trading results may vary significantly. Always do your own research before deploying any strategy.
                </p>
            </div>
        </div>
    );
}
