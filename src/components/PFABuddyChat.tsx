import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { MessageSquare, Send, Heart, Loader2, Sparkles, X, AlertOctagon, UserCheck, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Message {
  role: 'user' | 'bot';
  content: string;
}

interface PFABuddyChatProps {
  isDark?: boolean;
}

export default function PFABuddyChat({ isDark = false }: PFABuddyChatProps) {
  const { user, profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [lang, setLang] = useState<'en' | 'sw'>('en');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', content: "Hello colleague. I am your Psychological First Aid Buddy. Humanitarian response, relief distribution, and crisis coordination can sometimes take a heavy psychological toll. How are you holding up today? I'm here to listen." }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [riskAssessment, setRiskAssessment] = useState<string | null>(null);
  const [escalatedPeer, setEscalatedPeer] = useState<any | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [rateLimitExceeded, setRateLimitExceeded] = useState(false);
  const [remainingTimeStr, setRemainingTimeStr] = useState('');

  // Function to check and update rate limit
  const checkRateLimit = () => {
    const key = `pfa_limits_${user?.id || 'guest'}`;
    const stored = localStorage.getItem(key);
    const now = Date.now();
    let timestamps: number[] = [];

    if (stored) {
      try {
        timestamps = JSON.parse(stored);
      } catch (e) {
        timestamps = [];
      }
    }

    // Filter out timestamps older than 24 hours
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const activeTimestamps = timestamps.filter(t => t > oneDayAgo);

    if (activeTimestamps.length >= 10) {
      setRateLimitExceeded(true);
      const oldest = activeTimestamps[0];
      const resetTime = oldest + 24 * 60 * 60 * 1000;
      const diffMs = resetTime - now;
      if (diffMs > 0) {
        const hours = Math.floor(diffMs / (3600 * 1000));
        const mins = Math.ceil((diffMs % (3600 * 1000)) / (60 * 1000));
        setRemainingTimeStr(`${hours}h ${mins}m`);
      } else {
        setRateLimitExceeded(false);
      }
      return false;
    } else {
      setRateLimitExceeded(false);
      return true;
    }
  };

  // Run on mount or when user changes
  useEffect(() => {
    checkRateLimit();
    const timer = setInterval(checkRateLimit, 10000);
    return () => clearInterval(timer);
  }, [user]);

  // When language is selected, auto update default message if untouched
  useEffect(() => {
    if (messages.length === 1 && messages[0].role === 'bot') {
      if (lang === 'sw') {
        setMessages([{ role: 'bot', content: "Habari mwenzangu. Mimi ni Buddy wako wa kwanza wa Msaada wa Kisaikolojia (PFA). Kazi ya kukabiliana na majanga na kusambaza misaada inaweza kuleta mkazo mkubwa sana wa kiakili. Unaendeleaje leo? Niko hapa kukusikiliza. Naelewa na kujibu kwa kishwahili pia." }]);
      } else {
        setMessages([{ role: 'bot', content: "Hello colleague. I am your Psychological First Aid Buddy. Humanitarian response, relief distribution, and crisis coordination can sometimes take a heavy psychological toll. How are you holding up today? I'm here to listen." }]);
      }
    }
  }, [lang]);

  const recordMessageSent = () => {
    const key = `pfa_limits_${user?.id || 'guest'}`;
    const stored = localStorage.getItem(key);
    let timestamps: number[] = [];
    if (stored) {
      try {
        timestamps = JSON.parse(stored);
      } catch (e) {
        timestamps = [];
      }
    }
    timestamps.push(Date.now());
    localStorage.setItem(key, JSON.stringify(timestamps));
    checkRateLimit();
  };

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  // Clean raw county string helper
  const parseCounty = (cStr?: string) => {
    if (!cStr) return 'Unspecified';
    if (cStr.startsWith('Community Leader |')) {
      return cStr.split('|')[1].trim();
    }
    return cStr;
  };

  const getNearbyCounties = (countyName: string): string[] => {
    const cleanName = countyName.trim().toLowerCase();
    const map: Record<string, string[]> = {
      "mombasa": ["Kilifi", "Kwale", "Taita/Taveta", "Lamu"],
      "kwale": ["Mombasa", "Kilifi", "Taita/Taveta"],
      "kilifi": ["Mombasa", "Kwale", "Tana River", "Lamu"],
      "tana river": ["Garissa", "Lamu", "Kilifi", "Kitui", "Isiolo"],
      "lamu": ["Kilifi", "Tana River", "Garissa"],
      "taita/taveta": ["Kwale", "Mombasa", "Makueni", "Kajiado"],
      "garissa": ["Wajir", "Tana River", "Isiolo", "Kitui", "Lamu"],
      "wajir": ["Mandera", "Garissa", "Marsabit", "Isiolo"],
      "mandera": ["Wajir", "Marsabit"],
      "marsabit": ["Isiolo", "Wajir", "Samburu", "Turkana", "Mandera"],
      "isiolo": ["Meru", "Laikipia", "Samburu", "Marsabit", "Wajir", "Garissa"],
      "meru": ["Tharaka-Nithi", "Isiolo", "Laikipia", "Nyeri", "Embu"],
      "tharaka-nithi": ["Meru", "Embu", "Kitui"],
      "embu": ["Tharaka-Nithi", "Kirinyaga", "Machakos", "Kitui", "Meru"],
      "kitui": ["Machakos", "Makueni", "Tana River", "Garissa", "Embu"],
      "machakos": ["Nairobi", "Kiambu", "Makueni", "Kitui", "Kajiado", "Murang'a", "Embu"],
      "makueni": ["Machakos", "Kajiado", "Taita/Taveta", "Kitui"],
      "nyandarua": ["Nakuru", "Laikipia", "Nyeri", "Murang'a", "Kiambu"],
      "nyeri": ["Laikipia", "meru", "Kirinyaga", "Murang'a", "Nyandarua"],
      "kirinyaga": ["Embu", "Murang'a", "Nyeri"],
      "murang'a": ["Nyeri", "Kirinyaga", "Kiambu", "Nyandarua", "Machakos"],
      "kiambu": ["Nairobi", "Machakos", "Murang'a", "Nyandarua", "Nakuru", "Kajiado"],
      "nairobi": ["Kiambu", "Machakos", "Kajiado"],
      "turkana": ["West Pokot", "Samburu", "Baringo", "Marsabit"],
      "west pokot": ["Turkana", "Trans Nzoia", "Elgeyo/Marakwet", "Baringo"],
      "samburu": ["Marsabit", "Isiolo", "Laikipia", "Baringo", "Turkana"],
      "trans nzoia": ["Bungoma", "Uasin Gishu", "Elgeyo/Marakwet", "West Pokot"],
      "uasin gishu": ["Trans Nzoia", "Baringo", "Elgeyo/Marakwet", "Nandi", "Kericho"],
      "elgeyo/marakwet": ["Trans Nzoia", "Uasin Gishu", "Baringo", "West Pokot"],
      "nandi": ["Uasin Gishu", "Kericho", "Kisumu", "Vihiga", "Kakamega"],
      "baringo": ["Nakuru", "Laikipia", "Samburu", "Turkana", "West Pokot", "Elgeyo/Marakwet", "Uasin Gishu", "Kericho"],
      "laikipia": ["Samburu", "Isiolo", "Meru", "Nyeri", "Nyandarua", "Nakuru", "Baringo"],
      "nakuru": ["Baringo", "Laikipia", "Nyandarua", "Kiambu", "Kajiado", "Narok", "Bomet", "Kericho"],
      "narok": ["Nakuru", "Kajiado", "Bomet", "Migori", "Kisii", "Nyamira"],
      "kajiado": ["Nairobi", "Kiambu", "Machakos", "Makueni", "Taita/Taveta", "Narok", "Nakuru"],
      "kericho": ["Nandi", "Uasin Gishu", "Baringo", "Nakuru", "Bomet", "Kisumu", "Nyamira"],
      "bomet": ["Kericho", "Nakuru", "Narok", "Kisii", "Nyamira"],
      "kakamega": ["Bungoma", "Busia", "Siaya", "Vihiga", "Nandi"],
      "vihiga": ["Kakamega", "Nandi", "Kisumu", "Siaya"],
      "bungoma": ["Trans Nzoia", "Kakamega", "Busia"],
      "busia": ["Bungoma", "Kakamega", "Siaya"],
      "siaya": ["Busia", "Kakamega", "Vihiga", "Kisumu", "Homa Bay"],
      "kisumu": ["Vihiga", "Nandi", "Kericho", "Nyamira", "Homa Bay", "Siaya"],
      "homa bay": ["Kisumu", "Siaya", "Migori", "Kisii"],
      "migori": ["Homa Bay", "Kisii", "Narok"],
      "kisii": ["Nyamira", "Bomet", "Narok", "Migori", "Homa Bay"],
      "nyamira": ["Kisii", "Bomet", "Kericho", "Kisumu"]
    };
    return map[cleanName] || [];
  };

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

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    if (!checkRateLimit()) {
      return;
    }

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);
    setRiskAssessment(null);

    try {
      const chosenModel = localStorage.getItem('pfa_ai_model') || 'meta/llama-3.1-8b-instruct';
      const response = await fetch('/api/pfa-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userMsg,
          profile,
          messages,
          lang,
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

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || "The AI network requires a registered server credentials key.");
      }

      // Record message timestamp to respect 24 hours sliding window
      recordMessageSent();

      const text = data.response;
      const match = text.match(/\{.*\}/s);
      
      let replyText = lang === 'sw' 
        ? "Niko hapa kukusaidia kila wakati. Tafadhali vuta pumzi ndefu."
        : "I'm always here to support you. Please take a deep breath.";
      let score = 0.2;
      let status = "normal";

      if (match) {
        try {
          const parsed = JSON.parse(match[0]);
          replyText = parsed.reply;
          score = parsed.risk_score_0_to_1 || score;
          status = parsed.suicidal_assessment || status;
        } catch (e) {
          console.error("JSON parsing failed, falling back to raw output", e);
          replyText = text.replace(/```json|```/g, "").trim();
        }
      } else {
        replyText = text.trim();
      }

      setMessages(prev => [...prev, { role: 'bot', content: replyText }]);

      // Trigger critical suicidal peer matching workflow
      if (status === 'suicidal' || score >= 0.8) {
        setRiskAssessment('suicidal');
        await triggerEmergencyPeerCoordination(userMsg, score);
      } else if (status === 'distressed' || score > 0.5) {
        setRiskAssessment('distressed');
      }

    } catch (err: any) {
      console.error("Gemini PFA failed", err);
      setMessages(prev => [
        ...prev, 
        { 
          role: 'bot', 
          content: `Connection Alert: ${err.message || "Please verify your GEMINI_API_KEY value in Settings > Secrets. In the meantime, remember your work is deeply valued."}` 
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const triggerEmergencyPeerCoordination = async (lastUserMsg: string, score: number) => {
    try {
      const userCounty = parseCounty(profile?.county);

      // Query database for active volunteers / leaders
      const { data: potentialPeers } = await supabase
        .from('profiles')
        .select('*')
        .eq('status', 'active');

      const allResponders = potentialPeers || [];

      // 1. Try local county matching
      const matchingPeers = allResponders.filter(p => {
        if (p.id === user?.id) return false;
        const peerCounty = parseCounty(p.county);
        return peerCounty.toLowerCase() === userCounty.toLowerCase() && 
               (p.role === 'volunteer' || p.county?.startsWith('Community Leader |'));
      });

      if (matchingPeers.length > 0) {
        // Pick the closest colleague in local county
        const chosenPeer = matchingPeers[0];
        setEscalatedPeer(chosenPeer);

        await supabase.from('triage_sessions').upsert({
          victim_id: user?.id, // Staff member in distress
          volunteer_id: chosenPeer.id, // assigned teammate
          last_message: `[COWORKER DISTRESS IN ${userCounty.toUpperCase()}] ${lastUserMsg}`,
          risk_score: score,
          status: 'open',
          escalated: true,
          notes: `[ALERT_SUICIDAL] [CRITICAL TEAM DISTRESS ALERT] Our staff teammate ${profile?.full_name || 'Responder'} (${profile?.role}) is undergoing severe distress (Suicidal Safety Warning). Commenced instant coordinate protocol matching with local county member: ${chosenPeer.full_name}. Contact: ${chosenPeer.phone_number || 'N/A'}`
        }, { onConflict: 'victim_id' });

      } else {
        // 2. Fallback to neighboring counties in proximity list
        const neighbors = getNearbyCounties(userCounty).map(n => n.toLowerCase());
        const neighboringPeers = allResponders.filter(p => {
          if (p.id === user?.id) return false;
          const peerCounty = parseCounty(p.county).toLowerCase();
          return neighbors.includes(peerCounty) && 
                 (p.role === 'volunteer' || p.county?.startsWith('Community Leader |'));
        });

        if (neighboringPeers.length > 0) {
          const chosenPeer = neighboringPeers[0];
          setEscalatedPeer(chosenPeer);

          await supabase.from('triage_sessions').upsert({
            victim_id: user?.id,
            volunteer_id: chosenPeer.id,
            last_message: `[COWORKER DISTRESS IN ${userCounty.toUpperCase()}] ${lastUserMsg}`,
            risk_score: score,
            status: 'open',
            escalated: true,
            notes: `[ALERT_SUICIDAL] [CRITICAL TEAM DISTRESS ALERT] Our staff teammate ${profile?.full_name || 'Responder'} (${profile?.role}) is undergoing severe distress. No local responders inside ${userCounty}, matched fallback nearby county responder: ${chosenPeer.full_name} (${parseCounty(chosenPeer.county)} County). Contact: ${chosenPeer.phone_number || 'N/A'}`
          }, { onConflict: 'victim_id' });

        } else {
          // 3. Fallback to any active volunteer / leader anywhere else in Kenya
          const globalPeers = allResponders.filter(p => {
            if (p.id === user?.id) return false;
            return p.role === 'volunteer' || p.county?.startsWith('Community Leader |');
          });

          if (globalPeers.length > 0) {
            const chosenPeer = globalPeers[0];
            setEscalatedPeer(chosenPeer);

            await supabase.from('triage_sessions').upsert({
              victim_id: user?.id,
              volunteer_id: chosenPeer.id,
              last_message: `[COWORKER DISTRESS IN ${userCounty.toUpperCase()}] ${lastUserMsg}`,
              risk_score: score,
              status: 'open',
              escalated: true,
              notes: `[ALERT_SUICIDAL] [CRITICAL TEAM DISTRESS ALERT] Our staff teammate ${profile?.full_name || 'Responder'} (${profile?.role}) is undergoing severe distress. Deployed general backup counselor: ${chosenPeer.full_name} (${parseCounty(chosenPeer.county)} County). Contact: ${chosenPeer.phone_number || 'N/A'}`
            }, { onConflict: 'victim_id' });

          } else {
            // 4. Ultimate fallback to administrative coordinator line
            setEscalatedPeer({
              full_name: "Administrative Crisis Support Line",
              phone_number: "+254711223344",
              role: "Crisis Coordinator"
            });

            await supabase.from('triage_sessions').upsert({
              victim_id: user?.id,
              volunteer_id: null,
              last_message: `[COWORKER DISTRESS IN ${userCounty.toUpperCase()}] ${lastUserMsg}`,
              risk_score: score,
              status: 'open',
              escalated: true,
              notes: `[ALERT_SUICIDAL] [CRITICAL TEAM DISTRESS ALERT] Our staff teammate ${profile?.full_name || 'Responder'} (${profile?.role}) is undergoing severe distress. No registered rescue colleagues found anywhere. Upgraded alert directly to Administration Crisis Support Line.`
            }, { onConflict: 'victim_id' });
          }
        }
      }
    } catch (e) {
      console.error("Critical routing error", e);
    }
  };

  return (
    <>
      {/* Floating Launcher Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 p-4 rounded-full shadow-2xl transition-all ${
            isDark 
              ? 'bg-red-650 hover:bg-red-700 text-white border border-red-500/20' 
              : 'bg-red-600 hover:bg-red-700 text-white'
          }`}
        >
          <Heart className="animate-pulse" size={24} />
          <span className="text-sm font-black tracking-wide pr-1">PFA Mental Help</span>
        </motion.button>
      </div>

      {/* Floating Chat Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 50 }}
            className={`fixed bottom-24 right-6 z-50 w-full max-w-md h-[550px] rounded-3xl shadow-3xl overflow-hidden border flex flex-col ${
              isDark 
                ? 'bg-slate-900 border-slate-800 text-slate-100' 
                : 'bg-white border-slate-200 text-slate-800'
            }`}
          >
            {/* Header */}
            <div className={`p-4 border-b flex flex-col gap-3 bg-red-600 text-white`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Heart size={20} className="fill-current text-white animate-pulse" />
                  <div>
                    <h3 className="font-black text-sm tracking-tight">PFA Support Buddy</h3>
                    <p className="text-[10px] text-red-100 uppercase tracking-widest font-black">Humane Staff Care Active</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-1 focus:ring-1 focus:ring-white rounded-lg hover:bg-black/10 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Language Selector Tabs */}
              <div className="flex bg-red-800/40 p-0.5 rounded-xl self-start text-[10px] font-black tracking-wider uppercase">
                <button
                  type="button"
                  onClick={() => setLang('en')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${lang === 'en' ? 'bg-white text-red-600 shadow-sm' : 'text-red-100 hover:text-white'}`}
                >
                  English 🇬🇧
                </button>
                <button
                  type="button"
                  onClick={() => setLang('sw')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${lang === 'sw' ? 'bg-white text-red-600 shadow-sm' : 'text-red-100 hover:text-white'}`}
                >
                  Kiswahili 🇰🇪
                </button>
              </div>
            </div>

            {/* Emergency Ribbon Alert Panel */}
            <AnimatePresence>
              {riskAssessment === 'suicidal' && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  className="bg-red-500 text-white p-4 text-xs font-bold border-b border-red-605 space-y-2"
                >
                  <p className="flex items-center gap-1.5 uppercase font-black tracking-wider">
                    <AlertOctagon size={16} /> Suicidal Crisis Assist Triggered
                  </p>
                  <p className="leading-relaxed opacity-95">
                    We detected deep pain. You are never alone. The system has automatically mapped a nearby responder in your county to reach out and check on you right away!
                  </p>
                  {escalatedPeer && (
                    <div className="bg-red-950/25 p-2 rounded-lg border border-red-400/20 mt-1 space-y-1">
                      <p className="font-extrabold flex items-center gap-1"><UserCheck size={12}/> Assigned Peer Guard Coordinator:</p>
                      <p className="text-xs font-bold text-red-200">{escalatedPeer.full_name} ({escalatedPeer.phone_number || 'N/A'})</p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Message History area */}
            <div className={`flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar ${isDark ? 'bg-slate-950/40' : 'bg-slate-50'}`}>
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-red-600 text-white rounded-tr-none shadow-md'
                      : isDark 
                        ? 'bg-slate-800 text-slate-100 rounded-tl-none border border-slate-700/50' 
                        : 'bg-white text-slate-800 rounded-tl-none border border-slate-150 shadow-sm'
                  }`}>
                    {m.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className={`rounded-xl p-3 flex items-center gap-2 text-xs font-semibold ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
                    <Loader2 className="animate-spin text-red-600" size={15} />
                    {lang === 'sw' ? 'PFA Buddy anajibu...' : 'PFA Buddy is processing...'}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Actions if distressed */}
            {riskAssessment === 'distressed' && (
              <div className="px-4 py-2 bg-amber-500/10 border-t border-amber-500/10 text-amber-500 text-[11px] font-bold flex items-center gap-2">
                <ShieldAlert size={14} className="flex-shrink-0" />
                <span>Colleague, we hear your distress. Please remember to stretch, rest, or notify a supervisor for help.</span>
              </div>
            )}

            {/* Rate limit advisory alert details */}
            {rateLimitExceeded && (
              <div className="mx-4 my-2 p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl flex flex-col gap-1">
                <span className="font-black text-[10px] uppercase tracking-wider flex items-center gap-1.5 text-red-600 dark:text-red-400">
                  ⚠️ AI Usage Rate Limit Reached
                </span>
                <span className="text-[10px] font-bold leading-relaxed text-red-700 dark:text-red-300">
                  {lang === 'sw' 
                    ? `Umekamilisha kiwango chako cha ujumbe 10. Mfumo utasubiri saa 24 upate ujumbe upya. Muda uliosalia: ${remainingTimeStr}`
                    : `You have exhausted your daily limit of 10 therapeutic messages. The AI system resets in 24 hours to prevent fatigue. Countdown: ${remainingTimeStr}`
                  }
                </span>
              </div>
            )}

            {/* Input Submission Footer */}
            <form onSubmit={handleSend} className={`p-3 border-t flex gap-2 items-center ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                disabled={rateLimitExceeded}
                placeholder={rateLimitExceeded 
                  ? (lang === 'sw' ? "Kiwango kimefikiwa! Subiri saa 24..." : "Message block active! Resetting in 24h...") 
                  : (lang === 'sw' ? "Zungumza kuhusu msongo au hali yako..." : "Talk about the stress or situation...")
                }
                className={`flex-1 px-4 py-2.5 rounded-full border text-xs font-bold outline-none focus:ring-1 focus:ring-red-500 transition-all ${
                  rateLimitExceeded ? 'bg-slate-100 border-slate-200 text-slate-400 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-650' :
                  isDark ? 'bg-slate-950 border-slate-800 text-white placeholder:text-slate-650' : 'bg-slate-50 border-slate-200 text-slate-950 placeholder:text-slate-400'
                }`}
              />
              <button
                type="submit"
                disabled={!input.trim() || loading || rateLimitExceeded}
                className="w-9 h-9 rounded-full bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white flex items-center justify-center transition-colors shadow-md cursor-pointer h-9 w-9 shrink-0"
              >
                <Send size={15} className="mr-0.5" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
