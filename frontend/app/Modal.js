"use client";
import { X, FileText } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';

export function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirm", cancelText = "Cancel", type = "danger" }) {
    if (!isOpen) return null;

    const typeColors = {
        danger: 'bg-red-500 hover:bg-red-600',
        success: 'bg-emerald-500 hover:bg-emerald-600',
        warning: 'bg-yellow-500 hover:bg-yellow-600',
        info: 'bg-blue-500 hover:bg-blue-600'
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-[#18181b] rounded-2xl shadow-2xl border border-zinc-200 dark:border-[#27272a] max-w-md w-full mx-4 animate-scale-in">
                <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                        <h3 className="text-lg font-bold text-zinc-900 dark:text-white">{title}</h3>
                        <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
                            <X size={20} />
                        </button>
                    </div>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">{message}</p>
                    <div className="flex gap-3 justify-end">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg font-medium text-sm bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={() => {
                                onConfirm();
                                onClose();
                            }}
                            className={`px-4 py-2 rounded-lg font-medium text-sm text-white transition-colors ${typeColors[type]}`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function PromptDialog({ isOpen, onClose, onConfirm, title, message, defaultValue = "", placeholder = "", inputType = "number" }) {
    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        const value = e.target.elements.input.value;
        if (value) {
            onConfirm(value);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-[#18181b] rounded-2xl shadow-2xl border border-zinc-200 dark:border-[#27272a] max-w-md w-full mx-4 animate-scale-in">
                <form onSubmit={handleSubmit} className="p-6">
                    <div className="flex items-start justify-between mb-4">
                        <h3 className="text-lg font-bold text-zinc-900 dark:text-white">{title}</h3>
                        <button type="button" onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
                            <X size={20} />
                        </button>
                    </div>
                    {message && <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">{message}</p>}
                    <input
                        type={inputType}
                        name="input"
                        defaultValue={defaultValue}
                        placeholder={placeholder}
                        step="any"
                        autoFocus
                        className="w-full bg-zinc-50 dark:bg-[#09090b] border border-zinc-200 dark:border-[#27272a] rounded-lg px-4 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500 mb-6"
                    />
                    <div className="flex gap-3 justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg font-medium text-sm bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 rounded-lg font-medium text-sm bg-emerald-500 hover:bg-emerald-600 text-white transition-colors"
                        >
                            Confirm
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export function RiskDisclosureModal({ isOpen, onAccept, onReject }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in">
            <div className="bg-white dark:bg-[#18181b] rounded-2xl shadow-2xl border border-zinc-200 dark:border-[#27272a] max-w-lg w-full mx-4 animate-scale-in overflow-hidden">
                <div className="p-6 border-b border-zinc-200 dark:border-[#27272a]">
                    <div className="flex items-center gap-2 mb-1">
                        <FileText className="text-zinc-900 dark:text-white" size={24} />
                        <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Risk disclosures on derivatives</h3>
                    </div>
                </div>

                <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
                    <ul className="space-y-4">
                        <li className="flex gap-3 text-sm text-zinc-700 dark:text-zinc-300">
                            <div className="w-1.5 h-1.5 rounded-full bg-zinc-400 mt-2 shrink-0"></div>
                            <span>9 out of 10 individual traders in equity Futures and Options Segment, incurred net losses.</span>
                        </li>
                        <li className="flex gap-3 text-sm text-zinc-700 dark:text-zinc-300">
                            <div className="w-1.5 h-1.5 rounded-full bg-zinc-400 mt-2 shrink-0"></div>
                            <span>On an average, loss makers registered net trading loss close to ₹50,000.</span>
                        </li>
                        <li className="flex gap-3 text-sm text-zinc-700 dark:text-zinc-300">
                            <div className="w-1.5 h-1.5 rounded-full bg-zinc-400 mt-2 shrink-0"></div>
                            <span>Over and above the net trading losses incurred, loss makers expended an additional 28% of net trading losses as transaction costs.</span>
                        </li>
                        <li className="flex gap-3 text-sm text-zinc-700 dark:text-zinc-300">
                            <div className="w-1.5 h-1.5 rounded-full bg-zinc-400 mt-2 shrink-0"></div>
                            <span>Those making net trading profits, incurred between 15% to 50% of such profits as transaction cost.</span>
                        </li>
                    </ul>

                    <p className="text-xs text-zinc-500 leading-relaxed mt-4">
                        Source: <a href="https://www.sebi.gov.in" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">SEBI</a> study dated January 25, 2023 on "Analysis of Profit and Loss of Individual Traders dealing in equity Futures and Options (F&O) Segment", wherein Aggregate Level findings are based on annual Profit/Loss incurred by individual traders in equity F&O during FY 2021-22.
                    </p>
                </div>

                <div className="p-6 border-t border-zinc-200 dark:border-[#27272a] bg-zinc-50 dark:bg-[#121214] flex justify-end">
                    <div className="flex gap-3">
                        <button
                            onClick={onReject}
                            className="px-6 py-2 rounded-lg font-bold text-sm bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-all border border-zinc-300 dark:border-zinc-700"
                        >
                            Decline
                        </button>
                        <button
                            onClick={onAccept}
                            className="px-6 py-2 rounded-lg font-bold text-sm bg-blue-600 hover:bg-blue-500 text-white shadow-lg hover:shadow-blue-500/25 transition-all"
                        >
                            Accept
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
