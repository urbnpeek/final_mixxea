// ─────────────────────────────────────────────────────────────────────────────
//  MIXXEA — Admin Platform Settings
//  Feature flags · Platform config · SLA · Email · Referral · Feature toggles
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../dashboard/AuthContext';
import * as api from '../dashboard/api';
import { toast } from 'sonner';
import {
  Settings, Shield, Zap, Users, Clock, Mail, RefreshCw,
  ToggleLeft, ToggleRight, Save, AlertTriangle, CheckCircle,
  Activity, Globe, Star, Gift, BookOpen, Eye, Key, Layers,
} from 'lucide-react';

function Toggle({ value, onChange, label, description, color = '#7B5FFF', danger = false }: any) {
  return (
    <div className="flex items-center justify-between p-4 bg-[#0D0D0D] border border-white/[0.06] rounded-xl hover:border-white/10 transition-all">
      <div className="flex-1 min-w-0 pr-4">
        <p className="text-sm font-semibold text-white">{label}</p>
        {description && <p className="text-xs text-white/40 mt-0.5">{description}</p>}
      </div>
      <button onClick={() => onChange(!value)}
        className={`flex-shrink-0 w-11 h-6 rounded-full relative transition-all duration-200 ${value ? (danger ? 'bg-[#FF5252]' : `bg-[${color}]`) : 'bg-white/10'}`}
        style={value ? { background: danger ? '#FF5252' : color } : {}}>
        <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all duration-200 shadow ${value ? 'left-[22px]' : 'left-0.5'}`} />
      </button>
    </div>
  );
}

function NumberField({ label, description, value, onChange, min = 0, max = 9999, unit = '' }: any) {
  return (
    <div className="p-4 bg-[#0D0D0D] border border-white/[0.06] rounded-xl">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-sm font-semibold text-white">{label}</p>
          {description && <p className="text-xs text-white/40 mt-0.5">{description}</p>}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <input type="number" value={value} min={min} max={max}
          onChange={e => onChange(parseInt(e.target.value) || 0)}
          className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-[#7B5FFF]/50 [appearance:textfield]" />
        {unit && <span className="text-sm text-white/40 flex-shrink-0">{unit}</span>}
      </div>
    </div>
  );
}

function TextField({ label, description, value, onChange, placeholder = '' }: any) {
  return (
    <div className="p-4 bg-[#0D0D0D] border border-white/[0.06] rounded-xl">
      <p className="text-sm font-semibold text-white mb-0.5">{label}</p>
      {description && <p className="text-xs text-white/40 mb-2">{description}</p>}
      <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#7B5FFF]/50" />
    </div>
  );
}

const SECTIONS = [
  { id: 'platform', label: 'Platform', icon: Globe },
  { id: 'users', label: 'Users & Plans', icon: Users },
  { id: 'features', label: 'Features', icon: Layers },
  { id: 'sla', label: 'SLA & Ops', icon: Clock },
  { id: 'security', label: 'Security', icon: Shield },
];

export function AdminPlatformSettings() {
  const { token } = useAuth();
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [activeSection, setActiveSection] = useState('platform');
  const [health, setHealth] = useState<any>(null);
  const [healthLoading, setHealthLoading] = useState(false);

  const load = async () => {
    if (!token) return;
    try {
      const r = await api.adminGetPlatformSettings(token);
      setSettings(r.settings);
      setDirty(false);
    } catch (err: any) {
      toast.error('Failed to load settings: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadHealth = async () => {
    if (!token) return;
    setHealthLoading(true);
    try {
      const r = await api.adminGetSystemHealth(token);
      setHealth(r);
    } catch (err: any) {
      console.error('[health]', err);
    } finally {
      setHealthLoading(false);
    }
  };

  useEffect(() => { load(); loadHealth(); }, [token]);

  const update = (key: string, value: any) => {
    setSettings((prev: any) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const handleSave = async () => {
    if (!dirty || !token) return;
    setSaving(true);
    try {
      const r = await api.adminUpdatePlatformSettings(token, settings);
      setSettings(r.settings);
      setDirty(false);
      toast.success('✅ Platform settings saved');
    } catch (err: any) {
      toast.error('Failed to save: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-[#7B5FFF] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-5 lg:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Platform Settings</h1>
          <p className="text-white/40 text-sm mt-1">Control platform behavior, features, and SLA configuration</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={load} disabled={loading}
            className="flex items-center gap-2 px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white/60 hover:text-white text-xs font-medium transition-all">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button onClick={handleSave} disabled={saving || !dirty}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 hover:opacity-90 transition-all"
            style={dirty ? { background: 'linear-gradient(135deg, #7B5FFF, #D63DF6)' } : { background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.06)' }}>
            <Save size={14} /> {saving ? 'Saving...' : dirty ? 'Save Changes' : 'Saved'}
          </button>
        </div>
      </div>

      {/* System Health */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="mb-6 p-5 bg-[#0D0D0D] border border-white/[0.06] rounded-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity size={15} className="text-[#10B981]" />
            <h2 className="text-sm font-bold text-white">System Health</h2>
          </div>
          <button onClick={loadHealth} disabled={healthLoading}
            className="text-xs text-white/40 hover:text-white flex items-center gap-1 transition-all">
            <RefreshCw size={11} className={healthLoading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
        {health ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Object.entries(health.services || {}).map(([key, svc]: any) => (
              <div key={key} className="p-3 bg-[#111111] border border-white/[0.05] rounded-xl">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className={`w-2 h-2 rounded-full ${svc.healthy ? 'bg-[#10B981]' : 'bg-[#FF5252]'} ${svc.healthy ? 'animate-pulse' : ''}`} />
                  <span className="text-[10px] text-white/50 font-medium">{svc.label || key}</span>
                </div>
                <p className="text-xs font-bold text-white">{svc.healthy ? 'Operational' : 'Degraded'}</p>
                {svc.latencyMs !== undefined && <p className="text-[10px] text-white/30 mt-0.5">{svc.latencyMs}ms latency</p>}
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-3">
            {[1,2,3,4].map(i => <div key={i} className="h-16 bg-white/[0.03] rounded-xl animate-pulse" />)}
          </div>
        )}
        {health && (
          <div className="mt-4 grid grid-cols-3 gap-3">
            {[
              { label: 'Total Users', value: health.platform?.totalUsers || 0, color: '#00C4FF' },
              { label: 'Open Tickets', value: health.platform?.openTickets || 0, color: '#D63DF6' },
              { label: 'Pending', value: (health.platform?.pendingCampaigns || 0) + (health.platform?.pendingReleases || 0), color: '#F59E0B' },
            ].map(s => (
              <div key={s.label} className="p-3 bg-[#111111] border border-white/[0.05] rounded-xl text-center">
                <p className="text-xl font-black text-white">{s.value}</p>
                <p className="text-[10px] mt-0.5" style={{ color: s.color }}>{s.label}</p>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      <div className="flex gap-6">
        {/* Sidebar nav */}
        <div className="flex-shrink-0 w-40">
          <nav className="space-y-1 sticky top-4">
            {SECTIONS.map(s => (
              <button key={s.id} onClick={() => setActiveSection(s.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${activeSection === s.id ? 'bg-[#7B5FFF]/15 border border-[#7B5FFF]/20 text-white' : 'text-white/40 hover:text-white hover:bg-white/[0.04]'}`}>
                <s.icon size={14} className={activeSection === s.id ? 'text-[#7B5FFF]' : ''} />
                {s.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Settings panel */}
        <div className="flex-1 space-y-3">

          {/* Platform */}
          {activeSection === 'platform' && settings && (
            <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} className="space-y-3">
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest px-1">Platform Status</p>

              {settings.maintenanceMode && (
                <div className="p-4 bg-[#FF5252]/10 border border-[#FF5252]/30 rounded-xl flex items-center gap-3">
                  <AlertTriangle size={16} className="text-[#FF5252]" />
                  <p className="text-sm text-[#FF5252] font-semibold">⚠️ Maintenance Mode is ACTIVE — Users cannot log in</p>
                </div>
              )}

              <Toggle value={settings.maintenanceMode} onChange={v => update('maintenanceMode', v)}
                label="Maintenance Mode" description="Blocks all user logins and shows maintenance page" danger />
              <TextField label="Maintenance Message" value={settings.maintenanceMessage || ''}
                onChange={(v: string) => update('maintenanceMessage', v)}
                description="Message shown to users during maintenance" />
              <Toggle value={settings.signupEnabled} onChange={v => update('signupEnabled', v)}
                label="User Signups" description="Allow new users to register on the platform" />
              <TextField label="Support Email" value={settings.supportEmail || ''}
                onChange={(v: string) => update('supportEmail', v)}
                description="Public-facing support email address" />
            </motion.div>
          )}

          {/* Users & Plans */}
          {activeSection === 'users' && settings && (
            <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} className="space-y-3">
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest px-1">User Defaults</p>
              <NumberField label="Default Credits for New Users" value={settings.defaultCreditsNewUser || 100}
                onChange={(v: number) => update('defaultCreditsNewUser', v)} unit="credits"
                description="Credits automatically granted on account creation" />
              <Toggle value={settings.creditPackagesEnabled} onChange={v => update('creditPackagesEnabled', v)}
                label="Credit Packages" description="Allow users to purchase credit packages via Stripe" />
              <NumberField label="Max Tickets Per User" value={settings.maxTicketsPerUser || 10}
                onChange={(v: number) => update('maxTicketsPerUser', v)} unit="tickets"
                description="Maximum concurrent open support tickets per user" />
              <NumberField label="Max Release Tracks" value={settings.maxReleaseTracksPerUser || 50}
                onChange={(v: number) => update('maxReleaseTracksPerUser', v)} unit="tracks"
                description="Maximum tracks allowed per user across all releases" />
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest px-1 pt-2">Plans</p>
              <div className="p-4 bg-[#0D0D0D] border border-white/[0.06] rounded-xl">
                <p className="text-sm font-semibold text-white mb-3">Featured Plan (shown as recommended)</p>
                <div className="grid grid-cols-3 gap-2">
                  {['starter', 'growth', 'pro'].map(p => (
                    <button key={p} onClick={() => update('featuredPlan', p)}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold capitalize transition-all border ${settings.featuredPlan === p ? 'bg-[#7B5FFF]/20 border-[#7B5FFF]/40 text-[#7B5FFF]' : 'border-white/[0.08] text-white/40 hover:text-white hover:border-white/20'}`}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Features */}
          {activeSection === 'features' && settings && (
            <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} className="space-y-3">
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest px-1">Feature Toggles</p>
              <Toggle value={settings.trialEnabled} onChange={v => update('trialEnabled', v)}
                label="Free Trial" description="Allow users to start a free trial period" />
              {settings.trialEnabled && (
                <NumberField label="Trial Duration" value={settings.trialDays || 7}
                  onChange={(v: number) => update('trialDays', v)} unit="days"
                  description="Number of days for the free trial" />
              )}
              <Toggle value={settings.referralEnabled} onChange={v => update('referralEnabled', v)}
                label="Referral Program" description="Enable user referral codes and bonus credits" />
              {settings.referralEnabled && (
                <NumberField label="Referral Bonus Credits" value={settings.referralBonusCredits || 50}
                  onChange={(v: number) => update('referralBonusCredits', v)} unit="credits"
                  description="Credits awarded per successful referral" />
              )}
              <Toggle value={settings.communityEnabled} onChange={v => update('communityEnabled', v)}
                label="Community Feed" description="Enable the artist community discussion feed" />
              <Toggle value={settings.academyEnabled} onChange={v => update('academyEnabled', v)}
                label="MIXXEA Academy" description="Enable the music industry education academy" />
              <Toggle value={settings.contentIdEnabled} onChange={v => update('contentIdEnabled', v)}
                label="Content ID" description="Enable YouTube Content ID monetization feature" />
            </motion.div>
          )}

          {/* SLA & Ops */}
          {activeSection === 'sla' && settings && (
            <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} className="space-y-3">
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest px-1">SLA Configuration</p>
              <NumberField label="Campaign Review SLA" value={settings.campaignReviewSlaHours || 48}
                onChange={(v: number) => update('campaignReviewSlaHours', v)} unit="hours"
                description="Maximum hours to review a campaign before SLA breach alert" />
              <div className="p-4 bg-[#0D0D0D] border border-white/[0.06] rounded-xl">
                <p className="text-sm font-semibold text-white mb-1">SLA Thresholds</p>
                <p className="text-xs text-white/40 mb-3">Admin Command Center highlights orders past these thresholds</p>
                <div className="space-y-2">
                  {[
                    { label: '🟢 On Track', description: `Under ${Math.round((settings.campaignReviewSlaHours || 48) / 2)}h` },
                    { label: '🟡 Warning', description: `${Math.round((settings.campaignReviewSlaHours || 48) / 2)}h – ${settings.campaignReviewSlaHours || 48}h` },
                    { label: '🔴 Breached', description: `Over ${settings.campaignReviewSlaHours || 48}h` },
                  ].map(t => (
                    <div key={t.label} className="flex items-center justify-between text-xs">
                      <span className="text-white/60">{t.label}</span>
                      <span className="text-white/40 font-mono">{t.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Security */}
          {activeSection === 'security' && settings && (
            <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} className="space-y-3">
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest px-1">Security & Auth</p>
              <Toggle value={settings.twoFactorEnabled} onChange={v => update('twoFactorEnabled', v)}
                label="Two-Factor Authentication" description="Allow users to enable TOTP-based 2FA on their accounts" />
              <div className="p-4 bg-[#0D0D0D] border border-white/[0.06] rounded-xl">
                <p className="text-sm font-semibold text-white mb-1">Session Security</p>
                <div className="space-y-2 mt-2">
                  {[
                    { label: 'Session Duration', value: '90 days (HMAC tokens)' },
                    { label: 'Token Type', value: 'HMAC-SHA256 v2' },
                    { label: 'Password Hashing', value: 'SHA-256 + salt' },
                    { label: 'Admin Protection', value: 'isAdmin flag + token verify' },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between text-xs">
                      <span className="text-white/40">{item.label}</span>
                      <span className="text-white/70 font-mono">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-4 bg-[#F59E0B]/10 border border-[#F59E0B]/20 rounded-xl">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={14} className="text-[#F59E0B] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-[#F59E0B]">Admin Secret Required</p>
                    <p className="text-xs text-white/40 mt-0.5">The <code className="text-[#F59E0B]">MIXXEA_ADMIN_SECRET</code> environment variable must be set in Supabase to use admin bootstrap. Never share this value.</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

        </div>
      </div>

      {/* Save bar */}
      {dirty && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-6 right-6 flex items-center gap-3 px-5 py-3 bg-[#111111] border border-white/10 rounded-2xl shadow-2xl z-40">
          <div className="w-2 h-2 rounded-full bg-[#F59E0B] animate-pulse" />
          <span className="text-sm text-white/70">Unsaved changes</span>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50 hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #7B5FFF, #D63DF6)' }}>
            <Save size={13} /> {saving ? 'Saving...' : 'Save Now'}
          </button>
        </motion.div>
      )}
    </div>
  );
}