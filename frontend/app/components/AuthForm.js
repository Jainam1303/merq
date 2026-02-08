'use client';
import { useState } from 'react';
import { Eye, EyeOff, TrendingUp, Users, Zap, Shield, User, Lock, ArrowRight, AlertCircle } from 'lucide-react';

// Assuming fetchJson is available globally or needs to be imported
// If not available, you'll need to copy the fetchJson function here
const API_BASE = "/api";
async function fetchJson(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    const res = await fetch(url, { ...options, headers, credentials: 'include' });
    if (!res.ok) {
        let errorMsg = `HTTP ${res.status}`;
        try {
            const errorData = await res.json();
            errorMsg = errorData.message || errorMsg;
        } catch { }
        throw new Error(errorMsg);
    }
    return res.json();
}

export default function AuthForm({ type, onSuccess, switchTo }) {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isTransitioning, setIsTransitioning] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true); setError("");
        try {
            const data = await fetchJson(type === 'login' ? '/login' : '/register', {
                method: 'POST',
                body: JSON.stringify({ username, password })
            });

            if (data.status === 'success') {
                if (type === 'login') onSuccess(data.user);
                else onSuccess();
            } else {
                setError(data.message || "Action failed");
            }
        } catch (err) {
            console.error(err);
            setError(err.message || "Network Error. Check console.");
        }
        setLoading(false);
    };

    const handleSwitch = () => {
        setIsTransitioning(true);
        setTimeout(() => {
            switchTo(type === 'login' ? 'register' : 'login');
            setTimeout(() => setIsTransitioning(false), 50);
        }, 400);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-50 via-white to-blue-50 dark:from-[#09090b] dark:via-[#0a0a0f] dark:to-[#0a0a1a] relative overflow-hidden">
            {/* Animated Background Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/5 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-20 right-10 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500/3 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
            </div>

            <div className="w-full max-w-6xl mx-auto px-6 relative z-10">
                <div className={`grid grid-cols-1 lg:grid-cols-2 gap-0 bg-white dark:bg-[#0a0a0f] rounded-3xl shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 transition-all duration-500 ${isTransitioning ? 'scale-95 opacity-50' : 'scale-100 opacity-100'}`}>

                    {/* Left Side - Animated Trading Visualization */}
                    <div className="relative bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-500 dark:via-indigo-500 dark:to-purple-500 p-12 flex flex-col justify-center items-center overflow-hidden min-h-[600px]">
                        {/* Animated Grid Background */}
                        <div className="absolute inset-0 opacity-10">
                            <div className="absolute inset-0" style={{
                                backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
                                backgroundSize: '50px 50px'
                            }}></div>
                        </div>

                        {/* Animated Candlestick Chart */}
                        <div className="relative w-full h-64 mb-8">
                            <svg className="w-full h-full" viewBox="0 0 400 200" preserveAspectRatio="none">
                                {/* Animated Candles */}
                                {[
                                    { x: 40, high: 40, low: 120, open: 60, close: 100, color: 'red' },
                                    { x: 80, high: 30, low: 90, open: 80, close: 50, color: 'green' },
                                    { x: 120, high: 50, low: 130, open: 60, close: 110, color: 'red' },
                                    { x: 160, high: 20, low: 100, open: 90, close: 40, color: 'green' },
                                    { x: 200, high: 35, low: 115, open: 45, close: 95, color: 'red' },
                                    { x: 240, high: 25, low: 85, open: 75, close: 45, color: 'green' },
                                    { x: 280, high: 40, low: 110, open: 50, close: 90, color: 'red' },
                                    { x: 320, high: 30, low: 95, open: 85, close: 50, color: 'green' },
                                    { x: 360, high: 20, low: 80, open: 70, close: 35, color: 'green' }
                                ].map((candle, i) => (
                                    <g key={i} className="animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${i * 100}ms`, animationDuration: '800ms' }}>
                                        {/* Wick */}
                                        <line x1={candle.x} y1={candle.high} x2={candle.x} y2={candle.low} stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" />
                                        {/* Body */}
                                        <rect
                                            x={candle.x - 8}
                                            y={Math.min(candle.open, candle.close)}
                                            width="16"
                                            height={Math.abs(candle.close - candle.open)}
                                            fill={candle.color === 'green' ? 'rgba(34, 197, 94, 0.9)' : 'rgba(239, 68, 68, 0.9)'}
                                            stroke={candle.color === 'green' ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)'}
                                            strokeWidth="1"
                                            className="transition-all duration-300 hover:opacity-80"
                                        />
                                    </g>
                                ))}

                                {/* Animated Trend Line */}
                                <polyline
                                    points="40,80 80,60 120,90 160,50 200,70 240,55 280,75 320,60 360,40"
                                    fill="none"
                                    stroke="rgba(255,255,255,0.4)"
                                    strokeWidth="2"
                                    strokeDasharray="5,5"
                                    className="animate-pulse"
                                />
                            </svg>
                        </div>

                        {/* Content */}
                        <div className="relative z-10 text-center text-white">
                            <div className="mb-6 inline-block p-4 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/20">
                                <TrendingUp size={48} className="animate-pulse" />
                            </div>
                            <h2 className="text-4xl font-black mb-4 leading-tight">
                                {type === 'login' ? 'Welcome Back!' : 'Start Trading Smarter'}
                            </h2>
                            <p className="text-lg text-white/90 mb-6 max-w-md mx-auto leading-relaxed">
                                {type === 'login'
                                    ? 'Access your algorithmic trading dashboard and continue your journey to systematic profits.'
                                    : 'Join thousands of traders using AI-powered strategies to automate their trading success.'}
                            </p>

                            {/* Animated Stats */}
                            <div className="grid grid-cols-3 gap-4 mt-8">
                                {[
                                    { label: 'Active Users', value: '10K+', icon: Users },
                                    { label: 'Strategies', value: '500+', icon: Zap },
                                    { label: 'Uptime', value: '99.9%', icon: Shield }
                                ].map((stat, i) => (
                                    <div key={i} className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${i * 150}ms` }}>
                                        <stat.icon size={24} className="mx-auto mb-2 opacity-80" />
                                        <div className="text-2xl font-bold">{stat.value}</div>
                                        <div className="text-xs text-white/70">{stat.label}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Floating Particles */}
                        <div className="absolute top-10 left-10 w-2 h-2 bg-white/30 rounded-full animate-ping"></div>
                        <div className="absolute top-20 right-20 w-3 h-3 bg-white/20 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
                        <div className="absolute bottom-20 left-20 w-2 h-2 bg-white/25 rounded-full animate-ping" style={{ animationDelay: '2s' }}></div>
                    </div>

                    {/* Right Side - Auth Form */}
                    <div className="p-12 flex flex-col justify-center bg-white dark:bg-[#0a0a0f]">
                        <div className={`transition-all duration-500 ${isTransitioning ? 'opacity-0 translate-x-8' : 'opacity-100 translate-x-0'}`}>
                            <div className="mb-8">
                                <h3 className="text-3xl font-black text-zinc-900 dark:text-white mb-2">
                                    {type === 'login' ? 'Sign In' : 'Create Account'}
                                </h3>
                                <p className="text-zinc-500 dark:text-zinc-400">
                                    {type === 'login' ? 'Enter your credentials to access your dashboard' : 'Get started with your trading journey today'}
                                </p>
                            </div>

                            {error && (
                                <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm p-4 rounded-xl mb-6 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                                    <AlertCircle size={20} />
                                    <span>{error}</span>
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                                        Username
                                    </label>
                                    <div className="relative">
                                        <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                                        <input
                                            type="text"
                                            value={username}
                                            onChange={e => setUsername(e.target.value)}
                                            className="w-full bg-zinc-50 dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 pl-12 pr-4 py-3.5 rounded-xl text-zinc-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                                            placeholder="Enter your username"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                                        Password
                                    </label>
                                    <div className="relative">
                                        <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={password}
                                            onChange={e => setPassword(e.target.value)}
                                            className="w-full bg-zinc-50 dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 pl-12 pr-12 py-3.5 rounded-xl text-zinc-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                                            placeholder="Enter your password"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed group mt-6"
                                >
                                    {loading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <>
                                            <span>{type === 'login' ? 'Sign In' : 'Create Account'}</span>
                                            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </button>
                            </form>

                            <div className="mt-8 text-center">
                                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                    {type === 'login' ? "Don't have an account?" : "Already have an account?"}
                                    {' '}
                                    <button
                                        onClick={handleSwitch}
                                        className="text-blue-600 dark:text-blue-400 font-bold hover:underline transition-all"
                                    >
                                        {type === 'login' ? 'Sign Up' : 'Sign In'}
                                    </button>
                                </p>
                            </div>

                            {type === 'register' && (
                                <p className="mt-6 text-xs text-center text-zinc-400 dark:text-zinc-600">
                                    By signing up, you agree to our Terms of Service and Privacy Policy
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
