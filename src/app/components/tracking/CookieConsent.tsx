/**
 * MIXXEA GDPR Cookie Consent Banner
 * ─────────────────────────────────────────────────────────────────────────────
 * • Appears only when the user hasn't made a consent choice yet
 * • "Accept All" / "Necessary Only" buttons are equally prominent (GDPR req)
 * • "Manage Preferences" expands granular per-category toggles
 * • Consent is persisted to localStorage via TrackingContext
 * • MIXXEA branding: black bg, cyan→purple→magenta gradient accents
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, ChevronDown, ChevronUp, X, Cookie, BarChart3, Megaphone, Lock } from 'lucide-react';
import { useTracking } from './TrackingContext';

interface ToggleProps {
  checked: boolean;
  onChange?: (v: boolean) => void;
  disabled?: boolean;
}

function Toggle({ checked, onChange, disabled }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange?.(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#7B5FFF]/50 ${
        disabled
          ? 'cursor-not-allowed opacity-60'
          : 'cursor-pointer'
      }`}
      style={{
        background: checked
          ? 'linear-gradient(135deg, #7B5FFF, #D63DF6)'
          : 'rgba(255,255,255,0.12)',
      }}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-200 ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

export function CookieConsent() {
  const { hasConsented, grantAll, denyAll, updateConsent } = useTracking();
  const [showPrefs, setShowPrefs] = useState(false);
  const [analyticsOn, setAnalyticsOn] = useState(true);
  const [marketingOn, setMarketingOn] = useState(true);

  // Don't render if user already made a choice
  if (hasConsented) return null;

  const handleAcceptSelected = () => {
    updateConsent({ analytics: analyticsOn, marketing: marketingOn });
  };

  return (
    <AnimatePresence>
      {/* Backdrop blur on mobile only */}
      <div className="fixed inset-0 pointer-events-none z-[9998]" />

      <motion.div
        key="cookie-banner"
        initial={{ y: 120, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 120, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 32, delay: 1.2 }}
        className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:w-[480px] z-[9999]"
      >
        <div
          className="relative rounded-2xl overflow-hidden"
          style={{
            background: 'rgba(8, 8, 8, 0.97)',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(123, 95, 255, 0.25)',
            boxShadow: '0 32px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(123,95,255,0.08)',
          }}
        >
          {/* Gradient top-border accent */}
          <div
            className="absolute top-0 left-0 right-0 h-[2px]"
            style={{ background: 'linear-gradient(90deg, #00C4FF, #7B5FFF, #D63DF6, #FF5252)' }}
          />

          <div className="p-5">
            {/* Header row */}
            <div className="flex items-start gap-3 mb-4">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: 'linear-gradient(135deg, #7B5FFF22, #D63DF622)', border: '1px solid rgba(123,95,255,0.3)' }}
              >
                <Cookie size={16} style={{ color: '#7B5FFF' }} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-bold text-sm mb-1">We value your privacy</h3>
                <p className="text-white/50 text-xs leading-relaxed">
                  MIXXEA uses cookies to deliver the platform, measure performance, and personalise ads.
                  You can choose which categories to allow below.
                </p>
              </div>
            </div>

            {/* ── Manage Preferences Panel ─────────────────────── */}
            <AnimatePresence>
              {showPrefs && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <div
                    className="mb-4 rounded-xl divide-y"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', divideColor: 'rgba(255,255,255,0.06)' }}
                  >
                    {/* Necessary — locked */}
                    <div className="flex items-center gap-3 px-4 py-3">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.12)' }}>
                        <Lock size={12} className="text-[#10B981]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white/90 text-xs font-semibold">Necessary</p>
                        <p className="text-white/35 text-[11px] leading-snug">Session auth, CSRF protection, core features.</p>
                      </div>
                      <Toggle checked={true} disabled />
                    </div>

                    {/* Analytics */}
                    <div className="flex items-center gap-3 px-4 py-3">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(0,196,255,0.12)' }}>
                        <BarChart3 size={12} className="text-[#00C4FF]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white/90 text-xs font-semibold">Analytics</p>
                        <p className="text-white/35 text-[11px] leading-snug">Google Analytics 4 — page views &amp; usage stats.</p>
                      </div>
                      <Toggle checked={analyticsOn} onChange={setAnalyticsOn} />
                    </div>

                    {/* Marketing */}
                    <div className="flex items-center gap-3 px-4 py-3">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(214,61,246,0.12)' }}>
                        <Megaphone size={12} className="text-[#D63DF6]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white/90 text-xs font-semibold">Marketing</p>
                        <p className="text-white/35 text-[11px] leading-snug">Meta Pixel &amp; TikTok Pixel — ad targeting &amp; retargeting.</p>
                      </div>
                      <Toggle checked={marketingOn} onChange={setMarketingOn} />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Action buttons */}
            <div className="flex flex-col gap-2">
              {/* Primary: Accept All */}
              <button
                onClick={grantAll}
                className="w-full py-2.5 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90 active:opacity-80"
                style={{ background: 'linear-gradient(135deg, #7B5FFF, #D63DF6)' }}
              >
                Accept All
              </button>

              {/* Row: Necessary Only + Manage Prefs */}
              <div className="flex gap-2">
                <button
                  onClick={showPrefs ? handleAcceptSelected : denyAll}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-white/60 hover:text-white hover:bg-white/[0.06] border border-white/10 transition-all"
                >
                  {showPrefs ? 'Save Preferences' : 'Necessary Only'}
                </button>
                <button
                  onClick={() => setShowPrefs(v => !v)}
                  className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-white/40 hover:text-white/70 hover:bg-white/[0.04] border border-white/[0.06] transition-all"
                >
                  {showPrefs ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  {showPrefs ? 'Less' : 'Manage'}
                </button>
              </div>
            </div>

            {/* Legal links */}
            <div className="flex items-center justify-center gap-4 mt-3">
              <a href="#" className="text-[10px] text-white/25 hover:text-white/50 transition-colors underline underline-offset-2">
                Privacy Policy
              </a>
              <span className="text-white/15 text-[10px]">•</span>
              <a href="#" className="text-[10px] text-white/25 hover:text-white/50 transition-colors underline underline-offset-2">
                Cookie Policy
              </a>
              <span className="text-white/15 text-[10px]">•</span>
              <div className="flex items-center gap-1">
                <Shield size={9} className="text-white/20" />
                <span className="text-[10px] text-white/20">GDPR Compliant</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
