import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from './AuthContext';
import * as api from './api';
import { toast } from 'sonner';
import {
  Megaphone, Plus, Zap, TrendingUp, Music2, Youtube, Instagram, Globe, Mic, X,
  Play, Pause, CheckCircle, Clock, BarChart2, DollarSign, Users, Radio,
  AlertCircle, MessageCircle, Shield, RefreshCw, Info, Lock,
} from 'lucide-react';
import { planCanUseService, serviceRequiredPlan, PlanBadge, UPGRADE_INFO } from './PlanGate';
import { Link } from 'react-router';

const SERVICES = [
  { id: 'spotify_growth',    name: 'Spotify Growth',      icon: Music2,      desc: 'Boost monthly listeners & followers on Spotify',      color: '#1DB954', credits: 140,  badge: 'Popular' },
  { id: 'playlist_pitching', name: 'Playlist Pitching',   icon: Radio,       desc: 'Get your music into curated playlists',               color: '#7B5FFF', credits: 500,  badge: '' },
  { id: 'tiktok_ugc',        name: 'TikTok UGC Campaign', icon: TrendingUp,  desc: 'Viral TikTok user-generated content campaigns',       color: '#FF0050', credits: 800,  badge: 'Hot 🔥' },
  { id: 'ig_ugc',            name: 'Instagram UGC',       icon: Instagram,   desc: 'Instagram reels & stories UGC promotion',             color: '#E1306C', credits: 600,  badge: '' },
  { id: 'youtube_ads',       name: 'YouTube Ads',         icon: Youtube,     desc: 'Targeted YouTube video ads for music',                color: '#FF0000', credits: 900,  badge: '' },
  { id: 'meta_ads',          name: 'Meta / Google Ads',   icon: Globe,       desc: 'Facebook, Instagram & Google ad campaigns',           color: '#1877F2', credits: 800,  badge: '' },
  { id: 'pr_press',          name: 'PR & Press Coverage', icon: Mic,         desc: 'Get featured in music blogs, magazines & outlets',    color: '#F59E0B', credits: 1300, badge: '' },
  { id: 'sync_licensing',    name: 'Sync Licensing',      icon: DollarSign,  desc: 'License your music to TV, film & commercials',        color: '#10B981', credits: 350,  badge: '' },
];

const STATUS_CFG: Record<string, any> = {
  pending_review: { label: 'Under Review',   color: '#F59E0B', bg: '#F59E0B15', icon: Clock,          desc: 'Our team is reviewing your campaign.' },
  needs_info:     { label: 'Action Needed',  color: '#00C4FF', bg: '#00C4FF15', icon: MessageCircle,  desc: 'Our team needs more info from you.' },
  active:         { label: 'Live',           color: '#10B981', bg: '#10B98115', icon: Play,           desc: 'Your campaign is live!' },
  paused:         { label: 'Paused',         color: '#9CA3AF', bg: '#9CA3AF15', icon: Pause,          desc: 'Campaign is paused.' },
  completed:      { label: 'Completed',      color: '#6B7280', bg: '#6B728015', icon: CheckCircle,    desc: 'Campaign completed.' },
  rejected:       { label: 'Not Approved',   color: '#FF5252', bg: '#FF525215', icon: AlertCircle,    desc: 'Campaign was not approved — credits refunded.' },
  draft:          { label: 'Draft',          color: '#9CA3AF', bg: '#9CA3AF15', icon: Clock,          desc: 'Draft.' },
};

