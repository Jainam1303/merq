"use client";
import { useState, useEffect } from "react";
import { fetchJson } from "@/lib/api";
import { User, Lock, Key, CreditCard, Eye, EyeOff, Check, Loader2, Save, ChevronRight, ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Country codes with flags
const COUNTRIES = [
    { code: 'IN', dial: '+91', flag: '🇮🇳', name: 'India' },
    { code: 'US', dial: '+1', flag: '🇺🇸', name: 'United States' },
    { code: 'GB', dial: '+44', flag: '🇬🇧', name: 'United Kingdom' },
    { code: 'AE', dial: '+971', flag: '🇦🇪', name: 'UAE' },
    { code: 'SG', dial: '+65', flag: '🇸🇬', name: 'Singapore' },
    { code: 'AU', dial: '+61', flag: '🇦🇺', name: 'Australia' },
    { code: 'CA', dial: '+1', flag: '🇨🇦', name: 'Canada' },
    { code: 'DE', dial: '+49', flag: '🇩🇪', name: 'Germany' },
    { code: 'FR', dial: '+33', flag: '🇫🇷', name: 'France' },
    { code: 'JP', dial: '+81', flag: '🇯🇵', name: 'Japan' },
];

const loadScript = (src: string) => {
    return new Promise((resolve) => {
        const script = document.createElement("script");
        script.src = src;
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
};

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function Profile() {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        phone: '',
        phoneCountry: 'IN', // Default to India
        angel_api_key: '',
        angel_client_code: '',
        angel_password: '',
        angel_totp: '',
        backtest_api_key: '',
        backtest_client_code: '',
        backtest_password: '',
        backtest_totp: '',
        new_password: '',
    });

    // Validation errors
    const [errors, setErrors] = useState<{ email?: string; phone?: string }>({});

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Visibility toggles for Angel One credentials
    const [showAngelApiKey, setShowAngelApiKey] = useState(false);
    const [showAngelPassword, setShowAngelPassword] = useState(false);
    const [showAngelTotp, setShowAngelTotp] = useState(false);

    // Visibility toggles for Backtest credentials
    const [showBacktestApiKey, setShowBacktestApiKey] = useState(false);
    const [showBacktestPassword, setShowBacktestPassword] = useState(false);
    const [showBacktestTotp, setShowBacktestTotp] = useState(false);

    const [plans, setPlans] = useState<any[]>([]);
    const [currentPlanId, setCurrentPlanId] = useState<number | null>(null);
    const [planExpiry, setPlanExpiry] = useState<string | null>(null);

    // Load Profile
    useEffect(() => {
        loadProfile();
        loadPlans();
    }, []);

    const loadProfile = async () => {
        try {
            const data = await fetchJson('/get_profile');
            const safeData = Object.fromEntries(
                Object.entries(data).map(([k, v]) => [k, v === null ? '' : v])
            );
            setFormData(prev => ({ ...prev, ...safeData }));
            if (data.plan_id) setCurrentPlanId(data.plan_id);
            if (data.plan_expiry) setPlanExpiry(data.plan_expiry);
        } catch (e) {
            toast.error("Failed to load profile");
        } finally {
            setLoading(false);
        }
    };

    const loadPlans = async () => {
        try {
            const data = await fetchJson('/plans');
            setPlans(data);
        } catch (e) {
            console.error("Failed to load plans", e);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });

        // Real-time validation
        if (name === 'email') {
            if (value && !EMAIL_REGEX.test(value)) {
                setErrors(prev => ({ ...prev, email: 'Please enter a valid email address' }));
            } else {
                setErrors(prev => ({ ...prev, email: undefined }));
            }
        }

        if (name === 'phone') {
            // Only allow digits
            const digitsOnly = value.replace(/\D/g, '');
            const country = COUNTRIES.find(c => c.code === formData.phoneCountry);
            const maxLength = country?.code === 'IN' ? 10 : 15; // India has 10 digits

            if (digitsOnly.length > maxLength) {
                return; // Don't update if exceeds max length
            }

            setFormData(prev => ({ ...prev, phone: digitsOnly }));

            if (digitsOnly && digitsOnly.length < 10) {
                setErrors(prev => ({ ...prev, phone: 'Phone number must be at least 10 digits' }));
            } else {
                setErrors(prev => ({ ...prev, phone: undefined }));
            }
            return;
        }
    };

    const handleCountryChange = (countryCode: string) => {
        setFormData(prev => ({ ...prev, phoneCountry: countryCode, phone: '' }));
        setErrors(prev => ({ ...prev, phone: undefined }));
    };

    const getSelectedCountry = () => {
        return COUNTRIES.find(c => c.code === formData.phoneCountry) || COUNTRIES[0];
    };

    const handleUpdate = async (section: string) => {
        setSaving(true);
        try {
            await fetchJson('/update_profile', {
                method: 'POST',
                body: JSON.stringify(formData)
            });
            toast.success(`${section} updated successfully`);
            if (section === 'Security') {
                setFormData(prev => ({ ...prev, new_password: '' }));
            }
        } catch (e) {
            toast.error("Failed to update profile");
        } finally {
            setSaving(false);
        }
    };

    const handleUpgrade = async (plan: any) => {
        if (plan.id === currentPlanId) return;

        const res = await loadScript("https://checkout.razorpay.com/v1/checkout.js");
        if (!res) { toast.error("Razorpay SDK failed to load"); return; }

        try {
            const order = await fetchJson('/create_order', { method: 'POST', body: JSON.stringify({ plan_id: plan.id }) });
            if (order.status !== 'success') { toast.error(order.message); return; }

            const options = {
                key: order.key,
                amount: order.amount,
                currency: "INR",
                name: "Algo Trade",
                description: `Subscription for ${plan.plan}`,
                order_id: order.order_id,
                handler: async function (response: any) {
                    try {
                        const verifyRes = await fetchJson('/verify_payment', {
                            method: 'POST',
                            body: JSON.stringify({
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_signature: response.razorpay_signature,
                                plan_id: plan.id
                            })
                        });
                        if (verifyRes.status === 'success') {
                            toast.success("Upgrade Successful!");
                            loadProfile(); // Refresh plan status
                            // Notify Sidebar to update
                            window.dispatchEvent(new Event('plan-updated'));
                        } else {
                            toast.error("Verification Failed");
                        }
                    } catch (e) { toast.error("Verification Error"); }
                },
                prefill: order.prefill,
                theme: { color: "#3399cc" }
            };
            const rzp = new (window as any).Razorpay(options);
            rzp.open();
        } catch (e) {
            console.error(e);
            toast.error("Payment initiation failed");
        }
    };

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

    return (
        <div className="space-y-6">
            <Tabs defaultValue="security" className="w-full">
                {/* Fixed Header Layout (Horizontal Flex) */}
                <TabsList className="flex flex-row overflow-x-auto w-full justify-start gap-2 bg-transparent p-0 mb-4 h-auto">
                    <TabsTrigger value="security" className="gap-2">
                        <Lock className="h-4 w-4 hidden sm:inline" />
                        Security
                    </TabsTrigger>
                    <TabsTrigger value="api" className="gap-2">
                        <Key className="h-4 w-4 hidden sm:inline" />
                        API Keys
                    </TabsTrigger>
                    <TabsTrigger value="subscription" className="gap-2">
                        <CreditCard className="h-4 w-4 hidden sm:inline" />
                        Plans
                    </TabsTrigger>
                </TabsList>

                {/* Security Tab */}
                <TabsContent value="security" className="mt-6 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Personal Information & Security</CardTitle>
                            <CardDescription>Update your personal details and login credentials.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid gap-6 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label>Username</Label>
                                    <Input value={formData.username} disabled className="bg-muted" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Email</Label>
                                    <Input
                                        name="email"
                                        type="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        className={errors.email ? 'border-red-500' : ''}
                                        placeholder="example@email.com"
                                    />
                                    {errors.email && (
                                        <p className="text-xs text-red-500">{errors.email}</p>
                                    )}
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <Label>Phone Number</Label>
                                    <div className="flex gap-2">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="outline" className="w-[130px] justify-between bg-transparent hover:bg-transparent hover:text-foreground">
                                                    <span className="flex items-center gap-2">
                                                        <span className="text-lg">{getSelectedCountry().flag}</span>
                                                        <span className="text-sm">{getSelectedCountry().dial}</span>
                                                    </span>
                                                    <ChevronDown className="h-4 w-4 opacity-50" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="start" className="w-[200px] max-h-[300px] overflow-y-auto">
                                                {COUNTRIES.map(country => (
                                                    <DropdownMenuItem
                                                        key={country.code}
                                                        onClick={() => handleCountryChange(country.code)}
                                                        className="cursor-pointer"
                                                    >
                                                        <span className="text-lg mr-2">{country.flag}</span>
                                                        <span className="flex-1">{country.name}</span>
                                                        <span className="text-muted-foreground text-xs">{country.dial}</span>
                                                    </DropdownMenuItem>
                                                ))}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                        <Input
                                            name="phone"
                                            type="tel"
                                            value={formData.phone}
                                            onChange={handleChange}
                                            className={`flex-1 ${errors.phone ? 'border-red-500' : ''}`}
                                            placeholder={formData.phoneCountry === 'IN' ? '9876543210' : 'Phone number'}
                                            maxLength={formData.phoneCountry === 'IN' ? 10 : 15}
                                        />
                                    </div>
                                    {errors.phone && (
                                        <p className="text-xs text-red-500">{errors.phone}</p>
                                    )}
                                </div>
                            </div>

                            <div className="pt-4 border-t">
                                <h3 className="text-sm font-medium mb-4">Change Password</h3>
                                <div className="grid gap-6 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label>New Password</Label>
                                        <div className="relative">
                                            <Input
                                                name="new_password"
                                                type={showPassword ? "text" : "password"}
                                                value={formData.new_password}
                                                onChange={handleChange}
                                                placeholder="Leave empty to keep current"
                                            />
                                            <Button
                                                type="button" variant="ghost" size="icon"
                                                className="absolute right-0 top-0 h-full px-3"
                                                onClick={() => setShowPassword(!showPassword)}
                                            >
                                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <Button onClick={() => handleUpdate('Security')} disabled={saving}>
                                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Changes
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* API Tab */}
                <TabsContent value="api" className="mt-6 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Angel One Integration</CardTitle>
                            <CardDescription>Credentials for live trading.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid gap-6 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label>API Key</Label>
                                    <div className="relative">
                                        <Input
                                            name="angel_api_key"
                                            type={showAngelApiKey ? "text" : "password"}
                                            value={formData.angel_api_key}
                                            onChange={handleChange}
                                            placeholder="Enter API Key"
                                        />
                                        <Button
                                            type="button" variant="ghost" size="icon"
                                            className="absolute right-0 top-0 h-full px-3"
                                            onClick={() => setShowAngelApiKey(!showAngelApiKey)}
                                        >
                                            {showAngelApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Client Code</Label>
                                    <Input name="angel_client_code" value={formData.angel_client_code} onChange={handleChange} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Password</Label>
                                    <div className="relative">
                                        <Input
                                            name="angel_password"
                                            type={showAngelPassword ? "text" : "password"}
                                            value={formData.angel_password}
                                            onChange={handleChange}
                                            placeholder="Enter password"
                                        />
                                        <Button
                                            type="button" variant="ghost" size="icon"
                                            className="absolute right-0 top-0 h-full px-3"
                                            onClick={() => setShowAngelPassword(!showAngelPassword)}
                                        >
                                            {showAngelPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>TOTP Secret</Label>
                                    <div className="relative">
                                        <Input
                                            name="angel_totp"
                                            type={showAngelTotp ? "text" : "password"}
                                            value={formData.angel_totp}
                                            onChange={handleChange}
                                            placeholder="Enter TOTP Secret"
                                        />
                                        <Button
                                            type="button" variant="ghost" size="icon"
                                            className="absolute right-0 top-0 h-full px-3"
                                            onClick={() => setShowAngelTotp(!showAngelTotp)}
                                        >
                                            {showAngelTotp ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                            <Button onClick={() => handleUpdate('Angel One Credentials')} disabled={saving}>Save Angel One Keys</Button>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Backtesting Data API</CardTitle>
                            <CardDescription>Credentials for historical data.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid gap-6 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label>API Key</Label>
                                    <div className="relative">
                                        <Input
                                            name="backtest_api_key"
                                            type={showBacktestApiKey ? "text" : "password"}
                                            value={formData.backtest_api_key}
                                            onChange={handleChange}
                                            placeholder="Enter API Key"
                                        />
                                        <Button
                                            type="button" variant="ghost" size="icon"
                                            className="absolute right-0 top-0 h-full px-3"
                                            onClick={() => setShowBacktestApiKey(!showBacktestApiKey)}
                                        >
                                            {showBacktestApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Client Code</Label>
                                    <Input name="backtest_client_code" value={formData.backtest_client_code} onChange={handleChange} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Password</Label>
                                    <div className="relative">
                                        <Input
                                            name="backtest_password"
                                            type={showBacktestPassword ? "text" : "password"}
                                            value={formData.backtest_password}
                                            onChange={handleChange}
                                            placeholder="Enter password"
                                        />
                                        <Button
                                            type="button" variant="ghost" size="icon"
                                            className="absolute right-0 top-0 h-full px-3"
                                            onClick={() => setShowBacktestPassword(!showBacktestPassword)}
                                        >
                                            {showBacktestPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>TOTP Secret</Label>
                                    <div className="relative">
                                        <Input
                                            name="backtest_totp"
                                            type={showBacktestTotp ? "text" : "password"}
                                            value={formData.backtest_totp}
                                            onChange={handleChange}
                                            placeholder="Enter TOTP Secret"
                                        />
                                        <Button
                                            type="button" variant="ghost" size="icon"
                                            className="absolute right-0 top-0 h-full px-3"
                                            onClick={() => setShowBacktestTotp(!showBacktestTotp)}
                                        >
                                            {showBacktestTotp ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                            <Button onClick={() => handleUpdate('Backtest Credentials')} disabled={saving}>Save Backtest Keys</Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Subscription Tab (Dynamic Plans) */}
                <TabsContent value="subscription" className="mt-6">
                    {(() => {
                        const activePlan = plans.find(p => p.id === currentPlanId);
                        return (
                            <>
                                {activePlan && (
                                    <div className="mb-8 rounded-xl border border-zinc-800 bg-[#09090b] p-6 relative overflow-hidden shadow-2xl">
                                        <div className="absolute top-4 right-4">
                                            <Badge className="bg-blue-600 hover:bg-blue-700 text-white border-0 px-3 py-1">Active</Badge>
                                        </div>
                                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                            <div className="space-y-2">
                                                <div>
                                                    <p className="text-sm font-medium text-zinc-400">Current Plan</p>
                                                    <p className="text-xs text-zinc-500">Your active subscription</p>
                                                </div>
                                                <h2 className="text-4xl font-bold text-white tracking-tight">{activePlan.plan}</h2>
                                                <div className="flex items-center gap-2 text-zinc-400 text-sm">
                                                    <span>{activePlan.duration}</span>
                                                    <span>•</span>
                                                    <span>Expires: {planExpiry ? new Date(planExpiry).toLocaleDateString() : 'N/A'}</span>
                                                </div>
                                                <div className="flex flex-wrap gap-2 mt-4">
                                                    {(activePlan.features ? (Array.isArray(activePlan.features) ? activePlan.features : JSON.parse(activePlan.features)) : []).map((f: string, i: number) => (
                                                        <Badge key={i} variant="secondary" className="rounded-full px-3 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border-zinc-700"><Check className="mr-1 h-3 w-3" /> {f}</Badge>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-5xl font-bold text-blue-500">₹{activePlan.price}</p>
                                                <Button variant="ghost" size="icon" className="ml-auto mt-2">
                                                    <ChevronRight className="h-6 w-6 text-zinc-500" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <h3 className="text-lg font-semibold mb-4 text-zinc-900 dark:text-zinc-100">Upgrade Your Plan</h3>
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                                    {plans.map((plan) => (
                                        <Card key={plan.id} className={plan.id === currentPlanId ? "border-blue-500/50 bg-blue-500/5" : ""}>
                                            <CardHeader>
                                                <CardTitle>{plan.plan}</CardTitle>
                                                <CardDescription>{plan.duration}</CardDescription>
                                            </CardHeader>
                                            <CardContent>
                                                <p className="text-2xl font-bold">₹{plan.price}</p>
                                                <ul className="mt-4 space-y-2 text-sm">
                                                    {(plan.features ? (Array.isArray(plan.features) ? plan.features : JSON.parse(plan.features)) : []).slice(0, 3).map((f: string, i: number) => (
                                                        <li key={i} className="flex gap-2"><Check className="h-4 w-4 text-green-500" /> {f}</li>
                                                    ))}
                                                </ul>
                                                <Button
                                                    className={`w-full mt-4 ${plan.id === currentPlanId ? 'bg-zinc-800' : ''}`}
                                                    variant={plan.id === currentPlanId ? "secondary" : "default"}
                                                    onClick={() => handleUpgrade(plan)}
                                                    disabled={plan.id === currentPlanId}
                                                >
                                                    {plan.id === currentPlanId ? 'Current Plan' : 'Upgrade'}
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    ))}
                                    {plans.length === 0 && <p className="text-muted-foreground p-4">No plans available.</p>}
                                </div>
                            </>
                        );
                    })()}
                </TabsContent>



            </Tabs>
        </div>
    );
}
