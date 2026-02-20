import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X, Search, Upload, Plus, Loader2, ChevronDown, Trash2, Download } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { stockOptions, timeframeOptions } from "@/data/mockData";
import { cn } from "@/lib/utils";
import { fetchJson } from "@/lib/api";

// Strategy Definitions - MerQ Alpha I-V + TEST
const strategyOptions = [
  { value: 'ORB', label: 'MerQ Alpha I', description: 'Opening Range Breakout (9:15-9:30)' },
  { value: 'EMA', label: 'MerQ Alpha II', description: 'EMA 8/30 Crossover Strategy' },
  { value: 'PULLBACK', label: 'MerQ Alpha III', description: 'EMA Pullback Trend Strategy' },
  { value: 'ENGULFING', label: 'MerQ Alpha IV', description: 'Bullish/Bearish Engulfing Pattern' },
  { value: 'TIMEBASED', label: 'MerQ Alpha V', description: 'Fixed Time Entry (10AM, 2PM)' },
  { value: 'VWAPFAILURE', label: 'MerQ Alpha VI', description: 'Enhanced EMA Pullback (9/21/50)' },
  { value: 'TEST', label: 'TEST Mode', description: 'Immediate BUY for testing orders' },
];
import { toast } from "sonner";

export interface ConfigData {
  symbols: string[];
  strategy: string;
  interval: string;
  startTime: string;
  stopTime: string;
  signalCutoffTime: string;
  capital: string;
}

interface StrategyConfigProps {
  config: ConfigData;
  onConfigChange: (newConfig: ConfigData) => void;
  disabled?: boolean;
}

