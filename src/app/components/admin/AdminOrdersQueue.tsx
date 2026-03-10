// ─────────────────────────────────────────────────────────────────────────────
//  MIXXEA — Admin Orders Queue + Order Detail Panel
//  Unified inbox: campaigns + pitches + releases with execution checklists
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../dashboard/AuthContext';
import * as api from '../dashboard/api';
import { toast } from 'sonner';
import {
  Package, Radio, Music, TrendingUp, Instagram, Youtube, Globe, Mic, DollarSign,
  Clock, Play, Pause, CheckCircle, XCircle, MessageCircle, Search, Filter,
  RefreshCw, X, ChevronDown, ChevronUp, User, Calendar, Zap,
  ThumbsUp, ThumbsDown, Save, Send, Plus, Check, Activity, FileText,
  AlertTriangle, ArrowLeft, SlidersHorizontal, ListFilter,
} from 'lucide-react';

// ── Execution checklists per service ────────────────────────────────────────
const CHECKLISTS: Record<string, { id: string; label: string }[]> = {
  playlist_pitching: [
    { id: 'verify_track',     label: 'Verify track is live on Spotify / Apple Music' },
    { id: 'check_metadata',   label: 'Check metadata (ISRC, genre, release date)' },
    { id: 'select_curators',  label: 'Select target curators from network' },
    { id: 'submit_batch1',    label: 'Submit to Curator Batch #1 (5–10 curators)' },
    { id: 'followup_72h',     label: 'Follow-up sent at 72h mark' },
    { id: 'record_placements',label: 'Record confirmed playlist placements + URLs' },
    { id: 'send_report',      label: 'Generate & send client placement report' },
  ],
  tiktok_ugc: [
    { id: 'receive_assets',   label: 'Receive track assets (audio + artwork)' },
    { id: 'brief_creators',   label: 'Brief creators — send creative direction doc' },
    { id: 'approve_concepts', label: 'Approve content concepts from 3+ creators' },
    { id: 'launch_videos',    label: 'Launch videos (note creator handles + URLs)' },
    { id: 'day3_check',       label: 'Day 3 — monitor initial views & engagement' },
    { id: 'day7_check',       label: 'Day 7 — total reach snapshot' },
    { id: 'day14_final',      label: 'Day 14 — compile full view/like/share data' },
    { id: 'client_report',    label: 'Generate & send client report with content links' },
  ],
  ig_ugc: [
    { id: 'receive_assets',   label: 'Receive track assets and brand guidelines' },
    { id: 'brief_creators',   label: 'Brief Instagram creators — reels & stories' },
    { id: 'approve_concepts', label: 'Approve content concepts' },
    { id: 'launch_content',   label: 'Launch reels/stories (record post URLs)' },
    { id: 'week1_check',      label: 'Week 1 — views, saves, shares check' },
    { id: 'week2_final',      label: 'Week 2 — compile full metrics' },
    { id: 'client_report',    label: 'Generate & send client report' },
  ],
  youtube_ads: [
    { id: 'collect_creatives', label: 'Collect video ad creatives from client' },
    { id: 'setup_campaign',    label: 'Set up YouTube Ads campaign' },
    { id: 'targeting',         label: 'Configure targeting (demographics, interests, geo)' },
    { id: 'launch',            label: 'Launch campaign (record campaign ID)' },
    { id: 'day3_check',        label: 'Day 3 performance check' },
    { id: 'optimization',      label: 'Optimization pass — adjust targeting/bids' },
    { id: 'final_report',      label: 'Final report: views, CTR, VTR, spend, ROAS' },
  ],
  meta_ads: [
    { id: 'collect_creatives', label: 'Collect ad creatives (image/video + copy)' },
    { id: 'setup_account',     label: 'Create/access Meta Ads account' },
    { id: 'targeting',         label: 'Set audience targeting (age, geo, interests)' },
    { id: 'launch',            label: 'Launch campaign (record campaign ID)' },
    { id: 'day3_check',        label: 'Day 3 — CTR, CPM, spend check' },
    { id: 'optimization',      label: 'Optimization pass — audience or creatives' },
    { id: 'final_report',      label: 'Final report: spend, reach, ROAS, conversions' },
  ],
  spotify_growth: [
    { id: 'verify_release',    label: 'Verify release is live on Spotify' },
    { id: 'editorial_pitch',   label: 'Submit to Spotify Editorial (Spotify for Artists)' },
    { id: 'algo_triggers',     label: 'Pitch algorithmic playlist triggers (saves campaign)' },
    { id: 'week1_monitor',     label: 'Week 1 — monitor saves, skip rate, streams' },
    { id: 'week2_monitor',     label: 'Week 2 — track listener growth' },
    { id: 'final_report',      label: 'Final report: streams, saves, playlist adds, listeners' },
  ],
  pr_press: [
    { id: 'press_kit',         label: 'Collect press kit (bio, photos, EPK link)' },
    { id: 'target_outlets',    label: 'Identify target blogs & publications (10+)' },
    { id: 'draft_pitch',       label: 'Draft personalized pitch email' },
    { id: 'send_pitches',      label: 'Send pitches to outlets' },
    { id: 'followup_5d',       label: 'Follow up at 5-day mark' },
    { id: 'record_coverage',   label: 'Record all media coverage (links)' },
    { id: 'client_report',     label: 'Send client coverage report' },
  ],
  sync_licensing: [
    { id: 'review_track',       label: 'Review track for sync suitability' },
    { id: 'clear_samples',      label: 'Confirm samples & rights are cleared' },
    { id: 'metadata',           label: 'Ensure metadata + lyrics are complete' },
    { id: 'pitch_supervisors',  label: 'Pitch to music supervisors / libraries' },
    { id: 'followup_2wk',       label: 'Follow up at 2-week mark' },
    { id: 'license_deal',       label: 'Negotiate license terms if interested' },
    { id: 'client_report',      label: 'Update client on status + any deals' },
  ],
  distribution: [
    { id: 'verify_metadata',   label: 'Verify metadata (title, artist, genre, ISRC, UPC)' },
    { id: 'verify_artwork',    label: 'Verify artwork (3000×3000px, RGB)' },
    { id: 'verify_audio',      label: 'Verify audio spec (WAV 16-bit 44.1kHz min)' },
    { id: 'rights_check',      label: 'Confirm rights clearances (samples cleared)' },
    { id: 'submit_aggregator', label: 'Submit to distribution aggregator' },
    { id: 'dsp_links',         label: 'Receive DSP links (Spotify URI, Apple link, etc.)' },
    { id: 'deliver_links',     label: 'Deliver links to artist dashboard' },
    { id: 'confirm_live',      label: 'Confirm live on all selected platforms' },
  ],
};

