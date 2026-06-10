import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Profile, Campaign, TriageSession, LedgerEntry } from '../types';
import { KENYAN_COUNTIES } from '../constants';
import { 
  ClipboardList, UserPlus, AlertCircle, Search, Filter, Plus, Edit, Save, X, 
  MapPin, CreditCard, Phone, LogOut, Sun, Moon, ShieldAlert, Heart, RefreshCw, 
  CheckCircle2, Megaphone, DollarSign, Activity, FileText, ArrowRight, Settings, Trash2, Sliders
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import PFABuddyChat from './PFABuddyChat';

interface DocTypeField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select';
  placeholder?: string;
  options?: string[];
  required?: boolean;
}

export default function VolunteerDashboard() {
  const { signOut, user, profile } = useAuth();
  
  // Dashboard lists
  const [victims, setVictims] = useState<Profile[]>([]);
  const [assignedCases, setAssignedCases] = useState<(TriageSession & { victim?: Profile })[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [disasterAlerts, setDisasterAlerts] = useState<TriageSession[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Theme Management
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('volunteer_theme') as any) || 'light');
  const isDark = theme === 'dark';

  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'register' | 'cases' | 'alerts' | 'search' | 'history'>('register');

  // Community Leader State Decoders
  const isLeader = profile?.county?.startsWith('Community Leader |') || false;

  React.useEffect(() => {
    if (isLeader) {
      setActiveTab('alerts');
    }
  }, [isLeader]);

  // Strict Sanitizer to prevent SQL Injection and command-breakouts
  const sanitize = (text: string): string => {
    if (!text) return '';
    return text.trim().replace(/[<>"';\\={}$]/g, '');
  };
  
  // Dynamic time-based greeting helper
  const getGreetingAndWelcome = () => {
    const hr = new Date().getHours();
    if (hr >= 4 && hr < 12) {
      return "Good morning";
    } else if (hr >= 12 && hr < 17) {
      return "Good afternoon";
    } else {
      return "Good evening";
    }
  };
  
  // Parse leader county cleanly
  const parseCounty = (cStr?: string) => {
    if (!cStr) return 'Unspecified';
    if (cStr.startsWith('Community Leader |')) {
      const parts = cStr.split('|');
      return parts[1]?.trim() || 'Coordinating';
    }
    return cStr;
  };
  
  const assignedCounty = parseCounty(profile?.county);

  // Beneficiary Registration Form Optional States as requested
  const [name, setName] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('+254');
  const [targetCounty, setTargetCounty] = useState(assignedCounty !== 'Unspecified' ? assignedCounty : '');
  
  // Custom demographic/asset attributes (completely customizable and schema-agnostic)
  const [customFields, setCustomFields] = useState<{ label: string, value: string }[]>([
    { label: 'Household Size', value: '1 member(s)' },
    { label: 'Livestock Assets', value: 'None' },
    { label: 'Crop Damage Level', value: 'None' },
    { label: 'Special Needs Status', value: 'No' }
  ]);
  const [newAttrLabel, setNewAttrLabel] = useState('');
  const [newAttrValue, setNewAttrValue] = useState('');

  const updateCustomFieldValue = (index: number, val: string) => {
    const updated = [...customFields];
    updated[index].value = val;
    setCustomFields(updated);
  };

  const updateCustomFieldLabel = (index: number, lbl: string) => {
    const updated = [...customFields];
    updated[index].label = lbl;
    setCustomFields(updated);
  };

  const removeCustomField = (index: number) => {
    setCustomFields(customFields.filter((_, i) => i !== index));
  };

  const addCustomField = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAttrLabel.trim() || !newAttrValue.trim()) return;
    setCustomFields([
      ...customFields,
      { label: newAttrLabel.trim(), value: newAttrValue.trim() }
    ]);
    setNewAttrLabel('');
    setNewAttrValue('');
  };

  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // Community Leader Disaster Alert Form States
  const [disasterType, setDisasterType] = useState('Floods');
  const [communityWardName, setCommunityWardName] = useState('');
  const [familiesHit, setFamiliesHit] = useState('');
  const [lossDescription, setLossDescription] = useState('');
  const [alertUrgency, setAlertUrgency] = useState('Critical');
  const [alertSuccess, setAlertSuccess] = useState<string | null>(null);

  // Volunteer direct County Relief disbursement state
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [disbursementAmount, setDisbursementAmount] = useState('2500');
  const [distributionProgress, setDistributionProgress] = useState<{ text: string; busy: boolean; type?: 'ok' | 'fail' } | null>(null);

  // Search, filter & history states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCounty, setFilterCounty] = useState('All Counties');
  const [selectedVictim, setSelectedVictim] = useState<Profile | null>(null);
  const [searchHistory, setSearchHistory] = useState('');

  // Editing victim profile states
  const [editingVictim, setEditingVictim] = useState<Profile | null>(null);
  const [editName, setEditName] = useState('');
  const [editIdNumber, setEditIdNumber] = useState('');
  const [editPhoneNumber, setEditPhoneNumber] = useState('');
  const [editCounty, setEditCounty] = useState('');
  const [editExtraDetails, setEditExtraDetails] = useState('');
  const [editStatusMsg, setEditStatusMsg] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [saving, setSaving] = useState(false);

  // Theme Variables Alignment
  const containerBg = isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800';
  const headerBg = isDark ? 'bg-slate-900/90 border-slate-800/80 backdrop-blur-md' : 'bg-white border-b border-slate-200';
  const cardBg = isDark ? 'bg-slate-900/40 border border-slate-800/80 backdrop-blur-sm shadow-md' : 'bg-white border border-slate-200 shadow-sm';
  const innerBg = isDark ? 'bg-slate-950/50 border border-slate-800/30' : 'bg-slate-50 border border-slate-100';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const textMuted = isDark ? 'text-slate-500' : 'text-slate-400';
  const borderCol = isDark ? 'border-slate-800/70' : 'border-slate-100';
  const inputBg = isDark ? 'bg-slate-950 border-slate-800 text-white focus:border-red-500' : 'bg-slate-50 border-slate-200 text-slate-950 focus:border-red-500';

  useEffect(() => {
    fetchData();
  }, [user]);

  async function fetchData() {
    setLoading(true);
    await Promise.all([
      fetchVictims(),
      fetchAssignedCases(),
      fetchCampaigns(),
      fetchLedger(),
      fetchDisasterAlerts()
    ]);
    setLoading(false);
  }

  async function fetchVictims() {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'victim')
      .order('created_at', { ascending: false });

    if (data) setVictims(data);
  }

  async function fetchAssignedCases() {
    const { data, error } = await supabase
      .from('triage_sessions')
      .select('*, victim:profiles(*)')
      .eq('volunteer_id', user?.id)
      .neq('status', 'closed');

    if (!error && data) setAssignedCases(data);
  }

  async function fetchCampaigns() {
    const { data } = await supabase
      .from('campaigns')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false });
    if (data) setCampaigns(data);
  }

  async function fetchLedger() {
    const { data } = await supabase
      .from('ledger')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setLedger(data);
  }

  async function fetchDisasterAlerts() {
    const { data } = await supabase
      .from('triage_sessions')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) {
      // Filter out alerts designated as a disaster broadcast
      const alerts = data.filter(d => d.last_message?.startsWith('[DISASTER_ALERT]'));
      setDisasterAlerts(alerts);
    }
  }

  // Beneficiary registration with customized optional fields (household, livestock assets) serialized cleanly
  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);

    // Apply strict sanitation layers to prevent injection or metadata breakouts
    const cleanName = sanitize(name);
    const cleanIdNumber = sanitize(idNumber);
    const cleanPhoneNumber = sanitize(phoneNumber).replace(/\s/g, '');

    const customParts = customFields
      .filter(cf => cf.label.trim() !== '')
      .map(cf => `${sanitize(cf.label)}: ${sanitize(cf.value) || 'None'}`)
      .join(' | ');

    const serializedCounty = sanitize(targetCounty) + (customParts ? ` | ${customParts}` : '');

    const { error } = await supabase.rpc('register_victim', {
      p_full_name: cleanName,
      p_national_id: cleanIdNumber,
      p_phone_number: cleanPhoneNumber,
      p_county: serializedCounty
    });

    if (error) {
      setStatus({ type: 'error', message: error.message });
    } else {
      setStatus({ type: 'success', message: 'Beneficiary registered successfully on the active county directory!' });
      setName('');
      setIdNumber('');
      setPhoneNumber('+254');
      // Reset customFields to default template layouts
      setCustomFields([
        { label: 'Household Size', value: '1 member(s)' },
        { label: 'Livestock Assets', value: 'None' },
        { label: 'Crop Damage Level', value: 'None' },
        { label: 'Special Needs Status', value: 'No' }
      ]);
      fetchVictims();
      setTimeout(() => setStatus(null), 5000);
    }
  }

  // Submit emergency county alert (For Community Leaders)
  async function handlePostAlert(e: React.FormEvent) {
    e.preventDefault();
    setAlertSuccess(null);

    // Apply strict sanitization to prevent potential query hacks and formatting breaks
    const cleanDisasterType = sanitize(disasterType);
    const cleanWardName = sanitize(communityWardName);
    const cleanFamiliesHit = sanitize(familiesHit);
    const cleanLossDetail = sanitize(lossDescription);
    const cleanUrgency = sanitize(alertUrgency);

    const alertMessage = `[DISASTER_ALERT] ${cleanDisasterType} disaster occurred in ${assignedCounty} county (${cleanWardName} area). Urgent relief coordination required. Families affected: ${cleanFamiliesHit || 'Multiple'}. Damage level: ${cleanUrgency}. Details: ${cleanLossDetail}`;

    const { error } = await supabase.from('triage_sessions').upsert({
      victim_id: user?.id || '', // Leader ID
      last_message: alertMessage,
      risk_score: cleanUrgency === 'Critical' ? 0.95 : cleanUrgency === 'High' ? 0.75 : 0.5,
      status: 'open',
      escalated: true,
      notes: `[COMMUNITY LEADER ALERT] Published by local Chief/Leader ${profile?.full_name} for county ${assignedCounty}.`
    }, { onConflict: 'victim_id' });

    if (error) {
      alert("Failed to broadcast alert: " + error.message);
    } else {
      setAlertSuccess(`Emergency Broadcast Transmitted Successfully! Your alert has been disseminated to the Red Cross Admin and all county Volunteers.`);
      setCommunityWardName('');
      setFamiliesHit('');
      setLossDescription('');
      fetchDisasterAlerts();
    }
  }

  // Direct County Relief Disbursement (For Volunteers or Leaders to disburse aid immediately)
  async function handleDirectGroupDisbursal(alertCounty: string) {
    if (!selectedCampaignId) {
      alert("Please select a Campaign pool to draw resources from.");
      return;
    }
    const amt = parseFloat(disbursementAmount);
    if (isNaN(amt) || amt <= 0) {
      alert("Please enter a valid disbursement amount.");
      return;
    }

    setDistributionProgress({ text: `Scanning database for registered victims in ${alertCounty} County...`, busy: true });

    // Find general directory victims matching alertCounty
    const matchedVictims = victims.filter(vk => {
      const vkCounty = vk.county?.split('|')?.[0]?.trim() || '';
      return vkCounty.toLowerCase() === alertCounty.toLowerCase();
    });

    if (matchedVictims.length === 0) {
      setDistributionProgress({ 
        text: `No victims registered in ${alertCounty} County. Please register local victims under this county first to disburse relief.`, 
        busy: false,
        type: 'fail' 
      });
      return;
    }

    setDistributionProgress({ 
      text: `Secured ${matchedVictims.length} victims. Simulating verified SMS vouchers and allocating wallet aids...`, 
      busy: true 
    });

    let successCount = 0;
    try {
      // Direct sequential DB update via micro-ledger loop
      for (const victim of matchedVictims) {
        // Run database disbursement
        const payload = {
          victim_profile_ids: [victim.id],
          disbursement_amount: amt,
          p_campaign_id: selectedCampaignId,
          idempotency_key_prefix: `vol-${Date.now()}-${victim.id}-`
        };

        const { error: dbError } = await supabase.rpc('disburse_aid', payload);
        if (!dbError) {
          successCount++;
          // Simulate Africa's Talking logging
          console.log(`[SMS Notification] Normalized to ${victim.phone_number || 'N/A'}: Sent KES ${amt} voucher allocation code successful.`);
        }
      }

      setDistributionProgress({
        text: `Relief Action Successful! Distributed KES ${amt} to ${successCount} out of ${matchedVictims.length} county victims. SMS logs whitelisted successfully.`,
        busy: false,
        type: 'ok'
      });

      // reload
      fetchData();
    } catch (ex: any) {
      setDistributionProgress({
        text: `Relief error: ${ex.message || ex}`,
        busy: false,
        type: 'fail'
      });
    }
  }

  async function closeCase(sessionId: number) {
    const { error } = await supabase
      .from('triage_sessions')
      .update({ status: 'closed' })
      .eq('id', sessionId);

    if (!error) fetchAssignedCases();
  }

  const startEditing = (v: Profile) => {
    setEditingVictim(v);
    setEditName(v.full_name || '');
    setEditIdNumber(v.national_id || '');
    setEditPhoneNumber(v.phone_number || '');
    
    const parts = v.county?.split('|') || [];
    setEditCounty(parts[0]?.trim() || '');
    setEditExtraDetails(parts.slice(1).map(p => p.trim()).join(' | '));
    setEditStatusMsg(null);
  };

  async function handleUpdateVictim(e: React.FormEvent) {
    e.preventDefault();
    if (!editingVictim) return;
    setSaving(true);
    setEditStatusMsg(null);

    // Repack
    const serializedCounty = editCounty + (editExtraDetails ? ` | ${editExtraDetails}` : '');

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: editName,
        national_id: editIdNumber,
        phone_number: editPhoneNumber,
        county: serializedCounty
      })
      .eq('id', editingVictim.id);

    setSaving(false);
    if (error) {
      setEditStatusMsg({ type: 'error', message: error.message });
    } else {
      setEditStatusMsg({ type: 'success', message: 'Victim profile updated successfully!' });
      fetchVictims();
      setTimeout(() => {
        setEditingVictim(null);
      }, 1200);
    }
  }

  // Helper to parse complex county from directory records
  const renderCountyBadge = (countyStr?: string) => {
    if (!countyStr) return 'N/A';
    const parts = countyStr.split('|');
    return parts[0]?.trim();
  };

  const renderLivestockNotes = (countyStr?: string) => {
    if (!countyStr) return null;
    const parts = countyStr.split('|');
    const note = parts.find(p => p.includes('Livestock:'));
    if (!note) return null;
    return (
      <p className="text-xs font-bold text-slate-500 bg-emerald-500/5 px-2.5 py-1 rounded-lg border border-emerald-500/10 inline-flex items-center gap-1">
        🐄 {note.trim()}
      </p>
    );
  };

  // Switch Theme Action
  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'dark'; // force beautiful slate dark for extreme coordination, or classic toggle
    const currentTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(currentTheme);
    localStorage.setItem('volunteer_theme', currentTheme);
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${containerBg} flex flex-col`}>
      
      {/* Navigation Top Header */}
      <nav className={`${headerBg} px-4 md:px-8 py-4 flex justify-between items-center sticky top-0 z-50`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-200">
            <ClipboardList className="text-white animate-pulse" size={24} />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-black tracking-tight text-red-650 flex items-center gap-1.5 leading-none">
              PortalCoordinator
            </h1>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">
              Kenyan Red Cross Relief Command
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 md:gap-4">
          <span className={`text-[10px] md:text-xs px-3 py-1.5 rounded-xl font-black uppercase tracking-wider ${isDark ? 'bg-slate-900 border border-slate-800 text-red-400' : 'bg-red-50 text-red-650 border border-red-100'} hidden sm:inline-flex items-center gap-1.5`}>
            📅 {new Date().toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
          </span>

          <span className="text-xs px-3.5 py-1.5 rounded-xl font-black uppercase tracking-wider bg-red-600/10 text-red-650 border border-red-500/20 inline-flex items-center gap-1.5">
            👤 {profile?.full_name || 'Responder'} ({isLeader ? '👑 Leader' : '🛡️ Volunteer'}) - {assignedCounty}
          </span>

          {/* Theme Switcher Button */}
          <button
            onClick={toggleTheme}
            className={`p-2.5 rounded-xl border transition-all ${
              isDark 
                ? 'bg-slate-900 border-slate-800 text-amber-400 hover:text-amber-300' 
                : 'bg-white border-slate-200 text-amber-600 hover:text-amber-700 shadow-sm'
            }`}
            title="Toggle Dashboard Tone"
          >
            {isDark ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          <button 
            onClick={signOut} 
            className="flex items-center gap-2 text-slate-600 hover:text-red-650 transition-all font-bold text-xs bg-white hover:bg-red-50 px-3.5 py-2.5 rounded-xl border border-slate-200 hover:border-red-100"
          >
            <LogOut size={15} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8 space-y-8">
        
        {/* Banner Alert for welcome and dynamic greetings */}
        {isLeader ? (
          <div className="bg-gradient-to-r from-red-600 to-red-700 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="z-10 space-y-1">
              <span className="bg-white/20 text-[9px] px-2.5 py-1 rounded-full font-black uppercase tracking-widest">
                Active Ward Dignitary Verified
              </span>
              <h2 className="text-xl md:text-2xl font-black">{getGreetingAndWelcome()}! Welcome Leader {profile?.full_name}</h2>
              <p className="text-sm font-semibold opacity-90 max-w-xl">
                You have active emergency privileges for {assignedCounty} County. Instantly transmit disaster alerts, families hit coordinates, and trigger response funds deployment.
              </p>
            </div>
            <div className="z-10 flex gap-2 w-full sm:w-auto">
              <span className="bg-white/10 text-white px-5 py-3 rounded-xl font-black text-xs border border-white/20 whitespace-nowrap flex items-center gap-1.5 shadow-md">
                🌐 Broadcast System Enabled
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-slate-800 to-slate-900 dark:from-slate-900 dark:to-slate-950 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-slate-700/30 dark:border-slate-800 shadow-2xl">
            <div className="z-10 space-y-1">
              <span className="bg-white/10 text-[9px] px-2.5 py-1 rounded-full font-black uppercase tracking-widest text-slate-300">
                Disaster Volunteer Command
              </span>
              <h2 className="text-xl md:text-2xl font-black">
                {getGreetingAndWelcome()}! Welcome {profile?.full_name}
              </h2>
              <p className="text-sm font-semibold opacity-90 max-w-xl text-slate-300">
                You have active emergency response privileges for {assignedCounty} County. Verify, manage, and coordinate essential humanitarian aid registries.
              </p>
            </div>
          </div>
        )}

        {/* Quick Stats / Tabs - Hidden for Community Leaders */}
        {!isLeader && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <TabButton 
              active={activeTab === 'register'} 
              onClick={() => setActiveTab('register')}
              icon={<UserPlus size={20} />}
              label="Register Beneficiary"
              description="Add localized profiles"
              isDark={isDark}
            />
            <TabButton 
              active={activeTab === 'cases'} 
              onClick={() => setActiveTab('cases')}
              icon={<ShieldAlert size={20} />}
              label="Urgent Cases"
              description={`${assignedCases.length} peer assignments`}
              badge={assignedCases.length > 0 ? assignedCases.length : undefined}
              isDark={isDark}
            />
            <TabButton 
              active={activeTab === 'alerts'} 
              onClick={() => setActiveTab('alerts')}
              icon={<Megaphone size={20} />}
              label="Disaster Alerts"
              description="Broadcasting center"
              badge={disasterAlerts.length > 0 ? disasterAlerts.length : undefined}
              isDark={isDark}
            />
            <TabButton 
              active={activeTab === 'search'} 
              onClick={() => setActiveTab('search')}
              icon={<Search size={20} />}
              label="Search Directory"
              description="Verify verified profiles"
              isDark={isDark}
            />
            <TabButton 
              active={activeTab === 'history'} 
              onClick={() => setActiveTab('history')}
              icon={<Activity size={20} />}
              label="My Registrations"
              description={`${victims.length} records`}
              isDark={isDark}
            />
          </div>
        )}

        <AnimatePresence mode="wait">
          
          {/* REGISTER TAB */}
          {activeTab === 'register' && (
            <motion.div
              key="register"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="max-w-2xl mx-auto w-full"
            >
              <div className={`${cardBg} rounded-3xl overflow-hidden`}>
                <div className={`p-8 border-b ${borderCol} ${isDark ? 'bg-slate-900/50' : 'bg-slate-50/50'}`}>
                  <h2 className={`text-2.5xl font-black ${textPrimary} tracking-tight mb-2 flex items-center gap-2`}>
                    <UserPlus className="text-red-650" size={26} />
                    Beneficiary Registration
                  </h2>
                  <p className={`${textSecondary} font-semibold text-xs`}>
                    Onboard affected individuals in your ward. Input custom demographic variables and dynamic assets tracking to facilitate secure automated SMS cash vouchers.
                  </p>
                </div>

                <form onSubmit={handleRegister} className="p-8 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InputField 
                      label="Beneficiary Full Name" 
                      value={name} 
                      onChange={setName} 
                      placeholder="e.g. Clinton Makau"
                      required
                      isDark={isDark}
                    />
                    <InputField 
                      label="National ID Number (10 Digits)" 
                      value={idNumber} 
                      onChange={setIdNumber} 
                      placeholder="e.g. 30256512"
                      icon={<CreditCard size={18} />}
                      required
                      isDark={isDark}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InputField 
                      label="Phone Line (Formatted Format)" 
                      value={phoneNumber} 
                      onChange={v => {
                        if (v.startsWith('+254') || v === '') setPhoneNumber(v);
                        else if (v.startsWith('254')) setPhoneNumber('+' + v);
                        else if (v.length > 0 && !v.startsWith('+')) setPhoneNumber('+254' + v.replace(/^0/, ''));
                        else setPhoneNumber(v);
                      }} 
                      placeholder="+254711..."
                      icon={<Phone size={18} />}
                      required
                      isDark={isDark}
                    />
                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Target County</label>
                      <div className="relative">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                          type="text"
                          value={targetCounty}
                          onChange={(e) => setTargetCounty(e.target.value)}
                          className={`w-full pl-12 pr-4 py-3 border rounded-xl outline-none focus:ring-1 focus:ring-red-500 font-bold transition-all ${inputBg}`}
                          placeholder="Select Kenyan county..."
                          list="kenyan-counties-volunteer"
                          required
                        />
                      </div>
                      <datalist id="kenyan-counties-volunteer">
                        {KENYAN_COUNTIES.map(c => <option key={c} value={c} />)}
                      </datalist>
                    </div>
                  </div>

                  {/* Dynamic Custom Verification Attributes Builder */}
                  <div className="bg-slate-50 dark:bg-slate-900/40 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-800 space-y-6">
                    <div>
                      <span className="text-xs font-black uppercase tracking-wider text-slate-450 block mb-1 flex items-center gap-1.5">
                        📋 Dynamic Verification Attributes & Dossier Data
                      </span>
                      <p className="text-[10px] text-slate-400 font-bold leading-relaxed mb-4">
                        Add any custom fields or templates required for this beneficiary. You can type any new field headers and values below.
                      </p>
                    </div>

                    {/* Render current list of customized attributes */}
                    <div className="space-y-3">
                      {customFields.map((field, idx) => (
                        <div key={idx} className="flex gap-2 items-center bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-200/50 dark:border-slate-850/60 shadow-sm">
                          <div className="flex-1 grid grid-cols-2 gap-3">
                            <InputField 
                              label={`${idx + 1}. Heading`}
                              value={field.label}
                              onChange={(val) => updateCustomFieldLabel(idx, val)}
                              placeholder="e.g. Household Size"
                              isDark={isDark}
                            />
                            <InputField 
                              label="Data / Value"
                              value={field.value}
                              onChange={(val) => updateCustomFieldValue(idx, val)}
                              placeholder="e.g. 12 members"
                              isDark={isDark}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeCustomField(idx)}
                            className="p-1.5 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg transition-colors cursor-pointer self-end mb-3"
                            title="Remove attribute"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Form to insert a completely blank new custom attribute/heading option */}
                    <div className="pt-4 border-t border-dashed border-slate-200 dark:border-slate-800 space-y-4">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        🛡️ Create Custom Attribute heading
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <InputField 
                          label="New Heading Title"
                          value={newAttrLabel}
                          onChange={setNewAttrLabel}
                          placeholder="e.g. Fishing Equipment"
                          isDark={isDark}
                        />
                        <InputField 
                          label="New Data Value"
                          value={newAttrValue}
                          onChange={setNewAttrValue}
                          placeholder="e.g. 3 Nets, 1 Canoe"
                          isDark={isDark}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          if (!newAttrLabel.trim() || !newAttrValue.trim()) return;
                          setCustomFields([
                            ...customFields,
                            { label: newAttrLabel.trim(), value: newAttrValue.trim() }
                          ]);
                          setNewAttrLabel('');
                          setNewAttrValue('');
                        }}
                        className="w-full bg-slate-100 hover:bg-neutral-200 dark:bg-slate-800 dark:hover:bg-slate-755 font-black text-[10px] text-slate-650 dark:text-slate-200 tracking-wider py-3.5 rounded-xl transition-all uppercase border border-slate-200 dark:border-slate-800 cursor-pointer text-center"
                      >
                        + Insert custom heading & details to Dossier
                      </button>
                    </div>
                  </div>

                  {status && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`p-4 rounded-2xl text-xs font-black flex items-center gap-3 border ${
                        status.type === 'success' ? 'bg-green-50 text-green-700 border-green-150' : 'bg-red-50 text-red-700 border-red-150'
                      }`}
                    >
                      {status.type === 'success' ? <CheckCircle2 className="text-green-600" size={20} /> : <AlertCircle className="text-red-650" size={20} />}
                      {status.message}
                    </motion.div>
                  )}

                  <button 
                    type="submit" 
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-red-200 flex items-center justify-center gap-2 group cursor-pointer"
                  >
                    <Plus size={20} className="group-hover:rotate-90 transition-transform" />
                    Complete Victim Verification Registration
                  </button>
                </form>
              </div>
            </motion.div>
          )}

          {/* URGENT PEER CASES TAB */}
          {activeTab === 'cases' && (
            <motion.div
              key="cases"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-center">
                <div>
                  <h2 className={`text-2xl font-black ${textPrimary}`}>Staff Peer Safety Support Requests</h2>
                  <p className={`${textSecondary} text-xs font-bold mt-1`}>Urgent traumatic stress triggers allocated to you based on physical county proximity. Coordinate immediate lifesaving welfare checks.</p>
                </div>
              </div>

              {assignedCases.length === 0 ? (
                <div className={`${cardBg} p-12 text-center space-y-4`}>
                  <div className={`w-16 h-16 ${innerBg} rounded-2xl flex items-center justify-center mx-auto`}>
                    <Heart className="text-red-500 animate-pulse" size={32} />
                  </div>
                  <h3 className={`text-lg font-black ${textPrimary}`}>No Active Peer Assistance Assigned</h3>
                  <p className={`${textSecondary} max-w-sm mx-auto text-xs font-medium`}>You or your regional coworkers are holding up strong. Ensure you maintain healthy shifts during disaster mitigation ops.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {assignedCases.map(c => (
                    <motion.div 
                      key={c.id} 
                      className={`${cardBg} p-6 rounded-3xl border-2 border-red-500/20 space-y-6 hover:shadow-lg transition-all relative overflow-hidden`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center font-black text-red-600">
                            {c.victim?.full_name?.[0]?.toUpperCase() || 'P'}
                          </div>
                          <div>
                            <h3 className={`font-black ${textPrimary}`}>{c.victim?.full_name}</h3>
                            <p className="text-xs text-slate-400 font-extrabold">{c.victim?.phone_number || 'N/A'}</p>
                          </div>
                        </div>
                        <span className="bg-red-600 text-white text-[9px] px-2.5 py-1 rounded-full font-black uppercase tracking-wider animate-pulse">
                          CRITICAL PEER CALL
                        </span>
                      </div>

                      <div className={`${innerBg} p-4 rounded-xl text-xs space-y-2`}>
                        <p className="font-extrabold text-red-500 flex items-center gap-1"><ShieldAlert size={12}/> Traumatic Event Logs:</p>
                        <p className="italic text-slate-500 font-medium">"{c.last_message}"</p>
                      </div>

                      <div className="pt-2 border-t border-slate-100/50 flex gap-2">
                        <button 
                          onClick={() => closeCase(c.id)}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1"
                        >
                          <CheckCircle2 size={14} /> Resolve & Log Safe
                        </button>
                        <a 
                          href={`tel:${c.victim?.phone_number}`}
                          className="px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center rounded-xl border border-slate-200 transition-all font-black text-xs"
                        >
                          Call Peer
                        </a>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* DISASTER BROADCAST ALERTS TAB */}
          {activeTab === 'alerts' && (
            <motion.div
              key="alerts"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
              
              {/* Leader dispatch center left */}
              <div className="lg:col-span-1 space-y-6">
                <div className={`${cardBg} p-6 rounded-3xl space-y-4`}>
                  <div>
                    <h3 className={`text-xl font-black ${textPrimary} flex items-center gap-1.5`}>
                      <ShieldAlert className="text-red-650" size={22} />
                      Emergency Dispatch Control
                    </h3>
                    <p className={`${textSecondary} text-xs font-bold mt-1`}>
                      Transmit real-time disaster alerts targeting Red Cross response logistics in your local ward coordinates.
                    </p>
                  </div>

                  {isLeader ? (
                    <form onSubmit={handlePostAlert} className="space-y-4 pt-2">
                      <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Disaster Incident Category</label>
                        <select 
                          value={disasterType} 
                          onChange={e => setDisasterType(e.target.value)}
                          className={`w-full px-4 py-3 border rounded-xl outline-none focus:ring-1 focus:ring-red-500 font-bold transition-all text-xs ${inputBg}`}
                        >
                          <option value="Floods">Floods (Heavy Rains)</option>
                          <option value="Drought">Drought & Famine</option>
                          <option value="Fire Outbreak">Fire Outbreak</option>
                          <option value="Landslide">Landslide / Mudslide</option>
                          <option value="Livestock Disease">Livestock Disease Emergency</option>
                        </select>
                      </div>

                      <InputField 
                        label="Specific Area / Ward Name" 
                        value={communityWardName} 
                        onChange={setCommunityWardName} 
                        placeholder="e.g. Dadaab Sector B"
                        required
                        isDark={isDark}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <InputField 
                          label="Estimated Families Hit" 
                          value={familiesHit} 
                          onChange={setFamiliesHit} 
                          placeholder="e.g. 150"
                          type="number"
                          required
                          isDark={isDark}
                        />
                        <div>
                          <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Urgency Level</label>
                          <select 
                            value={alertUrgency} 
                            onChange={e => setAlertUrgency(e.target.value)}
                            className={`w-full px-4 py-3 border rounded-xl outline-none focus:ring-1 focus:ring-red-500 font-bold transition-all text-xs ${inputBg}`}
                          >
                            <option value="Critical">Critical (Immediate Rescue Needed)</option>
                            <option value="High">High (Food & Cash Disbursements Required)</option>
                            <option value="Moderate">Moderate (Welfare assessment)</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Impact Description & Livestock Loss</label>
                        <textarea
                          value={lossDescription}
                          onChange={e => setLossDescription(e.target.value)}
                          placeholder="Provide details of any submerged assets, washed away goats, families without shelter..."
                          className={`w-full p-4 border rounded-xl outline-none focus:ring-1 focus:ring-red-500 font-bold transition-all text-xs h-28 resize-none ${inputBg}`}
                          required
                        />
                      </div>

                      {alertSuccess && (
                        <div className="p-3 bg-green-50 text-green-700 font-bold text-xs rounded-xl border border-green-150">
                          {alertSuccess}
                        </div>
                      )}

                      <button 
                        type="submit"
                        className="w-full bg-red-650 hover:bg-red-700 text-white font-black py-3 rounded-xl text-xs transition-all shadow-md shadow-red-100 flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Megaphone size={14} /> Transmit Emergency Broadcast 🚨
                      </button>
                    </form>
                  ) : (
                    <div className="p-4 bg-orange-50 text-orange-850 font-bold text-xs rounded-xl border border-orange-150 leading-relaxed">
                      Only verified Community Leaders are authorized to transmit initial state emergency broadcasts. If you are a Local Chief, please submit a verification request during registration. Log into dashboard directory on right to view available alerts.
                    </div>
                  )}
                </div>
              </div>

              {/* Alert directory and coordination list right */}
              <div className="lg:col-span-2 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className={`text-xl font-black ${textPrimary}`}>Active Emergency Alerts Directory</h3>
                  <span className="bg-red-100 text-red-600 font-black text-[10px] px-3 py-1 rounded-full uppercase tracking-wider animate-pulse">
                    Kenya-Wide Channels Live
                  </span>
                </div>

                {disasterAlerts.length === 0 ? (
                  <div className={`${cardBg} p-12 text-center space-y-4`}>
                    <RefreshCw className="animate-spin text-red-600 mx-auto" size={24} />
                    <p className={`${textSecondary} text-xs font-bold`}>Listening for disaster broadcasts...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {disasterAlerts.map(alert => {
                      // Extract county name from alert notes or message
                      const matches = alert.last_message?.match(/occurred in (\w+)\s/);
                      const alertCounty = matches ? matches[1] : assignedCounty;
                      const formattedMessage = alert.last_message?.replace('[DISASTER_ALERT]', '').trim();

                      return (
                        <div key={alert.id} className={`${cardBg} p-6 rounded-3xl space-y-4 relative overflow-hidden border-l-4 border-l-red-650`}>
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                            <div className="flex items-center gap-2">
                              <span className="bg-red-600 text-white text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                                Active Broadcast
                              </span>
                              <span className="text-sm font-black text-slate-800 flex items-center gap-1">
                                <MapPin size={13} className="text-red-500" /> {alertCounty} County Alert
                              </span>
                            </div>
                            <span className="text-[10px] font-black text-slate-400">
                              {new Date(alert.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          <p className="text-xs font-bold leading-relaxed text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-100">
                            {formattedMessage}
                          </p>

                          {/* Volunteers Action Box: Trigger and execute disbursement to matched victims */}
                          {!isLeader && (
                            <div className="bg-amber-500/5 p-4 rounded-2xl border border-amber-500/20 space-y-4">
                            <div className="flex items-center gap-2">
                              <DollarSign className="text-amber-600" size={18} />
                              <div>
                                <h4 className="text-xs font-black text-amber-600 uppercase tracking-wider">County Response Action Room</h4>
                                <p className="text-[10px] text-slate-400 font-bold mt-0.5">Volunteers can directly disburse aid pools to victims in {alertCounty}.</p>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <div>
                                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Select Aid Campaign Pool</label>
                                <select 
                                  value={selectedCampaignId} 
                                  onChange={e => setSelectedCampaignId(e.target.value)}
                                  className={`w-full px-2.5 py-2 border rounded-lg outline-none focus:ring-1 focus:ring-red-500 font-bold text-[10px] ${inputBg}`}
                                >
                                  <option value="">-- Choose Pool --</option>
                                  {campaigns.map(c => (
                                    <option key={c.id} value={c.id}>{c.name} (Active)</option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Relief Voucher Amount (KES)</label>
                                <input 
                                  type="number"
                                  value={disbursementAmount}
                                  onChange={e => setDisbursementAmount(e.target.value)}
                                  className={`w-full px-2.5 py-2 border rounded-lg outline-none focus:ring-1 focus:ring-red-500 font-bold text-[10px] ${inputBg}`}
                                  placeholder="2500"
                                />
                              </div>

                              <div className="flex items-end">
                                <button
                                  type="button"
                                  onClick={() => handleDirectGroupDisbursal(alertCounty)}
                                  className="w-full bg-green-650 hover:bg-green-700 text-white text-[10px] py-2.5 rounded-lg transition-all font-black uppercase tracking-wider cursor-pointer"
                                  disabled={distributionProgress?.busy}
                                >
                                  Deploy Relief Funds 💵
                                </button>
                              </div>
                            </div>

                            {distributionProgress && (
                              <div className={`p-3 mt-2 rounded-xl text-[10px] font-bold border ${
                                distributionProgress.type === 'ok' ? 'bg-green-50 text-green-700 border-green-150' : 
                                distributionProgress.type === 'fail' ? 'bg-red-50 text-red-700 border-red-150' : 'bg-amber-50 text-amber-700 border-amber-150'
                              }`}>
                                {distributionProgress.text}
                              </div>
                            )}
                          </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* SEARCH DIRECTORY */}
          {activeTab === 'search' && (
            <motion.div
              key="search"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              <div className={`${cardBg} p-6 md:p-8 rounded-3xl space-y-6`}>
                <div>
                  <h2 className={`text-2xl font-black ${textPrimary} tracking-tight`}>Beneficiary Credentials Registry</h2>
                  <p className={`${textSecondary} text-xs font-bold mt-1`}>Search and inspect active beneficiary profiles, verify phone whitelisting format, and livestock coordinate statistics.</p>
                </div>

                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text" 
                      placeholder="Search by full name, ID, or phone number..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className={`w-full pl-12 pr-4 py-3 border rounded-xl outline-none focus:ring-1 focus:ring-red-500 font-bold transition-all text-sm ${inputBg}`}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest hidden sm:inline">Filter County</span>
                    <select
                      value={filterCounty}
                      onChange={e => setFilterCounty(e.target.value)}
                      className={`px-4 py-3 border rounded-xl font-bold text-xs outline-none focus:ring-1 focus:ring-red-500 ${inputBg}`}
                    >
                      <option value="All Counties">All Counties</option>
                      {KENYAN_COUNTIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {(() => {
                    let filtered = victims;
                    if (filterCounty !== 'All Counties') {
                      filtered = filtered.filter(v => {
                        const vCounty = v.county?.split('|')?.[0]?.trim() || '';
                        return vCounty.toLowerCase() === filterCounty.toLowerCase();
                      });
                    }
                    if (searchQuery.trim()) {
                      const q = searchQuery.toLowerCase();
                      filtered = filtered.filter(v => 
                        (v.full_name || '').toLowerCase().includes(q) ||
                        (v.national_id || '').toLowerCase().includes(q) ||
                        (v.phone_number || '').toLowerCase().includes(q)
                      );
                    }

                    if (filtered.length === 0) {
                      return (
                        <div className="col-span-full py-12 text-center text-slate-400 font-bold bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                          No victim matching searches.
                        </div>
                      );
                    }

                    return filtered.map(v => (
                      <motion.div
                        layout
                        key={v.id}
                        className={`${cardBg} p-6 rounded-3xl space-y-4 relative group`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-red-50 text-red-650 rounded-lg flex items-center justify-center font-black">
                              {v.full_name?.[0]?.toUpperCase()}
                            </div>
                            <div>
                              <h4 className="font-black text-slate-900 group-hover:text-red-600 transition-colors">{v.full_name}</h4>
                              <p className="text-xs font-bold text-slate-400 flex items-center gap-1">
                                <MapPin size={11} /> {renderCountyBadge(v.county)}
                              </p>
                            </div>
                          </div>
                          <span className="bg-green-50 text-green-700 border border-green-150 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider">
                            Verified
                          </span>
                        </div>

                        {renderLivestockNotes(v.county)}

                        <div className="border-t border-slate-150/50 pt-3 space-y-2 text-xs">
                          <div className="flex justify-between font-bold">
                            <span className="text-slate-400">ID Card:</span>
                            <span className="text-slate-800 font-mono">{v.national_id || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between font-bold">
                            <span className="text-slate-400">Mobile:</span>
                            <span className="text-slate-800">{v.phone_number || 'N/A'}</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setSelectedVictim(v)}
                          className="w-full bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-600 font-black py-2.5 rounded-xl transition-all text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <FileText size={13} /> View Full Dossier Card
                        </button>
                      </motion.div>
                    ));
                  })()}
                </div>
              </div>
            </motion.div>
          )}

          {/* MY REGISTRATIONS / HISTORICAL IMPACT TAB */}
          {activeTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              
              {/* Volunteer Aid Impact Summary Card */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className={`${cardBg} p-6 rounded-3xl flex items-center gap-4`}>
                  <div className="w-12 h-12 bg-red-50 text-red-650 rounded-2xl flex items-center justify-center font-black">
                    <UserPlus size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Registered Beneficiaries</p>
                    <p className="text-2xl font-black text-slate-900">{victims.length} Profiles</p>
                  </div>
                </div>

                <div className={`${cardBg} p-6 rounded-3xl flex items-center gap-4`}>
                  <div className="w-12 h-12 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center font-black">
                    <DollarSign size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Active Campaign Pools</p>
                    <p className="text-2xl font-black text-slate-900">{campaigns.length} Pools</p>
                  </div>
                </div>

                <div className={`${cardBg} p-6 rounded-3xl flex items-center gap-4`}>
                  <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center font-black">
                    <CheckCircle2 size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Aids Coordination</p>
                    <p className="text-2xl font-black text-slate-900">Kenya Active</p>
                  </div>
                </div>
              </div>

              <div className={`${cardBg} rounded-3xl overflow-hidden`}>
                <div className="p-6 border-b border-slate-150/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h3 className="text-lg font-black text-slate-900">Recent Onboarded Beneficiaries Directory</h3>
                    <p className="text-xs text-slate-450 font-bold mt-0.5">Physical records managed and registered under your direct coordination.</p>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                      type="text" 
                      placeholder="Filter records..."
                      value={searchHistory}
                      onChange={e => setSearchHistory(e.target.value)}
                      className={`pl-9 pr-4 py-2 border rounded-xl text-xs font-bold outline-none focus:ring-1 focus:ring-red-500 w-full sm:w-56 ${inputBg}`}
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left font-bold text-xs">
                    <thead className={`uppercase tracking-widest text-[9px] border-b ${isDark ? 'bg-slate-950/60 text-slate-400 border-slate-800' : 'bg-slate-50 text-slate-500 border-slate-150/50'}`}>
                      <tr>
                        <th className="px-6 py-4">Beneficiary Full Name</th>
                        <th className="px-6 py-4">National ID</th>
                        <th className="px-6 py-4">Target County</th>
                        <th className="px-6 py-4">Contact Phone</th>
                        <th className="px-6 py-4">Created Time</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-105'}`}>
                      {loading ? (
                        <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-bold">Refetching index...</td></tr>
                      ) : victims.length === 0 ? (
                        <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-bold">No victims registered yet.</td></tr>
                      ) : (() => {
                        const filtered = victims.filter(v => 
                          (v.full_name?.toLowerCase() || '').includes(searchHistory.toLowerCase()) ||
                          (v.national_id?.toLowerCase() || '').includes(searchHistory.toLowerCase()) ||
                          (v.county?.toLowerCase() || '').includes(searchHistory.toLowerCase())
                        );
                        if (filtered.length === 0) {
                          return <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-bold">No results matching filters.</td></tr>;
                        }
                        return filtered.map(v => (
                          <tr key={v.id} className={`hover:bg-slate-50 dark:hover:bg-slate-900/40 border-b ${isDark ? 'border-slate-800/50' : 'border-slate-100'} transition-colors`}>
                            <td className="px-6 py-4">
                              <span className={`font-extrabold ${isDark ? 'text-white' : 'text-slate-900'}`}>{v.full_name}</span>
                            </td>
                            <td className={`px-6 py-4 font-mono ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>{v.national_id}</td>
                            <td className="px-6 py-4">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] uppercase font-black tracking-wider ${isDark ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-600'}`}>
                                {renderCountyBadge(v.county)}
                              </span>
                            </td>
                            <td className={`px-6 py-4 ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>{v.phone_number || 'N/A'}</td>
                            <td className="px-6 py-4 text-slate-400 font-medium">
                              {new Date(v.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex gap-2 justify-end">
                                <button
                                  onClick={() => setSelectedVictim(v)}
                                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black tracking-wider transition-all cursor-pointer ${isDark ? 'bg-red-950/40 hover:bg-red-900 text-red-500 border border-red-500/10' : 'bg-red-50 hover:bg-red-100 text-red-650'}`}
                                  title="View Full Verified Dossier and Aid History"
                                >
                                  View Dossier & History
                                </button>
                                <button
                                  onClick={() => startEditing(v)}
                                  className={`px-3 py-1.5 border rounded-lg text-[10px] font-black tracking-wider transition-all cursor-pointer ${isDark ? 'bg-slate-900 hover:bg-slate-850 border-slate-800 text-slate-200' : 'bg-slate-100 hover:bg-neutral-200 border-slate-200 text-slate-600'}`}
                                >
                                  Edit Profiles
                                </button>
                              </div>
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* EDIT VICTIM PROFILES MODAL */}
      <AnimatePresence>
        {editingVictim && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`${isDark ? 'bg-slate-905 bg-slate-900 border border-slate-800 text-white shadow-2xl' : 'bg-white border border-slate-200 shadow-2xl'} w-full max-w-lg rounded-3xl overflow-hidden`}
            >
              <div className={`p-6 border-b flex justify-between items-center ${isDark ? 'border-slate-800 bg-slate-950/70' : 'border-slate-100 bg-slate-50/50'}`}>
                <div>
                  <h3 className={`text-lg font-black ${textPrimary}`}>Edit Victim Coordinate Profile</h3>
                  <p className="text-xs text-slate-400 font-bold">Modify onboarded candidate data</p>
                </div>
                <button 
                  onClick={() => setEditingVictim(null)} 
                  className={`p-1 border rounded-lg transition-colors cursor-pointer ${isDark ? 'border-slate-800 hover:bg-slate-800 text-slate-350' : 'border-slate-200 hover:bg-slate-100 text-slate-705'}`}
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleUpdateVictim} className="p-6 space-y-4">
                <InputField 
                  label="Victim Name" 
                  value={editName} 
                  onChange={setEditName} 
                  placeholder="Full name" 
                  required
                  isDark={isDark}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <InputField 
                    label="National ID" 
                    value={editIdNumber} 
                    onChange={setEditIdNumber} 
                    placeholder="ID card" 
                    required
                    isDark={isDark}
                  />
                  <InputField 
                    label="Phone Number" 
                    value={editPhoneNumber} 
                    onChange={setEditPhoneNumber} 
                    placeholder="+254" 
                    required
                    isDark={isDark}
                  />
                </div>

                <InputField 
                  label="County" 
                  value={editCounty} 
                  onChange={setEditCounty} 
                  placeholder="County name" 
                  required
                  isDark={isDark}
                />

                <div className="space-y-1.5">
                  <label className={`block text-xs font-black ${textSecondary} uppercase tracking-widest`}>
                    📋 Demographic & Asset Details
                  </label>
                  <p className="text-[10px] text-slate-400 font-semibold leading-normal pb-0.5 animate-pulse">
                    Pipeline (|) separated Key: Value properties (e.g. Household Size: 5 | Livestock Assets: 12 Goats)
                  </p>
                  <textarea
                    value={editExtraDetails}
                    onChange={e => setEditExtraDetails(e.target.value)}
                    rows={3}
                    placeholder="e.g. Household Size: 5 | Livestock Assets: 10 Goats | Crop Damage: None"
                    className={`w-full px-4 py-3 border rounded-xl outline-none focus:ring-1 focus:ring-red-500 font-bold text-xs transition-all leading-relaxed ${isDark ? 'bg-slate-950 border-slate-800 text-white placeholder:text-slate-700' : 'bg-slate-50 border-slate-200 text-slate-950 placeholder:text-slate-400'}`}
                  />
                </div>

                {editStatusMsg && (
                  <div className={`p-4 rounded-xl text-xs font-black border ${
                    editStatusMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-750'
                  }`}>
                    {editStatusMsg.message}
                  </div>
                )}

                <div className={`flex gap-2 justify-end pt-4 border-t ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                  <button 
                    type="button" 
                    onClick={() => setEditingVictim(null)} 
                    className={`px-4 py-2 text-xs font-black rounded-lg transition-colors cursor-pointer ${isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-650'}`}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="px-5 py-2 bg-red-600 font-black text-xs text-white rounded-lg shadow cursor-pointer hover:bg-red-750 transition-colors"
                  >
                    Save Update
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SELECTED VICTIM DOSSIER MODAL */}
      <AnimatePresence>
        {selectedVictim && (() => {
          // Helper to parse optional demographic fields safely
          const parseAllDemographics = (countyStr?: string) => {
            if (!countyStr) return [];
            const parts = countyStr.split('|');
            if (parts.length <= 1) return [];
            
            const pairs: { label: string, value: string }[] = [];
            for (let i = 1; i < parts.length; i++) {
              const part = parts[i].trim();
              if (!part) continue;
              const colonIdx = part.indexOf(':');
              if (colonIdx !== -1) {
                const k = part.substring(0, colonIdx).trim();
                const v = part.substring(colonIdx + 1).trim();
                pairs.push({ label: k, value: v });
              } else {
                pairs.push({ label: 'Details', value: part });
              }
            }
            return pairs;
          };

          const dynamicDemographics = parseAllDemographics(selectedVictim.county);

          // Filter matching ledger allocations for the beneficiary to construct live relief history
          const matchingHistory = ledger.filter(item => {
            return (
              item.profile_id === selectedVictim.id ||
              (selectedVictim.national_id && item.description?.includes(selectedVictim.national_id)) ||
              (selectedVictim.phone_number && item.description?.includes(selectedVictim.phone_number)) ||
              (selectedVictim.full_name && item.description?.includes(selectedVictim.full_name))
            );
          });

          return (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className={`${isDark ? 'bg-slate-900 border border-slate-800' : 'bg-white'} w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col`}
              >
                {/* Header */}
                <div className={`p-6 border-b ${isDark ? 'border-slate-800 bg-slate-950/70' : 'border-slate-100 bg-slate-50/70'} flex justify-between items-center`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-650 rounded-xl flex items-center justify-center text-white font-extrabold shadow-lg shadow-red-500/20">
                      ❤️
                    </div>
                    <div>
                      <h3 className={`text-base font-black ${textPrimary} uppercase tracking-wider`}>Beneficiary Verification Record Card</h3>
                      <p className="text-[10px] text-green-700 bg-green-500/10 border border-green-500/20 rounded-full px-2.5 py-0.5 mt-0.5 inline-block font-black uppercase tracking-widest animate-pulse">
                        ● Direct Mobile Cash Approved
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedVictim(null)} 
                    className={`p-2 border rounded-xl hover:bg-red-500 hover:text-white transition-all cursor-pointer ${isDark ? 'border-slate-850 hover:border-red-500' : 'border-slate-205'}`}
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Content columns */}
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto max-h-[70vh]">
                  
                  {/* Left Column: Demographics & Assets */}
                  <div className="space-y-4">
                    <div className={`p-4 rounded-2xl flex items-center gap-4 ${isDark ? 'bg-slate-950/65 border border-slate-850' : 'bg-slate-50 border border-slate-100'}`}>
                      <div className="w-12 h-12 bg-red-600 text-white rounded-xl flex items-center justify-center font-black text-lg">
                        {selectedVictim.full_name?.[0]?.toUpperCase() || 'B'}
                      </div>
                      <div>
                        <h4 className={`text-sm font-black ${textPrimary}`}>{selectedVictim.full_name}</h4>
                        <p className={`text-xs ${textSecondary} font-semibold`}>Registered on {new Date(selectedVictim.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>

                    <h5 className={`text-xs font-black uppercase tracking-wider ${textSecondary} border-b pb-1.5`}>Demographic Attributes</h5>
                    
                    <div className="space-y-2 text-xs font-bold leading-6">
                      <div className={`flex justify-between p-2.5 rounded-xl ${isDark ? 'bg-slate-950/30' : 'bg-slate-50'}`}>
                        <span className="text-slate-500 dark:text-slate-400">National ID Card:</span>
                        <span className={`${textPrimary} font-mono`}>{selectedVictim.national_id || 'N/A'}</span>
                      </div>
                      <div className={`flex justify-between p-2.5 rounded-xl ${isDark ? 'bg-slate-950/30' : 'bg-slate-50'}`}>
                        <span className="text-slate-500 dark:text-slate-400">Mobile Phone:</span>
                        <span className={textPrimary}>{selectedVictim.phone_number || 'N/A'}</span>
                      </div>
                      <div className={`flex justify-between p-2.5 rounded-xl ${isDark ? 'bg-slate-950/30' : 'bg-slate-50'}`}>
                        <span className="text-slate-500 dark:text-slate-400">Target County:</span>
                        <span className="text-red-500">{renderCountyBadge(selectedVictim.county)}</span>
                      </div>

                      {dynamicDemographics.map((df, dfIdx) => {
                        const isLivestock = df.label.toLowerCase().includes('livestock');
                        const isSpecial = df.label.toLowerCase().includes('special');
                        const isCrop = df.label.toLowerCase().includes('crop');

                        let cardStyle = `${isDark ? 'bg-slate-950/30 border border-slate-850/40' : 'bg-slate-50 border border-slate-200/50'}`;
                        if (isLivestock) {
                          cardStyle = `${isDark ? 'bg-slate-950/35 border border-slate-870' : 'bg-emerald-550/5 bg-emerald-50 border border-emerald-500/15'}`;
                        } else if (isSpecial) {
                          cardStyle = `${isDark ? 'bg-red-500/5 border border-red-500/10' : 'bg-red-50 border border-red-500/15'}`;
                        } else if (isCrop) {
                          cardStyle = `${isDark ? 'bg-amber-500/5 border border-amber-500/10' : 'bg-amber-50 border border-amber-500/15'}`;
                        }

                        return (
                          <div key={dfIdx} className={`flex justify-between p-2.5 rounded-xl flex-col gap-1 ${cardStyle}`}>
                            <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider flex items-center gap-1 pl-1">
                              {isLivestock && '🐄'}
                              {isSpecial && '❤️'}
                              {isCrop && '🌾'}
                              {!isLivestock && !isSpecial && !isCrop && '⚡'}
                              {df.label}:
                            </span>
                            <span className={`${isSpecial ? 'text-red-700 dark:text-red-400' : isLivestock ? 'text-emerald-700 dark:text-emerald-400' : isCrop ? 'text-amber-700 dark:text-amber-400' : textPrimary} italic font-bold`}>
                              {df.value}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right Column: Interactive Aid History Received */}
                  <div className="flex flex-col space-y-4">
                    <h5 className={`text-xs font-black uppercase tracking-wider ${textSecondary} border-b pb-1.5 flex justify-between items-center`}>
                      <span>🎁 Disbursement & Aid History</span>
                      <span className="bg-red-50 text-red-700 px-2 py-0.5 rounded-full text-[9px] font-black">{matchingHistory.length} Allocations</span>
                    </h5>

                    {matchingHistory.length === 0 ? (
                      <div className={`flex-1 p-6 rounded-3xl border border-dashed flex flex-col justify-center items-center text-center space-y-3 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                        <span className="text-2xl">🌱</span>
                        <div>
                          <h6 className={`text-xs font-black ${textPrimary}`}>No Prior Aid Disbursements</h6>
                          <p className={`text-[10px] ${textMuted} font-bold max-w-xs mt-1 leading-normal`}>
                            This beneficiary has newly completed screening. Use the 'County Relief Campaign' module to trigger secure automated wallet payouts!
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3 overflow-y-auto max-h-[380px] pr-1">
                        {matchingHistory.map((entry, idx) => (
                          <div 
                            key={entry.id || idx} 
                            className={`p-3.5 rounded-2xl border transition-all hover:scale-[1.01] hover:shadow-md ${
                              isDark 
                                ? 'bg-slate-950/45 border-slate-800/80 hover:border-slate-700' 
                                : 'bg-slate-50 border-slate-150 shadow-xs hover:bg-slate-100/50'
                            }`}
                          >
                            <div className="flex justify-between items-center mb-1.5">
                              <span className="bg-green-500/10 text-green-600 dark:text-green-450 border border-green-500/20 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest">
                                {entry.transaction_type}
                              </span>
                              <span className={`text-[9px] ${textMuted} font-black font-mono`}>
                                {new Date(entry.created_at || Date.now()).toLocaleDateString() || 'N/A'}
                              </span>
                            </div>

                            <p className={`text-xs font-black ${textPrimary} mb-1 flex justify-between items-center`}>
                              <span>{entry.description || 'Campaign Allocation'}</span>
                              <span className="text-emerald-600 dark:text-emerald-450 font-black font-mono text-xs">
                                KES {Math.abs(entry.amount || 0).toLocaleString()}
                              </span>
                            </p>

                            <div className="flex items-center gap-1.5 text-[10px] text-slate-450 mt-1.5 bg-slate-500/5 p-1.5 rounded-lg">
                              <span className="font-extrabold uppercase tracking-wider text-[9px] text-red-650">Emergency Reason & Campaign:</span>
                              <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                                {entry.description || 'Direct cash relief allocation for emergency livelihood and stability'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>

                {/* Confirm Action Button */}
                <div className={`p-4 ${isDark ? 'bg-slate-950/80 border-t border-slate-850' : 'bg-slate-50 border-t border-slate-150'} flex justify-end`}>
                  <button 
                    onClick={() => setSelectedVictim(null)}
                    className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl text-xs transition-all shadow-md shadow-red-500/20 cursor-pointer"
                  >
                    Confirm & Standardize Dossier Record
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* Staff Caring Psychological Support Floating Widget */}
      <PFABuddyChat isDark={isDark} />
    </div>
  );
}

function TabButton({ active, onClick, icon, label, description, badge, isDark }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, description: string, badge?: number, isDark?: boolean }) {
  const inactiveBg = isDark ? 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-900/80 hover:text-white' : 'bg-white border-slate-200 hover:border-slate-350 shadow-sm';
  const activeBg = isDark ? 'bg-slate-900 border-red-500/30' : 'bg-white border-red-200 shadow-md ring-1 ring-red-100';

  return (
    <button 
      onClick={onClick}
      className={`p-4 rounded-3xl border text-left transition-all relative group overflow-hidden cursor-pointer ${
        active ? activeBg : inactiveBg
      }`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-all ${
        active ? 'bg-red-600 text-white rotate-2 shadow-md' : 'bg-slate-100 text-slate-400 group-hover:scale-105'
      }`}>
        {icon}
      </div>
      <h3 className={`font-black tracking-tight text-xs mb-0.5 ${active ? 'text-red-650' : 'text-slate-800'}`}>{label}</h3>
      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold opacity-85 leading-tight">{description}</p>
      
      {badge && (
        <span className="absolute top-4 right-4 bg-red-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full animate-bounce">
          {badge}
        </span>
      )}

      {active && (
        <motion.div 
          layoutId="active-tab-indicator-vol"
          className="absolute bottom-0 left-0 right-0 h-1 bg-red-600"
        />
      )}
    </button>
  );
}

function InputField({ label, value, onChange, placeholder, icon, type = 'text', required = false, isDark }: { label: string, value: string, onChange: (v: string) => void, placeholder?: string, icon?: React.ReactNode, type?: string, required?: boolean, isDark?: boolean }) {
  const bgStyle = isDark ? 'bg-slate-950 border-slate-800 text-white placeholder:text-slate-700' : 'bg-slate-50 border-slate-200 text-slate-950 placeholder:text-slate-400';
  return (
    <div>
      <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">{label}</label>
      <div className="relative">
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            {icon}
          </div>
        )}
        <input
          type={type}
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full ${icon ? 'pl-11' : 'px-4'} pr-4 py-2.5 border rounded-xl outline-none focus:ring-1 focus:ring-red-500 font-bold text-xs transition-all ${bgStyle}`}
          placeholder={placeholder}
        />
      </div>
    </div>
  );
}
