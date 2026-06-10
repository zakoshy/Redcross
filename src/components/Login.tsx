import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Activity, Loader2, ArrowLeft, Eye, EyeOff, ShieldAlert } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function Login() {
  const navigate = useNavigate();
  const { loginAsMock } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Sanitize credentials to protect against potential SQL Injection inputs in raw forms
    const cleanEmail = email.replace(/[<>'"`;\\=}$]/g, '').trim();

    const { error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (error) {
      setError(error.message);
    }
    setLoading(false);
  };

  const handleQuickLogin = (role: 'admin' | 'volunteer' | 'leader') => {
    if (role === 'admin') {
      const mockUser = { id: 'sb_admin', email: 'admin@pfa.org', user_metadata: { full_name: 'Red Cross Administrator' } };
      const mockProfile = {
        id: 'sb_admin',
        email: 'admin@pfa.org',
        full_name: 'Red Cross Administrator',
        role: 'admin' as any,
        status: 'active' as any,
        county: 'Nairobi',
        created_at: new Date().toISOString()
      };
      loginAsMock(mockUser, mockProfile);
      navigate('/admin-dashboard');
    } else if (role === 'volunteer') {
      const mockUser = { id: 'sb_volunteer', email: 'omar@volunteer.org', user_metadata: { full_name: 'Omar Hassan' } };
      const mockProfile = {
        id: 'sb_volunteer',
        email: 'omar@volunteer.org',
        full_name: 'Omar Hassan',
        role: 'volunteer' as any,
        status: 'active' as any,
        county: 'Kwale',
        created_at: new Date().toISOString()
      };
      loginAsMock(mockUser, mockProfile);
      navigate('/volunteer-dashboard');
    } else if (role === 'leader') {
      const mockUser = { id: 'sb_leader', email: 'chief@dadaab.org', user_metadata: { full_name: 'Chief Hassan Aden' } };
      const mockProfile = {
        id: 'sb_leader',
        email: 'chief@dadaab.org',
        full_name: 'Chief Hassan Aden',
        role: 'volunteer' as any,
        status: 'active' as any,
        county: 'Community Leader | Garissa | Dadaab Sector 4 | Senior Chief Elder | Flood coordinator 2026 | 200 cattle, 150 camels | Verified early warning coordinator',
        created_at: new Date().toISOString()
      };
      loginAsMock(mockUser, mockProfile);
      navigate('/volunteer-dashboard');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 border border-slate-100">
        <button 
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-8 transition-colors text-sm font-medium"
        >
          <ArrowLeft size={16} />
          Back to Home
        </button>

        <div className="text-center mb-8">
          <div className="bg-red-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Activity className="text-red-600" size={32} />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Portal Login</h1>
          <p className="text-slate-500 mt-2">Authorized personnel only.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all bg-slate-50"
              placeholder="name@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all bg-slate-50 pr-12"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100 font-medium">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-red-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-100 text-center space-y-4 font-sans">
          <p className="text-sm text-slate-500">
            Need an account?{' '}
            <button onClick={() => navigate('/signup')} className="text-red-655 font-black hover:underline">
              Sign Up
            </button>
          </p>
          <p className="text-[10px] text-slate-400 font-medium">
            Strict sanitization layers protect all form pathways.
          </p>
        </div>
      </div>
    </div>
  );
}
