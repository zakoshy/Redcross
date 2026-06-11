"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { Shield, Heart, Activity, ArrowRight } from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between overflow-x-hidden font-sans bg-slate-950 text-white">
      {/* Background Image - Single high-contrast humanitarian scene with nice dim overlay */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center transition-all duration-700"
        style={{
          backgroundImage: 'url("https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?q=80&w=2070&auto=format&fit=crop")',
        }}
      >
        <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-[1px]"></div>
      </div>

      {/* Header with Visible Logo */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-white p-2.5 rounded-xl shadow-xl flex items-center justify-center">
            <Activity className="text-red-600 w-6 h-6 animate-pulse" />
          </div>
          <span className="text-xl font-black text-white tracking-tight">
            Relief<span className="text-red-500">Voucher</span>
          </span>
        </div>
        <div className="text-[10px] font-black uppercase tracking-wider text-slate-300 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
          🌍 Crisis Support Hub
        </div>
      </header>

      {/* Hero Section & Feature Cards */}
      <main className="relative z-10 max-w-4xl mx-auto px-6 flex-1 flex flex-col items-center justify-center text-center py-12">
        {/* Decorative Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="mb-6 flex justify-center"
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-500/10 text-red-400 text-[11px] font-bold tracking-wider uppercase border border-red-500/20">
            <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500 animate-pulse" />
            Humanitarian Distribution Network
          </span>
        </motion.div>

        {/* Hero Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="text-4xl sm:text-5xl md:text-7xl font-black tracking-tight mb-6"
        >
          Relief<span className="text-red-500">Voucher</span>
        </motion.h1>

        {/* Hero Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-base sm:text-lg md:text-xl text-slate-200 mb-8 md:mb-12 max-w-2xl mx-auto leading-relaxed"
        >
          A secure, real-time humanitarian aid distribution system. 
          Empowering volunteers and merchants to deliver relief where it's needed most.
        </motion.p>

        {/* Call to Action Button */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex justify-center mb-16 md:mb-20"
        >
          <button
            onClick={() => router.push('/login')}
            className="group relative px-10 py-4 bg-red-600 hover:bg-red-700 text-white rounded-full font-bold text-base md:text-lg transition-all shadow-2xl hover:shadow-red-500/30 flex items-center justify-center gap-2.5 cursor-pointer transform hover:-translate-y-0.5"
          >
            Access Portal
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </motion.div>

        {/* Three Core Feature Cards - Fixed positioning to never overlap */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 text-left w-full"
        >
          <div className="bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10 hover:border-white/20 hover:shadow-xl transition-all">
            <Shield className="text-red-400 mb-4 w-7 h-7" />
            <h3 className="font-bold mb-2 text-white">Secure Auth</h3>
            <p className="text-xs text-slate-350 leading-relaxed">Role-based access control for Admins, Volunteers, and Merchants.</p>
          </div>
          <div className="bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10 hover:border-white/20 hover:shadow-xl transition-all">
            <Heart className="text-red-400 mb-4 w-7 h-7" />
            <h3 className="font-bold mb-2 text-white">Rapid Relief</h3>
            <p className="text-xs text-slate-350 leading-relaxed">Instant voucher-wallet balance lookup and beneficiary registration in the field.</p>
          </div>
          <div className="bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10 hover:border-white/20 hover:shadow-xl transition-all sm:col-span-2 md:col-span-1">
            <Activity className="text-red-400 mb-4 w-7 h-7" />
            <h3 className="font-bold mb-2 text-white">Real-time Tracking</h3>
            <p className="text-xs text-slate-350 leading-relaxed">Live monitoring of voucher redemptions and distribution metrics.</p>
          </div>
        </motion.div>
      </main>

      {/* Footer Section - Positioned as part of the page content flow so it is never overlapped */}
      <footer className="relative z-10 w-full py-8 text-center border-t border-white/5 bg-slate-950/20 backdrop-blur-sm mt-auto">
        <p className="text-slate-400 text-xs sm:text-sm font-semibold tracking-wide">
          © 2026 ReliefVoucher Humanitarian Network
        </p>
      </footer>
    </div>
  );
}

