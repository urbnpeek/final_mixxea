import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../dashboard/AuthContext';
import * as api from '../dashboard/api';
import { toast } from 'sonner';
import {
  Megaphone, Play, Pause, CheckCircle, Clock, Search, X,
  RefreshCw, User, Zap, TrendingUp, Music2, Youtube, Instagram,
  Globe, Mic, DollarSign, Radio, BarChart2, Edit3, Save,
  ThumbsUp, ThumbsDown, MessageCircle, AlertCircle, ChevronDown,
  ChevronUp, Eye, FileText, Calendar, Target,
} from 'lucide-react';

const SERVICE_MAP: Record<string, any> = {
  spotify_growth:   { name: 'Spotify Growth',    icon: Music2,      color: '#1DB954' },
  playlist_pitching:{ name: 'Playlist Pitching',  icon: Radio,       color: '#7B5FFF' },
  tiktok_ugc:       { name: 'TikTok UGC',         icon: TrendingUp,  color: '#FF0050' },
  ig_ugc:           { name: 'Instagram UGC',       icon: Instagram,   color: '#E1306C' },
  youtube_ads:      { name: 'YouTube Ads',         icon: Youtube,     color: '#FF0000' },
  pr_press:         { name: 'PR & Press',          icon: Mic,         color: '#F59E0B' },
  meta_ads:         { name: 'Meta / Google Ads',   icon: Globe,       color: '#1877F2' },
  sync_licensing:   { name: 'Sync Licensing',      icon: DollarSign,  color: '#10B981' },
};

const STATUS_CFG: Record<string, any> = {
  pending_review: { label: 'Pending Review', color: '#F59E0B', bg: '#F59E0B18', icon: Clock },
  needs_info:     { label: 'Needs Info',     color: '#00C4FF', bg: '#00C4FF18', icon: MessageCircle },
  active:         { label: 'Active',         color: '#10B981', bg: '#10B98118', icon: Play },
  paused:         { label: 'Paused',         color: '#9CA3AF', bg: '#9CA3AF18', icon: Pause },
  completed:      { label: 'Completed',      color: '#6B7280', bg: '#6B728018', icon: CheckCircle },
  rejected:       { label: 'Rejected',       color: '#FF5252', bg: '#FF525218', icon: X },
};