export function StrategyConfig({ config, onConfigChange, disabled = false }: StrategyConfigProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [savedStocks, setSavedStocks] = useState<string[]>([]);
  const [stocklistFilter, setStocklistFilter] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchJson('/symbols').then(res => setSavedStocks(res || [])).catch(console.error);
  }, []);

  // Debounced Search
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchTerm.length >= 2) {
        setIsSearching(true);
        try {
          const results = await fetchJson(`/search_scrip?q=${encodeURIComponent(searchTerm)}`);
          if (Array.isArray(results)) {
            setSearchResults(results.slice(0, 10)); // Limit to 10
          }
        } catch (e) {
          console.error("Search failed", e);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const handleStockToggle = (stock: string) => {
    if (config.symbols.includes(stock)) {
      onConfigChange({ ...config, symbols: config.symbols.filter(s => s !== stock) });
    } else {
      onConfigChange({ ...config, symbols: [...config.symbols, stock] });
    }
  };

  const removeStock = (stock: string) => {
    onConfigChange({ ...config, symbols: config.symbols.filter(s => s !== stock) });
  };

  const handleAddSearchResult = (symbol: string) => {
    // Backend search returns { symbol: 'TCS-EQ', token: '...', exchange: 'NSE' } usually
    // But we just need symbol name if backend handles token lookup on start, OR we need to add token to backend too?
    // app.py search_scrip returns list of dicts.
    // let's assume we just add the symbol string.
    // If backend requires token, we might need a separate 'add_token' call or LiveTrading handles it.
    // app.py has /add_token. But /start just takes symbols list.
    // Probably strat engine looks up token.

    const cleanSymbol = symbol.replace('-EQ', ''); // Cleanup if needed or keep full
    if (!config.symbols.includes(cleanSymbol)) {
      onConfigChange({ ...config, symbols: [...config.symbols, cleanSymbol] });
      setSearchTerm("");
      setSearchResults([]);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      // Parse CSV: split by new lines or commas, trim, filter empty
      const symbols = text
        .split(/[\n,]+/)
        .map(s => s.trim().toUpperCase())
        .filter(s => s && s.length > 2); // basic validation

      if (symbols.length > 0) {
        // Merge with existing unique
        const newSymbols = Array.from(new Set([...config.symbols, ...symbols]));
        onConfigChange({ ...config, symbols: newSymbols });
        toast.success(`Imported ${symbols.length} symbols`);
      } else {
        toast.error("No valid symbols found in CSV");
      }

      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    reader.readAsText(file);
  };

  return (
    <Card className="border-border bg-card">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-lg">Strategy Configuration</CardTitle>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-2"
            onClick={() => {
              const csvContent = "RELIANCE\nTCS\nINFY\nHDFCBANK";
              const blob = new Blob([csvContent], { type: 'text/csv' });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'sample_stocks.csv';
              a.click();
              window.URL.revokeObjectURL(url);
            }}
            disabled={disabled}
          >
            <Download className="h-4 w-4" />
            Sample CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Stock Universe */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Stock Universe</Label>

          {/* Search Bar + Actions */}
          {/* Search Bar + Actions */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search Stocks (e.g. RELIANCE)..."
                className="pl-9 min-h-[44px]"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  if (e.target.value.trim().length > 0) setShowDropdown(true);
                }}
                onFocus={() => { if (searchTerm.trim().length > 0) setShowDropdown(true); }}
                onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                disabled={disabled}
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
              )}

              {/* Unified Search Results Dropdown */}
              {showDropdown && searchTerm.trim().length > 0 && (
                <div className="absolute z-50 mt-1 max-h-80 w-full overflow-auto rounded-md border border-border bg-popover p-1 shadow-md">
                  {/* Local/Saved Matches */}
                  {(() => {
                    const localMatches = savedStocks.filter(s =>
                      !searchTerm || s.toLowerCase().includes(searchTerm.toLowerCase())
                    );

                    const showLocal = localMatches.length > 0;
                    const showApi = searchResults.length > 0;

                    if (!showLocal && !showApi && searchTerm.length >= 2 && !isSearching) {
                      return <div className="p-3 text-sm text-center text-muted-foreground">No stocks found</div>;
                    }

                    // Remove duplicates from API if they exist in Local
                    const localSet = new Set(localMatches.map(s => s));
                    const uniqueApiResults = searchResults.filter(r => !localSet.has(r.symbol));

                    return (
                      <>
                        {/* My Stocklist Section */}
                        {showLocal && (
                          <div className="mb-1">
                            <div className="px-2 py-1 text-xs font-semibold text-muted-foreground bg-accent/50">My Stocklist</div>
                            {localMatches.slice(0, 50).map((stock) => (
                              <div
                                key={`local-${stock}`}
                                className="flex cursor-pointer items-center justify-between rounded-sm px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                                onClick={() => {
                                  handleAddSearchResult(stock);
                                }}
                              >
                                <span className="font-medium">{stock}</span>
                                <span className="text-xs text-muted-foreground">Saved</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Global Search Section */}
                        {uniqueApiResults.length > 0 && (
                          <div>
                            <div className="px-2 py-1 text-xs font-semibold text-muted-foreground bg-accent/50">Global Search</div>
                            {uniqueApiResults.map((res: any, i) => (
                              <div
                                key={`api-${i}`}
                                className="flex cursor-pointer items-center justify-between rounded-sm px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                                onClick={() => handleAddSearchResult(res.symbol)}
                              >
                                <span className="font-medium">{res.symbol}</span>
                                <span className="text-xs text-muted-foreground">{res.exchange || 'NSE'}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Action Buttons Row */}
            <div className="flex gap-2 shrink-0">
              {/* Stocklist Button REMOVED - merged into search */}

              {/* Import CSV Button */}
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                disabled={disabled}
              />
              <Button
                variant="outline"
                className="h-11 gap-2"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled}
                title="Import CSV"
              >
                <Upload className="h-4 w-4" />
                <span className="hidden sm:inline">Import CSV</span>
              </Button>

              {/* Clear All Button */}
              <Button
                variant="outline"
                size="icon"
                className="h-11 w-11 shrink-0 text-destructive hover:text-destructive"
                onClick={() => onConfigChange({ ...config, symbols: [] })}
                disabled={disabled || config.symbols.length === 0}
                title="Clear All"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Selected Stocks Badge List */}
          <div className="flex flex-wrap gap-2">
            {config.symbols.map(stock => (
              <Badge
                key={stock}
                variant="secondary"
                className="gap-1 bg-primary/10 text-primary hover:bg-primary/20"
              >
                {stock}
                {!disabled && (
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => removeStock(stock)}
                  />
                )}
              </Badge>
            ))}
            {config.symbols.length === 0 && (
              <span className="text-sm text-muted-foreground">No stocks selected</span>
            )}
          </div>


        </div>

        {/* Strategy Selector */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Strategy</Label>
          <div className="grid grid-cols-2 gap-2">
            {strategyOptions.map(strategy => (
              <button
                key={strategy.value}
                onClick={() => !disabled && onConfigChange({ ...config, strategy: strategy.value })}
                disabled={disabled}
                className={cn(
                  "rounded-lg border p-3 text-left transition-colors",
                  config.strategy === strategy.value
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50",
                  disabled && "opacity-50 cursor-not-allowed hover:border-border"
                )}
              >
                <p className="font-medium">{strategy.label}</p>
                <p className="text-xs text-muted-foreground">{strategy.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Timeframe, Time Range, Signal Cutoff, and Capital - Responsive Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
          {/* Timeframe */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Timeframe</Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild disabled={disabled}>
                <Button variant="outline" className="w-full justify-between">
                  {timeframeOptions.find(tf => tf.value === config.interval)?.label || 'Select'}
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[150px] z-[100]">
                {timeframeOptions.map(tf => (
                  <DropdownMenuItem
                    key={tf.value}
                    onClick={() => onConfigChange({ ...config, interval: tf.value })}
                    className="cursor-pointer"
                  >
                    {tf.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Start Time */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Start Time</Label>
            <Input
              type="time"
              value={config.startTime}
              disabled={disabled}
              onChange={(e) => onConfigChange({ ...config, startTime: e.target.value })}
            />
          </div>

          {/* End Time */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">End Time</Label>
            <Input
              type="time"
              value={config.stopTime}
              disabled={disabled}
              onChange={(e) => onConfigChange({ ...config, stopTime: e.target.value })}
            />
          </div>

          {/* Signal Cutoff Time */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />
              Signal Cutoff
            </Label>
            <Input
              type="time"
              value={config.signalCutoffTime}
              disabled={disabled}
              onChange={(e) => onConfigChange({ ...config, signalCutoffTime: e.target.value })}
              className="border-amber-500/30 focus:border-amber-500 focus:ring-amber-500/20"
            />
          </div>

          {/* Initial Capital */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Initial Capital</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
              <Input
                type="text"
                value={config.capital}
                disabled={disabled}
                onChange={(e) => onConfigChange({ ...config, capital: e.target.value })}
                className="pl-7"
              />
            </div>
          </div>
        </div>

        {/* Auto Square-Off & Signal Cutoff Notice */}
        <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
          <p className="text-xs text-amber-400 leading-relaxed">
            <span className="font-semibold">⚠️ Important:</span> All active positions will be auto squared off at <span className="font-bold">3:05 PM</span> if not squared off by the Algo or User manually. After <span className="font-bold">3:15 PM</span>, the Broker will square off remaining positions between <span className="font-bold">3:15 PM - 3:30 PM</span>.
          </p>
          <p className="text-xs text-amber-400/80 leading-relaxed mt-1">
            <span className="font-semibold">🔶 Signal Cutoff:</span> The algo will <span className="font-bold">stop finding new signals</span> after the Signal Cutoff time, but existing open positions will continue to be monitored for TP/SL until squared off.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