export function PromotionsPage() {
  const { token, user } = useAuth();
  const [campaigns, setCampaigns]         = useState<any[]>([]);
  const [releases, setReleases]           = useState<any[]>([]);
  const [credits, setCredits]             = useState(0);
  const [loading, setLoading]             = useState(true);
  const [showModal, setShowModal]         = useState(false);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [saving, setSaving]               = useState(false);
  const [tab, setTab]                     = useState<'services' | 'campaigns'>('services');

  const [form, setForm] = useState({
    name: '', releaseId: '', releaseTitle: '', targetAudience: '',
    budget: 0, startDate: '', endDate: '', notes: '',
  });

  const load = () => {
    if (!token) return;
    setLoading(true);
    Promise.all([
      api.getCampaigns(token).then(d => setCampaigns(d.campaigns || [])).catch(() => {}),
      api.getReleases(token).then(d => setReleases(d.releases || [])).catch(() => {}),
      api.getCredits(token).then(d => setCredits(d.balance || 0)).catch(() => {}),
    ]).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [token]);

  const openService = (svc: any) => {
    setSelectedService(svc);
    setForm(f => ({ ...f, name: `${svc.name} — ${user?.name}` }));
    setShowModal(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService) return;
    if (credits < selectedService.credits) {
      toast.error(`Insufficient credits. Need ${selectedService.credits}, you have ${credits}.`);
      return;
    }
    setSaving(true);
    try {
      const selectedRelease = releases.find(r => r.id === form.releaseId);
      const { campaign, newCreditBalance } = await api.createCampaign(token!, {
        ...form,
        type: selectedService.id,
        creditCost: selectedService.credits,
        releaseTitle: selectedRelease?.title || '',
        budget: form.budget,
      });
      setCampaigns(prev => [campaign, ...prev]);
      setCredits(newCreditBalance ?? credits - selectedService.credits);
      toast.success('📋 Campaign submitted for review! Our team will approve it within 24h.');
      setShowModal(false);
      setForm({ name: '', releaseId: '', releaseTitle: '', targetAudience: '', budget: 0, startDate: '', endDate: '', notes: '' });
      setTab('campaigns');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Counts for badge display
  const pendingCount  = campaigns.filter(c => c.status === 'pending_review' || c.status === 'needs_info').length;
  const activeCount   = campaigns.filter(c => c.status === 'active').length;

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Promotions & Marketing</h1>
          <p className="text-white/40 text-sm mt-1">All campaigns require admin approval before going live</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={load} className="p-2 text-white/40 hover:text-white hover:bg-white/[0.05] rounded-xl transition-all">
            <RefreshCw size={15} />
          </button>
          <div className="flex items-center gap-2 px-4 py-2.5 bg-[#111111] border border-white/[0.06] rounded-xl">
            <Zap size={14} className="text-[#00C4FF]" />
            <span className="text-white font-semibold text-sm">{credits.toLocaleString()}</span>
            <span className="text-white/40 text-xs">credits</span>
          </div>
        </div>
      </div>

      {/* How it works banner */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="mb-6 p-4 bg-[#7B5FFF]/10 border border-[#7B5FFF]/20 rounded-2xl flex gap-3">
        <Shield size={16} className="text-[#7B5FFF] flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="text-white font-semibold mb-1">How Campaign Approval Works</p>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-white/50 text-xs">
            <span>1. Submit campaign → <span className="text-[#F59E0B]">Credits held</span></span>
            <span>2. Admin reviews within 24h</span>
            <span>3. <span className="text-[#10B981]">Approved</span> → Campaign goes live · <span className="text-[#FF5252]">Rejected</span> → Credits auto-refunded</span>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-[#111111] border border-white/[0.06] rounded-xl mb-6 w-fit">
        <button onClick={() => setTab('services')}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'services' ? 'bg-gradient-to-r from-[#7B5FFF] to-[#D63DF6] text-white' : 'text-white/50 hover:text-white'}`}>
          🎯 Services
        </button>
        <button onClick={() => setTab('campaigns')}
          className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'campaigns' ? 'bg-gradient-to-r from-[#7B5FFF] to-[#D63DF6] text-white' : 'text-white/50 hover:text-white'}`}>
          📊 My Campaigns
          {campaigns.length > 0 && (
            <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-bold ${pendingCount > 0 ? 'bg-[#F59E0B] text-black' : 'bg-white/20 text-white'}`}>
              {campaigns.length}
            </span>
          )}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {tab === 'services' && (
          <motion.div key="services" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="grid sm:grid-cols-2 gap-4">
              {SERVICES.map(svc => {
                const userPlan = user?.plan || 'starter';
                const canUse = planCanUseService(userPlan, svc.id);
                const reqPlan = serviceRequiredPlan(svc.id);

                return (
                  <motion.div key={svc.id}
                    whileHover={{ y: canUse ? -4 : -2, scale: canUse ? 1.01 : 1.005 }}
                    whileTap={{ scale: 0.99 }}
                    className={`bg-[#111111] border border-white/[0.06] rounded-2xl p-5 transition-all relative overflow-hidden ${canUse ? 'hover:border-white/15 cursor-pointer' : 'cursor-default'}`}
                    onClick={() => canUse ? openService(svc) : undefined}
                  >
                    {/* Locked overlay */}
                    {!canUse && reqPlan && (
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center gap-3 rounded-2xl">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: `${UPGRADE_INFO[reqPlan].color}25` }}>
                          <Lock size={18} style={{ color: UPGRADE_INFO[reqPlan].color }} />
                        </div>
                        <div className="text-center px-4">
                          <p className="text-white text-sm font-semibold mb-1">{UPGRADE_INFO[reqPlan].name} Plan Required</p>
                          <p className="text-white/50 text-xs mb-3">Upgrade to unlock {svc.name}</p>
                          <Link
                            to="/dashboard/settings"
                            onClick={e => e.stopPropagation()}
                            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-white hover:opacity-90 transition-all"
                            style={{ background: `linear-gradient(135deg, ${UPGRADE_INFO[reqPlan].color}, ${UPGRADE_INFO[reqPlan].gradientTo})` }}
                          >
                            Upgrade to {UPGRADE_INFO[reqPlan].name} →
                          </Link>
                        </div>
                      </div>
                    )}

                    {/* Badge (only shown on unlocked cards) */}
                    {svc.badge && canUse && (
                      <span className="absolute top-4 right-4 text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: svc.color }}>
                        {svc.badge}
                      </span>
                    )}
                    {/* Plan badge for locked */}
                    {!canUse && reqPlan && (
                      <span className="absolute top-4 right-4 z-0">
                        <PlanBadge requiredPlan={reqPlan} />
                      </span>
                    )}

                    <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: `${svc.color}20` }}>
                      <svc.icon size={22} style={{ color: svc.color, opacity: canUse ? 1 : 0.5 }} />
                    </div>
                    <h3 className={`font-semibold mb-1 text-sm ${canUse ? 'text-white' : 'text-white/50'}`}>{svc.name}</h3>
                    <p className="text-xs text-white/40 leading-relaxed mb-4">{svc.desc}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Zap size={13} style={{ color: svc.color, opacity: canUse ? 1 : 0.4 }} />
                        <span className="text-lg font-extrabold tracking-tight" style={{ color: svc.color, opacity: canUse ? 1 : 0.5 }}>{svc.credits.toLocaleString()}</span>
                        <span className="text-xs text-white/30 font-medium">credits</span>
                      </div>
                      {canUse ? (
                        <button className="text-xs px-3 py-1.5 rounded-lg font-medium text-white transition-all"
                          style={{ background: `${svc.color}25`, border: `1px solid ${svc.color}40` }}>
                          Submit →
                        </button>
                      ) : (
                        <span className="text-[10px] text-white/30 font-medium">Locked</span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <div className="mt-6 p-5 bg-[#111111] border border-[#7B5FFF]/20 rounded-2xl">
              <h3 className="text-sm font-semibold text-white mb-2">How It Works</h3>
              <div className="grid sm:grid-cols-3 gap-4 text-xs text-white/50">
                <div className="flex items-start gap-2"><Zap size={13} className="text-[#00C4FF] mt-0.5 flex-shrink-0" /><span>Submit a campaign — credits are held. No charge if rejected.</span></div>
                <div className="flex items-start gap-2"><Shield size={13} className="text-[#7B5FFF] mt-0.5 flex-shrink-0" /><span>Our team reviews every campaign within 24h before it goes live.</span></div>
                <div className="flex items-start gap-2"><Users size={13} className="text-[#D63DF6] mt-0.5 flex-shrink-0" /><span>Approved campaigns are manually managed by specialists for best results.</span></div>
              </div>
            </div>
          </motion.div>
        )}

        {tab === 'campaigns' && (
          <motion.div key="campaigns" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {loading ? (
              <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-white/[0.03] rounded-2xl animate-pulse" />)}</div>
            ) : campaigns.length === 0 ? (
              <div className="text-center py-20">
                <Megaphone size={28} className="text-white/20 mx-auto mb-4" />
                <h3 className="text-white font-semibold mb-2">No campaigns yet</h3>
                <p className="text-white/40 text-sm mb-6">Launch your first promotion campaign</p>
                <button onClick={() => setTab('services')} className="px-6 py-3 rounded-xl font-semibold text-white text-sm" style={{ background: 'linear-gradient(135deg, #7B5FFF, #D63DF6)' }}>
                  Browse Services
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {campaigns.map(c => {
                  const sc  = STATUS_CFG[c.status] || STATUS_CFG.draft;
                  const svc = SERVICES.find(s => s.id === c.type);
                  const isPending   = c.status === 'pending_review';
                  const isNeedsInfo = c.status === 'needs_info';
                  const isRejected  = c.status === 'rejected';

                  return (
                    <motion.div key={c.id} layout
                      className={`bg-[#111111] border rounded-2xl p-5 transition-all ${isPending ? 'border-[#F59E0B]/30' : isNeedsInfo ? 'border-[#00C4FF]/30' : isRejected ? 'border-[#FF5252]/20' : 'border-white/[0.06] hover:border-white/10'}`}>

                      {/* Action needed alert */}
                      {isNeedsInfo && (
                        <div className="flex items-start gap-2 mb-4 p-3 bg-[#00C4FF]/10 border border-[#00C4FF]/20 rounded-xl">
                          <MessageCircle size={14} className="text-[#00C4FF] flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-semibold text-[#00C4FF] mb-0.5">Action Required</p>
                            <p className="text-xs text-white/60">{c.adminNotes}</p>
                            <p className="text-[11px] text-white/30 mt-1">Please open a support ticket with the requested information.</p>
                          </div>
                        </div>
                      )}

                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${svc?.color || '#7B5FFF'}20` }}>
                          {svc && <svc.icon size={20} style={{ color: svc.color }} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 flex-wrap">
                            <h3 className="font-semibold text-white">{c.name}</h3>
                            <span className="text-xs px-2 py-0.5 rounded-lg font-medium flex items-center gap-1" style={{ background: sc.bg, color: sc.color }}>
                              <sc.icon size={10} />
                              {sc.label}
                            </span>
                          </div>
                          <p className="text-xs text-white/40 mt-0.5 capitalize">{c.type?.replace(/_/g, ' ')}{c.releaseTitle && ` · ${c.releaseTitle}`}</p>

                          {/* Status description */}
                          <p className="text-[11px] text-white/30 mt-1">{sc.desc}</p>

                          <div className="flex items-center gap-4 mt-3 flex-wrap">
                            <div className="text-xs text-white/40 flex items-center gap-1.5">
                              <Zap size={11} className={isPending ? 'text-[#F59E0B]' : 'text-[#00C4FF]'} />
                              {c.creditCost} credits {isPending ? 'held' : isRejected ? 'refunded' : 'used'}
                            </div>
                            {c.status === 'active' && (
                              <>
                                <div className="text-xs text-white/40 flex items-center gap-1.5"><Play size={11} />{c.results?.streams?.toLocaleString() || 0} streams</div>
                                <div className="text-xs text-white/40 flex items-center gap-1.5"><Users size={11} />{c.results?.reach?.toLocaleString() || 0} reach</div>
                              </>
                            )}
                            <div className="text-xs text-white/30">{new Date(c.createdAt).toLocaleDateString()}</div>
                          </div>

                          {/* Rejection reason */}
                          {isRejected && c.rejectionReason && (
                            <div className="mt-3 px-3 py-2 bg-[#FF5252]/10 border border-[#FF5252]/20 rounded-xl">
                              <p className="text-xs text-[#FF5252]">
                                <span className="font-semibold">Reason: </span>{c.rejectionReason}
                              </p>
                              <p className="text-[11px] text-white/30 mt-1">{c.creditCost} credits have been refunded to your account.</p>
                            </div>
                          )}
                        </div>

                        {/* Status indicator */}
                        <div className="flex-shrink-0">
                          {isPending && (
                            <div className="w-8 h-8 rounded-full bg-[#F59E0B]/20 flex items-center justify-center">
                              <Clock size={14} className="text-[#F59E0B] animate-pulse" />
                            </div>
                          )}
                          {c.status === 'active' && (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#10B981]/15 rounded-full">
                              <div className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                              <span className="text-[10px] text-[#10B981] font-semibold">LIVE</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Campaign Submit Modal */}
      <AnimatePresence>
        {showModal && selectedService && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div initial={{ opacity: 0, y: 20, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}
              className="bg-[#111111] border border-white/[0.08] rounded-2xl w-full max-w-lg my-6">
              <div className="flex items-center justify-between p-6 border-b border-white/[0.06]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${selectedService.color}20` }}>
                    <selectedService.icon size={18} style={{ color: selectedService.color }} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">{selectedService.name}</h2>
                    <p className="text-xs text-white/40">{selectedService.credits} credits · {credits} available</p>
                  </div>
                </div>
                <button onClick={() => setShowModal(false)} className="text-white/40 hover:text-white"><X size={20} /></button>
              </div>

              {/* Approval notice inside modal */}
              <div className="mx-6 mt-4 flex items-start gap-2 p-3 bg-[#7B5FFF]/10 border border-[#7B5FFF]/20 rounded-xl">
                <Info size={13} className="text-[#7B5FFF] flex-shrink-0 mt-0.5" />
                <p className="text-xs text-white/60">
                  Credits will be <span className="text-[#F59E0B]">held</span> until admin approves. If rejected, you get a <span className="text-[#10B981]">full refund</span>.
                </p>
              </div>

              <form onSubmit={handleCreate} className="p-6 space-y-4">
                {credits < selectedService.credits && (
                  <div className="flex items-center gap-3 p-3 bg-[#FF5252]/10 border border-[#FF5252]/20 rounded-xl text-xs text-[#FF5252]">
                    <Zap size={13} />
                    <span>Insufficient credits. Need {selectedService.credits}, you have {credits}. <a href="/dashboard/credits" className="underline font-semibold">Buy credits →</a></span>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">Campaign Name</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#7B5FFF]/50" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">Release to Promote</label>
                  <select value={form.releaseId} onChange={e => setForm(f => ({ ...f, releaseId: e.target.value }))}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#7B5FFF]/50">
                    <option value="" className="bg-[#111111]">— Select release (optional) —</option>
                    {releases.map(r => <option key={r.id} value={r.id} className="bg-[#111111]">{r.title} ({r.type})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">Target Audience</label>
                  <input value={form.targetAudience} onChange={e => setForm(f => ({ ...f, targetAudience: e.target.value }))}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#7B5FFF]/50"
                    placeholder="e.g. Afrobeats fans, 18-34, Nigeria, US" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">Start Date</label>
                    <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#7B5FFF]/50" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">End Date</label>
                    <input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#7B5FFF]/50" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">Campaign Brief / Notes</label>
                  <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3}
                    placeholder="Tell us about your goals, preferred style, reference artists, streaming links..."
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#7B5FFF]/50 resize-none" />
                </div>
                <div className="flex items-center justify-between p-3 bg-white/[0.03] rounded-xl">
                  <span className="text-sm text-white/60">Credits to hold</span>
                  <div className="flex items-center gap-1.5">
                    <Zap size={14} className="text-[#F59E0B]" />
                    <span className="text-white font-bold">{selectedService.credits} credits</span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 rounded-xl text-sm font-medium text-white/60 bg-white/[0.05] hover:bg-white/[0.08] transition-all">Cancel</button>
                  <button type="submit" disabled={saving || credits < selectedService.credits}
                    className="flex-1 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
                    style={{ background: `linear-gradient(135deg, ${selectedService.color}, #D63DF6)` }}>
                    {saving ? 'Submitting...' : '📋 Submit for Review'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}