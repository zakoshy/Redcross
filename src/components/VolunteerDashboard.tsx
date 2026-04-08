import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Profile, TriageSession } from '../types';
import { KENYAN_COUNTIES } from '../constants';
import { 
  UserPlus, ClipboardList, LogOut, MapPin, CreditCard, 
  Phone, AlertCircle, CheckCircle2, MessageSquare
} from 'lucide-react';

export default function VolunteerDashboard() {
  const { signOut, user } = useAuth();
  const [victims, setVictims] = useState<Profile[]>([]);
  const [assignedCases, setAssignedCases] = useState<(TriageSession & { victim?: Profile })[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Registration Form
  const [name, setName] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('+254');
  const [county, setCounty] = useState('');
  
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

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

    const { data, error } = await supabase.rpc('register_victim', {
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
    }
  }

  async function closeCase(sessionId: number) {
    const { error } = await supabase
      .from('triage_sessions')
      .update({ status: 'closed' })
      .eq('id', sessionId);

    if (!error) fetchAssignedCases();
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <ClipboardList className="text-red-600" />
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Volunteer Portal</h1>
        </div>
        <button onClick={signOut} className="flex items-center gap-2 text-slate-600 hover:text-red-600 transition-colors font-medium">
          <LogOut size={18} />
          <span>Sign Out</span>
        </button>
      </nav>

      <main className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Assigned Cases Section */}
        {assignedCases.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="text-red-600" size={20} />
              <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Assigned Urgent Cases</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {assignedCases.map(c => (
                <div key={c.id} className="bg-white p-6 rounded-2xl border-2 border-red-100 shadow-sm space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-black text-slate-900">{c.victim?.full_name}</h3>
                      <p className="text-xs text-slate-500 font-bold">{c.victim?.phone_number || 'No contact'}</p>
                    </div>
                    <span className="bg-red-600 text-white text-[10px] px-2 py-1 rounded-full font-black uppercase">
                      Risk: {(c.risk_score * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="text-xs text-slate-600 italic leading-relaxed">
                      <MessageSquare size={12} className="inline mr-1" />
                      "{c.last_message}"
                    </p>
                  </div>
                  <button 
                    onClick={() => closeCase(c.id)}
                    className="w-full bg-green-600 text-white py-2 rounded-xl font-black text-sm hover:bg-green-700 transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 size={16} />
                    Mark as Resolved
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center gap-2 mb-6">
                <UserPlus className="text-red-600" size={20} />
                <h2 className="text-lg font-bold">Register Victim</h2>
              </div>

              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="e.g. Jane Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">ID Number</label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="text"
                      required
                      value={idNumber}
                      onChange={(e) => setIdNumber(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="National ID"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Phone Number (+254...)</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v.startsWith('+254') || v === '') setPhoneNumber(v);
                        else if (v.startsWith('254')) setPhoneNumber('+' + v);
                        else if (v.length > 0 && !v.startsWith('+')) setPhoneNumber('+254' + v.replace(/^0/, ''));
                        else setPhoneNumber(v);
                      }}
                      className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="e.g. +254..."
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">County</label>
                  <input
                    type="text"
                    value={county}
                    onChange={(e) => setCounty(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Type or select county..."
                    list="kenyan-counties-volunteer"
                  />
                  <datalist id="kenyan-counties-volunteer">
                    {KENYAN_COUNTIES.map(c => <option key={c} value={c} />)}
                  </datalist>
                </div>

                {status && (
                  <div className={`p-3 rounded-lg text-sm font-medium ${status.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                    {status.message}
                  </div>
                )}

                <button type="submit" className="w-full bg-red-600 text-white font-bold py-2 rounded-lg hover:bg-red-700 transition-colors">
                  Register Victim
                </button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ClipboardList className="text-red-600" size={20} />
                  <h2 className="text-lg font-bold">Recent Registrations</h2>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Victim</th>
                      <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">National ID</th>
                      <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">County</th>
                      <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Phone</th>
                      <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">Loading...</td></tr>
                    ) : victims.map((v) => (
                      <tr key={v.id} className="hover:bg-slate-50 transition-colors text-sm">
                        <td className="px-6 py-4 font-bold text-slate-900">{v.full_name}</td>
                        <td className="px-6 py-4 text-slate-600 font-mono">{v.national_id}</td>
                        <td className="px-6 py-4 text-slate-600 font-bold">{v.county || 'N/A'}</td>
                        <td className="px-6 py-4 text-slate-600">{v.phone_number || 'N/A'}</td>
                        <td className="px-6 py-4 text-slate-500">
                          {new Date(v.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
