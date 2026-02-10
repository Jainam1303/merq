"use client";

import { useEffect, useState } from "react";
import { fetchJson } from "@/lib/api";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Activity, Server, Zap, Globe, AlertTriangle } from "lucide-react";

export default function SystemPage() {
    const [health, setHealth] = useState<any>(null);
    const [conn, setConn] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const loadHealth = async () => {
        setLoading(true);
        try {
            const [h, c] = await Promise.all([
                fetchJson('/api/admin/system/health'),
                fetchJson('/api/admin/system/connectivity')
            ]);
            setHealth(h);
            setConn(c);
        } catch (e) {
            toast.error("Failed to load system health");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadHealth(); }, []);

    const handleKillSwitch = async () => {
        if (prompt("Type 'STOP' to confirm Emergency Stop:") !== 'STOP') return;
        try {
            const res = await fetchJson('/api/admin/system/kill', { method: 'POST' });
            toast.success(res.message);
        } catch (e: any) {
            toast.error(e.message);
        }
    };

    if (loading) return <div>Checking System Status...</div>;

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">System Health</h1>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card className={conn.status === 'Connected' ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-red-500/50 bg-red-500/5'}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">API Connectivity</CardTitle>
                        <Globe className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{conn.status}</div>
                        <p className="text-xs text-muted-foreground">Latency: {conn.latency}ms</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Memory Usage (RSS)</CardTitle>
                        <Server className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{health.memory?.rss} MB</div>
                        <p className="text-xs text-muted-foreground">Heap Used: {health.memory?.heapUsed} MB</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Uptime</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{(health.uptime / 3600).toFixed(2)} Hrs</div>
                        <p className="text-xs text-muted-foreground">Node {health.node_version}</p>
                    </CardContent>
                </Card>
            </div>

            <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Emergency Zone</AlertTitle>
                <AlertDescription>
                    These actions are irreversible and affect all active users immediately.
                </AlertDescription>
                <div className="mt-4">
                    <Button variant="destructive" onClick={handleKillSwitch}>
                        ACTIVATE KILL SWITCH (STOP ALL BOTS)
                    </Button>
                </div>
            </Alert>
        </div>
    );
}
