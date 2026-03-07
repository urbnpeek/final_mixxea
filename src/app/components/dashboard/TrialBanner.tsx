// ─────────────────────────────────────────────────────────────────────────────
//  MIXXEA — Feature 3: Free Trial Banner (shown in DashboardLayout)
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from './AuthContext';
import * as api from './api';
import { toast } from 'sonner';
import { Zap, X, Clock, Gift } from 'lucide-react';

export function TrialBanner() {
  const { token, user, refreshUser } = useAuth();
  const [trial, setTrial] = useState<any>(null);
  const [dismissed, setDismissed] = useState(false);
  const [activating, setActivating] = useState(false);

  useEffect(() => {
    if (!token) return;
    api.getTrialStatus(token).then((r: any) => setTrial(r)).catch(() => {});
  }, [token]);

  const handleActivate = async () => {
    if (!token) return;
    setActivating(true);
    try {
      await api.activateTrial(token);
      await refreshUser();
      setTrial((prev: any) => ({ ...prev, active: true, daysLeft: 14, eligible: false }));
      toast.success('🎉 14-day Growth trial activated! Enjoy all features free.');
    } catch (err: any) { toast.error(err.message); }
    finally { setActivating(false); }
  };

  if (dismissed || !trial || (user?.plan !== 'starter' && !trial.active)) return null;
  // Show if eligible (not used yet) OR if trial is currently active
  const showEligible = trial.eligible;
  const showActive   = trial.active && trial.daysLeft > 0;
  if (!showEligible && !showActive) return null;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
        className="mx-4 mt-3 mb-0 rounded-2xl border overflow-hidden"
        style={showEligible ? {
          background: 'linear-gradient(135deg,rgba(0,196,255,0.08),rgba(123,95,255,0.10))',
          borderColor: 'rgba(123,95,255,0.30)',
        } : {
          background: 'linear-gradient(135deg,rgba(16,185,129,0.08),rgba(0,196,255,0.06))',
          borderColor: 'rgba(16,185,129,0.30)',
        }}>
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: showEligible ? 'linear-gradient(135deg,#7B5FFF,#D63DF6)' : 'rgba(16,185,129,0.2)' }}>
            {showEligible ? <Gift size={15} className="text-white" /> : <Clock size={15} className="text-[#10B981]" />}
          </div>
          <div className="flex-1 min-w-0">
            {showEligible ? (
              <>
                <div className="text-sm font-bold text-white">Try Growth Plan Free for 14 Days</div>
                <div className="text-xs text-white/50">Playlist pitching, TikTok campaigns, curator marketplace — all included</div>
              </>
            ) : (
              <>
                <div className="text-sm font-bold text-[#10B981]">Free Trial Active — {trial.daysLeft} days remaining</div>
                <div className="text-xs text-white/50">You have full Growth plan access until your trial ends</div>
              </>
            )}
          </div>
          {showEligible && (
            <button onClick={handleActivate} disabled={activating}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-50 flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#7B5FFF,#D63DF6)' }}>
              {activating ? 'Activating…' : <><Zap size={11} /> Start Free Trial</>}
            </button>
          )}
          <button onClick={() => setDismissed(true)} className="text-white/30 hover:text-white flex-shrink-0">
            <X size={14} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
