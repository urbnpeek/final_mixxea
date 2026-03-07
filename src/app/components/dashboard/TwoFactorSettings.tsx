// ─────────────────────────────────────────────────────────────────────────────
//  MIXXEA — Feature 16: Two-Factor Authentication Settings
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from './AuthContext';
import * as api from './api';
import { toast } from 'sonner';
import { Shield, QrCode, Key, Check, X, Eye, EyeOff, Copy, AlertTriangle } from 'lucide-react';

export function TwoFactorSettings() {
  const { token } = useAuth();
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<'idle'|'setup'|'confirm'|'backup'>('idle');
  const [setupData, setSetupData] = useState<any>(null);
  const [code, setCode] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verifyForm, setVerifyForm] = useState(false);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (!token) return;
    api.get2FAStatus(token).then((r: any) => setEnabled(r.enabled)).catch(() => {}).finally(() => setLoading(false));
  }, [token]);

  const handleSetup = async () => {
    setWorking(true);
    try {
      const r = await api.setup2FA(token!) as any;
      setSetupData(r);
      setStep('setup');
    } catch (err: any) { toast.error(err.message); }
    finally { setWorking(false); }
  };

  const handleConfirm = async () => {
    if (code.length !== 6) { toast.error('Enter the 6-digit code'); return; }
    setWorking(true);
    try {
      const r = await api.confirm2FA(token!, code) as any;
      setBackupCodes(r.backupCodes);
      setEnabled(true);
      setStep('backup');
      toast.success('2FA enabled successfully!');
    } catch (err: any) { toast.error(err.message || 'Invalid code'); }
    finally { setWorking(false); }
  };

  const handleDisable = async () => {
    if (disableCode.length !== 6) { toast.error('Enter your 6-digit code'); return; }
    setWorking(true);
    try {
      await api.disable2FA(token!, disableCode);
      setEnabled(false);
      setVerifyForm(false);
      setDisableCode('');
      toast.success('2FA disabled');
    } catch (err: any) { toast.error(err.message || 'Invalid code'); }
    finally { setWorking(false); }
  };

  const copyBackup = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'));
    toast.success('Backup codes copied!');
  };

  if (loading) return null;

  // QR URL conversion: just show a styled QR code instruction since we can't render actual QR
  return (
    <div className="bg-[#0D0D0D] border border-white/[0.07] rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 p-5 border-b border-white/[0.06]">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${enabled ? 'bg-[#10B981]/20' : 'bg-white/[0.05]'}`}>
          <Shield size={17} className={enabled ? 'text-[#10B981]' : 'text-white/40'} />
        </div>
        <div className="flex-1">
          <div className="text-sm font-bold text-white">Two-Factor Authentication</div>
          <div className="text-xs text-white/40">Add an extra layer of security to your account</div>
        </div>
        <div className={`text-xs font-bold px-2.5 py-1 rounded-full ${enabled ? 'text-[#10B981] bg-[#10B981]/15' : 'text-white/30 bg-white/[0.05]'}`}>
          {enabled ? '✓ Enabled' : 'Disabled'}
        </div>
      </div>

      <div className="p-5">
        {step === 'idle' && !enabled && (
          <div>
            <p className="text-sm text-white/50 mb-4 leading-relaxed">
              Use an authenticator app (Google Authenticator, Authy) to generate a time-based 6-digit code every time you sign in.
            </p>
            <button onClick={handleSetup} disabled={working}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg,#7B5FFF,#D63DF6)' }}>
              <Shield size={13} /> {working ? 'Setting up…' : 'Enable 2FA'}
            </button>
          </div>
        )}

        {step === 'setup' && setupData && (
          <div className="space-y-4">
            <div className="p-4 bg-[#050505] border border-white/[0.06] rounded-xl">
              <div className="flex items-center gap-2 mb-3">
                <QrCode size={14} className="text-[#7B5FFF]" />
                <span className="text-sm font-semibold text-white">Step 1: Open your authenticator app</span>
              </div>
              <p className="text-xs text-white/50 mb-3">Scan the QR code or enter the secret key manually in Google Authenticator, Authy, or 1Password.</p>
              <div className="p-3 bg-[#0D0D0D] rounded-xl border border-[#7B5FFF]/20">
                <div className="text-[10px] text-white/30 mb-1.5 uppercase tracking-widest">Manual Entry Key</div>
                <div className="flex items-center gap-2">
                  <code className="text-sm font-mono text-[#7B5FFF] tracking-widest flex-1">{setupData.secret}</code>
                  <button onClick={() => { navigator.clipboard.writeText(setupData.secret); toast.success('Secret copied'); }}
                    className="text-white/30 hover:text-white p-1">
                    <Copy size={13} />
                  </button>
                </div>
              </div>
              <div className="mt-3 text-xs text-white/30">
                <strong className="text-white/60">Account:</strong> {setupData.email} · <strong className="text-white/60">Issuer:</strong> MIXXEA
              </div>
            </div>
            <div>
              <label className="text-xs text-white/50 font-medium mb-1.5 block">Step 2: Enter the 6-digit code from your app</label>
              <div className="flex gap-3">
                <input value={code} onChange={e => setCode(e.target.value.replace(/\D/g,'').slice(0,6))}
                  placeholder="000000" maxLength={6}
                  className="flex-1 px-4 py-3 bg-[#050505] border border-white/[0.08] rounded-xl text-lg font-mono text-white text-center tracking-[0.4em] placeholder:text-white/20 focus:outline-none focus:border-[#7B5FFF]/50" />
                <button onClick={handleConfirm} disabled={working || code.length !== 6}
                  className="px-5 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg,#7B5FFF,#D63DF6)' }}>
                  {working ? 'Verifying…' : 'Verify'}
                </button>
              </div>
            </div>
            <button onClick={() => { setStep('idle'); setSetupData(null); setCode(''); }}
              className="text-xs text-white/30 hover:text-white transition-colors">
              Cancel setup
            </button>
          </div>
        )}

        {step === 'backup' && backupCodes.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-[#F59E0B]/10 border border-[#F59E0B]/25 rounded-xl">
              <AlertTriangle size={15} className="text-[#F59E0B] flex-shrink-0 mt-0.5" />
              <p className="text-xs text-[#F59E0B]">Save these backup codes in a safe place. Each can be used once if you lose access to your authenticator app.</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {backupCodes.map((code, i) => (
                <div key={i} className="font-mono text-sm text-white/80 bg-[#050505] px-3 py-2 rounded-lg text-center tracking-widest">{code}</div>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={copyBackup}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-white/[0.08] text-white/60 hover:text-white transition-all">
                <Copy size={12} /> Copy All
              </button>
              <button onClick={() => setStep('idle')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white"
                style={{ background: 'linear-gradient(135deg,#10B981,#00C4FF)' }}>
                <Check size={12} /> Done
              </button>
            </div>
          </div>
        )}

        {step === 'idle' && enabled && (
          <div>
            <div className="flex items-center gap-2 p-3 bg-[#10B981]/08 border border-[#10B981]/20 rounded-xl mb-4">
              <Check size={13} className="text-[#10B981]" />
              <span className="text-xs text-[#10B981] font-semibold">Your account is protected with 2FA</span>
            </div>
            {!verifyForm ? (
              <button onClick={() => setVerifyForm(true)}
                className="text-sm text-[#FF5252]/70 hover:text-[#FF5252] transition-colors">
                Disable 2FA
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-white/50">Enter your current authenticator code to disable 2FA:</p>
                <div className="flex gap-3">
                  <input value={disableCode} onChange={e => setDisableCode(e.target.value.replace(/\D/g,'').slice(0,6))}
                    placeholder="000000" maxLength={6}
                    className="flex-1 px-4 py-2.5 bg-[#050505] border border-white/[0.08] rounded-xl text-lg font-mono text-white text-center tracking-[0.4em] placeholder:text-white/20 focus:outline-none focus:border-[#FF5252]/50" />
                  <button onClick={handleDisable} disabled={working || disableCode.length !== 6}
                    className="px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-[#FF5252]/80 hover:bg-[#FF5252] disabled:opacity-50 transition-all">
                    {working ? '…' : 'Disable'}
                  </button>
                  <button onClick={() => { setVerifyForm(false); setDisableCode(''); }}
                    className="px-3 py-2.5 rounded-xl text-sm text-white/30 hover:text-white transition-colors">
                    <X size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
