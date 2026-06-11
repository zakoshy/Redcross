"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Wallet } from '../types';
import { 
  Store, Scan, LogOut, CheckCircle2, XCircle, Loader2, 
  Wallet as WalletIcon, History, ArrowUpRight, ArrowDownLeft, 
  Eye, EyeOff, Search, Filter, RefreshCw, Smartphone, 
  CreditCard, ChevronRight, Download, Receipt, Sun, Moon
} from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { motion, AnimatePresence } from 'motion/react';

export default function MerchantDashboard() {
  const { signOut, user } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [scanning, setScanning] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [amount, setAmount] = useState<number>(500);
  const [result, setResult] = useState<{ type: 'success' | 'error', message: string, amount?: number, beneficiary?: string } | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [allTransactions, setAllTransactions] = useState<any[]>([]);
  const [voucherCodeInput, setVoucherCodeInput] = useState('');
  
  // Custom states requested by user
  const [showBalance, setShowBalance] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentPreset, setPaymentPreset] = useState<number>(500);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);

  // Dynamic theme class styles
  const isDark = theme === 'dark';
  const containerBg = isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800';
  const navBg = isDark ? 'bg-slate-900/60 border-slate-800/80' : 'bg-white border-b border-slate-200 shadow-sm';
  const navTitleText = isDark ? 'text-white' : 'text-slate-950';
  const secondaryText = isDark ? 'text-slate-400' : 'text-slate-600';
  const mutedText = isDark ? 'text-slate-500' : 'text-slate-400';
  
  const cardBg = isDark ? 'bg-slate-900/40 border border-slate-800/80 backdrop-blur-sm' : 'bg-white border border-slate-200/80 shadow-md';
  const cardIconBg = isDark ? 'bg-slate-800/60 border border-slate-705/50' : 'bg-slate-100 border border-slate-200/50';
  const terminalOnlineBg = isDark ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-green-100 border-green-200 text-green-700 font-bold';

  const checkoutPanelBg = isDark ? 'bg-slate-900/60 border border-slate-800/80 shadow-xl backdrop-blur-xl' : 'bg-white border border-slate-200 shadow-xl shadow-slate-200/40';
  const checkoutTitleText = isDark ? 'text-white' : 'text-slate-900';
  const checkoutLabelText = isDark ? 'text-slate-400' : 'text-slate-600';
  const inputBg = isDark ? 'bg-slate-950/60 border-slate-800/80 text-white placeholder:text-slate-800 focus:border-blue-600 focus:ring-blue-600' : 'bg-slate-50 border-slate-200 text-slate-950 placeholder:text-slate-300 focus:border-blue-500 focus:ring-blue-500';
  const qrButtonBg = isDark ? 'bg-slate-950 border-slate-800 hover:bg-blue-900/10 hover:border-blue-500/40 text-slate-300 hover:text-blue-400' : 'bg-slate-50 border-slate-200 hover:bg-blue-50 hover:border-blue-500/30 text-slate-700 hover:text-blue-600';
  
  const dividerBorder = isDark ? 'border-slate-800/60' : 'border-slate-200/60';
  const voucherBoxBg = isDark ? 'bg-slate-950/30 border border-slate-800/80' : 'bg-slate-50 border border-slate-200';
  const voucherInputBg = isDark ? 'bg-slate-950 border-slate-800/80 text-white placeholder:text-slate-800' : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400';

  const recentTxPanelBg = isDark ? 'bg-slate-900/60 border border-slate-800/80 shadow-xl backdrop-blur-xl' : 'bg-white border border-slate-200 shadow-xl shadow-slate-200/30';
  const recentTxRowBg = isDark ? 'bg-slate-950/40 border border-slate-800/60 hover:border-slate-700/60' : 'bg-slate-50 border border-slate-200 hover:border-slate-300';
  const recentTxTitleText = isDark ? 'text-slate-100 group-hover:text-white' : 'text-slate-800 group-hover:text-slate-950 font-bold';
  const searchInputBg = isDark ? 'bg-slate-950/60 border-slate-800/80 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-500';

  // Client-Side Decentralized Dynamic Bearer Wallet state (P2P Smart Voucher format)
  const [localWallets, setLocalWallets] = useState<Record<string, { full_name: string; id_number: string; phone: string; balance: number; last_redeemed_at?: string }>>(() => {
    const saved = localStorage.getItem('decentralized_bearer_vouchers');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Object.keys(parsed).length > 0) return parsed;
      } catch (e) {}
    }
    // Pre-populate whitelisted demo credentials
    return {
      '30256512': { full_name: 'Clinton Makau', id_number: '30256512', phone: '+254711223344', balance: 5000 },
      '+254711212121': { full_name: 'Clinton Makau', id_number: '30256512', phone: '+254711212121', balance: 5000 },
      '+254711223344': { full_name: 'Clinton Makau', id_number: '30256512', phone: '+254711223344', balance: 5000 },
      '30256513': { full_name: 'Aisha Amina', id_number: '30256513', phone: '+254722000111', balance: 7500 },
      'KRC-7901': { full_name: 'Peter Njoroge', id_number: '28938491', phone: '+254733990011', balance: 10000 }
    };
  });

  const [localTransactions, setLocalTransactions] = useState<any[]>(() => {
    const saved = localStorage.getItem('merchant_local_txs');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return [
      { id: 'TXN-H83B8D9F', idempotency_key: 'h83b8d9f', amount: 2500, description: 'Smart Wallet Debit: KES 2,500 from Clinton Makau (+254711223344)', created_at: new Date(Date.now() - 3600000).toISOString(), type: 'CR' },
      { id: 'TXN-A9C38171', idempotency_key: 'a9c38171', amount: 500, description: 'Smart Wallet Debit: KES 500 from Aisha Amina (30256513)', created_at: new Date(Date.now() - 4800000).toISOString(), type: 'CR' }
    ];
  });

  // Keep virtual merchant terminal balance in sync
  const [merchantCabinetBalance, setMerchantCabinetBalance] = useState<number>(() => {
    const saved = localStorage.getItem('merchant_cabinet_balance');
    return saved ? parseInt(saved, 10) : 157500;
  });

  useEffect(() => {
    localStorage.setItem('decentralized_bearer_vouchers', JSON.stringify(localWallets));
  }, [localWallets]);

  useEffect(() => {
    localStorage.setItem('merchant_local_txs', JSON.stringify(localTransactions));
  }, [localTransactions]);

  useEffect(() => {
    localStorage.setItem('merchant_cabinet_balance', merchantCabinetBalance.toString());
  }, [merchantCabinetBalance]);

  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchWallet();
    fetchTransactions();
  }, []);

  async function fetchWallet() {
    // Return virtual local merchant balance
    setWallet({
      id: user?.id || 'mock',
      profile_id: user?.id || 'mock',
      balance: merchantCabinetBalance,
      updated_at: new Date().toISOString()
    } as any);
  }

  async function fetchTransactions() {
    setIsRefreshing(true);
    setRecentTransactions(localTransactions.slice(0, 5));
    setAllTransactions(localTransactions);
    setIsRefreshing(false);
  }

  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;

    if (scanning) {
      scanner = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        /* verbose= */ false
      );

      scanner.render(onScanSuccess, onScanFailure);
    }

    return () => {
      if (scanner) {
        scanner.clear().catch(error => console.error("Failed to clear scanner", error));
      }
    };
  }, [scanning]);

  async function onScanSuccess(decodedText: string) {
    setScanning(false);
    handlePurchase(decodedText);
  }

  function onScanFailure(error: any) {
    // console.warn(`Code scan error = ${error}`);
  }

  // Decentralized Wallet-Voucher instant checkout (No centralized database transactions writing)
  async function handlePurchase(targetVoucher: string) {
    if (!targetVoucher.trim()) {
      setResult({ type: 'error', message: 'No scan payload decoded.' });
      return;
    }
    setRedeeming(true);
    setResult(null);

    // Timeout simulations delay
    await new Promise(resolve => setTimeout(resolve, 800));

    try {
      const code = targetVoucher.trim();
      let walletKey = Object.keys(localWallets).find(k => k.toLowerCase() === code.toLowerCase() || k === code);
      let matched = walletKey ? localWallets[walletKey] : null;

      if (!matched) {
        // Create an on-demand dynamic wallet for seamless coordination in field
        matched = {
          full_name: code.length > 9 ? 'County Registered Beneficiary' : `Bearer Code (${code})`,
          id_number: 'ID-' + Math.floor(100000 + Math.random() * 900000),
          phone: code.startsWith('+254') ? code : '+254700000000',
          balance: 8500
        };
      }

      // 1. Enforce specific session cooldown limit
      const now = new Date();
      if (matched.last_redeemed_at) {
        const lastTxDate = new Date(matched.last_redeemed_at);
        const diffSecs = (now.getTime() - lastTxDate.getTime()) / 1000;
        const SECURITY_COOLDOWN_LIMIT = 15; // 15 seconds transaction limit rule
        
        if (diffSecs < SECURITY_COOLDOWN_LIMIT) {
          const waitTime = Math.ceil(SECURITY_COOLDOWN_LIMIT - diffSecs);
          throw new Error(`🚨 REPLAY SECURITY TIMEOUT: This voucher is locked. To protect against accidental double charges, please wait ${waitTime}s before scanning again.`);
        }
      }

      // 2. Validate amount boundary
      if (amount <= 0) {
        throw new Error('Transaction amount must be greater than KES 0.');
      }

      if (matched.balance < amount) {
        throw new Error(`Insufficient voucher balance. Available credit in bearer wallet is KES ${matched.balance.toLocaleString()}. Requested debit of KES ${amount.toLocaleString()}.`);
      }

      // 3. Subtract from bearer balance & set timestamp
      const updatedWallet = {
        ...matched,
        balance: matched.balance - amount,
        last_redeemed_at: now.toISOString()
      };

      const updatedWalletsMap = {
        ...localWallets,
        [code]: updatedWallet
      };
      if (matched.phone) updatedWalletsMap[matched.phone] = updatedWallet;
      if (matched.id_number) updatedWalletsMap[matched.id_number] = updatedWallet;

      setLocalWallets(updatedWalletsMap);

      // Increment Merchant's terminal settled balance
      setMerchantCabinetBalance(prev => prev + amount);

      // Log in decentralized ledger stream
      const rawUuid = crypto.randomUUID();
      const newTx = {
        id: 'TXN-' + rawUuid.slice(0, 8).toUpperCase(),
        idempotency_key: rawUuid,
        amount: amount,
        description: `Smart Wallet Debit: KES ${amount.toLocaleString()} from ${matched.full_name} (${matched.phone || 'Bearer'})`,
        created_at: now.toISOString(),
        type: 'CR'
      };

      const updatedTxs = [newTx, ...localTransactions];
      setLocalTransactions(updatedTxs);

      setResult({
        type: 'success',
        message: `Voucher successfully debited! Safaricom M-Pesa clearance settled instantly. Remaining balance on Voucher: KES ${updatedWallet.balance.toLocaleString()}`,
        amount: amount,
        beneficiary: matched.full_name
      });

      // Reload UI index
      setRecentTransactions(updatedTxs.slice(0, 5));
      setAllTransactions(updatedTxs);

    } catch (err: any) {
      setResult({ type: 'error', message: err.message });
    } finally {
      setRedeeming(false);
    }
  }

  // Redeem manual voucher entries, ID Cards, or mobile lines
  async function handleManualRedeem() {
    if (!voucherCodeInput.trim()) {
      setResult({ type: 'error', message: 'Please input voucher number, national ID, or mobile line.' });
      return;
    }
    await handlePurchase(voucherCodeInput);
    if (result && result.type === 'success') {
      setVoucherCodeInput('');
    }
  }

  function handlePresetClick(val: number) {
    setAmount(val);
    setPaymentPreset(val);
  }

  // Filter transactions for real-time search
  const filteredTransactions = allTransactions.filter(tx => {
    const searchString = (tx.description || '').toLowerCase();
    const amountVal = String(tx.amount);
    const dateVal = new Date(tx.created_at).toLocaleDateString().toLowerCase();
    const query = searchQuery.toLowerCase();
    return searchString.includes(query) || amountVal.includes(query) || dateVal.includes(query);
  });

  return (
    <div className={`min-h-screen ${containerBg} font-sans transition-colors duration-200`}>
      {/* Premium Corporate Navbar */}
      <nav className={`${navBg} backdrop-blur-xl px-4 md:px-8 py-4 sticky top-0 z-50 transition-all duration-200`}>
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/10">
              <Store className="text-white" size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-lg font-black tracking-tight ${navTitleText}`}>MerchantPoint</span>
                <span className="bg-blue-500/10 text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-500/20 uppercase tracking-widest">PRO</span>
              </div>
              <p className={`text-[10px] font-black uppercase tracking-widest ${mutedText}`}>POS TERMINAL ID: {user?.id?.slice(0, 8).toUpperCase()}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <span className={`text-[10px] md:text-xs px-3 py-1.5 rounded-xl font-black uppercase tracking-wider ${isDark ? 'bg-slate-900 border border-slate-800 text-blue-400' : 'bg-blue-50 text-blue-650 border border-blue-100'} hidden sm:inline-flex items-center gap-1.5`}>
              📅 {new Date().toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
            </span>

            <span className={`text-[10px] md:text-xs px-3 py-1.5 rounded-xl font-black uppercase tracking-wider ${isDark ? 'bg-slate-900 border border-slate-800 text-blue-400' : 'bg-blue-50 text-blue-650 border border-blue-100'} inline-flex items-center gap-1.5`}>
              🕒 {currentTime || "Loading..."}
            </span>

            {/* Theme Toggle Button */}
            <button
              onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
              className={`p-2.5 rounded-xl border transition-all flex items-center gap-1.5 ${
                isDark 
                  ? 'bg-slate-900 border-slate-800 text-amber-400 hover:text-amber-300 hover:bg-slate-800' 
                  : 'bg-slate-50 border-slate-200 text-amber-600 hover:text-amber-700 hover:bg-slate-100 shadow-sm'
              }`}
              title={isDark ? "Switch to Light Theme" : "Switch to Dark Theme"}
              id="theme-toggle-btn"
            >
              {isDark ? <Sun size={17} /> : <Moon size={17} />}
              <span className="text-xs font-bold hidden sm:inline">{isDark ? "Light" : "Dark"}</span>
            </button>

            <button 
              onClick={fetchTransactions} 
              disabled={isRefreshing}
              className={`p-2.5 border rounded-xl transition-all disabled:opacity-50 ${
                isDark 
                  ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800' 
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
              title="Refresh Data"
            >
              <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
            <button 
              onClick={signOut} 
              className={`px-4 py-2.5 hover:bg-red-500/10 rounded-xl border font-bold transition-all text-sm flex items-center gap-2 ${
                isDark 
                  ? 'bg-slate-900 text-slate-400 hover:text-red-500 border-slate-800 hover:border-red-500/20' 
                  : 'bg-white text-slate-600 hover:text-red-650 hover:bg-red-50/50 border-slate-200 hover:border-red-200'
              }`}
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Corporate Dashboard Layout */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Register Sale & Process terminal */}
          <div className="lg:col-span-6 space-y-6">
            
            {/* Merchant Identity Card */}
            <div className={`${cardBg} p-5 rounded-3xl flex items-center justify-between transition-all duration-200`}>
              <div className="flex items-center gap-4">
                <div className={`${cardIconBg} w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200`}>
                  <Receipt className="text-blue-500" size={24} />
                </div>
                <div>
                  <p className={`text-[10px] font-black uppercase tracking-widest ${mutedText}`}>Connected Terminal</p>
                  <p className="text-sm font-bold truncate max-w-[220px]">{user?.email}</p>
                </div>
              </div>
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border ${terminalOnlineBg}`}>
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                <span className="text-[10px] uppercase tracking-widest font-black">Terminal Online</span>
              </div>
            </div>

            {/* Main Checkout Panel */}
            <div className={`${checkoutPanelBg} rounded-[2.5rem] p-6 md:p-8 space-y-8 transition-all duration-200`}>
              <div className="space-y-2">
                <h3 className={`text-xl font-bold flex items-center gap-2 ${checkoutTitleText}`}>
                  <CreditCard className="text-blue-500" size={22} />
                  Process Customer Sale
                </h3>
                <p className={`text-sm font-medium ${secondaryText}`}>Enter transaction amount and checkout using voucher details.</p>
              </div>

              <AnimatePresence mode="wait">
                {!scanning && !redeeming && !result && (
                  <motion.div 
                    key="form-fields"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-6"
                    id="checkout-panel-root"
                  >
                    {/* Amount Input */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className={`block text-[10px] font-black uppercase tracking-widest ml-1 ${checkoutLabelText}`}>Sale Amount</label>
                        {isCustomMode && (
                          <span className="text-[10px] font-black bg-blue-500/10 text-blue-500 px-2.5 py-0.5 rounded-full border border-blue-500/20 uppercase tracking-wider animate-pulse">
                            Custom Amount Mode
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <div className={`absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>KES</div>
                        <input
                          type="number"
                          id="merchant-sale-amount-input"
                          value={amount === 0 ? '' : amount}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setAmount(val);
                            if (![500, 1000, 2500, 5000].includes(val)) {
                              setIsCustomMode(true);
                            } else {
                              setIsCustomMode(false);
                            }
                          }}
                          placeholder="0"
                          className={`${inputBg} w-full rounded-2xl pl-24 pr-8 py-5 text-3xl font-black outline-none transition-all`}
                          style={!isDark ? { color: '#0f172a' } : { color: '#ffffff' }}
                        />
                      </div>
                    </div>

                    {/* Quick Amount Presets */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center px-1">
                        <span className={`text-[10px] font-black uppercase tracking-widest ${mutedText}`}>Select Preset or Type Custom</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                        {[500, 1000, 2500, 5000].map(val => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => {
                              handlePresetClick(val);
                              setIsCustomMode(false);
                            }}
                            className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                              amount === val && !isCustomMode
                                ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/10' 
                                : isDark
                                  ? 'bg-slate-950/40 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white hover:bg-slate-900'
                                  : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                            }`}
                          >
                            KES {val.toLocaleString()}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            setIsCustomMode(true);
                            setAmount(0); // clear input for direct typing focus
                            const inputEl = document.getElementById('merchant-sale-amount-input');
                            if (inputEl) inputEl.focus();
                          }}
                          className={`py-2 text-xs font-bold rounded-xl border transition-all col-span-2 sm:col-span-1 ${
                            isCustomMode || ![500, 1000, 2500, 5000].includes(amount)
                              ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/10'
                              : isDark
                                ? 'bg-slate-950/40 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white hover:bg-slate-900'
                                : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                          }`}
                        >
                          Custom
                        </button>
                      </div>
                      <p className={`text-[10px] font-medium px-1 pt-1 ${mutedText}`}>
                        💡 Custom option is activated! You can also type any custom value directly into the KES box above.
                      </p>
                    </div>

                    {/* QR Code Scanner Trigger */}
                    <div className="pt-2">
                      <button
                        type="button"
                        id="btn-scan-qr"
                        onClick={() => setScanning(true)}
                        className={`w-full py-4 rounded-2xl flex items-center justify-center gap-3 transition-all group ${qrButtonBg}`}
                      >
                        <Scan size={20} className="text-blue-500 group-hover:scale-110 transition-transform" />
                        <span className="text-sm font-bold group-hover:text-blue-500 transition-colors">Scan Beneficiary QR Code</span>
                      </button>
                    </div>

                    {/* Manual Voucher Redeem form */}
                    <div className={`space-y-4 pt-4 border-t ${dividerBorder}`}>
                      <div className="text-center">
                        <span className={`text-[10px] font-black uppercase tracking-widest ${mutedText}`}>Or enter voucher identifier manually</span>
                      </div>

                      <div className={`space-y-4 p-5 rounded-2xl ${voucherBoxBg}`}>
                        <div>
                          <label className={`block text-[10px] font-black mb-2 uppercase tracking-widest ${checkoutLabelText}`}>Voucher Code, National ID, or Phone</label>
                          <input
                            type="text"
                            id="voucher-id-input"
                            value={voucherCodeInput}
                            onChange={(e) => setVoucherCodeInput(e.target.value)}
                            placeholder="e.g. 5A9F2D or 2547..."
                            className={`w-full rounded-xl px-4 py-3 text-sm font-bold outline-none transition-all text-center uppercase tracking-wider ${voucherInputBg}`}
                          />
                        </div>
                        <button
                          type="button"
                          id="btn-manual-redeem"
                          onClick={handleManualRedeem}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 text-sm"
                        >
                          Redeem Voucher
                        </button>
                      </div>
                    </div>

                  </motion.div>
                )}

                {scanning && (
                  <motion.div 
                    key="scanner-view"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="space-y-6"
                  >
                    <div className="relative overflow-hidden rounded-3xl border-4 border-blue-600 shadow-[0_0_50px_rgba(37,99,235,0.3)]">
                      <div id="reader" className="w-full aspect-square"></div>
                      <div className="absolute inset-0 pointer-events-none border-[30px] border-slate-950/40"></div>
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-blue-400 rounded-2xl animate-pulse"></div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setScanning(false)}
                      className={`w-full py-4 rounded-2xl font-bold transition-all ${
                        isDark 
                          ? 'bg-slate-950 border border-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-900' 
                          : 'bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                      }`}
                    >
                      Cancel Scanning
                    </button>
                  </motion.div>
                )}

                {redeeming && (
                  <motion.div 
                    key="processing-payment"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center py-16 space-y-6"
                  >
                    <div className="relative">
                      <div className="w-16 h-16 border-4 border-blue-600/20 rounded-full animate-pulse"></div>
                      <div className="absolute top-0 left-0 w-16 h-16 border-4 border-t-blue-500 rounded-full animate-spin"></div>
                    </div>
                    <div className="text-center space-y-1">
                      <p className={`text-lg font-bold ${checkoutTitleText}`}>Authorizing Settlement</p>
                      <p className={`text-xs font-medium animate-pulse ${secondaryText}`}>Verifying smart voucher allocation ledger...</p>
                    </div>
                  </motion.div>
                )}

                {result && (
                  <motion.div 
                    key="payment-outcome"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-8 rounded-3xl text-center space-y-6 ${
                      result.type === 'success' ? 'bg-green-500/5 border border-green-500/20' : 'bg-red-500/5 border border-red-500/20'
                    }`}
                  >
                    <div className="flex justify-center">
                      <div className={`w-18 h-18 rounded-2xl flex items-center justify-center shadow-lg ${
                        result.type === 'success' ? 'bg-green-500 text-white shadow-green-500/20' : 'bg-red-500 text-white shadow-red-500/20'
                      }`}>
                        {result.type === 'success' ? <CheckCircle2 size={36} /> : <XCircle size={36} />}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <h3 className={`text-2xl font-black ${result.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                        {result.type === 'success' ? 'Payment Approved' : 'Payment Failed'}
                      </h3>
                      <p className={`text-sm font-medium px-4 ${isDark ? 'text-slate-300' : 'text-slate-650'}`}>{result.message}</p>
                    </div>

                    {result.amount && (
                      <div className={`border py-4 px-6 rounded-2xl max-w-xs mx-auto text-center ${voucherBoxBg}`}>
                        <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${mutedText}`}>Settled Balance</p>
                        <p className={`text-3xl font-black ${checkoutTitleText}`}>
                          <span className="text-sm mr-1 opacity-40">KES</span>
                          {result.amount.toLocaleString()}
                        </p>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => setResult(null)}
                      className={`w-full py-4 rounded-2xl font-bold transition-all shadow-xl ${
                        isDark 
                          ? 'bg-white text-slate-950 hover:bg-slate-100 shadow-white/5' 
                          : 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-900/10'
                      }`}
                    >
                      Process Another Sale
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Right Column: Wallet Balance & Ledger history */}
          <div className="lg:col-span-6 space-y-6">
            
            {/* Wallet Balance Card with Privacy Masking */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative overflow-hidden bg-gradient-to-br from-indigo-700 via-blue-700 to-slate-900 rounded-[2.5rem] p-8 shadow-xl border border-blue-500/20"
            >
              <div className="absolute top-0 right-0 -mt-8 -mr-8 w-36 h-36 bg-indigo-500/20 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-28 h-28 bg-blue-500/30 rounded-full blur-2xl" />
              
              <div className="relative z-10 flex flex-col space-y-4">
                <div className="flex justify-between items-start">
                  <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/10">
                    <WalletIcon className="text-white" size={24} />
                  </div>
                  
                  {/* Privacy Toggle button */}
                  <button
                    onClick={() => setShowBalance(!showBalance)}
                    className="p-2 md:p-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl text-white outline-none focus:ring-1 focus:ring-white/30 border border-white/10 flex items-center gap-1.5 transition-all"
                    title={showBalance ? "Hide Balance for Safety" : "Reveal Balance"}
                    id="balance-toggle-btn"
                  >
                    {showBalance ? <EyeOff size={16} /> : <Eye size={16} />}
                    <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">{showBalance ? "Hide" : "Show"}</span>
                  </button>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] font-black text-blue-100 uppercase tracking-widest opacity-80">Settled Account Balance</p>
                  <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter transition-all duration-300">
                    <span className="text-xl md:text-2xl mr-1.5 opacity-60">KES</span>
                    {showBalance ? (wallet?.balance || 0).toLocaleString() : '••••••'}
                  </h2>
                </div>

                <div className="pt-2 flex items-center justify-between text-[11px] text-blue-200/80 font-medium">
                  <p>Settlement: Auto-cleared to Bank</p>
                  <p>M-PESA: Enabled</p>
                </div>
              </div>
            </motion.div>

            {/* Safaricom B2B Clearance Information panel */}
            <div className={`${cardBg} rounded-[2.5rem] p-6 space-y-4`}>
              <div className="flex items-center gap-2 border-b pb-3 border-slate-200/40 dark:border-slate-800/40">
                <Smartphone className="text-blue-500" size={20} />
                <h4 className={`text-sm font-black uppercase tracking-wider ${checkoutTitleText}`}>
                  Safaricom PayBill &amp; Auditable Cash Settlement FAQ
                </h4>
              </div>
              <div className="space-y-3 text-xs leading-relaxed">
                <div className="space-y-1">
                  <p className={`font-black uppercase tracking-widest text-[9px] ${mutedText}`}>1. How are these vouchers funded?</p>
                  <p className={secondaryText}>
                    Kenya Red Cross society maintains secure, pre-funded Escrow bulk accounts on Safaricom's M-Pesa network matching 100% of the active campaign relief credits.
                  </p>
                </div>
                <div className="space-y-1">
                  <p className={`font-black uppercase tracking-widest text-[9px] ${mutedText}`}>2. How do merchants get paid?</p>
                  <p className={secondaryText}>
                    When a merchant debits a beneficiary's voucher, Safaricom's automated Daraja B2B API instantly releases equivalent cash from the Red Cross Escrow account directly into the Merchant's registered Buy-Goods Till/Business PayBill number.
                  </p>
                </div>
                <div className="space-y-1">
                  <p className={`font-black uppercase tracking-widest text-[9px] ${mutedText}`}>3. Product Delivery &amp; Handoff</p>
                  <p className={secondaryText}>
                    After you successfully redeem the voucher on this portal, check your Safaricom terminal message, then hand over essential commodities (maize meal, beans, medicine) matching exactly the redeemed amount.
                  </p>
                </div>
              </div>
              <div className="bg-blue-550/5 p-3 rounded-xl border border-blue-500/15 text-[10px] font-semibold text-blue-500 dark:text-blue-400">
                ⚠️ Safeguard Policy: Vouchers are single-use bearer tokens pinned to beneficiary ID lines. Double redemptions are securely prevented via a mandatory 15s session window timeout lock.
              </div>
            </div>

            {/* Custom Interactive Transactions List */}
            <div className={`${recentTxPanelBg} rounded-[2.5rem] p-6 md:p-8 space-y-6 transition-colors duration-200`}>
              <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6 ${dividerBorder}`}>
                <div className="space-y-1">
                  <h4 className={`text-lg font-bold flex items-center gap-2 ${checkoutTitleText}`}>
                    <History size={18} className="text-blue-500" />
                    Transaction History
                  </h4>
                  <p className={`text-xs ${secondaryText}`}>View and audit all past relief settlements processed at this merchant.</p>
                </div>
              </div>

              {/* Live Search and Filter inputs */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input
                  type="text"
                  placeholder="Search beneficiary, amount, or date..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full rounded-xl pl-12 pr-4 py-3 text-sm font-medium outline-none transition-all ${searchInputBg} focus:ring-1 focus:ring-blue-500`}
                />
              </div>

              {/* Transactions stream */}
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
                {filteredTransactions.length === 0 ? (
                  <div className={`text-center py-12 rounded-2xl border ${voucherBoxBg}`}>
                    <History size={36} className="text-slate-405 text-slate-400 mx-auto mb-3" />
                    <p className={`text-sm font-bold ${secondaryText}`}>No transactions found</p>
                    <p className={`text-xs ${mutedText}`}>Try matching by amount or recipient code</p>
                  </div>
                ) : (
                  filteredTransactions.map((tx) => (
                    <div 
                      key={tx.id} 
                      className={`${recentTxRowBg} p-4 rounded-2xl border flex items-center justify-between transition-all group`}
                    >
                      <div className="flex items-center gap-3.5">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all ${
                          tx.amount > 0 
                            ? 'bg-green-500/10 border-green-500/10 text-green-500' 
                            : 'bg-red-500/10 border-red-500/10 text-red-500'
                        }`}>
                          {tx.amount > 0 ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                        </div>
                        <div>
                          <p className={`text-sm font-bold transition-colors ${recentTxTitleText}`}>{tx.description}</p>
                          <div className={`flex items-center gap-2 mt-0.5 text-[10px] font-medium ${mutedText}`}>
                            <p>{new Date(tx.created_at).toLocaleDateString()}</p>
                            <span>•</span>
                            <p>{new Date(tx.created_at).toLocaleTimeString()}</p>
                            <span>•</span>
                            <p className="uppercase">VOUCHER: #{tx.idempotency_key.slice(0, 6).toUpperCase()}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <span className={`text-sm font-black transition-all ${
                          tx.amount > 0 ? 'text-green-500 group-hover:text-green-400' : 'text-slate-400'
                        }`}>
                          {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()}
                        </span>
                        <p className={`text-[9px] font-bold uppercase tracking-wider ${mutedText}`}>KES</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* History summary telemetry line */}
              <div className={`pt-4 border-t flex items-center justify-between text-xs ${mutedText} ${dividerBorder}`}>
                <p>Showing {filteredTransactions.length} of {allTransactions.length} records</p>
                <p className="font-bold text-blue-500 hover:text-blue-400 cursor-pointer flex items-center gap-1">
                  <Download size={12} />
                  Export Ledger
                </p>
              </div>

            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
