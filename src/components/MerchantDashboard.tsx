import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Wallet } from '../types';
import { Store, Scan, LogOut, CheckCircle2, XCircle, Loader2, Wallet as WalletIcon } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';

export default function MerchantDashboard() {
  const { signOut, user } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [scanning, setScanning] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [amount, setAmount] = useState(10);
  const [result, setResult] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  useEffect(() => {
    fetchWallet();
  }, []);

  async function fetchWallet() {
    const { data, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('profile_id', user?.id)
      .single();
    
    if (!error) setWallet(data);
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
          message: 'Payment received successfully!'
        });
        fetchWallet();
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
    <div className="min-h-screen bg-slate-900 text-white">
      <nav className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Store className="text-blue-400" />
          <h1 className="text-xl font-bold">Merchant Point</h1>
        </div>
        <button onClick={signOut} className="text-slate-400 hover:text-white transition-colors">
          <LogOut size={20} />
        </button>
      </nav>

      <main className="max-w-md mx-auto p-6 space-y-8">
        {/* Wallet Balance */}
        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
              <WalletIcon className="text-blue-400" size={24} />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Your Balance</p>
              <p className="text-2xl font-black text-white">${wallet?.balance || '0.00'}</p>
            </div>
          </div>
        </div>

        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">Process Payment</h2>
          <p className="text-slate-400">Enter amount and scan victim's QR code</p>
        </div>

        {!scanning && !redeeming && !result && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-500 mb-2 uppercase tracking-widest">Sale Amount ($)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full bg-slate-800 border-2 border-slate-700 rounded-2xl px-6 py-4 text-2xl font-bold focus:border-blue-500 outline-none transition-all"
              />
            </div>
            <button
              onClick={() => setScanning(true)}
              className="w-full aspect-video bg-blue-600 rounded-3xl flex flex-col items-center justify-center gap-4 hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
            >
              <Scan size={40} />
              <span className="text-lg font-bold">Scan QR Code</span>
            </button>
          </div>
        )}

        {scanning && (
          <div className="space-y-4">
            <div id="reader" className="overflow-hidden rounded-2xl border-2 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)]"></div>
            <button
              onClick={() => setScanning(false)}
              className="w-full py-3 bg-slate-800 rounded-xl font-medium hover:bg-slate-700 transition-colors"
            >
              Cancel Scan
            </button>
          </div>
        )}

        {redeeming && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="animate-spin text-blue-400" size={48} />
            <p className="text-slate-400 animate-pulse">Verifying Voucher...</p>
          </div>
        )}

        {result && (
          <div className={`p-8 rounded-3xl text-center space-y-6 ${
            result.type === 'success' ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'
          }`}>
            <div className="flex justify-center">
              {result.type === 'success' ? (
                <CheckCircle2 className="text-green-400" size={64} />
              ) : (
                <XCircle className="text-red-400" size={64} />
              )}
            </div>
            
            <div className="space-y-2">
              <h3 className={`text-xl font-bold ${result.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                {result.type === 'success' ? 'Redemption Successful' : 'Redemption Failed'}
              </h3>
              <p className="text-slate-300">{result.message}</p>
            </div>

            {result.amount && (
              <div className="text-4xl font-black text-white">
                ${result.amount}
              </div>
            )}

            <button
              onClick={() => setResult(null)}
              className="w-full py-3 bg-white text-slate-900 rounded-xl font-bold hover:bg-slate-100 transition-colors"
            >
              Scan Another
            </button>
          </div>
        )}

        <div className="pt-8 border-t border-slate-800">
          <div className="bg-slate-800/50 p-4 rounded-xl flex items-center gap-4">
            <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center">
              <Store size={20} className="text-slate-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Logged in as</p>
              <p className="text-sm font-medium">{user?.email}</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
