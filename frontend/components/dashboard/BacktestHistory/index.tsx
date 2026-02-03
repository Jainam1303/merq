"use client";
import { useState, useEffect } from "react";
import { fetchJson } from "@/lib/api";
import { Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

export function BacktestHistory() {
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = async () => {
        try {
            const res = await fetchJson('/backtest_history');
            if (res.status === 'success' && Array.isArray(res.data)) {
                setHistory(res.data);
            } else {
                setHistory([]);
            }
        } catch (e) {
            console.error(e);
            setHistory([]);
        } finally { setLoading(false); }
    };

    const handleDelete = async (id: number) => {
        try {
            console.log("Deleting backtest result:", id);
            await fetchJson(`/backtest_history/${id}`, { method: 'DELETE' });
            setHistory(prev => prev.filter(h => h.id !== id));
            toast.success("Backtest deleted successfully");
        } catch (e) {
            console.error("Delete failed:", e);
            toast.error("Failed to delete result. Check console.");
        }
    };

    const totalItems = history.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const paginatedHistory = history.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <Card>
            <CardHeader><CardTitle>Backtest History and Saved Results</CardTitle></CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Interval</TableHead>
                            <TableHead>Strategy</TableHead>
                            <TableHead className="text-right">Trades</TableHead>
                            <TableHead className="text-right">Win Rate</TableHead>
                            <TableHead className="text-right">P&L</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedHistory.map((h) => (
                            <TableRow key={h.id}>
                                <TableCell>{new Date(h.createdAt).toLocaleDateString()}</TableCell>
                                <TableCell>{h.interval}</TableCell>
                                <TableCell>{h.strategy || 'N/A'}</TableCell>
                                <TableCell className="text-right">{h.summary?.totalTrades || 0}</TableCell>
                                <TableCell className="text-right">{parseFloat(h.summary?.winRate || 0).toFixed(1)}%</TableCell>
                                <TableCell className={`text-right font-bold ${(h.summary?.totalPnL || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                    {(h.summary?.totalPnL || 0) >= 0 ? '+' : ''}₹{parseFloat(h.summary?.totalPnL || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(h.id)}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {history.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-4">No backtests found</TableCell></TableRow>}
                    </TableBody>
                </Table>

                {/* Pagination */}
                {totalItems > 0 && (
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
                )}
            </CardContent>
        </Card>
    );
}
