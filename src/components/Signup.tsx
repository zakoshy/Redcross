"use client";

import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/navigation';
import { Activity, Loader2, ArrowLeft, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function Signup() {
  const router = useRouter();
  const { loginAsMock } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailErrorBypass, setEmailErrorBypass] = useState(false);
  const [success, setSuccess] = useState(false);

  // Community Leader registration fields
  const [roleType, setRoleType] = useState<'volunteer' | 'community_leader'>('volunteer');
  const [county, setCounty] = useState('');
  const [communityName, setCommunityName] = useState('');
  const [leadershipRole, setLeadershipRole] = useState('');
  const [disasterExperience, setDisasterExperience] = useState('');
  const [communityLivestock, setCommunityLivestock] = useState('');
  const [verificationReason, setVerificationReason] = useState('');

  // General theme support for signup page
  const [theme] = useState<'light' | 'dark'>(() => (localStorage.getItem('admin_theme') || localStorage.getItem('volunteer_theme') || 'light') as any);
  const isDark = theme === 'dark';

  // Strict Sanitizer to prevent SQL Injection and command-breakouts
  const sanitize = (text: string, allowPipes: boolean = false): string => {
    if (!text) return '';
    // Strip HTML tagging and characters used in SQL quotes/semicolon escapes
    let cleaned = text.replace(/[<>"';\\={}$]/g, '');
    if (!allowPipes) {
      cleaned = cleaned.replace(/\|/g, '-'); // Replace pipes to preserve column encoding integrity
    }
    return cleaned.trim();
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setEmailErrorBypass(false);

    // Strict input cleaning
    const cleanFullName = sanitize(fullName);
    const cleanEmail = sanitize(email).replace(/\s/g, '');
    const cleanCounty = sanitize(county);
    const cleanCommunityName = sanitize(communityName);
    const cleanLeadershipRole = sanitize(leadershipRole);
    const cleanDisasterExperience = sanitize(disasterExperience);
    const cleanCommunityLivestock = sanitize(communityLivestock);
    const cleanVerificationReason = sanitize(verificationReason);

    // Validate county if community leader
    if (roleType === 'community_leader' && !cleanCounty) {
      setError('Please select a county for your community leadership position.');
      setLoading(false);
      return;
    }

    // Build the metadata object with thoroughly sanitized variables
    const metadata: Record<string, any> = {
      full_name: cleanFullName,
      role: 'volunteer' // Internally registered as volunteer to fulfill Supabase database enum triggers
    };

    if (roleType === 'community_leader') {
      metadata.is_community_leader = 'true';
      metadata.county = `Community Leader | ${cleanCounty} | ${cleanCommunityName} | ${cleanLeadershipRole} | ${cleanDisasterExperience} | ${cleanCommunityLivestock} | ${cleanVerificationReason}`;
      metadata.leadership_answers = {
        community_name: cleanCommunityName,
        leadership_role: cleanLeadershipRole,
        disaster_experience: cleanDisasterExperience,
        community_livestock: cleanCommunityLivestock,
        verification_reason: cleanVerificationReason
      };
    } else {
      metadata.county = cleanCounty || 'Volunteer';
    }

    try {
      const { error } = await supabase.auth.signUp({
        email: cleanEmail,
        password, // Passwords are hashed by Supabase auth system; no raw database concatenation
        options: {
          data: metadata
        }
      });

      if (error) {
        setError(error.message);
        // If error is related to email provider / confirmation / smtp, trigger local-bypass helper
        const isEmailError = error.message.toLowerCase().includes('email') || 
                             error.message.toLowerCase().includes('smtp') || 
                             error.message.toLowerCase().includes('provider') || 
                             error.message.toLowerCase().includes('rate limit') ||
                             error.message.toLowerCase().includes('confirmation') ||
                             error.message.toLowerCase().includes('message') ||
                             error.message.toLowerCase().includes('send');
        if (isEmailError) {
          setEmailErrorBypass(true);
        }
      } else {
        setSuccess(true);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during registration.');
    } finally {
      setLoading(false);
    }
  };

  // Immediate Sandbox Local-Storage Mock Onboarding
  const handleSandboxOnboarding = async () => {
    setLoading(true);
    try {
      const mockId = 'sb_' + Math.random().toString(36).substring(2, 10);
      const cleanFullName = sanitize(fullName) || 'Test Responder';
      const cleanEmail = sanitize(email).replace(/\s/g, '') || 'test@example.com';
      const cleanCounty = sanitize(county) || 'Kwale';
      const cleanCommunityName = sanitize(communityName) || 'Sub-Location';
      const cleanLeadershipRole = sanitize(leadershipRole) || 'Coordinator';
      const cleanDisasterExperience = sanitize(disasterExperience) || 'No experience entered';
      const cleanCommunityLivestock = sanitize(communityLivestock) || 'No assets mapped';
      const cleanVerificationReason = sanitize(verificationReason) || 'Vetting application';

      let finalCountyString = cleanCounty || 'Volunteer';
      if (roleType === 'community_leader') {
        finalCountyString = `Community Leader | ${cleanCounty} | ${cleanCommunityName} | ${cleanLeadershipRole} | ${cleanDisasterExperience} | ${cleanCommunityLivestock} | ${cleanVerificationReason}`;
      }

      const mockProfile = {
        id: mockId,
        email: cleanEmail,
        full_name: cleanFullName,
        county: finalCountyString,
        role: 'volunteer' as any,
        status: roleType === 'community_leader' ? 'pending' : 'active' as any,
        created_at: new Date().toISOString()
      };

      const mockUser = {
        id: mockId,
        email: cleanEmail,
        user_metadata: {
          full_name: cleanFullName,
          role: 'volunteer'
        }
      };

      // Attempt to silently insert into Supabase database, letting failure pass if RLS blocks anonymous writes
      try {
        await supabase.from('profiles').insert([mockProfile]);
      } catch (e) {
        console.warn('Anonymous DB Profile insert bypassed:', e);
      }

      // Log in in active browser session
      loginAsMock(mockUser, mockProfile);
      router.push('/volunteer');
    } catch (err: any) {
      setError(err.message || 'Error processing instant local bypass onboarding.');
    } finally {
      setLoading(false);
    }
  };

  const KENYAN_COUNTIES = [
    "Mombasa", "Kwale", "Kilifi", "Tana River", "Lamu", "Taita/Taveta",
    "Garissa", "Wajir", "Mandera", "Marsabit", "Isiolo", "Meru",
    "Tharaka-Nithi", "Embu", "Kitui", "Machakos", "Makueni", "Nyandarua",
    "Nyeri", "Kirinyaga", "Murang'a", "Kiambu", "Turkana", "West Pokot",
    "Samburu", "Trans Nzoia", "Uasin Gishu", "Elgeyo/Marakwet", "Nandi",
    "Baringo", "Laikipia", "Nakuru", "Narok", "Kajiado", "Kericho",
    "Bomet", "Kakamega", "Vihiga", "Bungoma", "Busia", "Siaya",
    "Kisumu", "Homa Bay", "Migori", "Kisii", "Nyamira", "Nairobi"
  ];

  if (success) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 font-sans transition-colors ${isDark ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
        <div className={`w-full max-w-md rounded-3xl shadow-2xl p-8 border text-center ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
          <div className="bg-green-500/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Activity className="text-green-500" size={32} />
          </div>
          <h1 className="text-2xl font-black tracking-tight mb-2">Check Your Email</h1>
          <p className={`${isDark ? 'text-slate-400' : 'text-slate-500'} mb-8`}>
            We've sent a verification link to <span className="font-bold">{email}</span>.{' '}
            {roleType === 'community_leader' ? 'Once verified, your Google Form responses will be routed to the Admin team for leadership verification.' : 'Please verify your email to activate your account.'}
          </p>
          <button
            onClick={() => router.push('/login')}
            className="w-full bg-red-650 hover:bg-red-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-red-600/20"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 font-sans transition-colors ${roleType === 'community_leader' ? 'py-12' : ''} ${isDark ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
      <div className={`w-full ${roleType === 'community_leader' ? 'max-w-xl' : 'max-w-md'} rounded-3xl shadow-2xl overflow-hidden border transition-all ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
        
        {/* Purple/Red standard Google Forms top accent bar */}
        <div className="h-3 bg-red-650 w-full" />
        
        <div className="p-8">
          <button 
            onClick={() => router.push('/login')}
            className={`flex items-center gap-2 mb-6 transition-colors text-sm font-medium ${isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800'}`}
          >
            <ArrowLeft size={16} />
            Back to Login
          </button>

          <div className="text-center mb-8">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${isDark ? 'bg-red-950/40' : 'bg-red-50'}`}>
              <Activity className="text-red-500" size={32} />
            </div>
            <h1 className="text-3xl font-black tracking-tight">Relief Network Registration</h1>
            <p className={`mt-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Join as an authorized responder to coordinate local crisis aid.</p>
          </div>

          {/* Toggle Role Selection */}
          <div className={`grid grid-cols-2 p-1.5 rounded-2xl mb-8 border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
            <button
              type="button"
              onClick={() => setRoleType('volunteer')}
              className={`py-3 rounded-xl font-bold text-xs transition-all ${
                roleType === 'volunteer' 
                  ? 'bg-red-650 text-white shadow-md' 
                  : `${isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-800'}`
              }`}
            >
              Regular Volunteer
            </button>
            <button
              type="button"
              onClick={() => setRoleType('community_leader')}
              className={`py-3 rounded-xl font-bold text-xs transition-all ${
                roleType === 'community_leader' 
                  ? 'bg-red-650 text-white shadow-md' 
                  : `${isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-800'}`
              }`}
            >
              👑 Community Leader
            </button>
          </div>

          <form onSubmit={handleSignup} className="space-y-6">
            
            {/* Standard Credentials */}
            <div className="space-y-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-red-500">1. Account Information</h3>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={`w-full px-4 py-3 border rounded-xl outline-none focus:ring-1 focus:ring-red-500 transition-all text-sm font-semibold ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full px-4 py-3 border rounded-xl outline-none focus:ring-1 focus:ring-red-500 transition-all text-sm font-semibold ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                  placeholder="name@example.com"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`w-full px-4 py-3 border rounded-xl outline-none focus:ring-1 focus:ring-red-500 transition-all text-sm font-semibold ${isDark ? 'bg-slate-950 border-slate-800 text-white pr-12' : 'bg-slate-50 border-slate-200 text-slate-900 pr-12'}`}
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
            </div>

            {/* Google Form Styled Community Leader Questionnaire */}
            {roleType === 'community_leader' ? (
              <div className="space-y-5 pt-4 border-t border-slate-200/50">
                <div className="bg-red-500/5 p-4 rounded-2xl border border-red-500/10 mb-4">
                  <h3 className="text-xs font-black uppercase tracking-wider text-red-500 mb-1 flex items-center gap-1.5">
                    📋 Red Cross - Local Community Leader Vetting Form
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                    This comprehensive vetting aligns with Red Cross Disaster Response Guidelines and Psychosocial Triage protocols. Please complete each humanitarian criterion fully.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">1. Designated Community Jurisdiction (Sub-Location / Ward) *</label>
                  <select
                    required
                    value={county}
                    onChange={e => setCounty(e.target.value)}
                    className={`w-full px-4 py-3 border rounded-xl outline-none focus:ring-1 focus:ring-red-500 transition-all text-sm font-black ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                  >
                    <option value="">-- Choose Kenya County --</option>
                    {KENYAN_COUNTIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">2. Specific Village or Ward Name of Responsibility *</label>
                  <input
                    type="text"
                    required
                    value={communityName}
                    onChange={(e) => setCommunityName(e.target.value)}
                    className={`w-full px-4 py-3 border rounded-xl outline-none focus:ring-1 focus:ring-red-500 transition-all text-sm font-semibold ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                    placeholder="e.g., Dadaab Sector 4, Kilimani Ward"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">3. Humanitarian Designation / Community Leadership Role *</label>
                  <input
                    type="text"
                    required
                    value={leadershipRole}
                    onChange={(e) => setLeadershipRole(e.target.value)}
                    className={`w-full px-4 py-3 border rounded-xl outline-none focus:ring-1 focus:ring-red-500 transition-all text-sm font-semibold ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                    placeholder="e.g., Sublocational Chief, Red Cross Unit Coordinator, Senior Elder"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">4. disaster experience & emergency response track record *</label>
                  <textarea
                    required
                    rows={2}
                    value={disasterExperience}
                    onChange={(e) => setDisasterExperience(e.target.value)}
                    className={`w-full px-4 py-3 border rounded-xl outline-none focus:ring-1 focus:ring-red-500 transition-all text-sm font-semibold placeholder:text-slate-400 ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                    placeholder="Please specify past crisis coordination experience (e.g., flash flood rescues, drought aid supply, local PFA counseling)..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">5. vulnerable assets & community livestock mapping *</label>
                  <textarea
                    required
                    rows={2}
                    value={communityLivestock}
                    onChange={(e) => setCommunityLivestock(e.target.value)}
                    className={`w-full px-4 py-3 border rounded-xl outline-none focus:ring-1 focus:ring-red-500 transition-all text-sm font-semibold placeholder:text-slate-400 ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                    placeholder="Detail livestock totals and acute drought/flood vulnerabilities (e.g., 200 cattle, 150 camels, 30 smallholder maize farms)..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">6. humanitarian justification for alert-dispatch authority *</label>
                  <textarea
                    required
                    rows={2}
                    value={verificationReason}
                    onChange={(e) => setVerificationReason(e.target.value)}
                    className={`w-full px-4 py-3 border rounded-xl outline-none focus:ring-1 focus:ring-red-500 transition-all text-sm font-semibold placeholder:text-slate-400 ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                    placeholder="What specific early warnings will you dispatch to protect vulnerable households and assets?"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4 pt-4 border-t border-slate-200/50">
                <h3 className="text-sm font-black uppercase tracking-wider text-red-500">2. Demographics</h3>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">Operational County</label>
                  <select
                    value={county}
                    onChange={e => setCounty(e.target.value)}
                    className={`w-full px-4 py-3 border rounded-xl outline-none focus:ring-1 focus:ring-red-500 transition-all text-sm font-black ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                  >
                    <option value="">-- Choose Operational County --</option>
                    {KENYAN_COUNTIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-500/10 text-red-500 text-xs rounded-xl border border-red-500/20 font-black">
                ⚠️ {error}
              </div>
            )}

            {emailErrorBypass && (
              <div className={`p-5 rounded-2xl border ${isDark ? 'bg-amber-500/10 border-amber-500/20 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-800'} text-xs space-y-3`}>
                <p className="font-black flex items-center gap-1.5 text-xs uppercase tracking-wider text-amber-600">
                  ⚡ Sandbox Option: Bypass Email Sending
                </p>
                <p className="font-medium leading-relaxed">
                  This sandbox's default email relay is restricted or has reached its daily trial count. 
                  To continue your testing immediately without waiting, you can secure-bypass the SMTP confirmation check and activate this account locally:
                </p>
                <button
                  type="button"
                  onClick={handleSandboxOnboarding}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white font-black py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-xs uppercase tracking-wider"
                >
                  <ShieldCheck size={16} /> Bypass Email & Start Session Instantly
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-4 rounded-xl transition-all shadow-lg shadow-red-650/20 disabled:opacity-50 flex items-center justify-center gap-2 text-sm uppercase tracking-wider"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : (roleType === 'community_leader' ? 'Submit Forms Application' : 'Register Account')}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-slate-500">
              Already have an account?{' '}
              <button onClick={() => router.push('/login')} className="text-red-500 font-black hover:underline">
                Sign In
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
