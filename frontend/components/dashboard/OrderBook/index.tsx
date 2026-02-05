"use client";
import { useState, useEffect, useRef } from "react";
import { Download, Upload, Trash2, Search, Filter, ChevronLeft, ChevronRight, Calendar as CalendarIcon, FileUp, FileDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { fetchJson } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Trade {
  id: string;
  date: string;
  time: string;
  symbol: string;
  type: string;
  qty: number;
  entry: number;
  tp: number;
  sl: number;
  exit: number;
  pnl: number;
  status: string;
}

export function OrderBook() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [selectedTrades, setSelectedTrades] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // File Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Handle CSV Import/Upload
  const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error("Please upload a CSV file");
      return;
    }

    setIsUploading(true);
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());

      if (lines.length < 2) {
        toast.error("CSV file is empty or has no data rows");
        return;
      }

      // Parse header to find column indices
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

      // Expected columns (case-insensitive)
      const dateIdx = headers.findIndex(h => h.includes('date'));
      const timeIdx = headers.findIndex(h => h.includes('time'));
      const symbolIdx = headers.findIndex(h => h.includes('symbol'));
      const typeIdx = headers.findIndex(h => h.includes('type') || h.includes('mode'));
      const qtyIdx = headers.findIndex(h => h.includes('qty') || h.includes('quantity'));
      const entryIdx = headers.findIndex(h => h.includes('entry') || h.includes('price'));
      const tpIdx = headers.findIndex(h => h.includes('tp') || h.includes('target'));
      const slIdx = headers.findIndex(h => h.includes('sl') || h.includes('stop'));
      const exitIdx = headers.findIndex(h => h.includes('exit'));
      const pnlIdx = headers.findIndex(h => h.includes('pnl') || h.includes('p&l'));
      const statusIdx = headers.findIndex(h => h.includes('status'));

      // Validate required columns
      if (symbolIdx === -1) {
        toast.error("CSV must contain a 'Symbol' column");
        return;
      }

      // Parse data rows
      const trades = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        if (values.length < 2) continue;

        trades.push({
          date: dateIdx !== -1 ? values[dateIdx] : new Date().toISOString().split('T')[0],
          time: timeIdx !== -1 ? values[timeIdx] : new Date().toTimeString().split(' ')[0],
          symbol: values[symbolIdx],
          type: typeIdx !== -1 ? values[typeIdx].toUpperCase() : 'BUY',
          qty: qtyIdx !== -1 ? parseInt(values[qtyIdx]) || 1 : 1,
          entry: entryIdx !== -1 ? parseFloat(values[entryIdx]) || 0 : 0,
          tp: tpIdx !== -1 ? parseFloat(values[tpIdx]) || 0 : 0,
          sl: slIdx !== -1 ? parseFloat(values[slIdx]) || 0 : 0,
          exit: exitIdx !== -1 ? parseFloat(values[exitIdx]) || 0 : 0,
          pnl: pnlIdx !== -1 ? parseFloat(values[pnlIdx]) || 0 : 0,
          status: statusIdx !== -1 ? values[statusIdx] : 'Completed'
        });
      }

      if (trades.length === 0) {
        toast.error("No valid trades found in CSV");
        return;
      }

      // Send to backend
      const res = await fetchJson('/import_orderbook', {
        method: 'POST',
        body: JSON.stringify({ trades })
      });

      if (res.status === 'success') {
        toast.success(`Successfully imported ${res.imported || trades.length} trades`);
        fetchOrders(); // Refresh the order book
      } else {
        toast.error(res.message || "Failed to import trades");
      }
    } catch (e) {
      console.error("Import CSV error:", e);
      toast.error("Failed to parse CSV file");
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Download sample CSV template
  const downloadSampleCSV = () => {
    const headers = 'Date,Time,Symbol,Type,Qty,Entry,TP,SL,Exit,PnL,Status';
    const sampleData = [
      '2024-01-15,09:30:00,RELIANCE-EQ,BUY,10,2450.50,2480.00,2440.00,2475.25,247.50,Completed',
      '2024-01-15,10:15:00,SBIN-EQ,SELL,20,625.00,615.00,630.00,618.50,130.00,Completed',
    ];

    const csvContent = [headers, ...sampleData].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'orderbook_template.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Sample CSV template downloaded");
  };

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      // Build query parameters
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', format(startDate, 'yyyy-MM-dd'));
      if (endDate) params.append('endDate', format(endDate, 'yyyy-MM-dd'));

      const url = `/orderbook${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await fetchJson(url);
      if (res.status === 'success') {
        const mapped = res.data.map((t: any) => {
          let exitPrice = 0;
          if (t.status === 'COMPLETED' || t.status === 'CLOSED_SL' || t.status === 'CLOSED_TP' || t.status === 'CLOSED_MANUAL' || t.pnl !== 0) {
            const pnl = parseFloat(t.pnl || 0);
            const qty = parseInt(t.quantity || t.qty || 1);
            const entry = parseFloat(t.entry_price || t.entry || 0);
            if (t.mode === 'BUY' || t.type === 'BUY') exitPrice = entry + (pnl / qty);
            else exitPrice = entry - (pnl / qty);
          } else if (t.exit) {
            exitPrice = parseFloat(t.exit);
          }

          // Use direct date and time fields from API
          const dateStr = t.date || '';
          const timeStr = t.time || '';

          return {
            id: String(t.id),
            date: dateStr,
            time: timeStr,
            symbol: t.symbol,
            type: t.mode || t.type,
            qty: parseInt(t.quantity || t.qty || 0),
            entry: parseFloat(t.entry_price || t.entry || 0),
            tp: parseFloat(t.tp || 0),
            sl: parseFloat(t.sl || 0),
            exit: exitPrice,
            pnl: parseFloat(t.pnl || 0),
            status: t.status === 'COMPLETED' ? 'Completed' :
              t.status === 'CANCELLED' ? 'Cancelled' :
                t.status === 'CLOSED_SL' ? 'CLOSED_SL' :
                  t.status === 'CLOSED_TP' ? 'CLOSED_TP' :
                    t.status === 'CLOSED_MANUAL' ? 'CLOSED_MANUAL' : t.status
          };
        });
        setTrades(mapped);
      }
    } catch (e) {
      console.error("Failed to fetch orders", e);
      toast.error("Failed to fetch order book");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [startDate, endDate]);

  const filteredTrades = trades.filter(trade => {
    const matchesSearch = trade.symbol.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || trade.type === typeFilter;
    return matchesSearch && matchesType;
  });

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, typeFilter, startDate, endDate]);

  // Pagination Logic
  const totalItems = filteredTrades.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedTrades = filteredTrades.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const toggleSelectAll = () => {
    if (selectedTrades.length === filteredTrades.length) {
      setSelectedTrades([]);
    } else {
      setSelectedTrades(filteredTrades.map(t => t.id));
    }
  };

  const toggleSelect = (id: string) => {
    if (selectedTrades.includes(id)) {
      setSelectedTrades(selectedTrades.filter(t => t !== id));
    } else {
      setSelectedTrades([...selectedTrades, id]);
    }
  };

  const deleteSelected = async () => {
    try {
      const res = await fetchJson('/delete_orders', {
        method: 'POST',
        body: JSON.stringify({ order_ids: selectedTrades })
      });
      if (res.status === 'success') {
        toast.success(`Deleted ${selectedTrades.length} orders`);
        setTrades(trades.filter(t => !selectedTrades.includes(t.id)));
        setSelectedTrades([]);
      } else {
        toast.error("Failed to delete orders");
      }
    } catch (e) {
      toast.error("Failed to delete orders");
    }
  };

  const exportToCSV = () => {
    if (filteredTrades.length === 0) {
      toast.error("No trades to export");
      return;
    }

    const headers = ['Date', 'Time', 'Symbol', 'Type', 'Qty', 'Entry', 'TP', 'SL', 'Exit', 'P&L', 'Status'];
    const rows = filteredTrades.map(t => [
      t.date, t.time, `"${t.symbol}"`, t.type, t.qty, t.entry, t.tp, t.sl, t.exit, t.pnl, t.status
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orderbook_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filteredTrades.length} trades to CSV`);
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="border-border bg-card">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-1 flex-col gap-4 md:flex-row md:items-center">
              {/* Search */}
              <div className="relative flex-1 md:max-w-xs">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by symbol..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Type Filter */}
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="BUY">BUY</SelectItem>
                  <SelectItem value="SELL">SELL</SelectItem>
                </SelectContent>
              </Select>

              {/* Date Filters */}
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-[240px] justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "dd-MM-yyyy") : <span>Start Date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                      captionLayout="dropdown-buttons"
                      fromYear={2020}
                      toYear={new Date().getFullYear() + 5}
                    />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-[240px] justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "dd-MM-yyyy") : <span>End Date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                      captionLayout="dropdown-buttons"
                      fromYear={2020}
                      toYear={new Date().getFullYear() + 5}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Delete Actions */}
            <div className="flex items-center gap-2">
              {selectedTrades.length > 0 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete ({selectedTrades.length})
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete selected trades?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete {selectedTrades.length} selected trade(s).
                        This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={deleteSelected}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trade Table */}
      <Card className="border-border bg-card">
        <CardHeader className="flex flex-row items-center justify-between py-4">
          <CardTitle className="text-lg">Trade History</CardTitle>
          <div className="flex items-center gap-2">
            {/* Hidden file input for CSV import */}
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv"
              onChange={handleImportCSV}
              className="hidden"
            />

            {/* Sample Template Download */}
            <Button
              variant="ghost"
              size="sm"
              onClick={downloadSampleCSV}
              className="text-muted-foreground hover:text-foreground gap-2"
            >
              <FileDown className="h-4 w-4" />
              Sample
            </Button>

            {/* Import CSV Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              {isUploading ? 'Importing...' : 'Import CSV'}
            </Button>

            {/* Export CSV Button */}
            <Button variant="outline" size="sm" onClick={exportToCSV} className="gap-2">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedTrades.length === filteredTrades.length && filteredTrades.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="text-muted-foreground">Date</TableHead>
                  <TableHead className="text-muted-foreground">Time</TableHead>
                  <TableHead className="text-muted-foreground">Symbol</TableHead>
                  <TableHead className="text-muted-foreground">Type</TableHead>
                  <TableHead className="text-right text-muted-foreground">Qty</TableHead>
                  <TableHead className="text-right text-muted-foreground">Entry</TableHead>
                  <TableHead className="text-right text-muted-foreground">TP</TableHead>
                  <TableHead className="text-right text-muted-foreground">SL</TableHead>
                  <TableHead className="text-right text-muted-foreground">Exit</TableHead>
                  <TableHead className="text-right text-muted-foreground">P&L</TableHead>
                  <TableHead className="text-muted-foreground">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={12} className="py-8 text-center text-muted-foreground">Loading...</TableCell>
                  </TableRow>
                ) : paginatedTrades.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="py-8 text-center text-muted-foreground">
                      No trades found
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedTrades.map((trade) => (
                    <TableRow key={trade.id} className="border-border">
                      <TableCell>
                        <Checkbox
                          checked={selectedTrades.includes(trade.id)}
                          onCheckedChange={() => toggleSelect(trade.id)}
                        />
                      </TableCell>
                      <TableCell className="text-muted-foreground">{trade.date}</TableCell>
                      <TableCell className="font-mono text-sm">{trade.time}</TableCell>
                      <TableCell className="font-medium">{trade.symbol}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            trade.type === 'BUY'
                              ? "border-profit/50 bg-profit/10 text-profit"
                              : "border-loss/50 bg-loss/10 text-loss"
                          )}
                        >
                          {trade.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{trade.qty}</TableCell>
                      <TableCell className="text-right font-mono">₹{trade.entry.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono text-profit">₹{trade.tp.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono text-loss">₹{trade.sl.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono">
                        {trade.exit > 0 ? `₹${trade.exit.toFixed(2)}` : '-'}
                      </TableCell>
                      <TableCell className={cn(
                        "text-right font-mono font-medium",
                        trade.pnl > 0 ? "text-profit" : trade.pnl < 0 ? "text-loss" : "text-muted-foreground"
                      )}>
                        {trade.pnl !== 0 ? (
                          <>
                            {trade.pnl > 0 ? '+' : ''}₹{trade.pnl.toFixed(2)}
                          </>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            trade.status === 'Completed' && "border-profit/50 text-profit",
                            trade.status === 'Cancelled' && "border-loss/50 text-loss",
                            trade.status === 'Pending' && "border-warning/50 text-warning"
                          )}
                        >
                          {trade.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between px-4 py-4 border-t">
            <div className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} entries
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
