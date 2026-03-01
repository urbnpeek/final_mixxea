import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router';
import { useAuth } from './AuthContext';
import * as api from './api';
import { toast } from 'sonner';
import {
  Music, Globe, Megaphone, BarChart3, Scissors, Check,
  ArrowRight, Zap, Star, X, ChevronRight, Disc3, BookOpen
} from 'lucide-react';

const GENRES = ['Afrobeats','Hip-Hop','R&B / Soul','Pop','Electronic','Lo-Fi','Reggaeton','Indie','Classical','Jazz','Gospel','Trap','Dancehall','Amapiano','Other'];

interface OnboardingModalProps {
  onComplete: () => void;
}

export function OnboardingModal({ onComplete }: OnboardingModalProps) {
  const { token, user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    artistName: user?.name || '',
    bio: '',
    genre: '',
    location: '',
  });

  const totalSteps = 3;

  const handleComplete = async () => {
    setSaving(true);
    try {
      const { user: updatedUser } = await api.completeOnboarding(token!, form);
      updateUser({ ...updatedUser });
      toast.success('🎉 Welcome to MIXXEA! Your profile is set up.');
      onComplete();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    setSaving(true);
    try {
      await api.completeOnboarding(token!, {});
      onComplete();
    } catch {
      onComplete();
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-4"
    >
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full blur-[120px] opacity-20" style={{ background: 'radial-gradient(ellipse, #7B5FFF, #D63DF6, transparent)' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.3 }}
        className="relative w-full max-w-lg bg-[#0D0D0D] border border-white/[0.08] rounded-3xl overflow-hidden shadow-2xl"
      >
        {/* Top gradient bar */}
        <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #00C4FF, #7B5FFF, #D63DF6, #FF5252)' }} />

        {/* Progress dots */}
        <div className="px-8 pt-6 flex items-center gap-2">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div key={i} className={`h-1 rounded-full flex-1 transition-all duration-300 ${i < step ? 'bg-gradient-to-r from-[#7B5FFF] to-[#D63DF6]' : 'bg-white/[0.08]'}`} />
          ))}
        </div>

        {/* Skip button */}
        <button
          onClick={handleSkip}
          className="absolute top-6 right-6 text-white/30 hover:text-white/60 text-sm transition-colors"
        >
          Skip
        </button>

        <AnimatePresence mode="wait">
          {/* STEP 1 — Profile Setup */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              className="px-8 py-6"
            >
              <div className="mb-6">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'linear-gradient(135deg, #7B5FFF20, #D63DF620)', border: '1px solid rgba(123,95,255,0.2)' }}>
                  <Music size={22} className="text-[#7B5FFF]" />
                </div>
                <div className="text-xs text-white/40 uppercase tracking-widest mb-1 font-medium">Step 1 of 3</div>
                <h2 className="text-2xl font-black text-white mb-1">Set up your profile</h2>
                <p className="text-white/50 text-sm">Tell us about yourself so we can personalize your MIXXEA experience.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">Artist / Stage Name</label>
                  <input
                    value={form.artistName}
                    onChange={e => setForm(f => ({ ...f, artistName: e.target.value }))}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#7B5FFF]/50 transition-all"
                    placeholder="Your artist or stage name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">Bio</label>
                  <textarea
                    value={form.bio}
                    onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                    rows={3}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#7B5FFF]/50 transition-all resize-none"
                    placeholder="A short bio for your artist profile..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">Primary Genre</label>
                    <select
                      value={form.genre}
                      onChange={e => setForm(f => ({ ...f, genre: e.target.value }))}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#7B5FFF]/50 transition-all"
                    >
                      <option value="">Select genre</option>
                      {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">Location</label>
                    <input
                      value={form.location}
                      onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#7B5FFF]/50 transition-all"
                      placeholder="Lagos, Nigeria"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={() => setStep(2)}
                className="w-full mt-6 flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-white text-sm hover:opacity-90 transition-all"
                style={{ background: 'linear-gradient(135deg, #7B5FFF, #D63DF6)' }}
              >
                Continue <ArrowRight size={15} />
              </button>
            </motion.div>
          )}

          {/* STEP 2 — Explore Features */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              className="px-8 py-6"
            >
              <div className="mb-6">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'linear-gradient(135deg, #D63DF620, #FF525220)', border: '1px solid rgba(214,61,246,0.2)' }}>
                  <Star size={22} className="text-[#D63DF6]" />
                </div>
                <div className="text-xs text-white/40 uppercase tracking-widest mb-1 font-medium">Step 2 of 3</div>
                <h2 className="text-2xl font-black text-white mb-1">Everything you need</h2>
                <p className="text-white/50 text-sm">MIXXEA gives you all the tools to distribute, market, and monetize your music.</p>
              </div>

              <div className="space-y-3 mb-6">
                {[
                  { icon: Music, color: '#7B5FFF', title: 'Music Distribution', desc: 'Get on Spotify, Apple Music, YouTube Music & 150+ stores globally' },
                  { icon: Megaphone, color: '#D63DF6', title: 'Promotions', desc: 'Run TikTok, Instagram UGC, playlist pitching & more campaigns' },
                  { icon: BarChart3, color: '#00C4FF', title: 'Real-time Analytics', desc: 'Track streams, revenue, & fan locations across all DSPs' },
                  { icon: Globe, color: '#10B981', title: 'Smart Pages', desc: 'Your own link-in-bio page at mixxea.com/p/yourname' },
                  { icon: BookOpen, color: '#F59E0B', title: 'Publishing Admin', desc: 'Register works, collect royalties, and manage copyright' },
                  { icon: Scissors, color: '#FF5252', title: 'Royalty Splits', desc: 'Automate payments to producers, writers, and collaborators' },
                ].map(({ icon: Icon, color, title, desc }) => (
                  <div key={title} className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}15` }}>
                      <Icon size={14} style={{ color }} />
                    </div>
                    <div>
                      <div className="text-white font-semibold text-sm">{title}</div>
                      <div className="text-white/40 text-xs mt-0.5">{desc}</div>
                    </div>
                    <Check size={14} className="text-white/20 ml-auto flex-shrink-0 mt-0.5" />
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="flex-1 py-3 rounded-xl text-sm font-medium text-white/50 hover:text-white bg-white/[0.05] transition-all">
                  ← Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-white text-sm hover:opacity-90 transition-all"
                  style={{ background: 'linear-gradient(135deg, #7B5FFF, #D63DF6)' }}
                >
                  Continue <ArrowRight size={15} />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 3 — Ready! */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              className="px-8 py-6"
            >
              <div className="text-center mb-6">
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: 'linear-gradient(135deg, #7B5FFF, #D63DF6)' }}
                >
                  <Zap size={28} className="text-white" />
                </motion.div>
                <div className="text-xs text-white/40 uppercase tracking-widest mb-1 font-medium">Step 3 of 3</div>
                <h2 className="text-2xl font-black text-white mb-2">You're all set! 🎉</h2>
                <p className="text-white/50 text-sm">
                  Your account has <span className="text-[#00C4FF] font-bold">100 free credits</span> to start.
                  Here's what to do first:
                </p>
              </div>

              <div className="space-y-3 mb-6">
                {[
                  { path: '/dashboard/distribution', icon: Disc3, label: 'Upload your first release', desc: 'Distribute to 150+ stores', color: '#7B5FFF', cta: 'Upload Now' },
                  { path: '/dashboard/promotions', icon: Megaphone, label: 'Launch a campaign', desc: 'Promote your music with credits', color: '#D63DF6', cta: 'Promote' },
                  { path: '/dashboard/smart-pages', icon: Globe, label: 'Create your Smart Page', desc: 'Your custom artist bio link', color: '#00C4FF', cta: 'Create Page' },
                ].map(({ path, icon: Icon, label, desc, color, cta }) => (
                  <button
                    key={path}
                    onClick={() => { handleComplete(); navigate(path); }}
                    className="w-full flex items-center gap-3 p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.1] transition-all text-left group"
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}20` }}>
                      <Icon size={16} style={{ color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-semibold text-sm">{label}</div>
                      <div className="text-white/40 text-xs mt-0.5">{desc}</div>
                    </div>
                    <ChevronRight size={14} className="text-white/20 group-hover:text-white/50 transition-colors flex-shrink-0" />
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="flex-1 py-3 rounded-xl text-sm font-medium text-white/50 hover:text-white bg-white/[0.05] transition-all">
                  ← Back
                </button>
                <button
                  onClick={handleComplete}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-white text-sm hover:opacity-90 transition-all disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #7B5FFF, #D63DF6)' }}
                >
                  {saving ? 'Saving...' : 'Enter Dashboard 🚀'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer credits badge */}
        <div className="px-8 pb-6 pt-2 text-center">
          <div className="inline-flex items-center gap-1.5 text-xs text-white/25">
            <Zap size={11} className="text-[#00C4FF]" /> 100 free credits included with your account
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
