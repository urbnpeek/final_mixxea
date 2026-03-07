// ─────────────────────────────────────────────────────────────────────────────
//  MIXXEA — Feature 15: Artist Verification Badge Application
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import * as api from './api';
import { toast } from 'sonner';
import { Shield, CheckCircle, Clock } from 'lucide-react';

export function VerificationSettings() {
  const { token } = useAuth();
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [reason, setReason] = useState('');
  const [links, setLinks] = useState('');
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    if (!token) return;
    api.getVerificationStatus(token).then((r: any) => setStatus(r)).catch(() => {}).finally(() => setLoading(false));
  }, [token]);

  const handleApply = async () => {
    if (!reason.trim()) { toast.error('Please explain why you should be verified'); return; }
    setApplying(true);
    try {
      await api.applyVerification(token!, { reason, links: links.split('\n').filter(Boolean) });
      setApplied(true);
      toast.success('Verification application submitted! We review within 3–5 business days.');
    } catch (err: any) { toast.error(err.message); }
    finally { setApplying(false); }
  };

  if (loading) return null;

  return (
    <div className="bg-[#0D0D0D] border border-white/[0.07] rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 p-5 border-b border-white/[0.06]">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${status?.verified ? 'bg-[#00C4FF]/20' : 'bg-white/[0.05]'}`}>
          <Shield size={17} className={status?.verified ? 'text-[#00C4FF]' : 'text-white/40'} />
        </div>
        <div className="flex-1">
          <div className="text-sm font-bold text-white flex items-center gap-2">
            Verification Badge
            {status?.verified && <CheckCircle size={14} className="text-[#00C4FF]" />}
          </div>
          <div className="text-xs text-white/40">Build trust with curators and industry professionals</div>
        </div>
        {status?.verified && (
          <div className="text-xs font-bold px-2.5 py-1 rounded-full text-[#00C4FF] bg-[#00C4FF]/15">✓ Verified</div>
        )}
      </div>

      <div className="p-5">
        {status?.verified ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 bg-[#00C4FF]/08 border border-[#00C4FF]/20 rounded-xl">
              <CheckCircle size={13} className="text-[#00C4FF]" />
              <span className="text-xs text-[#00C4FF] font-semibold">Your account is verified as a trusted {status.badge || 'artist'}</span>
            </div>
            <p className="text-xs text-white/40 leading-relaxed">Your verification badge appears on your public Smart Link page and artist profile, visible to playlist curators and industry contacts who review your submissions.</p>
          </div>
        ) : applied ? (
          <div className="flex items-center gap-3 p-4 bg-[#F59E0B]/08 border border-[#F59E0B]/20 rounded-xl">
            <Clock size={15} className="text-[#F59E0B] flex-shrink-0" />
            <div>
              <div className="text-sm font-semibold text-white">Application Under Review</div>
              <div className="text-xs text-white/40 mt-0.5">We typically respond within 3–5 business days.</div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-white/50 leading-relaxed">Apply for a MIXXEA verified badge. Requirements: active releases, consistent brand presence, and authentic artist activity.</p>
            <div>
              <label className="text-xs text-white/50 font-medium mb-1.5 block">Why do you qualify for verification? *</label>
              <textarea value={reason} onChange={e => setReason(e.target.value)}
                placeholder="e.g. I've released 3 albums, have 50K+ monthly listeners on Spotify, and have been featured in…"
                rows={3}
                className="w-full px-4 py-3 bg-[#050505] border border-white/[0.08] rounded-xl text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-[#7B5FFF]/50 resize-none" />
            </div>
            <div>
              <label className="text-xs text-white/50 font-medium mb-1.5 block">Links (Spotify, website, press — one per line)</label>
              <textarea value={links} onChange={e => setLinks(e.target.value)}
                placeholder="https://open.spotify.com/artist/..."
                rows={2}
                className="w-full px-4 py-3 bg-[#050505] border border-white/[0.08] rounded-xl text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-[#7B5FFF]/50 resize-none" />
            </div>
            <button onClick={handleApply} disabled={applying || !reason.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg,#00C4FF,#7B5FFF)' }}>
              <Shield size={13} /> {applying ? 'Submitting…' : 'Apply for Verification'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
