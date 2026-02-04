"use client";
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { io } from 'socket.io-client';
import { Play, Square, Activity, Terminal, DollarSign, Database, Check, X, Search, Zap, ArrowRight, Github, Twitter, BarChart3, Shield, Moon, Sun, User as UserIcon, LogOut, History, AlertTriangle, BookOpen, Trash2, Download, Filter, Eye, EyeOff, Menu, Info, Upload, ShieldAlert, TrendingUp, TrendingDown } from 'lucide-react';
import { ToastContainer } from './Toast';
import { ConfirmDialog, PromptDialog, RiskDisclosureModal } from './Modal';
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { BacktestHistory } from "@/components/dashboard/BacktestHistory";
import { MobileDashboard } from "@/components/mobile";

// Dynamic Razorpay script loading (like startup project)
const loadRazorpayScript = async () => {
  if (typeof window === 'undefined') return;
  if (window.Razorpay) return; // Already loaded

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Razorpay'));
    document.body.appendChild(script);
  });
};

const PasswordInput = ({ label, value, onChange, placeholder, color = "emerald" }) => {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="text-[10px] uppercase text-zinc-500 font-bold block mb-1">{label}</label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`w-full bg-zinc-50 dark:bg-[#18181b] border border-zinc-200 dark:border-[#27272a] rounded px-3 py-2 text-xs text-zinc-900 dark:text-white focus:border-${color}-500 focus:outline-none pr-8`}
        />
        <button
          onClick={() => setShow(!show)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
        >
          {show ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
    </div>
  );
};

import { Calendar as CalendarIcon } from 'lucide-react';

const CustomDateInput = ({ value, onChange, placeholder }) => {
  const dateInputRef = useRef(null);

  const formatDate = (iso) => {
    if (!iso) return placeholder;
    const [y, m, d] = iso.split('-');
    return `${d}-${m}-${y}`;
  };

  const handleClick = () => {
    if (dateInputRef.current) {
      if (dateInputRef.current.showPicker) {
        dateInputRef.current.showPicker();
      } else {
        dateInputRef.current.focus();
      }
    }
  };

  return (
    <div onClick={handleClick} className="relative group cursor-pointer bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-700 rounded px-2 py-1.5 flex items-center gap-2 hover:border-zinc-400 dark:hover:border-zinc-500 transition-colors w-[100px] h-[32px]">
      <CalendarIcon size={14} className="text-zinc-500 shrink-0" />
      <span className={`text-xs ${value ? 'text-zinc-900 dark:text-white font-medium' : 'text-zinc-400'} truncate select-none`}>
        {formatDate(value)}
      </span>
      <input
        ref={dateInputRef}
        type="date"
        value={value}
        onChange={onChange}
        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full appearance-none z-10"
      />
    </div>
  );
};

const CustomDateTimeInput = ({ value, onChange, placeholder }) => {
  const dateTimeInputRef = useRef(null);

  const formatDateTime = (val) => {
    if (!val) return placeholder;
    // Expect format: YYYY-MM-DDTHH:MM or YYYY-MM-DD HH:MM
    // Simple check and format
    const [datePart, timePart] = val.replace('T', ' ').split(' ');
    if (!datePart) return val;
    const [y, m, d] = datePart.split('-');
    return `${d}-${m}-${y} ${timePart || ''}`;
  };

  const handleClick = () => {
    if (dateTimeInputRef.current) {
      if (dateTimeInputRef.current.showPicker) {
        dateTimeInputRef.current.showPicker();
      } else {
        dateTimeInputRef.current.focus();
      }
    }
  };

  return (
    <div onClick={handleClick} className="relative group cursor-pointer bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-700 rounded px-3 py-1.5 flex items-center gap-2 hover:border-zinc-400 dark:hover:border-zinc-500 transition-colors h-[42px] w-full">
      <CalendarIcon size={14} className="text-zinc-500 shrink-0" />
      <span className={`text-sm ${value ? 'text-zinc-900 dark:text-white font-medium' : 'text-zinc-400'} truncate select-none`}>
        {formatDateTime(value)}
      </span>
      <input
        ref={dateTimeInputRef}
        type="datetime-local"
        value={value}
        onChange={onChange}
        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full appearance-none z-10"
      />
    </div>
  );
};

