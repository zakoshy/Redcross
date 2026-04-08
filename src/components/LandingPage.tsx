import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Shield, Heart, Activity, ArrowRight } from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden font-sans">
      {/* Background Image with Blur */}
      <div 
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: 'url("https://images.unsplash.com/photo-1593113598332-cd288d649433?q=80&w=2070&auto=format&fit=crop")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-4xl px-6 text-center text-white">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="flex justify-center mb-8"
        >
          <div className="bg-white p-4 rounded-2xl shadow-2xl">
            <Activity className="text-red-600 w-12 h-12" />
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-5xl md:text-7xl font-black tracking-tight mb-6"
        >
          Relief<span className="text-red-500">Voucher</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-xl md:text-2xl text-slate-200 mb-12 max-w-2xl mx-auto leading-relaxed"
        >
          A secure, real-time humanitarian aid distribution system. 
          Empowering volunteers and merchants to deliver relief where it's needed most.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="flex justify-center"
        >
          <button
            onClick={() => navigate('/login')}
            className="group relative px-12 py-4 bg-red-600 hover:bg-red-700 text-white rounded-full font-bold text-lg transition-all shadow-xl hover:shadow-red-500/20 flex items-center justify-center gap-2"
          >
            Access Portal
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1 }}
          className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8 text-left"
        >
          <div className="bg-white/5 backdrop-blur-sm p-6 rounded-2xl border border-white/10">
            <Shield className="text-red-400 mb-4" />
            <h3 className="font-bold mb-2">Secure Auth</h3>
            <p className="text-sm text-slate-400">Role-based access control for Admins, Volunteers, and Merchants.</p>
          </div>
          <div className="bg-white/5 backdrop-blur-sm p-6 rounded-2xl border border-white/10">
            <Heart className="text-red-400 mb-4" />
            <h3 className="font-bold mb-2">Rapid Relief</h3>
            <p className="text-sm text-slate-400">Instant voucher generation and victim registration in the field.</p>
          </div>
          <div className="bg-white/5 backdrop-blur-sm p-6 rounded-2xl border border-white/10">
            <Activity className="text-red-400 mb-4" />
            <h3 className="font-bold mb-2">Real-time Tracking</h3>
            <p className="text-sm text-slate-400">Live monitoring of voucher redemptions and distribution metrics.</p>
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-8 text-slate-500 text-sm">
        © 2026 ReliefVoucher Humanitarian Network
      </div>
    </div>
  );
}
