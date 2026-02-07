"use client";
import React, { useState, useEffect } from 'react';
import { fetchJson } from '@/lib/api';
import { toast } from 'sonner';
import { User, Lock, Key, Bell, CreditCard, Eye, EyeOff, Save, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Reusable Password Input
const PasswordInput = ({ label, value, onChange, placeholder }: { label: string, value: string, onChange: (e: any) => void, placeholder: string }) => {
    const [show, setShow] = useState(false);
    return (
        <div>
            <label className="text-xs uppercase text-zinc-500 font-bold block mb-1.5">{label}</label>
            <div className="relative">
                <input
                    type={show ? "text" : "password"}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-4 py-3 text-sm text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                />
                <button
                    onClick={() => setShow(!show)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1"
                >
                    {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
            </div>
        </div>
    );
};

export function MobileProfileSettingsView() {
    const [activeTab, setActiveTab] = useState<'security' | 'api' | 'notifications'>('security');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Form States
    const [profileData, setProfileData] = useState({
        username: '',
        email: '',
        phone: ''
    });

    const [securityData, setSecurityData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const [apiData, setApiData] = useState({
        angel_api_key: '',
        angel_client_code: '',
        angel_password: '',
        angel_totp: '',
        backtest_api_key: '',
        backtest_client_code: '',
        backtest_password: '',
        backtest_totp: ''
    });

    const [notificationData, setNotificationData] = useState({
        whatsapp_number: '',
        callmebot_api_key: ''
    });

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        setIsLoading(true);
        try {
            const data = await fetchJson('/get_profile');
            setProfileData({
                username: data.username || '',
                email: data.email || '',
                phone: data.phone || ''
            });

            setApiData({
                angel_api_key: data.angel_api_key || '',
                angel_client_code: data.angel_client_code || '',
                angel_password: data.angel_password || '',
                angel_totp: data.angel_totp || '',
                backtest_api_key: data.backtest_api_key || '',
                backtest_client_code: data.backtest_client_code || '',
                backtest_password: data.backtest_password || '',
                backtest_totp: data.backtest_totp || ''
            });

            setNotificationData({
                whatsapp_number: data.whatsapp_number || '',
                callmebot_api_key: data.callmebot_api_key || ''
            });
        } catch (error) {
            console.error('Failed to load profile:', error);
            toast.error('Failed to load profile data');
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateProfile = async () => {
        setIsSaving(true);
        try {
            await fetchJson('/update_profile', {
                method: 'POST',
                body: JSON.stringify({
                    email: profileData.email,
                    phone: profileData.phone
                })
            });
            toast.success('Profile updated successfully!');
        } catch (error: any) {
            toast.error(error.message || 'Failed to update profile');
        } finally {
            setIsSaving(false);
        }
    };

    const handleChangePassword = async () => {
        if (securityData.newPassword !== securityData.confirmPassword) {
            toast.error('New passwords do not match!');
            return;
        }
        if (securityData.newPassword.length < 6) {
            toast.error('Password must be at least 6 characters!');
            return;
        }

        setIsSaving(true);
        try {
            await fetchJson('/change_password', {
                method: 'POST',
                body: JSON.stringify({
                    current_password: securityData.currentPassword,
                    new_password: securityData.newPassword
                })
            });
            toast.success('Password changed successfully!');
            setSecurityData({
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            });
        } catch (error: any) {
            toast.error(error.message || 'Failed to change password');
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdateAPI = async () => {
        setIsSaving(true);
        try {
            await fetchJson('/update_profile', {
                method: 'POST',
                body: JSON.stringify(apiData)
            });
            toast.success('API credentials updated successfully!');
        } catch (error: any) {
            toast.error(error.message || 'Failed to update API credentials');
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdateNotifications = async () => {
        setIsSaving(true);
        try {
            await fetchJson('/update_profile', {
                method: 'POST',
                body: JSON.stringify(notificationData)
            });
            toast.success('Notification settings updated!');
        } catch (error: any) {
            toast.error(error.message || 'Failed to update notifications');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="animate-spin text-zinc-400" size={24} />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-zinc-50 dark:bg-zinc-950">
            {/* Header / Tabs */}
            <div className="sticky top-0 z-10 bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 shadow-sm shrink-0">
                <div className="flex items-center px-4 overflow-x-auto no-scrollbar gap-2 py-3">
                    {[
                        { id: 'security', label: 'Security', icon: Lock },
                        { id: 'api', label: 'API Keys', icon: Key },
                        { id: 'notifications', label: 'Alerts', icon: Bell },
                    ].map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                                    isActive
                                        ? "bg-blue-500 text-white shadow-lg shadow-blue-500/25"
                                        : "bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-transparent dark:border-zinc-800"
                                )}
                            >
                                <Icon size={14} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Content Area - Scrollable */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-24">

                {/* SECURITY TAB */}
                {activeTab === 'security' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">

                        {/* Profile Info */}
                        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
                            <h3 className="text-base font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                                <User className="text-blue-500" size={18} />
                                Profile Details
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs uppercase text-zinc-500 font-bold block mb-1.5">Username</label>
                                    <input
                                        type="text"
                                        value={profileData.username}
                                        disabled
                                        className="w-full bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-lg px-4 py-3 text-sm text-zinc-500 cursor-not-allowed"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs uppercase text-zinc-500 font-bold block mb-1.5">Email</label>
                                    <input
                                        type="email"
                                        value={profileData.email}
                                        onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-4 py-3 text-sm text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                        placeholder="your@email.com"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs uppercase text-zinc-500 font-bold block mb-1.5">Phone</label>
                                    <input
                                        type="tel"
                                        value={profileData.phone}
                                        onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-4 py-3 text-sm text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                        placeholder="+1234567890"
                                    />
                                </div>
                                <button
                                    onClick={handleUpdateProfile}
                                    disabled={isSaving}
                                    className="w-full flex items-center justify-center gap-2 bg-zinc-900 dark:bg-white text-white dark:text-black py-3 rounded-xl font-bold active:scale-95 transition-all disabled:opacity-50"
                                >
                                    {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                                    Update Profile
                                </button>
                            </div>
                        </div>

                        {/* Password Change */}
                        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
                            <h3 className="text-base font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                                <Lock className="text-orange-500" size={18} />
                                Change Password
                            </h3>
                            <div className="space-y-4">
                                <PasswordInput
                                    label="Current Password"
                                    value={securityData.currentPassword}
                                    onChange={(e) => setSecurityData({ ...securityData, currentPassword: e.target.value })}
                                    placeholder="Enter current password"
                                />
                                <PasswordInput
                                    label="New Password"
                                    value={securityData.newPassword}
                                    onChange={(e) => setSecurityData({ ...securityData, newPassword: e.target.value })}
                                    placeholder="Enter new password"
                                />
                                <PasswordInput
                                    label="Confirm Password"
                                    value={securityData.confirmPassword}
                                    onChange={(e) => setSecurityData({ ...securityData, confirmPassword: e.target.value })}
                                    placeholder="Confirm new password"
                                />
                                <button
                                    onClick={handleChangePassword}
                                    disabled={isSaving}
                                    className="w-full flex items-center justify-center gap-2 bg-orange-500 text-white py-3 rounded-xl font-bold active:scale-95 transition-all disabled:opacity-50 shadow-lg shadow-orange-500/20"
                                >
                                    {isSaving ? <Loader2 className="animate-spin" size={18} /> : 'Change Password'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* API KEYS TAB */}
                {activeTab === 'api' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">

                        {/* Angel One */}
                        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                            <h3 className="text-base font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                                <div className="w-6 h-6 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-bold">A</div>
                                Angel One Trading API
                            </h3>
                            <div className="space-y-4">
                                <PasswordInput
                                    label="API Key"
                                    value={apiData.angel_api_key}
                                    onChange={(e) => setApiData({ ...apiData, angel_api_key: e.target.value })}
                                    placeholder="Enter API Key"
                                />
                                <div>
                                    <label className="text-xs uppercase text-zinc-500 font-bold block mb-1.5">Client Code</label>
                                    <input
                                        type="text"
                                        value={apiData.angel_client_code}
                                        onChange={(e) => setApiData({ ...apiData, angel_client_code: e.target.value })}
                                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-4 py-3 text-sm text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                        placeholder="Enter Client Code"
                                    />
                                </div>
                                <PasswordInput
                                    label="Password"
                                    value={apiData.angel_password}
                                    onChange={(e) => setApiData({ ...apiData, angel_password: e.target.value })}
                                    placeholder="Enter Password"
                                />
                                <PasswordInput
                                    label="TOTP Secret"
                                    value={apiData.angel_totp}
                                    onChange={(e) => setApiData({ ...apiData, angel_totp: e.target.value })}
                                    placeholder="Enter TOTP Secret"
                                />
                            </div>
                        </div>

                        {/* Backtest API */}
                        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                            <h3 className="text-base font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                                <div className="w-6 h-6 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs font-bold">B</div>
                                Backtest API
                            </h3>
                            <div className="space-y-4">
                                <PasswordInput
                                    label="API Key"
                                    value={apiData.backtest_api_key}
                                    onChange={(e) => setApiData({ ...apiData, backtest_api_key: e.target.value })}
                                    placeholder="Enter API Key"
                                />
                                <div>
                                    <label className="text-xs uppercase text-zinc-500 font-bold block mb-1.5">Client Code</label>
                                    <input
                                        type="text"
                                        value={apiData.backtest_client_code}
                                        onChange={(e) => setApiData({ ...apiData, backtest_client_code: e.target.value })}
                                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-4 py-3 text-sm text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                                        placeholder="Enter Client Code"
                                    />
                                </div>
                                <PasswordInput
                                    label="Password"
                                    value={apiData.backtest_password}
                                    onChange={(e) => setApiData({ ...apiData, backtest_password: e.target.value })}
                                    placeholder="Enter Password"
                                />
                                <PasswordInput
                                    label="TOTP Secret"
                                    value={apiData.backtest_totp}
                                    onChange={(e) => setApiData({ ...apiData, backtest_totp: e.target.value })}
                                    placeholder="Enter TOTP Secret"
                                />
                            </div>
                        </div>

                        {/* Save Button */}
                        <button
                            onClick={handleUpdateAPI}
                            disabled={isSaving}
                            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-xl font-bold active:scale-95 transition-all disabled:opacity-50 shadow-lg shadow-blue-500/25 mt-4"
                        >
                            {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                            Save Credentials
                        </button>
                    </div>
                )}

                {/* NOTIFICATIONS TAB */}
                {activeTab === 'notifications' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
                            <h3 className="text-base font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                                <Bell className="text-purple-500" size={18} />
                                Alert Configuration
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs uppercase text-zinc-500 font-bold block mb-1.5">WhatsApp Number</label>
                                    <input
                                        type="tel"
                                        value={notificationData.whatsapp_number}
                                        onChange={(e) => setNotificationData({ ...notificationData, whatsapp_number: e.target.value })}
                                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-4 py-3 text-sm text-zinc-900 dark:text-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all"
                                        placeholder="e.g. +919876543210"
                                    />
                                    <p className="text-xs text-zinc-500 mt-1">Include country code</p>
                                </div>
                                <PasswordInput
                                    label="CallMeBot API Key"
                                    value={notificationData.callmebot_api_key}
                                    onChange={(e) => setNotificationData({ ...notificationData, callmebot_api_key: e.target.value })}
                                    placeholder="Enter API Key from Telegram"
                                />
                                <button
                                    onClick={handleUpdateNotifications}
                                    disabled={isSaving}
                                    className="w-full flex items-center justify-center gap-2 bg-purple-600 text-white py-3 rounded-xl font-bold active:scale-95 transition-all disabled:opacity-50 shadow-lg shadow-purple-500/25"
                                >
                                    {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                                    Save Setup
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
