"use client";

import { useEffect, useState } from "react";
import { fetchJson } from "@/lib/api";
import { toast } from "sonner";
import { User, Activity, DollarSign, CreditCard, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useRouter } from "next/navigation";

export default function AdminDashboard() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState({
        total_users: 0,
        active_users: 0,
        admin_count: 0,
        active_subscriptions: 0,
        today_trades: 0,
        today_pnl: 0,
        monthly_revenue: 0,
        new_users_week: 0
    });
    const [recentActivity, setRecentActivity] = useState<any[]>([]);

    useEffect(() => {
        const loadDashboard = async () => {
            try {
                const res = await fetchJson('/api/admin/dashboard');
                setStats(res.stats);
                setRecentActivity(res.recent_activity || []);
            } catch (e: any) {
                console.error("Dashboard fetch error:", e);
                toast.error("Failed to load dashboard data");
            } finally {
                setIsLoading(false);
            }
        };

        loadDashboard();
    }, [router]);

    if (isLoading) {
        return <div className="flex h-screen items-center justify-center">Loading Dashboard...</div>;
    }

    const StatCard = ({ title, value, icon: Icon, trend, className }: any) => (
        <Card className={className}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                {trend && (
                    <p className="text-xs text-muted-foreground flex items-center mt-1">
                        {trend > 0 ? <ArrowUpRight className="text-emerald-500 w-3 h-3 mr-1" /> : <ArrowDownRight className="text-red-500 w-3 h-3 mr-1" />}
                        <span className={trend > 0 ? "text-emerald-500" : "text-red-500"}>{Math.abs(trend)}%</span> from last month
                    </p>
                )}
            </CardContent>
        </Card>
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
                <div className="flex items-center space-x-2">
                    <Button onClick={() => window.location.reload()}>Refresh</Button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title="Total Users"
                    value={stats.total_users}
                    icon={User}
                    className="border-blue-500/20 bg-blue-500/5"
                />
                <StatCard
                    title="Active Subscriptions"
                    value={stats.active_subscriptions}
                    icon={CreditCard}
                    className="border-purple-500/20 bg-purple-500/5"
                />
                <StatCard
                    title="Today's Trades"
                    value={stats.today_trades}
                    icon={Activity}
                    className="border-amber-500/20 bg-amber-500/5"
                />
                <StatCard
                    title="Today's P&L"
                    value={`₹${stats.today_pnl?.toFixed(2)}`}
                    icon={DollarSign}
                    className={stats.today_pnl >= 0 ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-500" : "border-red-500/20 bg-red-500/5 text-red-500"}
                />
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Overview</CardTitle>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 border rounded-lg bg-card/50">
                                <div className="text-sm font-medium text-muted-foreground">Monthly Revenue</div>
                                <div className="text-2xl font-bold">₹{stats.monthly_revenue?.toFixed(2)}</div>
                            </div>
                            <div className="p-4 border rounded-lg bg-card/50">
                                <div className="text-sm font-medium text-muted-foreground">Active Users</div>
                                <div className="text-2xl font-bold">{stats.active_users}</div>
                            </div>
                            <div className="p-4 border rounded-lg bg-card/50">
                                <div className="text-sm font-medium text-muted-foreground">New Users (Week)</div>
                                <div className="text-2xl font-bold text-emerald-500">+{stats.new_users_week}</div>
                            </div>
                            <div className="p-4 border rounded-lg bg-card/50">
                                <div className="text-sm font-medium text-muted-foreground">Admins</div>
                                <div className="text-2xl font-bold text-blue-500">{stats.admin_count}</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Recent Activity</CardTitle>
                        <CardDescription>Latest system actions.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[300px]">
                            <div className="space-y-4">
                                {recentActivity.length === 0 ? (
                                    <div className="text-sm text-muted-foreground text-center py-4">No recent activity</div>
                                ) : (
                                    recentActivity.map((item, i) => (
                                        <div key={i} className="flex items-center">
                                            <Avatar className="h-9 w-9">
                                                <AvatarFallback>AD</AvatarFallback>
                                            </Avatar>
                                            <div className="ml-4 space-y-1">
                                                <p className="text-sm font-medium leading-none">
                                                    {item.admin?.username || 'System'}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {item.action} on {item.target_type} {item.target_id}
                                                </p>
                                            </div>
                                            <div className="ml-auto font-medium text-xs text-muted-foreground">
                                                {new Date(item.createdAt).toLocaleTimeString()}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
