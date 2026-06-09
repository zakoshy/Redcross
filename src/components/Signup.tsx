import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Activity, Loader2, ArrowLeft, Eye, EyeOff } from 'lucide-react';

export default function Signup() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate county if community leader
    if (roleType === 'community_leader' && !county) {
      setError('Please select a county for your community leadership position.');
      setLoading(false);
      return;
    }

    // Build the metadata object
    const metadata: Record<string, any> = {
      full_name: fullName,
      role: 'volunteer' // Internally registered as volunteer to fulfill Supabase database enum triggers
    };

    if (roleType === 'community_leader') {
      metadata.is_community_leader = 'true';
      metadata.county = `Community Leader | ${county} | ${communityName} | ${leadershipRole} | ${disasterExperience} | ${communityLivestock} | ${verificationReason}`;
      metadata.leadership_answers = {
        community_name: communityName,
        leadership_role: leadershipRole,
        disaster_experience: disasterExperience,
        community_livestock: communityLivestock,
        verification_reason: verificationReason
      };
    } else {
      metadata.county = county || 'Volunteer';
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    });

    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
    }
    setLoading(false);
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
            onClick={() => navigate('/login')}
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
            onClick={() => navigate('/login')}
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
                    📋 Leadership Questionnaire (Google Forms Format)
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                    This detailed application forms the basis of your administrative verification. Please answer fully and accurately.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">Select Your Jurisdiction County</label>
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
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">Representative Community / Ward Name *</label>
                  <input
                    type="text"
                    required
                    value={communityName}
                    onChange={(e) => setCommunityName(e.target.value)}
                    className={`w-full px-4 py-3 border rounded-xl outline-none focus:ring-1 focus:ring-red-500 transition-all text-sm font-semibold ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                    placeholder="e.g. Dadaab Sector 4"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">Your Official Title/Role in this Community *</label>
                  <input
                    type="text"
                    required
                    value={leadershipRole}
                    onChange={(e) => setLeadershipRole(e.target.value)}
                    className={`w-full px-4 py-3 border rounded-xl outline-none focus:ring-1 focus:ring-red-500 transition-all text-sm font-semibold ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                    placeholder="e.g. Village Senior Elder, Sublocational Chief"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">Emergency/Disaster Coordination Experience *</label>
                  <textarea
                    required
                    rows={2}
                    value={disasterExperience}
                    onChange={(e) => setDisasterExperience(e.target.value)}
                    className={`w-full px-4 py-3 border rounded-xl outline-none focus:ring-1 focus:ring-red-500 transition-all text-sm font-semibold placeholder:text-slate-400 ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                    placeholder="Detail past rescue efforts, flood response, or food aid coordinates..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">Community Livestock & Agricultural Assets *</label>
                  <textarea
                    required
                    rows={2}
                    value={communityLivestock}
                    onChange={(e) => setCommunityLivestock(e.target.value)}
                    className={`w-full px-4 py-3 border rounded-xl outline-none focus:ring-1 focus:ring-red-500 transition-all text-sm font-semibold placeholder:text-slate-400 ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                    placeholder="Describe livestock assets, count, and drought vulnerabilities (e.g. 150 cattle, 300 camels, 50 acres of maize)..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">Why do you require portal permission to issue local alerts? *</label>
                  <textarea
                    required
                    rows={2}
                    value={verificationReason}
                    onChange={(e) => setVerificationReason(e.target.value)}
                    className={`w-full px-4 py-3 border rounded-xl outline-none focus:ring-1 focus:ring-red-500 transition-all text-sm font-semibold placeholder:text-slate-400 ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                    placeholder="We will use this to confirm identity and emergency verification access..."
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
              <button onClick={() => navigate('/login')} className="text-red-500 font-black hover:underline">
                Sign In
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
