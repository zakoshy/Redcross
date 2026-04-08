import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { MessageSquare, Send, Heart, AlertCircle, Loader2, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini
const genAI = new GoogleGenerativeAI((import.meta as any).env.VITE_GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

interface Message {
  role: 'user' | 'bot';
  content: string;
}

export default function VictimChatbot() {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', content: "Hello. I'm here to provide Psychological First Aid. How are you feeling right now? Please tell me what's on your mind." }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [riskScore, setRiskScore] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      // 1. Get AI Response and Risk Assessment
      const prompt = `
        You are a Psychological First Aid (PFA) chatbot. 
        The user is a victim of a disaster.
        User message: "${userMessage}"
        
        Current conversation history:
        ${messages.map(m => `${m.role}: ${m.content}`).join('\n')}

        Task:
        1. Provide a supportive, empathetic PFA response.
        2. Assess the risk/danger level of the user (0.0 to 1.0). 
           - 0.0: Calm, safe.
           - 0.5: Distressed, needs attention.
           - 1.0: Immediate danger, suicidal ideation, or severe trauma.
        
        Return your response in JSON format:
        {
          "reply": "your empathetic response here",
          "risk_score": 0.85
        }
      `;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      
      // Extract JSON (Gemini sometimes wraps in markdown)
      const jsonMatch = responseText.match(/\{.*\}/s);
      const data = jsonMatch ? JSON.parse(jsonMatch[0]) : { reply: "I'm here for you. Tell me more.", risk_score: 0.1 };

      setMessages(prev => [...prev, { role: 'bot', content: data.reply }]);
      setRiskScore(data.risk_score);

      // 2. Update or Create Triage Session in Supabase
      if (user) {
        const { error } = await supabase
          .from('triage_sessions')
          .upsert({
            victim_id: user.id,
            last_message: userMessage,
            risk_score: data.risk_score,
            status: data.risk_score > 0.7 ? 'open' : 'closed',
            escalated: data.risk_score > 0.7
          }, { onConflict: 'victim_id' });
        
        if (error) console.error("Error updating triage:", error);
      }

    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { role: 'bot', content: "I'm having a little trouble connecting, but I'm still here for you. Please take a deep breath." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 p-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
            <Heart className="text-red-600" size={20} />
          </div>
          <div>
            <h1 className="font-bold text-slate-900">PFA Support Chat</h1>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Counselor Bot Online</span>
            </div>
          </div>
        </div>
        {riskScore > 0.7 && (
          <div className="flex items-center gap-2 bg-red-50 px-3 py-1 rounded-full border border-red-100">
            <AlertCircle className="text-red-600" size={14} />
            <span className="text-xs font-black text-red-600 uppercase tracking-widest">High Priority</span>
          </div>
        )}
      </header>

      <main 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 max-w-3xl mx-auto w-full"
      >
        <AnimatePresence initial={false}>
          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] p-4 rounded-2xl shadow-sm ${
                m.role === 'user' 
                  ? 'bg-red-600 text-white rounded-tr-none' 
                  : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none'
              }`}>
                <p className="text-sm leading-relaxed font-medium">{m.content}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center gap-2">
              <Loader2 className="animate-spin text-slate-400" size={16} />
              <span className="text-xs font-bold text-slate-400">Typing...</span>
            </div>
          </div>
        )}
      </main>

      <footer className="p-4 bg-white border-t border-slate-200 sticky bottom-0">
        <form onSubmit={handleSend} className="max-w-3xl mx-auto flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Type your message here..."
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-red-500 font-medium transition-all"
          />
          <button 
            type="submit"
            disabled={!input.trim() || loading}
            className="bg-red-600 text-white p-3 rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-200 disabled:opacity-50 disabled:shadow-none"
          >
            <Send size={20} />
          </button>
        </form>
        <p className="text-center text-[10px] text-slate-400 mt-2 font-medium">
          This is an AI counselor. If you are in immediate danger, please call emergency services.
        </p>
      </footer>
    </div>
  );
}