const SVC_MAP: Record<string, any> = {
  spotify_growth:    { label: 'Spotify Growth',    icon: Music,       color: '#1DB954' },
  playlist_pitching: { label: 'Playlist Pitching',  icon: Radio,       color: '#7B5FFF' },
  tiktok_ugc:        { label: 'TikTok UGC',         icon: TrendingUp,  color: '#FF0050' },
  ig_ugc:            { label: 'Instagram UGC',       icon: Instagram,   color: '#E1306C' },
  youtube_ads:       { label: 'YouTube Ads',         icon: Youtube,     color: '#FF0000' },
  meta_ads:          { label: 'Meta / Google Ads',   icon: Globe,       color: '#1877F2' },
  pr_press:          { label: 'PR & Press',          icon: Mic,         color: '#F59E0B' },
  sync_licensing:    { label: 'Sync Licensing',      icon: DollarSign,  color: '#10B981' },
  distribution:      { label: 'Distribution',        icon: Package,     color: '#00C4FF' },
  release:           { label: 'Distribution',        icon: Package,     color: '#00C4FF' },
  pitch:             { label: 'Playlist Pitch',      icon: Radio,       color: '#D63DF6' },
  campaign:          { label: 'Campaign',            icon: TrendingUp,  color: '#7B5FFF' },
};

