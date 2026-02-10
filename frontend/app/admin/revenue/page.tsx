"use client";

import { useEffect, useState } from "react";
import { fetchJson } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DollarSign, CreditCard } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function RevenuePage() {
    const [revenue, setRevenue] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchJson('/api/admin/revenue')
            .then(setRevenue)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div>Loading revenue data...</div>;

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Revenue Analytics</h1>

            {revenue?.today && (
                <div className="grid gap-4 md:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Today</CardTitle>
                            <DollarSign className="h-4 w-4 text-emerald-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">₹{revenue.today.total}</div>
                            <p className="text-xs text-muted-foreground">{revenue.today.count} transactions</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">This Week</CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">₹{revenue.week.total}</div>
                            <p className="text-xs text-muted-foreground">{revenue.week.count} transactions</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">This Month</CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">₹{revenue.month.total}</div>
                            <p className="text-xs text-muted-foreground">{revenue.month.count} transactions</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">All Time</CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">₹{revenue.all_time.total}</div>
                            <p className="text-xs text-muted-foreground">{revenue.all_time.count} transactions</p>
                        </CardContent>
                    </Card>
                </div>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Recent Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>User</TableHead>
                                <TableHead>Plan</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>ID</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {revenue?.recent_payments?.length === 0 ? (
                                <TableRow><TableCell colSpan={6} className="text-center">No transactions found</TableCell></TableRow>
                            ) : (
                                revenue?.recent_payments?.map((p: any) => (
                                    <TableRow key={p.id}>
                                        <TableCell>{new Date(p.createdAt).toLocaleDateString()}</TableCell>
                                        <TableCell>{p.User?.username}</TableCell>
                                        <TableCell>{p.Plan?.display_name || p.Plan?.name}</TableCell>
                                        <TableCell>₹{p.amount}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="text-emerald-500 border-emerald-500">Success</Badge>
                                        </TableCell>
                                        <TableCell className="font-mono text-xs text-muted-foreground">{p.razorpay_payment_id}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
