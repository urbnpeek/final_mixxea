import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useSearchParams } from 'react-router';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';
import { Eye, EyeOff, Music, Radio, BookOpen, ArrowLeft, Zap, Tag } from 'lucide-react';
import { Link } from 'react-router';
import mixxeaLogo from '../../../assets/d262559c0b7675722d6c420c935f7d8c758fea4f.png';

const roles = [
  { id: 'artist', label: 'Artist', icon: Music, desc: 'Independent artist, singer, producer, or DJ' },
  { id: 'label', label: 'Label', icon: Radio, desc: 'Record label or music company managing multiple artists' },
  { id: 'curator', label: 'Curator', icon: BookOpen, desc: 'Playlist curator, blogger, or music tastemaker' },
];

export function AuthPage() {
  const [searchParams] = useSearchParams();
  const inviteCodeFromUrl = searchParams.get('invite') || '';
  const tabParam = searchParams.get('tab');

  const [mode, setMode] = useState<'login' | 'signup'>(tabParam === 'signup' ? 'signup' : 'login');
  const [step, setStep] = useState(1);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, signup, user, isLoading } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: '', email: '', password: '', role: '', inviteCode: inviteCodeFromUrl });

  // ── Reactive navigation ──────────────────────────────────────────────────
  // Navigate to dashboard ONLY after the user state is truly committed in
  // AuthContext — avoids the race where navigate() fires before setUser()
  // propagates and DashboardLayout's auth-guard kicks the user back to /auth.
  useEffect(() => {
    if (!isLoading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, isLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success('Welcome back to MIXXEA!');
      // Navigation is handled by the useEffect above — do NOT call navigate() here.
    } catch (err: any) {
      toast.error(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.role) { toast.error('Please select your role'); return; }
    setLoading(true);
    try {
      await signup(form.name, form.email, form.password, form.role, form.inviteCode);
      toast.success('Welcome to MIXXEA! You have 100 free credits.');
      // Navigation is handled by the useEffect above — do NOT call navigate() here.
    } catch (err: any) {
      toast.error(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#030303] flex items-center justify-center relative overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:80px_80px]" />
      {/* Gradient orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#7B5FFF]/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#D63DF6]/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md px-4">
        {/* Logo */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-center gap-3 mb-8">
          <img src={mixxeaLogo} alt="MIXXEA" className="h-10 w-10" />
          <span className="text-2xl font-bold text-white tracking-tight">MIXXEA</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-8 backdrop-blur-xl"
        >
          {/* Tab switcher */}
          <div className="flex rounded-xl bg-white/[0.05] p-1 mb-8">
            {(['login', 'signup'] as const).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setStep(1); }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${mode === m ? 'bg-gradient-to-r from-[#7B5FFF] to-[#D63DF6] text-white shadow-lg' : 'text-white/50 hover:text-white'}`}
              >
                {m === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {mode === 'login' ? (
              <motion.form key="login" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1.5 uppercase tracking-wider">Email</label>
                  <input
                    type="email" required value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full bg-white/[0.06] border border-white/[0.1] rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#7B5FFF]/60 focus:bg-white/[0.08] transition-all text-sm"
                    placeholder="artist@email.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1.5 uppercase tracking-wider">Password</label>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'} required value={form.password}
                      onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      className="w-full bg-white/[0.06] border border-white/[0.1] rounded-xl px-4 py-3 pr-12 text-white placeholder-white/30 focus:outline-none focus:border-[#7B5FFF]/60 focus:bg-white/[0.08] transition-all text-sm"
                      placeholder="••••••••"
                    />
                    <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70">
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <button
                  type="submit" disabled={loading}
                  className="w-full py-3.5 rounded-xl font-semibold text-white text-sm transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #7B5FFF 0%, #D63DF6 60%, #FF5252 100%)' }}
                >
                  {loading ? 'Signing In...' : 'Sign In to Dashboard'}
                </button>
              </motion.form>
            ) : (
              <motion.form key="signup" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} onSubmit={handleSignup} className="space-y-4">
                {step === 1 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-white/60 mb-1.5 uppercase tracking-wider">Full Name / Artist Name</label>
                      <input
                        type="text" required value={form.name}
                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        className="w-full bg-white/[0.06] border border-white/[0.1] rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#7B5FFF]/60 transition-all text-sm"
                        placeholder="Your artist or label name"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-white/60 mb-1.5 uppercase tracking-wider">Email</label>
                      <input
                        type="email" required value={form.email}
                        onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                        className="w-full bg-white/[0.06] border border-white/[0.1] rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#7B5FFF]/60 transition-all text-sm"
                        placeholder="your@email.com"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-white/60 mb-1.5 uppercase tracking-wider">Password</label>
                      <div className="relative">
                        <input
                          type={showPass ? 'text' : 'password'} required value={form.password} minLength={8}
                          onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                          className="w-full bg-white/[0.06] border border-white/[0.1] rounded-xl px-4 py-3 pr-12 text-white placeholder-white/30 focus:outline-none focus:border-[#7B5FFF]/60 transition-all text-sm"
                          placeholder="Minimum 8 characters"
                        />
                        <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70">
                          {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => { if (!form.name || !form.email || !form.password) { toast.error('Please fill all fields'); return; } setStep(2); }}
                      className="w-full py-3.5 rounded-xl font-semibold text-white text-sm"
                      style={{ background: 'linear-gradient(135deg, #7B5FFF 0%, #D63DF6 60%, #FF5252 100%)' }}
                    >
                      Continue →
                    </button>
                    {/* Invite code field */}
                    <div>
                      <label className="block text-xs font-medium text-white/40 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                        <Tag size={10} /> Label Invite Code (optional)
                      </label>
                      <input
                        value={form.inviteCode}
                        onChange={e => setForm(f => ({ ...f, inviteCode: e.target.value.toUpperCase() }))}
                        className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#7B5FFF]/40 font-mono tracking-widest"
                        placeholder="XXXXXXXX"
                      />
                    </div>
                  </motion.div>
                )}
                {step === 2 && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                    <button type="button" onClick={() => setStep(1)} className="flex items-center gap-2 text-white/50 hover:text-white text-sm mb-2">
                      <ArrowLeft size={14} /> Back
                    </button>
                    <p className="text-white/60 text-sm mb-4">Choose your account type:</p>
                    <div className="space-y-3">
                      {roles.map(({ id, label, icon: Icon, desc }) => (
                        <button
                          key={id} type="button"
                          onClick={() => setForm(f => ({ ...f, role: id }))}
                          className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${form.role === id ? 'border-[#7B5FFF] bg-[#7B5FFF]/10' : 'border-white/[0.08] hover:border-white/20 bg-white/[0.03]'}`}
                        >
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${form.role === id ? 'bg-[#7B5FFF]/20' : 'bg-white/[0.06]'}`}>
                            <Icon size={20} className={form.role === id ? 'text-[#7B5FFF]' : 'text-white/50'} />
                          </div>
                          <div>
                            <div className="font-semibold text-white text-sm">{label}</div>
                            <div className="text-white/40 text-xs mt-0.5">{desc}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                    <button
                      type="submit" disabled={loading || !form.role}
                      className="w-full py-3.5 rounded-xl font-semibold text-white text-sm disabled:opacity-50 transition-all"
                      style={{ background: 'linear-gradient(135deg, #7B5FFF 0%, #D63DF6 60%, #FF5252 100%)' }}
                    >
                      {loading ? 'Creating Account...' : 'Create Account + Get 100 Free Credits'}
                    </button>
                  </motion.div>
                )}
              </motion.form>
            )}
          </AnimatePresence>

          {/* Perks */}
          <div className="mt-6 flex items-center gap-2 justify-center">
            <Zap size={13} className="text-[#00C4FF]" />
            <span className="text-xs text-white/40">100 free credits • No credit card required • Cancel anytime</span>
          </div>
        </motion.div>

        <p className="text-center text-white/30 text-xs mt-6">
          <Link to="/" className="hover:text-white/60 transition-colors">← Back to MIXXEA.com</Link>
        </p>
      </div>
    </div>
  );
}