const STATUS_CFG: Record<string, any> = {
  pending_review: { label: 'Pending Review', color: '#F59E0B', bg: '#F59E0B12', icon: Clock },
  needs_info:     { label: 'Needs Info',     color: '#00C4FF', bg: '#00C4FF12', icon: MessageCircle },
  active:         { label: 'Active',         color: '#10B981', bg: '#10B98112', icon: Play },
  paused:         { label: 'Paused',         color: '#9CA3AF', bg: '#9CA3AF12', icon: Pause },
  completed:      { label: 'Completed',      color: '#6B7280', bg: '#6B728012', icon: CheckCircle },
  rejected:       { label: 'Rejected',       color: '#FF5252', bg: '#FF525212', icon: XCircle },
  submitted:      { label: 'Submitted',      color: '#F59E0B', bg: '#F59E0B12', icon: Clock },
  live:           { label: 'Live',           color: '#10B981', bg: '#10B98112', icon: CheckCircle },
  distributed:    { label: 'Distributed',   color: '#7B5FFF', bg: '#7B5FFF12', icon: CheckCircle },
  pending:        { label: 'Pending',        color: '#F59E0B', bg: '#F59E0B12', icon: Clock },
  reviewing:      { label: 'Reviewing',      color: '#00C4FF', bg: '#00C4FF12', icon: Clock },
  accepted:       { label: 'Accepted',       color: '#10B981', bg: '#10B98112', icon: CheckCircle },
  draft:          { label: 'Draft',          color: '#6B7280', bg: '#6B728012', icon: FileText },
};

function slaAge(dt: string) {
  const ms = Date.now() - new Date(dt || Date.now()).getTime();
  const h = Math.floor(ms / 3600000);
  const d = Math.floor(h / 24);
  return { h, label: d > 0 ? `${d}d ${h % 24}h` : h > 0 ? `${h}h` : 'Just now', urgent: h > 48, warning: h > 24 && h <= 48, color: h > 48 ? '#FF5252' : h > 24 ? '#F59E0B' : '#10B981' };
}

function getOrderType(o: any): string {
  if (o._type === 'release') return 'distribution';
  if (o._type === 'pitch') return 'pitch';
  return o.type || 'campaign';
}

function getChecklistKey(o: any): string {
  const t = getOrderType(o);
  if (t === 'distribution' || o._type === 'release') return 'distribution';
  if (t === 'pitch') return 'playlist_pitching';
  return t;
}

