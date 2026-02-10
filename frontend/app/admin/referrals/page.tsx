"use client";

import { useState, useEffect } from "react";
import { fetchJson } from "@/lib/api";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Gift,
    Users,
    IndianRupee,
    Clock,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    TrendingUp,
    Loader2,
} from "lucide-react";

interface Summary {
    total_earnings: number;
    pending_earnings: number;
    paid_earnings: number;
    total_referrers: number;
    commission_rate: number;
}

interface Earning {
    id: number;
    payment_amount: number;
    commission_rate: number;
    commission_amount: number;
    status: string;
    createdAt: string;
    paid_at: string | null;
    notes: string | null;
    referrer: { id: number; username: string; email: string };
    referred: { id: number; username: string; email: string };
}

export default function AdminReferralsPage() {
    const [earnings, setEarnings] = useState<Earning[]>([]);
    const [summary, setSummary] = useState<Summary | null>(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [statusFilter, setStatusFilter] = useState("all");

    useEffect(() => {
        loadData();
    }, [page, statusFilter]);

    const loadData = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: String(page), limit: '20' });
            if (statusFilter !== 'all') params.append('status', statusFilter);

            const res = await fetchJson(`/api/admin/referrals?${params.toString()}`);
            setEarnings(res.earnings || []);
            setSummary(res.summary || null);
            setTotal(res.total || 0);
            setPages(res.pages || 1);
        } catch (e) {
            console.error('Failed to load referral data:', e);
            toast.error('Failed to load referral data');
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (id: number, newStatus: string) => {
        try {
            await fetchJson(`/api/admin/referrals/${id}/status`, {
                method: 'PUT',
                body: JSON.stringify({ status: newStatus }),
            });
            toast.success(`Status updated to ${newStatus}`);
            loadData();
        } catch (e: any) {
            toast.error(e.message || 'Failed to update status');
        }
    };

    const statusBadge = (status: string) => {
        switch (status) {
            case 'pending': return <Badge variant="outline" className="text-yellow-500 border-yellow-500/30">Pending</Badge>;
            case 'approved': return <Badge variant="outline" className="text-blue-500 border-blue-500/30">Approved</Badge>;
            case 'paid': return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Paid</Badge>;
            case 'rejected': return <Badge variant="destructive">Rejected</Badge>;
            default: return <Badge variant="outline">{status}</Badge>;
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                    <Gift className="h-8 w-8 text-primary" />
                    Referral Program
                </h1>
                <p className="text-muted-foreground mt-1">Manage referral commissions and payouts</p>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-blue-500/10 p-2">
                                <Users className="h-5 w-5 text-blue-500" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Active Referrers</p>
                                <p className="text-2xl font-bold">{summary?.total_referrers || 0}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-primary/10 p-2">
                                <IndianRupee className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Total Commissions</p>
                                <p className="text-2xl font-bold">₹{summary?.total_earnings?.toFixed(2) || '0.00'}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-yellow-500/10 p-2">
                                <Clock className="h-5 w-5 text-yellow-500" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Pending Payouts</p>
                                <p className="text-2xl font-bold">₹{summary?.pending_earnings?.toFixed(2) || '0.00'}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-emerald-500/10 p-2">
                                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Total Paid Out</p>
                                <p className="text-2xl font-bold">₹{summary?.paid_earnings?.toFixed(2) || '0.00'}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Commission Rate Info */}
            <Card>
                <CardContent className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Current Commission Rate:</span>
                        <span className="font-bold text-primary">{summary?.commission_rate || 5}%</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Set via <code className="bg-secondary px-1.5 py-0.5 rounded">REFERRAL_COMMISSION_RATE</code> env variable
                    </p>
                </CardContent>
            </Card>

            {/* Earnings Table */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-base">All Referral Commissions</CardTitle>
                        <CardDescription>{total} total records</CardDescription>
                    </div>
                    <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filter by status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="approved">Approved</SelectItem>
                            <SelectItem value="paid">Paid</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                    </Select>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : earnings.length === 0 ? (
                        <div className="flex flex-col items-center py-12 text-muted-foreground">
                            <Gift className="h-12 w-12 mb-3 opacity-30" />
                            <p className="text-sm">No referral commissions found</p>
                        </div>
                    ) : (
                        <>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Referrer</TableHead>
                                        <TableHead>Referred User</TableHead>
                                        <TableHead>Plan Amt</TableHead>
                                        <TableHead>Rate</TableHead>
                                        <TableHead>Commission</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {earnings.map((e) => (
                                        <TableRow key={e.id}>
                                            <TableCell className="text-muted-foreground text-sm">
                                                {new Date(e.createdAt).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className="font-medium">{e.referrer?.username || '-'}</TableCell>
                                            <TableCell>{e.referred?.username || '-'}</TableCell>
                                            <TableCell className="font-mono">₹{Number(e.payment_amount).toFixed(2)}</TableCell>
                                            <TableCell>{e.commission_rate}%</TableCell>
                                            <TableCell className="font-mono font-semibold text-emerald-500">
                                                ₹{Number(e.commission_amount).toFixed(2)}
                                            </TableCell>
                                            <TableCell>{statusBadge(e.status)}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex gap-1 justify-end">
                                                    {e.status === 'pending' && (
                                                        <>
                                                            <Button size="sm" variant="outline" className="text-xs h-7"
                                                                onClick={() => updateStatus(e.id, 'approved')}>
                                                                Approve
                                                            </Button>
                                                            <Button size="sm" variant="outline" className="text-xs h-7 text-red-500"
                                                                onClick={() => updateStatus(e.id, 'rejected')}>
                                                                Reject
                                                            </Button>
                                                        </>
                                                    )}
                                                    {e.status === 'approved' && (
                                                        <Button size="sm" className="text-xs h-7 bg-emerald-600 hover:bg-emerald-700"
                                                            onClick={() => updateStatus(e.id, 'paid')}>
                                                            Mark Paid
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>

                            {/* Pagination */}
                            {pages > 1 && (
                                <div className="flex items-center justify-between mt-4">
                                    <p className="text-sm text-muted-foreground">
                                        Page {page} of {pages}
                                    </p>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" disabled={page <= 1}
                                            onClick={() => setPage(p => p - 1)}>
                                            <ChevronLeft className="h-4 w-4" />
                                        </Button>
                                        <Button variant="outline" size="sm" disabled={page >= pages}
                                            onClick={() => setPage(p => p + 1)}>
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
