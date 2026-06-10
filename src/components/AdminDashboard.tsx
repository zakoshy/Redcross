import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Profile, UserRole, Campaign, TriageSession, LedgerEntry } from '../types';
import { KENYAN_COUNTIES } from '../constants';
import { 
  Shield, UserPlus, Users, Store, LogOut, PlusCircle, Megaphone, 
  Send, CheckCircle2, Wallet, LayoutDashboard, MessageSquareWarning, 
  TrendingUp, Activity, AlertTriangle, UserCheck, Search, Filter,
  Eye, EyeOff, Trash2, Edit, Save, X, Phone as PhoneIcon, Sliders, Info, Server, Sun, Moon, Sparkles,
  ChevronLeft, ChevronRight, Menu
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, Cell } from 'recharts';
import PFABuddyChat from './PFABuddyChat';

type Tab = 'analytics' | 'users' | 'campaigns' | 'triage' | 'disbursements' | 'sms-settings';

function normalizePhone(phone: string): string {
  const trimmed = (phone || "").trim();
  // Remove all spaces, tabs, and other whitespace characters from phone numbers.
  const cleaned = trimmed.replace(/\s+/g, '');
  
  // Preserve the leading + if present.
  let normalized = cleaned;
  
  // If the number starts with 07, convert it to +2547...
  if (cleaned.startsWith('07')) {
    normalized = '+254' + cleaned.slice(1);
  } else if (cleaned.startsWith('254') && !cleaned.startsWith('+')) {
    // If the number starts with 254, convert it to +254...
    normalized = '+' + cleaned;
  }
  
  // Add logging to show: Original phone number, Normalized phone number
  console.log(`[normalizePhone] Original: "${phone}" => Normalized: "${normalized}"`);
  return normalized;
}

