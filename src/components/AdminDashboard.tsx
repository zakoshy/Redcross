import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Profile, UserRole, Campaign, TriageSession, LedgerEntry } from '../types';
import { KENYAN_COUNTIES } from '../constants';
import { 
  Shield, UserPlus, Users, Store, LogOut, PlusCircle, Megaphone, 
  Send, CheckCircle2, Wallet, LayoutDashboard, MessageSquareWarning, 
  TrendingUp, Activity, AlertTriangle, UserCheck, Search, Filter,
  Eye, EyeOff, Trash2, Edit, Save, X, Phone as PhoneIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type Tab = 'analytics' | 'users' | 'campaigns' | 'triage' | 'disbursements';

export default function AdminDashboard() {
  const { signOut, user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('analytics');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Data State
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [volunteers, setVolunteers] = useState<Profile[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [triageSessions, setTriageSessions] = useState<TriageSession[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Form States
  const [newUser, setNewUser] = useState({
    email: '', password: '', fullName: '', nationalId: '', phone: '+254', county: '', role: 'volunteer' as UserRole
  });
  const [newCampaign, setNewCampaign] = useState({ name: '', description: '', amount: 5000 });
  const [editingCampaign, setEditingCampaign] = useState<string | null>(null);
  const [editCampaignData, setEditCampaignData] = useState({ name: '', description: '', amount: 0 });
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [selectedCounties, setSelectedCounties] = useState<Record<string, string>>({});

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchData();
    
    // Set up real-time subscription for triage sessions
    const triageSubscription = supabase
      .channel('triage_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'triage_sessions' }, () => {
        fetchTriage();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(triageSubscription);
    };
  }, []);

  async function fetchData() {
    setLoading(true);
    await Promise.all([
      fetchProfiles(),
      fetchCampaigns(),
      fetchTriage(),
      fetchLedger()
    ]);
    setLoading(false);
  }

  async function fetchProfiles() {
    const { data } = await supabase.from('profiles').select('*').order('full_name', { ascending: true });
    if (data) {
      setProfiles(data);
      setVolunteers(data.filter(p => p.role === 'volunteer'));
    }
  }

  async function fetchCampaigns() {
    const { data } = await supabase.from('campaigns').select('*').order('created_at', { ascending: false });
    if (data) setCampaigns(data);
  }

  async function fetchTriage() {
    const { data } = await supabase.from('triage_sessions').select('*').order('risk_score', { ascending: false });
    if (data) setTriageSessions(data);
  }

  async function fetchLedger() {
    const { data } = await supabase.from('ledger').select('*').order('created_at', { ascending: false });
    if (data) setLedger(data);
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    const { error } = await supabase.auth.signUp({
      email: newUser.email,
      password: newUser.password,
      options: {
        data: { 
          role: newUser.role,
          full_name: newUser.fullName,
          national_id: newUser.nationalId,
          phone_number: newUser.phone,
          county: newUser.county
        }
      }
    });

    if (error) {
      setStatus({ type: 'error', message: error.message });
    } else {
      setStatus({ 
        type: 'success', 
        message: `Account created for ${newUser.email}. Please ask them to check their email for activation.` 
      });
      setNewUser({ email: '', password: '', fullName: '', nationalId: '', phone: '+254', county: '', role: 'volunteer' });
      fetchProfiles();
    }
  }

  async function handleCreateCampaign(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    const { error } = await supabase.from('campaigns').insert({
      name: newCampaign.name,
      description: newCampaign.description,
      amount: newCampaign.amount
    });

    if (error) {
      setStatus({ type: 'error', message: error.message });
    } else {
      setStatus({ type: 'success', message: 'Campaign created successfully!' });
      setNewCampaign({ name: '', description: '', amount: 5000 });
      fetchCampaigns();
    }
  }

  async function handleDeleteCampaign(id: string) {
    setDeleteConfirmId(id);
  }

  async function confirmDelete() {
    if (!deleteConfirmId) return;
    const { error } = await supabase.from('campaigns').delete().eq('id', deleteConfirmId);
    if (error) setStatus({ type: 'error', message: error.message });
    else fetchCampaigns();
    setDeleteConfirmId(null);
  }

  async function handleUpdateCampaign(id: string) {
    const { error } = await supabase.from('campaigns').update({
      name: editCampaignData.name,
      description: editCampaignData.description,
      amount: editCampaignData.amount
    }).eq('id', id);

    if (error) {
      setStatus({ type: 'error', message: error.message });
    } else {
      setEditingCampaign(null);
      fetchCampaigns();
    }
  }

  async function sendVoucherSMS(profile: Profile, campaign: Campaign): Promise<{ success: boolean; message: string }> {
    if (!profile.phone_number) {
      return { success: false, message: `${profile.full_name} has no phone number` };
    }

    try {
      const chatbotUrl = `${window.location.origin}/chat`;
      const voucherCode = profile.id.slice(-6).toUpperCase();
      const response = await fetch('/api/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: profile.phone_number,
          message: `Hello ${profile.full_name}, your relief voucher for ${campaign.name} is ready. Voucher Number: ${voucherCode}. Present this Voucher Number (${voucherCode}) to any authorized merchant to redeem your KES ${campaign.amount} relief credit. Dial *384*34091# or visit: ${chatbotUrl}`
        })
      });
      const result = await response.json();
      if (result.success) {
        return { success: true, message: `SMS sent to ${profile.full_name}` };
      } else {
        return { success: false, message: result.error || 'Unknown error' };
      }
    } catch (error) {
      return { success: false, message: String(error) };
    }
  }

  async function handleDisburse(campaignId: string, amount: number) {
    setStatus(null);
    const county = selectedCounties[campaignId];
    
    let victims = profiles.filter(p => p.role === 'victim');
    if (county && county !== 'All Counties') {
      victims = victims.filter(p => p.county === county);
    }

    console.log("[Disbursement Diagnostics] Selected county:", county);
    console.log("[Disbursement Diagnostics] Recipient Victims count:", victims.length);
    console.log("[Disbursement Diagnostics] Victims list:", victims);

    if (victims.length === 0) {
      const errorMsg = `No victims found in ${county || 'the selected area'} to disburse to.`;
      console.warn("[Disbursement Diagnostics]", errorMsg);
      setStatus({ type: 'error', message: errorMsg });
      return;
    }

    const payload = {
      victim_profile_ids: victims.map(v => v.id),
      disbursement_amount: amount,
      p_campaign_id: campaignId,
      idempotency_key_prefix: `disburse-${campaignId}-${county || 'all'}-${Date.now()}-`
    };

    console.log("[Disbursement Diagnostics] Calling disburse_aid RPC with payload:", payload);

    const { data, error } = await supabase.rpc('disburse_aid', payload);

    console.log("[Disbursement Diagnostics] RPC Response Data:", data);
    if (error) {
      console.error("[Disbursement Diagnostics] RPC execution error:", error);
      setStatus({ type: 'error', message: `Database Error: ${error.message} (${error.code || 'Unspecified'})` });
      return;
    }

    setStatus({ 
      type: 'success', 
      message: `Disbursement of KES ${amount.toLocaleString()} triggered for ${victims.length} victims in ${county || 'all areas'}. Processing notifications...` 
    });

    // Refresh ledger data right away to reflect changes on dashboard and charts
    console.log("[Disbursement Diagnostics] Refreshing ledger and profile data...");
    await Promise.all([fetchLedger(), fetchProfiles(), fetchCampaigns()]);

    // Also trigger SMS notifications
    const campaign = campaigns.find(c => c.id === campaignId);
    if (campaign) {
      const smsPromises = victims.map(v => sendVoucherSMS(v, campaign));
      Promise.all(smsPromises).then((results) => {
        const successCount = results.filter(r => r.success).length;
        const failures = results.filter(r => !r.success);
        
        if (failures.length === 0) {
          setStatus({ 
            type: 'success', 
            message: `Disbursement of KES ${amount.toLocaleString()} completed successfully! Voucher SMS notifications sent to all ${victims.length} victims.` 
          });
        } else {
          console.warn("[Disbursement Diagnostics] Some sandbox SMS delivery failures (expected for unwhitelisted or mock numbers in AT Sandbox):", failures);
          setStatus({ 
            type: 'success', 
            message: `Disbursement of KES ${amount.toLocaleString()} completed successfully! Sent SMS to ${successCount}/${victims.length} victims. (Note: in Sandbox mode, SMS are only delivered to active simulated phone numbers in your team list, but the wallets are fully credited).` 
          });
        }
      });
    }
  }

  async function assignVolunteer(sessionId: number, volunteerId: string) {
    const { error } = await supabase
      .from('triage_sessions')
      .update({ volunteer_id: volunteerId, status: 'in_progress' })
      .eq('id', sessionId);

    if (error) setStatus({ type: 'error', message: error.message });
    else {
      setStatus({ type: 'success', message: 'Volunteer assigned successfully' });
      fetchTriage();
    }
  }

  const stats = {
    totalAid: ledger.filter(l => l.transaction_type === 'AID_DISBURSEMENT').reduce((acc, l) => acc + Math.abs(l.amount), 0),
    totalPurchases: ledger.filter(l => l.transaction_type === 'PURCHASE').reduce((acc, l) => acc + Math.abs(l.amount), 0) / 2, // Divided by 2 because purchase has 2 entries (debit/credit)
    activeVictims: profiles.filter(p => p.role === 'victim').length,
    highRiskCases: triageSessions.filter(s => s.risk_score > 0.7 && s.status === 'open').length
  };

  // Pagination Logic
  const filteredProfiles = profiles.filter(p => 
    (p.full_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (p.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (p.phone_number?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentProfiles = filteredProfiles.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredProfiles.length / itemsPerPage);

  const availableCounties = Array.from(new Set(profiles.filter(p => p.role === 'victim' && p.county).map(p => p.county as string))).sort();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      {/* Mobile Header */}
      <div className="lg:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center shadow-lg shadow-red-200">
            <Shield className="text-white" size={18} />
          </div>
          <span className="font-black text-slate-900 tracking-tight">ReliefAdmin</span>
        </div>
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
        >
          {isSidebarOpen ? <X size={24} /> : <LayoutDashboard size={24} />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:h-screen
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 hidden lg:flex items-center gap-3 border-b border-slate-100 flex-shrink-0">
          <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-200">
            <Shield className="text-white" size={24} />
          </div>
          <span className="font-black text-slate-900 tracking-tight text-lg">ReliefAdmin</span>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
          <SidebarLink 
            icon={<LayoutDashboard size={20} />} 
            label="Analytics" 
            active={activeTab === 'analytics'} 
            onClick={() => { setActiveTab('analytics'); setIsSidebarOpen(false); }} 
          />
          <SidebarLink 
            icon={<Users size={20} />} 
            label="User Management" 
            active={activeTab === 'users'} 
            onClick={() => { setActiveTab('users'); setIsSidebarOpen(false); }} 
          />
          <SidebarLink 
            icon={<Megaphone size={20} />} 
            label="Campaigns" 
            active={activeTab === 'campaigns'} 
            onClick={() => { setActiveTab('campaigns'); setIsSidebarOpen(false); }} 
          />
          <SidebarLink 
            icon={<MessageSquareWarning size={20} />} 
            label="PFA Triage" 
            active={activeTab === 'triage'} 
            badge={stats.highRiskCases > 0 ? stats.highRiskCases : undefined}
            onClick={() => { setActiveTab('triage'); setIsSidebarOpen(false); }} 
          />
          <SidebarLink 
            icon={<Wallet size={20} />} 
            label="Aid Disbursements" 
            active={activeTab === 'disbursements'} 
            onClick={() => { setActiveTab('disbursements'); setIsSidebarOpen(false); }} 
          />
        </nav>

        <div className="p-4 border-t border-slate-100">
          <button 
            onClick={signOut}
            className="w-full flex items-center gap-3 px-4 py-3 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all font-bold"
          >
            <LogOut size={20} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 capitalize">{activeTab.replace('-', ' ')}</h2>
            <p className="text-slate-500 font-medium text-sm md:text-base">System overview and management</p>
          </div>
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 flex items-center gap-2 flex-1 sm:flex-initial justify-center">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm font-bold text-slate-700">System Live</span>
            </div>
          </div>
        </header>

        {status && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-6 p-4 rounded-2xl text-sm font-bold flex items-center gap-3 border ${
              status.type === 'success' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'
            }`}
          >
            {status.type === 'success' ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
            {status.message}
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {activeTab === 'analytics' && (
            <motion.div 
              key="analytics"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard icon={<TrendingUp className="text-blue-600" />} label="Total Aid Disbursed" value={`KES ${(stats.totalAid || 0).toLocaleString()}`} color="blue" />
                <StatCard icon={<Activity className="text-green-600" />} label="Merchant Volume" value={`KES ${(stats.totalPurchases || 0).toLocaleString()}`} color="green" />
                <StatCard icon={<Users className="text-purple-600" />} label="Active Victims" value={stats.activeVictims} color="purple" />
                <StatCard icon={<AlertTriangle className="text-red-600" />} label="High Risk Cases" value={stats.highRiskCases} color="red" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                  <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                    <TrendingUp size={20} className="text-slate-400" />
                    Recent Activity
                  </h3>
                  <div className="space-y-4">
                    {ledger.slice(0, 5).map((entry) => (
                      <div key={entry.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            entry.transaction_type === 'AID_DISBURSEMENT' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                          }`}>
                            {entry.transaction_type === 'AID_DISBURSEMENT' ? <PlusCircle size={18} /> : <Store size={18} />}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-sm">{entry.description}</p>
                            <p className="text-xs text-slate-500">{new Date(entry.created_at).toLocaleString()}</p>
                          </div>
                        </div>
                        <span className={`font-black ${entry.amount > 0 ? 'text-green-600' : 'text-slate-900'}`}>
                          {entry.amount > 0 ? '+' : ''}{entry.amount}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                  <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                    <Users size={20} className="text-slate-400" />
                    User Distribution
                  </h3>
                  <div className="space-y-6">
                    <DistributionBar label="Victims" count={profiles.filter(p => p.role === 'victim').length} total={profiles.length} color="bg-red-500" />
                    <DistributionBar label="Volunteers" count={profiles.filter(p => p.role === 'volunteer').length} total={profiles.length} color="bg-blue-500" />
                    <DistributionBar label="Merchants" count={profiles.filter(p => p.role === 'merchant').length} total={profiles.length} color="bg-green-500" />
                    <DistributionBar label="Admins" count={profiles.filter(p => p.role === 'admin').length} total={profiles.length} color="bg-purple-500" />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'users' && (
            <motion.div 
              key="users"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
              <div className="lg:col-span-1">
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm sticky top-8">
                  <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                    <UserPlus size={20} className="text-red-600" />
                    Register New User
                  </h3>
                  <form onSubmit={handleCreateUser} className="space-y-4">
                    <Input label="Full Name" value={newUser.fullName} onChange={v => setNewUser({...newUser, fullName: v})} required />
                    <Input label="Email" type="email" value={newUser.email} onChange={v => setNewUser({...newUser, email: v})} required />
                    <Input label="Password" type="password" value={newUser.password} onChange={v => setNewUser({...newUser, password: v})} required />
                    <div className="grid grid-cols-2 gap-4">
                      <Input label="National ID" value={newUser.nationalId} onChange={v => setNewUser({...newUser, nationalId: v})} />
                      <Input label="Phone (+254...)" value={newUser.phone} onChange={v => {
                        if (v.startsWith('+254') || v === '') setNewUser({...newUser, phone: v});
                        else if (v.startsWith('254')) setNewUser({...newUser, phone: '+' + v});
                        else if (v.length > 0 && !v.startsWith('+')) setNewUser({...newUser, phone: '+254' + v.replace(/^0/, '')});
                        else setNewUser({...newUser, phone: v});
                      }} />
                    </div>
                    <Input 
                      label="County" 
                      value={newUser.county} 
                      onChange={v => setNewUser({...newUser, county: v})} 
                      placeholder="Type or select county..." 
                      list="kenyan-counties"
                    />
                    <datalist id="kenyan-counties">
                      {KENYAN_COUNTIES.map(c => <option key={c} value={c} />)}
                    </datalist>
                    <div>
                      <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Role</label>
                      <select 
                        value={newUser.role}
                        onChange={e => setNewUser({...newUser, role: e.target.value as UserRole})}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500 font-bold"
                      >
                        <option value="volunteer">Volunteer</option>
                        <option value="merchant">Merchant</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    <button type="submit" className="w-full bg-red-600 text-white font-black py-4 rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-200">
                      Create Account
                    </button>
                  </form>
                </div>
              </div>

              <div className="lg:col-span-2">
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="text-lg font-bold">System Users</h3>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        type="text" 
                        placeholder="Search users..." 
                        value={searchTerm}
                        onChange={(e) => {
                          setSearchTerm(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-500" 
                      />
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">User</th>
                          <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Role</th>
                          <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Status</th>
                          <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">County</th>
                          <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Contact</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {currentProfiles.map(p => (
                          <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center font-black text-slate-500">
                                  {p.full_name?.[0] || p.email?.[0]}
                                </div>
                                <div>
                                  <p className="font-bold text-slate-900">{p.full_name || 'Unnamed'}</p>
                                  <p className="text-xs text-slate-500">{p.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest ${
                                p.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                                p.role === 'volunteer' ? 'bg-blue-100 text-blue-700' :
                                p.role === 'merchant' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'
                              }`}>
                                {p.role}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest flex items-center gap-1 w-fit ${
                                p.status === 'active' ? 'bg-green-100 text-green-700' :
                                p.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                              }`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${
                                  p.status === 'active' ? 'bg-green-500' :
                                  p.status === 'pending' ? 'bg-amber-500' : 'bg-red-500'
                                }`} />
                                {p.status === 'pending' ? 'Inactive' : p.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm font-bold text-slate-600">
                              {p.county || 'N/A'}
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-sm font-medium text-slate-600">{p.phone_number || 'No phone'}</p>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="p-6 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                      <p className="text-sm font-medium text-slate-500">
                        Showing <span className="text-slate-900">{indexOfFirstItem + 1}</span> to <span className="text-slate-900">{Math.min(indexOfLastItem, filteredProfiles.length)}</span> of <span className="text-slate-900">{filteredProfiles.length}</span> users
                      </p>
                      <div className="flex items-center gap-2">
                        <button 
                          disabled={currentPage === 1}
                          onClick={() => setCurrentPage(prev => prev - 1)}
                          className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                          Previous
                        </button>
                        {[...Array(totalPages)].map((_, i) => (
                          <button
                            key={i + 1}
                            onClick={() => setCurrentPage(i + 1)}
                            className={`w-10 h-10 rounded-xl text-sm font-bold transition-all ${
                              currentPage === i + 1 
                                ? 'bg-red-600 text-white shadow-lg shadow-red-200' 
                                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            {i + 1}
                          </button>
                        ))}
                        <button 
                          disabled={currentPage === totalPages}
                          onClick={() => setCurrentPage(prev => prev + 1)}
                          className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'campaigns' && (
            <motion.div 
              key="campaigns"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <Megaphone size={24} className="text-red-600" />
                  Launch New Relief Campaign
                </h3>
                <form onSubmit={handleCreateCampaign} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 items-end">
                  <div className="sm:col-span-1">
                    <Input label="Campaign Name" value={newCampaign.name} onChange={v => setNewCampaign({...newCampaign, name: v})} required placeholder="e.g. Flood Relief 2026" />
                  </div>
                  <div className="sm:col-span-1">
                    <Input label="Description" value={newCampaign.description} onChange={v => setNewCampaign({...newCampaign, description: v})} placeholder="Brief overview" />
                  </div>
                  <div className="sm:col-span-1">
                    <Input label="Amount per Victim (KES)" type="number" value={newCampaign.amount.toString()} onChange={v => setNewCampaign({...newCampaign, amount: parseFloat(v) || 0})} placeholder="e.g. 5000" />
                  </div>
                  <button type="submit" className="bg-red-600 text-white font-black py-4 rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-200 flex items-center justify-center gap-2 sm:col-span-1">
                    <PlusCircle size={20} />
                    Create Campaign
                  </button>
                </form>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {campaigns.map(c => (
                  <div key={c.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden hover:border-red-200 transition-all group">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-start">
                      <div className="flex-1">
                        {editingCampaign === c.id ? (
                          <div className="space-y-4">
                            <Input label="Name" value={editCampaignData.name} onChange={v => setEditCampaignData({...editCampaignData, name: v})} />
                            <Input label="Description" value={editCampaignData.description} onChange={v => setEditCampaignData({...editCampaignData, description: v})} />
                            <Input label="Amount (KES)" type="number" value={(editCampaignData.amount || 0).toString()} onChange={v => setEditCampaignData({...editCampaignData, amount: parseFloat(v) || 0})} />
                            <div className="flex gap-2">
                              <button onClick={() => handleUpdateCampaign(c.id)} className="flex-1 bg-green-600 text-white py-2 rounded-lg font-bold flex items-center justify-center gap-2">
                                <Save size={16} /> Save
                              </button>
                              <button onClick={() => setEditingCampaign(null)} className="flex-1 bg-slate-200 text-slate-700 py-2 rounded-lg font-bold flex items-center justify-center gap-2">
                                <X size={16} /> Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <h4 className="text-xl font-black text-slate-900 mb-1">{c.name}</h4>
                            <p className="text-slate-500 text-sm font-medium">{c.description || 'No description provided'}</p>
                          </>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest ${
                          c.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {c.status}
                        </span>
                        {!editingCampaign && (
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => {
                                setEditingCampaign(c.id);
                                setEditCampaignData({ name: c.name, description: c.description, amount: c.amount });
                              }}
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            >
                              <Edit size={16} />
                            </button>
                            <button 
                              onClick={() => handleDeleteCampaign(c.id)}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="p-6 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                        <div className="bg-white p-3 rounded-xl border border-slate-200 w-full sm:w-auto">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Per Victim</p>
                          <p className="text-lg font-black text-slate-900">KES {(c.amount || 0).toLocaleString()}</p>
                        </div>
                        <div className="w-full sm:w-48">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Target County</p>
                          <select 
                            value={selectedCounties[c.id] || ''}
                            onChange={(e) => setSelectedCounties({...selectedCounties, [c.id]: e.target.value})}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-red-500 transition-all"
                          >
                            <option value="">All Counties</option>
                            {availableCounties.map(county => (
                              <option key={county} value={county}>{county}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto">
                        <button 
                          onClick={() => handleDisburse(c.id, c.amount)}
                          className="flex-1 sm:flex-initial bg-slate-900 text-white px-6 py-3 rounded-xl font-black hover:bg-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-200"
                        >
                          <Send size={16} />
                          Disburse & Notify
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'triage' && (
            <motion.div 
              key="triage"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-bold">PFA Chatbot Triage</h3>
                    <p className="text-sm text-slate-500 font-medium">Victims ranked by danger/risk level</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Filter size={18} className="text-slate-400" />
                    <select className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1 text-sm font-bold outline-none">
                      <option>All Status</option>
                      <option>Open</option>
                      <option>In Progress</option>
                      <option>Closed</option>
                    </select>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Victim</th>
                        <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Risk Score</th>
                        <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Last Message</th>
                        <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Assignment</th>
                        <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {triageSessions.map(session => {
                        const victim = profiles.find(p => p.id === session.victim_id);
                        const assignedVolunteer = volunteers.find(v => v.id === session.volunteer_id);
                        
                        return (
                          <tr key={session.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4">
                              <p className="font-bold text-slate-900">{victim?.full_name || 'Unknown Victim'}</p>
                              <p className="text-xs text-slate-500">{victim?.phone_number || 'No contact'}</p>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden w-24">
                                  <div 
                                    className={`h-full rounded-full ${
                                      session.risk_score > 0.7 ? 'bg-red-500' : 
                                      session.risk_score > 0.4 ? 'bg-orange-500' : 'bg-green-500'
                                    }`}
                                    style={{ width: `${session.risk_score * 100}%` }}
                                  />
                                </div>
                                <span className={`text-xs font-black ${
                                  session.risk_score > 0.7 ? 'text-red-600' : 
                                  session.risk_score > 0.4 ? 'text-orange-600' : 'text-green-600'
                                }`}>
                                  {(session.risk_score * 100).toFixed(0)}%
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-sm text-slate-600 max-w-xs truncate italic">"{session.last_message}"</p>
                            </td>
                            <td className="px-6 py-4">
                              {session.volunteer_id ? (
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-[10px] font-black text-blue-600">
                                    {assignedVolunteer?.full_name?.[0]}
                                  </div>
                                  <span className="text-sm font-bold text-slate-700">{assignedVolunteer?.full_name}</span>
                                </div>
                              ) : (
                                <select 
                                  onChange={(e) => assignVolunteer(session.id, e.target.value)}
                                  className="text-xs font-bold bg-white border border-slate-200 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-red-500"
                                >
                                  <option value="">Assign Volunteer</option>
                                  {volunteers.map(v => (
                                    <option key={v.id} value={v.id}>{v.full_name}</option>
                                  ))}
                                </select>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                session.status === 'open' ? 'bg-red-100 text-red-700' :
                                session.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                              }`}>
                                {session.status.replace('_', ' ')}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}
          {activeTab === 'disbursements' && (
            <motion.div 
              key="disbursements"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              {/* Highlight Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Total Aid Disbursed</p>
                    <p className="text-2xl font-black text-slate-900">KES {(ledger.filter(l => l.transaction_type === 'AID_DISBURSEMENT').reduce((acc, l) => acc + Math.abs(l.amount), 0)).toLocaleString()}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center">
                    <TrendingUp size={24} />
                  </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Impact (Unique Recipients)</p>
                    <p className="text-2xl font-black text-slate-900">
                      {new Set(ledger.filter(l => l.transaction_type === 'AID_DISBURSEMENT').map(l => l.profile_id)).size} Victims
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                    <Users size={24} />
                  </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Total Transactions</p>
                    <p className="text-2xl font-black text-slate-900">
                      {ledger.filter(l => l.transaction_type === 'AID_DISBURSEMENT').length} Allocations
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center">
                    <CheckCircle2 size={24} />
                  </div>
                </div>
              </div>

              {/* Disbursement Ledger Table Wrapper */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h3 className="text-lg font-bold">Relief Allocation Ledger</h3>
                    <p className="text-sm text-slate-500 font-medium">Audit logs of all successful direct aid disbursements</p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    {/* Search inside disbursements ledger */}
                    <div className="relative flex-1 sm:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        type="text" 
                        placeholder="Search recipient or campaign..." 
                        value={searchTerm}
                        onChange={(e) => {
                          setSearchTerm(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-500 font-semibold text-slate-900" 
                      />
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Recipient</th>
                        <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Campaign</th>
                        <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">County</th>
                        <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Amount</th>
                        <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Allocation Date</th>
                        <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(() => {
                        const disbursementList = ledger.filter(l => l.transaction_type === 'AID_DISBURSEMENT');
                        const searchFiltered = disbursementList.filter(entry => {
                          const recipient = profiles.find(p => p.id === entry.profile_id);
                          const campaign = campaigns.find(c => c.id === entry.campaign_id);
                          
                          const searchStr = (searchTerm || '').toLowerCase();
                          return (
                            (recipient?.full_name?.toLowerCase() || '').includes(searchStr) ||
                            (recipient?.phone_number?.toLowerCase() || '').includes(searchStr) ||
                            (recipient?.email?.toLowerCase() || '').includes(searchStr) ||
                            (recipient?.county?.toLowerCase() || '').includes(searchStr) ||
                            (campaign?.name?.toLowerCase() || '').includes(searchStr) ||
                            (entry.description?.toLowerCase() || '').includes(searchStr)
                          );
                        });

                        const indexLast = currentPage * itemsPerPage;
                        const indexFirst = indexLast - itemsPerPage;
                        const paginatedDisbursements = searchFiltered.slice(indexFirst, indexLast);

                        if (paginatedDisbursements.length === 0) {
                          return (
                            <tr>
                              <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-bold">
                                No allocation records found.
                              </td>
                            </tr>
                          );
                        }

                        return (
                          <>
                            {paginatedDisbursements.map((entry) => {
                              const recipient = profiles.find(p => p.id === entry.profile_id);
                              const campaign = campaigns.find(c => c.id === entry.campaign_id);

                              return (
                                <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                                  <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                      <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center font-black text-slate-500 text-sm">
                                        {recipient?.full_name?.[0] || 'V'}
                                      </div>
                                      <div>
                                        <p className="font-bold text-slate-900">{recipient?.full_name || 'Unknown Recipient'}</p>
                                        <p className="text-xs text-slate-500 font-medium">{recipient?.phone_number || recipient?.email || 'N/A'}</p>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <p className="font-bold text-slate-700 text-sm">{campaign?.name || 'Relief Aid'}</p>
                                    <p className="text-xs text-slate-400 font-semibold">{entry.description || 'Disbursement'}</p>
                                  </td>
                                  <td className="px-6 py-4 text-sm font-bold text-slate-600">
                                    {recipient?.county || 'N/A'}
                                  </td>
                                  <td className="px-6 py-4">
                                    <span className="font-black text-green-600 text-sm">
                                      +KES {Math.abs(entry.amount).toLocaleString()}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 text-xs font-bold text-slate-500">
                                    {new Date(entry.created_at).toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                  </td>
                                  <td className="px-6 py-4">
                                    <span className="px-3 py-1 bg-green-100 text-green-700 border border-green-200 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1 w-fit">
                                      <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                      Credited
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </>
                        );
                      })()}
                    </tbody>
                  </table>
                </div>

                {/* Ledger Pagination Controls */}
                {(() => {
                  const disbursementList = ledger.filter(l => l.transaction_type === 'AID_DISBURSEMENT');
                  const searchFiltered = disbursementList.filter(entry => {
                    const recipient = profiles.find(p => p.id === entry.profile_id);
                    const campaign = campaigns.find(c => c.id === entry.campaign_id);
                    
                    const searchStr = (searchTerm || '').toLowerCase();
                    return (
                      (recipient?.full_name?.toLowerCase() || '').includes(searchStr) ||
                      (recipient?.phone_number?.toLowerCase() || '').includes(searchStr) ||
                      (recipient?.email?.toLowerCase() || '').includes(searchStr) ||
                      (recipient?.county?.toLowerCase() || '').includes(searchStr) ||
                      (campaign?.name?.toLowerCase() || '').includes(searchStr) ||
                      (entry.description?.toLowerCase() || '').includes(searchStr)
                    );
                  });
                  const totalLedgerPages = Math.ceil(searchFiltered.length / itemsPerPage);
                  const indexLast = currentPage * itemsPerPage;
                  const indexFirst = indexLast - itemsPerPage;

                  if (totalLedgerPages <= 1) return null;

                  return (
                    <div className="p-6 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                      <p className="text-sm font-medium text-slate-500">
                        Showing <span className="text-slate-900">{indexFirst + 1}</span> to <span className="text-slate-900">{Math.min(indexLast, searchFiltered.length)}</span> of <span className="text-slate-900">{searchFiltered.length}</span> allocations
                      </p>
                      <div className="flex items-center gap-2">
                        <button 
                          disabled={currentPage === 1}
                          type="button"
                          onClick={() => setCurrentPage(prev => prev - 1)}
                          className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                          Previous
                        </button>
                        {[...Array(totalLedgerPages)].map((_, i) => (
                          <button
                            key={i + 1}
                            type="button"
                            onClick={() => setCurrentPage(i + 1)}
                            className={`w-10 h-10 rounded-xl text-sm font-bold transition-all ${
                              currentPage === i + 1 
                                ? 'bg-red-600 text-white shadow-lg shadow-red-200' 
                                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            {i + 1}
                          </button>
                        ))}
                        <button 
                          disabled={currentPage === totalLedgerPages}
                          type="button"
                          onClick={() => setCurrentPage(prev => prev + 1)}
                          className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  );
                })()}

              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {deleteConfirmId && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-slate-100 text-center"
              >
                <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Trash2 className="text-red-600" size={32} />
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-2">Delete Campaign?</h3>
                <p className="text-slate-500 font-medium mb-8">
                  This action cannot be undone. All data associated with this campaign will be permanently removed.
                </p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setDeleteConfirmId(null)}
                    className="flex-1 px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={confirmDelete}
                    className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl font-black hover:bg-red-700 transition-all shadow-lg shadow-red-200"
                  >
                    Delete
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function SidebarLink({ icon, label, active, onClick, badge }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void, badge?: number }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all font-bold group ${
        active ? 'bg-red-600 text-white shadow-lg shadow-red-200' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
      }`}
    >
      <div className="flex items-center gap-3">
        {icon}
        <span>{label}</span>
      </div>
      {badge && (
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
          active ? 'bg-white text-red-600' : 'bg-red-600 text-white'
        }`}>
          {badge}
        </span>
      )}
    </button>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode, label: string, value: string | number, color: 'blue' | 'green' | 'purple' | 'red' }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    red: 'bg-red-50 text-red-600'
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${colors[color]}`}>
        {icon}
      </div>
      <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-2xl font-black text-slate-900">{value}</p>
    </div>
  );
}

function DistributionBar({ label, count, total, color }: { label: string, count: number, total: number, color: string }) {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs font-bold">
        <span className="text-slate-600">{label}</span>
        <span className="text-slate-400">{count} ({percentage.toFixed(0)}%)</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type = 'text', required = false, placeholder = '', list }: { label: string, value: string, onChange: (v: string) => void, type?: string, required?: boolean, placeholder?: string, list?: string }) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div>
      <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">{label}</label>
      <div className="relative">
        <input 
          type={inputType}
          required={required}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          list={list}
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500 font-bold text-slate-900 placeholder:text-slate-300 transition-all pr-12"
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
    </div>
  );
}