// ── Order Detail Panel ───────────────────────────────────────────────────────
function OrderDetailPanel({ order, token, onClose, onUpdate }: any) {
  const [tab, setTab] = useState<'brief' | 'execution' | 'log' | 'message' | 'results'>('brief');
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [activityLog, setActivityLog] = useState<any[]>([]);
  const [logNote, setLogNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [msgText, setMsgText] = useState('');
  const [results, setResults] = useState({ streams: 0, reach: 0, saves: 0, playlists: 0, clicks: 0, conversions: 0, notes: '' });
  const [approveSaving, setApproveSaving] = useState(false);
  const [rejectSaving, setRejectSaving] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const checklistSteps = CHECKLISTS[getChecklistKey(order)] || [];
  const checklistPct = checklistSteps.length > 0
    ? Math.round((Object.values(checklist).filter(Boolean).length / checklistSteps.length) * 100)
    : 0;

  const svc = SVC_MAP[getOrderType(order)] || SVC_MAP.campaign;
  const SvcIcon = svc.icon;
  const sc = STATUS_CFG[order.status] || STATUS_CFG.pending_review;
  const sla = slaAge(order.createdAt || order.submittedAt || '');

  useEffect(() => {
    if (!token || !order?.id) return;
    api.adminGetOrderChecklist(token, order.id).then(d => setChecklist(d.checklist || {})).catch(() => {});
    api.adminGetActivity(token, order.id).then(d => setActivityLog(d.log || [])).catch(() => {});
  }, [token, order?.id]);

  useEffect(() => {
    setResults(r => ({ ...r, ...(order.results || {}) }));
  }, [order.id]);

  const toggleStep = async (stepId: string) => {
    const next = { ...checklist, [stepId]: !checklist[stepId] };
    setChecklist(next);
    try {
      await api.adminUpdateChecklist(token, order.id, next);
    } catch { toast.error('Failed to save checklist'); }
  };

  const addLog = async () => {
    if (!logNote.trim()) return;
    setSaving(true);
    try {
      const { entry } = await api.adminLogActivity(token, order.id, { action: logNote, note: '' });
      setActivityLog(prev => [entry, ...prev]);
      setLogNote('');
      toast.success('Activity logged');
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const handleApprove = async () => {
    setApproveSaving(true);
    try {
      if (order._type === 'campaign') {
        await api.adminApproveCampaign(token, order.id, { adminNotes: 'Approved from Orders Queue' });
      } else if (order._type === 'release') {
        await api.adminUpdateRelease(token, order.id, { status: 'live', adminNotes: 'Approved' });
      } else if (order._type === 'pitch') {
        await api.adminUpdatePitchStatus(token, order.id, { status: 'reviewing' });
      }
      await api.adminLogActivity(token, order.id, { action: 'Order approved', note: '' });
      toast.success('✅ Approved!');
      onUpdate();
      onClose();
    } catch (err: any) { toast.error(err.message); }
    finally { setApproveSaving(false); }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) { toast.error('Rejection reason required'); return; }
    setRejectSaving(true);
    try {
      if (order._type === 'campaign') {
        await api.adminRejectCampaign(token, order.id, { reason: rejectReason });
      } else if (order._type === 'release') {
        await api.adminUpdateRelease(token, order.id, { status: 'rejected', adminNotes: rejectReason });
      } else if (order._type === 'pitch') {
        await api.adminUpdatePitchStatus(token, order.id, { status: 'rejected', reason: rejectReason });
      }
      await api.adminLogActivity(token, order.id, { action: `Rejected: ${rejectReason}`, note: '' });
      toast.success('Order rejected & credits refunded');
      onUpdate();
      onClose();
    } catch (err: any) { toast.error(err.message); }
    finally { setRejectSaving(false); }
  };

  const handleSaveResults = async () => {
    setSaving(true);
    try {
      if (order._type === 'campaign') {
        await api.adminUpdateCampaign(token, order.id, { results, status: 'active' });
      }
      await api.adminLogActivity(token, order.id, { action: `Results updated: ${results.streams.toLocaleString()} streams`, note: '' });
      toast.success('Results saved');
      onUpdate();
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const isPending = ['pending_review', 'submitted', 'pending'].includes(order.status);

  const TABS = [
    { id: 'brief',     label: 'Brief',     icon: FileText },
    { id: 'execution', label: `Execution ${checklistPct}%`, icon: CheckCircle },
    { id: 'log',       label: 'Log',       icon: Activity },
    { id: 'results',   label: 'Results',   icon: Zap },
  ];

  return (
    <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      className="fixed right-0 top-0 h-screen w-full max-w-lg bg-[#080808] border-l border-white/[0.08] z-50 flex flex-col shadow-2xl">

      {/* Header */}
      <div className="flex-shrink-0 flex items-start gap-3 p-5 border-b border-white/[0.06]">
        <button onClick={onClose} className="mt-0.5 text-white/40 hover:text-white transition-colors flex-shrink-0">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${svc.color}20` }}>
              <SvcIcon size={13} style={{ color: svc.color }} />
            </div>
            <span className="text-sm font-bold text-white truncate">{order.name || order.releaseTitle || order.trackTitle || 'Untitled'}</span>
            <span className="text-[11px] px-2 py-0.5 rounded-lg font-semibold" style={{ background: sc.bg, color: sc.color }}>{sc.label}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-white/40">
            <User size={10} />
            <span>{order.userName || order.artistName || '—'}</span>
            <span className="text-white/20">·</span>
            <span>{svc.label}</span>
            <span className="text-white/20">·</span>
            <span style={{ color: sla.color }}>{sla.label} ago</span>
          </div>
        </div>
        <button onClick={onClose} className="text-white/30 hover:text-white transition-colors flex-shrink-0">
          <X size={16} />
        </button>
      </div>

      {/* Quick Actions */}
      {isPending && (
        <div className="flex-shrink-0 flex gap-2 p-4 border-b border-white/[0.05]">
          <button onClick={handleApprove} disabled={approveSaving}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #10B981, #00C4FF)' }}>
            <ThumbsUp size={13} />{approveSaving ? 'Approving…' : 'Approve'}
          </button>
          <div className="flex-1 space-y-1">
            <input value={rejectReason} onChange={e => setRejectReason(e.target.value)}
              placeholder="Rejection reason…"
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#FF5252]/40" />
            <button onClick={handleReject} disabled={rejectSaving || !rejectReason.trim()}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold bg-[#FF5252]/15 border border-[#FF5252]/30 text-[#FF5252] hover:bg-[#FF5252]/25 transition-all disabled:opacity-50">
              <ThumbsDown size={11} />{rejectSaving ? 'Rejecting…' : 'Reject & Refund'}
            </button>
          </div>
        </div>
      )}

      {/* Checklist Progress Bar */}
      {checklistSteps.length > 0 && (
        <div className="flex-shrink-0 px-5 py-3 border-b border-white/[0.05]">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] text-white/40 font-medium">Execution Progress</span>
            <span className="text-[11px] font-bold" style={{ color: checklistPct === 100 ? '#10B981' : '#7B5FFF' }}>{checklistPct}%</span>
          </div>
          <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
            <motion.div animate={{ width: `${checklistPct}%` }} transition={{ duration: 0.5 }}
              className="h-full rounded-full" style={{ background: checklistPct === 100 ? '#10B981' : 'linear-gradient(90deg,#7B5FFF,#D63DF6)' }} />
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex-shrink-0 flex gap-1 p-3 border-b border-white/[0.05] overflow-x-auto">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${tab === t.id ? 'text-white' : 'text-white/40 hover:text-white/70'}`}
            style={tab === t.id ? { background: 'linear-gradient(135deg, #7B5FFF22, #D63DF622)', border: '1px solid #7B5FFF30' } : {}}>
            <t.icon size={11} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-5">

        {/* BRIEF */}
        {tab === 'brief' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Client', value: order.userName || order.artistName || '—' },
                { label: 'Role', value: order.userRole || order.artistRole || '—' },
                { label: 'Plan', value: order.userPlan || '—' },
                { label: 'Credits', value: order.creditCost?.toLocaleString() || '—' },
                { label: 'Date', value: new Date(order.createdAt || order.submittedAt || Date.now()).toLocaleDateString() },
                { label: 'Email', value: order.userEmail || order.artistEmail || '—' },
              ].map(f => (
                <div key={f.label} className="bg-[#0D0D0D] border border-white/[0.07] rounded-xl p-3">
                  <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">{f.label}</p>
                  <p className="text-sm text-white font-medium truncate">{f.value}</p>
                </div>
              ))}
            </div>
            {order.notes && (
              <div className="bg-[#0D0D0D] border border-white/[0.07] rounded-xl p-4">
                <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2">Campaign Brief / Notes</p>
                <p className="text-sm text-white/70 leading-relaxed">{order.notes}</p>
              </div>
            )}
            {order.targetAudience && (
              <div className="bg-[#0D0D0D] border border-white/[0.07] rounded-xl p-4">
                <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2">Target Audience</p>
                <p className="text-sm text-white/70">{order.targetAudience}</p>
              </div>
            )}
            {(order.releaseTitle || order.trackTitle) && (
              <div className="bg-[#7B5FFF]/10 border border-[#7B5FFF]/20 rounded-xl p-3 flex items-center gap-2">
                <Music size={13} className="text-[#7B5FFF]" />
                <span className="text-sm text-white font-medium">{order.releaseTitle || order.trackTitle}</span>
              </div>
            )}
            {order.message && (
              <div className="bg-[#0D0D0D] border border-white/[0.07] rounded-xl p-4">
                <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2">Client Message</p>
                <p className="text-sm text-white/70 leading-relaxed">{order.message}</p>
              </div>
            )}
          </div>
        )}

        {/* EXECUTION CHECKLIST */}
        {tab === 'execution' && (
          <div className="space-y-2">
            {checklistSteps.length === 0 ? (
              <p className="text-white/40 text-sm">No checklist defined for this order type.</p>
            ) : (
              checklistSteps.map((step, i) => (
                <motion.button key={step.id} layout
                  onClick={() => toggleStep(step.id)}
                  className={`w-full flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all ${checklist[step.id] ? 'bg-[#10B981]/10 border-[#10B981]/25' : 'bg-[#0D0D0D] border-white/[0.07] hover:border-white/20'}`}>
                  <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${checklist[step.id] ? 'bg-[#10B981]' : 'bg-white/[0.06] border border-white/20'}`}>
                    {checklist[step.id] && <Check size={11} className="text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className={`text-xs font-medium leading-relaxed ${checklist[step.id] ? 'text-[#10B981]/80 line-through' : 'text-white/80'}`}>
                      <span className="text-white/30 mr-2">{i + 1}.</span>{step.label}
                    </span>
                  </div>
                </motion.button>
              ))
            )}
            {checklistPct === 100 && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="p-4 bg-[#10B981]/10 border border-[#10B981]/25 rounded-xl text-center">
                <CheckCircle size={20} className="text-[#10B981] mx-auto mb-2" />
                <p className="text-sm font-bold text-[#10B981]">Execution Complete!</p>
                <p className="text-xs text-white/40 mt-1">Switch to Results tab to enter campaign data.</p>
              </motion.div>
            )}
          </div>
        )}

        {/* ACTIVITY LOG */}
        {tab === 'log' && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <input value={logNote} onChange={e => setLogNote(e.target.value)}
                placeholder="Log an action or note…"
                onKeyDown={e => e.key === 'Enter' && !saving && addLog()}
                className="flex-1 bg-[#0D0D0D] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#7B5FFF]/40" />
              <button onClick={addLog} disabled={saving || !logNote.trim()}
                className="px-3 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #7B5FFF, #D63DF6)' }}>
                {saving ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
              </button>
            </div>
            {activityLog.length === 0 ? (
              <div className="text-center py-8">
                <Activity size={24} className="text-white/10 mx-auto mb-2" />
                <p className="text-white/30 text-sm">No activity logged yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {activityLog.map((entry: any) => (
                  <div key={entry.id} className="flex items-start gap-3 p-3 bg-[#0D0D0D] border border-white/[0.06] rounded-xl">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#7B5FFF] mt-1.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white/80">{entry.action}</p>
                      <p className="text-[10px] text-white/30 mt-0.5">{new Date(entry.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* RESULTS */}
        {tab === 'results' && (
          <div className="space-y-4">
            {checklistPct < 50 && (
              <div className="flex items-center gap-2 p-3 bg-[#F59E0B]/10 border border-[#F59E0B]/20 rounded-xl">
                <AlertTriangle size={13} className="text-[#F59E0B] flex-shrink-0" />
                <p className="text-xs text-[#F59E0B]">Complete at least 50% of the execution checklist before entering results.</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'streams', label: 'Streams / Plays' }, { key: 'reach', label: 'Total Reach' },
                { key: 'saves', label: 'Saves / Follows' }, { key: 'playlists', label: 'Playlist Adds' },
                { key: 'clicks', label: 'Clicks / Views' }, { key: 'conversions', label: 'Conversions' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-[11px] text-white/40 mb-1.5">{f.label}</label>
                  <input type="number" min="0"
                    value={(results as any)[f.key] || 0}
                    disabled={checklistPct < 50}
                    onChange={e => setResults(r => ({ ...r, [f.key]: parseInt(e.target.value) || 0 }))}
                    className="w-full bg-[#0D0D0D] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7B5FFF]/40 disabled:opacity-40" />
                </div>
              ))}
            </div>
            <div>
              <label className="block text-[11px] text-white/40 mb-1.5">Notes / Summary</label>
              <textarea value={results.notes} onChange={e => setResults(r => ({ ...r, notes: e.target.value }))}
                rows={3} placeholder="Campaign summary notes…"
                disabled={checklistPct < 50}
                className="w-full bg-[#0D0D0D] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#7B5FFF]/40 resize-none disabled:opacity-40" />
            </div>
            <button onClick={handleSaveResults} disabled={saving || checklistPct < 50}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #7B5FFF, #D63DF6)' }}>
              <Save size={14} />{saving ? 'Saving…' : 'Save Results'}
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Main Orders Queue ────────────────────────────────────────────────────────
export function AdminOrdersQueue() {
  const { token } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const d = await api.adminGetOrders(token);
      setOrders(d.orders || []);
    } catch (err: any) { console.log('[OrdersQueue] error:', err); }
    finally { setLoading(false); setRefreshing(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const filtered = orders.filter(o => {
    const term = search.toLowerCase();
    const matchSearch = !search ||
      (o.userName || o.artistName || '').toLowerCase().includes(term) ||
      (o.name || o.releaseTitle || o.trackTitle || '').toLowerCase().includes(term) ||
      (o.userEmail || o.artistEmail || '').toLowerCase().includes(term);
    const type = getOrderType(o);
    const matchType = filterType === 'all' || type === filterType || o._type === filterType;
    const matchStatus = filterStatus === 'all' || o.status === filterStatus;
    return matchSearch && matchType && matchStatus;
  });

  const pendingCount = orders.filter(o => ['pending_review', 'submitted', 'pending'].includes(o.status)).length;
  const overdueCount = orders.filter(o => ['pending_review', 'submitted', 'pending'].includes(o.status) && slaAge(o.createdAt || o.submittedAt || '').h > 48).length;

  return (
    <div className="flex h-[calc(100vh-65px)]">
      {/* Main Queue */}
      <div className={`flex flex-col flex-1 min-w-0 ${selectedOrder ? 'hidden lg:flex' : 'flex'}`}>

        {/* Header */}
        <div className="flex-shrink-0 p-5 border-b border-white/[0.05]">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h1 className="text-xl font-black text-white tracking-tight">Orders Queue</h1>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-[#F59E0B] font-medium">{pendingCount} pending</span>
                {overdueCount > 0 && <><span className="text-white/20">·</span><span className="text-xs text-[#FF5252] font-semibold">{overdueCount} overdue</span></>}
                <span className="text-white/20">·</span>
                <span className="text-xs text-white/30">{orders.length} total</span>
              </div>
            </div>
            <button onClick={() => { setRefreshing(true); load(); }} disabled={refreshing}
              className="flex items-center gap-2 px-3 py-2 bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.08] rounded-xl text-white/60 hover:text-white text-xs font-medium transition-all disabled:opacity-50">
              <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-2 bg-[#111] border border-white/[0.06] rounded-xl px-3 py-2 flex-1 min-w-[180px]">
              <Search size={13} className="text-white/30 flex-shrink-0" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search client, release, email…"
                className="bg-transparent text-sm text-white placeholder-white/30 focus:outline-none w-full" />
              {search && <button onClick={() => setSearch('')}><X size={13} className="text-white/30" /></button>}
            </div>
            <select value={filterType} onChange={e => setFilterType(e.target.value)}
              className="bg-[#111] border border-white/[0.06] rounded-xl px-3 py-2 text-sm text-white/70 focus:outline-none">
              <option value="all">All Types</option>
              <option value="campaign">Campaigns</option>
              <option value="release">Releases</option>
              <option value="pitch">Pitches</option>
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="bg-[#111] border border-white/[0.06] rounded-xl px-3 py-2 text-sm text-white/70 focus:outline-none">
              <option value="all">All Statuses</option>
              <option value="pending_review">Pending Review</option>
              <option value="needs_info">Needs Info</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* Order List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="h-20 bg-white/[0.03] rounded-xl animate-pulse" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
              <Package size={28} className="text-white/15 mb-3" />
              <p className="text-white/40 text-sm">No orders match your filters</p>
            </div>
          ) : filtered.map(order => {
            const svc = SVC_MAP[getOrderType(order)] || SVC_MAP.campaign;
            const SvcIcon = svc.icon;
            const sc = STATUS_CFG[order.status] || STATUS_CFG.pending_review;
            const sla = slaAge(order.createdAt || order.submittedAt || '');
            const isSelected = selectedOrder?.id === order.id;
            const isPending = ['pending_review', 'submitted', 'pending'].includes(order.status);

            return (
              <div key={order.id}
                onClick={() => setSelectedOrder(isSelected ? null : order)}
                className={`px-5 py-4 border-b border-white/[0.04] cursor-pointer hover:bg-white/[0.02] transition-all relative ${isSelected ? 'bg-white/[0.04] border-l-2 border-l-[#D63DF6]' : ''}`}>
                {isPending && sla.urgent && (
                  <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#FF5252]" />
                )}
                {isPending && sla.warning && !sla.urgent && (
                  <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#F59E0B]" />
                )}
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${svc.color}18` }}>
                    <SvcIcon size={18} style={{ color: svc.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <p className="text-sm font-bold text-white truncate">{order.userName || order.artistName || '—'}</p>
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold" style={{ background: sc.bg, color: sc.color }}>{sc.label}</span>
                      {sla.urgent && isPending && <span className="text-[9px] font-bold text-[#FF5252] bg-[#FF5252]/15 px-1.5 py-0.5 rounded">OVERDUE</span>}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-white/40 flex-wrap">
                      <span>{svc.label}</span>
                      {(order.releaseTitle || order.trackTitle) && <><span className="text-white/20">·</span><span className="text-[#7B5FFF] font-medium truncate max-w-[120px]">{order.releaseTitle || order.trackTitle}</span></>}
                      <span className="text-white/20">·</span>
                      <span style={{ color: sla.color }}>{sla.label} ago</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    {order.creditCost && (
                      <span className="text-[10px] text-white/25 flex items-center gap-1">
                        <Zap size={9} className="text-[#00C4FF]" />{order.creditCost} cr
                      </span>
                    )}
                    <span className="text-[10px] text-white/25 capitalize">{order._type}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail Panel (slide-over) */}
      <AnimatePresence>
        {selectedOrder && (
          <OrderDetailPanel
            key={selectedOrder.id}
            order={selectedOrder}
            token={token}
            onClose={() => setSelectedOrder(null)}
            onUpdate={load}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
