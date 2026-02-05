"use client";

import { useState } from "react";
import { toast } from "sonner";
import { fetchJson } from "@/lib/api";

export function TestOrderPanel() {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        symbol: "IGL-EQ",
        qty: 1,
        orderType: "BUY",
        price: "",
        tp: "",
        sl: ""
    });
    const [result, setResult] = useState<any>(null);

    const availableSymbols = [
        "IGL-EQ",
        "INFY-EQ",
        "RELIANCE-EQ",
        "TCS-EQ",
        "HDFCBANK-EQ",
        "SBIN-EQ",
        "ICICIBANK-EQ",
        "KOTAKBANK-EQ",
        "AXISBANK-EQ",
        "TATAMOTORS-EQ"
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.symbol || !formData.qty) {
            toast.error("Symbol and Quantity are required");
            return;
        }

        setLoading(true);
        setResult(null);

        try {
            const response = await fetchJson('/test/test_order', {
                method: 'POST',
                body: JSON.stringify({
                    symbol: formData.symbol,
                    qty: parseInt(formData.qty.toString()),
                    orderType: formData.orderType,
                    price: formData.price ? parseFloat(formData.price) : null,
                    tp: formData.tp ? parseFloat(formData.tp) : null,
                    sl: formData.sl ? parseFloat(formData.sl) : null
                })
            });

            setResult(response.data);

            if (response.success) {
                toast.success(`✅ Order Placed! ID: ${response.data.orderId}`);
            } else {
                toast.error(`❌ Order Failed: ${response.message}`);
            }
        } catch (error: any) {
            console.error('Test order error:', error);
            toast.error(error.message || "Failed to place test order");
            setResult({ error: error.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
            <div className="mb-6">
                <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2">
                    🧪 Test Order Execution
                </h2>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Directly place test orders via Angel Smart API to verify connectivity and credentials
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Symbol Selection */}
                <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                        Symbol *
                    </label>
                    <select
                        value={formData.symbol}
                        onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                        className="w-full px-4 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                    >
                        {availableSymbols.map(sym => (
                            <option key={sym} value={sym}>{sym.replace('-EQ', '')}</option>
                        ))}
                    </select>
                </div>

                {/* Quantity */}
                <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                        Quantity *
                    </label>
                    <input
                        type="number"
                        min="1"
                        max="100"
                        value={formData.qty}
                        onChange={(e) => setFormData({ ...formData, qty: parseInt(e.target.value) || 1 })}
                        className="w-full px-4 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                    />
                </div>

                {/* Order Type */}
                <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                        Order Type *
                    </label>
                    <div className="flex gap-4">
                        <button
                            type="button"
                            onClick={() => setFormData({ ...formData, orderType: 'BUY' })}
                            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${formData.orderType === 'BUY'
                                ? 'bg-green-600 text-white'
                                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                                }`}
                        >
                            BUY
                        </button>
                        <button
                            type="button"
                            onClick={() => setFormData({ ...formData, orderType: 'SELL' })}
                            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${formData.orderType === 'SELL'
                                ? 'bg-red-600 text-white'
                                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                                }`}
                        >
                            SELL
                        </button>
                    </div>
                </div>

                {/* Optional: Limit Price */}
                <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                        Limit Price (Optional - Leave blank for Market Order)
                    </label>
                    <input
                        type="number"
                        step="0.01"
                        placeholder="e.g., 289.50"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        className="w-full px-4 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>

                {/* Optional: TP/SL */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                            Take Profit (Optional)
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            placeholder="TP Price"
                            value={formData.tp}
                            onChange={(e) => setFormData({ ...formData, tp: e.target.value })}
                            className="w-full px-4 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                            Stop Loss (Optional)
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            placeholder="SL Price"
                            value={formData.sl}
                            onChange={(e) => setFormData({ ...formData, sl: e.target.value })}
                            className="w-full px-4 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                </div>

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-400 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                    {loading ? (
                        <>
                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                            Executing...
                        </>
                    ) : (
                        'Execute Test Order'
                    )}
                </button>
            </form>

            {/* Result Display */}
            {result && (
                <div className="mt-6 p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700">
                    <h3 className="font-semibold text-zinc-900 dark:text-white mb-2">
                        {result.success ? '✅ Order Result' : '❌ Error Details'}
                    </h3>
                    <pre className="text-xs text-zinc-700 dark:text-zinc-300 overflow-auto max-h-96">
                        {JSON.stringify(result, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    );
}
