import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Wallet } from '../types';
import { Store, Scan, LogOut, CheckCircle2, XCircle, Loader2, Wallet as WalletIcon, History, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { motion, AnimatePresence } from 'motion/react';

export default function MerchantDashboard() {
  const { signOut, user } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [scanning, setScanning] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [amount, setAmount] = useState(500);
  const [result, setResult] = useState<{ type: 'success' | 'error', message: string, amount?: number } | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);

  useEffect(() => {
    fetchWallet();
    fetchTransactions();
  }, []);

  async function fetchWallet() {
    const { data, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('profile_id', user?.id)
      .single();
    
    if (!error) setWallet(data);
  }

  async function fetchTransactions() {
    const { data } = await supabase
      .from('ledger')
      .select('*')
      .eq('profile_id', user?.id)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (data) setRecentTransactions(data);
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

  async function handlePurchase(victimId: string) {
    setRedeeming(true);
    setResult(null);

    try {
      const idempotencyKey = crypto.randomUUID();
      const { data, error } = await supabase.rpc('process_aid_purchase', {
        victim_profile_id: victimId,
        merchant_profile_id: user?.id,
        purchase_amount: amount,
        idempotency_key: idempotencyKey
      });

      if (error) throw error;

      if (data === 'Transaction successful') {
        setResult({ 
          type: 'success', 
          message: 'Payment received successfully!',
          amount: amount
        });
        fetchWallet();
        fetchTransactions();
      } else {
        setResult({ 
          type: 'error', 
          message: data || 'Transaction failed.' 
        });
      }
    } catch (error: any) {
      setResult({ type: 'error', message: error.message });
    } finally {
      setRedeeming(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans">
      {/* Header */}
      <nav className="bg-slate-900/50 backdrop-blur-xl border-b border-slate-800 px-4 md:px-8 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/20">
            <Store className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-black tracking-tight">MerchantPoint</h1>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Authorized Vendor</p>
          </div>
        </div>
        <button 
          onClick={signOut} 
          className="p-2.5 bg-slate-800 hover:bg-red-500/10 text-slate-400 hover:text-red-500 rounded-xl border border-slate-700 hover:border-red-500/20 transition-all"
        >
          <LogOut size={20} />
        </button>
      </nav>

      <main className="max-w-md mx-auto p-4 md:p-8 space-y-8">
        {/* Wallet Balance Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2.5rem] p-8 shadow-2xl shadow-blue-900/20"
        >
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-24 h-24 bg-blue-400/20 rounded-full blur-2xl" />
          
          <div className="relative z-10 flex flex-col items-center text-center space-y-2">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-2">
              <WalletIcon className="text-white" size={24} />
            </div>
            <p className="text-xs font-black text-blue-100 uppercase tracking-widest opacity-80">Available Balance</p>
            <h2 className="text-5xl font-black text-white tracking-tighter">
              <span className="text-2xl mr-1 opacity-60">KES</span>
              {(wallet?.balance || 0).toLocaleString()}
            </h2>
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {!scanning && !redeeming && !result && (
            <motion.div 
              key="form"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="space-y-8"
            >
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-black text-white">Process Payment</h3>
                <p className="text-slate-500 font-medium">Enter amount and scan victim's QR code</p>
              </div>

              <div className="space-y-6">
                <div className="relative group">
                  <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest ml-4">Sale Amount (KES)</label>
                  <div className="relative">
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-600 group-focus-within:text-blue-500 transition-colors">KES</div>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      className="w-full bg-slate-900 border-2 border-slate-800 rounded-[2rem] pl-24 pr-8 py-6 text-3xl font-black focus:border-blue-600 outline-none transition-all text-white placeholder:text-slate-800"
                    />
                  </div>
                </div>

                <button
                  onClick={() => setScanning(true)}
                  className="w-full aspect-video bg-slate-900 border-2 border-dashed border-slate-800 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 hover:border-blue-600/50 hover:bg-blue-600/5 transition-all group"
                >
                  <div className="w-16 h-16 bg-blue-600/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Scan size={32} className="text-blue-500" />
                  </div>
                  <span className="text-lg font-black text-slate-400 group-hover:text-blue-500 transition-colors">Start QR Scanner</span>
                </button>
              </div>

              {/* Recent Activity */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <History size={14} />
                    Recent Activity
                  </h4>
                </div>
                <div className="space-y-3">
                  {recentTransactions.map((tx) => (
                    <div key={tx.id} className="bg-slate-900/50 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          tx.amount > 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                        }`}>
                          {tx.amount > 0 ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-200">{tx.description}</p>
                          <p className="text-[10px] text-slate-500 font-medium">{new Date(tx.created_at).toLocaleTimeString()}</p>
                        </div>
                      </div>
                      <span className={`text-sm font-black ${tx.amount > 0 ? 'text-green-500' : 'text-slate-400'}`}>
                        {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {scanning && (
            <motion.div 
              key="scanner"
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="space-y-6"
            >
              <div className="relative overflow-hidden rounded-[2.5rem] border-4 border-blue-600 shadow-[0_0_50px_rgba(37,99,235,0.3)]">
                <div id="reader" className="w-full aspect-square"></div>
                <div className="absolute inset-0 pointer-events-none border-[40px] border-slate-950/40"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-blue-400 rounded-2xl animate-pulse"></div>
              </div>
              <button
                onClick={() => setScanning(false)}
                className="w-full py-4 bg-slate-900 border border-slate-800 rounded-2xl font-black text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
              >
                Cancel Scanning
              </button>
            </motion.div>
          )}

          {redeeming && (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-20 space-y-6"
            >
              <div className="relative">
                <div className="w-20 h-20 border-4 border-blue-600/20 rounded-full"></div>
                <div className="absolute top-0 left-0 w-20 h-20 border-4 border-t-blue-600 rounded-full animate-spin"></div>
              </div>
              <div className="text-center space-y-1">
                <p className="text-xl font-black text-white">Processing Payment</p>
                <p className="text-slate-500 font-medium animate-pulse">Verifying voucher security...</p>
              </div>
            </motion.div>
          )}

          {result && (
            <motion.div 
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-10 rounded-[3rem] text-center space-y-8 ${
                result.type === 'success' ? 'bg-green-500/5 border border-green-500/20' : 'bg-red-500/5 border border-red-500/20'
              }`}
            >
              <div className="flex justify-center">
                <div className={`w-24 h-24 rounded-[2rem] flex items-center justify-center ${
                  result.type === 'success' ? 'bg-green-500 text-white shadow-lg shadow-green-900/40' : 'bg-red-500 text-white shadow-lg shadow-red-900/40'
                }`}>
                  {result.type === 'success' ? <CheckCircle2 size={48} /> : <XCircle size={48} />}
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className={`text-3xl font-black ${result.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                  {result.type === 'success' ? 'Payment Received' : 'Payment Failed'}
                </h3>
                <p className="text-slate-400 font-medium">{result.message}</p>
              </div>

              {result.amount && (
                <div className="bg-slate-900/50 py-4 rounded-2xl border border-slate-800">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Credited</p>
                  <p className="text-4xl font-black text-white">
                    <span className="text-lg mr-1 opacity-40">KES</span>
                    {result.amount.toLocaleString()}
                  </p>
                </div>
              )}

              <button
                onClick={() => setResult(null)}
                className="w-full py-5 bg-white text-slate-950 rounded-2xl font-black hover:bg-slate-100 transition-all shadow-xl shadow-white/5"
              >
                Done
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer Info */}
        <div className="pt-8 border-t border-slate-900">
          <div className="bg-slate-900/30 p-5 rounded-3xl border border-slate-800/50 flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center">
              <Store size={24} className="text-slate-500" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Merchant Account</p>
              <p className="text-sm font-bold text-slate-300 truncate max-w-[200px]">{user?.email}</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
