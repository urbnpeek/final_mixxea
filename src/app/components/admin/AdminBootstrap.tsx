import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { useAuth } from '../dashboard/AuthContext';
import * as api from '../dashboard/api';
import { toast } from 'sonner';
import {
  Shield, Key, Mail, CheckCircle, AlertCircle,
  Info, Lock, ArrowLeft, Eye, EyeOff,
} from 'lucide-react';

export function AdminBootstrap() {
  const { user, token, isLoading, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [adminSecret, setAdminSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  // Pre-fill email once user loads
  useEffect(() => {
    if (user?.email && !email) setEmail(user.email);
  }, [user]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !user) navigate('/auth', { replace: true });
  }, [isLoading, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !adminSecret) { toast.error('Email and admin secret are required'); return; }
    setLoading(true);
    try {
      const result = await api.adminBootstrap(email, adminSecret);
      if (result.success) {
        toast.success('🎉 Admin access granted! Redirecting to admin panel…');
        setSuccess(true);
        if (token) await refreshUser();
        setTimeout(() => navigate('/admin', { replace: true }), 1800);
      }
    } catch (err: any) {
      toast.error(err.message || 'Invalid admin secret or user not found');
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) return null;

  if (success) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          className="bg-[#10B981]/10 border border-[#10B981]/30 rounded-3xl p-10 text-center max-w-md w-full">
          <div className="w-20 h-20 rounded-2xl bg-[#10B981]/20 flex items-center justify-center mx-auto mb-5">
            <CheckCircle size={40} className="text-[#10B981]" />
          </div>
          <h2 className="text-2xl font-black text-white mb-2">You're an Admin!</h2>
          <p className="text-white/50 text-sm">Redirecting to the admin panel…</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6">
      {/* Back link */}
      <div className="w-full max-w-lg mb-4">
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-white/40 hover:text-white text-sm transition-colors">
          <ArrowLeft size={14} /> Back
        </button>
      </div>

      <div className="w-full max-w-lg">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'linear-gradient(135deg, #D63DF6, #7B5FFF)' }}>
            <Shield size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Admin Access Setup</h1>
          <p className="text-white/40 text-sm mt-1">Promote your account to MIXXEA admin</p>
        </motion.div>

        {/* Current status banner */}
        {user && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className={`mb-5 p-4 rounded-2xl border flex items-center gap-3 ${
              (user as any).isAdmin
                ? 'bg-[#10B981]/10 border-[#10B981]/20'
                : 'bg-white/[0.03] border-white/[0.06]'
            }`}>
            {(user as any).isAdmin
              ? <CheckCircle size={18} className="text-[#10B981] flex-shrink-0" />
              : <AlertCircle size={18} className="text-[#F59E0B] flex-shrink-0" />}
            <div>
              <p className="text-sm font-medium text-white">
                {(user as any).isAdmin ? 'You already have admin access' : 'Not yet an admin'}
              </p>
              <p className="text-xs text-white/40 mt-0.5">Logged in as {user.name} · {user.email}</p>
            </div>
            {(user as any).isAdmin && (
              <button onClick={() => navigate('/admin', { replace: true })}
                className="ml-auto px-4 py-1.5 rounded-xl text-xs font-semibold text-white"
                style={{ background: 'linear-gradient(135deg, #D63DF6, #7B5FFF)' }}>
                Go to Admin →
              </button>
            )}
          </motion.div>
        )}

        {/* Info */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="mb-5 p-4 bg-[#7B5FFF]/10 border border-[#7B5FFF]/20 rounded-2xl flex gap-3">
          <Info size={15} className="text-[#7B5FFF] flex-shrink-0 mt-0.5" />
          <div className="text-sm text-white/60 leading-relaxed space-y-1">
            <p className="text-white font-medium">How it works</p>
            <p>Enter the email of the account you want to promote and the <code className="text-[#7B5FFF] bg-[#7B5FFF]/10 px-1 rounded">MIXXEA_ADMIN_SECRET</code> you set in your Supabase Edge Function secrets.</p>
          </div>
        </motion.div>

        {/* Form */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-[#0D0D0D] border border-white/[0.07] rounded-2xl overflow-hidden">
          <div className="flex items-center gap-3 p-5 border-b border-white/[0.06]">
            <div className="w-9 h-9 rounded-xl bg-[#D63DF6]/15 flex items-center justify-center">
              <Shield size={16} className="text-[#D63DF6]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Grant Admin Access</h2>
              <p className="text-xs text-white/40">Requires the MIXXEA admin secret key</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-white/50 mb-2 uppercase tracking-wider">
                Account Email
              </label>
              <div className="relative">
                <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="hello@mixxea.com"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#D63DF6]/50 transition-colors"
                />
              </div>
            </div>

            {/* Admin Secret */}
            <div>
              <label className="block text-xs font-semibold text-white/50 mb-2 uppercase tracking-wider">
                Admin Secret Key
              </label>
              <div className="relative">
                <Key size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  type={showSecret ? 'text' : 'password'}
                  value={adminSecret}
                  onChange={e => setAdminSecret(e.target.value)}
                  required
                  placeholder="Enter admin secret…"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-10 pr-14 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#D63DF6]/50 transition-colors"
                />
                <button type="button" onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors">
                  {showSecret ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <p className="text-[11px] text-white/30 mt-1.5 ml-1">
                Set via <code className="text-[#7B5FFF] bg-[#7B5FFF]/10 px-1 rounded">MIXXEA_ADMIN_SECRET</code> in Supabase Edge Function secrets.
              </p>
            </div>

            <div className="flex items-start gap-2 p-3 bg-[#FF5252]/10 border border-[#FF5252]/20 rounded-xl">
              <Lock size={12} className="text-[#FF5252] flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-[#FF5252]/80 leading-relaxed">
                Admin access grants full platform control: user data, tickets, campaigns, and credits.
              </p>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3.5 rounded-xl text-sm font-bold text-white hover:opacity-90 disabled:opacity-50 transition-all"
              style={{ background: 'linear-gradient(135deg, #D63DF6, #7B5FFF)' }}>
              {loading ? 'Granting Access…' : '🔐 Grant Admin Access'}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}