"use client";

import { useEffect, useState } from "react";
import { fetchJson } from "@/lib/api";
import { toast } from "sonner";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Check, Trash2, Edit } from "lucide-react";

export default function PlansPage() {
    const [plans, setPlans] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newPlan, setNewPlan] = useState({ name: "", display_name: "", price: "", duration_days: "30", features: "", limits: "" });
    const [editing, setEditing] = useState<any | null>(null);

    const loadPlans = async () => {
        setLoading(true);
        try {
            const res = await fetchJson('/api/admin/plans');
            setPlans(res);
        } catch (e: any) {
            toast.error("Failed to load plans");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadPlans(); }, []);

    const handleCreate = async () => {
        try {
            const body = {
                name: newPlan.name,
                display_name: newPlan.display_name,
                price: parseFloat(newPlan.price),
                duration_days: parseInt(newPlan.duration_days),
                features: newPlan.features.split('\n').filter(s => s.trim()),
                limits: JSON.parse(newPlan.limits || '{}')
            };

            await fetchJson('/api/admin/plans', { method: 'POST', body: JSON.stringify(body) });
            toast.success("Plan Created");
            setIsCreateOpen(false);
            setNewPlan({ name: "", display_name: "", price: "", duration_days: "30", features: "", limits: "" });
            loadPlans();
        } catch (e: any) {
            toast.error(e.message || "Invalid input");
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Deactivate this plan?")) return;
        try {
            await fetchJson(`/api/admin/plans/${id}`, { method: 'DELETE' });
            toast.success("Plan Deactivated");
            loadPlans();
        } catch (e: any) {
            toast.error(e.message);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Subscription Plans</h1>
                    <p className="text-muted-foreground">Manage pricing tiers and features.</p>
                </div>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button><Plus className="mr-2 h-4 w-4" /> Create Plan</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>Create New Plan</DialogTitle>
                            <DialogDescription>Define a new subscription tier.</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Internal Name</Label>
                                    <Input placeholder="pro_monthly" value={newPlan.name} onChange={e => setNewPlan({ ...newPlan, name: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Display Name</Label>
                                    <Input placeholder="Pro Monthly" value={newPlan.display_name} onChange={e => setNewPlan({ ...newPlan, display_name: e.target.value })} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Price (₹)</Label>
                                    <Input type="number" placeholder="999" value={newPlan.price} onChange={e => setNewPlan({ ...newPlan, price: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Duration (Days)</Label>
                                    <Input type="number" placeholder="30" value={newPlan.duration_days} onChange={e => setNewPlan({ ...newPlan, duration_days: e.target.value })} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Features (One per line)</Label>
                                <Textarea placeholder="Access to all bots&#10;Priority Support" value={newPlan.features} onChange={e => setNewPlan({ ...newPlan, features: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Limits (JSON)</Label>
                                <Textarea placeholder='{"max_bots": 5}' value={newPlan.limits} onChange={e => setNewPlan({ ...newPlan, limits: e.target.value })} />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleCreate}>Create Plan</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {loading ? (
                    <div>Loading plans...</div>
                ) : plans.map((plan) => (
                    <Card key={plan.id} className={plan.is_active ? '' : 'opacity-60 border-destructive/50'}>
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle>{plan.display_name || plan.name}</CardTitle>
                                    <CardDescription>{plan.duration_days} Days</CardDescription>
                                </div>
                                <Badge variant="secondary" className="text-lg">₹{plan.price}</Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <div className="text-sm font-medium">Features:</div>
                                <ul className="space-y-1">
                                    {(plan.features || []).map((f: string, i: number) => (
                                        <li key={i} className="flex items-center text-sm text-muted-foreground">
                                            <Check className="mr-2 h-3 w-3 text-emerald-500" /> {f}
                                        </li>
                                    ))}
                                </ul>
                                <div className="pt-4 flex items-center justify-between text-sm text-muted-foreground">
                                    <span>Subscribers:</span>
                                    <Badge variant="outline">{plan.subscriber_count || 0}</Badge>
                                </div>
                                {!plan.is_active && <Badge variant="destructive" className="mt-2">Inactive</Badge>}
                            </div>
                        </CardContent>
                        <CardFooter className="flex justify-end gap-2">
                            {plan.is_active && (
                                <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(plan.id)}>
                                    <Trash2 className="h-4 w-4 mr-2" /> Deactivate
                                </Button>
                            )}
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </div>
    );
}
