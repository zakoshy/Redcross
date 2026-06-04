import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Profile, TriageSession } from '../types';
import { KENYAN_COUNTIES } from '../constants';
import { 
  UserPlus, ClipboardList, LogOut, MapPin, CreditCard, 
  Phone, AlertCircle, CheckCircle2, MessageSquare,
  Users, Calendar, Search, Filter, Plus, Edit, Save, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function VolunteerDashboard() {
  const { signOut, user } = useAuth();
  const [victims, setVictims] = useState<Profile[]>([]);
  const [assignedCases, setAssignedCases] = useState<(TriageSession & { victim?: Profile })[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'register' | 'cases' | 'history' | 'search'>('register');
  
  // Registration Form
  const [name, setName] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('+254');
  const [county, setCounty] = useState('');
  
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  
  // Search and view states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCounty, setFilterCounty] = useState('All Counties');
  const [selectedVictim, setSelectedVictim] = useState<Profile | null>(null);

  // Search and edit history states
  const [searchHistory, setSearchHistory] = useState('');
  const [editingVictim, setEditingVictim] = useState<Profile | null>(null);
  const [editName, setEditName] = useState('');
  const [editIdNumber, setEditIdNumber] = useState('');
  const [editPhoneNumber, setEditPhoneNumber] = useState('');
  const [editCounty, setEditCounty] = useState('');
  const [editStatusMsg, setEditStatusMsg] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    await Promise.all([
      fetchVictims(),
      fetchAssignedCases()
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

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);

    const { error } = await supabase.rpc('register_victim', {
      p_full_name: name,
      p_national_id: idNumber,
      p_phone_number: phoneNumber,
      p_county: county
    });

    if (error) {
      setStatus({ type: 'error', message: error.message });
    } else {
      setStatus({ type: 'success', message: 'Victim registered successfully!' });
      setName('');
      setIdNumber('');
      setPhoneNumber('+254');
      setCounty('');
      fetchVictims();
      setTimeout(() => setStatus(null), 5000);
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
    setEditCounty(v.county || '');
    setEditStatusMsg(null);
  };

  async function handleUpdateVictim(e: React.FormEvent) {
    e.preventDefault();
    if (!editingVictim) return;
    setSaving(true);
    setEditStatusMsg(null);

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: editName,
        national_id: editIdNumber,
        phone_number: editPhoneNumber,
        county: editCounty
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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Navigation */}
      <nav className="bg-white border-b border-slate-200 px-4 md:px-8 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-200">
            <ClipboardList className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">VolunteerPortal</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Humanitarian Response</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs font-bold text-slate-600">Active Session</span>
          </div>
          <button 
            onClick={signOut} 
            className="flex items-center gap-2 text-slate-600 hover:text-red-600 transition-all font-bold text-sm bg-white hover:bg-red-50 px-4 py-2 rounded-xl border border-slate-200 hover:border-red-100"
          >
            <LogOut size={18} />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8 space-y-8">
        {/* Quick Stats / Tabs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <TabButton 
            active={activeTab === 'register'} 
            onClick={() => setActiveTab('register')}
            icon={<UserPlus size={20} />}
            label="Register Victim"
            description="New field registration"
          />
          <TabButton 
            active={activeTab === 'cases'} 
            onClick={() => setActiveTab('cases')}
            icon={<AlertCircle size={20} />}
            label="Urgent Cases"
            description={`${assignedCases.length} assigned to you`}
            badge={assignedCases.length > 0 ? assignedCases.length : undefined}
          />
          <TabButton 
            active={activeTab === 'search'} 
            onClick={() => setActiveTab('search')}
            icon={<Search size={20} />}
            label="Search Victims"
            description="Find & view directory profiles"
          />
          <TabButton 
            active={activeTab === 'history'} 
            onClick={() => setActiveTab('history')}
            icon={<Calendar size={20} />}
            label="My Registrations"
            description="Records you registered"
          />
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'register' && (
            <motion.div
              key="register"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-2xl mx-auto w-full"
            >
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-8 border-b border-slate-100 bg-slate-50/50">
                  <h2 className="text-2xl font-black text-slate-900 mb-2">Victim Registration</h2>
                  <p className="text-slate-500 font-medium">Collect accurate data to ensure rapid aid delivery.</p>
                </div>

                <form onSubmit={handleRegister} className="p-8 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InputField 
                      label="Full Name" 
                      value={name} 
                      onChange={setName} 
                      placeholder="e.g. Jane Doe"
                      required
                    />
                    <InputField 
                      label="National ID" 
                      value={idNumber} 
                      onChange={setIdNumber} 
                      placeholder="ID Number"
                      icon={<CreditCard size={18} />}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InputField 
                      label="Phone Number" 
                      value={phoneNumber} 
                      onChange={v => {
                        if (v.startsWith('+254') || v === '') setPhoneNumber(v);
                        else if (v.startsWith('254')) setPhoneNumber('+' + v);
                        else if (v.length > 0 && !v.startsWith('+')) setPhoneNumber('+254' + v.replace(/^0/, ''));
                        else setPhoneNumber(v);
                      }} 
                      placeholder="+254..."
                      icon={<Phone size={18} />}
                      required
                    />
                    <div>
                      <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">County</label>
                      <div className="relative">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                          type="text"
                          value={county}
                          onChange={(e) => setCounty(e.target.value)}
                          className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500 font-bold transition-all"
                          placeholder="Select county..."
                          list="kenyan-counties-volunteer"
                        />
                      </div>
                      <datalist id="kenyan-counties-volunteer">
                        {KENYAN_COUNTIES.map(c => <option key={c} value={c} />)}
                      </datalist>
                    </div>
                  </div>

                  {status && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`p-4 rounded-2xl text-sm font-bold flex items-center gap-3 border ${
                        status.type === 'success' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'
                      }`}
                    >
                      {status.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                      {status.message}
                    </motion.div>
                  )}

                  <button 
                    type="submit" 
                    className="w-full bg-red-600 text-white font-black py-4 rounded-2xl hover:bg-red-700 transition-all shadow-lg shadow-red-200 flex items-center justify-center gap-2 group"
                  >
                    <Plus size={20} className="group-hover:rotate-90 transition-transform" />
                    Complete Registration
                  </button>
                </form>
              </div>
            </motion.div>
          )}

          {activeTab === 'cases' && (
            <motion.div
              key="cases"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black text-slate-900">Assigned Urgent Cases</h2>
                <span className="bg-red-100 text-red-700 px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest">
                  {assignedCases.length} Active
                </span>
              </div>

              {assignedCases.length === 0 ? (
                <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-4">
                  <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto">
                    <CheckCircle2 className="text-slate-300" size={32} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">All cases resolved</h3>
                  <p className="text-slate-500 max-w-xs mx-auto">You have no urgent cases assigned to you at the moment.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {assignedCases.map(c => (
                    <motion.div 
                      layout
                      key={c.id} 
                      className="bg-white p-6 rounded-3xl border-2 border-red-50 shadow-sm space-y-6 hover:border-red-200 transition-all"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center font-black text-slate-500">
                            {c.victim?.full_name?.[0]}
                          </div>
                          <div>
                            <h3 className="font-black text-slate-900">{c.victim?.full_name}</h3>
                            <p className="text-xs text-slate-500 font-bold">{c.victim?.phone_number || 'No contact'}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="bg-red-600 text-white text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
                            Risk: {(c.risk_score * 100).toFixed(0)}%
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                            {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>

                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 relative">
                        <MessageSquare className="absolute -top-2 -left-2 text-red-200" size={20} />
                        <p className="text-sm text-slate-600 italic leading-relaxed pl-2">
                          "{c.last_message}"
                        </p>
                      </div>

                      <button 
                        onClick={() => closeCase(c.id)}
                        className="w-full bg-green-600 text-white py-3 rounded-xl font-black text-sm hover:bg-green-700 transition-all shadow-lg shadow-green-100 flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 size={18} />
                        Resolve Case
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <Users size={20} className="text-slate-400" />
                    Recent Registrations
                  </h3>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:flex-initial">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        type="text" 
                        placeholder="Search victims..." 
                        value={searchHistory}
                        onChange={(e) => setSearchHistory(e.target.value)}
                        className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-500 w-full"
                      />
                    </div>
                    <button className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-400 hover:text-slate-600">
                      <Filter size={18} />
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Victim</th>
                        <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">National ID</th>
                        <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">County</th>
                        <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Phone</th>
                        <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Date</th>
                        <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {loading ? (
                        <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-bold">Loading records...</td></tr>
                      ) : victims.length === 0 ? (
                        <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-bold">No victims registered yet.</td></tr>
                      ) : (() => {
                        const filtered = victims.filter(v => 
                          (v.full_name?.toLowerCase() || '').includes(searchHistory.toLowerCase()) ||
                          (v.national_id?.toLowerCase() || '').includes(searchHistory.toLowerCase()) ||
                          (v.phone_number?.toLowerCase() || '').includes(searchHistory.toLowerCase()) ||
                          (v.county?.toLowerCase() || '').includes(searchHistory.toLowerCase())
                        );
                        if (filtered.length === 0) {
                          return <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-bold">No matching records found.</td></tr>;
                        }
                        return filtered.map((v) => (
                          <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-xs font-black text-slate-500">
                                  {v.full_name?.[0]}
                                </div>
                                <span className="font-bold text-slate-900">{v.full_name}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-slate-600 font-mono text-sm">{v.national_id}</td>
                            <td className="px-6 py-4">
                              <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                                {v.county || 'N/A'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-slate-600 font-medium text-sm">{v.phone_number || 'N/A'}</td>
                            <td className="px-6 py-4 text-slate-400 text-xs font-bold">
                              {new Date(v.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button
                                onClick={() => startEditing(v)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-red-50 hover:text-red-600 border border-slate-200 hover:border-red-100 text-slate-600 font-bold rounded-xl text-xs transition-all"
                              >
                                <Edit size={12} />
                                Edit Info
                              </button>
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

          {activeTab === 'search' && (
            <motion.div
              key="search"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="space-y-6"
            >
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 md:p-8 space-y-6">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Victim Profile Directory</h2>
                  <p className="text-slate-500 font-bold text-xs mt-1">Verify credentials, locations, active status, and detailed file parameters.</p>
                </div>

                {/* Filters Row */}
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text" 
                      placeholder="Search by full name, ID number, or phone number..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-red-500 font-bold transition-all placeholder:text-slate-300"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest hidden sm:inline">County</span>
                    <select 
                      value={filterCounty}
                      onChange={(e) => setFilterCounty(e.target.value)}
                      className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-600 outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="All Counties">All Counties</option>
                      {KENYAN_COUNTIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                {/* Search Results Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
                  {(() => {
                    let filtered = victims;
                    if (filterCounty !== 'All Counties') {
                      filtered = filtered.filter(v => v.county === filterCounty);
                    }
                    if (searchQuery.trim().length > 0) {
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
                          No victim profiles found matching your filters.
                        </div>
                      );
                    }

                    return filtered.map(v => (
                      <motion.div 
                        key={v.id}
                        layout
                        className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm hover:shadow-md hover:border-slate-300 transition-all space-y-4 relative group"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center font-black">
                              {v.full_name?.[0]?.toUpperCase() || 'V'}
                            </div>
                            <div>
                              <h4 className="font-black text-slate-950 group-hover:text-red-600 transition-colors">{v.full_name}</h4>
                              <p className="text-xs font-semibold text-slate-400">{v.county || 'Unspecified County'}</p>
                            </div>
                          </div>
                          <span className="px-2.5 py-1 bg-green-50 text-green-700 border border-green-100 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                            Registered
                          </span>
                        </div>

                        <div className="border-t border-slate-100 pt-3 space-y-2 text-sm">
                          <div className="flex justify-between font-medium">
                            <span className="text-slate-400">National ID:</span>
                            <span className="text-slate-800 font-mono font-bold">{v.national_id || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between font-medium">
                            <span className="text-slate-400">Phone:</span>
                            <span className="text-slate-800 font-bold">{v.phone_number || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between font-medium">
                            <span className="text-slate-400">Registered:</span>
                            <span className="text-slate-400 text-xs font-bold text-right">
                              {new Date(v.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          </div>
                        </div>

                        <button 
                          type="button"
                          onClick={() => setSelectedVictim(v)}
                          className="w-full bg-slate-50 border border-slate-200 hover:bg-slate-100 hover:border-slate-300 text-slate-700 font-black py-2.5 rounded-2xl transition-all text-xs flex items-center justify-center gap-2"
                        >
                          <Search size={14} />
                          Inspect Full Information
                        </button>
                      </motion.div>
                    ));
                  })()}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Edit Victim Modal */}
      <AnimatePresence>
        {editingVictim && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white w-full max-w-lg rounded-3xl shadow-xl border border-slate-200 overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div>
                  <h3 className="text-lg font-black text-slate-900">Edit Victim Profile</h3>
                  <p className="text-xs text-slate-400 font-bold">Update personal details for field corrections</p>
                </div>
                <button 
                  onClick={() => setEditingVictim(null)}
                  className="p-1.5 bg-white hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-xl border border-slate-200 transition-all"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleUpdateVictim} className="p-6 space-y-5">
                <InputField 
                  label="Full Name" 
                  value={editName} 
                  onChange={setEditName} 
                  placeholder="Jane Doe"
                  required
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <InputField 
                    label="National ID" 
                    value={editIdNumber} 
                    onChange={setEditIdNumber} 
                    placeholder="ID Number"
                    icon={<CreditCard size={18} />}
                    required
                  />
                  <InputField 
                    label="Phone Number" 
                    value={editPhoneNumber} 
                    onChange={v => {
                      if (v.startsWith('+254') || v === '') setEditPhoneNumber(v);
                      else if (v.startsWith('254')) setEditPhoneNumber('+' + v);
                      else if (v.length > 0 && !v.startsWith('+')) setEditPhoneNumber('+254' + v.replace(/^0/, ''));
                      else setEditPhoneNumber(v);
                    }} 
                    placeholder="+254..."
                    icon={<Phone size={18} />}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">County</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="text"
                      value={editCounty}
                      onChange={(e) => setEditCounty(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500 font-bold transition-all"
                      placeholder="Select county..."
                      list="kenyan-counties-volunteer-edit"
                    />
                  </div>
                  <datalist id="kenyan-counties-volunteer-edit">
                    {KENYAN_COUNTIES.map(c => <option key={c} value={c} />)}
                  </datalist>
                </div>

                {editStatusMsg && (
                  <div className={`p-4 rounded-xl text-xs font-bold flex items-center gap-3 border ${
                    editStatusMsg.type === 'success' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'
                  }`}>
                    {editStatusMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                    {editStatusMsg.message}
                  </div>
                )}

                <div className="flex gap-3 justify-end pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setEditingVictim(null)}
                    className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-black rounded-xl text-sm shadow-md shadow-red-100 flex items-center gap-2 transition-all"
                  >
                    <Save size={16} />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* View Selected Victim Dossier Modal */}
      <AnimatePresence>
        {selectedVictim && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white w-full max-w-lg rounded-3xl shadow-xl border border-slate-200 overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div>
                  <h3 className="text-lg font-black text-slate-900">Victim Profile Dossier</h3>
                  <p className="text-xs text-slate-400 font-bold">Comprehensive field validation record</p>
                </div>
                <button 
                  type="button"
                  onClick={() => setSelectedVictim(null)}
                  className="p-1.5 bg-white hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-xl border border-slate-200 transition-all cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Dossier Header Cards */}
                <div className="flex items-center gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                  <div className="w-14 h-14 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center text-xl font-black">
                    {selectedVictim.full_name?.[0]?.toUpperCase() || 'V'}
                  </div>
                  <div>
                    <h4 className="text-xl font-black text-slate-900">{selectedVictim.full_name}</h4>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 border border-green-200 text-green-700 text-[10px] font-black uppercase tracking-widest rounded-full mt-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      Active Record
                    </span>
                  </div>
                </div>

                {/* Dossier Specifications List */}
                <div className="space-y-4">
                  <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">National Identification</p>
                      <p className="text-sm font-bold text-slate-800">{selectedVictim.national_id || 'N/A'}</p>
                    </div>
                    <CreditCard className="text-slate-300" size={20} />
                  </div>

                  <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Contact Mobile Line</p>
                      <span className="text-sm font-bold text-slate-800">{selectedVictim.phone_number || 'N/A'}</span>
                    </div>
                    <Phone className="text-slate-300" size={20} />
                  </div>

                  <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">County Ingress</p>
                      <p className="text-sm font-bold text-slate-800">{selectedVictim.county || 'N/A'}</p>
                    </div>
                    <MapPin className="text-slate-300" size={20} />
                  </div>

                  <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Registration Date Timestamp</p>
                      <p className="text-sm font-bold text-slate-800">
                        {new Date(selectedVictim.created_at).toLocaleString([], { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <Calendar className="text-slate-300" size={20} />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedVictim(null)}
                    className="w-full py-3 bg-red-600 hover:bg-red-700 hover:shadow-lg hover:shadow-red-200 transition-all text-white font-black rounded-xl text-sm cursor-pointer"
                  >
                    Dossier Checked & Verified
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TabButton({ active, onClick, icon, label, description, badge }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, description: string, badge?: number }) {
  return (
    <button 
      onClick={onClick}
      className={`p-6 rounded-3xl border text-left transition-all relative group overflow-hidden ${
        active 
          ? 'bg-white border-red-200 shadow-lg shadow-red-100 ring-1 ring-red-100' 
          : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
      }`}
    >
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-all ${
        active ? 'bg-red-600 text-white rotate-3' : 'bg-slate-50 text-slate-400 group-hover:scale-110'
      }`}>
        {icon}
      </div>
      <h3 className={`font-black tracking-tight mb-1 ${active ? 'text-slate-900' : 'text-slate-600'}`}>{label}</h3>
      <p className="text-xs text-slate-400 font-medium">{description}</p>
      
      {badge && (
        <span className="absolute top-6 right-6 bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-bounce">
          {badge}
        </span>
      )}

      {active && (
        <motion.div 
          layoutId="active-tab-indicator"
          className="absolute bottom-0 left-0 right-0 h-1 bg-red-600"
        />
      )}
    </button>
  );
}

function InputField({ label, value, onChange, placeholder, icon, type = 'text', required = false }: { label: string, value: string, onChange: (v: string) => void, placeholder: string, icon?: React.ReactNode, type?: string, required?: boolean }) {
  return (
    <div>
      <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">{label}</label>
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
          className={`w-full ${icon ? 'pl-12' : 'px-4'} pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500 font-bold transition-all placeholder:text-slate-300`}
          placeholder={placeholder}
        />
      </div>
    </div>
  );
}