// ── Approve Modal ──────────────────────────────────────────────────────────────
function ApproveModal({ campaign, onApprove, onClose }: any) {
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const svc = SERVICE_MAP[campaign.type] || { name: campaign.type, icon: Megaphone, color: '#7B5FFF' };

  const handle = async () => {
    setSaving(true);
    try {
      await onApprove({ adminNotes: note });
      toast.success('✅ Campaign approved & user notified!');
      onClose();
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#0D0D0D] border border-white/[0.08] rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#10B981]/15 flex items-center justify-center">
              <ThumbsUp size={16} className="text-[#10B981]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Approve Campaign</h2>
              <p className="text-xs text-white/40">{campaign.userName} · {svc.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="p-3 bg-[#10B981]/10 border border-[#10B981]/20 rounded-xl">
            <p className="text-sm font-semibold text-white mb-0.5">{campaign.name}</p>
            <div className="flex items-center gap-2 text-xs text-white/40">
              <Zap size={11} className="text-[#00C4FF]" />{campaign.creditCost} credits
              {campaign.releaseTitle && <><span className="text-white/20">·</span>{campaign.releaseTitle}</>}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-white/50 mb-2 uppercase tracking-wider">Note to User (optional)</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={3}
              placeholder="Any message for the artist about their campaign..."
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#10B981]/50 resize-none" />
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 rounded-xl text-sm font-medium text-white/60 bg-white/[0.05] hover:bg-white/[0.08] transition-all">Cancel</button>
            <button onClick={handle} disabled={saving}
              className="flex-1 py-3 rounded-xl text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #10B981, #00C4FF)' }}>
              <ThumbsUp size={14} />{saving ? 'Approving...' : 'Approve & Activate'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Reject Modal ───────────────────────────────────────────────────────────────
function RejectModal({ campaign, onReject, onClose }: any) {
  const [reason, setReason] = useState('');
  const [note, setNote]     = useState('');
  const [saving, setSaving] = useState(false);

  const QUICK_REASONS = [
    'Insufficient campaign details provided',
    'Release not yet distributed / unavailable',
    'Target audience too broad or unclear',
    'Campaign brief does not meet our guidelines',
    'Duplicate campaign already submitted',
    'Service not available in this territory',
  ];

  const handle = async () => {
    if (!reason.trim()) { toast.error('Please provide a rejection reason'); return; }
    setSaving(true);
    try {
      await onReject({ reason, adminNotes: note });
      toast.success('Campaign rejected & credits refunded to user');
      onClose();
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <motion.div initial={{ opacity: 0, y: 20, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#0D0D0D] border border-white/[0.08] rounded-2xl w-full max-w-md my-4">
        <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#FF5252]/15 flex items-center justify-center">
              <ThumbsDown size={16} className="text-[#FF5252]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Reject Campaign</h2>
              <p className="text-xs text-[#FF5252]/70">{campaign.creditCost} credits will be refunded automatically</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="p-3 bg-[#FF5252]/10 border border-[#FF5252]/20 rounded-xl">
            <p className="text-sm font-semibold text-white mb-0.5">{campaign.name}</p>
            <p className="text-xs text-white/40">{campaign.userName} · {campaign.userEmail}</p>
          </div>

          {/* Quick reasons */}
          <div>
            <label className="block text-xs font-semibold text-white/50 mb-2 uppercase tracking-wider">Quick Reasons</label>
            <div className="space-y-1.5">
              {QUICK_REASONS.map(r => (
                <button key={r} onClick={() => setReason(r)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-all border ${reason === r ? 'bg-[#FF5252]/15 border-[#FF5252]/30 text-white' : 'border-white/[0.06] text-white/40 hover:border-white/20 hover:text-white/70'}`}>
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/50 mb-2 uppercase tracking-wider">Or Custom Reason *</label>
            <input value={reason} onChange={e => setReason(e.target.value)} required
              placeholder="Type a rejection reason..."
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#FF5252]/50" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/50 mb-2 uppercase tracking-wider">Internal Notes (not sent to user)</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={2}
              placeholder="Internal team notes..."
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/20 resize-none" />
          </div>

          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 rounded-xl text-sm font-medium text-white/60 bg-white/[0.05] hover:bg-white/[0.08] transition-all">Cancel</button>
            <button onClick={handle} disabled={saving || !reason.trim()}
              className="flex-1 py-3 rounded-xl text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #FF5252, #D63DF6)' }}>
              <ThumbsDown size={14} />{saving ? 'Rejecting...' : 'Reject & Refund'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Request Info Modal ─────────────────────────────────────────────────────────
function RequestInfoModal({ campaign, onRequest, onClose }: any) {
  const [message, setMessage] = useState('');
  const [saving, setSaving]   = useState(false);

  const QUICK = [
    'Please provide a direct link to your release on Spotify or Apple Music.',
    'Please describe your target audience in more detail (genre, age, region).',
    'Please provide reference artists similar to your sound.',
    'Please confirm the release date and that the track is fully distributed.',
    'Please share your social media handles for campaign linking.',
  ];

  const handle = async () => {
    if (!message.trim()) { toast.error('Message is required'); return; }
    setSaving(true);
    try {
      await onRequest({ message });
      toast.success('User notified — campaign status set to Needs Info');
      onClose();
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <motion.div initial={{ opacity: 0, y: 20, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#0D0D0D] border border-white/[0.08] rounded-2xl w-full max-w-md my-4">
        <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#00C4FF]/15 flex items-center justify-center">
              <MessageCircle size={16} className="text-[#00C4FF]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Request More Info</h2>
              <p className="text-xs text-white/40">{campaign.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-white/50 mb-2 uppercase tracking-wider">Quick Templates</label>
            <div className="space-y-1.5">
              {QUICK.map(q => (
                <button key={q} onClick={() => setMessage(q)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-all border ${message === q ? 'bg-[#00C4FF]/15 border-[#00C4FF]/30 text-white' : 'border-white/[0.06] text-white/40 hover:border-white/20 hover:text-white/70'}`}>
                  {q}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-white/50 mb-2 uppercase tracking-wider">Message to User *</label>
            <textarea value={message} onChange={e => setMessage(e.target.value)} rows={4}
              placeholder="What information do you need from the artist?"
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#00C4FF]/50 resize-none" />
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 rounded-xl text-sm font-medium text-white/60 bg-white/[0.05] hover:bg-white/[0.08] transition-all">Cancel</button>
            <button onClick={handle} disabled={saving || !message.trim()}
              className="flex-1 py-3 rounded-xl text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #00C4FF, #7B5FFF)' }}>
              <MessageCircle size={14} />{saving ? 'Sending...' : 'Send & Notify'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Fulfill / Results Editor ───────────────────────────────────────────────────
function FulfillModal({ campaign, onSave, onClose }: any) {
  const svc = SERVICE_MAP[campaign.type] || { name: campaign.type, icon: Megaphone, color: '#7B5FFF' };
  const [results, setResults] = useState({ streams: 0, saves: 0, playlists: 0, reach: 0, clicks: 0, conversions: 0, ...(campaign.results || {}) });
  const [status, setStatus]   = useState(campaign.status || 'active');
  const [notes, setNotes]     = useState(campaign.adminNotes || '');
  const [saving, setSaving]   = useState(false);

  const handle = async () => {
    setSaving(true);
    try {
      await onSave({ results, status, adminNotes: notes });
      toast.success('Campaign updated');
      onClose();
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const LIVE_STATUSES = ['active', 'paused', 'completed'];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <motion.div initial={{ opacity: 0, y: 20, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#0D0D0D] border border-white/[0.08] rounded-2xl w-full max-w-lg my-4">
        <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${svc.color}20` }}>
              <svc.icon size={18} style={{ color: svc.color }} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">{campaign.name}</h2>
              <p className="text-xs text-white/40">{svc.name} · {campaign.userName}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-5">
          <div>
            <label className="block text-xs font-semibold text-white/50 mb-2 uppercase tracking-wider">Campaign Status</label>
            <div className="grid grid-cols-3 gap-2">
              {LIVE_STATUSES.map(key => {
                const sc = STATUS_CFG[key];
                return (
                  <button key={key} onClick={() => setStatus(key)}
                    className={`py-2.5 rounded-xl text-xs font-medium transition-all border ${status === key ? 'text-white border-transparent' : 'border-white/[0.08] text-white/40 hover:border-white/20 bg-transparent'}`}
                    style={status === key ? { background: sc.bg, color: sc.color, borderColor: `${sc.color}40` } : {}}>
                    {sc.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/50 mb-3 uppercase tracking-wider">Campaign Results</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'streams', label: 'Streams' }, { key: 'reach', label: 'Total Reach' },
                { key: 'saves', label: 'Saves' }, { key: 'playlists', label: 'Playlist Adds' },
                { key: 'clicks', label: 'Clicks' }, { key: 'conversions', label: 'Conversions' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-[11px] text-white/40 mb-1">{f.label}</label>
                  <input type="number" min="0"
                    value={(results as any)[f.key] || 0}
                    onChange={e => setResults((r: any) => ({ ...r, [f.key]: parseInt(e.target.value) || 0 }))}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#7B5FFF]/50" />
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/50 mb-2 uppercase tracking-wider">Internal Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
              placeholder="Internal notes (not visible to client)..."
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#7B5FFF]/50 resize-none" />
          </div>

          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 rounded-xl text-sm font-medium text-white/60 bg-white/[0.05] hover:bg-white/[0.08] transition-all">Cancel</button>
            <button onClick={handle} disabled={saving}
              className="flex-1 py-3 rounded-xl text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #7B5FFF, #D63DF6)' }}>
              <Save size={14} />{saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Campaign Row ───────────────────────────────────────────────────────────────
function CampaignRow({ campaign, onApprove, onReject, onRequestInfo, onFulfill }: any) {
  const [expanded, setExpanded] = useState(false);
  const svc = SERVICE_MAP[campaign.type] || { name: campaign.type, icon: Megaphone, color: '#7B5FFF' };
  const sc  = STATUS_CFG[campaign.status] || STATUS_CFG.active;
  const isPending   = campaign.status === 'pending_review';
  const isNeedsInfo = campaign.status === 'needs_info';
  const isLive      = campaign.status === 'active' || campaign.status === 'paused';
  const results     = campaign.results || {};

  return (
    <motion.div layout className={`bg-[#0D0D0D] border rounded-2xl overflow-hidden transition-all ${isPending ? 'border-[#F59E0B]/30 shadow-[0_0_20px_#F59E0B08]' : isNeedsInfo ? 'border-[#00C4FF]/20' : 'border-white/[0.06]'}`}>
      {/* Urgent badge */}
      {isPending && (
        <div className="flex items-center gap-2 px-5 py-2 bg-[#F59E0B]/10 border-b border-[#F59E0B]/20">
          <div className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] animate-pulse" />
          <span className="text-[11px] font-semibold text-[#F59E0B] uppercase tracking-wider">Awaiting Your Review</span>
        </div>
      )}
      {isNeedsInfo && (
        <div className="flex items-center gap-2 px-5 py-2 bg-[#00C4FF]/10 border-b border-[#00C4FF]/20">
          <MessageCircle size={11} className="text-[#00C4FF]" />
          <span className="text-[11px] font-semibold text-[#00C4FF] uppercase tracking-wider">Waiting for Artist Response</span>
        </div>
      )}

      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${svc.color}18` }}>
            <svc.icon size={20} style={{ color: svc.color }} />
          </div>

          {/* Main info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="font-bold text-white text-sm">{campaign.name}</h3>
              <span className="text-[11px] px-2 py-0.5 rounded-lg font-semibold" style={{ background: sc.bg, color: sc.color }}>{sc.label}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-white/40 mb-3 flex-wrap">
              <User size={11} />
              <span className="font-medium text-white/60">{campaign.userName}</span>
              <span className="text-white/20">·</span>
              <span>{campaign.userEmail}</span>
              <span className="text-white/20">·</span>
              <span>{svc.name}</span>
              {campaign.releaseTitle && <><span className="text-white/20">·</span><span className="text-[#7B5FFF]">{campaign.releaseTitle}</span></>}
            </div>

            {/* Metrics strip */}
            {isLive && (
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {[
                  { key: 'streams', label: 'Streams', color: svc.color },
                  { key: 'reach', label: 'Reach', color: '#00C4FF' },
                  { key: 'saves', label: 'Saves', color: '#7B5FFF' },
                  { key: 'playlists', label: 'Playlists', color: '#D63DF6' },
                  { key: 'clicks', label: 'Clicks', color: '#F59E0B' },
                  { key: 'conversions', label: 'Conv.', color: '#10B981' },
                ].map(m => (
                  <div key={m.key} className="text-center p-2 bg-white/[0.03] rounded-xl">
                    <div className="text-sm font-bold text-white">{((results as any)[m.key] || 0).toLocaleString()}</div>
                    <div className="text-[10px] text-white/30 mt-0.5">{m.label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Admin notes / rejection reason displayed on card */}
            {campaign.rejectionReason && (
              <div className="mt-3 px-3 py-2 bg-[#FF5252]/10 border border-[#FF5252]/20 rounded-xl">
                <p className="text-xs text-[#FF5252]"><span className="font-semibold">Rejected:</span> {campaign.rejectionReason}</p>
              </div>
            )}
            {campaign.adminNotes && campaign.status === 'needs_info' && (
              <div className="mt-3 px-3 py-2 bg-[#00C4FF]/10 border border-[#00C4FF]/20 rounded-xl">
                <p className="text-xs text-[#00C4FF]"><span className="font-semibold">Requested:</span> {campaign.adminNotes}</p>
              </div>
            )}
          </div>

          {/* Right actions */}
          <div className="flex flex-col gap-2 flex-shrink-0 items-end">
            {/* Primary actions based on status */}
            {(isPending || isNeedsInfo) && (
              <div className="flex gap-1.5">
                <button onClick={() => onApprove(campaign)}
                  className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold text-white hover:opacity-90 transition-all"
                  style={{ background: 'linear-gradient(135deg, #10B981, #00C4FF)' }}>
                  <ThumbsUp size={12} /> Approve
                </button>
                <button onClick={() => onReject(campaign)}
                  className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold bg-[#FF5252]/15 border border-[#FF5252]/30 text-[#FF5252] hover:bg-[#FF5252]/25 transition-all">
                  <ThumbsDown size={12} /> Reject
                </button>
                {isPending && (
                  <button onClick={() => onRequestInfo(campaign)}
                    className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold bg-[#00C4FF]/15 border border-[#00C4FF]/30 text-[#00C4FF] hover:bg-[#00C4FF]/25 transition-all">
                    <MessageCircle size={12} />
                  </button>
                )}
              </div>
            )}
            {isLive && (
              <button onClick={() => onFulfill(campaign)}
                className="flex items-center gap-1.5 px-3 py-2 bg-[#7B5FFF]/15 border border-[#7B5FFF]/25 rounded-xl text-[#7B5FFF] text-xs font-semibold hover:bg-[#7B5FFF]/25 transition-all">
                <Edit3 size={12} /> Fulfill
              </button>
            )}
            {campaign.status === 'completed' && (
              <button onClick={() => onFulfill(campaign)}
                className="flex items-center gap-1.5 px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white/50 text-xs font-semibold hover:text-white transition-all">
                <BarChart2 size={12} /> Results
              </button>
            )}

            <div className="flex items-center gap-1 text-[10px] text-white/25">
              <Zap size={9} className="text-[#00C4FF]" />{campaign.creditCost} cr
            </div>
            <div className="flex items-center gap-1 text-[10px] text-white/25">
              <Calendar size={9} />{new Date(campaign.createdAt).toLocaleDateString()}
            </div>

            <button onClick={() => setExpanded(!expanded)}
              className="text-white/30 hover:text-white/60 transition-colors">
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </div>
      </div>

      {/* Expanded brief */}
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="border-t border-white/[0.05] overflow-hidden">
            <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              {campaign.notes && (
                <div className="sm:col-span-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-white/40 uppercase tracking-wider mb-2"><FileText size={11} /> Brief / Notes</div>
                  <p className="text-white/60 text-sm leading-relaxed">{campaign.notes}</p>
                </div>
              )}
              {campaign.targetAudience && (
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-white/40 uppercase tracking-wider mb-2"><Target size={11} /> Target Audience</div>
                  <p className="text-white/60 text-sm">{campaign.targetAudience}</p>
                </div>
              )}
              {campaign.startDate && (
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-white/40 uppercase tracking-wider mb-2"><Calendar size={11} /> Dates</div>
                  <p className="text-white/60 text-sm">{campaign.startDate}{campaign.endDate ? ` → ${campaign.endDate}` : ''}</p>
                </div>
              )}
              {campaign.adminNotes && campaign.status !== 'needs_info' && (
                <div className="sm:col-span-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-white/40 uppercase tracking-wider mb-2"><Edit3 size={11} /> Internal Notes</div>
                  <p className="text-white/50 text-sm italic">{campaign.adminNotes}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Main AdminCampaigns ────────────────────────────────────────────────────────
export function AdminCampaigns() {
  const { token } = useAuth();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [tab, setTab]             = useState<'all' | 'pending_review' | 'active' | 'completed' | 'rejected'>('pending_review');

  const [approveTarget,   setApproveTarget]   = useState<any>(null);
  const [rejectTarget,    setRejectTarget]     = useState<any>(null);
  const [infoTarget,      setInfoTarget]       = useState<any>(null);
  const [fulfillTarget,   setFulfillTarget]    = useState<any>(null);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await api.adminGetCampaigns(token);
      setCampaigns(data.campaigns || []);
    } catch (err: any) { toast.error('Failed to load campaigns: ' + err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [token]);

  const pending   = campaigns.filter(c => c.status === 'pending_review');
  const needsInfo = campaigns.filter(c => c.status === 'needs_info');
  const active    = campaigns.filter(c => c.status === 'active' || c.status === 'paused');
  const completed = campaigns.filter(c => c.status === 'completed');
  const rejected  = campaigns.filter(c => c.status === 'rejected');

  const TABS = [
    { key: 'pending_review', label: 'Pending Review', count: pending.length + needsInfo.length, color: '#F59E0B', urgent: pending.length > 0 },
    { key: 'active',         label: 'Active',         count: active.length,    color: '#10B981', urgent: false },
    { key: 'completed',      label: 'Completed',      count: completed.length, color: '#6B7280', urgent: false },
    { key: 'rejected',       label: 'Rejected',       count: rejected.length,  color: '#FF5252', urgent: false },
    { key: 'all',            label: 'All',            count: campaigns.length, color: '#7B5FFF', urgent: false },
  ] as const;

  const tabCampaigns: any[] = {
    pending_review: [...pending, ...needsInfo],
    active, completed, rejected,
    all: campaigns,
  }[tab] || campaigns;

  const filtered = tabCampaigns.filter(c =>
    !search ||
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.userName?.toLowerCase().includes(search.toLowerCase()) ||
    c.userEmail?.toLowerCase().includes(search.toLowerCase())
  );

  const handleApprove = async (updates: any) => {
    const { campaign } = await api.adminApproveCampaign(token!, approveTarget.id, updates);
    setCampaigns(prev => prev.map(c => c.id === campaign.id ? { ...c, ...campaign } : c));
  };
  const handleReject = async (updates: any) => {
    const { campaign } = await api.adminRejectCampaign(token!, rejectTarget.id, updates);
    setCampaigns(prev => prev.map(c => c.id === campaign.id ? { ...c, ...campaign } : c));
  };
  const handleRequestInfo = async (updates: any) => {
    const { campaign } = await api.adminRequestInfo(token!, infoTarget.id, updates);
    setCampaigns(prev => prev.map(c => c.id === campaign.id ? { ...c, ...campaign } : c));
  };
  const handleFulfill = async (updates: any) => {
    const { campaign } = await api.adminUpdateCampaign(token!, fulfillTarget.id, updates);
    setCampaigns(prev => prev.map(c => c.id === campaign.id ? { ...c, ...campaign } : c));
  };

  return (
    <div className="p-5 lg:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight">Campaign Management</h1>
          <p className="text-white/40 text-sm mt-0.5">Review, approve, and fulfill all promotion campaigns</p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.08] rounded-xl text-white/60 hover:text-white text-xs font-medium transition-all self-start">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Needs Review', value: pending.length,   color: '#F59E0B', pulse: pending.length > 0 },
          { label: 'Needs Info',   value: needsInfo.length, color: '#00C4FF', pulse: false },
          { label: 'Active',       value: active.length,    color: '#10B981', pulse: false },
          { label: 'Total',        value: campaigns.length, color: '#7B5FFF', pulse: false },
        ].map(stat => (
          <div key={stat.label} className="bg-[#0D0D0D] border border-white/[0.06] rounded-2xl p-4 relative overflow-hidden">
            {stat.pulse && stat.value > 0 && (
              <div className="absolute top-3 right-3 w-2 h-2 rounded-full animate-ping" style={{ background: stat.color }} />
            )}
            <div className="text-2xl font-black text-white mb-1">{stat.value}</div>
            <div className="text-xs font-medium" style={{ color: stat.color }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-[#111111] border border-white/[0.06] rounded-xl mb-5 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${tab === t.key ? 'bg-white/[0.08] text-white' : 'text-white/40 hover:text-white'}`}>
            {t.label}
            {t.count > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white" style={{ background: t.urgent ? t.color : `${t.color}40` }}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-[#111111] border border-white/[0.06] rounded-xl px-3 py-2 mb-5">
        <Search size={13} className="text-white/30 flex-shrink-0" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, artist, or email..."
          className="bg-transparent text-sm text-white placeholder-white/30 focus:outline-none w-full" />
        {search && <button onClick={() => setSearch('')}><X size={13} className="text-white/30 hover:text-white" /></button>}
      </div>

      {/* Campaign list */}
      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-28 bg-white/[0.03] rounded-2xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Megaphone size={28} className="text-white/20 mx-auto mb-4" />
          <p className="text-white/40 text-sm">
            {tab === 'pending_review' ? 'No campaigns pending review — you\'re all caught up! ✅' : 'No campaigns in this category'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(campaign => (
            <CampaignRow key={campaign.id} campaign={campaign}
              onApprove={setApproveTarget}
              onReject={setRejectTarget}
              onRequestInfo={setInfoTarget}
              onFulfill={setFulfillTarget}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {approveTarget && (
          <ApproveModal campaign={approveTarget}
            onApprove={handleApprove}
            onClose={() => setApproveTarget(null)} />
        )}
        {rejectTarget && (
          <RejectModal campaign={rejectTarget}
            onReject={handleReject}
            onClose={() => setRejectTarget(null)} />
        )}
        {infoTarget && (
          <RequestInfoModal campaign={infoTarget}
            onRequest={handleRequestInfo}
            onClose={() => setInfoTarget(null)} />
        )}
        {fulfillTarget && (
          <FulfillModal campaign={fulfillTarget}
            onSave={handleFulfill}
            onClose={() => setFulfillTarget(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