const InstrumentSearch = ({ onAdd }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const search = async () => {
    if (!query) return;
    setLoading(true);
    try {
      const res = await fetchJson(`/search_scrip?q=${query}`);
      setResults(res);
    } catch (e) { }
    setLoading(false);
  };

  return (
    <div className="space-y-2 mb-4">
      <label className="text-[10px] uppercase text-zinc-500 font-bold block">Add Instrument</label>
      <div className="flex gap-2">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && search()}
          placeholder="Search (e.g. Nifty 24000)"
          className="flex-1 bg-zinc-50 dark:bg-[#18181b] border border-zinc-200 dark:border-[#27272a] rounded px-3 py-2 text-xs focus:outline-none focus:border-emerald-500 text-zinc-900 dark:text-white min-h-[42px]"
        />
        <button onClick={search} disabled={loading} className="px-3 py-2 bg-zinc-200 dark:bg-zinc-800 rounded text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-700 min-h-[42px]">{loading ? '...' : <Search size={14} />}</button>
      </div>
      {results.length > 0 && (
        <div className="max-h-40 overflow-y-auto bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-[#27272a] rounded shadow-lg text-xs absolute z-10 w-64">
          {results.map(r => (
            <div key={r.token} onClick={() => { onAdd(r); setResults([]); setQuery(''); }} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer flex justify-between border-b border-zinc-100 dark:border-zinc-800 last:border-0 text-zinc-900 dark:text-white">
              <span className="font-bold">{r.symbol}</span>
              <span className="text-zinc-500 text-[10px] bg-zinc-100 dark:bg-zinc-900 px-1 rounded">{r.exchange}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
// Use Next.js API proxy to solve cookie/CORS issues
const API_BASE = "/api";  // Proxy to Flask backend

const fetchJson = async (endpoint, options = {}) => {
  try {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;

    const finalOptions = { ...options, credentials: 'include' };
    if (options.body && !finalOptions.headers) {
      finalOptions.headers = { 'Content-Type': 'application/json' };
    } else if (options.body) {
      finalOptions.headers = { ...finalOptions.headers, 'Content-Type': 'application/json' };
    }

    const res = await fetch(url, finalOptions);

    const contentType = res.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") === -1) {
      const text = await res.text();
      console.error("Received non-JSON response:", text.substring(0, 500));
      throw new Error("Server Error: Received HTML instead of JSON. Check Backend Logs.");
    }

    if (!res.ok) {
      if (res.status === 403 && (endpoint.includes('check_auth') || endpoint.includes('status'))) {
        // Silent fail for auth checks if not logged in
        return null;
      }
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || `API Error ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    // Don't log expected auth check failures
    if (endpoint.includes('check_auth') || endpoint.includes('status')) return null;

    console.error("Fetch JSON failed:", err);
    throw err;
  }
};

const MOCK_TICKERS = [
  { symbol: "NIFTY 50", price: "24,350.50", change: "+0.45%" },
  { symbol: "BANKNIFTY", price: "52,100.20", change: "-0.12%" },
  { symbol: "RELIANCE", price: "3,040.00", change: "+1.20%" },
  { symbol: "HDFCBANK", price: "1,650.00", change: "+0.80%" },
  { symbol: "INFY", price: "1,890.90", change: "-0.50%" },
];

const TESTIMONIALS = [
  { name: "Samantha Johnson", role: "CEO, TechFlow", text: "Exceeded our expectations with innovative designs that brought our vision to life - a truly remarkable creative agency.", initials: "SJ", img: "" },
  { name: "Michael Roberts", role: "Fund Manager", text: "The execution speed and reliability be unmatched. We've been running our strategies for 2 years with 99.9% uptime.", initials: "MR", img: "" },
  { name: "Isabella Rodriguez", role: "Founder, Alpha", text: "Their ability to capture our brand essence in every project is unparalleled - an invaluable creative collaborator.", initials: "IR", img: "" },
  { name: "John Peter", role: "Co-founder, Beta", text: "Their team's artistic flair and strategic approach resulted in remarkable campaigns - a reliable creative partner.", initials: "JP", img: "" },
  { name: "Emily Johnson", role: "Retail Investor", text: "Finally, professional-grade trading tools accessible to everyone. The backtesting feature saved me from costly mistakes.", initials: "EJ", img: "" },
  { name: "David Kim", role: "Algo Trader", text: "The API latency is incredibly low. I've switched all my high-frequency strategies to this platform.", initials: "DK", img: "" },
  { name: "Sarah Chen", role: "Pro Trader", text: "MerQPrime transformed my trading. The AI strategy builder helped me create profitable algorithms without writing a single line of code.", initials: "SC", img: "" },
  { name: "Natalie Martinez", role: "Director, Gamma", text: "From concept to execution, their creativity knows no bounds - a game-changer for our brand's success.", initials: "NM", img: "" },
];

function TickerMarquee() {
  return (
    <div className="w-full border-y border-zinc-200 dark:border-white/5 py-3 overflow-hidden flex relative z-20 backdrop-blur-sm bg-white/50 dark:bg-black/50">
      <div className="flex animate-marquee whitespace-nowrap gap-12 items-center">
        {[...MOCK_TICKERS, ...MOCK_TICKERS, ...MOCK_TICKERS].map((t, i) => (
          <div key={i} className="flex items-center gap-3 text-sm font-mono">
            <span className="font-bold text-zinc-800 dark:text-white">{t.symbol}</span>
            <span className="text-zinc-500 dark:text-zinc-400">{t.price}</span>
            <span className={`${t.change.startsWith('+') ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>{t.change}</span>
          </div>
        ))}
      </div>
      <div className="absolute top-0 left-0 h-full w-24 bg-gradient-to-r from-white dark:from-[#09090b] to-transparent pointer-events-none opacity-50"></div>
      <div className="absolute top-0 right-0 h-full w-24 bg-gradient-to-l from-white dark:from-[#09090b] to-transparent pointer-events-none opacity-50"></div>
    </div>
  );
}

function ProfileModal({ isOpen, onClose, user, addToast }) {
  const [activeTab, setActiveTab] = useState('security');
  const [profile, setProfile] = useState(null);
  const [plans, setPlans] = useState([]);
  const [saving, setSaving] = useState(false);
  // const [message, setMessage] = useState({ type: '', text: '' });

  const [securityData, setSecurityData] = useState({
    username: '',
    email: '',
    phone: '',
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
    backtest_password: '',
    backtest_totp: ''
  });

  const [notificationData, setNotificationData] = useState({
    whatsapp_number: '',
    callmebot_api_key: ''
  });

  useEffect(() => {
    if (isOpen) {
      loadProfile();
      loadPlans();
    }
  }, [isOpen]);

  const loadProfile = async () => {
    try {
      const data = await fetchJson('/get_profile');
      setProfile(data);
      setSecurityData({
        username: data.username || '',
        email: data.email || '',
        phone: data.phone || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
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
    }
  };

  const loadPlans = async () => {
    try {
      const data = await fetchJson('/plans');
      setPlans(data);
    } catch (error) {
      console.error('Failed to load plans:', error);
    }
  };

  const showMessage = (type, text) => {
    // setMessage({ type, text });
    // setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    addToast(text, type);
  };

  const handleUpdateProfile = async () => {
    setSaving(true);
    try {
      await fetchJson('/update_profile', {
        method: 'POST',
        body: JSON.stringify({
          email: securityData.email,
          phone: securityData.phone
        })
      });
      showMessage('success', 'Profile updated successfully!');
    } catch (error) {
      showMessage('error', error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (securityData.newPassword !== securityData.confirmPassword) {
      showMessage('error', 'New passwords do not match!');
      return;
    }
    if (securityData.newPassword.length < 6) {
      showMessage('error', 'Password must be at least 6 characters!');
      return;
    }

    setSaving(true);
    try {
      await fetchJson('/change_password', {
        method: 'POST',
        body: JSON.stringify({
          current_password: securityData.currentPassword,
          new_password: securityData.newPassword
        })
      });
      showMessage('success', 'Password changed successfully!');
      setSecurityData({
        ...securityData,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      showMessage('error', error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateNotifications = async () => {
    setSaving(true);
    try {
      await fetchJson('/update_profile', {
        method: 'POST',
        body: JSON.stringify(notificationData)
      });
      showMessage('success', 'Notification settings updated!');
    } catch (error) {
      showMessage('error', error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateAPI = async () => {
    setSaving(true);
    try {
      await fetchJson('/update_profile', {
        method: 'POST',
        body: JSON.stringify(apiData)
      });
      showMessage('success', 'API credentials updated successfully!');
      onClose(); // Auto-close modal since Toast is now global
    } catch (error) {
      showMessage('error', error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSubscribePlan = async (planId) => {
    try {
      // Step 1: Load Razorpay script dynamically (like startup project)
      await loadRazorpayScript();

      // Step 2: Create Razorpay order from backend
      const orderData = await fetchJson('/razorpay/create_order', {
        method: 'POST',
        body: JSON.stringify({ plan_id: planId })
      });

      if (orderData.status !== 'success') {
        showMessage('error', orderData.message || 'Failed to create order');
        return;
      }

      // Step 3: IMPORTANT - Close the ProfileModal BEFORE opening Razorpay
      // This avoids z-index conflicts between modals
      onClose();

      // Step 4: Configure Razorpay options
      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'MerQPrime',
        description: `${orderData.plan.name} Plan - ${orderData.plan.duration_days} Days`,
        image: 'https://i.imgur.com/n5tjHFD.png',
        order_id: orderData.order_id,
        prefill: {
          name: orderData.user.name,
          email: orderData.user.email,
          contact: orderData.user.phone
        },
        notes: {
          plan_name: orderData.plan.name,
          plan_duration: orderData.plan.duration_days + ' Days'
        },
        theme: {
          color: '#3B82F6'
        },
        modal: {
          backdropclose: false,
          escape: true,
          confirm_close: true,
          ondismiss: function () {
            showMessage('info', 'Payment cancelled');
          }
        },
        handler: async function (response) {
          // Step 5: Verify payment on backend
          try {
            const verifyResult = await fetchJson('/razorpay/verify_payment', {
              method: 'POST',
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                plan_id: planId
              })
            });

            if (verifyResult.status === 'success') {
              showMessage('success', verifyResult.message);
              // Optionally refresh the page or update user state
              window.location.reload();
            } else {
              showMessage('error', verifyResult.message || 'Payment verification failed');
            }
          } catch (verifyError) {
            showMessage('error', 'Payment verification failed: ' + verifyError.message);
          }
        }
      };

      // Step 6: Open Razorpay popup
      const razorpay = new window.Razorpay(options);
      razorpay.on('payment.failed', function (response) {
        showMessage('error', `Payment failed: ${response.error.description}`);
      });
      razorpay.open();

      // Step 7: Force container and iframe to use OUR sizes (override element.style)
      const fixRazorpaySize = () => {
        const container = document.querySelector('.razorpay-container');
        const frame = document.querySelector('.razorpay-checkout-frame');
        const backdrop = document.querySelector('.razorpay-backdrop');

        if (container) {
          // Override Razorpay's inline styles with our dimensions
          container.style.setProperty('z-index', '2147483647', 'important');
          container.style.setProperty('position', 'fixed', 'important');
          container.style.setProperty('top', '50%', 'important');
          container.style.setProperty('left', '50%', 'important');
          container.style.setProperty('transform', 'translate(-50%, -50%)', 'important');
          container.style.setProperty('width', '1000px', 'important');
          container.style.setProperty('max-width', '95vw', 'important');
          container.style.setProperty('height', '580px', 'important');
          container.style.setProperty('max-height', '580px', 'important');
          container.style.setProperty('background', 'transparent', 'important');
          container.style.setProperty('overflow', 'hidden', 'important');
        }
        if (frame) {
          frame.style.setProperty('z-index', '2147483647', 'important');
          frame.style.setProperty('position', 'absolute', 'important');
          frame.style.setProperty('top', '0', 'important');
          frame.style.setProperty('left', '0', 'important');
          frame.style.setProperty('width', '100%', 'important');
          frame.style.setProperty('height', '100%', 'important');
          frame.style.setProperty('border', 'none', 'important');
          frame.style.setProperty('border-radius', '12px', 'important');
        }
        if (backdrop) {
          backdrop.style.setProperty('z-index', '2147483646', 'important');
          backdrop.style.setProperty('position', 'fixed', 'important');
          backdrop.style.setProperty('top', '0', 'important');
          backdrop.style.setProperty('left', '0', 'important');
          backdrop.style.setProperty('width', '100%', 'important');
          backdrop.style.setProperty('height', '100%', 'important');
          backdrop.style.setProperty('background', 'rgba(0, 0, 0, 0.5)', 'important');
        }
        return !!container;
      };

      // Use interval to continuously override Razorpay's inline styles
      const styleInterval = setInterval(() => {
        if (fixRazorpaySize()) {
          // Keep overriding for 3 seconds then stop
        }
      }, 50);

      // Stop after 3 seconds
      setTimeout(() => clearInterval(styleInterval), 3000);

    } catch (error) {
      showMessage('error', error.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-200/60 dark:bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto bg-white dark:bg-[#0a0a0b] border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl m-4" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white dark:bg-[#0a0a0b] border-b border-zinc-200 dark:border-zinc-800 px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <UserIcon className="text-blue-400" size={24} />
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Profile Settings</h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
              <X size={20} className="text-zinc-500 dark:text-zinc-400" />
            </button>
          </div>
        </div>



        {/* Tabs */}
        <div className="flex gap-2 px-8 pt-6 border-b border-zinc-200 dark:border-zinc-800">
          {[
            { id: 'security', label: '🔒 Security', icon: '🔒' },
            { id: 'api', label: '🔑 API Credentials', icon: '🔑' },
            { id: 'notifications', label: '🔔 Alerts', icon: '🔔' },
            { id: 'plans', label: '💎 My Plans', icon: '💎' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 font-medium transition-all ${activeTab === tab.id
                ? 'text-blue-500 border-b-2 border-blue-500'
                : 'text-zinc-600 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">Profile Information</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-400 mb-2">Username</label>
                    <input
                      type="text"
                      value={securityData.username}
                      disabled
                      className="w-full px-4 py-2.5 bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-500 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-400 mb-2">Email</label>
                    <input
                      type="email"
                      value={securityData.email}
                      onChange={(e) => setSecurityData({ ...securityData, email: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white dark:bg-zinc-800/50 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white focus:border-blue-500 focus:outline-none transition-colors"
                      placeholder="your.email@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-400 mb-2">Phone</label>
                    <input
                      type="tel"
                      value={securityData.phone}
                      onChange={(e) => setSecurityData({ ...securityData, phone: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white dark:bg-zinc-800/50 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white focus:border-blue-500 focus:outline-none transition-colors"
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>
                  <button
                    onClick={handleUpdateProfile}
                    disabled={saving}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Update Profile'}
                  </button>
                </div>
              </div>

              <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">Change Password</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-400 mb-2">Current Password</label>
                    <input
                      type="password"
                      value={securityData.currentPassword}
                      onChange={(e) => setSecurityData({ ...securityData, currentPassword: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white dark:bg-zinc-800/50 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white focus:border-blue-500 focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-400 mb-2">New Password</label>
                    <input
                      type="password"
                      value={securityData.newPassword}
                      onChange={(e) => setSecurityData({ ...securityData, newPassword: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white dark:bg-zinc-800/50 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white focus:border-blue-500 focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-400 mb-2">Confirm New Password</label>
                    <input
                      type="password"
                      value={securityData.confirmPassword}
                      onChange={(e) => setSecurityData({ ...securityData, confirmPassword: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white dark:bg-zinc-800/50 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white focus:border-blue-500 focus:outline-none transition-colors"
                    />
                  </div>
                  <button
                    onClick={handleChangePassword}
                    disabled={saving}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Changing...' : 'Change Password'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* API Tab */}
          {activeTab === 'api' && (
            <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-bold text-blue-400 mb-4">TRADING API (ANGEL ONE)</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-500 mb-2 uppercase">API Key</label>
                      <PasswordInput
                        value={apiData.angel_api_key}
                        onChange={(e) => setApiData({ ...apiData, angel_api_key: e.target.value })}
                        placeholder="Enter API Key"
                        color="blue"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-500 mb-2 uppercase">Client Code</label>
                      <input
                        type="text"
                        value={apiData.angel_client_code}
                        onChange={(e) => setApiData({ ...apiData, angel_client_code: e.target.value })}
                        className="w-full px-4 py-2.5 bg-white dark:bg-zinc-800/50 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white focus:border-blue-500 focus:outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-500 mb-2 uppercase">Password</label>
                      <PasswordInput
                        value={apiData.angel_password}
                        onChange={(e) => setApiData({ ...apiData, angel_password: e.target.value })}
                        placeholder="Enter Password"
                        color="blue"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-500 mb-2 uppercase">TOTP Token</label>
                      <PasswordInput
                        value={apiData.angel_totp}
                        onChange={(e) => setApiData({ ...apiData, angel_totp: e.target.value })}
                        placeholder="Enter TOTP"
                        color="blue"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-blue-400 mb-4">BACKTEST API</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-zinc-500 mb-2 uppercase">Backtest API Key</label>
                      <PasswordInput
                        value={apiData.backtest_api_key}
                        onChange={(e) => setApiData({ ...apiData, backtest_api_key: e.target.value })}
                        placeholder="Enter API Key"
                        color="blue"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-500 mb-2 uppercase">Backtest Client Code</label>
                      <input
                        type="text"
                        value={apiData.backtest_client_code}
                        onChange={(e) => setApiData({ ...apiData, backtest_client_code: e.target.value })}
                        className="w-full px-4 py-2.5 bg-white dark:bg-zinc-800/50 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white focus:border-blue-500 focus:outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-500 mb-2 uppercase">Backtest Password</label>
                      <PasswordInput
                        value={apiData.backtest_password}
                        onChange={(e) => setApiData({ ...apiData, backtest_password: e.target.value })}
                        placeholder="Enter Password"
                        color="blue"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-500 mb-2 uppercase">Backtest TOTP</label>
                      <PasswordInput
                        value={apiData.backtest_totp}
                        onChange={(e) => setApiData({ ...apiData, backtest_totp: e.target.value })}
                        placeholder="Enter TOTP"
                        color="blue"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-6 text-xs text-zinc-500 italic">
                Separate credentials used for historical data fetching
              </div>
              <button
                onClick={handleUpdateAPI}
                disabled={saving}
                className="mt-6 px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">WhatsApp Alerts (CallMeBot)</h3>
                <p className="text-sm text-zinc-500 mb-6">
                  Get instant trade alerts on WhatsApp for free using CallMeBot.
                  <br />1. Add phone number (+91...) to your contacts.
                  <br />2. Send message "I allow callmebot to send me messages" to get your API Key.
                  <br />3. <a href="https://www.callmebot.com/blog/free-api-whatsapp-messages/" target="_blank" className="text-blue-500 hover:underline">Click here for full instructions</a>
                </p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-400 mb-2">WhatsApp Number (with Country Code)</label>
                    <input
                      type="text"
                      value={notificationData.whatsapp_number}
                      onChange={(e) => setNotificationData({ ...notificationData, whatsapp_number: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white dark:bg-zinc-800/50 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white focus:border-blue-500 focus:outline-none transition-colors"
                      placeholder="+919876543210"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-400 mb-2">CallMeBot API Key</label>
                    <input
                      type="text"
                      value={notificationData.callmebot_api_key}
                      onChange={(e) => setNotificationData({ ...notificationData, callmebot_api_key: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white dark:bg-zinc-800/50 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white focus:border-blue-500 focus:outline-none transition-colors"
                      placeholder="123456"
                    />
                  </div>
                  <button
                    onClick={handleUpdateNotifications}
                    disabled={saving}
                    className="px-6 py-2.5 bg-green-600 hover:bg-green-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save & Test Alert'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Plans Tab */}
          {activeTab === 'plans' && (
            <div className="space-y-6">
              {profile?.plan && (
                <div className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-500/30 rounded-xl p-6">
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">Current Plan</h3>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-3xl font-bold text-blue-400">{profile.plan.name}</p>
                      <p className="text-zinc-600 dark:text-zinc-300 text-sm">
                        {profile.plan.start_date && profile.plan.end_date && (
                          <>Valid until {new Date(profile.plan.end_date).toLocaleDateString()}</>
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-zinc-900 dark:text-white">₹{profile.plan.price}<span className="text-sm text-zinc-500 dark:text-zinc-300">{profile.plan.duration_days === 90 ? '/ 3 Months' : profile.plan.duration_days === 180 ? '/ 6 Months' : profile.plan.duration_days === 365 && profile.plan.price > 0 ? '/ Year' : '/ Month'}</span></p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-4">Available Plans</h3>
                <div className="grid grid-cols-4 gap-4">
                  {plans.map((plan) => (
                    <div
                      key={plan.id}
                      className={`bg-white dark:bg-zinc-900/50 border rounded-xl p-4 transition-all hover:scale-105 ${profile?.plan?.name === plan.name
                        ? 'border-blue-500 ring-2 ring-blue-500/20'
                        : 'border-zinc-200 dark:border-zinc-800'
                        }`}
                    >
                      <h4 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">{plan.name}</h4>
                      <p className="text-2xl font-bold text-blue-400 mb-4">
                        ₹{plan.price}
                        <span className="text-sm text-zinc-500 dark:text-zinc-400">{plan.duration_days === 90 ? '/ 3 Months' : plan.duration_days === 180 ? '/ 6 Months' : plan.duration_days === 365 && plan.price > 0 ? '/ Year' : '/ Month'}</span>
                      </p>
                      <ul className="space-y-2 mb-4 text-xs">
                        {plan.features && (Array.isArray(plan.features) ? plan.features : JSON.parse(plan.features)).slice(0, 3).map((feature, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-zinc-600 dark:text-zinc-400">
                            <span className="text-blue-400 mt-0.5">✓</span>
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                      <button
                        onClick={() => handleSubscribePlan(plan.id)}
                        disabled={profile?.plan?.name === plan.name}
                        className={`w-full py-2 rounded-lg text-sm font-medium transition-colors ${profile?.plan?.name === plan.name
                          ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-500 text-white'
                          }`}
                      >
                        {profile?.plan?.name === plan.name ? 'Current' : 'Subscribe'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function UserDropdown({ user, logout, onOpenProfile }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="hidden md:flex items-center justify-center rounded-full bg-blue-600/20 hover:bg-blue-600/30 transition-colors h-8 w-8"
      >
        <UserIcon size={16} className="text-blue-600" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-[#27272a] rounded-xl shadow-xl overflow-hidden z-50">
          <div className="p-2">
            <button
              onClick={() => {
                onOpenProfile();
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 cursor-pointer transition-colors"
            >
              <UserIcon size={16} className="text-zinc-600 dark:text-zinc-400" />
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Profile</span>
            </button>
            <button
              onClick={() => {
                logout();
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer transition-colors"
            >
              <LogOut size={16} className="text-red-500" />
              <span className="text-sm font-medium text-red-500">Logout</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


function Header({ onNavigate, activePage, theme, toggleTheme, user, logout, onTabChange, isSimulated, setIsSimulated, onOpenProfile }) {
  const [showFeatures, setShowFeatures] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // If user is logged in: Dashboard, Features. If not: Home, Features, Pricing.
  // Prioritize Dashboard for logged in users.
  const navItems = user
    ? [{ label: 'Dashboard', value: 'dashboard' }, { label: 'Features', value: 'features' }]
    : [{ label: 'Home', value: 'landing' }, { label: 'Features', value: 'features' }, { label: 'Pricing', value: 'pricing' }];

  const featureLinks = [
    { label: 'Live Trading', tab: 'live' },
    { label: 'Order Book', tab: 'orderbook' },
    { label: 'Backtest', tab: 'backtest' }
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 dark:bg-[#09090b]/90 backdrop-blur-md border-b border-zinc-200 dark:border-[#27272a] transition-all duration-300">
      <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between relative">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => onNavigate('landing')}>
          <div className="bg-blue-50 dark:bg-blue-900/20 p-1.5 rounded-lg border border-blue-100 dark:border-blue-800">
            <Activity size={20} className="text-blue-600 dark:text-blue-400" strokeWidth={2.5} />
          </div>
          <h1 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">MerQ<span className="text-blue-600 dark:text-blue-400">Prime</span></h1>

        </div>

        <nav className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center gap-8 text-sm font-medium text-zinc-500 dark:text-zinc-400">
          {navItems.map(item => (
            <div key={item.value} className="relative group">
              <button
                onClick={() => {
                  if (item.value === 'features' && user) return;
                  onNavigate(item.value);
                }}
                onMouseEnter={() => item.value === 'features' && user && setShowFeatures(true)}
                onMouseLeave={() => item.value === 'features' && user && setShowFeatures(false)}
                className={`hover:text-zinc-900 dark:hover:text-white transition-colors py-2 flex items-center gap-1 ${activePage === item.value ? 'text-zinc-900 dark:text-white font-bold' : ''}`}
              >
                {item.label}
              </button>

              {/* Features Dropdown for Logged In User */}
              {item.value === 'features' && user && (
                <div
                  className={`absolute top-full left-1/2 -translate-x-1/2 pt-2 transition-all duration-200 ${showFeatures ? 'opacity-100 translate-y-0 visible' : 'opacity-0 translate-y-2 invisible'}`}
                  onMouseEnter={() => setShowFeatures(true)}
                  onMouseLeave={() => setShowFeatures(false)}
                >
                  <div className="bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-[#27272a] rounded-xl shadow-xl w-48 overflow-hidden p-1 flex flex-col">
                    {featureLinks.map(link => (
                      <button
                        key={link.tab}
                        onClick={() => { onNavigate('dashboard'); onTabChange(link.tab); setShowFeatures(false); }}
                        className="text-left px-3 py-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 text-xs font-medium text-zinc-600 dark:text-zinc-300 transition-colors block w-full"
                      >
                        {link.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          {user && (
            <div className="hidden md:flex items-center gap-2 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 px-3 py-1.5 mr-2">
              <span className={cn("text-xs font-bold transition-colors", isSimulated ? "text-blue-500" : "text-zinc-500")}>PAPER</span>
              <Switch
                checked={!isSimulated}
                onCheckedChange={(c) => setIsSimulated(!c)}
                className="data-[state=checked]:bg-red-500"
              />
              <span className={cn("text-xs font-bold transition-colors", !isSimulated ? "text-red-500" : "text-zinc-500")}>LIVE</span>
              {!isSimulated && <span className="ml-1 h-2 w-2 rounded-full bg-red-500 animate-pulse" />}
            </div>
          )}
          <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors">
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {user ? (
            <UserDropdown user={user} logout={logout} onOpenProfile={onOpenProfile} />
          ) : (
            <div className="hidden md:flex items-center gap-4">
              <span onClick={() => onNavigate('login')} className="text-sm font-bold text-zinc-700 dark:text-zinc-300 cursor-pointer hover:text-zinc-900 dark:hover:text-white">Sign In</span>
              <button onClick={() => onNavigate('register')} className="bg-blue-600 text-white px-5 py-2 rounded-full text-xs font-bold hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2">Sign Up</button>
            </div>
          )}

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-zinc-200 dark:border-[#27272a] bg-white dark:bg-[#09090b]">
          <div className="px-6 py-4 space-y-3">
            {navItems.map(item => (
              <button
                key={item.value}
                onClick={() => {
                  onNavigate(item.value);
                  setMobileMenuOpen(false);
                }}
                className="block w-full text-left px-4 py-3 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                {item.label}
              </button>
            ))}

            {user && featureLinks.map(link => (
              <button
                key={link.tab}
                onClick={() => {
                  onNavigate('dashboard');
                  onTabChange(link.tab);
                  setMobileMenuOpen(false);
                }}
                className="block w-full text-left px-4 py-3 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-sm font-medium text-zinc-600 dark:text-zinc-400 pl-8"
              >
                {link.label}
              </button>
            ))}

            <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800">
              {user ? (
                <div className="space-y-3">
                  <div className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                    <div className="text-xs text-zinc-500 mb-1">Logged in as</div>
                    <div className="font-semibold text-zinc-900 dark:text-white">{typeof user === 'object' ? user?.username : user}</div>
                  </div>
                  <button
                    onClick={() => {
                      logout();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full px-4 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg font-medium text-sm"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      onNavigate('login');
                      setMobileMenuOpen(false);
                    }}
                    className="w-full px-4 py-3 border border-zinc-200 dark:border-zinc-700 rounded-lg font-medium text-sm text-zinc-700 dark:text-zinc-300"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => {
                      onNavigate('register');
                      setMobileMenuOpen(false);
                    }}
                    className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-medium text-sm"
                  >
                    Sign Up
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

const MARKET_TICKER_DATA = [
  { symbol: "NIFTY 50", price: "22,450.30", change: "+0.85%", isGainer: true },
  { symbol: "BANKNIFTY", price: "47,850.15", change: "+1.20%", isGainer: true },
  { symbol: "ADANI PORTS", price: "1,340.50", change: "+4.20%", isGainer: true },
  { symbol: "COAL INDIA", price: "480.25", change: "+3.50%", isGainer: true },
  { symbol: "NTPC", price: "360.80", change: "+2.80%", isGainer: true },
  { symbol: "LTIM", price: "4,950.10", change: "-2.50%", isGainer: false },
  { symbol: "INFY", price: "1,420.40", change: "-1.80%", isGainer: false },
  { symbol: "WIPRO", price: "445.60", change: "-1.50%", isGainer: false },
];

function MarketTicker() {
  const [tickerData, setTickerData] = useState(MARKET_TICKER_DATA);

  useEffect(() => {
    fetchJson('/market_data')
      .then(res => {
        if (Array.isArray(res) && res.length > 0) setTickerData(res);
      })
      .catch(e => console.log("Ticker fetch failed, using fallback"));
  }, []);

  return (
    <div className="w-full bg-zinc-50 dark:bg-[#09090b] border-y border-zinc-200 dark:border-zinc-800 py-3 overflow-hidden relative">
      <div className="flex animate-marquee whitespace-nowrap gap-12 min-w-full hover:[animation-play-state:paused]">
        {/* Duplicate array for seamless scrolling (requires 2 sets for -50% translation) */}
        {[...tickerData, ...tickerData, ...tickerData, ...tickerData].map((item, i) => (
          <div key={`${item.symbol}-${i}`} className="flex items-center gap-3 text-sm font-mono shrink-0">
            <span className="font-bold text-zinc-900 dark:text-white">{item.symbol}</span>
            <span className="text-zinc-600 dark:text-zinc-400">{item.price}</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 ${item.isGainer ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/20' : 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/20'}`}>
              {item.isGainer ? '▲' : '▼'} {item.change}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Landing({ onGetStarted }) {
  return (
    <div className="pt-16">
      <section className="relative pt-20 pb-32 overflow-hidden bg-grid-pattern">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-blue-500/10 rounded-full blur-[120px] -z-10 opacity-50 dark:opacity-50"></div>
        <div className="absolute top-[20%] left-[20%] w-[600px] h-[400px] bg-indigo-500/10 rounded-full blur-[100px] -z-10 opacity-30 dark:opacity-30"></div>
        <div className="mx-auto max-w-7xl px-6 lg:px-8 text-center relative z-10">
          <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-4 leading-[1.1] animate-in fade-in slide-in-from-bottom-6 duration-1000 text-zinc-900 dark:text-white">Trade Smarter with<br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-600 dark:from-cyan-400 dark:via-purple-400 dark:to-cyan-400 animate-text-gradient">Algorithmic Intelligence</span></h1>
          <h2 className="text-3xl md:text-3xl font-black tracking-tight mb-10 animate-in fade-in slide-in-from-bottom-7 duration-1000 delay-100"><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-600 dark:from-cyan-400 dark:via-purple-400 dark:to-cyan-400 animate-text-gradient">Built on Intelligence. Driven by Data.</span></h2>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
            <button onClick={onGetStarted} className="h-12 px-8 rounded-full bg-blue-600 text-white font-bold text-sm hover:bg-blue-500 transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(37,99,235,0.3)] flex items-center gap-2">Get Started <ArrowRight size={16} strokeWidth={3} /></button>
            <button className="h-12 px-8 rounded-full bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-[#27272a] text-zinc-900 dark:text-white font-bold text-sm hover:border-blue-400 dark:hover:border-blue-600 transition-all flex items-center gap-2 shadow-sm"><Play size={16} fill="currentColor" /> Watch Demo</button>
          </div>

          <div className="relative mt-20 mb-8 mx-auto max-w-[1000px] perspective-[2000px] group">
            {/* Glow backing */}
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>

            {/* 3D Container - Tilted */}
            <div className="relative rounded-xl bg-[#09090b] border border-white/10 shadow-2xl transform rotate-x-12 group-hover:rotate-x-0 transition-transform duration-700 ease-out overflow-hidden aspect-[16/9] flex flex-col">
              {/* Fake Browser Header */}
              <div className="h-8 bg-white/5 border-b border-white/5 flex items-center px-4 gap-2">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/50"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/50"></div>
                </div>
                <div className="ml-4 h-4 w-60 bg-white/5 rounded-full"></div>
              </div>

              {/* Fake Dashboard Content */}
              <div className="flex-1 p-6 grid grid-cols-4 gap-4 overflow-hidden">
                <div className="col-span-1 space-y-4">
                  <div className="h-32 rounded-lg bg-white/5 animate-pulse delay-75 border border-white/5"></div>
                  <div className="h-full rounded-lg bg-white/5 border border-white/5"></div>
                </div>
                <div className="col-span-3 space-y-4">
                  <div className="flex gap-4 h-32">
                    <div className="flex-1 rounded-lg bg-gradient-to-br from-blue-500/20 to-transparent border border-blue-500/20 p-4">
                      <div className="w-8 h-8 rounded bg-blue-500/20 mb-2"></div>
                      <div className="h-4 w-20 bg-blue-500/20 rounded mb-1"></div>
                      <div className="h-8 w-32 bg-blue-500/40 rounded"></div>
                    </div>
                    <div className="flex-1 rounded-lg bg-white/5 border border-white/5"></div>
                    <div className="flex-1 rounded-lg bg-white/5 border border-white/5"></div>
                  </div>
                  <div className="h-64 rounded-lg bg-white/5 border border-white/5 relative overflow-hidden">
                    {/* Fake Chart Line */}
                    <svg className="absolute inset-0 w-full h-full text-blue-500/20" preserveAspectRatio="none">
                      <path d="M0,100 Q100,50 200,80 T400,20" fill="none" stroke="currentColor" strokeWidth="2" />
                      <path d="M0,100 L0,100 L400,100 Z" fill="currentColor" className="opacity-10" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto mt-20 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-500">
            {[
              { label: "Trading Volume", val: "$2.5B+" },
              { label: "Active Traders", val: "50K+" },
              { label: "Uptime", val: "99.9%" },
              { label: "Execution Speed", val: "< 1ms" },
            ].map((s, i) => (
              <div key={i} className="glass-card p-6 rounded-2xl hover:border-blue-400/50 transition-all group shadow-sm dark:shadow-none">
                <div className="text-2xl font-black text-zinc-900 dark:text-white mb-1 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors">{s.val}</div>
                <div className="text-xs text-zinc-500 font-bold uppercase tracking-wider">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <MarketTicker />

      {/* HOW IT WORKS SECTION */}
      <section className="py-24 bg-zinc-50 dark:bg-[#09090b] relative transition-colors duration-300">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-blue-500 font-bold tracking-widest text-xs uppercase mb-2">Workflow</h2>
            <h3 className="text-3xl md:text-5xl font-bold text-zinc-900 dark:text-white">Start Trading in <span className="text-blue-500 dark:text-blue-400">3 Simple Steps</span></h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Connect Broker",
                desc: "Securely link your Angel One account using API Key & TOTP. Your funds remain in your brokerage account.",
                icon: <Shield size={32} className="text-blue-600 dark:text-blue-400" />
              },
              {
                step: "02",
                title: "Select Strategy",
                desc: "Choose from our pre-built strategies like 'Nifty Trend' or 'Scalper', or configure your own parameters.",
                icon: <Activity size={32} className="text-blue-600 dark:text-blue-400" />
              },
              {
                step: "03",
                title: "Automate",
                desc: "Click 'Start Button' and watch the bot execute trades based on real-time market data. Monitor P&L live.",
                icon: <Zap size={32} className="text-blue-600 dark:text-blue-400" />
              }
            ].map((s, i) => (
              <div key={i} className="relative group p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121214] hover:border-blue-500/30 transition-all overflow-hidden hover:-translate-y-1 hover:shadow-xl dark:shadow-none">
                <div className="absolute -right-4 -top-4 text-9xl font-black text-zinc-50 dark:text-zinc-900/40 select-none transition-colors group-hover:text-blue-50 dark:group-hover:text-blue-900/10">
                  {s.step}
                </div>
                <div className="relative z-10">
                  <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                    {s.icon}
                  </div>
                  <h4 className="text-xl font-bold text-zinc-900 dark:text-white mb-3">{s.title}</h4>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 bg-white dark:bg-black relative transition-colors duration-300">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-blue-500 font-bold tracking-widest text-xs uppercase mb-2">Features</h2>
            <h3 className="text-3xl md:text-5xl font-bold text-zinc-900 dark:text-white">Everything You Need to <span className="text-blue-500 dark:text-blue-400">Trade Like a Pro</span></h3>
            <p className="text-zinc-600 dark:text-zinc-500 mt-4 max-w-2xl mx-auto">Powerful tools and features designed for both beginners and experienced traders.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: <Activity />, title: "AI Strategy Builder", desc: "Create sophisticated strategies with our intuitive AI builder." },
              { icon: <BarChart3 />, title: "Real-Time Analytics", desc: "Monitor your portfolio with live charts and instant insights." },
              { icon: <Zap />, title: "Lightning Execution", desc: "Sub-millisecond order execution via direct exchanges." },
              { icon: <Shield />, title: "Risk Management", desc: "Advanced stop loss and position sizing tools included." },
            ].map((f, i) => (
              <div key={i} className="bg-zinc-5 dark:bg-[#121214] border border-zinc-200 dark:border-[#27272a] p-8 rounded-3xl hover:-translate-y-2 transition-transform duration-300 group hover:border-blue-500/30">
                <div className="w-12 h-12 rounded-xl bg-white dark:bg-[#18181b] flex items-center justify-center text-blue-500 dark:text-blue-400 mb-6 group-hover:bg-blue-500/10 group-hover:scale-110 transition-all shadow-sm dark:shadow-none">
                  {f.icon}
                </div>
                <h4 className="text-lg font-bold text-zinc-900 dark:text-white mb-3">{f.title}</h4>
                <p className="text-sm text-zinc-600 dark:text-zinc-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>



      <section className="py-24 bg-zinc-50 dark:bg-[#09090b] relative transition-colors duration-300">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[100px] -z-10"></div>

        <div className="mx-auto max-w-7xl px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-blue-500 font-bold tracking-widest text-xs uppercase mb-2">Testimonials</h2>
            <h3 className="text-3xl md:text-5xl font-bold text-zinc-900 dark:text-white">Trusted by <span className="text-blue-500 dark:text-blue-400">50,000+</span> Traders</h3>
          </div>

          {/* Marquee rows constrained within max-w-7xl */}
          <div className="relative overflow-hidden rounded-2xl -mx-6 lg:-mx-8">
            {/* Fade Masks */}
            <div className="absolute left-0 top-0 bottom-0 w-24 md:w-40 bg-gradient-to-r from-zinc-50 dark:from-[#09090b] to-transparent z-20 pointer-events-none"></div>
            <div className="absolute right-0 top-0 bottom-0 w-24 md:w-40 bg-gradient-to-l from-zinc-50 dark:from-[#09090b] to-transparent z-20 pointer-events-none"></div>

            {/* Row 1 */}
            <div className="flex gap-6 mb-6 w-max animate-marquee">
              {[...TESTIMONIALS, ...TESTIMONIALS].map((t, i) => (
                <div key={i} className="bg-white dark:bg-[#121214] p-8 rounded-3xl border border-zinc-200 dark:border-[#27272a] shadow-sm w-[380px] shrink-0 hover:shadow-xl hover:border-blue-300 dark:hover:border-blue-700 transition-all cursor-pointer">
                  <div className="text-blue-600 dark:text-blue-400 text-4xl mb-4 font-serif leading-none">"</div>
                  <p className="text-zinc-600 dark:text-zinc-400 text-sm mb-6 leading-relaxed min-h-[80px]">{t.text}</p>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-sm border border-blue-500/20">
                      {t.initials}
                    </div>
                    <div>
                      <div className="text-zinc-900 dark:text-white font-bold text-sm">{t.name}</div>
                      <div className="text-zinc-500 dark:text-zinc-600 text-xs">{t.role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Row 2 */}
            <div className="flex gap-6 w-max animate-marquee-reverse">
              {[...TESTIMONIALS.slice(3), ...TESTIMONIALS.slice(0, 3), ...TESTIMONIALS.slice(3), ...TESTIMONIALS.slice(0, 3)].map((t, i) => (
                <div key={i} className="bg-white dark:bg-[#121214] p-8 rounded-3xl border border-zinc-200 dark:border-[#27272a] shadow-sm w-[380px] shrink-0 hover:shadow-xl hover:border-blue-300 dark:hover:border-blue-700 transition-all cursor-pointer">
                  <div className="text-blue-600 dark:text-blue-400 text-4xl mb-4 font-serif leading-none">"</div>
                  <p className="text-zinc-600 dark:text-zinc-400 text-sm mb-6 leading-relaxed min-h-[80px]">{t.text}</p>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-sm border border-blue-500/20">
                      {t.initials}
                    </div>
                    <div>
                      <div className="text-zinc-900 dark:text-white font-bold text-sm">{t.name}</div>
                      <div className="text-zinc-500 dark:text-zinc-600 text-xs">{t.role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* COMPARISON SECTION */}
      {/* COMPARISON SECTION - CARD LAYOUT */}
      <section className="py-24 bg-white dark:bg-black relative transition-colors duration-300">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-blue-500 font-bold tracking-widest text-xs uppercase mb-2">Why Switch?</h2>
            <h3 className="text-3xl md:text-5xl font-bold text-zinc-900 dark:text-white">The <span className="text-blue-500 dark:text-blue-400">Unfair Advantage</span></h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Old Way */}
            <div className="p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#121214] opacity-70 hover:opacity-100 transition-opacity">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400">
                  <X size={24} />
                </div>
                <h4 className="text-xl font-bold text-zinc-600 dark:text-zinc-400">Manual Trading</h4>
              </div>
              <ul className="space-y-4">
                {[
                  "Slow Execution (2-5 seconds)",
                  "Emotional Decision Making",
                  "Can't Watch Markets 24/7",
                  "Missed Opportunities",
                  "High Stress Levels"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-zinc-500 dark:text-zinc-500">
                    <X size={16} className="text-red-500 shrink-0" /> {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* New Way (MerQPrime) */}
            <div className="relative p-8 rounded-3xl border border-blue-500 dark:border-blue-500/50 bg-blue-50/50 dark:bg-blue-900/10 shadow-2xl shadow-blue-500/10 transform md:-translate-y-4 md:scale-105 z-10 transition-transform duration-300">
              <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl rounded-tr-2xl uppercase tracking-wider">Recommended</div>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-blue-600 text-white shadow-lg shadow-blue-500/30">
                  <Check size={24} strokeWidth={3} />
                </div>
                <h4 className="text-xl font-bold text-zinc-900 dark:text-white">MerQPrime Bot</h4>
              </div>
              <ul className="space-y-5">
                {[
                  "Lightning Fast (< 200ms)",
                  "100% Logic-Based Execution",
                  "24/7 Market Monitoring",
                  "Instant Opportunity Capture",
                  "Zero Stress Automation"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-zinc-900 dark:text-zinc-100 font-medium">
                    <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                      <Check size={12} className="text-blue-600 dark:text-blue-400" strokeWidth={3} />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
              <button onClick={onGetStarted} className="w-full mt-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-500/25 transition-all text-sm flex items-center justify-center gap-2">
                Start Automating Now <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING SECTION */}
      <section className="py-24 bg-zinc-50 dark:bg-[#09090b] relative transition-colors duration-300">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="max-w-7xl mx-auto text-center mb-16">
            <h2 className="text-blue-500 font-bold tracking-widest text-xs uppercase mb-2">Pricing Plans</h2>
            <h3 className="text-3xl md:text-5xl font-bold text-zinc-900 dark:text-white">Choose Your <span className="text-blue-500 dark:text-blue-400">Winning Edge</span></h3>
            <p className="text-zinc-500 mt-4 max-w-2xl mx-auto">Select a plan that fits your trading goals. Upgrade or cancel anytime.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
            {/* 1 Month Plan */}
            <div className="p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121214] hover:border-blue-500/30 transition-all group flex flex-col">
              <div className="mb-6">
                <h4 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">1 Month</h4>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-zinc-900 dark:text-white">₹2,000</span>
                  <span className="text-sm text-zinc-500">/Month</span>
                </div>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                {["Basic Strategy Access", "Real-time Data", "5 Backtests/Day", "Community Support"].map((f, j) => (
                  <li key={j} className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
                    <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                      <Check size={12} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    {f}
                  </li>
                ))}
              </ul>
              <button onClick={onGetStarted} className="w-full py-3 rounded-xl font-bold text-sm transition-all bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700">
                Choose Plan
              </button>
            </div>

            {/* 3 Months Plan */}
            <div className="p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121214] hover:border-blue-500/30 transition-all group flex flex-col">
              <div className="mb-6">
                <h4 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">3 Months</h4>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-zinc-900 dark:text-white">₹5,500</span>
                  <span className="text-sm text-zinc-500">/3 Months</span>
                </div>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                {["Advanced Strategies", "Priority Data", "20 Backtests/Day", "Email Support", "Save 8%"].map((f, j) => (
                  <li key={j} className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
                    <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                      <Check size={12} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    {f}
                  </li>
                ))}
              </ul>
              <button onClick={onGetStarted} className="w-full py-3 rounded-xl font-bold text-sm transition-all bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700">
                Choose Plan
              </button>
            </div>

            {/* 6 Months Plan - Most Popular */}
            <div className="relative p-8 rounded-3xl border border-blue-500 dark:border-blue-500/50 bg-blue-50/50 dark:bg-blue-900/10 shadow-2xl transform md:-translate-y-4 z-10 flex flex-col">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-lg">Most Popular</div>
              <div className="mb-6">
                <h4 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">6 Months</h4>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-zinc-900 dark:text-white">₹10,000</span>
                  <span className="text-sm text-zinc-500">/6 Months</span>
                </div>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                {["All Strategies", "Ultra-low Latency", "Unlimited Backtests", "Priority Support", "Save 16%"].map((f, j) => (
                  <li key={j} className="flex items-center gap-3 text-sm text-zinc-900 dark:text-white font-medium">
                    <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center shrink-0">
                      <Check size={12} className="text-blue-600 dark:text-blue-400" strokeWidth={3} />
                    </div>
                    {f}
                  </li>
                ))}
              </ul>
              <button onClick={onGetStarted} className="w-full py-3 rounded-xl font-bold text-sm transition-all bg-blue-600 text-white hover:bg-blue-500 shadow-lg hover:shadow-blue-500/25">
                Choose Plan
              </button>
            </div>

            {/* 1 Year Plan */}
            <div className="p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121214] hover:border-blue-500/30 transition-all group flex flex-col">
              <div className="mb-6">
                <h4 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">1 Year</h4>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-zinc-900 dark:text-white">₹18,000</span>
                  <span className="text-sm text-zinc-500">/Year</span>
                </div>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                {["VIP Access", "Dedicated Server", "Unlimited Everything", "24/7 Phone Support", "Save 25%"].map((f, j) => (
                  <li key={j} className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
                    <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                      <Check size={12} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    {f}
                  </li>
                ))}
              </ul>
              <button onClick={onGetStarted} className="w-full py-3 rounded-xl font-bold text-sm transition-all bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700">
                Choose Plan
              </button>
            </div>
          </div>
        </div>
      </section>


      <section className="py-24 bg-white dark:bg-black border-t border-zinc-200 dark:border-white/5 relative transition-colors duration-300 overflow-hidden">
        {/* Modern Background Blurs */}
        <div className="absolute bottom-0 right-0 w-[800px] h-[600px] bg-indigo-500/5 rounded-full blur-[120px] -z-10 opacity-30"></div>
        <div className="absolute top-20 left-10 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[80px] -z-10 opacity-30"></div>

        <div className="mx-auto max-w-3xl px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-blue-500 font-bold tracking-widest text-xs uppercase mb-2">Support</h2>
            <h3 className="text-3xl md:text-5xl font-bold text-zinc-900 dark:text-white">Frequently Asked <span className="text-blue-500 dark:text-blue-400">Questions</span></h3>
            <p className="text-zinc-500 mt-4">Everything you need to know about the product and billing.</p>
          </div>

          <div className="space-y-4">
            {[
              { q: "Is my capital safe with MerQPrime?", a: "Absolutley. We operate on a 'non-custodial' basis, meaning we never touch your funds. Your capital remains safely in your Angel One brokerage account. We simply send execution signals via their official, secure API." },
              { q: "Do I need coding knowledge to use this?", a: "No coding is required. Our 'No-Code Strategy Builder' allows you to select parameters, indicators, and logic using a simple visual interface. We also offer pre-built profitable strategies you can deploy instantly." },
              { q: "Can I test strategies without risking money?", a: "Yes! We offer two safe environments: 'Backtesting' (simulate strategy on past data) and 'Paper Trading' (live simulation with fake money). We highly recommend using these before going live." },
              { q: "What happens if my internet disconnects?", a: "Since the strategy runs on your local machine/server, you need to keep the dashboard open. For 24/7 uptime without keeping your laptop on, we recommend deploying this dashboard to a VPS (Virtual Private Server)." },
              { q: "How fast is trade execution?", a: "Extremely fast. Our average order placement time is under 200 milliseconds, giving you a significant edge over manual trading, especially for scalping strategies." }
            ].map((item, i) => (
              <details key={i} className="group glass-card rounded-2xl overflow-hidden [&_summary::-webkit-details-marker]:hidden border border-zinc-200 dark:border-white/5 shadow-sm hover:border-blue-500/30 transition-all duration-300">
                <summary className="flex cursor-pointer items-center justify-between p-6 text-zinc-900 dark:text-white font-bold hover:bg-zinc-50/50 dark:hover:bg-white/5 transition-colors select-none text-lg">
                  {item.q}
                  <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 group-hover:text-blue-500 transition-colors">
                    <span className="transition-transform duration-300 group-open:rotate-180">
                      <svg fill="none" height="20" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="20">
                        <path d="M6 9l6 6 6-6"></path>
                      </svg>
                    </span>
                  </div>
                </summary>
                <div className="px-6 pb-6 pt-0 text-base text-zinc-600 dark:text-zinc-400 leading-relaxed group-open:animate-fade-in">
                  {item.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>
    </div >
  );
}

function Footer() {
  return (
    <footer className="border-t border-zinc-200 dark:border-white/5 bg-white dark:bg-black py-16 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
        <div className="col-span-2 md:col-span-1">
          <div className="flex items-center gap-2 mb-6">
            <div className="bg-blue-500/20 p-1.5 rounded-lg">
              <Activity size={20} className="text-blue-600 dark:text-blue-500" strokeWidth={3} />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-white">MerQ<span className="text-blue-500 dark:text-blue-400">Prime</span></h1>
          </div>
          <p className="text-zinc-500 text-sm leading-relaxed mb-6">Empowering traders with intelligent algorithms and real-time market insights.</p>
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded bg-zinc-100 dark:bg-[#18181b] flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-all cursor-pointer"><Twitter size={14} /></div>
            <div className="w-8 h-8 rounded bg-zinc-100 dark:bg-[#18181b] flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-all cursor-pointer"><Github size={14} /></div>
          </div>
        </div>
        {[
          { head: "Product", links: [{ l: "Features", h: "/" }, { l: "Pricing", h: "/" }, { l: "Dashboard", h: "/" }, { l: "API Docs", h: "/api-docs" }] },
          { head: "Company", links: [{ l: "About", h: "/about" }, { l: "Blog", h: "/blog" }, { l: "Careers", h: "/careers" }, { l: "Contact", h: "/contact" }] },
          { head: "Legal", links: [{ l: "Privacy Policy", h: "/privacy" }, { l: "Terms of Service", h: "/terms" }, { l: "Risk Disclosure", h: "/risk-disclosure" }] },
        ].map((col, i) => (
          <div key={i}>
            <h4 className="text-zinc-900 dark:text-white font-bold mb-6">{col.head}</h4>
            <ul className="space-y-4 text-sm text-zinc-500">
              {col.links.map(item => <li key={item.l}><Link href={item.h} className="hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-colors">{item.l}</Link></li>)}
            </ul>
          </div>
        ))}
      </div>
      <div className="max-w-7xl mx-auto px-6 pt-8 border-t border-zinc-200 dark:border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-zinc-500">
        <p>© 2025 MerQPrime. All rights reserved.</p>
        <p>Trading involves risk.</p>
      </div>
    </footer>
  );
}

function MultiSelect({ options, selected, onChange, label, placeholder = "Search..." }) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);
  const filtered = options.filter(opt => opt.toLowerCase().includes(search.toLowerCase()));

  // Limit filtered to 50 for performance in dropdown
  const displayOptions = filtered.slice(0, 50);

  const toggleOption = (opt) => {
    if (selected.includes(opt)) onChange(selected.filter(s => s !== opt));
    else onChange([...selected, opt]);
  };
  useEffect(() => {
    function handleClickOutside(event) { if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setIsOpen(false); }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  return (
    <div className="relative w-full" ref={wrapperRef}>
      {label && <label className="text-[10px] uppercase text-zinc-500 font-bold block mb-1">{label}</label>}
      <div className="bg-zinc-50 dark:bg-[#18181b] border border-zinc-200 dark:border-[#27272a] rounded p-2 min-h-[42px] flex overflow-x-auto gap-2 cursor-pointer hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-700" onClick={() => setIsOpen(true)}>
        {selected.length === 0 && <span className="text-zinc-500 dark:text-zinc-600 text-sm mt-0.5 ml-1">{placeholder}</span>}
        {selected.map(item => (
          <span key={item} className="flex shrink-0 items-center gap-1 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 shadow-sm">
            {item} <X size={12} className="cursor-pointer hover:text-red-500 dark:hover:text-red-400" onClick={(e) => { e.stopPropagation(); toggleOption(item); }} />
          </span>
        ))}
      </div>
      {isOpen && (
        <div className="absolute top-full left-0 w-full mt-1 bg-white dark:bg-[#121214] border border-zinc-200 dark:border-[#27272a] rounded-lg shadow-2xl z-50 max-h-[300px] flex flex-col animate-in fade-in zoom-in-95 duration-200">
          <div className="p-2 border-b border-zinc-200 dark:border-[#27272a] sticky top-0 bg-white dark:bg-[#121214]">
            <div className="flex items-center bg-zinc-50 dark:bg-[#18181b] rounded px-2 border border-zinc-200 dark:border-[#27272a]">
              <Search size={14} className="text-zinc-500" />
              <input type="text" className="bg-transparent border-none text-sm text-zinc-900 dark:text-white focus:outline-none w-full p-2 placeholder-zinc-500 dark:placeholder-zinc-600" placeholder="Type to filter..." value={search} onChange={e => setSearch(e.target.value)} autoFocus />
            </div>
          </div>
          <div className="overflow-y-auto flex-1 p-1">
            {displayOptions.length === 0 && <div className="p-3 text-zinc-500 text-center text-sm">No results</div>}
            {displayOptions.map((opt, idx) => (
              <div key={`${opt}-${idx}`} className={`flex items-center justify-between px-3 py-2 cursor-pointer rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors ${selected.includes(opt) ? 'bg-zinc-100 dark:bg-zinc-800/50' : ''}`} onClick={() => toggleOption(opt)}>
                <span className={`text-sm ${selected.includes(opt) ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-zinc-700 dark:text-zinc-400'}`}>{opt}</span>
                {selected.includes(opt) && <Check size={14} className="text-emerald-600 dark:text-emerald-400" />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AuthForm({ type, onSuccess, switchTo }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [showPassword, setShowPassword] = useState(false);

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

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center animate-in fade-in zoom-in-95 duration-300 px-4">
      <div className="bg-white dark:bg-[#121214] p-8 rounded-2xl border border-zinc-200 dark:border-[#27272a] shadow-2xl w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-zinc-900 dark:text-white text-center">{type === 'login' ? 'Welcome Back' : 'Create Account'}</h2>
        {error && <div className="bg-red-500/10 text-red-500 text-sm p-3 rounded mb-4 text-center">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Username</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full bg-zinc-50 dark:bg-[#18181b] border border-zinc-200 dark:border-[#27272a] p-3 rounded text-zinc-900 dark:text-white focus:border-emerald-500 focus:outline-none" required />
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-[#18181b] border border-zinc-200 dark:border-[#27272a] p-3 rounded text-zinc-900 dark:text-white focus:border-emerald-500 focus:outline-none pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading} className="w-full bg-emerald-500 text-white dark:text-black font-bold py-3 rounded hover:bg-emerald-400 transition-all flex justify-center">
            {loading ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : (type === 'login' ? 'Sign In' : 'Sign Up')}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-zinc-500">
          {type === 'login' ? "Don't have an account? " : "Already have an account? "}
          <button onClick={() => switchTo(type === 'login' ? 'register' : 'login')} className="text-emerald-500 font-bold hover:underline">
            {type === 'login' ? 'Sign Up' : 'Sign In'}
          </button>
        </div>
      </div>
    </div>
  );
}

function HistoryTable({ user, showConfirm, addToast }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const loadHistory = () => {
    if (!user) {
      setLoading(false);
      return;
    }
    fetchJson('/history')
      .then(data => { setHistory(data); setLoading(false); setCurrentPage(1); })
      .catch(err => {
        console.log("History fetch failed (expected if not logged in)");
        setLoading(false);
      });
  };

  useEffect(() => {
    loadHistory();
  }, [user]);

  const deleteEntry = async (id) => {
    const confirmed = await showConfirm(
      "Delete History Entry",
      "Are you sure you want to permanently delete this backtest result?",
      null,
      "danger"
    );
    if (!confirmed) return;

    try {
      await fetchJson(`/history/${id}`, { method: 'DELETE' });
      addToast("History entry deleted successfully", "success");
      loadHistory();
    } catch (err) {
      addToast('Failed to delete: ' + err.message, "error");
    }
  };

  if (!user) return <div className="p-8 text-center text-zinc-500">Please log in to view history.</div>;
  if (loading) return <div className="p-8 text-center text-zinc-500">Loading history...</div>;

  const formatInterval = (interval) => {
    if (!interval) return 'N/A';
    return interval.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = history.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(history.length / itemsPerPage);

  return (
    <div className="bg-white dark:bg-[#121214] rounded-2xl border border-zinc-200 dark:border-[#27272a] overflow-hidden shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="p-6 border-b border-zinc-200 dark:border-[#27272a] flex items-center justify-between">
        <h3 className="font-bold text-lg text-zinc-900 dark:text-white flex items-center gap-2"><History size={18} /> Backtest History</h3>
        <button onClick={loadHistory} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 font-bold transition-colors bg-zinc-100 dark:bg-zinc-800 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>
      {history.length === 0 ? (
        <div className="p-8 text-center text-zinc-500 text-sm">No history found. Run a backtest to save results.</div>
      ) : (
        <div className="flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-500 dark:text-zinc-400">
              <thead className="bg-zinc-100 dark:bg-[#18181b] uppercase font-bold text-xs text-zinc-500 border-b border-zinc-200 dark:border-[#27272a]">
                <tr>
                  <th className="px-4 py-4">Date</th>
                  <th className="px-4 py-4">Symbol</th>
                  <th className="px-4 py-4">Timeframe</th>
                  <th className="px-4 py-4">Date Range</th>
                  <th className="px-4 py-4">Trades</th>
                  <th className="px-4 py-4">Win Rate</th>
                  <th className="px-4 py-4">P&L</th>
                  <th className="px-4 py-4">Final Cap</th>
                  <th className="px-4 py-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-[#27272a]">
                {currentItems.map((row) => (
                  <tr key={row.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                    <td className="px-4 py-4 text-xs">{new Date(row.date).toLocaleString()}</td>
                    <td className="px-4 py-4 font-bold text-zinc-900 dark:text-white">{row.symbol}</td>
                    <td className="px-4 py-4 text-xs whitespace-nowrap">{formatInterval(row.interval)}</td>
                    <td className="px-4 py-4 text-xs whitespace-nowrap">
                      {row.from_date && row.to_date ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-zinc-400 dark:text-zinc-500">{(() => {
                            const [d, t] = row.from_date.split(' ');
                            if (d.includes('-') && d.split('-')[0].length === 4) {
                              const p = d.split('-'); return `${p[2]}-${p[1]}-${p[0]}`;
                            }
                            return d;
                          })()}</span>
                          <span className="text-zinc-400 dark:text-zinc-500">to {(() => {
                            const [d, t] = row.to_date.split(' ');
                            if (d.includes('-') && d.split('-')[0].length === 4) {
                              const p = d.split('-'); return `${p[2]}-${p[1]}-${p[0]}`;
                            }
                            return d;
                          })()}</span>
                        </div>
                      ) : 'N/A'}
                    </td>
                    <td className="px-4 py-4 font-mono">{row.total_trades || '-'}</td>
                    <td className="px-4 py-4 font-mono">{row.win_rate}%</td>
                    <td className={`px-4 py-4 font-mono font-bold ${row.pnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      {row.pnl >= 0 ? '+' : ''}{row.pnl.toFixed(2)}
                    </td>
                    <td className="px-4 py-4 font-mono">{row.final_capital ? row.final_capital.toFixed(2) : '-'}</td>
                    <td className="px-4 py-4">
                      <button
                        onClick={() => deleteEntry(row.id)}
                        className="text-red-500 hover:text-red-700 dark:text-red-500/80 dark:hover:text-red-400 font-bold text-xs bg-red-50 dark:bg-red-900/10 px-2 py-1 rounded"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex justify-between items-center px-6 py-4 border-t border-zinc-200 dark:border-[#27272a]">
              <span className="text-sm text-zinc-500">
                Page {currentPage} of {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm bg-zinc-100 dark:bg-zinc-800 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50 transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm bg-zinc-100 dark:bg-zinc-800 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LoadingOverlay({ progress }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white dark:bg-[#18181b] p-8 rounded-2xl shadow-2xl max-w-sm w-full border border-zinc-200 dark:border-[#27272a] text-center">
        <div className="w-16 h-16 bg-cyan-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <Activity className="text-cyan-500 animate-pulse" size={32} />
        </div>
        <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">Running Simulation</h3>
        <p className="text-zinc-500 text-sm mb-6">Analyzing historical data and executing strategy...</p>

        <div className="relative pt-1">
          <div className="flex mb-2 items-center justify-between">
            <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-cyan-600 bg-cyan-200 mr-3 dark:bg-cyan-900 dark:text-cyan-300">
              Progress
            </span>
            <span className="text-xs font-semibold inline-block text-cyan-600 dark:text-cyan-400">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-cyan-200 dark:bg-cyan-900/30">
            <div style={{ width: `${progress}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-cyan-500 transition-all duration-300 ease-out"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ErrorBanner({ message, onClose }) {
  if (!message) return null;
  return (
    <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl flex items-center justify-between animate-in slide-in-from-top-2 mb-6">
      <div className="flex items-center gap-3">
        <AlertTriangle size={20} />
        <span className="font-medium text-sm">{message}</span>
      </div>
      <button onClick={onClose} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-full transition-colors"><X size={16} /></button>
    </div>
  );
}

function Pricing({ onSubscribe }) {
  const plans = [
    {
      name: "1 Month",
      price: 2000,
      duration: "Month",
      features: ["Basic Strategy Access", "Real-time Data", "5 Backtests/Day", "Community Support"]
    },
    {
      name: "3 Months",
      price: 5500,
      duration: "3 Months",
      features: ["Advanced Strategies", "Priority Data", "20 Backtests/Day", "Email Support", "Save 8%"],
      popular: false
    },
    {
      name: "6 Months",
      price: 10000,
      duration: "6 Months",
      features: ["All Strategies", "Ultra-low Latency", "Unlimited Backtests", "Priority Support", "Save 16%"],
      popular: true
    },
    {
      name: "1 Year",
      price: 18000,
      duration: "Year",
      features: ["VIP Access", "Dedicated Server", "Unlimited Everything", "24/7 Phone Support", "Save 25%"]
    }
  ];

  return (
    <div className="pt-24 pb-20 px-6 animate-in fade-in duration-500">
      <div className="max-w-7xl mx-auto text-center mb-16">
        <h2 className="text-blue-500 font-bold tracking-widest text-xs uppercase mb-2">Pricing Plans</h2>
        <h3 className="text-3xl md:text-5xl font-bold text-zinc-900 dark:text-white">Choose Your <span className="text-blue-500 dark:text-blue-400">Winning Edge</span></h3>
        <p className="text-zinc-600 dark:text-zinc-500 mt-4 max-w-2xl mx-auto">Select a plan that fits your trading goals. Upgrade or cancel anytime.</p>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {plans.map((plan, i) => (
          <div key={i} className={`relative p-8 rounded-2xl border ${plan.popular ? 'border-blue-500 dark:border-blue-500/50 bg-blue-50/50 dark:bg-blue-900/10 scale-105 shadow-2xl' : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121214]'} hover:border-blue-500/30 transition-all group flex flex-col`}>
            {plan.popular && <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-lg">Most Popular</div>}
            <div className="mb-6">
              <h4 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">{plan.name}</h4>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-zinc-900 dark:text-white">₹{plan.price.toLocaleString()}</span>
                <span className="text-sm text-zinc-500">/{plan.duration}</span>
              </div>
            </div>
            <ul className="space-y-4 mb-8 flex-1">
              {plan.features.map((f, j) => (
                <li key={j} className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
                  <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                    <Check size={12} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  {f}
                </li>
              ))}
            </ul>
            <button onClick={() => onSubscribe(plan)} className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${plan.popular ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg hover:shadow-blue-500/25' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}>
              Choose Plan
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

const TradeRow = React.memo(({ t, onUpdateTP, onUpdateSL, onExit, onDelete, showPrompt }) => {
  return (
    <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 animate-in fade-in duration-300">
      <td className="px-4 py-3 text-zinc-500 w-[80px]">{t.timestamp ? t.timestamp.split(' ')[1] : '-'}</td>
      <td className="px-4 py-3 font-bold text-zinc-900 dark:text-white w-[140px]">
        {t.symbol}
        {String(t.entry_order_id).startsWith("SIM") && <span className="ml-1 text-[9px] bg-zinc-200 dark:bg-zinc-700 px-1 rounded text-zinc-500">SIM</span>}
      </td>
      <td className="px-4 py-3 w-[70px]">
        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${t.mode === 'BUY' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
          {t.mode}
        </span>
      </td>
      <td className="px-4 py-3 font-mono w-[60px]">{t.quantity || '-'}</td>
      <td className="px-4 py-3 font-mono w-[90px]">{parseFloat(t.entry_price).toFixed(2)}</td>
      <td className="px-4 py-3 font-mono text-emerald-500 cursor-pointer hover:underline hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all w-[90px] group" onClick={async () => {
        const newTP = await showPrompt("Update Take Profit", "Enter new TP value:", t.tp);
        if (newTP) onUpdateTP(t, newTP);
      }} title="Click to Edit TP">
        <div className="flex items-center gap-1">
          <Edit2 size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
          {parseFloat(t.tp).toFixed(2)}
        </div>
      </td>
      <td className="px-4 py-3 font-mono text-red-500 cursor-pointer hover:underline hover:bg-red-50 dark:hover:bg-red-900/20 transition-all w-[90px] group" onClick={async () => {
        const newSL = await showPrompt("Update Stop Loss", "Enter new SL value:", t.sl);
        if (newSL) onUpdateSL(t, newSL);
      }} title="Click to Edit SL">
        <div className="flex items-center gap-1">
          <Edit2 size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
          {parseFloat(t.sl).toFixed(2)}
        </div>
      </td>
      <td className={`px-4 py-3 font-mono font-bold w-[90px] ${t.pnl >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{parseFloat(t.pnl).toFixed(2)}</td>
      <td className="px-4 py-3 w-[120px]">
        <div className="flex gap-2">
          <button
            onClick={() => onExit(t)}
            className="bg-red-500 text-white px-2 py-1 rounded text-[10px] font-bold hover:bg-red-600 transition-colors shadow-sm"
            title="Force Exit"
          >
            Exit
          </button>
          <button
            onClick={() => onDelete(t)}
            className="bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 px-2 py-1 rounded text-[10px] font-bold hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
            title="Delete Record"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </td>
    </tr>
  );
}, (prev, next) => {
  // Only re-render if critical data changes. Ignore function prop changes.
  return (
    prev.t.entry_order_id === next.t.entry_order_id &&
    prev.t.pnl === next.t.pnl &&
    prev.t.sl === next.t.sl &&
    prev.t.tp === next.t.tp &&
    prev.t.status === next.t.status &&
    prev.t.quantity === next.t.quantity
  );
});

export default function Home() {
  const router = useRouter();
  const [theme, setTheme] = useState('dark');
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);  // Track auth check status
  const [currentPage, setCurrentPage] = useState('landing');
  const [activeTab, setActiveTab] = useState('live');
  const [status, setStatus] = useState("OFFLINE");

  const [logs, setLogs] = useState([]);
  const [pnl, setPnl] = useState(0.00);

  const [backtestResults, setBacktestResults] = useState([]);
  const [isBacktesting, setIsBacktesting] = useState(false);
  const logEndRef = useRef(null);
  const lastTradesRef = useRef([]);
  const [allSymbols, setAllSymbols] = useState([]);
  const [liveSymbols, setLiveSymbols] = useState(["ADANIPOWER-EQ"]);
  const [liveInterval, setLiveInterval] = useState("five_minute");
  const [startTime, setStartTime] = useState("09:15");
  const [stopTime, setStopTime] = useState("15:15");
  const [btSymbols, setBtSymbols] = useState(["ALL"]);
  const [btInterval, setBtInterval] = useState("five_minute");
  const [fromDate, setFromDate] = useState("2024-01-01T09:15");
  const [toDate, setToDate] = useState("2024-01-10T15:30");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [activeTrades, setActiveTrades] = useState([]);
  const [orderBook, setOrderBook] = useState([]);
  const [obFilters, setObFilters] = useState({ startDate: '', endDate: '' });
  const [obPage, setObPage] = useState(1);
  const obItemsPerPage = 10;
  const [clearTime, setClearTime] = useState(null);
  const [isSimulated, setIsSimulated] = useState(false); // New State

  const [initialCapital, setInitialCapital] = useState("300");
  const [maxLoss, setMaxLoss] = useState("1000");
  const [isSafetyOn, setIsSafetyOn] = useState(false);
  const [safetyTriggered, setSafetyTriggered] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [clientCode, setClientCode] = useState("");
  const [password, setPassword] = useState("");
  const [totp, setTotp] = useState("");

  const [backtestKey, setBacktestKey] = useState("");
  const [btClientCode, setBtClientCode] = useState("");
  const [btPassword, setBtPassword] = useState("");
  const [btTotp, setBtTotp] = useState("");
  const [showProfile, setShowProfile] = useState(false);
  const [showLogs, setShowLogs] = useState(true); // Toggle for System Output logs
  const [selectedStrategy, setSelectedStrategy] = useState("orb");

  const [testSymbol, setTestSymbol] = useState("SBIN-EQ");
  const [testQty, setTestQty] = useState("1");
  const [testSL, setTestSL] = useState("");
  const [testTP, setTestTP] = useState("");
  const [selectedObIds, setSelectedObIds] = useState(new Set());
  const [analyticsData, setAnalyticsData] = useState(null);

  // Toast Notification System
  const [toasts, setToasts] = useState([]);
  const addToast = (message, type = 'info', duration = 3000) => {
    const id = Date.now();
    setToasts([{ id, message, type, duration }]);
  };
  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Modal Dialog System
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false });
  const [promptDialog, setPromptDialog] = useState({ isOpen: false });
  const [showRiskModal, setShowRiskModal] = useState(false);
  const [pendingUser, setPendingUser] = useState(null);

  const showConfirm = (title, message, onConfirm, type = 'danger') => {
    return new Promise((resolve) => {
      setConfirmDialog({
        isOpen: true,
        title,
        message,
        type,
        onConfirm: () => {
          onConfirm?.();
          resolve(true);
        },
        onClose: () => {
          setConfirmDialog({ isOpen: false });
          resolve(false);
        }
      });
    });
  };

  const showPrompt = (title, message, defaultValue = '') => {
    return new Promise((resolve) => {
      setPromptDialog({
        isOpen: true,
        title,
        message,
        defaultValue,
        onConfirm: (value) => {
          resolve(value);
        },
        onClose: () => {
          setPromptDialog({ isOpen: false });
          resolve(null);
        }
      });
    });
  };

  useEffect(() => {
    // 1. Theme
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(savedTheme);

    // 2. Load Local Settings
    const sAPI = localStorage.getItem('apiKey'); if (sAPI) setApiKey(sAPI);
    const sCC = localStorage.getItem('clientCode'); if (sCC) setClientCode(sCC);
    const sPass = localStorage.getItem('password'); if (sPass) setPassword(sPass);
    const sTotp = localStorage.getItem('totp'); if (sTotp) setTotp(sTotp);
    const sCap = localStorage.getItem('initialCapital'); if (sCap) setInitialCapital(sCap);
    const sSym = localStorage.getItem('liveSymbols'); if (sSym) try { setLiveSymbols(JSON.parse(sSym)); } catch (e) { }
    const sInt = localStorage.getItem('liveInterval'); if (sInt) setLiveInterval(sInt);
    const sSim = localStorage.getItem('isSimulated'); if (sSim) setIsSimulated(sSim === 'true');


    // 3. Auth & Status
    // 3. Auth & Status
    fetchJson('/check_auth')
      .then(data => {
        if (data && data.authenticated) {
          setUser(data.user);
          setShowProfile(false);
          // Fetch Credentials
          fetchJson('/get_profile').then(p => {
            if (p) {
              if (p.angel_api_key) setApiKey(p.angel_api_key);
              if (p.angel_client_code) setClientCode(p.angel_client_code);
              if (p.angel_password) setPassword(p.angel_password);
              if (p.angel_totp) setTotp(p.angel_totp);
              if (p.backtest_api_key) setBacktestKey(p.backtest_api_key);
              if (p.backtest_client_code) setBtClientCode(p.backtest_client_code);
              if (p.backtest_password) setBtPassword(p.backtest_password);
              if (p.backtest_totp) setBtTotp(p.backtest_totp);
            }
          }).catch(e => console.log("Profile Load Error", e));
        }
        setAuthLoading(false);
      })
      .catch(() => setAuthLoading(false));

    fetchJson('/symbols').then(setAllSymbols).catch(console.error);

    fetchJson('/status').then(d => {
      if (d && d.status === 'RUNNING') {
        setStatus("RUNNING");
        fetchJson('/config').then(cfg => {
          if (cfg) {
            if (cfg.symbols) setLiveSymbols(cfg.symbols);
            if (cfg.interval) setLiveInterval(cfg.interval);
            if (cfg.capital) setInitialCapital(String(cfg.capital));
            if (cfg.simulated !== undefined) setIsSimulated(cfg.simulated);
          }
        }).catch(console.error);
      }
    }).catch(console.error);

  }, []);

  // Auto-Save Settings
  // Auto-Save Settings (Only Config, NOT Credentials)
  useEffect(() => {
    if (initialCapital) localStorage.setItem('initialCapital', initialCapital);
    if (liveSymbols.length > 0) localStorage.setItem('liveSymbols', JSON.stringify(liveSymbols));
    if (liveInterval) localStorage.setItem('liveInterval', liveInterval);
    localStorage.setItem('isSimulated', String(isSimulated));
  }, [initialCapital, liveSymbols, liveInterval, isSimulated]);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(newTheme);
  };
  const handleLogout = async () => {
    const confirmed = await showConfirm(
      "Confirm Logout",
      "Are you sure you want to logout?",
      async () => {
        await fetchJson('/logout', { method: 'POST' }).catch(console.error);
        setUser(null);
        setCurrentPage('landing');
      },
      "danger"
    );
  };
  const tfOptions = [{ label: "5 Min", value: "five_minute" }, { label: "15 Min", value: "fifteen_minute" }, { label: "30 Min", value: "thirty_minute" }, { label: "1 Hour", value: "one_hour" }];



  const handleClearSettings = () => {
    if (confirm("Are you sure you want to clear all saved settings (API Key, Client Code, Password, TOTP, Capital, Symbols, Interval)? This action cannot be undone.")) {
      localStorage.removeItem('apiKey');
      localStorage.removeItem('clientCode');
      localStorage.removeItem('password');
      localStorage.removeItem('totp');
      localStorage.removeItem('initialCapital');
      localStorage.removeItem('liveSymbols');
      localStorage.removeItem('liveInterval');
      localStorage.removeItem('isSimulated');
      setApiKey("");
      setClientCode("");
      setPassword("");
      setTotp("");
      setInitialCapital("300");
      setLiveSymbols(["ADANIPOWER-EQ"]);
      setLiveInterval("five_minute");
      setIsSimulated(false);
      addToast("All settings cleared!", "info");
    }
  };




  const handleModeSwitch = (mode) => {
    if (status === "RUNNING") {
      addToast("Cannot switch modes while bot is running. Please STOP first.", "warning");
      return;
    }
    setIsSimulated(mode);
  };

  const handleBulkUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      addToast("Please upload a valid CSV file.", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        // 1. Parse CSV
        const rawSymbols = text.split(/[\r\n]+/)
          .flatMap(line => line.split(','))
          .map(s => s.trim().toUpperCase());

        // 2. Filter against valid 'allSymbols' to ensure only real symbols are added
        // Create a Set of valid symbol names for O(1) lookup
        // allSymbols is array of strings or objects? 
        // Based on InstrumentSearch: setAllSymbols(syms) -> syms seems to be list of strings based on MultiSelect usage
        // Let's verify MultiSelect usage: options={allSymbols} selected={liveSymbols}
        // Yes, allSymbols is likely a list of strings ["SBIN-EQ", ...].

        const validSymbolSet = new Set(allSymbols);
        const validSymbols = rawSymbols.filter(s => {
          // Basic cleanup check
          if (!s || s.length === 0 || s === "SYMBOL" || s === "TOKEN") return false;
          // Strict check: Must exist in our master list
          return validSymbolSet.has(s);
        });

        if (validSymbols.length === 0) {
          addToast("No valid matching symbols found in CSV.", "warning");
          return;
        }

        // Add to liveSymbols, filtering duplicates
        setLiveSymbols(prev => {
          const newSet = new Set([...prev, ...validSymbols]);
          return Array.from(newSet);
        });

        const skipped = rawSymbols.length - validSymbols.length; // Approximate
        if (skipped > 0) {
          addToast(`Added ${validSymbols.length} valid symbols. Ignored ${skipped} invalid entries.`, "success");
        } else {
          addToast(`Successfully added ${validSymbols.length} symbols!`, "success");
        }

        // Reset input
        e.target.value = null;
      } catch (err) {
        addToast("Error parsing CSV: " + err.message, "error");
      }
    };
    reader.readAsText(file);
  };

  const handleDeleteOrders = async () => {
    if (selectedObIds.size === 0) return;
    const confirmed = await showConfirm(
      "Delete Orders",
      `Are you sure you want to delete ${selectedObIds.size} selected orders?`,
      async () => {
        try {
          const res = await fetchJson('/delete_orders', {
            method: 'POST',
            body: JSON.stringify({ order_ids: Array.from(selectedObIds) })
          });
          if (res.status === 'success') {
            addToast(res.message, 'success');
            setSelectedObIds(new Set());
            setOrderBook(prev => prev.filter(o => !selectedObIds.has(o.id)));
          } else {
            addToast(res.message, 'error');
          }
        } catch (e) {
          addToast(e.message, 'error');
        }
      },
      "danger"
    );
  };


  const handleGlobalSquareOff = async () => {
    if (activeTrades.length === 0) return;
    const confirmed = await showConfirm(
      "GLOBAL SQUARE OFF",
      `Are you sure you want to EXIT ALL ${activeTrades.length} positions immediately?`,
      async () => {
        try {
          // loop through all active trades and exit them
          // Ideally backend should have a bulk exit, but we'll do loop for now
          // or check if there is a bulk exit endpoint.
          // Since I don't see one, I'll iterate.
          const promises = activeTrades.map(t => fetchJson('/exit_trade', { method: 'POST', body: JSON.stringify({ trade_id: t.entry_order_id }) }));
          await Promise.all(promises);
          addToast("All trades squared off initiated", "info");
          // Refresh trades
          const data = await fetchJson('/trades');
          if (data.status === 'success') setActiveTrades(data.data);
        } catch (e) {
          addToast("Error during global square off: " + e.message, "error");
        }
      },
      "danger"
    );
  };

  const startBot = async () => {
    try {
      const config = {
        symbols: liveSymbols, interval: liveInterval.toUpperCase(),
        startTime, stopTime, capital: initialCapital,
        apiKey, clientCode, password, totp,
        simulated: isSimulated,
        strategy: selectedStrategy
      };
      const data = await fetchJson('/start', { method: 'POST', body: JSON.stringify(config) });
      if (data.status === 'success') {
        setStatus("RUNNING");
        addToast(`Bot Started in ${isSimulated ? 'SIMULATED' : 'LIVE'} Mode`, "success");
      }
    } catch (e) { console.error(e); }
  };
  const stopBot = async () => { try { await fetchJson('/stop', { method: 'POST' }); setStatus("OFFLINE"); } catch (e) { } };

  const handleTestOrder = async (mode = 'BUY') => {
    const slTx = testSL ? ` | SL: ${testSL} | TP: ${testTP}` : " (No OCO)";
    const confirmed = await showConfirm(`Place Test ${mode} Order`, `${testSymbol} x ${testQty}${slTx}`, null, "info");
    if (!confirmed) return;
    try {
      const res = await fetchJson('/test_order', { method: 'POST', body: JSON.stringify({ symbol: testSymbol, quantity: testQty, sl: testSL, tp: testTP, mode }) });
      addToast(res.message, "success");
    } catch (e) { addToast("Error: " + e.message, "error"); }
  };

  const runBacktest = async () => {
    setIsBacktesting(true); setBacktestResults([]); setProgress(0); setError(null);
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 5;
      });
    }, 200);
    try {
      const data = await fetchJson('/backtest', { method: 'POST', body: JSON.stringify({ strategy: selectedStrategy, symbols: btSymbols, interval: btInterval.toUpperCase(), fromDate, toDate }) });
      clearInterval(interval);
      setProgress(100);
      await new Promise(r => setTimeout(r, 600)); // Show 100% briefly
      if (data.status === 'success') {
        if (data.data.length === 0) setError("No trades found for the selected period and symbols.");
        else setBacktestResults(data.data);
      } else {
        setError(data.message || "Failed to fetch backtest data.");
      }
    } catch (e) {
      setError(e.message || "An unexpected error occurred.");
      clearInterval(interval);
    }
    finally { setIsBacktesting(false); }
  };

  useEffect(() => {
    if (currentPage !== 'dashboard') return;
    const fetchLogs = async () => {
      try {
        const data = await fetchJson('/logs');
        let logsToSet = data.reverse();
        if (clearTime) {
          logsToSet = logsToSet.filter(l => {
            try {
              const timePart = l.split(' - ')[0];
              const [h, m, s] = timePart.split(':');
              const logDate = new Date();
              logDate.setHours(parseInt(h), parseInt(m), parseInt(s), 0);
              return logDate > clearTime;
            } catch (e) { return true; }
          });
        }
        setLogs(logsToSet);
      } catch (e) { }
    };
    const fetchPnl = async () => {
      try {
        const data = await fetchJson('/pnl');
        setPnl(data.pnl);

      } catch (e) { }
    };
    const fetchActiveTrades = async () => { try { const data = await fetchJson('/trades'); if (data.status === 'success') setActiveTrades(data.data); } catch (e) { } };

    if (activeTab === 'live') {
      // Fetch initial data once, Socket.IO will handle real-time updates
      fetchPnl(); fetchActiveTrades(); fetchLogs();
      // Only poll logs, not trades or PnL (Socket.IO handles those)
      const i = setInterval(() => { fetchLogs(); }, 2000);
      return () => clearInterval(i);
    }
    if (activeTab === 'orderbook') {
      const fetchOB = async () => {
        const query = new URLSearchParams(obFilters).toString();
        try {
          const data = await fetchJson(`/orderbook?${query}&simulated=${isSimulated}`);
          if (data.status === 'success') {
            setOrderBook(data.data);
            setObPage(1);
          }
        } catch (e) { }
      };
      fetchOB();
    }
    if (activeTab === 'analytics') {
      const fetchAnalytics = async () => {
        try {
          const res = await fetchJson('/analytics');
          console.log("Fetched Analytics Data:", res); // Debug log
          setAnalyticsData(res);
        } catch (e) {
          console.error("Analytics Fetch Error:", e);
        }
      };
      fetchAnalytics();
    }
  }, [activeTab, currentPage, obFilters, clearTime, isSimulated]);

  // Keep ref sync for safety logic
  useEffect(() => { lastTradesRef.current = activeTrades; }, [activeTrades]);

  const triggerSafetyGuard = async () => {
    if (safetyTriggered) return;
    setSafetyTriggered(true);
    await fetchJson('/stop', { method: 'POST' });
    setStatus("OFFLINE");
    addToast("SAFETY GUARD ACTIVATED: MAX LOSS HIT! Bot Stopped.", "error", 10000); // 10s toast

    // Auto Square Off
    const tradesToExit = lastTradesRef.current;
    if (tradesToExit.length > 0) {
      const promises = tradesToExit.map(t => fetchJson('/exit_trade', { method: 'POST', body: JSON.stringify({ trade_id: t.entry_order_id }) }));
      await Promise.all(promises);
      addToast(`Safety Guard: Attempted to exit ${tradesToExit.length} positions.`, "warning");
    }
  };

  // Socket.IO Real-time Updates
  useEffect(() => {
    let socket;
    // Only connect if user is logged in AND Algo is RUNNING
    if (user && status === 'RUNNING' && (activeTab === 'live' || (currentPage === 'dashboard' && activeTab === 'dashboard'))) {
      console.log('[SOCKET] Connecting to Socket.IO (Algo Running)...');
      // Connect directly to Backend URL (Vercel cannot proxy WebSockets properly)
      const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
      socket = io(socketUrl, {
        path: '/socket.io',
        withCredentials: true,
        transports: ['websocket', 'polling'], // Try WS first
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      socket.on('connect', () => {
        console.log('[SOCKET] Connected! ID:', socket.id);

      });

      socket.on('tick_update', (data) => {
        console.log('[SOCKET] Received tick_update:', data);
        if (data.pnl !== undefined) {
          setPnl(data.pnl);


          // Safety Guard Check
          if (isSafetyOn && !safetyTriggered && data.pnl <= -Math.abs(parseFloat(maxLoss))) {
            triggerSafetyGuard();
          }
        }

        // Smart update: only update PnL values, not the entire trades array
        if (data.trades !== undefined) {
          setActiveTrades(prevTrades => {
            // 1. Different length -> definitely update
            if (prevTrades.length !== data.trades.length) {
              return data.trades;
            }

            // 2. No previous trades but new data -> update
            if (prevTrades.length === 0 && data.trades.length > 0) {
              return data.trades;
            }

            // 3. Same length -> Check for actual changes item by item
            let hasChanges = false;
            const updatedTrades = prevTrades.map((prev) => {
              // Find matching trade by entry_order_id
              const match = data.trades.find(t => t.entry_order_id === prev.entry_order_id);

              if (!match) {
                hasChanges = true;
                return prev; // Keep old if no match found
              }

              // Check for differences in critical fields only
              const pnlChanged = Math.abs((match.pnl || 0) - (prev.pnl || 0)) > 0.01; // Ignore tiny changes
              const slChanged = match.sl !== prev.sl;
              const tpChanged = match.tp !== prev.tp;
              const statusChanged = match.status !== prev.status;
              const qtyChanged = match.quantity !== prev.quantity;

              if (pnlChanged || slChanged || tpChanged || statusChanged || qtyChanged) {
                hasChanges = true;
                return { ...prev, ...match };
              }
              return prev;
            });

            return hasChanges ? updatedTrades : prevTrades;
          });
        }
      });

      socket.on('disconnect', () => {
        console.log('[SOCKET] Disconnected');

      });

      return () => {
        console.log('[SOCKET] Disconnecting...');
        socket.disconnect();

      }
    }
  }, [user, activeTab, currentPage]);

  // Order Book Pagination
  const obLastIdx = obPage * obItemsPerPage;
  const obFirstIdx = obLastIdx - obItemsPerPage;
  const currentObItems = orderBook.slice(obFirstIdx, obLastIdx);
  const totalObPages = Math.ceil(orderBook.length / obItemsPerPage);


  // Main Render
  let content;
  if (currentPage === 'landing' || (!user && !['login', 'register', 'pricing'].includes(currentPage))) {
    content = <Landing onGetStarted={() => setCurrentPage('register')} />;
  } else if (currentPage === 'login') {
    content = <AuthForm type="login" onSuccess={(u) => { setPendingUser(u); setShowRiskModal(true); }} switchTo={setCurrentPage} />;
  } else if (currentPage === 'register') {
    content = <AuthForm type="register" onSuccess={() => setCurrentPage('login')} switchTo={setCurrentPage} />;
  } else if (currentPage === 'pricing') {
    content = <Pricing onSubscribe={(plan) => { alert(`You selected ${plan.name} plan! Redirecting to payment...`); setCurrentPage('register'); }} />;
  } else {
    // DASHBOARD CONTENT - Split into Mobile and Desktop
    content = (
      <>
        {/* MOBILE DASHBOARD (Visible only on lg and smaller) */}
        <div className="lg:hidden">
          <MobileDashboard
            tradingMode={isSimulated ? 'PAPER' : 'LIVE'}
            user={user}
            onSystemStatusChange={(active) => {
              if (active && status !== "RUNNING") setStatus("RUNNING");
              if (!active && status === "RUNNING") setStatus("OFFLINE");
            }}
          />
        </div>

        {/* DESKTOP DASHBOARD (Hidden on mobile) */}
        <main className="hidden lg:block pt-24 pb-20 px-6 animate-in fade-in duration-500">

          <div className="max-w-7xl mx-auto grid grid-cols-1 gap-6">
            <div className="flex justify-between items-end border-b border-zinc-200 dark:border-[#27272a] pb-6">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-3xl font-bold text-zinc-900 dark:text-white tracking-tight">Dashboard</h2>

                </div>
                <p className="text-zinc-500 text-sm mt-1">Manage live strategies and simulations</p>
              </div>
              <div className="bg-zinc-100 dark:bg-[#18181b] p-1 rounded-full border border-zinc-200 dark:border-[#27272a] flex">
                <button onClick={() => setActiveTab('live')} className={`px-4 lg:px-6 py-2 rounded-full font-bold text-sm transition-all ${activeTab === 'live' ? 'bg-white dark:bg-zinc-800 text-black dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'}`}>Live</button>
                <button onClick={() => setActiveTab('backtest')} className={`px-4 lg:px-6 py-2 rounded-full font-bold text-sm transition-all ${activeTab === 'backtest' ? 'bg-white dark:bg-zinc-800 text-black dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'}`}>Backtest</button>
                <button onClick={() => setActiveTab('backtest_history')} className={`px-4 lg:px-6 py-2 rounded-full font-bold text-sm transition-all ${activeTab === 'backtest_history' ? 'bg-white dark:bg-zinc-800 text-black dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'}`}>Backtest History</button>
                {user && <button onClick={() => setActiveTab('analytics')} className={`px-4 lg:px-6 py-2 rounded-full font-bold text-sm transition-all ${activeTab === 'analytics' ? 'bg-white dark:bg-zinc-800 text-black dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'}`}>Analytics</button>}
                {/* <button onClick={() => setActiveTab('orderbook')} className={`px-4 lg:px-6 py-2 rounded-full font-bold text-sm transition-all ${activeTab === 'orderbook' ? 'bg-white dark:bg-zinc-800 text-black dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'}`}>Order Book</button> */}
                {user && <button onClick={() => setActiveTab('history')} className={`px-4 lg:px-6 py-2 rounded-full font-bold text-sm transition-all ${activeTab === 'history' ? 'bg-white dark:bg-zinc-800 text-black dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'}`}>History</button>}
                {user && <button onClick={() => setShowProfile(true)} className="ml-2 px-4 lg:px-6 py-2 rounded-full font-bold text-sm bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-all flex items-center gap-2"><UserIcon size={14} /> Profile</button>}
              </div>
            </div>
            {activeTab === 'live' && (
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="lg:col-span-1 flex flex-col gap-6">
                  {/* System Status / Toggle Box */}
                  <div className="bg-white dark:bg-[#121214] border border-zinc-200 dark:border-[#27272a] p-5 rounded-2xl shadow-xl flex items-center justify-between">
                    <div className="flex items-center gap-2 text-zinc-500 text-xs font-bold uppercase tracking-wider">
                      <Zap size={14} className={status === "RUNNING" ? "text-blue-500" : ""} />
                      System Status
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-bold transition-colors ${status === "RUNNING" ? "text-zinc-400" : "text-zinc-600 dark:text-zinc-300"}`}>OFF</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={status === "RUNNING"}
                          onChange={() => status === "RUNNING" ? stopBot() : startBot()}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-zinc-600 peer-checked:bg-blue-600"></div>
                      </label>
                      <span className={`text-xs font-bold transition-colors ${status === "RUNNING" ? "text-blue-600 dark:text-blue-400" : "text-zinc-400"}`}>ON</span>
                    </div>
                  </div>

                  <div className={`bg-white dark:bg-[#121214] border border-zinc-200 dark:border-[#27272a] p-5 rounded-2xl shadow-xl space-y-4 transition-opacity ${status === "RUNNING" ? "opacity-50 pointer-events-none" : ""}`}>
                    <div className="flex items-center gap-2 text-zinc-400 text-xs font-bold uppercase tracking-wider mb-2"><Activity size={14} /> Strategy Config</div>
                    <div className="space-y-4">
                      <InstrumentSearch onAdd={async (item) => {
                        try {
                          const res = await fetchJson('/add_token', { method: 'POST', body: JSON.stringify(item) });

                          if (res.status === 'success') {
                            const syms = await fetchJson('/symbols');
                            setAllSymbols(syms);

                            // Add to watchlist if not already there
                            setLiveSymbols(prev => {
                              if (!prev.includes(item.symbol)) {
                                addToast(`Added ${item.symbol} to watchlist`, "success");
                                return [...prev, item.symbol];
                              }
                              addToast(`${item.symbol} is already in your watchlist`, "info");
                              return prev;
                            });
                          } else {
                            addToast(res.message || "Error adding token", "error");
                          }
                        } catch (e) {
                          addToast(e.message || "Error adding token", "error");
                        }
                      }} />
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-[10px] uppercase text-zinc-500 font-bold">Stock Universe</label>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-2">
                              <button onClick={() => {
                                const csvContent = "data:text/csv;charset=utf-8," + "SYMBOL\nSBIN-EQ\nRELIANCE-EQ\nINFY-EQ\nTATASTEEL-EQ";
                                const encodedUri = encodeURI(csvContent);
                                const link = document.createElement("a");
                                link.setAttribute("href", encodedUri);
                                link.setAttribute("download", "sample_symbols.csv");
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                              }} className="flex items-center gap-1 cursor-pointer text-[10px] text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 font-bold bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded transition-colors" title="Download Sample CSV">
                                <Download size={10} /> Sample
                              </button>
                              <label className="flex items-center gap-1 cursor-pointer text-[10px] text-blue-500 hover:text-blue-400 font-bold bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded transition-colors hover:bg-blue-100 dark:hover:bg-blue-900/40">
                                <Upload size={10} /> Bulk Upload
                                <input type="file" accept=".csv" className="hidden" onChange={handleBulkUpload} />
                              </label>
                              <button onClick={() => setLiveSymbols([])} className="flex items-center justify-center cursor-pointer text-red-500 hover:text-red-400 bg-red-50 dark:bg-red-900/20 w-6 h-6 rounded transition-colors hover:bg-red-100 dark:hover:bg-red-900/40" title="Clear All Symbols">
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        </div>
                        <MultiSelect options={allSymbols} selected={liveSymbols} onChange={setLiveSymbols} placeholder="Select Stocks..." />
                      </div>
                      <div><label className="text-[10px] uppercase text-zinc-500 font-bold block mb-1">Timeframe</label><div className="grid grid-cols-4 gap-1">{tfOptions.map(tf => (<button key={tf.value} onClick={() => setLiveInterval(tf.value)} className={`px-1 py-2 text-[10px] font-bold rounded border transition-all ${liveInterval === tf.value ? 'bg-emerald-100 dark:bg-emerald-900/50 border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'bg-zinc-50 dark:bg-[#18181b] border-zinc-200 dark:border-[#27272a] text-zinc-500 hover:border-zinc-400'}`}>{tf.label}</button>))}</div></div>
                      {/* Strategy Selection */}
                      <div className="mb-4">
                        <label className="text-[10px] uppercase text-zinc-500 font-bold block mb-2">Select Strategy</label>
                        <div className="grid grid-cols-2 gap-3">
                          {[{ id: 'orb', name: 'ORB', desc: 'Opening Range Breakout' }, { id: 'ema', name: 'EMA', desc: '8 & 30 EMA Crossover' }].map(s => (
                            <button key={s.id} onClick={() => setSelectedStrategy(s.id)}
                              className={`p-3 rounded-lg border text-left transition-all ${selectedStrategy === s.id ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 ring-1 ring-blue-500' : 'bg-zinc-50 dark:bg-[#18181b] border-zinc-200 dark:border-[#27272a] hover:border-zinc-300 dark:hover:border-zinc-700'}`}>
                              <div className={`text-xs font-bold mb-0.5 ${selectedStrategy === s.id ? 'text-blue-600 dark:text-blue-400' : 'text-zinc-700 dark:text-zinc-300'}`}>{s.name}</div>
                              <div className="text-[10px] text-zinc-500">{s.desc}</div>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2"><div > <label className="text-[10px] uppercase text-zinc-500 font-bold block mb-1">Start</label><input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full bg-zinc-50 dark:bg-[#18181b] border border-zinc-200 dark:border-[#27272a] rounded px-2 py-2 text-xs text-zinc-900 dark:text-white focus:border-emerald-500 focus:outline-none transition-colors" /></div><div><label className="text-[10px] uppercase text-zinc-500 font-bold block mb-1">Stop</label><input type="time" value={stopTime} onChange={(e) => setStopTime(e.target.value)} className="w-full bg-zinc-50 dark:bg-[#18181b] border border-zinc-200 dark:border-[#27272a] rounded px-2 py-2 text-xs text-zinc-900 dark:text-white focus:border-emerald-500 focus:outline-none transition-colors" /></div></div>
                      <div><label className="text-[10px] uppercase text-zinc-500 font-bold block mb-1">Initial Capital</label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-xs font-bold">₹</span><input type="number" value={initialCapital} onChange={(e) => setInitialCapital(e.target.value)} className="w-full bg-zinc-50 dark:bg-[#18181b] border border-zinc-200 dark:border-[#27272a] rounded pl-6 pr-2 py-2 text-xs text-zinc-900 dark:text-white focus:border-emerald-500 focus:outline-none transition-colors" /></div></div>

                      {/* Safety Guard Config */}
                      <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
                        <div className="flex justify-between items-center mb-2">
                          <label className="text-[10px] uppercase text-zinc-500 font-bold flex items-center gap-1"><ShieldAlert size={12} className={isSafetyOn ? "text-red-500" : ""} /> Safety Guard (Auto-Stop)</label>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={isSafetyOn} onChange={() => { setIsSafetyOn(!isSafetyOn); setSafetyTriggered(false); }} className="sr-only peer" />
                            <div className="w-9 h-5 bg-zinc-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-zinc-600 peer-checked:bg-red-500"></div>
                          </label>
                        </div>
                        <div className={`transition-all duration-300 ${isSafetyOn ? 'opacity-100 max-h-20' : 'opacity-40 max-h-0 overflow-hidden'}`}>
                          <label className="text-[10px] uppercase text-zinc-500 font-bold block mb-1">Max Daily Loss Limit</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-xs font-bold">-₹</span>
                            <input
                              type="number"
                              value={maxLoss}
                              onChange={(e) => setMaxLoss(e.target.value)}
                              className="w-full bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded pl-7 pr-2 py-2 text-xs text-red-600 dark:text-red-400 focus:border-red-500 focus:outline-none transition-colors font-bold"
                              placeholder="1000"
                            />
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>





                  <div className="bg-white dark:bg-[#121214] border border-zinc-200 dark:border-[#27272a] p-5 rounded-2xl shadow-xl relative overflow-hidden flex items-center justify-between">
                    <div className="absolute inset-0 opacity-10 pointer-events-none">

                    </div>
                    <div className="relative z-10 flex items-center gap-2 text-zinc-500 text-xs font-bold uppercase"><DollarSign size={14} /> Live P&L</div>
                    <span className={`relative z-10 font-mono text-2xl font-black ${pnl >= 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'} transition-all`}>{pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}</span>
                  </div>
                </div>
                <div className="lg:col-span-3">
                  <div className="h-full flex flex-col gap-8">
                    {/* Active Trades */}
                    <div className="bg-white dark:bg-[#121214] border border-zinc-200 dark:border-[#27272a] rounded-2xl overflow-hidden shadow-xl flex-shrink-0 min-h-[200px] flex flex-col">
                      <div className="p-4 border-b border-zinc-200 dark:border-[#27272a] flex items-center justify-between">
                        <h3 className="font-bold text-zinc-900 dark:text-white flex items-center gap-2"><Activity size={16} className="text-emerald-500" /> Active Positions</h3>
                        {activeTrades.length > 0 && (
                          <button onClick={handleGlobalSquareOff} className="bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded shadow-sm transition-colors flex items-center gap-1">
                            <AlertTriangle size={12} /> SQUARE OFF ALL
                          </button>
                        )}
                      </div>
                      <div className="overflow-x-auto flex-1">
                        <table className="w-full text-left text-xs table-fixed">
                          <thead className="bg-zinc-50 dark:bg-[#18181b] text-zinc-500 font-bold uppercase sticky top-0">
                            <tr>
                              <th className="px-4 py-3 w-[80px]">Time</th>
                              <th className="px-4 py-3 w-[140px]">Symbol</th>
                              <th className="px-4 py-3 w-[70px]">Type</th>
                              <th className="px-4 py-3 w-[60px]">Qty</th>
                              <th className="px-4 py-3 w-[90px]">Entry</th>
                              <th className="px-4 py-3 w-[90px]">TP</th>
                              <th className="px-4 py-3 w-[90px]">SL</th>
                              <th className="px-4 py-3 w-[90px]">PnL</th>
                              <th className="px-4 py-3 w-[120px]">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-200 dark:divide-[#27272a]">
                            {activeTrades.length === 0 ? <tr><td colSpan="9" className="px-4 py-8 text-center text-zinc-500 italic">No active trades running.</td></tr> : activeTrades.map((t) => (
                              <TradeRow
                                key={t.entry_order_id}
                                t={t}
                                onUpdateTP={async (trade, newTP) => {
                                  try {
                                    const res = await fetchJson('/update_trade', { method: 'POST', body: JSON.stringify({ trade_id: trade.entry_order_id, sl: trade.sl, tp: newTP }) });
                                    if (res.status === 'success') {
                                      addToast(res.message, "success");
                                      setActiveTrades(prev => prev.map(pt => pt.entry_order_id === trade.entry_order_id ? { ...pt, tp: parseFloat(newTP) } : pt));
                                    } else {
                                      addToast(res.message || "Update Failed", "error");
                                    }
                                  } catch (e) {
                                    addToast("Update Failed: " + e.message, "error");
                                  }
                                }}
                                onUpdateSL={async (trade, newSL) => {
                                  try {
                                    const res = await fetchJson('/update_trade', { method: 'POST', body: JSON.stringify({ trade_id: trade.entry_order_id, sl: newSL, tp: trade.tp }) });
                                    if (res.status === 'success') {
                                      addToast(res.message, "success");
                                      setActiveTrades(prev => prev.map(pt => pt.entry_order_id === trade.entry_order_id ? { ...pt, sl: parseFloat(newSL) } : pt));
                                    } else {
                                      addToast(res.message || "Update Failed", "error");
                                    }
                                  } catch (e) {
                                    addToast("Update Failed: " + e.message, "error");
                                  }
                                }}
                                onExit={async (trade) => {
                                  const confirmed = await showConfirm("Force Exit Trade", "This will attempt to square off at market price. Are you sure?", null, "danger");
                                  if (confirmed) {
                                    try { const res = await fetchJson('/exit_trade', { method: 'POST', body: JSON.stringify({ trade_id: trade.entry_order_id }) }); addToast(res.message, "success"); } catch (e) { addToast("Error: " + e.message, "error"); }
                                  }
                                }}
                                onDelete={async (trade) => {
                                  const confirmed = await showConfirm("Delete Trade Record", "This does NOT exit the position on exchange. Only removes from tracking. Continue?", null, "warning");
                                  if (confirmed) {
                                    try { const res = await fetchJson('/delete_active_trade', { method: 'POST', body: JSON.stringify({ trade_id: trade.entry_order_id }) }); addToast(res.message, "success"); } catch (e) { addToast("Error: " + e.message, "error"); }
                                  }
                                }}
                                showPrompt={showPrompt}
                              />
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {showLogs && (
                      <div className="h-[320px] max-h-[320px] bg-zinc-900 dark:bg-black border border-zinc-200 dark:border-[#27272a] rounded-2xl p-4 font-mono text-xs flex flex-col shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-full bg-zinc-800 dark:bg-[#121214] border-b border-zinc-700 dark:border-[#27272a] px-4 py-3 flex items-center justify-between z-10">
                          <div className="flex items-center gap-2 text-zinc-400 dark:text-zinc-500"><Terminal size={14} /> <span className="font-bold uppercase tracking-wider text-[10px]">System Output</span></div>
                          <div className="flex items-center gap-4">
                            <button onClick={() => setShowLogs(false)} title="Hide Logs" className="text-zinc-500 hover:text-blue-500 transition-colors">
                              <EyeOff size={14} />
                            </button>
                            <button onClick={() => { setClearTime(new Date()); setLogs([]); }} title="Clear Logs" className="text-zinc-500 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                            <div className="flex gap-1"><div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50"></div><div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div><div className="w-2.5 h-2.5 rounded-full bg-emerald-500/20 border border-emerald-500/50"></div></div>
                          </div>
                        </div>
                        <div className="mt-10 h-[calc(320px-50px)] max-h-[calc(320px-50px)] overflow-y-auto space-y-1 pr-2 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">{logs.slice(-100).map((log, i) => (<div key={i} className="flex gap-4 hover:bg-zinc-800/50 dark:hover:bg-zinc-900/50 p-0.5 rounded"><span className="text-zinc-500 dark:text-zinc-600 shrink-0 select-none">{log.split(' - ')[0]}</span><span className={`break-all ${log.includes("Error") ? 'text-red-400 font-bold' : (log.includes("SIGNAL") ? 'text-yellow-400 font-bold glow' : 'text-zinc-400 dark:text-zinc-300')}`}>{log.split(' - ').slice(1).join(' - ')}</span></div>))}</div>
                      </div>
                    )}

                    {!showLogs && (
                      <div className="bg-zinc-900/50 dark:bg-black/50 border border-zinc-200 dark:border-[#27272a] rounded-2xl p-4 flex items-center justify-center">
                        <button
                          onClick={() => setShowLogs(true)}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
                        >
                          <Eye size={16} />
                          <span className="font-medium text-sm">Show System Logs</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'orderbook' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-white dark:bg-[#121214] border border-zinc-200 dark:border-[#27272a] rounded-2xl shadow-xl overflow-hidden">
                  <div className="p-6 border-b border-zinc-200 dark:border-[#27272a] flex flex-col md:flex-row justify-between items-end gap-4">
                    <div>
                      <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2 mb-2"><BookOpen size={20} className="text-purple-500" /> Order Book</h2>
                      <p className="text-zinc-500 text-sm">Comprehensive ledger of all algorithmic trades.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2">
                        <CustomDateInput value={obFilters.startDate} onChange={e => setObFilters({ ...obFilters, startDate: e.target.value })} placeholder="Start Date" />
                        <span className="text-zinc-400 font-bold">-</span>
                        <CustomDateInput value={obFilters.endDate} onChange={e => setObFilters({ ...obFilters, endDate: e.target.value })} placeholder="End Date" />
                      </div>
                      <button onClick={() => {
                        const csvContent = "data:text/csv;charset=utf-8," + "ID,Symbol,Entry,Qty,SL,TP,Status,PnL,Time\n" + orderBook.map(row => `${row.id},${row.symbol},${row.entry_price},${row.quantity},${row.sl},${row.tp},${row.status},${row.pnl},${row.timestamp}`).join("\n");
                        const encodedUri = encodeURI(csvContent);
                        const link = document.createElement("a");
                        link.setAttribute("href", encodedUri);
                        link.setAttribute("download", "orderbook.csv");
                        document.body.appendChild(link);
                        link.click();
                      }} className="flex items-center gap-2 px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-lg font-bold text-xs hover:opacity-90 transition-opacity">
                        <Download size={14} /> Download CSV
                      </button>
                      {selectedObIds.size > 0 && (
                        <button onClick={handleDeleteOrders} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-bold text-xs hover:bg-red-700 transition-colors">
                          <Trash2 size={14} /> Delete ({selectedObIds.size})
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-zinc-50 dark:bg-[#18181b] text-zinc-500 font-bold uppercase text-xs border-b border-zinc-200 dark:border-[#27272a]">
                        <tr>
                          <th className="px-6 py-4 w-12">
                            <input type="checkbox"
                              checked={currentObItems.length > 0 && currentObItems.every(i => selectedObIds.has(i.id))}
                              onChange={() => {
                                const newSet = new Set(selectedObIds);
                                if (currentObItems.every(i => newSet.has(i.id))) {
                                  currentObItems.forEach(i => newSet.delete(i.id));
                                } else {
                                  currentObItems.forEach(i => newSet.add(i.id));
                                }
                                setSelectedObIds(newSet);
                              }}
                              className="rounded border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 focus:ring-blue-500 cursor-pointer"
                            />
                          </th>
                          <th className="px-6 py-4">ID</th>
                          <th className="px-6 py-4">Time</th>
                          <th className="px-6 py-4">Mode</th>
                          <th className="px-6 py-4">Symbol</th>
                          <th className="px-6 py-4">Type</th>
                          <th className="px-6 py-4">Price</th>
                          <th className="px-6 py-4">Qty</th>
                          <th className="px-6 py-4">TP</th>
                          <th className="px-6 py-4">SL</th>
                          <th className="px-6 py-4">Status</th>
                          <th className="px-6 py-4 text-right">PnL</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 dark:divide-[#27272a]">
                        {currentObItems.map((row, i) => (
                          <tr key={i} className={`hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors ${selectedObIds.has(row.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                            <td className="px-6 py-4">
                              <input type="checkbox"
                                checked={selectedObIds.has(row.id)}
                                onChange={() => {
                                  const newSet = new Set(selectedObIds);
                                  if (newSet.has(row.id)) newSet.delete(row.id);
                                  else newSet.add(row.id);
                                  setSelectedObIds(newSet);
                                }}
                                className="rounded border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 focus:ring-blue-500 cursor-pointer"
                              />
                            </td>
                            <td className="px-6 py-4 text-zinc-500 font-mono text-xs">#{row.id}</td>
                            <td className="px-6 py-4 text-zinc-500 text-xs text-nowrap">
                              {(() => {
                                try {
                                  const [datePart, timePart] = row.timestamp.split(' ');
                                  const [y, m, d] = datePart.split('-');
                                  return `${d}-${m}-${y} ${timePart ? timePart.split('.')[0] : ''}`;
                                } catch (e) { return row.timestamp; }
                              })()}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 rounded text-[10px] font-bold ${row.is_simulated ? 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' : 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'}`}>
                                {row.is_simulated ? 'PAPER' : 'LIVE'}
                              </span>
                            </td>
                            <td className="px-6 py-4 font-bold text-zinc-900 dark:text-white">{row.symbol}</td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 rounded text-xs font-bold ${row.mode === 'BUY' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'}`}>
                                {row.mode}
                              </span>
                            </td>
                            <td className="px-6 py-4 font-mono">{row.entry_price}</td>
                            <td className="px-6 py-4 font-mono">{row.quantity}</td>
                            <td className="px-6 py-4 font-mono text-emerald-600 dark:text-emerald-400">{row.tp}</td>
                            <td className="px-6 py-4 font-mono text-red-600 dark:text-red-400">{row.sl}</td>
                            <td className="px-6 py-4"><span className={`px-2 py-1 rounded text-xs font-bold ${row.status.startsWith('OPEN') ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' : (row.pnl >= 0 ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' : 'bg-red-100 dark:bg-red-900/30 text-red-600')}`}>{row.status}</span></td>
                            <td className={`px-6 py-4 text-right font-mono font-bold ${row.pnl >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{parseFloat(row.pnl).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {orderBook.length === 0 && <div className="p-12 text-center text-zinc-500">No trades found in order book.</div>}
                  </div>
                  {totalObPages > 1 && (
                    <div className="flex justify-between items-center px-6 py-4 border-t border-zinc-200 dark:border-[#27272a]">
                      <span className="text-sm text-zinc-500">
                        Page {obPage} of {totalObPages}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setObPage(prev => Math.max(prev - 1, 1))}
                          disabled={obPage === 1}
                          className="px-3 py-1 text-sm bg-zinc-100 dark:bg-zinc-800 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50 transition-colors"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => setObPage(prev => Math.min(prev + 1, totalObPages))}
                          disabled={obPage === totalObPages}
                          className="px-3 py-1 text-sm bg-zinc-100 dark:bg-zinc-800 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50 transition-colors"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            {activeTab === 'backtest' && (
              <div className="grid grid-cols-1 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-col gap-6 bg-white dark:bg-[#121214] p-6 rounded-2xl border border-zinc-200 dark:border-[#27272a] shadow-xl">
                  <div className="bg-white dark:bg-[#121214] border border-zinc-200 dark:border-[#27272a] rounded-2xl p-6 shadow-xl h-fit">
                    <div><h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-2 flex items-center gap-2"><Database size={20} className="text-cyan-500 dark:text-cyan-400" /> Backtest Configuration</h2><p className="text-zinc-500 text-sm mb-1">Run historical simulations.</p><p className="text-zinc-400 text-xs flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800/50 w-fit px-2 py-1 rounded border border-zinc-200 dark:border-zinc-800"><Info size={12} className="text-cyan-500" /> Backtest will be performed with an initial capital of <strong>₹1,00,000</strong></p></div>

                    <div className="mt-6 mb-6">
                      <label className="text-[10px] uppercase text-zinc-500 font-bold block mb-2">Strategy to Test</label>
                      <div className="grid grid-cols-2 gap-3">
                        {[{ id: 'orb', name: 'ORB', desc: 'Opening Range Breakout' }, { id: 'ema', name: 'EMA', desc: '8 & 30 EMA Crossover' }].map(s => (
                          <button key={s.id} onClick={() => setSelectedStrategy(s.id)}
                            className={`p-3 rounded-lg border text-left transition-all ${selectedStrategy === s.id ? 'bg-cyan-50 dark:bg-cyan-900/20 border-cyan-500 ring-1 ring-cyan-500' : 'bg-zinc-50 dark:bg-[#18181b] border-zinc-200 dark:border-[#27272a] hover:border-zinc-300 dark:hover:border-zinc-700'}`}>
                            <div className={`text-xs font-bold mb-0.5 ${selectedStrategy === s.id ? 'text-cyan-600 dark:text-cyan-400' : 'text-zinc-700 dark:text-zinc-300'}`}>{s.name}</div>
                            <div className="text-[10px] text-zinc-500">{s.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-end gap-6 w-full">
                    <div className="w-[320px]"><InstrumentSearch onAdd={async (item) => {
                      try {
                        const res = await fetchJson('/add_token', { method: 'POST', body: JSON.stringify(item) });

                        if (res.status === 'success') {
                          const syms = await fetchJson('/symbols');
                          setAllSymbols(syms);

                          // Add to backtest list if not already there
                          setBtSymbols(prev => {
                            if (!prev.includes(item.symbol)) {
                              addToast(`Added ${item.symbol} to backtest list`, "success");
                              return [...prev, item.symbol];
                            }
                            addToast(`${item.symbol} is already in backtest list`, "info");
                            return prev;
                          });
                        } else {
                          addToast(res.message || "Error adding token", "error");
                        }
                      } catch (e) {
                        addToast(e.message || "Error adding token", "error");
                      }
                    }} /></div>
                    <div className="w-[200px] mb-4"><MultiSelect label="Stocks" options={allSymbols} selected={btSymbols} onChange={setBtSymbols} placeholder="Select..." /></div>
                    <div className="w-[100px] mb-4"><label className="text-[10px] uppercase text-zinc-500 font-bold block mb-1">Interval</label><select value={btInterval} onChange={(e) => setBtInterval(e.target.value)} className="w-full bg-zinc-50 dark:bg-[#18181b] border border-zinc-200 dark:border-[#27272a] rounded px-3 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-cyan-500 h-[42px] cursor-pointer">{tfOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
                    <div className="w-[160px] mb-4"><label className="text-[10px] uppercase text-zinc-500 font-bold block mb-1">From</label><CustomDateTimeInput value={fromDate} onChange={(e) => setFromDate(e.target.value)} /></div>
                    <div className="w-[160px] mb-4"><label className="text-[10px] uppercase text-zinc-500 font-bold block mb-1">To</label><CustomDateTimeInput value={toDate} onChange={(e) => setToDate(e.target.value)} /></div>
                    <button onClick={runBacktest} disabled={isBacktesting} className={`flex items-center gap-2 px-8 py-2 mb-4 rounded-xl font-bold transition-all h-[42px] ${isBacktesting ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500 cursor-not-allowed' : 'bg-cyan-600 text-white hover:bg-cyan-500 hover:shadow-lg shadow-cyan-500/20'}`}>Run {isBacktesting ? '...' : <Play size={16} fill="currentColor" />}</button>
                  </div>
                </div>
                <ErrorBanner message={error} onClose={() => setError(null)} />
                {backtestResults.length > 0 && (
                  <div className="bg-white dark:bg-[#121214] rounded-2xl border border-zinc-200 dark:border-[#27272a] overflow-hidden shadow-2xl">
                    <div className="p-4 border-b border-zinc-200 dark:border-[#27272a] flex justify-between items-center">
                      <h3 className="font-bold text-zinc-900 dark:text-white">Results</h3>
                      {user && (
                        <button
                          onClick={async () => {
                            try {
                              const res = await fetchJson('/save_backtest', {
                                method: 'POST',
                                body: JSON.stringify({
                                  results: backtestResults,
                                  interval: btInterval,
                                  fromDate,
                                  toDate
                                })
                              });
                              if (res.status === 'success') {
                                addToast(`✓ Saved ${res.saved} results to history!`, "success");
                              }
                            } catch (err) {
                              addToast('Error saving: ' + err.message, "error");
                            }
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white dark:text-black rounded-lg font-bold text-sm hover:bg-emerald-400 transition-all"
                        >
                          <Database size={16} /> Save to History
                        </button>
                      )}
                    </div>
                    <table className="w-full text-left text-sm text-zinc-500 dark:text-zinc-400">
                      <thead className="bg-zinc-100 dark:bg-[#18181b] uppercase font-bold text-xs text-zinc-500 border-b border-zinc-200 dark:border-[#27272a]">
                        <tr>
                          <th className="px-6 py-4">Symbol</th>
                          <th className="px-6 py-4">Trades</th>
                          <th className="px-6 py-4">Win Rate</th>
                          <th className="px-6 py-4">P&L</th>
                          <th className="px-6 py-4">Final Cap</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 dark:divide-[#27272a]">
                        {backtestResults.map((row, i) => {
                          const pnlVal = parseFloat(String(row['Total P&L']).replace(/[^0-9.-]+/g, ""));
                          return (
                            <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                              <td className="px-6 py-4 font-bold text-zinc-900 dark:text-white">{row.Symbol}</td>
                              <td className="px-6 py-4">{row['Total Trades']}</td>
                              <td className="px-6 py-4">{row['Win Rate %']}</td>
                              <td className={`px-6 py-4 font-mono font-bold ${pnlVal >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                {row['Total P&L']}
                              </td>
                              <td className="px-6 py-4 font-mono">{row['Final Capital'] || '-'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'backtest_history' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <BacktestHistory />
              </div>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-white dark:bg-[#121214] border border-zinc-200 dark:border-[#27272a] rounded-2xl shadow-xl overflow-hidden">
                  <div className="p-6 border-b border-zinc-200 dark:border-[#27272a]">
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                      <BarChart3 size={20} className="text-blue-500" /> Performance Analytics
                    </h2>
                    <p className="text-zinc-500 text-sm mt-1">Complete overview of your trading performance</p>
                  </div>

                  {!analyticsData ? (
                    <div className="p-12 text-center">
                      <div className="w-8 h-8 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-zinc-500 text-sm">Loading analytics...</p>
                    </div>
                  ) : (
                    <>

                      {/* Metrics Grid */}
                      <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Total Trades */}
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/10 border border-blue-200 dark:border-blue-900/30 rounded-xl p-5">
                          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase mb-2">
                            <Activity size={14} /> Total Trades
                          </div>
                          <div className="text-3xl font-black text-blue-900 dark:text-blue-100">{analyticsData?.total_trades || 0}</div>
                          <div className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-1">Last 30 days</div>
                        </div>

                        {/* Win Rate */}
                        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/10 border border-emerald-200 dark:border-emerald-900/30 rounded-xl p-5">
                          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase mb-2">
                            <TrendingUp size={14} /> Win Rate
                          </div>
                          <div className="text-3xl font-black text-emerald-900 dark:text-emerald-100">{analyticsData?.win_rate?.toFixed(1) || 0}%</div>
                          <div className="text-xs text-emerald-600/70 dark:text-emerald-400/70 mt-1">{analyticsData?.winning_trades || 0}W / {analyticsData?.losing_trades || 0}L</div>
                        </div>

                        {/* Avg Profit/Trade */}
                        <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-cyan-900/20 dark:to-cyan-800/10 border border-cyan-200 dark:border-cyan-900/30 rounded-xl p-5">
                          <div className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400 text-xs font-bold uppercase mb-2">
                            <DollarSign size={14} /> Avg Profit/Trade
                          </div>
                          <div className="text-3xl font-black text-cyan-900 dark:text-cyan-100">₹{analyticsData?.avg_profit_per_trade?.toFixed(0) || 0}</div>
                          <div className="text-xs text-cyan-600/70 dark:text-cyan-400/70 mt-1">Per executed trade</div>
                        </div>

                        {/* Profit Factor */}
                        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/10 border border-purple-200 dark:border-purple-900/30 rounded-xl p-5">
                          <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 text-xs font-bold uppercase mb-2">
                            <BarChart3 size={14} /> Profit Factor
                          </div>
                          <div className="text-3xl font-black text-purple-900 dark:text-purple-100">{analyticsData?.profit_factor?.toFixed(2) || 0}</div>
                          <div className="text-xs text-purple-600/70 dark:text-purple-400/70 mt-1">{(analyticsData?.profit_factor || 0) > 1.5 ? 'Excellent' : (analyticsData?.profit_factor || 0) > 1 ? 'Good' : 'Needs Work'}</div>
                        </div>
                      </div>

                      {/* Additional Metrics Row */}
                      <div className="px-6 pb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Best Day */}
                        <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
                          <div className="text-xs text-zinc-500 font-bold uppercase mb-2">🏆 Best Day</div>
                          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                            {analyticsData?.best_day?.pnl >= 0 ? '+' : ''}₹{analyticsData?.best_day?.pnl?.toFixed(2) || 0}
                          </div>
                          <div className="text-xs text-zinc-500 mt-1">{analyticsData?.best_day?.date || 'N/A'}</div>
                        </div>

                        {/* Worst Day */}
                        <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
                          <div className="text-xs text-zinc-500 font-bold uppercase mb-2">📉 Worst Day</div>
                          <div className="text-2xl font-black text-red-600 dark:text-red-400">₹{analyticsData?.worst_day?.pnl?.toFixed(2) || 0}</div>
                          <div className="text-xs text-zinc-500 mt-1">{analyticsData?.worst_day?.date || 'N/A'}</div>
                        </div>

                        {/* Max Drawdown */}
                        <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
                          <div className="text-xs text-zinc-500 font-bold uppercase mb-2">⚠️ Max Drawdown</div>
                          <div className="text-2xl font-black text-orange-600 dark:text-orange-400">-{analyticsData?.max_drawdown?.toFixed(1) || 0}%</div>
                          <div className="text-xs text-zinc-500 mt-1">From peak</div>
                        </div>
                      </div>

                      {/* Charts Section */}
                      <div className="p-6 border-t border-zinc-200 dark:border-zinc-800">
                        <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">Daily P&L Trend (Last 7 Days)</h3>

                        {/* Simple Bar Chart */}
                        <div className="flex items-end justify-between gap-2 h-48 bg-zinc-50 dark:bg-zinc-900/30 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800">
                          {(analyticsData?.daily_pnl || []).map((item, i) => {
                            const maxPnl = Math.max(...(analyticsData?.daily_pnl || [{ pnl: 1 }]).map(d => Math.abs(d.pnl)), 1);
                            const height = Math.abs(item.pnl) / maxPnl * 100;
                            const isPositive = item.pnl >= 0;
                            const label = Math.abs(item.pnl) >= 1000
                              ? (item.pnl >= 0 ? `+${(item.pnl / 1000).toFixed(1)}K` : `${(item.pnl / 1000).toFixed(1)}K`)
                              : (item.pnl >= 0 ? `+${item.pnl.toFixed(0)}` : `${item.pnl.toFixed(0)}`);

                            return (
                              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                                <div className="text-[10px] font-bold text-zinc-900 dark:text-white">{label}</div>
                                <div
                                  className={`w-full rounded-t transition-all hover:opacity-80 ${isPositive ? 'bg-emerald-500' : 'bg-red-500'}`}
                                  style={{ height: `${height}%`, minHeight: '10px' }}
                                  title={`₹${item.pnl.toFixed(2)}`}
                                />
                                <div className="text-xs text-zinc-500 font-medium">{item.day}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Win/Loss Pie Chart */}
                      <div className="p-6 border-t border-zinc-200 dark:border-zinc-800">
                        <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">Win/Loss Distribution</h3>
                        <div className="flex items-center justify-center gap-12">
                          {/* Simple Pie Chart using conic-gradient */}
                          <div className="relative">
                            <div
                              className="w-48 h-48 rounded-full"
                              style={{
                                background: `conic-gradient(from 0deg, #10b981 0%, #10b981 ${analyticsData?.win_rate || 0}%, #ef4444 ${analyticsData?.win_rate || 0}%, #ef4444 100%)`
                              }}
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-32 h-32 bg-white dark:bg-[#121214] rounded-full flex items-center justify-center">
                                <div className="text-center">
                                  <div className="text-2xl font-black text-zinc-900 dark:text-white">{analyticsData?.win_rate?.toFixed(1) || 0}%</div>
                                  <div className="text-xs text-zinc-500">Win Rate</div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Legend */}
                          <div className="space-y-4">
                            <div className="flex items-center gap-3">
                              <div className="w-4 h-4 rounded bg-emerald-500" />
                              <div>
                                <div className="text-sm font-bold text-zinc-900 dark:text-white">Winning Trades</div>
                                <div className="text-xs text-zinc-500">{analyticsData?.winning_trades || 0} trades ({analyticsData?.win_rate?.toFixed(1) || 0}%)</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="w-4 h-4 rounded bg-red-500" />
                              <div>
                                <div className="text-sm font-bold text-zinc-900 dark:text-white">Losing Trades</div>
                                <div className="text-xs text-zinc-500">{analyticsData?.losing_trades || 0} trades ({(100 - (analyticsData?.win_rate || 0)).toFixed(1)}%)</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'history' && <HistoryTable user={user} showConfirm={showConfirm} addToast={addToast} />}
          </div>
        </main>
      </>
    );
  }


  // Show loading screen while checking auth
  if (authLoading) {
    return (
      <div className={`min-h-screen bg-white dark:bg-[#09090b] text-zinc-900 dark:text-[#e0e0e0] font-sans flex items-center justify-center ${theme}`}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-zinc-500 dark:text-zinc-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col bg-white dark:bg-[#09090b] text-zinc-900 dark:text-[#e0e0e0] font-sans transition-colors duration-300 ${theme}`}>
      <style jsx global>{`@keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }`}</style>
      {isBacktesting && <LoadingOverlay progress={progress} />}
      {showProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={(e) => { if (e.target === e.currentTarget) setShowProfile(false); }}>
          <div className="bg-white dark:bg-[#121214] border border-zinc-200 dark:border-[#27272a] p-8 rounded-2xl w-full max-w-2xl shadow-2xl relative">
            <button onClick={() => setShowProfile(false)} className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-200"><X size={20} /></button>
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><UserIcon size={20} className="text-emerald-500" /> Profile Configuration</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="font-bold text-emerald-500 uppercase text-xs tracking-wider border-b border-emerald-500/20 pb-2">Trading API (Angel One)</h3>
                <PasswordInput label="API Key" value={apiKey} onChange={e => setApiKey(e.target.value)} color="emerald" />
                <div><label className="text-[10px] uppercase text-zinc-500 font-bold block mb-1">Client Code</label><input type="text" value={clientCode} onChange={e => setClientCode(e.target.value)} className="w-full bg-zinc-50 dark:bg-[#18181b] border border-zinc-200 dark:border-[#27272a] rounded px-3 py-2 text-xs text-zinc-900 dark:text-white focus:border-emerald-500 focus:outline-none" /></div>
                <PasswordInput label="Password" value={password} onChange={e => setPassword(e.target.value)} color="emerald" />
                <PasswordInput label="TOTP Token" value={totp} onChange={e => setTotp(e.target.value)} color="emerald" />
              </div>

              <div className="space-y-4">
                <h3 className="font-bold text-cyan-500 uppercase text-xs tracking-wider border-b border-cyan-500/20 pb-2">Backtest API</h3>
                <PasswordInput label="Backtest API Key" value={backtestKey} onChange={e => setBacktestKey(e.target.value)} color="cyan" />
                <div><label className="text-[10px] uppercase text-zinc-500 font-bold block mb-1">Backtest Client Code</label><input type="text" value={btClientCode} onChange={e => setBtClientCode(e.target.value)} className="w-full bg-zinc-50 dark:bg-[#18181b] border border-zinc-200 dark:border-[#27272a] rounded px-3 py-2 text-xs text-zinc-900 dark:text-white focus:border-cyan-500 focus:outline-none" /></div>
                <PasswordInput label="Backtest Password" value={btPassword} onChange={e => setBtPassword(e.target.value)} color="cyan" />
                <PasswordInput label="Backtest TOTP" value={btTotp} onChange={e => setBtTotp(e.target.value)} color="cyan" />
                <p className="text-[10px] text-zinc-500 italic">Separate credentials used for historical data fetching.</p>
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <button onClick={async () => {
                try {
                  await fetchJson('/update_profile', {
                    method: 'POST', body: JSON.stringify({
                      angel_api_key: apiKey, angel_client_code: clientCode, angel_password: password, angel_totp: totp,
                      backtest_api_key: backtestKey, backtest_client_code: btClientCode, backtest_password: btPassword, backtest_totp: btTotp
                    })
                  }); addToast("✓ Profile Saved Securely!", "success"); setShowProfile(false);
                } catch (e) { addToast(e.message, "error"); }
              }} className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 px-6 rounded-xl transition-all shadow-lg shadow-emerald-500/20">Save Profile</button>
            </div>
          </div>
        </div>
      )}
      <Header
        onNavigate={(page) => {
          if (page === 'dashboard') {
            if (!user) {
              addToast("Please sign in to access the Dashboard", "info");
              setCurrentPage('login');
            } else {
              router.push('/dashboard');
            }
          } else {
            setCurrentPage(page);
          }
        }}
        activePage={currentPage}
        theme={theme}
        toggleTheme={toggleTheme}
        user={user}
        logout={handleLogout}
        onTabChange={setActiveTab}
        isSimulated={isSimulated}
        setIsSimulated={handleModeSwitch}
        onOpenProfile={() => setShowProfile(true)}
      />
      <div className="flex-1 flex flex-col min-h-[85vh]">
        {content}
      </div>
      <Footer />
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <ConfirmDialog {...confirmDialog} />
      <PromptDialog {...promptDialog} />
      <ProfileModal isOpen={showProfile} onClose={() => setShowProfile(false)} user={user} addToast={addToast} />
      <RiskDisclosureModal
        isOpen={showRiskModal}
        onAccept={() => {
          setShowRiskModal(false);
          if (pendingUser) {
            setUser(pendingUser);
            // Redirect to new dashboard
            router.push('/dashboard');
            setPendingUser(null);
          }
        }}
        onReject={() => {
          setShowRiskModal(false);
          setPendingUser(null);
          addToast("You must accept the risk disclosure to proceed.", "warning");
        }}
      />
    </div>
  );
}
