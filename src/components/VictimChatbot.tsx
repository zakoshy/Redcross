import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { 
  MessageSquare, Send, Heart, AlertCircle, Loader2, User, 
  Sun, Moon, Eye, EyeOff, Wallet, Copy, Check, Sparkles, 
  History, LogOut, ArrowUpRight, HelpCircle, Activity, UserCheck, Menu, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Message {
  role: 'user' | 'bot';
  content: string;
}

export default function VictimChatbot() {
  const { user, profile, signOut } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', content: "Hello. I'm here to provide Psychological First Aid. How are you feeling right now? Please tell me what's on your mind." }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [riskScore, setRiskScore] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // States for matching professional dashboard features
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('victim_theme') as any) || 'light');
  const [showBalance, setShowBalance] = useState(true);
  const [wallet, setWallet] = useState<any>(null);
  const [ledger, setLedger] = useState<any[]>([]);
  const [triageSession, setTriageSession] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

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

  // Theme configuration variables (matching highly stylized merchant look)
  const isDark = theme === 'dark';
  const containerBg = isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800';
  const sidebarBg = isDark ? 'bg-slate-900/90 border-slate-800/80 backdrop-blur-md' : 'bg-white border-r border-slate-200';
  const headerBg = isDark ? 'bg-slate-900/90 border-slate-800/80 backdrop-blur-md' : 'bg-white border-b border-slate-200 shadow-sm';
  const cardBg = isDark ? 'bg-slate-900/40 border border-slate-800/80 backdrop-blur-sm' : 'bg-white shadow-sm border border-slate-200';
  const innerCardBg = isDark ? 'bg-slate-950/40 border border-slate-850' : 'bg-slate-100 border border-slate-150';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const textMuted = isDark ? 'text-slate-500' : 'text-slate-400';
  const inputBg = isDark ? 'bg-slate-900/70 border-slate-800 text-white placeholder:text-slate-650 focus:border-red-500 focus:ring-1 focus:ring-red-500' : 'bg-white border-slate-200 text-slate-950 placeholder:text-slate-400 focus:border-red-550 focus:ring-1 focus:ring-red-550';
  const borderCol = isDark ? 'border-slate-800/80' : 'border-slate-200';

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  async function fetchUserData() {
    try {
      // 1. Fetch Wallet
      const { data: walletData } = await supabase
        .from('wallets')
        .select('*')
        .eq('profile_id', user?.id)
        .maybeSingle();
      if (walletData) setWallet(walletData);

      // 2. Fetch Ledger
      const { data: ledgerData } = await supabase
        .from('ledger')
        .select('*')
        .eq('profile_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(3);
      if (ledgerData) setLedger(ledgerData);

      // 3. Fetch Triage Session
      const { data: triageData } = await supabase
        .from('triage_sessions')
        .select('*')
        .eq('victim_id', user?.id)
        .maybeSingle();
      if (triageData) {
        setTriageSession(triageData);
        setRiskScore(triageData.risk_score || 0);
      }
    } catch (e) {
      console.error("Error fetching victim metadata:", e);
    }
  }

  const voucherCode = user?.id ? user.id.slice(-6).toUpperCase() : 'VOUCHER';

  function copyVoucherCode() {
    navigator.clipboard.writeText(voucherCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSend(e: React.FormEvent, customMsg?: string) {
    if (e) e.preventDefault();
    const targetMsg = customMsg || input;
    if (!targetMsg.trim() || loading) return;

    const userMessage = targetMsg.trim();
    if (!customMsg) setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const chosenModel = localStorage.getItem('pfa_ai_model') || 'meta/llama-3.1-8b-instruct';
      // 1. Get AI Response and Risk Assessment from secure server API proxy
      const response = await fetch('/api/victim-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userMsg: userMessage,
          messages: messages,
          aiModel: chosenModel
        })
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        console.error("Vercel or Server returned error status:", response.status, errorText);
        throw new Error(
          `The server experienced an issue (Status ${response.status}). This usually indicates a request timeout or that GEMINI_API_KEY is not configured in Vercel's Environment Variables. Please verify configuration in the Vercel project settings.`
        );
      }

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        const textPayload = await response.text().catch(() => "");
        console.error("Non-JSON proxy output:", textPayload);
        throw new Error("The server responded with an unexpected document format. The model may be experiencing heavy load; please try again in a few moments.");
      }

      const resData = await response.json();
      if (!resData.success) {
        throw new Error(resData.error || "The AI session could not be completed securely.");
      }

      const rawText = resData.response;
      const jsonMatch = rawText.match(/\{.*\}/s);
      const data = jsonMatch ? JSON.parse(jsonMatch[0]) : { reply: rawText, risk_score: 0.1, suicidal_detected: false };

      const isSuicidal = data.suicidal_detected === true || data.risk_score >= 0.9 || /suicid|kill myself|end my life|want to die|self-harm|cut myself/i.test(userMessage);

      // If suicidal, override response to add emergency details/warmth.
      let finalReply = data.reply || rawText;
      if (isSuicidal) {
        finalReply += "\n\n💚 Please know that you are not alone. Please reach out to the Red Cross Crisis Response team or call the toll-free emergency support line at 0800-723-253 or the suicide preventative helpline immediately. We are dispatching immediate help coordinates.";
      }

      setMessages(prev => [...prev, { role: 'bot', content: finalReply }]);
      setRiskScore(isSuicidal ? 1.0 : data.risk_score);

      // 2. Update or Create Triage Session in Supabase
      if (user) {
        const { error } = await supabase
          .from('triage_sessions')
          .upsert({
            victim_id: user.id,
            last_message: userMessage,
            risk_score: isSuicidal ? 1.0 : data.risk_score,
            status: (isSuicidal || data.risk_score > 0.7) ? 'open' : 'closed',
            escalated: isSuicidal || data.risk_score > 0.7,
            notes: isSuicidal 
              ? `[ALERT_SUICIDAL] High risk of self-harm/suicidal ideation detected.`
              : `Safe evaluation under PFA index ${data.risk_score}`
          }, { onConflict: 'victim_id' });
        
        if (error) console.error("Error updating triage:", error);
        
        // Refresh local triage details
        fetchUserData();
      }

    } catch (error: any) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { role: 'bot', content: `I'm having a little trouble connecting: ${error.message || "Please take a deep breath."}` }]);
    } finally {
      setLoading(false);
    }
  }

  const quickPrompts = [
    { text: "I feel very overwhelmed and stressed", icon: "❤️" },
    { text: "How do I use my relief card balance?", icon: "🪙" },
    { text: "Help me practice structured deep breathing", icon: "🫁" },
    { text: "Can you review my counselor referral?", icon: "🤝" }
  ];

  return (
    <div className={`min-h-screen transition-colors duration-300 ${containerBg} flex flex-col md:flex-row overflow-hidden`}>
      
      {/* Sidebar Overview Panel */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.aside 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 340, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className={`flex-shrink-0 ${sidebarBg} flex flex-col h-full md:h-screen transition-all shadow-xl z-20`}
          >
            {/* Header: User Profile details */}
            <div className={`p-6 border-b ${borderCol} flex items-center justify-between`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl flex items-center justify-center">
                  <User size={20} />
                </div>
                <div>
                  <h3 className={`font-black ${textPrimary} truncate max-w-[195px]`}>
                    {profile?.full_name || 'Beneficiary'}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    {profile?.county || 'Kenya'} County
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsSidebarOpen(false)}
                className="md:hidden p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Content indicators */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
              
              {/* Premium Voucher balance card, matching layout of Merchant Dashboard */}
              <div className={`p-5 rounded-2xl relative overflow-hidden shadow-xl border ${
                isDark 
                  ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-red-950/10 border-slate-800/85 shadow-black/32' 
                  : 'bg-gradient-to-br from-red-650 via-red-600 to-red-700 text-white border-red-500 shadow-red-200/50'
              }`}>
                {/* Visual mesh */}
                <div className="absolute right-0 top-0 w-32 h-32 bg-red-500/10 rounded-full blur-2xl" />
                
                <div className="flex justify-between items-start">
                  <div>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-red-105/90'}`}>
                      Relief Voucher Credit
                    </span>
                    <h4 className="text-3xl font-black mt-1 leading-none tracking-tight">
                      {showBalance ? `KES ${(wallet?.balance || 0).toLocaleString()}` : '•••••••'}
                    </h4>
                  </div>
                  <button 
                    onClick={() => setShowBalance(!showBalance)}
                    className={`p-1.5 rounded-lg border transition-all ${
                      isDark 
                        ? 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white' 
                        : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                    }`}
                  >
                    {showBalance ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>

                <div className="mt-8 flex items-end justify-between">
                  <div>
                    <span className={`text-[9px] font-bold uppercase tracking-wider block ${isDark ? 'text-slate-500' : 'text-red-200'}`}>
                      Voucher ID Code
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-mono text-sm font-black tracking-wider bg-black/10 px-2 py-0.5 rounded">
                        {voucherCode}
                      </span>
                      <button 
                        onClick={copyVoucherCode}
                        className={`p-1 rounded hover:bg-black/10 transition-colors tooltip ${isDark ? 'text-slate-400 hover:text-slate-200' : 'text-white'}`}
                        title="Copy code value"
                      >
                        {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>
                  <Wallet size={36} className={`opacity-20 ${isDark ? 'text-red-500' : 'text-white'}`} />
                </div>
              </div>

              {/* Triage counselor status card */}
              <div className={`${cardBg} p-4 rounded-xl`}>
                <h4 className={`text-xs font-black uppercase ${textPrimary} tracking-widest mb-3 flex items-center gap-2`}>
                  <Activity size={14} className="text-red-500" />
                  Your Support Ticket
                </h4>
                <div className="space-y-3 font-medium text-xs">
                  <div className="flex justify-between items-center py-1.5 border-b border-dashed dark:border-slate-800/80">
                    <span className="text-slate-450">Session Status</span>
                    <span className={`font-black px-2 py-0.5 rounded-full text-[10px] uppercase ${
                      triageSession?.status === 'in_progress' 
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' 
                        : triageSession?.status === 'open' 
                          ? 'bg-green-105 text-green-700 dark:bg-green-500/10 dark:text-green-400' 
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    }`}>
                      {triageSession?.status || 'Inactive (Quiet)'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-dashed dark:border-slate-800/80">
                    <span className="text-slate-450">Assigned Expert</span>
                    <span className={isDark ? 'text-white' : 'text-slate-900'}>
                      {triageSession?.volunteer_id ? 'Human Volunteer assigned' : 'Mental Counselor Bot'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1.5">
                    <span className="text-slate-450">Triage Index</span>
                    <span className={`font-mono font-bold ${riskScore > 0.7 ? 'text-red-500' : 'text-slate-400'}`}>
                      {(riskScore * 100).toFixed(0)}% risk
                    </span>
                  </div>
                </div>
              </div>

              {/* Recent Ledger History details */}
              <div>
                <h4 className={`text-xs font-black uppercase ${textPrimary} tracking-widest mb-3 flex items-center gap-2`}>
                  <History size={14} className="text-red-500" />
                  Redemption History
                </h4>
                <div className="space-y-2.5">
                  {ledger.length > 0 ? (
                    ledger.map((ld) => (
                      <div key={ld.id} className={`${innerCardBg} p-3 rounded-xl flex items-center justify-between`}>
                        <div className="truncate pr-2">
                          <p className={`text-xs font-bold ${textPrimary} truncate`}>{ld.description}</p>
                          <p className="text-[10px] text-slate-450 mt-0.5">{new Date(ld.created_at).toLocaleDateString()}</p>
                        </div>
                        <span className="text-xs font-black text-red-500 flex items-center">
                          -{ld.amount}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-5 rounded-xl border border-dashed dark:border-slate-800">
                      <p className="text-xs text-slate-400">No redemptions logged yet</p>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Sidebar Footer: Logout option */}
            <div className={`p-4 border-t ${borderCol}`}>
              <button 
                onClick={signOut}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-bold ${
                  isDark ? 'text-slate-400 hover:text-red-400 hover:bg-slate-800/60' : 'text-slate-600 hover:text-red-650 hover:bg-slate-100'
                }`}
              >
                <LogOut size={18} />
                <span>Sign Out Account</span>
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Chat Conversation Interface */}
      <div className="flex-1 flex flex-col h-full md:h-screen relative overflow-hidden">
        
        {/* Header toolbar */}
        <header className={`${headerBg} p-4 flex items-center justify-between sticky top-0 z-10`}>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
              className={`p-2 rounded-xl border transition-all ${
                isDark 
                  ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800' 
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm'
              }`}
            >
              <Menu size={18} />
            </button>

            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="w-10 h-10 bg-red-650 rounded-xl flex items-center justify-center shadow-lg shadow-red-200/50">
                  <Heart className="text-white fill-white/10" size={20} />
                </div>
                <span className="absolute bottom-[-1px] right-[-1px] w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-slate-950 animate-pulse" />
              </div>
              <div>
                <h1 className={`font-black tracking-tight ${textPrimary}`}>Psychology First Aid</h1>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Counselor Online</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Theme Toggle Button */}
            <button 
              type="button"
              onClick={() => {
                const newTheme = isDark ? 'light' : 'dark';
                setTheme(newTheme);
                localStorage.setItem('victim_theme', newTheme);
              }}
              className={`flex items-center gap-2 px-3 py-2 border rounded-xl transition-all ${
                isDark 
                  ? 'bg-slate-900 border-slate-800 text-amber-400 hover:text-amber-300 hover:bg-slate-800' 
                  : 'bg-white border-slate-200 text-amber-600 hover:text-amber-700 hover:bg-slate-50 shadow-sm'
              }`}
              title={isDark ? "Switch to Light Theme" : "Switch to Dark Theme"}
              id="theme-toggle-btn"
            >
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
              <span className="text-xs font-black hidden sm:inline">{isDark ? "Light" : "Dark"}</span>
            </button>

            <span className={`text-[10px] md:text-xs px-3 py-1.5 rounded-xl font-black uppercase tracking-wider ${isDark ? 'bg-slate-900 border border-slate-800 text-red-400' : 'bg-red-50 text-red-650 border border-red-100'} inline-flex items-center gap-1.5`}>
              🕒 {currentTime || "Loading..."}
            </span>

            {riskScore > 0.7 && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 px-3 py-1.5 rounded-xl animate-bounce">
                <AlertCircle className="text-red-500" size={14} />
                <span className="text-[10px] font-black text-red-500 uppercase tracking-wider">Priority Triage</span>
              </div>
            )}
          </div>
        </header>

        {/* Chat message streams area */}
        <main 
          ref={scrollRef}
          className={`flex-1 overflow-y-auto p-4 md:p-6 space-y-5 custom-scrollbar transition-colors duration-300 ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}
        >
          <div className="max-w-3xl mx-auto w-full space-y-5">
            <AnimatePresence initial={false}>
              {messages.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 12, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] p-4 rounded-2xl relative shadow-md transition-all ${
                    m.role === 'user' 
                      ? 'bg-red-650 text-white rounded-tr-none font-medium' 
                      : `${cardBg} rounded-tl-none font-medium text-slate-800 dark:text-slate-100`
                  }`}>
                    {m.role === 'bot' && (
                      <div className="absolute top-1 left-[-26px] hidden sm:block">
                        <div className="w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px]">
                          ❤
                        </div>
                      </div>
                    )}
                    <p className="text-sm leading-relaxed whitespace-pre-line">{m.content}</p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {loading && (
              <div className="flex justify-start">
                <div className={`${cardBg} p-4 rounded-2xl flex items-center gap-2.5`}>
                  <Loader2 className="animate-spin text-red-500" size={16} />
                  <span className="text-xs font-black text-slate-400">Typing supportive message...</span>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Dynamic Pre-filled Prompt recommendations */}
        <div className={`p-4 border-t ${borderCol} ${isDark ? 'bg-slate-900/30' : 'bg-white'} z-10`}>
          <div className="max-w-3xl mx-auto w-full">
            <div className="flex flex-wrap gap-2 mb-3">
              {quickPrompts.map((qp, pos) => (
                <button
                  key={pos}
                  onClick={(e) => handleSend(e, qp.text)}
                  disabled={loading}
                  className={`text-xs font-bold px-3 py-2 rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                    isDark 
                      ? 'bg-slate-900 border-slate-800 text-slate-300 hover:border-red-500/40 hover:text-white' 
                      : 'bg-slate-100 border-slate-200 text-slate-700 hover:border-red-500/30 hover:bg-red-50/10 hover:text-red-700'
                  }`}
                >
                  <span>{qp.icon}</span>
                  <span>{qp.text}</span>
                </button>
              ))}
            </div>

            {/* Core message inputs form */}
            <form onSubmit={(e) => handleSend(e)} className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Type your message here to talk to counseling aid..."
                className={`flex-1 rounded-xl px-4 py-3.5 outline-none transition-all font-bold text-sm ${inputBg}`}
              />
              <button 
                type="submit"
                disabled={!input.trim() || loading}
                className="bg-red-650 text-white p-3.5 rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-500/10 disabled:opacity-50 disabled:shadow-none"
              >
                <Send size={18} />
              </button>
            </form>
            <p className="text-center text-[10px] text-slate-450 mt-2.5 font-bold">
              ⚡ Safe Haven Psychological Aid counselor is active. If you face physical danger, please contact authorities.
            </p>
          </div>
        </div>

      </div>

    </div>
  );
}
