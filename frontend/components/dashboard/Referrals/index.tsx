"use client";

import { useState, useEffect } from "react";
import { fetchJson } from "@/lib/api";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Gift,
    Copy,
    Users,
    IndianRupee,
    Clock,
    CheckCircle2,
    Share2,
    TrendingUp,
    AlertCircle,
    Loader2,
    ExternalLink,
} from "lucide-react";

interface ReferralStats {
    referral_code: string | null;
    has_paid_plan: boolean;
    commission_rate: number;
    total_referrals: number;
    paid_referrals: number;
    total_earnings: number;
    pending_earnings: number;
    paid_earnings: number;
}

interface ReferralUser {
    id: number;
    username: string;
    email: string;
    joined_at: string;
    current_plan: string;
    plan_price: number;
    total_commission: number;
}

interface Earning {
    id: number;
    payment_amount: number;
    commission_rate: number;
    commission_amount: number;
    status: string;
    createdAt: string;
    referred: { id: number; username: string; email: string };
}

export function Referrals() {
    const [stats, setStats] = useState<ReferralStats | null>(null);
    const [referrals, setReferrals] = useState<ReferralUser[]>([]);
    const [earnings, setEarnings] = useState<Earning[]>([]);
    const [loading, setLoading] = useState(true);
    const [copying, setCopying] = useState(false);

    const SITE_URL = typeof window !== 'undefined' ? window.location.origin : 'https://merqprime.in';

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [statsRes, referralsRes, earningsRes] = await Promise.all([
                fetchJson('/api/referral/stats'),
                fetchJson('/api/referral/referrals').catch(() => ({ referrals: [] })),
                fetchJson('/api/referral/earnings').catch(() => ({ earnings: [] })),
            ]);
            setStats(statsRes);
            setReferrals(referralsRes.referrals || []);
            setEarnings(earningsRes.earnings || []);
        } catch (e) {
            console.error('Failed to load referral data:', e);
        } finally {
            setLoading(false);
        }
    };

    const copyLink = async () => {
        if (!stats?.referral_code) return;
        const link = `${SITE_URL}?ref=${stats.referral_code}`;
        try {
            setCopying(true);
            await navigator.clipboard.writeText(link);
            toast.success("Referral link copied!");
        } catch (e) {
            toast.error("Failed to copy link");
        } finally {
            setTimeout(() => setCopying(false), 2000);
        }
    };

    const shareLink = async () => {
        if (!stats?.referral_code) return;
        const link = `${SITE_URL}?ref=${stats.referral_code}`;
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Join MerQPrime',
                    text: 'Trade smarter with MerQPrime! Use my referral link to sign up:',
                    url: link,
                });
            } catch (e) { /* User cancelled */ }
        } else {
            copyLink();
        }
    };

    const generateCode = async () => {
        try {
            const res = await fetchJson('/api/referral/generate-code', { method: 'POST' });
            toast.success("Referral code generated!");
            loadData();
        } catch (e: any) {
            toast.error(e.message || "Failed to generate code");
        }
    };

    const statusBadge = (status: string) => {
        switch (status) {
            case 'pending': return <Badge variant="outline" className="text-yellow-500 border-yellow-500/30"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
            case 'approved': return <Badge variant="outline" className="text-blue-500 border-blue-500/30"><CheckCircle2 className="w-3 h-3 mr-1" />Approved</Badge>;
            case 'paid': return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30"><CheckCircle2 className="w-3 h-3 mr-1" />Paid</Badge>;
            case 'rejected': return <Badge variant="destructive">Rejected</Badge>;
            default: return <Badge variant="outline">{status}</Badge>;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    // User doesn't have a paid plan yet
    if (stats && !stats.has_paid_plan) {
        return (
            <div className="max-w-2xl mx-auto py-12">
                <Card className="border-dashed border-2">
                    <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="rounded-full bg-primary/10 p-4 mb-4">
                            <Gift className="h-10 w-10 text-primary" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2">Unlock Refer & Earn</h2>
                        <p className="text-muted-foreground max-w-md mb-6">
                            Subscribe to any paid plan to get your unique referral link.
                            Earn <span className="text-primary font-semibold">{stats.commission_rate}% commission</span> every
                            time someone you refer buys a plan!
                        </p>
                        <div className="flex gap-3">
                            <Button className="gap-2" onClick={() => {
                                // Navigate to profile/plans section
                                window.dispatchEvent(new CustomEvent('navigate-tab', { detail: 'profile' }));
                            }}>
                                <TrendingUp className="h-4 w-4" />
                                View Plans
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Referral Link Card */}
            <Card className="bg-gradient-to-br from-primary/5 via-card to-primary/5 border-primary/20">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Gift className="h-5 w-5 text-primary" />
                        Your Referral Link
                    </CardTitle>
                    <CardDescription>
                        Share this link and earn {stats?.commission_rate}% commission on every paid plan purchase
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {stats?.referral_code ? (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <div className="flex-1 bg-background border rounded-lg px-4 py-3 font-mono text-sm truncate">
                                    {SITE_URL}?ref={stats.referral_code}
                                </div>
                                <Button variant="outline" size="icon" onClick={copyLink} className="shrink-0">
                                    {copying ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                                </Button>
                                <Button variant="outline" size="icon" onClick={shareLink} className="shrink-0">
                                    <Share2 className="h-4 w-4" />
                                </Button>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>Referral Code:</span>
                                <code className="bg-secondary px-2 py-0.5 rounded font-mono font-bold text-foreground">
                                    {stats.referral_code}
                                </code>
                            </div>
                        </div>
                    ) : (
                        <Button onClick={generateCode}>
                            <Gift className="h-4 w-4 mr-2" />
                            Generate My Referral Code
                        </Button>
                    )}
                </CardContent>
            </Card>

            {/* Stats Grid */}
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-blue-500/10 p-2">
                                <Users className="h-5 w-5 text-blue-500" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Total Referrals</p>
                                <p className="text-2xl font-bold">{stats?.total_referrals || 0}</p>
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
                                <p className="text-xs text-muted-foreground">Paid Conversions</p>
                                <p className="text-2xl font-bold">{stats?.paid_referrals || 0}</p>
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
                                <p className="text-xs text-muted-foreground">Total Earnings</p>
                                <p className="text-2xl font-bold">₹{stats?.total_earnings?.toFixed(2) || '0.00'}</p>
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
                                <p className="text-xs text-muted-foreground">Pending Payout</p>
                                <p className="text-2xl font-bold">₹{stats?.pending_earnings?.toFixed(2) || '0.00'}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs: Referrals / Earnings */}
            <Tabs defaultValue="referrals" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="referrals">My Referrals</TabsTrigger>
                    <TabsTrigger value="earnings">Earnings History</TabsTrigger>
                </TabsList>

                <TabsContent value="referrals">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">People You Referred</CardTitle>
                            <CardDescription>
                                {referrals.length === 0 ? 'No referrals yet. Share your link to start earning!' : `${referrals.length} total referral${referrals.length !== 1 ? 's' : ''}`}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {referrals.length === 0 ? (
                                <div className="flex flex-col items-center py-8 text-muted-foreground">
                                    <Users className="h-12 w-12 mb-3 opacity-30" />
                                    <p className="text-sm">Share your referral link to start earning commissions.</p>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>User</TableHead>
                                            <TableHead>Joined</TableHead>
                                            <TableHead>Current Plan</TableHead>
                                            <TableHead className="text-right">Commission Earned</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {referrals.map((ref) => (
                                            <TableRow key={ref.id}>
                                                <TableCell className="font-medium">{ref.username}</TableCell>
                                                <TableCell className="text-muted-foreground text-sm">
                                                    {new Date(ref.joined_at).toLocaleDateString()}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={ref.plan_price > 0 ? 'default' : 'outline'}>
                                                        {ref.current_plan}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right font-mono">
                                                    ₹{ref.total_commission.toFixed(2)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="earnings">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Earnings History</CardTitle>
                            <CardDescription>
                                Track every commission earned from your referrals
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {earnings.length === 0 ? (
                                <div className="flex flex-col items-center py-8 text-muted-foreground">
                                    <IndianRupee className="h-12 w-12 mb-3 opacity-30" />
                                    <p className="text-sm">You'll see commission payouts here once your referrals buy a plan.</p>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>User</TableHead>
                                            <TableHead>Plan Amount</TableHead>
                                            <TableHead>Rate</TableHead>
                                            <TableHead>Commission</TableHead>
                                            <TableHead>Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {earnings.map((e) => (
                                            <TableRow key={e.id}>
                                                <TableCell className="text-muted-foreground text-sm">
                                                    {new Date(e.createdAt).toLocaleDateString()}
                                                </TableCell>
                                                <TableCell className="font-medium">
                                                    {e.referred?.username || 'Unknown'}
                                                </TableCell>
                                                <TableCell className="font-mono">₹{Number(e.payment_amount).toFixed(2)}</TableCell>
                                                <TableCell className="text-muted-foreground">{e.commission_rate}%</TableCell>
                                                <TableCell className="font-mono font-semibold text-emerald-500">
                                                    +₹{Number(e.commission_amount).toFixed(2)}
                                                </TableCell>
                                                <TableCell>{statusBadge(e.status)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* How it works */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-muted-foreground" />
                        How Refer & Earn Works
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-6 md:grid-cols-3">
                        <div className="flex gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm shrink-0">1</div>
                            <div>
                                <p className="font-medium text-sm">Share Your Link</p>
                                <p className="text-xs text-muted-foreground mt-0.5">Copy your unique referral link and share it with friends, social media, or trading communities.</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm shrink-0">2</div>
                            <div>
                                <p className="font-medium text-sm">Friend Signs Up & Subscribes</p>
                                <p className="text-xs text-muted-foreground mt-0.5">When someone joins MerQPrime using your link and buys any paid plan, they become your referral.</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm shrink-0">3</div>
                            <div>
                                <p className="font-medium text-sm">Earn Commission</p>
                                <p className="text-xs text-muted-foreground mt-0.5">You earn {stats?.commission_rate || 5}% of each plan purchase made by your referral. Commissions are tracked and paid out.</p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