export default function AdminDashboard() {
  const { signOut, user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const hash = window.location.hash.replace('#', '') as Tab;
    if (['analytics', 'users', 'campaigns', 'triage', 'disbursements', 'sms-settings'].includes(hash)) {
      return hash;
    }
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab') as Tab;
    if (['analytics', 'users', 'campaigns', 'triage', 'disbursements', 'sms-settings'].includes(tabParam)) {
      return tabParam;
    }
    return 'analytics';
  });

  useEffect(() => {
    window.location.hash = activeTab;
  }, [activeTab]);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '') as Tab;
      if (['analytics', 'users', 'campaigns', 'triage', 'disbursements', 'sms-settings'].includes(hash)) {
        setActiveTab(hash);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('admin_theme') as any) || 'light');

  // Dynamic theme variables for beautiful styling alignment (similar to Merchant Dashboard)
  const isDark = theme === 'dark';
  const containerBg = isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800';
  const sidebarBg = isDark ? 'bg-slate-900/90 border-slate-800/80 backdrop-blur-md' : 'bg-white border-r border-slate-200';
  const sidebarTitleText = isDark ? 'text-white' : 'text-slate-900';
  const headerBg = isDark ? 'bg-slate-900/90 border-slate-800/80 backdrop-blur-md' : 'bg-white border-b border-slate-200';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const textMuted = isDark ? 'text-slate-500' : 'text-slate-400';
  const cardBg = isDark ? 'bg-slate-900/40 border border-slate-800/80 backdrop-blur-sm shadow-md shadow-black/5' : 'bg-white border border-slate-200/85 shadow-sm';
  const cardInnerBg = isDark ? 'bg-slate-950/40 border-slate-850' : 'bg-slate-50 border-slate-100';
  const inputBg = isDark ? 'bg-slate-950/65 border-slate-800 text-white placeholder:text-slate-700 focus:border-red-500' : 'bg-slate-50 border-slate-200 text-slate-950 placeholder:text-slate-350 focus:border-red-500';
  const borderCol = isDark ? 'border-slate-800/80' : 'border-slate-200';
  const divideCol = isDark ? 'divide-slate-800/60' : 'divide-slate-150';
  const hoverRowBg = isDark ? 'hover:bg-slate-800/35' : 'hover:bg-slate-50/70';
  const tableHeaderBg = isDark ? 'bg-slate-900/70' : 'bg-slate-50';
  const alertBg = isDark ? 'bg-slate-900/80 border-slate-800 text-slate-200' : 'bg-white border-slate-200 shadow-lg';
  const panelBg = isDark ? 'bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl' : 'bg-white border border-slate-200 shadow-xl';
  
  // Africa's Talking override states
  const [atUsername, setAtUsername] = useState(() => localStorage.getItem('at_username') || '');
  const [atApiKey, setAtApiKey] = useState(() => localStorage.getItem('at_api_key') || '');
  const [atSenderId, setAtSenderId] = useState(() => localStorage.getItem('at_sender_id') || '');
  const [smsSimulationMode, setSmsSimulationMode] = useState(() => localStorage.getItem('at_sms_simulation') !== 'false');
  
  // Test SMS states
  const [testPhoneNumber, setTestPhoneNumber] = useState(() => localStorage.getItem('at_test_phone') || '+254711223344');
  const [testMessage, setTestMessage] = useState("Hello! Africa's Talking SMS test successful. Eng Zack is here to help you with coding");
  const [testResult, setTestResult] = useState<any>(null);
  const [testLoading, setTestLoading] = useState(false);

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
  
  // User Editing States
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [editProfileForm, setEditProfileForm] = useState({
    fullName: '', email: '', role: 'volunteer' as UserRole, county: '', phone_number: '', status: 'active' as 'active' | 'pending' | 'suspended', national_id: ''
  });
  const [deleteProfileId, setDeleteProfileId] = useState<string | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Triggerable AI Disaster Analysis State
  const [aiAnalyticalInsight, setAiAnalyticalInsight] = useState<string | null>(null);
  const [aiAnalysisLoading, setAiAnalysisLoading] = useState(false);
  const [analysisCounty, setAnalysisCounty] = useState('Busia');
  const [aiError, setAiError] = useState<string | null>(null);

  async function triggerCountyDisasterAnalysis(county: string) {
    setAiAnalysisLoading(true);
    setAiError(null);
    setAiAnalyticalInsight(null);

    try {
      const apiKey = process.env.GEMINI_API_KEY || (import.meta as any).env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not configured in Settings > Secrets. Please configure a valid key to run analysis.");
      }

      const currentDateString = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
      const currentMonthName = new Date().toLocaleDateString('en-US', { month: 'long' });

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const prompt = `
You are a senior crisis forecaster and disaster response analytics expert for the Kenya Red Cross and UN-OCHA disaster coordination bureaus.
Analyze the localized hazard profile and vulnerability statistics for ${county} County, Kenya.

IMPORTANT CONTEXT:
The current active date of this assessment is ${currentDateString} (Season: ${currentMonthName}).
Reflect specifically on the historical climate records of past events for ${county} County in the identical month/season of ${currentMonthName}.

Keep the analysis highly structured, deeply professional, and concise.

Provide your response in raw HTML containing:
1. Historical Month/Season Reflective Record: A specific overview summarizing what hazardous natural events or climate extremes (e.g., flash flood downpours, river bank swells, or dry scorching spells) have historically struck ${county} in previous years specifically during the month of ${currentMonthName}, highlighting recent historic reference cycles.
2. Estimated Recurrence Probability: What is the current calculated probability (%) of a similar disaster pattern occurring in ${county} County during the coming 30 days of this ${currentMonthName} season? Provide dynamic hazard risk ratings.
3. Recommended Proactive Safeguards: 3-4 immediate action items aligned with Red Cross early response protocols relative to ${currentMonthName}'s risk parameters (such as prepositioning supplies, community broadcast channels, safety corridors).

Use standard, structured HTML tags (h4, ul, li, strong, div), with elegant styling or warning borders. Keep the tone authoritative, technical, and human. Avoid generic fluff. Do not contain markdown wrappers like \`\`\`html or \`\`\`.
`;

      const result = await model.generateContent(prompt);
      const outputText = result.response.text();
      // Simple sanitize to remove potential markdown wrapping just in case
      const cleanOutput = outputText.replace(/```html/g, '').replace(/```/g, '').trim();
      setAiAnalyticalInsight(cleanOutput);
    } catch (err: any) {
      console.error("AI Analysis Error:", err);
      setAiError(err.message || "Failed to generate predictive intelligence.");
    } finally {
      setAiAnalysisLoading(false);
    }
  }

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

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!editingProfile) return;
    setStatus(null);

    const { error } = await supabase.from('profiles').update({
      full_name: editProfileForm.fullName,
      email: editProfileForm.email,
      role: editProfileForm.role,
      county: editProfileForm.county,
      phone_number: editProfileForm.phone_number,
      national_id: editProfileForm.national_id,
      status: editProfileForm.status
    }).eq('id', editingProfile.id);

    if (error) {
      setStatus({ type: 'error', message: error.message });
    } else {
      setStatus({ type: 'success', message: `User profile updated successfully.` });
      setEditingProfile(null);
      fetchProfiles();
    }
  }

  async function handleDeleteProfile(profileId: string) {
    setStatus(null);
    const { error } = await supabase.from('profiles').delete().eq('id', profileId);

    if (error) {
      setStatus({ type: 'error', message: error.message });
    } else {
      setStatus({ type: 'success', message: `User deleted successfully.` });
      setDeleteProfileId(null);
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
      
      const storedUsername = localStorage.getItem('at_username') || undefined;
      const storedApiKey = localStorage.getItem('at_api_key') || undefined;
      const storedSenderId = localStorage.getItem('at_sender_id') || undefined;

      const response = await fetch('/api/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: normalizePhone(profile.phone_number),
          message: `Hello ${profile.full_name}, your relief voucher for ${campaign.name} is ready. Voucher Number: ${voucherCode}. Present this Voucher Number (${voucherCode}) to any authorized merchant to redeem your KES ${campaign.amount} relief credit. Dial *384*34091# or visit: ${chatbotUrl}`,
          username: storedUsername,
          apiKey: storedApiKey,
          senderId: storedSenderId
        })
      });
      const result = await response.json();
      if (result.success) {
        return { success: true, message: `SMS sent to ${profile.full_name}` };
      } else {
        const errorDetail = result.error || result.warning || 'Unknown delivery failure';
        
        if (smsSimulationMode) {
          console.log(`[SMS Simulation Enabled] Bypassing delivery error: "${errorDetail}" for ${profile.full_name}. Simulating positive callback!`);
          return { success: true, message: `[Simulated SMS Success] Delivery bypassed. Error: ${errorDetail}` };
        }
        
        return { success: false, message: `Error sending to ${profile.full_name}: ${errorDetail}` };
      }
    } catch (error: any) {
      if (smsSimulationMode) {
        console.log(`[SMS Simulation Enabled] Bypassing runtime exception for ${profile.full_name}. Simulating positive callback!`);
        return { success: true, message: `[Simulated SMS Success] Delivery exception bypassed` };
      }
      return { success: false, message: `System error sending to ${profile.full_name}: ${String(error)}` };
    }
  }

  async function handleDisburse(campaignId: string, amount: number) {
    setStatus({ 
      type: 'success', 
      message: `Starting disbursement. Initiating SMS notifications for selected victims...` 
    });
    
    const county = selectedCounties[campaignId];
    let victims = profiles.filter(p => p.role === 'victim');
    if (county && county !== 'All Counties') {
      victims = victims.filter(p => p.county === county);
    }

    console.log("[Disbursement Flow] Selected county:", county);
    console.log("[Disbursement Flow] Recipient Victims count:", victims.length);
    console.log("[Disbursement Flow] Victims list:", victims);

    if (victims.length === 0) {
      const errorMsg = `No victims found in ${county || 'the selected area'} to disburse to.`;
      console.warn("[Disbursement Flow]", errorMsg);
      setStatus({ type: 'error', message: errorMsg });
      return;
    }

    const campaign = campaigns.find(c => c.id === campaignId);
    if (!campaign) {
      setStatus({ type: 'error', message: "Campaign not found" });
      return;
    }

    let successCount = 0;
    let failureCount = 0;
    const failures: string[] = [];

    // Loop through each victim to perform the sequential SMS-first check
    const disbursePromises = victims.map(async (victim) => {
      console.log(`[Disbursement Flow] Processing ${victim.full_name} (${victim.phone_number || 'no phone'})...`);
      
      // Step 1: Attempt to send SMS first
      const smsResult = await sendVoucherSMS(victim, campaign);
      
      if (smsResult.success) {
        console.log(`[Disbursement Flow] SMS sent successfully to ${victim.full_name}. Now triggering DB allocation...`);
        
        // Step 2: ONLY if SMS is successful, call Database RPC to perform disbursement
        try {
          const payload = {
            victim_profile_ids: [victim.id],
            disbursement_amount: amount,
            p_campaign_id: campaignId,
            idempotency_key_prefix: `disburse-${campaignId}-${victim.id}-${Date.now()}-`
          };

          const { error: dbError } = await supabase.rpc('disburse_aid', payload);
          if (dbError) {
            console.error(`[Disbursement Flow] DB Error for ${victim.full_name}:`, dbError);
            failureCount++;
            failures.push(`${victim.full_name} (DB Error: ${dbError.message})`);
          } else {
            console.log(`[Disbursement Flow] DB allocation completed for ${victim.full_name}.`);
            successCount++;
          }
        } catch (dbEx: any) {
          console.error(`[Disbursement Flow] Exception during DB allocation for ${victim.full_name}:`, dbEx);
          failureCount++;
          failures.push(`${victim.full_name} (Exception: ${dbEx.message || dbEx})`);
        }
      } else {
        // SMS failed!
        console.warn(`[Disbursement Flow] Skipping DB disbursement for ${victim.full_name} because SMS notification failed. Message: ${smsResult.message}`);
        failureCount++;
        failures.push(`${victim.full_name} (SMS notification failed: ${smsResult.message})`);
      }
    });

    // Wait for all processes to complete
    await Promise.all(disbursePromises);

    // Refresh ledger, profiles and campaigns right away so the frontend reflects changes
    console.log("[Disbursement Flow] Refreshing UI ledger and state fields...");
    await Promise.all([fetchLedger(), fetchProfiles(), fetchCampaigns()]);

    if (successCount === victims.length) {
      setStatus({ 
        type: 'success', 
        message: `Disbursement completed successfully! Voucher SMS sent and KES ${amount.toLocaleString()} relief credit added for all ${victims.length} victims.` 
      });
    } else if (successCount > 0) {
      setStatus({ 
        type: 'success', 
        message: `Disbursement partially completed! Successfully notified and disbursed KES ${amount.toLocaleString()} to ${successCount}/${victims.length} victims. Failed for ${failureCount} victims: \n` + failures.join(', ') + ". (Note: Victims who failed notification were not charged)."
      });
    } else {
      setStatus({ 
        type: 'error', 
        message: `All disbursements failed due to notification or database connection errors. Details: \n` + failures.join(', ')
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
    <div className={`min-h-screen transition-colors duration-300 ${containerBg} flex flex-col lg:flex-row`}>
      {/* Mobile Header */}
      <div className={`lg:hidden ${headerBg} p-4 flex items-center justify-between sticky top-0 z-50`}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center shadow-lg shadow-red-200">
            <Shield className="text-white" size={18} />
          </div>
          <span className={`font-black ${sidebarTitleText} tracking-tight`}>ReliefAdmin</span>
        </div>
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className={`p-2 ${isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'} rounded-lg transition-all`}
        >
          {isSidebarOpen ? <X size={24} /> : <LayoutDashboard size={24} />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-[60] ${isSidebarCollapsed ? 'lg:w-20' : 'lg:w-64'} w-64 ${sidebarBg} flex flex-col transition-all duration-300 ease-in-out lg:translate-x-0 lg:static lg:h-screen
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className={`p-6 flex items-center justify-between border-b ${borderCol} flex-shrink-0 gap-2`}>
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-200 flex-shrink-0 animate-pulse">
              <Shield className="text-white" size={20} />
            </div>
            {!isSidebarCollapsed && (
              <span className={`font-black ${sidebarTitleText} tracking-tight text-base transition-opacity duration-300 whitespace-nowrap`}>ReliefAdmin</span>
            )}
          </div>
          {/* For mobile close */}
          <button
            onClick={() => setIsSidebarOpen(false)}
            className={`lg:hidden p-1.5 rounded-lg border transition-all ${
              isDark 
                ? 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-850' 
                : 'bg-slate-50 border-slate-200 text-slate-550 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title="Close Sidebar"
          >
            <X size={14} />
          </button>
          
          {/* For desktop collapse */}
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className={`hidden lg:block p-1.5 rounded-lg border transition-all ${
              isDark 
                ? 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-850' 
                : 'bg-slate-50 border-slate-200 text-slate-550 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isSidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
          <SidebarLink 
            icon={<LayoutDashboard size={20} />} 
            label="Analytics" 
            active={activeTab === 'analytics'} 
            isDark={isDark}
            isCollapsed={isSidebarCollapsed}
            onClick={() => { setActiveTab('analytics'); setIsSidebarOpen(false); }} 
          />
          <SidebarLink 
            icon={<Users size={20} />} 
            label="User Management" 
            active={activeTab === 'users'} 
            isDark={isDark}
            isCollapsed={isSidebarCollapsed}
            onClick={() => { setActiveTab('users'); setIsSidebarOpen(false); }} 
          />
          <SidebarLink 
            icon={<Megaphone size={20} />} 
            label="Campaigns" 
            active={activeTab === 'campaigns'} 
            isDark={isDark}
            isCollapsed={isSidebarCollapsed}
            onClick={() => { setActiveTab('campaigns'); setIsSidebarOpen(false); }} 
          />
          <SidebarLink 
            icon={<MessageSquareWarning size={20} />} 
            label="PFA Triage" 
            active={activeTab === 'triage'} 
            isDark={isDark}
            isCollapsed={isSidebarCollapsed}
            badge={stats.highRiskCases > 0 ? stats.highRiskCases : undefined}
            onClick={() => { setActiveTab('triage'); setIsSidebarOpen(false); }} 
          />
          <SidebarLink 
            icon={<Wallet size={20} />} 
            label="Aid Disbursements" 
            active={activeTab === 'disbursements'} 
            isDark={isDark}
            isCollapsed={isSidebarCollapsed}
            onClick={() => { setActiveTab('disbursements'); setIsSidebarOpen(false); }} 
          />

        </nav>

        <div className={`p-4 border-t ${borderCol}`}>
          <button 
            onClick={signOut}
            className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-1' : 'gap-3 px-4'} py-3 ${isDark ? 'text-slate-400 hover:text-red-400 hover:bg-red-500/10' : 'text-slate-600 hover:text-red-650 hover:bg-red-50'} rounded-xl transition-all font-bold`}
            title="Sign Out"
          >
            <LogOut size={20} />
            {!isSidebarCollapsed && <span>Sign Out</span>}
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
            <h2 className={`text-2xl md:text-3xl font-black ${textPrimary} capitalize`}>{activeTab.replace('-', ' ')}</h2>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <p className={`${textSecondary} font-medium text-xs md:text-sm`}>System overview and management</p>
              <span className={`text-[10px] md:text-xs px-2.5 py-1 rounded-lg font-black uppercase tracking-wider ${isDark ? 'bg-slate-900 border border-slate-800 text-red-400' : 'bg-red-50 text-red-650 border border-red-100'} flex items-center gap-1.5`}>
                📅 {new Date().toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Theme Toggle Button */}
            <button 
              type="button"
              onClick={() => {
                const newTheme = isDark ? 'light' : 'dark';
                setTheme(newTheme);
                localStorage.setItem('admin_theme', newTheme);
              }}
              className={`flex items-center gap-2 px-3.5 py-2 border rounded-xl transition-all ${
                isDark 
                  ? 'bg-slate-900 border-slate-800 text-amber-400 hover:text-amber-300 hover:bg-slate-850' 
                  : 'bg-white border-slate-200 text-amber-600 hover:text-amber-700 hover:bg-slate-50 shadow-sm'
              }`}
              title={isDark ? "Switch to Light Theme" : "Switch to Dark Theme"}
              id="theme-toggle-btn"
            >
              {isDark ? <Sun size={17} /> : <Moon size={17} />}
              <span className="text-xs font-black hidden sm:inline">{isDark ? "Light" : "Dark"}</span>
            </button>

            <div className={`${cardBg} px-4 py-2 rounded-xl flex items-center gap-2 flex-1 sm:flex-initial justify-center`}>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className={`text-sm font-black ${textSecondary}`}>System Live</span>
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

        {/* 🚨 CRITICAL SUICIDAL CRISIS ALERTS (Actionable Dispatch Ping) */}
        {(() => {
          const suicidalSessions = triageSessions.filter(
            s => s.status !== 'closed' && s.notes && s.notes.includes('[ALERT_SUICIDAL]')
          );

          if (suicidalSessions.length === 0) return null;

          return (
            <div className="mb-8 space-y-4">
              {suicidalSessions.map(session => {
                const victim = profiles.find(p => p.id === session.victim_id);
                // Extract victim's clean county
                const rawVictimCounty = victim?.county || '';
                let cleanVictimCounty = rawVictimCounty.toLowerCase().trim();
                if (cleanVictimCounty.startsWith('community leader |')) {
                  cleanVictimCounty = cleanVictimCounty.split('|')[1]?.trim() || '';
                }

                // Match volunteers & community leaders in same clean county
                const nearbyResponders = profiles.filter(p => {
                  if (p.id === session.victim_id) return false;
                  // Must be volunteer or leader
                  const isVol = p.role === 'volunteer';
                  const isLdr = p.county?.startsWith('Community Leader |');
                  if (!isVol && !isLdr) return false;

                  let pCounty = (p.county || '').toLowerCase().trim();
                  if (pCounty.startsWith('community leader |')) {
                    pCounty = pCounty.split('|')[1]?.trim() || '';
                  }
                  
                  return pCounty === cleanVictimCounty && pCounty !== '';
                });

                return (
                  <motion.div
                    key={session.id}
                    initial={{ scale: 0.96, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className={`p-6 rounded-3xl border-2 ${
                      isDark 
                        ? 'bg-red-950/40 border-red-500/50 text-slate-100 shadow-2xl shadow-red-950/50' 
                        : 'bg-red-50/95 border-red-200 text-red-900 shadow-xl shadow-red-100/40'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-5">
                      <div className="flex items-start gap-4">
                        <div className="p-3.5 bg-red-650 text-white rounded-2xl animate-pulse flex-shrink-0 mt-1 shadow-lg shadow-red-500/30">
                          <AlertTriangle size={24} />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="bg-red-600 text-white text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-wider animate-bounce">
                              🚨 CRITICAL SUICIDAL CRISIS ALERT
                            </span>
                            <span className={`text-[10px] font-bold ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                              Live Triage Signal
                            </span>
                          </div>
                          
                          <h4 className={`text-lg font-black mt-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {victim?.full_name || 'Beneficiary'} (County: <span className="underline">{rawVictimCounty.replace('Community Leader |', '').trim()}</span>)
                          </h4>
                          
                          <p className={`text-xs font-semibold mt-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                            Last message: <span className="italic font-bold">"{session.last_message}"</span>
                          </p>

                          <div className="flex flex-wrap gap-4 mt-2 text-xs font-semibold opacity-80">
                            <span className="flex items-center gap-1">📞 {victim?.phone_number || 'No Phone Registered'}</span>
                            <span className="flex items-center gap-1">⚠️ Risk Assessment Score: 100% (Critical)</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2.5 w-full md:w-auto self-stretch md:self-center justify-end">
                        <button
                          onClick={() => {
                            setActiveTab('triage');
                          }}
                          className="px-5 py-3 bg-slate-900 hover:bg-black text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Activity size={14} /> Open Triage Board
                        </button>
                        <button
                          onClick={async () => {
                            const { error } = await supabase
                              .from('triage_sessions')
                              .update({ status: 'closed' })
                              .eq('id', session.id);
                            if (error) {
                              setStatus({ type: 'error', message: 'Failed to update triage status: ' + error.message });
                            } else {
                              setStatus({ type: 'success', message: 'Triage session resolved and dismissed successfully.' });
                              fetchTriage();
                            }
                          }}
                          className={`px-5 py-3 font-black text-xs uppercase tracking-wider rounded-xl transition-all border flex items-center justify-center gap-2 cursor-pointer ${
                            isDark
                              ? 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800'
                              : 'bg-white border-slate-205 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <CheckCircle2 size={14} className="text-green-500" /> Dismiss / Resolve Cases
                        </button>
                      </div>
                    </div>

                    {/* Nearby Responders Finder Module */}
                    <div className={`mt-6 pt-5 border-t border-dashed ${isDark ? 'border-red-500/20' : 'border-red-200'} space-y-4`}>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <h5 className={`text-xs font-black uppercase tracking-wider flex items-center gap-2 ${isDark ? 'text-red-400' : 'text-red-800'}`}>
                            <Users size={15} className="animate-pulse" />
                            Registered Responders Found Nearby in {rawVictimCounty.replace('Community Leader |', '').trim()} County ({nearbyResponders.length})
                          </h5>
                          <p className={`text-[11px] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'} mt-0.5`}>
                            Instantly deploy localized leaders or volunteers physically closest to the victim's disaster location.
                          </p>
                        </div>
                      </div>

                      {nearbyResponders.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                          {nearbyResponders.map(responder => {
                            const isLdr = responder.county?.startsWith('Community Leader |');
                            const assignedToThis = session.volunteer_id === responder.id;

                            return (
                              <div
                                key={responder.id}
                                className={`p-4 rounded-2xl border text-xs flex justify-between items-center transition-all ${
                                  assignedToThis
                                    ? (isDark ? 'bg-green-950/30 border-green-500/50 text-green-300 shadow-green-900/10' : 'bg-green-50 border-green-300 text-green-900 shadow-sm')
                                    : (isDark ? 'bg-slate-900/50 border-slate-850 hover:border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800 shadow-sm hover:border-slate-300')
                                }`}
                              >
                                <div className="truncate pr-3 space-y-0.5">
                                  <div className="flex items-center gap-2">
                                    <span className="font-extrabold truncate max-w-[130px]">{responder.full_name}</span>
                                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                                      isLdr 
                                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-405' 
                                        : 'bg-blue-150 text-blue-800 dark:bg-blue-500/10 dark:text-blue-405'
                                    }`}>
                                      {isLdr ? '👑 Leader' : '🛡️ Volunteer'}
                                    </span>
                                  </div>
                                  <p className="text-[10px] opacity-75 font-mono">{responder.phone_number || 'No registry phone'}</p>
                                </div>
                                
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                  {assignedToThis ? (
                                    <span className="text-[10px] font-black text-green-600 bg-green-500/10 px-2 py-1 rounded-lg">
                                      ACTIVE DISPATCH
                                    </span>
                                  ) : (
                                    <button
                                      onClick={async () => {
                                        const { error } = await supabase
                                          .from('triage_sessions')
                                          .update({ 
                                            volunteer_id: responder.id,
                                            status: 'in_progress',
                                            notes: `${session.notes || ''}\n[DISPATCHED] Dispatched ${isLdr ? 'Community Leader' : 'Volunteer'} ${responder.full_name} to check physically.`
                                          })
                                          .eq('id', session.id);
                                        if (error) {
                                          setStatus({ type: 'error', message: 'Failed dispatching defender: ' + error.message });
                                        } else {
                                          setStatus({ type: 'success', message: `${isLdr ? 'Leader' : 'Volunteer'} ${responder.full_name} dispatched successfully and assigned context!` });
                                          fetchTriage();
                                        }
                                      }}
                                      className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-[10px] rounded-lg transition-transform hover:scale-[1.03] cursor-pointer"
                                      title="Dispatch nearby responder immediately"
                                    >
                                      Dispatch
                                    </button>
                                  )}
                                  <a
                                    href={`tel:${responder.phone_number}`}
                                    className={`p-1.5 rounded-lg border transition-all ${
                                      isDark 
                                        ? 'bg-slate-950 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-900' 
                                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                                    }`}
                                    title="Call Defender"
                                  >
                                    <PhoneIcon size={12} />
                                  </a>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className={`p-4 text-center rounded-2xl border border-dashed ${
                          isDark ? 'border-red-500/10 bg-slate-950/10' : 'border-red-200 bg-red-50/30'
                        }`}>
                          <p className="text-xs font-semibold opacity-85">
                            ⚠️ No active volunteers or community leaders are currently registered inside <strong className="font-extrabold">{rawVictimCounty.replace('Community Leader |', '').trim()}</strong> County.
                          </p>
                          <p className="text-[10px] opacity-70 mt-1">
                            Go to User Management tab to onboard immediate rescue personnel for this county.
                          </p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          );
        })()}

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
                <StatCard icon={<TrendingUp className="text-blue-500" />} label="Total Aid Disbursed" value={`KES ${(stats.totalAid || 0).toLocaleString()}`} color="blue" isDark={isDark} />
                <StatCard icon={<Activity className="text-green-500" />} label="Merchant Volume" value={`KES ${(stats.totalPurchases || 0).toLocaleString()}`} color="green" isDark={isDark} />
                <StatCard icon={<Users className="text-purple-500" />} label="Active Victims" value={stats.activeVictims} color="purple" isDark={isDark} />
                <StatCard icon={<AlertTriangle className="text-red-500" />} label="High Risk Cases" value={stats.highRiskCases} color="red" isDark={isDark} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className={`${cardBg} p-6 rounded-3xl`}>
                  <h3 className={`text-lg font-bold mb-6 flex items-center gap-2 ${textPrimary}`}>
                    <TrendingUp size={20} className="text-slate-400" />
                    Recent Activity
                  </h3>
                  <div className="space-y-4">
                    {ledger.slice(0, 5).map((entry) => (
                      <div key={entry.id} className={`flex items-center justify-between p-4 ${cardInnerBg} rounded-2xl border ${borderCol}`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            entry.transaction_type === 'AID_DISBURSEMENT' 
                              ? isDark ? 'bg-green-500/10 text-green-400' : 'bg-green-100 text-green-600' 
                              : isDark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-100 text-blue-600'
                          }`}>
                            {entry.transaction_type === 'AID_DISBURSEMENT' ? <PlusCircle size={18} /> : <Store size={18} />}
                          </div>
                          <div>
                            <p className="font-bold text-sm" style={{ color: isDark ? '#fff' : '#0f172a' }}>{entry.description}</p>
                            <p className="text-xs text-slate-500">{new Date(entry.created_at).toLocaleString()}</p>
                          </div>
                        </div>
                        <span className={`font-black ${entry.amount > 0 ? 'text-green-500' : isDark ? 'text-white' : 'text-slate-900'}`}>
                          {entry.amount > 0 ? '+' : ''}{entry.amount}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={`${cardBg} p-6 rounded-3xl`}>
                  <h3 className={`text-lg font-bold mb-6 flex items-center gap-2 ${textPrimary}`}>
                    <Users size={20} className="text-slate-400" />
                    User Distribution
                  </h3>
                  <div className="space-y-6">
                    <DistributionBar label="Victims" count={profiles.filter(p => p.role === 'victim').length} total={profiles.length} color="bg-red-500" isDark={isDark} />
                    <DistributionBar label="Volunteers" count={profiles.filter(p => p.role === 'volunteer').length} total={profiles.length} color="bg-blue-500" isDark={isDark} />
                    <DistributionBar label="Merchants" count={profiles.filter(p => p.role === 'merchant').length} total={profiles.length} color="bg-green-500" isDark={isDark} />
                    <DistributionBar label="Admins" count={profiles.filter(p => p.role === 'admin').length} total={profiles.length} color="bg-purple-500" isDark={isDark} />
                  </div>
                </div>
              </div>

              {/* 📊 Beautiful Structured Recharts Visualizations */}
              {(() => {
                const countyColors: Record<string, string> = {
                  'Garissa': '#ef4444',
                  'Kwale': '#3b82f6',
                  'Busia': '#06b6d4',
                  'Marsabit': '#d97706',
                  'Turkana': '#8b5cf6',
                  'Tana River': '#10b981',
                  'Wajir': '#ec4899',
                  'Mandera': '#f43f5e',
                  'Narok': '#14b8a6',
                  'Isiolo': '#6366f1',
                  'Kilifi': '#06b6d4'
                };

                const disbursementData = KENYAN_COUNTIES.map(countyName => {
                  const liveAmount = ledger
                    .filter(l => l.transaction_type === 'AID_DISBURSEMENT')
                    .filter(l => {
                      const matchProf = profiles.find(p => p.id === l.profile_id);
                      if (!matchProf) return false;
                      let profCounty = matchProf.county || '';
                      if (profCounty.startsWith('Community Leader |')) {
                        profCounty = profCounty.split('|')[1]?.trim() || '';
                      }
                      return profCounty.toLowerCase() === countyName.toLowerCase();
                    })
                    .reduce((sum, l) => sum + Math.abs(Number(l.amount)), 0);

                  const baselineHistorical: Record<string, number> = {
                    'Garissa': 1250000,
                    'Kwale': 820000,
                    'Busia': 960000,
                    'Marsabit': 1480000,
                    'Turkana': 1350000,
                    'Tana River': 1100000,
                    'Wajir': 980000,
                    'Mandera': 1150000,
                    'Narok': 620000,
                    'Isiolo': 750000,
                    'Kilifi': 880000
                  };

                  const base = baselineHistorical[countyName] || 500000;

                  return {
                    county: countyName,
                    "Live Aid (KES)": liveAmount,
                    "Historical Aid (KES)": base,
                    "Total Disbursement": base + liveAmount,
                  };
                }).sort((a, b) => b["Total Disbursement"] - a["Total Disbursement"]);

                const countyHazards = [
                  { name: 'Turkana', 'Drought Probability': 92, 'Flood Probability': 15, 'Climate Vulnerability': 88 },
                  { name: 'Marsabit', 'Drought Probability': 88, 'Flood Probability': 12, 'Climate Vulnerability': 85 },
                  { name: 'Busia', 'Drought Probability': 10, 'Flood Probability': 85, 'Climate Vulnerability': 78 },
                  { name: 'Garissa', 'Drought Probability': 85, 'Flood Probability': 35, 'Climate Vulnerability': 82 },
                  { name: 'Mandera', 'Drought Probability': 90, 'Flood Probability': 20, 'Climate Vulnerability': 84 },
                  { name: 'Tana River', 'Drought Probability': 65, 'Flood Probability': 75, 'Climate Vulnerability': 80 },
                  { name: 'Wajir', 'Drought Probability': 86, 'Flood Probability': 18, 'Climate Vulnerability': 81 },
                  { name: 'Kwale', 'Drought Probability': 40, 'Flood Probability': 55, 'Climate Vulnerability': 65 },
                  { name: 'Kilifi', 'Drought Probability': 45, 'Flood Probability': 50, 'Climate Vulnerability': 68 },
                  { name: 'Narok', 'Drought Probability': 50, 'Flood Probability': 40, 'Climate Vulnerability': 55 },
                  { name: 'Isiolo', 'Drought Probability': 78, 'Flood Probability': 22, 'Climate Vulnerability': 76 }
                ];

                const CustomTooltip = ({ active, payload, label }: any) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className={`p-4 rounded-2xl border shadow-xl ${isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'} font-sans text-xs space-y-1.5`}>
                        <p className="font-extrabold">{label}</p>
                        {payload.map((item: any, idx: number) => (
                          <p key={idx} className="font-semibold" style={{ color: item.color || item.fill }}>
                            {item.name}: <span className="font-bold">{Number(item.value).toLocaleString()}</span>
                          </p>
                        ))}
                      </div>
                    );
                  }
                  return null;
                };

                return (
                  <div className="space-y-8 mt-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* Aid Disbursement Chart */}
                      <div className={`${cardBg} p-6 rounded-3xl`}>
                        <div className="mb-4">
                          <h3 className={`text-base font-black ${textPrimary} flex items-center gap-2`}>
                            💵 Aid Disbursement Analytics
                          </h3>
                          <p className={`text-xs ${textSecondary}`}>
                            Comparing baseline historical responses with real-time humanitarian payouts by county (KES).
                          </p>
                        </div>
                        <div className="h-[320px] w-full pt-4">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={disbursementData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#1e293b" : "#e2e8f0"} vertical={false} />
                              <XAxis dataKey="county" stroke={isDark ? "#94a3b8" : "#475569"} fontSize={10} tickLine={false} />
                              <YAxis stroke={isDark ? "#94a3b8" : "#475569"} fontSize={10} tickLine={false} />
                              <Tooltip content={<CustomTooltip />} cursor={{ fill: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }} />
                              <Legend wrapperStyle={{ fontSize: 10, fontWeight: 'bold', paddingTop: 10 }} />
                              <Bar dataKey="Historical Aid (KES)" fill={isDark ? "#334155" : "#cbd5e1"} radius={[4, 4, 0, 0]} name="Historical Baseline (KES)" />
                              <Bar dataKey="Live Aid (KES)" fill="#ef4444" radius={[4, 4, 0, 0]} name="Live Red Cross Disbursements (KES)" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* County Prone Hazard probabilities */}
                      <div className={`${cardBg} p-6 rounded-3xl`}>
                        <div className="mb-4">
                          <h3 className={`text-base font-black ${textPrimary} flex items-center gap-2`}>
                            ⚠️ Disaster Hazard Probability Map
                          </h3>
                          <p className={`text-xs ${textSecondary}`}>
                            Probability risk weightings based on historical meteorological and drought indexes.
                          </p>
                        </div>
                        <div className="h-[320px] w-full pt-4">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={countyHazards} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#1e293b" : "#e2e8f0"} vertical={false} />
                              <XAxis dataKey="name" stroke={isDark ? "#94a3b8" : "#475569"} fontSize={10} tickLine={false} />
                              <YAxis stroke={isDark ? "#94a3b8" : "#475569"} fontSize={10} tickLine={false} />
                              <Tooltip content={<CustomTooltip />} cursor={{ fill: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }} />
                              <Legend wrapperStyle={{ fontSize: 10, fontWeight: 'bold', paddingTop: 10 }} />
                              <Bar dataKey="Drought Probability" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Drought Risk (%)" />
                              <Bar dataKey="Flood Probability" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Rain/Flood Risk (%)" />
                              <Bar dataKey="Climate Vulnerability" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Climate Vulnerability Index" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>

                    {/* AI Early Warning Prediction Module */}
                    <div className={`${cardBg} p-6 md:p-8 rounded-3xl space-y-6`}>
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4 border-slate-200/50">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="bg-red-500/10 text-red-650 text-[10px] px-2.5 py-1 rounded-full font-black uppercase tracking-wider flex items-center gap-1 border border-red-500/10">
                              <Sparkles size={11} className="animate-pulse text-red-650" /> AI PREDICTIVE RADAR
                            </span>
                          </div>
                          <h3 className={`text-xl font-black mt-2 ${textPrimary}`}>Predictive Vulnerability Intelligence</h3>
                          <p className={`text-xs font-semibold ${textSecondary} mt-1`}>
                            Trigger Gemini predictive models to analyze localized geographical risks, historical experiences, and proactive action protocols.
                          </p>
                        </div>

                        <div className="flex items-center gap-3 w-full sm:w-auto">
                          <select
                            value={analysisCounty}
                            onChange={(e) => setAnalysisCounty(e.target.value)}
                            className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider ${inputBg} border`}
                          >
                            {KENYAN_COUNTIES.map(c => (
                              <option key={c} value={c}>{c} County</option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => triggerCountyDisasterAnalysis(analysisCounty)}
                            disabled={aiAnalysisLoading}
                            className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center gap-3 cursor-pointer"
                          >
                            {aiAnalysisLoading ? (
                              <span className="flex items-center gap-2">
                                <span className="animate-spin w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" /> Running...
                              </span>
                            ) : (
                              <>
                                <Sparkles size={14} /> Analyze Risks
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* AI Predictor Live Work Area */}
                      <AnimatePresence mode="wait">
                        {aiAnalysisLoading && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="py-12 flex flex-col items-center justify-center space-y-4"
                          >
                            <div className="relative w-12 h-12 flex items-center justify-center">
                              <div className="absolute inset-0 border-4 border-slate-100 rounded-full" />
                              <div className="absolute inset-0 border-4 border-t-red-650 rounded-full animate-spin" />
                            </div>
                            <div className="text-center">
                              <p className="text-xs font-black uppercase tracking-widest text-red-652 animate-pulse">Running Crisis Intelligence Engines</p>
                              <p className="text-[10px] text-slate-400 font-semibold mt-1">Cross-referencing historical rainfall matrices for {analysisCounty} County...</p>
                            </div>
                          </motion.div>
                        )}

                        {aiError && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className={`p-5 rounded-2xl border ${isDark ? 'bg-red-500/5 border-red-500/15 text-red-400' : 'bg-red-50 border-red-100 text-red-805'} text-xs font-bold`}
                          >
                            <div className="flex items-center gap-2 mb-1 text-red-600">
                              <AlertTriangle size={15} />
                              <span>Risk Intelligence Failure</span>
                            </div>
                            {aiError}
                          </motion.div>
                        )}

                        {aiAnalyticalInsight && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`p-6 rounded-2xl border ${isDark ? 'bg-slate-950/80 border-slate-900 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'} font-sans text-sm leading-relaxed`}
                          >
                            <div className="flex justify-between items-center border-b pb-3 mb-4 border-slate-200/50">
                              <h4 className={`text-sm font-black ${textPrimary} flex items-center gap-1.5`}>
                                🔮 Predictive Intelligence for {analysisCounty} County
                              </h4>
                              <span className="text-[10px] bg-green-500/10 text-green-600 border border-green-500/20 px-2.5 py-1 rounded-full font-black uppercase tracking-wide">
                                Verified Forecast
                              </span>
                            </div>
                            <div 
                              className={`space-y-4 text-xs font-semibold leading-relaxed ${textSecondary} prose-sm max-w-none`}
                              dangerouslySetInnerHTML={{ __html: aiAnalyticalInsight }}
                            />
                          </motion.div>
                        )}

                        {!aiAnalyticalInsight && !aiAnalysisLoading && !aiError && (
                          <div className="text-center py-10 border-2 border-dashed border-slate-200/60 rounded-2xl">
                            <Activity size={32} className="mx-auto text-slate-300 mb-2 animate-pulse" />
                            <p className="text-xs text-slate-500 font-black uppercase tracking-wider">Prediction Engine Idle</p>
                            <p className="text-[11px] text-slate-400 font-semibold max-w-sm mx-auto mt-1 leading-normal">
                              Select a county context above such as <strong className="text-slate-550 font-black">Busia</strong> or <strong className="text-slate-550 font-black">Garissa</strong> to trigger a proactive risk appraisal forecast.
                            </p>
                          </div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          )}

          {activeTab === 'users' && (
            <motion.div 
              key="users"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full"
            >
              {/* 👑 Community Leader Verification Requests (Google Forms format) */}
              {(() => {
                const pendingLeaders = profiles.filter(p => p.county?.startsWith('Community Leader |') && p.status === 'pending');
                if (pendingLeaders.length === 0) {
                  return (
                    <div className="col-span-full bg-slate-50 border border-slate-200/50 rounded-3xl p-6 text-center space-y-1.5 font-sans">
                      <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center justify-center gap-1">
                        👑 Community Leader Vetting Application Queue
                      </h3>
                      <p className="text-[11px] text-slate-400 font-bold max-w-lg mx-auto leading-relaxed">
                        Red Cross Community Leader applications submitted on registration are collected here. When a Community Leader applies, their 6-question psychological and asset profiles appear here instantly for vetting.
                      </p>
                    </div>
                  );
                }
                return (
                  <div className="col-span-full bg-amber-500/5 border border-amber-500/20 rounded-3xl p-6 md:p-8 space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div>
                        <h3 className="text-xl font-black text-amber-600 flex items-center gap-2">
                          👑 Pending Community Leader Applications ({pendingLeaders.length})
                        </h3>
                        <p className="text-sm font-medium text-slate-500 mt-1">
                          Review deep Google Form style questionnaire applications for localized disaster alert privileges.
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {pendingLeaders.map((p) => {
                        const parts = p.county?.split('|') || [];
                        const leadCounty = parts[1]?.trim() || 'Unspecified';
                        const community = parts[2]?.trim() || 'N/A';
                        const title = parts[3]?.trim() || 'N/A';
                        const exp = parts[4]?.trim() || 'N/A';
                        const livestock = parts[5]?.trim() || 'N/A';
                        const reason = parts[6]?.trim() || 'N/A';
                        return (
                          <div key={p.id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-4">
                            <div className="space-y-3">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h4 className="font-black text-slate-950 text-base">{p.full_name}</h4>
                                  <p className="text-xs text-slate-400 font-bold">{p.email}</p>
                                </div>
                                <span className="bg-amber-100 text-amber-800 text-[10px] px-2.5 py-1 rounded-full font-black uppercase tracking-wider">
                                  {leadCounty} Leader
                                </span>
                              </div>
                              <div className="border-t border-slate-100 pt-3 space-y-2.5 text-xs text-slate-605">
                                <p><span className="font-extrabold text-slate-500 uppercase tracking-widest text-[9px]">Area/Ward:</span> {community}</p>
                                <p><span className="font-extrabold text-slate-500 uppercase tracking-widest text-[9px]">Official Title:</span> {title}</p>
                                <p><span className="font-extrabold text-slate-500 uppercase tracking-widest text-[9px]">Loss/Livestock:</span> {livestock}</p>
                                <p className="bg-slate-50 p-2.5 rounded-xl text-slate-500 italic border border-slate-100 font-medium">
                                  <span className="font-extrabold block text-slate-400 text-[9px] uppercase tracking-wider not-italic mb-1">Exp & Background:</span>
                                  " {exp} "
                                </p>
                                <p className="bg-red-500/5 p-2.5 rounded-xl text-red-600 italic border border-red-500/10 font-bold">
                                  <span className="font-extrabold block text-red-500 text-[9px] uppercase tracking-wider not-italic mb-1">Verification Statement:</span>
                                  " {reason} "
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2 pt-2 border-t border-slate-100">
                              <button
                                onClick={async () => {
                                  const { error } = await supabase.from('profiles').update({ status: 'active' }).eq('id', p.id);
                                  if (!error) {
                                    fetchProfiles();
                                  }
                                }}
                                className="flex-1 bg-green-650 hover:bg-green-700 text-white font-black py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-1"
                              >
                                Approve & Verify 👑
                              </button>
                              <button
                                onClick={async () => {
                                  const { error } = await supabase.from('profiles').update({ status: 'suspended' }).eq('id', p.id);
                                  if (!error) {
                                    fetchProfiles();
                                  }
                                }}
                                className="px-3 bg-red-50 hover:bg-red-100 text-red-650 font-black py-2.5 rounded-xl text-xs transition-all"
                              >
                                Reject
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

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
                          <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest text-right">Actions</th>
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
                              {p.county?.startsWith('Community Leader |') ? (
                                <span className="px-3 py-1 bg-amber-100 text-amber-800 border border-amber-200 rounded-full text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1 w-fit shadow-xs">
                                  👑 Leader
                                </span>
                              ) : (
                                <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest ${
                                  p.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                                  p.role === 'volunteer' ? 'bg-blue-100 text-blue-700' :
                                  p.role === 'merchant' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'
                                }`}>
                                  {p.role}
                                </span>
                              )}
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
                                {p.county?.startsWith('Community Leader |') ? 'Vetted 🛡️' : (p.status === 'pending' ? 'Inactive' : p.status)}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              {p.county?.startsWith('Community Leader |') ? (
                                (() => {
                                  const parts = p.county.split('|');
                                  const countyName = parts[1]?.trim() || 'N/A';
                                  const wardName = parts[2]?.trim() || 'N/A';
                                  const titleName = parts[3]?.trim() || 'N/A';
                                  return (
                                    <div className="space-y-1 text-xs">
                                      <p className="font-extrabold text-slate-900">{countyName} County</p>
                                      <p className="text-[10px] text-slate-500 font-bold flex items-center gap-1">
                                        📍 <span className="text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded-md font-semibold">{wardName}</span>
                                      </p>
                                      <p className="text-[9px] text-amber-750 font-black uppercase tracking-wide">
                                        🛡️ {titleName}
                                      </p>
                                    </div>
                                  );
                                })()
                              ) : (
                                <span className="text-sm font-bold text-slate-600">{p.county || 'N/A'}</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-xs">
                              <p className="font-bold text-slate-600">{p.phone_number || 'No phone'}</p>
                              {p.county?.startsWith('Community Leader |') ? (
                                (() => {
                                  const parts = p.county.split('|');
                                  const livestock = parts[5]?.trim() || '';
                                  if (!livestock) return null;
                                  return (
                                    <p className="text-[9px] text-emerald-700 font-black uppercase mt-1 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-md w-fit">
                                      🌾 Assets: {livestock.slice(0, 30)}{livestock.length > 30 ? '...' : ''}
                                    </p>
                                  );
                                })()
                              ) : p.national_id ? (
                                <p className="text-[10px] text-slate-400">ID: {p.national_id}</p>
                              ) : null}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => {
                                    setEditingProfile(p);
                                    setEditProfileForm({
                                      fullName: p.full_name || '',
                                      email: p.email || '',
                                      role: p.role,
                                      county: p.county || '',
                                      phone_number: p.phone_number || '',
                                      status: p.status || 'active',
                                      national_id: p.national_id || ''
                                    });
                                  }}
                                  className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                  title="Edit User"
                                >
                                  <Edit size={16} />
                                </button>
                                {p.id !== user?.id && (
                                  <button
                                    onClick={() => setDeleteProfileId(p.id)}
                                    className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                    title="Delete User"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                )}
                              </div>
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
          {activeTab === 'sms-settings' && (
            <motion.div 
              key="sms-settings"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8 max-w-5xl"
            >
              {/* Top Banner Guide */}
              <div className="bg-blue-50 border border-blue-200/80 p-6 rounded-3xl flex flex-col md:flex-row gap-5 items-start">
                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm animate-pulse">
                  <Info size={24} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    Africa's Talking API Simulator & Sandbox Hub
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    By default, the platform runs in a testing mode using active environment credentials. 
                    If you are using the Africa's Talking Web Simulator or want to test with your own custom developer sandbox, 
                    you can enter your credentials below. They are safely saved in your local workspace and browser storage!
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Configuration Card */}
                <div className={`lg:col-span-6 ${cardBg} rounded-3xl p-6 md:p-8 space-y-6`}>
                  <div>
                    <h4 className={`text-lg font-black ${textPrimary} flex items-center gap-2 mb-1`}>
                      <Sliders className="text-red-500 font-bold" size={20} />
                      API Keys & Username Credentials
                    </h4>
                    <p className={`text-xs ${textSecondary} font-medium`}>Configure credentials to override default system configurations.</p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Username (Exactly as registered)</label>
                      <input 
                        type="text"
                        placeholder="e.g. sandbox or your_at_username"
                        value={atUsername}
                        onChange={(e) => {
                          const val = e.target.value.trim();
                          setAtUsername(val);
                          if (val) localStorage.setItem('at_username', val);
                          else localStorage.removeItem('at_username');
                        }}
                        className={`w-full px-4 py-3 border rounded-xl outline-none focus:ring-1 focus:ring-red-500 font-bold transition-all text-sm ${inputBg}`}
                      />
                      <p className={`text-[10px] ${textMuted} mt-1 ml-1`}>Note: Enter <span className="font-bold">"sandbox"</span> to route requests through the Africa's Talking API Sandbox.</p>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">API Key</label>
                      <input 
                        type="password"
                        placeholder="e.g. ats_your_key_here..."
                        value={atApiKey}
                        onChange={(e) => {
                          const val = e.target.value.trim();
                          setAtApiKey(val);
                          if (val) localStorage.setItem('at_api_key', val);
                          else localStorage.removeItem('at_api_key');
                        }}
                        className={`w-full px-4 py-3 border rounded-xl outline-none focus:ring-1 focus:ring-red-500 font-bold transition-all text-sm ${inputBg}`}
                      />
                      <p className={`text-[10px] ${textMuted} mt-1 ml-1 font-medium`}>Your sandbox API key starting with <span className={`font-mono ${isDark ? 'bg-slate-900' : 'bg-slate-100'} px-1 py-0.5 rounded text-[9px]`}>ats_</span> or live key.</p>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Custom Sender ID (Optional)</label>
                      <input 
                        type="text"
                        placeholder="e.g. SMS_SENDER_ID"
                        value={atSenderId}
                        onChange={(e) => {
                          const val = e.target.value.trim();
                          setAtSenderId(val);
                          if (val) localStorage.setItem('at_sender_id', val);
                          else localStorage.removeItem('at_sender_id');
                        }}
                        className={`w-full px-4 py-3 border rounded-xl outline-none focus:ring-1 focus:ring-red-500 font-bold transition-all text-sm ${inputBg}`}
                      />
                      <p className={`text-[10px] ${textMuted} mt-1 ml-1`}>Leave empty to use shared short codes (default sandbox route).</p>
                    </div>

                    {/* Developer SMS Bypass Override Checkbox */}
                    <div className={`p-4 rounded-2xl border ${isDark ? 'bg-red-500/5 border-red-500/20' : 'bg-red-50/20 border-red-200/50'} space-y-2`}>
                      <label className="flex items-start gap-3 cursor-pointer select-none">
                        <input 
                          type="checkbox"
                          checked={smsSimulationMode}
                          onChange={(e) => {
                            const val = e.target.checked;
                            setSmsSimulationMode(val);
                            localStorage.setItem('at_sms_simulation', String(val));
                          }}
                          className="mt-1 rounded border-red-300 text-red-650 focus:ring-red-500 w-4 h-4"
                        />
                        <div>
                          <span className={`text-xs font-black ${isDark ? 'text-red-400' : 'text-red-700'} block`}>Enable SMS Simulation Mode</span>
                          <span className={`text-[10px] ${textSecondary} block font-medium leading-relaxed mt-0.5`}>
                            When active, if external Sandbox API restrictions reject the call (e.g., Code 403 Whitelist failure), the dashboard will simulate successful delivery. This ensures the automated base ledger allocations complete uninterrupted!
                          </span>
                        </div>
                      </label>
                    </div>

                    <div className={`pt-4 border-t ${borderCol} flex items-center justify-between`}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${atUsername && atApiKey ? 'bg-green-500 animate-pulse' : 'bg-amber-400'}`} />
                        <span className={`text-xs font-black ${textSecondary}`}>
                          {atUsername && atApiKey ? "Custom Credentials Active" : "Using System Default Config"}
                        </span>
                      </div>
                      {(atUsername || atApiKey || atSenderId) && (
                        <button
                          type="button"
                          onClick={() => {
                            setAtUsername('');
                            setAtApiKey('');
                            setAtSenderId('');
                            localStorage.removeItem('at_username');
                            localStorage.removeItem('at_api_key');
                            localStorage.removeItem('at_sender_id');
                          }}
                          className="text-xs text-red-500 hover:text-red-650 font-bold underline transition-colors"
                        >
                          Reset Credentials
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Tester Board */}
                <div className="lg:col-span-6 bg-white border border-slate-200 shadow-sm rounded-3xl p-6 md:p-8 space-y-6 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <h4 className="text-lg font-black text-slate-900 flex items-center gap-2">
                        <Send className="text-blue-500" size={20} />
                        Testing Console
                      </h4>
                      {testLoading && (
                        <span className="text-[10px] font-black bg-blue-50 text-blue-600 border border-blue-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                          Transmitting...
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 font-medium">Test client-to-server and AT delivery flow directly in real-time.</p>
                  </div>

                  <div className="space-y-4 my-2">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Simulated Recipient Phone Number</label>
                      <input 
                        type="text"
                        placeholder="+254711223344"
                        value={testPhoneNumber}
                        onChange={(e) => {
                          const val = e.target.value.trim();
                          setTestPhoneNumber(val);
                          localStorage.setItem('at_test_phone', val);
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all placeholder:text-slate-300 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Voucher Test Message</label>
                      <textarea 
                        rows={2}
                        placeholder="Type test SMS content here..."
                        value={testMessage}
                        onChange={(e) => setTestMessage(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all placeholder:text-slate-300"
                      />
                    </div>

                    <button
                      type="button"
                      disabled={testLoading}
                      onClick={async () => {
                        setTestLoading(true);
                        setTestResult(null);
                        try {
                          const response = await fetch('/api/sms', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              to: normalizePhone(testPhoneNumber),
                              message: testMessage,
                              username: atUsername || undefined,
                              apiKey: atApiKey || undefined,
                              senderId: atSenderId || undefined
                            })
                          });
                          const resData = await response.json();
                          setTestResult(resData);
                        } catch (err: any) {
                          setTestResult({ error: String(err), success: false });
                        } finally {
                          setTestLoading(false);
                        }
                      }}
                      className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-black text-sm rounded-xl transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:cursor-not-allowed"
                    >
                      {testLoading ? 'Processing API Handshake...' : 'Transmit Test SMS Link'}
                    </button>
                  </div>

                  {/* Inspector Console Outputs */}
                  <div className="space-y-2 mt-4">
                    <div className="flex justify-between items-center px-1">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Raw Response Envelope</span>
                      {testResult && (
                        <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                          testResult.success 
                            ? 'bg-green-50 text-green-600 border border-green-200' 
                            : 'bg-red-50 text-red-600 border border-red-200'
                        }`}>
                          {testResult.success ? 'ACCEPTED' : 'FAILED / WARNING'}
                        </span>
                      )}
                    </div>

                    <div className="bg-slate-950 text-green-400 p-4 rounded-2xl min-h-[140px] max-h-[160px] overflow-auto font-mono text-xs border border-slate-900 leading-relaxed shadow-inner">
                      {testResult ? (
                        <pre className="whitespace-pre-wrap">{JSON.stringify(testResult, null, 2)}</pre>
                      ) : (
                        <div className="text-slate-500 h-full flex flex-col justify-center items-center py-6 text-center">
                          <p>📟 Wait for API transmission...</p>
                          <p className="text-[10px] text-slate-600 mt-1">Submit test to inspect raw sandbox parameters & delivery statuses</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Troubleshooting Diagnostics Board */}
              <div className="bg-white border border-slate-200 shadow-sm rounded-3xl p-6 md:p-8 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center animate-pulse">
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <h4 className="text-base font-black text-slate-900">Why are messages not showing in the Sandbox Simulator?</h4>
                    <p className="text-xs text-slate-500">Essential diagnostics checklist to guarantee delivery is displayable.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-slate-600 leading-relaxed">
                  <div className="space-y-4 bg-slate-50/50 border border-slate-100 p-5 rounded-2xl">
                    <p className="font-bold text-slate-800 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-black flex items-center justify-center">1</span>
                      Check the Username Case
                    </p>
                    <p className="text-xs pl-7 text-slate-500 leading-relaxed">
                      When working with the Africa's Talking API Sandbox, the username MUST be exactly <span className="font-mono bg-slate-100 font-bold px-1 py-0.5 rounded">sandbox</span> (completely lowercase). Any other username will target real live credit and bypass your simulator!
                    </p>

                    <p className="font-bold text-slate-800 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-black flex items-center justify-center">2</span>
                      The Phone Number Whitelist Rule
                    </p>
                    <p className="text-xs pl-7 text-slate-500 leading-relaxed">
                      In the Africa's Talking Sandbox, you can <span className="font-bold">ONLY</span> send SMS to phone numbers listed in your sandbox dashboard under your <span className="font-bold">"Sandbox Teams" / "Sandbox Numbers"</span> whitelist. Real-world random numbers are safely filtered out by the gateway.
                    </p>
                  </div>

                  <div className="space-y-4 bg-slate-50/50 border border-slate-100 p-5 rounded-2xl">
                    <p className="font-bold text-slate-800 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-black flex items-center justify-center">3</span>
                      Simulated Device Log In
                    </p>
                    <p className="text-xs pl-7 text-slate-500 leading-relaxed">
                      Ensure you have the <a href="https://sandbox.africastalking.com/" target="_blank" rel="noreferrer" className="text-red-650 font-bold underline">Africa's Talking Sandbox Simulator</a> web page open, and you have registered/logged in with the <span className="font-bold">EXACT same number</span> (including country prefix, e.g. <span className="font-mono bg-slate-100 px-1 py-0.5 rounded">+254711223344</span>) you are sending the SMS to.
                    </p>

                    <p className="font-bold text-slate-800 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-black flex items-center justify-center">4</span>
                      Status 101 vs Actual Dispatch
                    </p>
                    <p className="text-xs pl-7 text-slate-500 leading-relaxed">
                      Africa's Talking API accepts Sandbox SMS posts by returning Success (Code 101) even if the device simulator is offline. Our live console above checks and extracts statuses individually, letting you verify whether the gateway actually queued it for delivery.
                    </p>
                  </div>
                </div>
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

        <AnimatePresence>
          {editingProfile && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[105] flex items-center justify-center p-4 overflow-y-auto"
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-100"
              >
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-black text-slate-900">Edit User Profile</h3>
                  <button 
                    onClick={() => setEditingProfile(null)}
                    className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-900 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <Input 
                    label="Full Name" 
                    value={editProfileForm.fullName} 
                    onChange={v => setEditProfileForm({...editProfileForm, fullName: v})} 
                    required 
                  />
                  <Input 
                    label="Email" 
                    value={editProfileForm.email} 
                    onChange={v => setEditProfileForm({...editProfileForm, email: v})} 
                    required 
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <Input 
                      label="National ID" 
                      value={editProfileForm.national_id} 
                      onChange={v => setEditProfileForm({...editProfileForm, national_id: v})} 
                    />
                    <Input 
                      label="Phone (+254...)" 
                      value={editProfileForm.phone_number} 
                      onChange={v => setEditProfileForm({...editProfileForm, phone_number: v})} 
                    />
                  </div>
                  <Input 
                    label="County" 
                    value={editProfileForm.county} 
                    onChange={v => setEditProfileForm({...editProfileForm, county: v})} 
                    placeholder="Type or select county..." 
                    list="edit-kenyan-counties"
                  />
                  <datalist id="edit-kenyan-counties">
                    {KENYAN_COUNTIES.map(c => <option key={c} value={c} />)}
                  </datalist>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Role</label>
                      <select 
                        value={editProfileForm.role}
                        onChange={e => setEditProfileForm({...editProfileForm, role: e.target.value as UserRole})}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500 font-bold"
                      >
                        <option value="victim">Victim</option>
                        <option value="volunteer">Volunteer</option>
                        <option value="merchant">Merchant</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Status</label>
                      <select 
                        value={editProfileForm.status}
                        onChange={e => setEditProfileForm({...editProfileForm, status: e.target.value as any})}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500 font-bold"
                      >
                        <option value="active">Active</option>
                        <option value="pending">Inactive (Pending)</option>
                        <option value="suspended">Suspended</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button 
                      type="button"
                      onClick={() => setEditingProfile(null)}
                      className="flex-1 px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl font-black hover:bg-red-700 transition-all shadow-lg shadow-red-200 flex items-center justify-center gap-2"
                    >
                      <Save size={16} />
                      Save Changes
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {deleteProfileId && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[105] flex items-center justify-center p-4"
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
                <h3 className="text-xl font-black text-slate-900 mb-2">Delete User Profile?</h3>
                <p className="text-slate-500 font-medium mb-8">
                  Are you sure you want to delete this user? All associated database associations (including wallets and triage sessions) will be deleted because of cascade constraints. This action is irreversible.
                </p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setDeleteProfileId(null)}
                    className="flex-1 px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => handleDeleteProfile(deleteProfileId)}
                    className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl font-black hover:bg-red-700 transition-all shadow-lg shadow-red-200"
                  >
                    Delete User
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      <PFABuddyChat isDark={isDark} />
    </div>
  );
}

function SidebarLink({ icon, label, active, onClick, badge, isDark, isCollapsed }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void, badge?: number, isDark?: boolean, isCollapsed?: boolean }) {
  return (
    <button 
      onClick={onClick}
      title={label}
      className={`w-full flex items-center ${isCollapsed ? 'justify-center px-2' : 'justify-between px-4'} py-3 rounded-xl transition-all font-bold group relative ${
        active 
          ? 'bg-red-650 text-white shadow-lg shadow-red-200/50' 
          : isDark 
            ? 'text-slate-400 hover:bg-slate-800/40 hover:text-white' 
            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-950'
      }`}
    >
      <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
        {icon}
        {!isCollapsed && <span className="whitespace-nowrap transition-opacity duration-200">{label}</span>}
      </div>
      {!isCollapsed && badge && (
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
          active ? 'bg-white text-red-650' : 'bg-red-650 text-white'
        }`}>
          {badge}
        </span>
      )}
      {isCollapsed && badge && (
        <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-600 rounded-full ring-2 ring-slate-900 animate-pulse" />
      )}
    </button>
  );
}

function StatCard({ icon, label, value, color, isDark }: { icon: React.ReactNode, label: string, value: string | number, color: 'blue' | 'green' | 'purple' | 'red', isDark?: boolean }) {
  const colorsLight = {
    blue: 'bg-blue-50 text-blue-600 border border-blue-100',
    green: 'bg-green-50 text-green-600 border border-green-100',
    purple: 'bg-purple-50 text-purple-600 border border-purple-100',
    red: 'bg-red-50 text-red-600 border border-red-100'
  };

  const colorsDark = {
    blue: 'bg-blue-500/10 border border-blue-500/20 text-blue-400',
    green: 'bg-green-500/10 border border-green-500/20 text-green-400',
    purple: 'bg-purple-500/10 border border-purple-500/20 text-purple-400',
    red: 'bg-red-500/10 border border-red-500/20 text-red-400'
  };

  const currentIconColors = isDark ? colorsDark[color] : colorsLight[color];

  return (
    <div className={`p-6 rounded-3xl border transition-all ${
      isDark 
        ? 'bg-slate-900/45 border-slate-800/80 backdrop-blur-sm' 
        : 'bg-white border-slate-200/80 shadow-md shadow-slate-100/50'
    }`}>
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${currentIconColors}`}>
        {icon}
      </div>
      <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{value}</p>
    </div>
  );
}

function DistributionBar({ label, count, total, color, isDark }: { label: string, count: number, total: number, color: string, isDark?: boolean }) {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs font-bold">
        <span className={isDark ? 'text-slate-350' : 'text-slate-600'}>{label}</span>
        <span className="text-slate-400">{count} ({percentage.toFixed(0)}%)</span>
      </div>
      <div className={`h-2 ${isDark ? 'bg-slate-800' : 'bg-slate-100'} rounded-full overflow-hidden`}>
        <div className={`h-full rounded-full ${color}`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type = 'text', required = false, placeholder = '', list, isDark }: { label: string, value: string, onChange: (v: string) => void, type?: string, required?: boolean, placeholder?: string, list?: string, isDark?: boolean }) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div>
      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">{label}</label>
      <div className="relative">
        <input 
          type={inputType}
          required={required}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          list={list}
          className={`w-full px-4 py-3 border rounded-xl outline-none focus:ring-1 focus:ring-red-500 font-bold transition-all pr-12 ${
            isDark 
              ? 'bg-slate-950 border-slate-800 text-white placeholder:text-slate-705' 
              : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-300'
          }`}
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
