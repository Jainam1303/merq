"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchJson } from "@/lib/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";

export default function UserDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [trades, setTrades] = useState<any[]>([]);
    const [stats, setStats] = useState<any>({});
    const [payments, setPayments] = useState<any[]>([]);
    const [notes, setNotes] = useState<any[]>([]);
    const [newNote, setNewNote] = useState("");
    const [loading, setLoading] = useState(true);

    const loadUser = async () => {
        try {
            const res = await fetchJson(`/api/admin/users/${id}`);
            setUser(res.user);
            setTrades(res.trades);
            setStats(res.trade_stats);
            setPayments(res.payments);
            setNotes(res.notes);
        } catch (e: any) {
            toast.error("Failed to load user");
            router.push('/admin/users');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadUser(); }, [id]);

    const addNote = async () => {
        if (!newNote.trim()) return;
        try {
            const res = await fetchJson(`/api/admin/users/${id}/notes`, {
                method: 'POST',
                body: JSON.stringify({ note: newNote })
            });
            setNotes([res.note, ...notes]);
            setNewNote("");
            toast.success("Note added");
        } catch (e: any) {
            toast.error(e.message);
        }
    };

    const handleResetPassword = async () => {
        const newPass = prompt("Enter new password (min 6 chars):");
        if (!newPass) return;
        if (newPass.length < 6) return toast.error("Too short");

        try {
            await fetchJson(`/api/admin/users/${id}/reset-password`, {
                method: 'POST',
                body: JSON.stringify({ new_password: newPass })
            });
            toast.success("Password reset successfully");
        } catch (e: any) {
            toast.error(e.message);
        }
    };

    if (loading) return <div>Loading...</div>;
    if (!user) return <div>User not found</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Avatar className="h-16 w-16">
                        <AvatarFallback className="text-xl font-bold bg-primary text-primary-foreground">
                            {user.username.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">{user.username}</h1>
                        <p className="text-muted-foreground">{user.email}</p>
                        {user.client_id && (
                            <p className="text-xs font-mono text-muted-foreground mt-1">
                                Client ID: <span className="font-semibold text-foreground">{user.client_id}</span>
                            </p>
                        )}
                    </div>
                </div>
                <div className="space-x-2">
                    <Button variant="outline" onClick={handleResetPassword}>Reset Password</Button>
                    <Button variant="destructive" onClick={() => {
                        if (confirm("Delete user? This is irreversible.")) {
                            fetchJson(`/api/admin/users/${id}`, { method: 'DELETE' }).then(() => {
                                toast.success("User deleted");
                                router.push('/admin/users');
                            }).catch(e => toast.error(e.message));
                        }
                    }}>Delete User</Button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="uppercase text-xs font-bold text-muted-foreground pb-2">Plan</CardHeader>
                    <CardContent className="text-2xl font-bold flex items-center gap-2">
                        {(() => {
                            const subs = user.Subscriptions || [];
                            // Sort: paid plans first (price DESC), then by newest
                            const sorted = [...subs].sort((a: any, b: any) => {
                                const priceA = parseFloat(a.Plan?.price) || 0;
                                const priceB = parseFloat(b.Plan?.price) || 0;
                                if (priceB !== priceA) return priceB - priceA;
                                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                            });
                            const best = sorted[0];
                            return best?.Plan?.display_name || best?.Plan?.name || "Free";
                        })()}
                        <Badge variant={user.is_active ? "default" : "destructive"}>
                            {user.is_active ? "Active" : "Banned"}
                        </Badge>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="uppercase text-xs font-bold text-muted-foreground pb-2">Total P&L</CardHeader>
                    <CardContent className={`text-2xl font-bold ${stats.total_pnl >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        ₹{stats.total_pnl?.toFixed(2)}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="uppercase text-xs font-bold text-muted-foreground pb-2">Win Rate</CardHeader>
                    <CardContent className="text-2xl font-bold">
                        {stats.total_trades > 0 ? ((stats.winning_trades / stats.total_trades) * 100).toFixed(1) : 0}%
                    </CardContent>
                    <CardFooter className="text-xs text-muted-foreground pt-0 pb-2">
                        {stats.winning_trades}W / {stats.losing_trades}L
                    </CardFooter>
                </Card>
                <Card>
                    <CardHeader className="uppercase text-xs font-bold text-muted-foreground pb-2">API Key</CardHeader>
                    <CardContent className="text-2xl font-bold">
                        {user.angel_api_key ? <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500">Connected</Badge> : <Badge variant="outline">Missing</Badge>}
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="trades" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="trades">Recent Trades</TabsTrigger>
                    <TabsTrigger value="payments">Billing History</TabsTrigger>
                    <TabsTrigger value="notes">Admin Notes</TabsTrigger>
                    <TabsTrigger value="raw">Raw Data</TabsTrigger>
                </TabsList>

                <TabsContent value="trades">
                    <Card>
                        <CardHeader>
                            <CardTitle>Trade History</CardTitle>
                            <CardDescription>Last 50 trades executed by this user.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Time</TableHead>
                                        <TableHead>Symbol</TableHead>
                                        <TableHead>Side</TableHead>
                                        <TableHead>Qty</TableHead>
                                        <TableHead>Entry</TableHead>
                                        <TableHead>Exit</TableHead>
                                        <TableHead>P&L</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {trades.map((t) => (
                                        <TableRow key={t.id} className={t.is_simulated ? "bg-muted/30" : ""}>
                                            <TableCell className="font-mono text-xs text-muted-foreground">
                                                {new Date(t.createdAt).toLocaleString()}
                                            </TableCell>
                                            <TableCell className="font-bold">{t.symbol}</TableCell>
                                            <TableCell>
                                                <Badge variant={t.mode === 'BUY' ? 'default' : 'destructive'} className="text-xs scale-90">
                                                    {t.mode}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{t.quantity}</TableCell>
                                            <TableCell>{t.entry_price}</TableCell>
                                            <TableCell>{t.exit_price || '-'}</TableCell>
                                            <TableCell className={t.pnl >= 0 ? "text-emerald-500 font-bold" : "text-red-500 font-bold"}>
                                                {t.pnl?.toFixed(2)}
                                            </TableCell>
                                            <TableCell>{t.status}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="payments">
                    <Card>
                        <CardHeader>
                            <CardTitle>Payment History</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Plan</TableHead>
                                        <TableHead>Amount</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Order ID</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {payments.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center">No payments found</TableCell></TableRow> :
                                        payments.map((p) => (
                                            <TableRow key={p.id}>
                                                <TableCell>{new Date(p.createdAt).toLocaleDateString()}</TableCell>
                                                <TableCell>{p.Plan?.name}</TableCell>
                                                <TableCell>₹{p.amount}</TableCell>
                                                <TableCell><Badge variant="outline" className="text-emerald-500 border-emerald-500">Paid</Badge></TableCell>
                                                <TableCell className="font-mono text-xs">{p.razorpay_order_id}</TableCell>
                                            </TableRow>
                                        ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="notes">
                    <Card>
                        <CardHeader>
                            <CardTitle>Internal Notes</CardTitle>
                            <CardDescription>Only visible to admins.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex gap-2">
                                <Textarea
                                    placeholder="Add a note (e.g. User requested refund, VIP status...)"
                                    value={newNote}
                                    onChange={(e) => setNewNote(e.target.value)}
                                />
                                <Button onClick={addNote} className="h-auto">Add Note</Button>
                            </div>
                            <ScrollArea className="h-[300px]">
                                {notes.map((note) => (
                                    <div key={note.id} className="mb-4 p-4 border rounded-lg bg-card/50">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="font-bold text-sm">{note.author?.username || 'Admin'}</span>
                                            <span className="text-xs text-muted-foreground">{new Date(note.createdAt).toLocaleString()}</span>
                                        </div>
                                        <p className="text-sm whitespace-pre-wrap">{note.note}</p>
                                    </div>
                                ))}
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="raw">
                    <Card>
                        <CardContent className="p-4">
                            <pre className="text-xs bg-muted p-4 rounded overflow-auto h-[400px]">
                                {JSON.stringify(user, null, 2)}
                            </pre>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
