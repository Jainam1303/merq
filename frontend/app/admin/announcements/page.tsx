"use client";

import { useEffect, useState } from "react";
import { fetchJson } from "@/lib/api";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Megaphone, Info, AlertTriangle, AlertOctagon } from "lucide-react";

export default function AnnouncementsPage() {
    const [list, setList] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [title, setTitle] = useState("");
    const [msg, setMsg] = useState("");
    const [type, setType] = useState("info");

    const load = async () => {
        try {
            const res = await fetchJson('/api/admin/announcements');
            setList(res);
        } catch (e) { toast.error("Failed to load"); }
        finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    const create = async () => {
        if (!title || !msg) return toast.error("Fill all fields");
        try {
            await fetchJson('/api/admin/announcements', {
                method: 'POST',
                body: JSON.stringify({ title, message: msg, type })
            });
            toast.success("Broadcast sent");
            setTitle("");
            setMsg("");
            load();
        } catch (e: any) { toast.error(e.message); }
    };

    const remove = async (id: number) => {
        if (!confirm("Remove this announcement?")) return;
        try {
            await fetchJson(`/api/admin/announcements/${id}`, { method: 'DELETE' });
            toast.success("Deleted");
            load();
        } catch (e: any) { toast.error(e.message); }
    };

    const Icon = ({ type }: { type: string }) => {
        if (type === 'warning') return <AlertTriangle className="text-amber-500" />;
        if (type === 'critical') return <AlertOctagon className="text-red-500" />;
        return <Info className="text-blue-500" />;
    };

    return (
        <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-6">
                <h1 className="text-3xl font-bold tracking-tight">Announcements</h1>
                <Card>
                    <CardHeader>
                        <CardTitle>Create Broadcast</CardTitle>
                        <CardDescription>Send a message to all active users immediately.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Input placeholder="Title (e.g. Maintenance Mode)" value={title} onChange={e => setTitle(e.target.value)} />
                        <Textarea placeholder="Message content..." value={msg} onChange={e => setMsg(e.target.value)} />
                        <Select value={type} onValueChange={setType}>
                            <SelectTrigger>
                                <SelectValue placeholder="Type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="info">Info (Blue)</SelectItem>
                                <SelectItem value="warning">Warning (Yellow)</SelectItem>
                                <SelectItem value="critical">Critical (Red)</SelectItem>
                                <SelectItem value="feature">New Feature (Green)</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button onClick={create} className="w-full">
                            <Megaphone className="mr-2 h-4 w-4" /> Broadcast Now
                        </Button>
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-4">
                <h2 className="text-xl font-bold">Active Broadcasts</h2>
                {loading ? <div>Loading...</div> : list.length === 0 ? <div className="text-muted-foreground">No active announcements</div> :
                    list.map((item) => (
                        <Card key={item.id} className={!item.is_active ? 'opacity-50' : ''}>
                            <CardHeader className="flex flex-row items-start justify-between pb-2">
                                <div className="flex items-center gap-2">
                                    <Icon type={item.type} />
                                    <CardTitle className="text-base">{item.title}</CardTitle>
                                </div>
                                {item.is_active ? (
                                    <Button variant="ghost" size="icon" onClick={() => remove(item.id)}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                ) : <Badge variant="secondary">Inactive</Badge>}
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">{item.message}</p>
                                <div className="mt-2 text-xs text-muted-foreground flex justify-between">
                                    <span>By {item.creator?.username}</span>
                                    <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                }
            </div>
        </div>
    );
}
