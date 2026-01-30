"use client";
import { useState, useEffect } from "react";
import { Download, Trash2, Search, Filter, ChevronLeft, ChevronRight, Calendar } from "lucide-react";
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
import { fetchJson } from "@/lib/api";
import { cn } from "@/lib/utils";

// Define Trade interface locally or import if available
interface Trade {
  id: string;
  date: string;
  time: string;
  symbol: string;
  type: string;
  qty: number;
  entry: number;
  exit: number;
  pnl: number;
  status: string;
}

export function OrderBook() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [selectedTrades, setSelectedTrades] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      // Build query parameters
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const url = `/orderbook${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await fetchJson(url);
      if (res.status === 'success') {
        const mapped = res.data.map((t: any) => {
          let exitPrice = 0;
          if (t.status === 'COMPLETED' || t.pnl !== 0) {
            const pnl = parseFloat(t.pnl || 0);
            const qty = parseInt(t.quantity || 1);
            const entry = parseFloat(t.entry_price || 0);
            if (t.mode === 'BUY') exitPrice = entry + (pnl / qty);
            else exitPrice = entry - (pnl / qty);
          }

          return {
            id: String(t.id),
            date: t.timestamp ? t.timestamp.split(' ')[0] : '',
            time: t.timestamp ? t.timestamp.split(' ')[1] : '',
            symbol: t.symbol,
            type: t.mode,
            qty: t.quantity,
            entry: parseFloat(t.entry_price || 0),
            exit: exitPrice,
            pnl: parseFloat(t.pnl || 0),
            status: t.status === 'COMPLETED' ? 'Completed' : t.status === 'CANCELLED' ? 'Cancelled' : t.status
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
    const matchesStatus = statusFilter === 'all' || trade.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, typeFilter, statusFilter, startDate, endDate]);

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
    const headers = ['Date', 'Time', 'Symbol', 'Type', 'Qty', 'Entry', 'Exit', 'P&L', 'Status'];
    const rows = filteredTrades.map(t => [
      t.date, t.time, t.symbol, t.type, t.qty, t.entry, t.exit, t.pnl, t.status
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'order_book.csv';
    a.click();
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

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                </SelectContent>
              </Select>

              {/* Date Range Filters */}
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-40"
                placeholder="Start Date"
              />


              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-40"
                placeholder="End Date"
              />
            </div>

            {/* Actions */}
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
              <Button variant="outline" size="sm" onClick={exportToCSV}>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trade Table */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-lg">Trade History</CardTitle>
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
                  <TableHead className="text-right text-muted-foreground">Exit</TableHead>
                  <TableHead className="text-right text-muted-foreground">P&L</TableHead>
                  <TableHead className="text-muted-foreground">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="py-8 text-center text-muted-foreground">Loading...</TableCell>
                  </TableRow>
                ) : paginatedTrades.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="py-8 text-center text-muted-foreground">
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
