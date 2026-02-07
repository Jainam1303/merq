"use client";
import React from 'react';
import { CreditCard, Check, Crown, Zap, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Plan {
    id: string;
    name: string;
    price: number;
    duration_days: number;
    features: string[] | string;
}

interface CurrentPlan {
    name: string;
    price: number;
    duration_days: number;
    start_date?: string;
    end_date?: string;
}

interface MobilePlansViewProps {
    plans?: Plan[];
    currentPlan?: CurrentPlan | null;
    onSubscribe?: (planId: string) => void;
}

export function MobilePlansView({
    plans = [],
    currentPlan = null,
    onSubscribe
}: MobilePlansViewProps) {
    // Ensure plans is always an array
    const safePlans = Array.isArray(plans) ? plans : [];

    const getDurationLabel = (days: number, price: number) => {
        if (days === 90) return '/ 3 Months';
        if (days === 180) return '/ 6 Months';
        if (days === 365 && price > 0) return '/ Year';
        return '/ Month';
    };

    const getPlanIcon = (planName: string) => {
        const name = planName.toLowerCase();
        if (name.includes('premium') || name.includes('pro')) return Crown;
        if (name.includes('basic') || name.includes('starter')) return Zap;
        return Star;
    };

    const parseFeatures = (features: string[] | string): string[] => {
        if (Array.isArray(features)) return features;
        try {
            return JSON.parse(features);
        } catch {
            return [];
        }
    };

    return (
        <div className="flex flex-col h-full bg-zinc-50 dark:bg-zinc-950 overflow-y-auto p-4 space-y-4 pb-24">
            {/* Header */}
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200 dark:border-purple-800/50 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-2">
                    <CreditCard className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Plans</h2>
                </div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Choose the perfect plan for your trading needs
                </p>
            </div>

            {/* Current Plan */}
            {currentPlan && (
                <div className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border-2 border-blue-500/30 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                            <Crown className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Current Plan</p>
                            <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{currentPlan.name}</p>
                        </div>
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-2xl font-black text-zinc-900 dark:text-white">
                                ₹{currentPlan.price}
                                <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                                    {getDurationLabel(currentPlan.duration_days, currentPlan.price)}
                                </span>
                            </p>
                        </div>
                        {currentPlan.end_date && (
                            <div className="text-right">
                                <p className="text-xs text-zinc-500 dark:text-zinc-400">Valid until</p>
                                <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                                    {new Date(currentPlan.end_date).toLocaleDateString()}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Available Plans */}
            <div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-3">
                    {currentPlan ? 'Upgrade or Change Plan' : 'Available Plans'}
                </h3>
                <div className="space-y-3">
                    {safePlans.map((plan) => {
                        const Icon = getPlanIcon(plan.name);
                        const features = parseFeatures(plan.features);
                        const isCurrentPlan = currentPlan?.name === plan.name;
                        const isPremium = plan.name.toLowerCase().includes('premium') || plan.name.toLowerCase().includes('pro');

                        return (
                            <div
                                key={plan.id}
                                className={cn(
                                    "bg-white dark:bg-zinc-900 border-2 rounded-xl p-5 transition-all",
                                    isCurrentPlan
                                        ? "border-blue-500 ring-2 ring-blue-500/20"
                                        : isPremium
                                            ? "border-purple-500/30"
                                            : "border-zinc-200 dark:border-zinc-800"
                                )}
                            >
                                {/* Plan Header */}
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-10 h-10 rounded-full flex items-center justify-center",
                                            isPremium
                                                ? "bg-gradient-to-br from-purple-500 to-pink-500"
                                                : "bg-gradient-to-br from-blue-500 to-cyan-500"
                                        )}>
                                            <Icon className="w-5 h-5 text-white" />
                                        </div>
                                        <div>
                                            <h4 className="text-lg font-bold text-zinc-900 dark:text-white">
                                                {plan.name}
                                            </h4>
                                            <p className="text-xs text-zinc-500">
                                                {getDurationLabel(plan.duration_days, plan.price).replace('/ ', '')}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-2xl font-black text-zinc-900 dark:text-white">
                                            ₹{plan.price}
                                        </p>
                                        <p className="text-xs text-zinc-500">
                                            {getDurationLabel(plan.duration_days, plan.price)}
                                        </p>
                                    </div>
                                </div>

                                {/* Features */}
                                <ul className="space-y-2 mb-4">
                                    {features.slice(0, 5).map((feature, idx) => (
                                        <li key={idx} className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                                            <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                            <span>{feature}</span>
                                        </li>
                                    ))}
                                    {features.length > 5 && (
                                        <li className="text-xs text-zinc-500 italic">
                                            +{features.length - 5} more features
                                        </li>
                                    )}
                                </ul>

                                {/* Subscribe Button */}
                                <button
                                    onClick={() => onSubscribe?.(plan.id)}
                                    disabled={isCurrentPlan}
                                    className={cn(
                                        "w-full py-3 rounded-lg font-bold text-sm transition-all",
                                        isCurrentPlan
                                            ? "bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 cursor-not-allowed"
                                            : isPremium
                                                ? "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white active:scale-95"
                                                : "bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white active:scale-95"
                                    )}
                                >
                                    {isCurrentPlan ? 'Current Plan' : 'Subscribe Now'}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Info Card */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-xl p-4">
                <p className="text-sm text-blue-700 dark:text-blue-400">
                    💡 <strong>Note:</strong> All plans include access to our algorithmic trading engine,
                    real-time market data, and 24/7 support.
                </p>
            </div>
        </div>
    );
}
