
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { fetchJson } from "@/lib/api";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
    Users,
    Activity,
    DollarSign,
    Search,
    LogOut,
    Shield,
    Calendar as CalendarIcon,
    AlertTriangle,
    Terminal,
    Key,
    Edit,
    Wifi,
    Trash2,
    Plus
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";

// --- TYPES ---
interface User {
    id: number;
    username: string;
    email: string;
    plan: string;
    plan_id: number;
    is_admin: boolean;
    is_active: boolean;
    bot_status: string;
    has_api_key: boolean;
}

interface Trade {
    id: number;
    username: string;
    symbol: string;
    type: string;
    mode: string;
    qty: number;
    entry_price: number;
    pnl: number;
    status: string;
    time: string;
    is_simulated: boolean;
}

interface Plan {
    id: number;
    name: string;
    price: number;
    duration: string;
}

interface Connectivity {
    status: string;
    latency: number;
}

export default function AdminPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState({
        total_users: 0,
        active_bots_live: 0,
        active_bots_paper: 0,
        global_pnl: 0
    });
    const [users, setUsers] = useState<User[]>([]);
    const [trades, setTrades] = useState<Trade[]>([]);
    const [plans, setPlans] = useState<Plan[]>([]);
    const [connectivity, setConnectivity] = useState<Connectivity>({ status: 'Unknown', latency: 0 });
    const [tradeDate, setTradeDate] = useState(new Date().toISOString().split('T')[0]); // YYYY-MM-DD
    const [searchQuery, setSearchQuery] = useState("");
    const [logs, setLogs] = useState<string[]>([]);

    // Dialog States
    const [isPlanDialogOpen, setIsPlanDialogOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [selectedPlanId, setSelectedPlanId] = useState<string>("");
    const [planDuration, setPlanDuration] = useState("30");

    // Create Plan Dialog
    const [isCreatePlanOpen, setIsCreatePlanOpen] = useState(false);
    const [newPlan, setNewPlan] = useState({ name: "", price: "", duration: "30", features: "" });

    // --- AUTH & INIT ---
    useEffect(() => {
        const checkAuth = async () => {
            try {
                const res = await fetchJson('/check_auth');
                if (!res.authenticated || !res.is_admin) {
                    toast.error("Access Denied: Admin privileges required.");
                    router.push('/dashboard');
                    return;
                }
                loadData();
                loadPlans();
            } catch (e) {
                console.error(e);
                router.push('/');
            } finally {
                setIsLoading(false);
            }
        };
        checkAuth();
    }, [router]);

    const loadData = async () => {
        try {
            const statsData = await fetchJson('/admin/stats');
            setStats(statsData);

            const usersData = await fetchJson('/admin/users');
            setUsers(usersData);

            loadTrades(tradeDate);
            checkConnectivity();
        } catch (e) {
            toast.error("Failed to load admin data");
        }
    };

    const loadTrades = async (date: string) => {
        try {
            const res = await fetchJson(`/admin/trades?date=${date}`);
            setTrades(res.trades);
        } catch (e) {
            toast.error("Failed to load trades");
        }
    };

    const loadPlans = async () => {
        try {
            const res = await fetchJson('/admin/plans');
            setPlans(res); // Note: server returns simplified list, need full list maybe? using same endpoint?
            // Actually /admin/plans returns simplified list in app.py. Need update if we want price.
            // Using /plans (public) for full details? 
            const publicPlans = await fetchJson('/plans');
            setPlans(publicPlans);
        } catch (e) { }
    }

    const loadLogs = async () => {
        try {
            const res = await fetchJson('/admin/logs/error');
            setLogs(res.logs || []);
        } catch (e) { toast.error("Failed to fetch logs"); }
    }

    const checkConnectivity = async () => {
        try {
            const res = await fetchJson('/admin/connectivity');
            setConnectivity(res);
        } catch (e) { }
    }

    // --- ACTIONS ---
    const toggleUserStatus = async (userId: number, currentStatus: boolean, username: string) => {
        if (!confirm(`Are you sure you want to ${currentStatus ? 'BAN' : 'ACTIVATE'} user ${username}?`)) return;

        try {
            const res = await fetchJson(`/admin/user/${userId}/toggle_active`, { method: 'POST' });
            if (res.status === 'success') {
                toast.success(`User ${username} ${res.new_state ? 'Activated' : 'Banned'}`);
                setUsers(users.map(u => u.id === userId ? { ...u, is_active: res.new_state } : u));
            }
        } catch (e: any) {
            toast.error(e.message || "Action failed");
        }
    };

    const handleAssignPlan = async () => {
        if (!selectedUser || !selectedPlanId) return;
        try {
            const res = await fetchJson(`/admin/user/${selectedUser.id}/assign_plan`, {
                method: 'POST',
                body: JSON.stringify({ plan_id: parseInt(selectedPlanId), days: parseInt(planDuration) })
            });
            toast.success(res.message);
            setIsPlanDialogOpen(false);
            loadData(); // Refresh users list
        } catch (e: any) {
            toast.error(e.message || "Failed to assign plan");
        }
    };

    const openPlanDialog = (u: User) => {
        setSelectedUser(u);
        setSelectedPlanId(u.plan_id?.toString() || "1");
        setIsPlanDialogOpen(true);
    };

    const handleKillSwitch = async () => {
        const confirmText = prompt("Type 'STOP' to confirm Emergency Stop ALL Bots:");
        if (confirmText !== 'STOP') return;

        try {
            const res = await fetchJson('/admin/kill_switch', { method: 'POST' });
            toast.error("KILL SWITCH ACTIVATED: " + res.message);
            loadData();
        } catch (e: any) {
            toast.error("Kill Switch Failed: " + e.message);
        }
    };

    const clearLogs = async () => {
        if (!confirm("Clear error logs?")) return;
        await fetchJson('/admin/logs/clear', { method: 'POST' });
        toast.success("Logs Cleared");
        loadLogs();
    }

    const createNewPlan = async () => {
        try {
            await fetchJson('/admin/plan', {
                method: 'POST',
                body: JSON.stringify({
                    name: newPlan.name,
                    price: parseFloat(newPlan.price),
                    duration: parseInt(newPlan.duration),
                    features: newPlan.features.split(',').map(s => s.trim())
                })
            });
            toast.success("Plan Created");
            setIsCreatePlanOpen(false);
            loadPlans();
        } catch (e: any) {
            toast.error(e.message);
        }
    }

    const deletePlan = async (id: number) => {
        if (!confirm("Deactivate this plan?")) return;
        try {
            await fetchJson(`/admin/plan/${id}`, { method: 'DELETE' });
            toast.success("Plan Deactivated");
            loadPlans();
        } catch (e: any) { toast.error(e.message); }
    }

    const handleLogout = async () => {
        await fetchJson('/logout', { method: 'POST' });
        router.push('/');
    };

    // --- RENDER HELPERS ---
    const filteredUsers = users.filter(u =>
        u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (isLoading) {
        return <div className="flex h-screen items-center justify-center">Loading Admin Panel...</div>;
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="border-b bg-card">
                <div className="flex items-center justify-between p-4 px-6">
                    <div className="flex items-center gap-2">
                        <Shield className="h-6 w-6 text-primary" />
                        <h1 className="text-xl font-bold">Admin Console</h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" onClick={() => router.push('/dashboard')}>
                            User Dashboard
                        </Button>
                        <Button variant="destructive" size="sm" onClick={handleLogout}>
                            <LogOut className="mr-2 h-4 w-4" /> Logout
                        </Button>
                    </div>
                </div>
            </div>

            <main className="p-6">
                <Tabs defaultValue="overview" className="space-y-6">
                    <TabsList>
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="users">User Management</TabsTrigger>
                        <TabsTrigger value="plans">Subscription Plans</TabsTrigger>
                        <TabsTrigger value="trades">Global Order Book</TabsTrigger>
                        <TabsTrigger value="system" onClick={loadLogs}>System Health</TabsTrigger>
                    </TabsList>

                    {/* OVERVIEW TAB */}
                    <TabsContent value="overview" className="space-y-6">
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                                    <Users className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{stats.total_users}</div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Live Bots Running</CardTitle>
                                    <Activity className="h-4 w-4 text-emerald-500" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{stats.active_bots_live}</div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Paper Bots Running</CardTitle>
                                    <Activity className="h-4 w-4 text-blue-500" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{stats.active_bots_paper}</div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Global P&L (Today)</CardTitle>
                                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className={`text-2xl font-bold ${stats.global_pnl >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                        {stats.global_pnl >= 0 ? '+' : ''}{stats.global_pnl.toFixed(2)}
                                    </div>
                                    <p className="text-xs text-muted-foreground">Across all active live sessions</p>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* USERS TAB */}
                    <TabsContent value="users" className="space-y-4">
                        <div className="flex items-center gap-4">
                            <div className="relative flex-1 max-w-sm">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search users..."
                                    className="pl-8"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <Button variant="outline" onClick={loadData}>Refresh</Button>
                        </div>

                        <Card>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>ID</TableHead>
                                        <TableHead>Username</TableHead>
                                        <TableHead>Plan</TableHead>
                                        <TableHead>Bot Status</TableHead>
                                        <TableHead>Credentials</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredUsers.map((u) => (
                                        <TableRow key={u.id}>
                                            <TableCell>{u.id}</TableCell>
                                            <TableCell>
                                                <div className="font-medium">{u.username}</div>
                                                <div className="text-xs text-muted-foreground">{u.email}</div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline">{u.plan}</Badge>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openPlanDialog(u)}>
                                                        <Edit className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <div className={`h-2 w-2 rounded-full ${u.bot_status === 'Running' ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                                                    {u.bot_status}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {u.has_api_key ?
                                                    <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"><Key className="w-3 h-3 mr-1" /> Valid</Badge> :
                                                    <Badge variant="outline" className="text-muted-foreground">Missing</Badge>
                                                }
                                            </TableCell>
                                            <TableCell>
                                                {u.is_admin ? <Badge>Admin</Badge> : <span className="text-muted-foreground">User</span>}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={u.is_active ? "default" : "destructive"}>
                                                    {u.is_active ? "Active" : "Banned"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    size="sm"
                                                    variant={u.is_active ? "destructive" : "default"}
                                                    onClick={() => toggleUserStatus(u.id, u.is_active, u.username)}
                                                    disabled={u.is_admin} // Can't ban admins
                                                >
                                                    {u.is_active ? "Ban User" : "Activate"}
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </Card>
                    </TabsContent>

                    {/* PLANS TAB (NEW) */}
                    <TabsContent value="plans" className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h2 className="text-lg font-bold">Manage Plans</h2>
                            <Button onClick={() => setIsCreatePlanOpen(true)}><Plus className="h-4 w-4 mr-2" /> Create Plan</Button>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {plans.map(p => (
                                <Card key={p.id}>
                                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                                        <CardTitle>{p.name}</CardTitle>
                                        <Badge variant="secondary">₹{p.price}</Badge>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-sm text-muted-foreground mb-4">Duration: {p.duration}</div>
                                        <Button variant="outline" size="sm" className="w-full text-destructive hover:bg-destructive/10" onClick={() => deletePlan(p.id)}>
                                            <Trash2 className="h-4 w-4 mr-2" /> Deactivate
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </TabsContent>

                    {/* TRADES TAB */}
                    <TabsContent value="trades" className="space-y-4">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="date"
                                    className="w-40"
                                    value={tradeDate}
                                    onChange={(e) => {
                                        setTradeDate(e.target.value);
                                        loadTrades(e.target.value);
                                    }}
                                />
                            </div>
                            <Button variant="outline" onClick={() => loadTrades(tradeDate)}>Refresh</Button>
                        </div>

                        <Card>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Time</TableHead>
                                        <TableHead>User</TableHead>
                                        <TableHead>Symbol</TableHead>
                                        <TableHead>Side</TableHead>
                                        <TableHead>Qty</TableHead>
                                        <TableHead>Entry</TableHead>
                                        <TableHead>P&L</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Type</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {trades.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={9} className="text-center h-24 text-muted-foreground">
                                                No trades found for this date.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        trades.map((t) => (
                                            <TableRow key={t.id} className={t.is_simulated ? "bg-muted/50" : ""}>
                                                <TableCell className="font-mono text-xs">{t.time}</TableCell>
                                                <TableCell>{t.username}</TableCell>
                                                <TableCell className="font-bold">{t.symbol}</TableCell>
                                                <TableCell>
                                                    <Badge variant={t.type === 'BUY' ? 'default' : 'destructive'} className="text-xs">
                                                        {t.type}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>{t.qty}</TableCell>
                                                <TableCell>{t.entry_price}</TableCell>
                                                <TableCell className={t.pnl >= 0 ? "text-emerald-500 font-bold" : "text-red-500 font-bold"}>
                                                    {t.pnl?.toFixed(2)}
                                                </TableCell>
                                                <TableCell>{t.status}</TableCell>
                                                <TableCell>
                                                    <span className="text-xs text-muted-foreground">
                                                        {t.is_simulated ? "PAPER" : "LIVE"}
                                                    </span>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </Card>
                    </TabsContent>

                    {/* SYSTEM HEALTH TAB */}
                    <TabsContent value="system" className="space-y-6">
                        <div className="grid gap-6 md:grid-cols-2">
                            {/* CONNECTIVITY */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Wifi className="h-5 w-5" /> Broker Connectivity
                                    </CardTitle>
                                    <CardDescription>Status of Angel One API connection.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center justify-between p-4 border rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <div className={`h-3 w-3 rounded-full ${connectivity.latency > 0 ? "bg-emerald-500" : "bg-red-500"}`} />
                                            <div>
                                                <div className="font-medium">{connectivity.status}</div>
                                                <div className="text-xs text-muted-foreground">{connectivity.latency > 0 ? `${connectivity.latency}ms latency` : "No response"}</div>
                                            </div>
                                        </div>
                                        <Button variant="outline" size="sm" onClick={checkConnectivity}>Ping API</Button>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-destructive/50 bg-destructive/5">
                                <CardHeader>
                                    <CardTitle className="text-destructive flex items-center gap-2">
                                        <AlertTriangle className="h-5 w-5" /> Emergency Controls
                                    </CardTitle>
                                    <CardDescription>Critcal actions for system stability.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex flex-col gap-4">
                                        <div className="flex items-center justify-between p-4 border rounded-lg bg-background">
                                            <div>
                                                <h3 className="font-medium text-destructive">Global Kill Switch</h3>
                                                <p className="text-sm text-muted-foreground">Immediately stop all running bots.</p>
                                            </div>
                                            <Button variant="destructive" onClick={handleKillSwitch}>STOP ALL BOTS</Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="md:col-span-2">
                                <CardHeader className="flex flex-row items-center justify-between">
                                    <div className="space-y-1">
                                        <CardTitle className="flex items-center gap-2"><Terminal className="h-5 w-5" /> System Logs</CardTitle>
                                        <CardDescription>View recent system errors.</CardDescription>
                                    </div>
                                    <Button variant="outline" size="sm" onClick={clearLogs}>Clear Logs</Button>
                                </CardHeader>
                                <CardContent>
                                    <ScrollArea className="h-[300px] w-full rounded-md border bg-muted/50 p-4 font-mono text-xs">
                                        {logs.length === 0 ? "No errors found." : logs.map((log, i) => (
                                            <div key={i} className="whitespace-pre-wrap mb-1">{log}</div>
                                        ))}
                                    </ScrollArea>
                                    <Button variant="outline" size="sm" className="mt-4" onClick={loadLogs}>Refresh Logs</Button>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                </Tabs>
            </main>

            {/* PLAN EDITOR DIALOG */}
            <Dialog open={isPlanDialogOpen} onOpenChange={setIsPlanDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Update Plan for {selectedUser?.username}</DialogTitle>
                        <DialogDescription>Manually override the user's subscription.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="plan" className="text-right">Plan</Label>
                            <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Select a plan" />
                                </SelectTrigger>
                                <SelectContent>
                                    {plans.map(p => (
                                        <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="days" className="text-right">Days</Label>
                            <Input
                                id="days"
                                type="number"
                                className="col-span-3"
                                value={planDuration}
                                onChange={(e) => setPlanDuration(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsPlanDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleAssignPlan}>Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* CREATE PLAN DIALOG */}
            <Dialog open={isCreatePlanOpen} onOpenChange={setIsCreatePlanOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create New Plan</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Name</Label>
                            <Input className="col-span-3" value={newPlan.name} onChange={e => setNewPlan({ ...newPlan, name: e.target.value })} placeholder="e.g. VIP Plan" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Price (₹)</Label>
                            <Input className="col-span-3" type="number" value={newPlan.price} onChange={e => setNewPlan({ ...newPlan, price: e.target.value })} placeholder="999" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Duration</Label>
                            <Select value={newPlan.duration} onValueChange={v => setNewPlan({ ...newPlan, duration: v })}>
                                <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="30">Monthly (30 Days)</SelectItem>
                                    <SelectItem value="90">Quarterly (90 Days)</SelectItem>
                                    <SelectItem value="365">Yearly (365 Days)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Features</Label>
                            <Textarea className="col-span-3" placeholder="Comma separated, e.g. Basic Support, All Bots" value={newPlan.features} onChange={e => setNewPlan({ ...newPlan, features: e.target.value })} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={createNewPlan}>Create Plan</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
