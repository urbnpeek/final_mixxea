import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';
import {
  Wand2, Plus, Calendar, LayoutGrid, BarChart3, Settings2, Instagram,
  Youtube, Facebook, Music2, Image as ImageIcon, Video, FileText, Hash,
  Clock, Check, X, ChevronRight, Loader2, Sparkles, Upload, Copy,
  Trash2, Eye, Send, RefreshCw, Zap, Link2, AlertCircle, Play,
  BookOpen, Globe, TrendingUp, Star, CheckCircle2, ExternalLink, Edit3, CalendarDays,
  CreditCard,
} from 'lucide-react';

// ── Billing error banner ───────────────────────────────────────────────────────
function BillingErrorBanner({ message }: { message: string }) {
  const isBilling = message.toLowerCase().includes('billing') || message.toLowerCase().includes('quota') || message.toLowerCase().includes('hard limit');
  if (!isBilling) return null;
  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-3 p-4 rounded-2xl border mb-4"
      style={{ background: 'rgba(239,68,68,0.07)', borderColor: 'rgba(239,68,68,0.3)' }}>
      <CreditCard size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="font-bold text-red-300 text-sm mb-1">OpenAI Billing Limit Reached</p>
        <p className="text-red-200/60 text-xs leading-relaxed mb-3">
          Your OpenAI account has hit its hard spending limit. All AI generation (images, captions, scripts) is blocked until you increase the limit or add a payment method.
        </p>
        <div className="flex flex-wrap gap-2">
          <a href="https://platform.openai.com/settings/organization/billing/overview"
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all hover:opacity-90"
            style={{ background: '#EF4444' }}>
            <ExternalLink size={11} /> Fix Billing in OpenAI →
          </a>
          <a href="https://platform.openai.com/settings/organization/limits"
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
            style={{ background: 'rgba(239,68,68,0.15)', color: '#FCA5A5' }}>
            <ExternalLink size={11} /> Raise Spend Limit →
          </a>
        </div>
      </div>
    </motion.div>
  );
}
import { projectId, publicAnonKey } from '/utils/supabase/info';

const BASE = `https://${projectId}.supabase.co/functions/v1/make-server-f4d1ffe4`;

// ── Platform config ────────────────────────────────────────────────────────────
const PLATFORMS = [
  { id: 'instagram', label: 'Instagram', color: '#E1306C', gradient: 'from-[#833AB4] via-[#FD1D1D] to-[#FCAF45]', icon: Instagram },
  { id: 'tiktok',   label: 'TikTok',    color: '#FF0050', gradient: 'from-[#010101] via-[#FF0050] to-[#69C9D0]', icon: Music2 },
  { id: 'facebook', label: 'Facebook',  color: '#1877F2', gradient: 'from-[#1877F2] to-[#42A5F5]', icon: Facebook },
  { id: 'youtube',  label: 'YouTube',   color: '#FF0000', gradient: 'from-[#FF0000] to-[#FF6B35]', icon: Youtube },
];

const STATUS_COLORS: Record<string, string> = {
  draft: '#6B7280', scheduled: '#7B5FFF', publishing: '#F59E0B',
  published: '#10B981', failed: '#EF4444', partial: '#F59E0B',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft', scheduled: 'Scheduled', publishing: 'Publishing…',
  published: 'Published', failed: 'Failed', partial: 'Partial',
};

const TABS = [
  { id: 'posts',     label: 'Posts',     icon: LayoutGrid },
  { id: 'calendar',  label: 'Calendar',  icon: CalendarDays },
  { id: 'ai',        label: 'AI Studio', icon: Sparkles },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'accounts',  label: 'Accounts',  icon: Link2, highlight: true },
];

// ── API helpers ────────────────────────────────────────────────────────────────
async function creativeReq(method: string, path: string, body?: any, token?: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${publicAnonKey}`,
  };
  if (token) headers['X-MIXXEA-Token'] = token;
  const res = await fetch(`${BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let data: any = {};
  try { data = await res.json(); } catch { data = {}; }
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
  return data;
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface SocialAccount {
  platform: string; username: string; displayName: string;
  avatarUrl?: string; followerCount?: number; isActive: boolean;
  connectedAt: string;
}
interface SocialPost {
  id: string; title: string; platforms: string[]; caption: string;
  hashtags: string[]; mediaUrls: string[]; mediaType: string;
  status: string; scheduledFor?: string; publishedAt?: string;
  platformResults?: Record<string, any>; releaseId?: string; releaseName?: string;
  aiGenerated: boolean; createdAt: string; updatedAt: string;
}
interface PlanLimits {
  accounts: number; postsPerMonth: number; platformsPerPost: number;
  aiCaptionsPerMonth: number; aiImagesPerMonth: number; aiScriptsPerMonth: number;
  calendarType: string; storageMb: number; videoPosting: boolean;
  bulkScheduling: boolean | string; analytics: string; aiMarketingSuggestions: boolean;
  allowedPlatforms: string[];
}
interface Usage {
  postsPublished: number; postsScheduled: number; aiCaptionsUsed: number;
  aiImagesUsed: number; aiScriptsUsed: number; aiCalendarsUsed: number;
}

// ── Post Composer Drawer ───────────────────────────────────────────────────────
function PostComposer({ token, limits, onClose, onSaved, editPost }: {
  token: string; limits: PlanLimits; onClose: () => void;
  onSaved: (post: SocialPost) => void; editPost?: SocialPost;
}) {
  const [step, setStep] = useState(1);
  const [platforms, setPlatforms] = useState<string[]>(editPost?.platforms || []);
  const [caption, setCaption] = useState(editPost?.caption || '');
  const [hashtags, setHashtags] = useState<string[]>(editPost?.hashtags || []);
  const [mediaUrls, setMediaUrls] = useState<string[]>(editPost?.mediaUrls || []);
  const [mediaType, setMediaType] = useState<string>(editPost?.mediaType || 'image');
  const [title, setTitle] = useState(editPost?.title || '');
  const [scheduledFor, setScheduledFor] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState('');
  const [hashtagInput, setHashtagInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const STEPS = ['Platform', 'Media', 'Copy', 'Schedule'];

  const togglePlatform = (id: string) => {
    if (platforms.includes(id)) {
      setPlatforms(platforms.filter(p => p !== id));
    } else {
      if (limits.platformsPerPost !== -1 && platforms.length >= limits.platformsPerPost) {
        toast.error(`Your plan allows ${limits.platformsPerPost} platform${limits.platformsPerPost > 1 ? 's' : ''} per post. Upgrade for more.`);
        return;
      }
      if (!limits.allowedPlatforms.includes(id)) {
        toast.error(`${id} is not available on your current plan. Upgrade to access it.`);
        return;
      }
      setPlatforms([...platforms, id]);
    }
  };

  const generateCaption = async () => {
    if (!platforms[0]) { toast.error('Select a platform first'); return; }
    setAiLoading('caption');
    try {
      const data = await creativeReq('POST', '/creative/ai/caption', { platform: platforms[0] }, token);
      setCaption(data.caption);
      if (data.creditsUsed > 0) toast.success(`Caption generated (${data.creditsUsed} credits used)`);
      else toast.success('Caption generated!');
    } catch (e: any) {
      toast.error(e.message);
    } finally { setAiLoading(''); }
  };

  const generateHashtags = async () => {
    setAiLoading('hashtags');
    try {
      const data = await creativeReq('POST', '/creative/ai/hashtags', { platform: platforms[0] || 'instagram' }, token);
      setHashtags(data.hashtags || []);
      toast.success('Hashtags generated!');
    } catch (e: any) {
      toast.error(e.message);
    } finally { setAiLoading(''); }
  };

  const generateImage = async () => {
    setAiLoading('image');
    try {
      const data = await creativeReq('POST', '/creative/ai/image', { prompt: caption || 'music promotion artwork', style: 'promo' }, token);
      setMediaUrls([data.imageUrl]);
      setMediaType('image');
      if (data.creditsUsed > 0) toast.success(`Image generated (${data.creditsUsed} credits used)`);
      else toast.success('Image generated!');
    } catch (e: any) {
      toast.error(e.message);
    } finally { setAiLoading(''); }
  };

  const addHashtag = () => {
    const tag = hashtagInput.trim().replace(/^#/, '');
    if (tag && !hashtags.includes(tag)) {
      setHashtags([...hashtags, tag]);
      setHashtagInput('');
    }
  };

  const savePost = async (action: 'draft' | 'schedule' | 'publish') => {
    if (!title.trim()) { toast.error('Please add a title for this post'); return; }
    if (platforms.length === 0) { toast.error('Select at least one platform'); return; }
    setLoading(true);
    try {
      const postData = { title, platforms, caption, hashtags, mediaUrls, mediaType, scheduledFor: scheduledFor || null };
      let saved: SocialPost;
      if (editPost) {
        const d = await creativeReq('PUT', `/creative/posts/${editPost.id}`, postData, token);
        saved = d.post;
      } else {
        const d = await creativeReq('POST', '/creative/posts', postData, token);
        saved = d.post;
      }
      if (action === 'schedule' && scheduledFor) {
        const d = await creativeReq('POST', `/creative/posts/${saved.id}/schedule`, { scheduledFor }, token);
        saved = d.post;
        toast.success('Post scheduled!');
      } else if (action === 'publish') {
        const d = await creativeReq('POST', `/creative/posts/${saved.id}/publish`, {}, token);
        saved = d.post;
        const successes = Object.values(d.results || {}).filter((r: any) => r.status === 'success').length;
        if (successes > 0) toast.success(`Published to ${successes} platform${successes > 1 ? 's' : ''}!`);
        else toast.error('Publishing failed. Check platform connections.');
      } else {
        toast.success('Post saved as draft');
      }
      onSaved(saved);
      onClose();
    } catch (e: any) {
      toast.error(e.message);
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(3px)' }}
        onClick={onClose}
      />

      {/* Drawer panel — slides in from right */}
      <motion.div
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="relative z-10 flex flex-col w-full max-w-lg h-full"
        style={{ background: '#0A0A0A', borderLeft: '1px solid rgba(255,255,255,0.08)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg,#7B5FFF,#D63DF6)' }}>
              <Wand2 size={15} className="text-white" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm leading-tight">{editPost ? 'Edit Post' : 'New Post'}</h3>
              <p className="text-white/30 text-[11px]">Step {step} of 4 — {STEPS[step - 1]}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center text-white/40 hover:text-white/80 hover:bg-white/10 transition-all">
            <X size={16} />
          </button>
        </div>

        {/* Step indicators */}
        <div className="flex px-5 py-3 gap-1 border-b flex-shrink-0" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          {STEPS.map((s, i) => {
            const isDone = step > i + 1;
            const isActive = step === i + 1;
            return (
              <button key={s} onClick={() => setStep(i + 1)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={
                  isActive
                    ? { background: 'rgba(123,95,255,0.25)', color: '#C4AEFF', border: '1px solid rgba(123,95,255,0.45)' }
                    : isDone
                    ? { background: 'rgba(16,185,129,0.1)', color: '#34D399' }
                    : { color: 'rgba(255,255,255,0.3)' }
                }>
                <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                  style={{
                    background: isDone ? '#10B981' : isActive ? '#7B5FFF' : 'rgba(255,255,255,0.08)',
                    color: '#fff',
                  }}>
                  {isDone ? <Check size={9} /> : i + 1}
                </span>
                <span className="hidden sm:inline">{s}</span>
              </button>
            );
          })}
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* Title always visible */}
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Post title (internal only)…"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/30 outline-none focus:border-purple-500/50 mb-5"
          />

          {/* Step 1: Platforms */}
          {step === 1 && (
            <div>
              <p className="text-white/50 text-xs mb-3">Select platforms to publish to</p>
              <div className="grid grid-cols-2 gap-3">
                {PLATFORMS.map(p => {
                  const PIcon = p.icon;
                  const selected = platforms.includes(p.id);
                  const allowed = limits.allowedPlatforms.includes(p.id);
                  return (
                    <button key={p.id} onClick={() => togglePlatform(p.id)}
                      className={`relative flex items-center gap-3 p-4 rounded-xl border transition-all text-left ${!allowed ? 'opacity-40' : 'hover:scale-[1.02]'}`}
                      style={selected ? { borderColor: p.color, background: `${p.color}15` } : { background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.1)' }}>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `linear-gradient(135deg, ${p.color}33, ${p.color}11)` }}>
                        <PIcon size={18} style={{ color: p.color }} />
                      </div>
                      <div>
                        <p className="font-semibold text-white text-sm">{p.label}</p>
                        {!allowed && <p className="text-[10px] text-white/40">Upgrade required</p>}
                      </div>
                      {selected && <div className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: p.color }}><Check size={10} className="text-white" /></div>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2: Media */}
          {step === 2 && (
            <div>
              <div className="flex gap-2 mb-4">
                {['image', 'video', 'text'].map(t => (
                  <button key={t} onClick={() => setMediaType(t)}
                    className="flex-1 py-2 rounded-xl text-xs font-semibold capitalize transition-all"
                    style={mediaType === t ? { background: 'rgba(123,95,255,0.2)', color: '#C4AEFF', border: '1px solid rgba(123,95,255,0.35)' } : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}>
                    {t}
                  </button>
                ))}
              </div>
              {mediaType !== 'text' && (
                <>
                  {mediaUrls.length > 0 ? (
                    <div className="relative rounded-xl overflow-hidden mb-3 aspect-square bg-black/50">
                      <img src={mediaUrls[0]} alt="Media preview" className="w-full h-full object-cover" />
                      <button onClick={() => setMediaUrls([])} className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 text-white hover:bg-black"><X size={14} /></button>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-white/20 aspect-square flex flex-col items-center justify-center gap-3 mb-3 cursor-pointer hover:border-purple-500/40 transition-colors"
                      onClick={() => fileInputRef.current?.click()}>
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(123,95,255,0.1)' }}>
                        <Upload size={20} className="text-purple-400" />
                      </div>
                      <div className="text-center">
                        <p className="text-white/50 text-sm font-medium">Upload your visual</p>
                        <p className="text-white/25 text-xs mt-0.5">PNG, JPG, MP4 · Max 200MB</p>
                      </div>
                      <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) { const url = URL.createObjectURL(f); setMediaUrls([url]); }
                        }} />
                    </div>
                  )}
                  <button onClick={generateImage} disabled={!!aiLoading}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg,rgba(123,95,255,0.2),rgba(214,61,246,0.2))', border: '1px solid rgba(123,95,255,0.3)', color: '#C4AEFF' }}>
                    {aiLoading === 'image' ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    {aiLoading === 'image' ? 'Generating…' : '✨ Generate with AI'}
                  </button>
                </>
              )}
            </div>
          )}

          {/* Step 3: Copy */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-white/60 text-xs font-semibold uppercase tracking-wider">Caption</label>
                  <button onClick={generateCaption} disabled={!!aiLoading}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all"
                    style={{ background: 'rgba(123,95,255,0.2)', color: '#C4AEFF' }}>
                    {aiLoading === 'caption' ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                    AI Generate
                  </button>
                </div>
                <textarea
                  value={caption}
                  onChange={e => setCaption(e.target.value)}
                  rows={5}
                  placeholder="Write your caption…"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/30 outline-none focus:border-purple-500/50 resize-none"
                />
                <p className="text-right text-white/25 text-xs mt-1">{caption.length} chars</p>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-white/60 text-xs font-semibold uppercase tracking-wider">Hashtags</label>
                  <button onClick={generateHashtags} disabled={!!aiLoading}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
                    style={{ background: 'rgba(0,196,255,0.15)', color: '#00C4FF', border: '1px solid rgba(0,196,255,0.2)' }}>
                    {aiLoading === 'hashtags' ? <Loader2 size={11} className="animate-spin" /> : <Hash size={11} />}
                    AI Suggest · Free
                  </button>
                </div>
                {hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {hashtags.map(t => (
                      <span key={t} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: 'rgba(0,196,255,0.1)', color: '#00C4FF', border: '1px solid rgba(0,196,255,0.2)' }}>
                        #{t}
                        <button onClick={() => setHashtags(hashtags.filter(h => h !== t))}><X size={10} /></button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input value={hashtagInput} onChange={e => setHashtagInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addHashtag(); } }}
                    placeholder="Add hashtag…"
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm placeholder-white/30 outline-none focus:border-cyan-500/50" />
                  <button onClick={addHashtag} className="px-3 py-2 rounded-xl text-white font-semibold text-sm" style={{ background: 'rgba(255,255,255,0.1)' }}>Add</button>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Schedule */}
          {step === 4 && (
            <div className="space-y-4">
              {/* Summary card */}
              <div className="p-4 rounded-xl border" style={{ background: 'rgba(123,95,255,0.05)', borderColor: 'rgba(123,95,255,0.2)' }}>
                <p className="text-white font-semibold text-sm mb-1">Post Summary</p>
                <p className="text-white/50 text-xs mb-2">{title || 'Untitled'}</p>
                <div className="flex gap-2 flex-wrap mb-2">
                  {platforms.map(p => {
                    const pl = PLATFORMS.find(x => x.id === p);
                    return pl ? (
                      <span key={p} className="px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: `${pl.color}20`, color: pl.color }}>
                        {pl.label}
                      </span>
                    ) : null;
                  })}
                </div>
                {caption && <p className="text-white/40 text-xs line-clamp-2">{caption}</p>}
                {hashtags.length > 0 && <p className="text-white/25 text-[10px] mt-1">{hashtags.length} hashtags added</p>}
                {mediaUrls.length > 0 && <p className="text-white/25 text-[10px]">1 media file attached</p>}
              </div>

              {/* Datetime picker */}
              <div>
                <label className="text-white/60 text-xs font-semibold uppercase tracking-wider block mb-2">
                  Schedule for later
                  <span className="ml-2 text-white/25 font-normal normal-case">(optional)</span>
                </label>
                <input
                  type="datetime-local"
                  value={scheduledFor}
                  onChange={e => setScheduledFor(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-purple-500/50"
                  style={{ colorScheme: 'dark' }}
                />
                {scheduledFor && (
                  <p className="text-purple-400 text-xs mt-1.5 flex items-center gap-1">
                    <Clock size={10} /> Scheduled for {new Date(scheduledFor).toLocaleString()}
                  </p>
                )}
              </div>

              {/* Action buttons — stacked for clarity */}
              <div className="space-y-2 pt-1">
                <button onClick={() => savePost('draft')} disabled={loading}
                  className="w-full py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2"
                  style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                  Save as Draft
                </button>

                <button onClick={() => savePost('schedule')} disabled={loading || !scheduledFor}
                  className="w-full py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
                  style={scheduledFor
                    ? { background: 'rgba(123,95,255,0.3)', color: '#C4AEFF', border: '1px solid rgba(123,95,255,0.5)' }
                    : { background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.06)', cursor: 'not-allowed' }}>
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <Clock size={14} />}
                  {scheduledFor ? 'Schedule Post' : 'Schedule (pick a date above)'}
                </button>

                <button onClick={() => savePost('publish')} disabled={loading}
                  className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg,#7B5FFF,#D63DF6)' }}>
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  Publish Now
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer nav — Back / Next */}
        {step < 4 && (
          <div className="flex justify-between px-5 py-4 border-t flex-shrink-0" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
            <button onClick={() => setStep(s => Math.max(1, s - 1))}
              className="px-4 py-2 rounded-xl text-sm text-white/50 hover:text-white/80 transition-colors"
              style={{ background: 'rgba(255,255,255,0.05)' }}>
              Back
            </button>
            <button onClick={() => setStep(s => Math.min(4, s + 1))}
              className="px-5 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg,#7B5FFF,#D63DF6)' }}>
              Next <ChevronRight size={14} className="inline ml-0.5" />
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ── Post Card ─────────────────────────────────────────────────────────────────
function PostCard({ post, onEdit, onDelete, onPublish }: {
  post: SocialPost; onEdit: () => void; onDelete: () => void; onPublish: () => void;
}) {
  const statusColor = STATUS_COLORS[post.status] || '#6B7280';
  const statusLabel = STATUS_LABELS[post.status] || post.status;
  return (
    <motion.div
      layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border overflow-hidden group transition-all hover:-translate-y-0.5"
      style={{ background: '#0D0D0D', borderColor: 'rgba(255,255,255,0.07)' }}>
      {post.mediaUrls?.[0] ? (
        <div className="aspect-video overflow-hidden bg-black/50">
          <img src={post.mediaUrls[0]} alt="Post media" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        </div>
      ) : (
        <div className="aspect-video flex items-center justify-center" style={{ background: 'rgba(123,95,255,0.05)' }}>
          <FileText size={28} className="text-white/15" />
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <p className="font-semibold text-white text-sm line-clamp-1">{post.title || 'Untitled Post'}</p>
          <span className="flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: `${statusColor}20`, color: statusColor }}>
            {statusLabel}
          </span>
        </div>
        {post.caption && <p className="text-white/40 text-xs line-clamp-2 mb-3">{post.caption}</p>}
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5">
            {post.platforms.map(p => {
              const pl = PLATFORMS.find(x => x.id === p);
              if (!pl) return null;
              const PIcon = pl.icon;
              return <PIcon key={p} size={13} style={{ color: pl.color }} />;
            })}
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {post.status === 'draft' && (
              <button onClick={onPublish} className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-green-400 transition-all" title="Publish">
                <Send size={13} />
              </button>
            )}
            <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-all" title="Edit"><Edit3 size={13} /></button>
            <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-red-400 transition-all" title="Delete"><Trash2 size={13} /></button>
          </div>
        </div>
        {post.scheduledFor && post.status === 'scheduled' && (
          <p className="text-[11px] text-purple-400 mt-2 flex items-center gap-1">
            <Clock size={10} /> {new Date(post.scheduledFor).toLocaleString()}
          </p>
        )}
      </div>
    </motion.div>
  );
}

// ── Calendar View ─────────────────────────────────────────────────────────────
function CalendarView({ posts }: { posts: SocialPost[] }) {
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  const postsByDay: Record<number, SocialPost[]> = {};
  posts.forEach(p => {
    const d = new Date(p.scheduledFor || p.publishedAt || p.createdAt);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      if (!postsByDay[day]) postsByDay[day] = [];
      postsByDay[day].push(p);
    }
  });

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ background: '#0D0D0D', borderColor: 'rgba(255,255,255,0.07)' }}>
      <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
        <button onClick={() => setViewDate(new Date(year, month - 1, 1))} className="text-white/50 hover:text-white p-2 rounded-xl hover:bg-white/5 transition-all">‹</button>
        <h3 className="font-bold text-white">{monthNames[month]} {year}</h3>
        <button onClick={() => setViewDate(new Date(year, month + 1, 1))} className="text-white/50 hover:text-white p-2 rounded-xl hover:bg-white/5 transition-all">›</button>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
            <div key={d} className="text-center text-[11px] text-white/30 font-semibold py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDay }, (_, i) => <div key={`e-${i}`} />)}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const dayPosts = postsByDay[day] || [];
            const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
            return (
              <div key={day} className="min-h-[56px] rounded-xl p-1.5 transition-all hover:bg-white/5 cursor-pointer"
                style={isToday ? { background: 'rgba(123,95,255,0.1)', border: '1px solid rgba(123,95,255,0.3)' } : {}}>
                <p className={`text-xs font-semibold mb-1 ${isToday ? 'text-purple-400' : 'text-white/50'}`}>{day}</p>
                <div className="flex flex-wrap gap-0.5">
                  {dayPosts.slice(0, 3).map(p => (
                    <div key={p.id} className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: STATUS_COLORS[p.status] || '#6B7280' }} title={p.title} />
                  ))}
                  {dayPosts.length > 3 && <p className="text-[9px] text-white/30">+{dayPosts.length - 3}</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── AI Studio ─────────────────────────────────────────────────────────────────
function AIStudio({ token, limits, usage, credits, onRefreshCredits }: {
  token: string; limits: PlanLimits; usage: Usage; credits: number; onRefreshCredits: () => void;
}) {
  const [activeTool, setActiveTool] = useState('caption');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [lastError, setLastError] = useState('');

  // Form state
  const [platform, setPlatform] = useState('instagram');
  const [releaseTitle, setReleaseTitle] = useState('');
  const [artistName, setArtistName] = useState('');
  const [genre, setGenre] = useState('');
  const [mood, setMood] = useState('');
  const [tone, setTone] = useState('authentic');
  const [imagePrompt, setImagePrompt] = useState('');
  const [imageStyle, setImageStyle] = useState('promo');
  const [scriptDuration, setScriptDuration] = useState('30');
  const [scriptHook, setScriptHook] = useState('');
  const [calGoal, setCalGoal] = useState('');
  const [calReleaseDate, setCalReleaseDate] = useState('');

  const tools = [
    { id: 'caption', label: 'Caption', icon: FileText, color: '#7B5FFF', credits: usage.aiCaptionsUsed, limit: limits.aiCaptionsPerMonth },
    { id: 'hashtags', label: 'Hashtags', icon: Hash, color: '#00C4FF', credits: null, limit: null },
    { id: 'image', label: 'Image Gen', icon: ImageIcon, color: '#D63DF6', credits: usage.aiImagesUsed, limit: limits.aiImagesPerMonth },
    { id: 'script', label: 'Video Script', icon: Video, color: '#FF5252', credits: usage.aiScriptsUsed, limit: limits.aiScriptsPerMonth },
    { id: 'calendar', label: 'AI Calendar', icon: CalendarDays, color: '#F59E0B', credits: null, limit: null },
  ];

  const run = async () => {
    setLoading(true);
    setResult(null);
    setLastError('');
    try {
      let data;
      if (activeTool === 'caption') {
        data = await creativeReq('POST', '/creative/ai/caption', { platform, releaseTitle, artistName, genre, mood, tone }, token);
        setResult({ type: 'text', content: data.caption, credits: data.creditsUsed });
      } else if (activeTool === 'hashtags') {
        data = await creativeReq('POST', '/creative/ai/hashtags', { platform, genre, releaseTitle, artistName }, token);
        setResult({ type: 'hashtags', content: data.hashtags, credits: data.creditsUsed });
      } else if (activeTool === 'image') {
        data = await creativeReq('POST', '/creative/ai/image', { prompt: imagePrompt, style: imageStyle }, token);
        setResult({ type: 'image', content: data.imageUrl, credits: data.creditsUsed });
      } else if (activeTool === 'script') {
        data = await creativeReq('POST', '/creative/ai/video-script', { duration: scriptDuration, platform, releaseTitle, artistName, genre, hook: scriptHook }, token);
        setResult({ type: 'text', content: data.script, credits: data.creditsUsed });
      } else if (activeTool === 'calendar') {
        data = await creativeReq('POST', '/creative/ai/content-calendar', { releaseDate: calReleaseDate, artistName, releaseTitle, genre, platforms: [platform], goals: calGoal }, token);
        setResult({ type: 'calendar', content: data.calendar, credits: data.creditsUsed });
      }
      toast.success(`${activeTool.charAt(0).toUpperCase() + activeTool.slice(1)} generated!`);
      // Refresh credit balance in parent after every successful generation
      onRefreshCredits();
    } catch (e: any) {
      const msg = e.message || 'AI generation failed';
      toast.error(msg.includes('billing') || msg.includes('quota') ? '⚠️ OpenAI billing limit hit — see the result panel for fix instructions.' : msg);
      setLastError(msg);
    }
    finally { setLoading(false); }
  };

  const commonFields = (
    <div className="grid grid-cols-2 gap-3 mb-3">
      <div>
        <label className="text-white/40 text-xs mb-1 block">Artist Name</label>
        <input value={artistName} onChange={e => setArtistName(e.target.value)} placeholder="Your artist name"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm placeholder-white/25 outline-none focus:border-purple-500/50" />
      </div>
      <div>
        <label className="text-white/40 text-xs mb-1 block">Release / Track</label>
        <input value={releaseTitle} onChange={e => setReleaseTitle(e.target.value)} placeholder="Track or album title"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm placeholder-white/25 outline-none focus:border-purple-500/50" />
      </div>
      <div>
        <label className="text-white/40 text-xs mb-1 block">Genre</label>
        <input value={genre} onChange={e => setGenre(e.target.value)} placeholder="e.g. Hip-Hop, Pop, Afrobeats"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm placeholder-white/25 outline-none focus:border-purple-500/50" />
      </div>
      <div>
        <label className="text-white/40 text-xs mb-1 block">Platform</label>
        <select value={platform} onChange={e => setPlatform(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-purple-500/50"
          style={{ colorScheme: 'dark' }}>
          {PLATFORMS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[210px_1fr_1fr] gap-6">
      {/* Tool selector */}
      <div className="space-y-2">
        <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-3">AI Tools</p>
        {tools.map(t => {
          const TIcon = t.icon;
          const pct = t.limit && t.limit !== -1 && t.credits != null ? Math.min(100, (t.credits / t.limit) * 100) : 0;
          return (
            <button key={t.id} onClick={() => { setActiveTool(t.id); setResult(null); setLastError(''); }}
              className={`w-full flex items-center gap-3 p-3.5 rounded-xl border transition-all text-left ${activeTool === t.id ? 'border-opacity-50' : 'border-white/7 hover:border-white/15'}`}
              style={activeTool === t.id ? { background: `${t.color}12`, borderColor: `${t.color}50` } : { background: 'rgba(255,255,255,0.02)' }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${t.color}20` }}>
                <TIcon size={16} style={{ color: t.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white text-sm">{t.label}</p>
                {t.limit !== null && t.credits !== null && (
                  <div className="mt-1">
                    <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: t.color }} />
                    </div>
                    <p className="text-[10px] text-white/30 mt-0.5">{t.credits}/{t.limit === -1 ? '∞' : t.limit} used</p>
                  </div>
                )}
              </div>
            </button>
          );
        })}
        <div className="mt-4 p-3 rounded-xl border" style={{ background: 'rgba(123,95,255,0.05)', borderColor: 'rgba(123,95,255,0.2)' }}>
          <div className="flex items-center gap-2 mb-1">
            <Zap size={13} style={{ color: '#7B5FFF' }} />
            <p className="text-purple-300 text-xs font-semibold">Credit Balance</p>
          </div>
          <p className="text-2xl font-bold text-white">{credits}</p>
          <p className="text-white/30 text-xs">credits available</p>
        </div>
      </div>

      {/* Tool form */}
      <div className="rounded-2xl border p-5" style={{ background: '#0D0D0D', borderColor: 'rgba(255,255,255,0.07)' }}>
        <h4 className="font-bold text-white mb-4">{tools.find(t => t.id === activeTool)?.label}</h4>

        {activeTool === 'caption' && (
          <>
            {commonFields}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-white/40 text-xs mb-1 block">Mood</label>
                <input value={mood} onChange={e => setMood(e.target.value)} placeholder="e.g. energetic, chill"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm placeholder-white/25 outline-none focus:border-purple-500/50" />
              </div>
              <div>
                <label className="text-white/40 text-xs mb-1 block">Tone</label>
                <select value={tone} onChange={e => setTone(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-purple-500/50" style={{ colorScheme: 'dark' }}>
                  {['authentic','hype','emotional','funny','mysterious','inspirational'].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
              </div>
            </div>
          </>
        )}
        {activeTool === 'hashtags' && commonFields}
        {activeTool === 'image' && (
          <div className="space-y-3">
            <div>
              <label className="text-white/40 text-xs mb-1 block">Image Prompt</label>
              <textarea value={imagePrompt} onChange={e => setImagePrompt(e.target.value)} rows={4}
                placeholder="Describe the image you want to create… e.g. 'Dark moody album art with neon purple city lights'"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm placeholder-white/25 outline-none focus:border-purple-500/50 resize-none" />
            </div>
            <div>
              <label className="text-white/40 text-xs mb-1 block">Style</label>
              <div className="grid grid-cols-3 gap-2">
                {['promo','lyric','behind','announcement','minimal'].map(s => (
                  <button key={s} onClick={() => setImageStyle(s)}
                    className="py-2 rounded-xl text-xs font-semibold capitalize transition-all"
                    style={imageStyle === s ? { background: 'rgba(214,61,246,0.2)', color: '#D63DF6', border: '1px solid rgba(214,61,246,0.4)' } : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)' }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        {activeTool === 'script' && (
          <>
            {commonFields}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-white/40 text-xs mb-1 block">Duration (seconds)</label>
                <select value={scriptDuration} onChange={e => setScriptDuration(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-purple-500/50" style={{ colorScheme: 'dark' }}>
                  {['15','30','45','60'].map(d => <option key={d} value={d}>{d}s</option>)}
                </select>
              </div>
              <div>
                <label className="text-white/40 text-xs mb-1 block">Opening Hook Idea</label>
                <input value={scriptHook} onChange={e => setScriptHook(e.target.value)} placeholder="e.g. Show me making the beat"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm placeholder-white/25 outline-none focus:border-purple-500/50" />
              </div>
            </div>
          </>
        )}
        {activeTool === 'calendar' && (
          <div className="space-y-3">
            {commonFields}
            <div>
              <label className="text-white/40 text-xs mb-1 block">Release Date</label>
              <input type="date" value={calReleaseDate} onChange={e => setCalReleaseDate(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-purple-500/50" style={{ colorScheme: 'dark' }} />
            </div>
            <div>
              <label className="text-white/40 text-xs mb-1 block">Campaign Goal</label>
              <input value={calGoal} onChange={e => setCalGoal(e.target.value)} placeholder="e.g. Drive streams to Spotify"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm placeholder-white/25 outline-none focus:border-purple-500/50" />
            </div>
          </div>
        )}

        <button onClick={run} disabled={loading}
          className="w-full mt-4 py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90"
          style={{ background: 'linear-gradient(135deg,#7B5FFF,#D63DF6)' }}>
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          {loading ? 'Generating…' : 'Generate'}
        </button>
      </div>

      {/* Result panel */}
      <div className="rounded-2xl border p-5" style={{ background: '#0D0D0D', borderColor: 'rgba(255,255,255,0.07)' }}>
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-bold text-white">Result</h4>
          {(result || lastError) && (
            <button onClick={() => { setResult(null); setLastError(''); }} className="text-white/30 hover:text-white/60 transition-colors"><X size={14} /></button>
          )}
        </div>
        {/* Billing / general error display */}
        {lastError && (
          <>
            <BillingErrorBanner message={lastError} />
            {!lastError.toLowerCase().includes('billing') && !lastError.toLowerCase().includes('quota') && !lastError.toLowerCase().includes('hard limit') && (
              <div className="flex items-start gap-3 p-4 rounded-2xl border mb-4" style={{ background: 'rgba(239,68,68,0.07)', borderColor: 'rgba(239,68,68,0.2)' }}>
                <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-300/80 text-xs leading-relaxed">{lastError}</p>
              </div>
            )}
          </>
        )}

        {!result && !lastError ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <Sparkles size={32} className="text-white/10 mb-3" />
            <p className="text-white/30 text-sm">Your AI-generated content will appear here</p>
          </div>
        ) : (
          <AnimatePresence>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              {result.type === 'text' && (
                <div>
                  <div className="bg-white/5 rounded-xl p-4 text-white/80 text-sm leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto mb-3">{result.content}</div>
                  <button onClick={() => { navigator.clipboard.writeText(result.content); toast.success('Copied!'); }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white/60 hover:text-white transition-all"
                    style={{ background: 'rgba(255,255,255,0.07)' }}>
                    <Copy size={12} /> Copy to clipboard
                  </button>
                </div>
              )}
              {result.type === 'hashtags' && (
                <div>
                  <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto mb-3">
                    {result.content.map((t: string) => (
                      <span key={t} className="px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: 'rgba(0,196,255,0.1)', color: '#00C4FF', border: '1px solid rgba(0,196,255,0.2)' }}>#{t}</span>
                    ))}
                  </div>
                  <button onClick={() => { navigator.clipboard.writeText(result.content.map((t: string) => `#${t}`).join(' ')); toast.success('Copied!'); }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white/60 hover:text-white transition-all"
                    style={{ background: 'rgba(255,255,255,0.07)' }}>
                    <Copy size={12} /> Copy all hashtags
                  </button>
                </div>
              )}
              {result.type === 'image' && (
                <div>
                  <div className="rounded-xl overflow-hidden aspect-square mb-3"><img src={result.content} alt="AI generated" className="w-full h-full object-cover" /></div>
                  <a href={result.content} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white/60 hover:text-white transition-all"
                    style={{ background: 'rgba(255,255,255,0.07)' }}>
                    <ExternalLink size={12} /> Open full size
                  </a>
                </div>
              )}
              {result.type === 'calendar' && Array.isArray(result.content) && (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {result.content.map((day: any, i: number) => (
                    <div key={i} className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: '#7B5FFF' }}>{i + 1}</span>
                        <p className="text-white font-semibold text-xs">{day.theme || `Day ${i + 1}`}</p>
                        <span className="px-1.5 py-0.5 rounded text-[9px]" style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.4)' }}>{day.platform}</span>
                      </div>
                      <p className="text-white/50 text-xs ml-7">{day.hook || day.idea}</p>
                    </div>
                  ))}
                </div>
              )}
              {result.credits > 0 && (
                <p className="text-[11px] text-white/25 mt-2 flex items-center gap-1"><Zap size={10} /> {result.credits} credits used</p>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

// ── Accounts Tab ──────────────────────────────────────────────────────────────
function AccountsTab({ token, accounts, limits, onRefresh }: {
  token: string; accounts: SocialAccount[]; limits: PlanLimits; onRefresh: () => void;
}) {
  const [connecting, setConnecting] = useState('');

  const connect = async (platform: string) => {
    setConnecting(platform);
    try {
      if (limits.accounts !== -1 && accounts.length >= limits.accounts) {
        toast.error(`Your plan allows ${limits.accounts} accounts. Upgrade for more.`);
        return;
      }
      if (!limits.allowedPlatforms.includes(platform)) {
        toast.error(`${platform} is not available on your current plan.`);
        return;
      }
      const data = await creativeReq('POST', `/creative/oauth/${platform}/connect`, {}, token);
      const popup = window.open(data.authUrl, 'social_auth', 'width=620,height=720,scrollbars=yes');
      const onMsg = (e: MessageEvent) => {
        if (e.data?.type === 'SOCIAL_AUTH_SUCCESS' && e.data?.platform === platform) {
          toast.success(`${platform} connected successfully!`);
          onRefresh();
          window.removeEventListener('message', onMsg);
        } else if (e.data?.type === 'SOCIAL_AUTH_ERROR') {
          toast.error(`Connection failed: ${e.data.error}`);
          window.removeEventListener('message', onMsg);
        }
      };
      window.addEventListener('message', onMsg);
      const checkClosed = setInterval(() => {
        if (popup?.closed) { clearInterval(checkClosed); window.removeEventListener('message', onMsg); }
      }, 1000);
    } catch (e: any) { toast.error(e.message); }
    finally { setConnecting(''); }
  };

  const disconnect = async (platform: string) => {
    if (!confirm(`Disconnect ${platform}? This will remove your stored credentials.`)) return;
    try {
      await creativeReq('DELETE', `/creative/accounts/${platform}`, undefined, token);
      toast.success(`${platform} disconnected`);
      onRefresh();
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-bold text-white text-lg mb-1">Link Your Social Accounts</h3>
          <p className="text-white/40 text-sm">Connect your platforms to publish posts directly from Creative Studio.</p>
          <div className="flex items-center gap-3 mt-2">
            <p className="text-white/50 text-xs">{accounts.length} of {limits.accounts === -1 ? '∞' : limits.accounts} accounts connected</p>
            <div className="h-1.5 w-24 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${limits.accounts === -1 ? 40 : Math.min(100, (accounts.length / limits.accounts) * 100)}%`, background: 'linear-gradient(90deg,#7B5FFF,#D63DF6)' }} />
            </div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {PLATFORMS.map(p => {
          const PIcon = p.icon;
          const connected = accounts.find(a => a.platform === p.id);
          const available = limits.allowedPlatforms.includes(p.id);
          return (
            <div key={p.id} className="rounded-2xl border p-5 transition-all"
              style={{ background: '#0D0D0D', borderColor: connected ? `${p.color}30` : 'rgba(255,255,255,0.07)' }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: `${p.color}15`, border: `1px solid ${p.color}30` }}>
                  <PIcon size={22} style={{ color: p.color }} />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-white">{p.label}</p>
                  {connected ? (
                    <p className="text-sm text-white/50">@{connected.username}</p>
                  ) : (
                    <p className="text-xs text-white/30">{available ? 'Not connected' : 'Requires plan upgrade'}</p>
                  )}
                </div>
                {connected && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-green-400 bg-green-400/10">Connected</span>
                )}
              </div>
              {connected ? (
                <div>
                  {connected.followerCount ? <p className="text-white/40 text-xs mb-3">{connected.followerCount.toLocaleString()} followers</p> : null}
                  <button onClick={() => disconnect(p.id)}
                    className="w-full py-2 rounded-xl text-xs font-semibold text-red-400/70 hover:text-red-400 transition-all"
                    style={{ background: 'rgba(239,68,68,0.08)' }}>
                    Disconnect
                  </button>
                </div>
              ) : (
                <button onClick={() => connect(p.id)} disabled={connecting === p.id || !available}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-40"
                  style={{ background: available ? `linear-gradient(135deg, ${p.color}40, ${p.color}20)` : 'rgba(255,255,255,0.05)', border: `1px solid ${p.color}30` }}>
                  {connecting === p.id ? <Loader2 size={14} className="animate-spin mx-auto" /> : available ? `Connect ${p.label}` : 'Upgrade to unlock'}
                </button>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-6 p-4 rounded-2xl border" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.07)' }}>
        <div className="flex gap-2 mb-2">
          <AlertCircle size={14} className="text-white/30 flex-shrink-0 mt-0.5" />
          <p className="text-white/40 text-xs leading-relaxed">
            Connecting your accounts requires you to authorize MIXXEA in each platform's OAuth flow. Make sure your <strong className="text-white/60">META_APP_ID</strong>, <strong className="text-white/60">GOOGLE_CLIENT_ID</strong> environment variables are configured and your app has been approved for the required publishing permissions.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Analytics Tab ─────────────────────────────────────────────────────────────
function AnalyticsTab({ posts, limits }: { posts: SocialPost[]; limits: PlanLimits }) {
  const published = posts.filter(p => p.status === 'published' || p.status === 'partial');
  const scheduled = posts.filter(p => p.status === 'scheduled');
  const drafts = posts.filter(p => p.status === 'draft');
  const failed = posts.filter(p => p.status === 'failed');
  const platformCounts: Record<string, number> = {};
  posts.forEach(p => p.platforms.forEach(pl => { platformCounts[pl] = (platformCounts[pl] || 0) + 1; }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Published', value: published.length, color: '#10B981', icon: CheckCircle2 },
          { label: 'Scheduled', value: scheduled.length, color: '#7B5FFF', icon: Clock },
          { label: 'Drafts', value: drafts.length, color: '#6B7280', icon: Edit3 },
          { label: 'Failed', value: failed.length, color: '#EF4444', icon: AlertCircle },
        ].map(stat => {
          const SIcon = stat.icon;
          return (
            <div key={stat.label} className="rounded-2xl border p-5" style={{ background: '#0D0D0D', borderColor: 'rgba(255,255,255,0.07)' }}>
              <div className="flex items-center gap-2 mb-3">
                <SIcon size={16} style={{ color: stat.color }} />
                <p className="text-white/50 text-xs font-semibold">{stat.label}</p>
              </div>
              <p className="text-3xl font-bold text-white">{stat.value}</p>
            </div>
          );
        })}
      </div>
      {Object.keys(platformCounts).length > 0 && (
        <div className="rounded-2xl border p-6" style={{ background: '#0D0D0D', borderColor: 'rgba(255,255,255,0.07)' }}>
          <h4 className="font-bold text-white mb-4">Posts by Platform</h4>
          <div className="space-y-3">
            {PLATFORMS.filter(p => platformCounts[p.id]).map(p => {
              const count = platformCounts[p.id] || 0;
              const max = Math.max(...Object.values(platformCounts));
              const PIcon = p.icon;
              return (
                <div key={p.id} className="flex items-center gap-3">
                  <PIcon size={16} style={{ color: p.color }} />
                  <p className="text-white/60 text-sm w-24">{p.label}</p>
                  <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(count / max) * 100}%`, background: p.color }} />
                  </div>
                  <p className="text-white/50 text-sm w-6 text-right">{count}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {limits.analytics === 'basic' && (
        <div className="rounded-2xl border p-6 flex items-center gap-4" style={{ background: 'rgba(123,95,255,0.05)', borderColor: 'rgba(123,95,255,0.2)' }}>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(123,95,255,0.2)' }}>
            <TrendingUp size={22} style={{ color: '#7B5FFF' }} />
          </div>
          <div>
            <p className="font-bold text-white mb-1">Upgrade for Advanced Analytics</p>
            <p className="text-white/40 text-sm">Get per-post performance, engagement rates, best posting times, and platform insights with Growth or Pro.</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export function CreativeStudioPage() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('posts');
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [limits, setLimits] = useState<PlanLimits | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [credits, setCredits] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [composerOpen, setComposerOpen] = useState(false);
  const [editPost, setEditPost] = useState<SocialPost | undefined>(undefined);

  const loadData = useCallback(async () => {
    if (!token) return;
    try {
      const [limitsData, postsData, accountsData] = await Promise.all([
        creativeReq('GET', '/creative/usage', undefined, token),
        creativeReq('GET', '/creative/posts', undefined, token),
        creativeReq('GET', '/creative/accounts', undefined, token),
      ]);
      setLimits(limitsData.limits);
      setUsage(limitsData.usage);
      setCredits(limitsData.credits);
      setPosts(postsData.posts || []);
      setAccounts(accountsData.accounts || []);
    } catch (e: any) {
      console.error('[CreativeStudio] load error:', e);
      toast.error('Failed to load Creative Studio data');
    } finally { setLoading(false); }
  }, [token]);

  useEffect(() => { loadData(); }, [loadData]);

  const deletePost = async (id: string) => {
    if (!confirm('Delete this post?')) return;
    try {
      await creativeReq('DELETE', `/creative/posts/${id}`, undefined, token!);
      setPosts(prev => prev.filter(p => p.id !== id));
      toast.success('Post deleted');
    } catch (e: any) { toast.error(e.message); }
  };

  const publishNow = async (post: SocialPost) => {
    if (!confirm(`Publish "${post.title}" now to ${post.platforms.join(', ')}?`)) return;
    try {
      const data = await creativeReq('POST', `/creative/posts/${post.id}/publish`, {}, token!);
      setPosts(prev => prev.map(p => p.id === post.id ? data.post : p));
      const successes = Object.values(data.results || {}).filter((r: any) => r.status === 'success').length;
      if (successes > 0) toast.success(`Published to ${successes} platform${successes > 1 ? 's' : ''}!`);
      else toast.error('Publishing failed. Check your platform connections.');
    } catch (e: any) { toast.error(e.message); }
  };

  const openComposer = (post?: SocialPost) => {
    setEditPost(post);
    setComposerOpen(true);
  };

  const filteredPosts = statusFilter === 'all' ? posts : posts.filter(p => p.status === statusFilter);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#7B5FFF,#D63DF6)' }}>
              <Wand2 size={18} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Creative Studio</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold" style={{ background: 'rgba(0,196,255,0.15)', color: '#00C4FF', border: '1px solid rgba(0,196,255,0.3)' }}>NEW</span>
          </div>
          <p className="text-white/40 text-sm pl-12">Create, schedule, and publish social content with AI</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {accounts.length === 0 && (
            <button onClick={() => setActiveTab('accounts')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all hover:opacity-90"
              style={{ background: 'rgba(255,165,0,0.15)', color: '#FFA500', border: '1px solid rgba(255,165,0,0.4)' }}>
              <Link2 size={14} /> Connect Accounts
            </button>
          )}
          <button onClick={() => openComposer()} className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white transition-all hover:opacity-90 text-sm"
            style={{ background: 'linear-gradient(135deg,#7B5FFF,#D63DF6)' }}>
            <Plus size={16} /> New Post
          </button>
        </div>
      </motion.div>

      {/* "No accounts" attention banner — visible on every tab except Accounts */}
      {accounts.length === 0 && activeTab !== 'accounts' && (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 p-4 rounded-2xl border mb-6 cursor-pointer group hover:border-orange-400/50 transition-all"
          style={{ background: 'rgba(255,165,0,0.06)', borderColor: 'rgba(255,165,0,0.25)' }}
          onClick={() => setActiveTab('accounts')}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,165,0,0.15)' }}>
            <Link2 size={18} style={{ color: '#FFA500' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm" style={{ color: '#FFA500' }}>No social accounts connected yet</p>
            <p className="text-white/40 text-xs mt-0.5">Connect Instagram, TikTok, Facebook, or YouTube to publish posts directly from MIXXEA.</p>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-black flex-shrink-0 group-hover:opacity-90 transition-opacity" style={{ background: '#FFA500' }}>
            Connect Now <ChevronRight size={12} />
          </div>
        </motion.div>
      )}

      {/* Stats strip */}
      {limits && usage && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Posts this month', used: usage.postsPublished + usage.postsScheduled, limit: limits.postsPerMonth, color: '#7B5FFF' },
            { label: 'AI Captions', used: usage.aiCaptionsUsed, limit: limits.aiCaptionsPerMonth, color: '#00C4FF' },
            { label: 'AI Images', used: usage.aiImagesUsed, limit: limits.aiImagesPerMonth, color: '#D63DF6' },
            { label: 'Accounts', used: accounts.length, limit: limits.accounts, color: '#10B981' },
          ].map(s => (
            <div key={s.label} className="rounded-2xl border p-4" style={{ background: '#0D0D0D', borderColor: 'rgba(255,255,255,0.07)' }}>
              <p className="text-white/40 text-xs mb-1.5">{s.label}</p>
              <p className="text-xl font-bold text-white">{s.used}<span className="text-white/30 text-sm font-normal">/{s.limit === -1 ? '∞' : s.limit}</span></p>
              <div className="h-1 rounded-full bg-white/10 mt-2 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${s.limit === -1 ? 30 : Math.min(100, (s.used / s.limit) * 100)}%`, background: s.color }} />
              </div>
            </div>
          ))}
        </motion.div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-2xl mb-6 overflow-x-auto" style={{ background: 'rgba(255,255,255,0.04)' }}>
        {TABS.map((tab: any) => {
          const TIcon = tab.icon;
          const needsAttention = tab.id === 'accounts' && accounts.length === 0;
          const isActive = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex-shrink-0 ${
                isActive
                  ? 'text-white'
                  : needsAttention
                  ? 'text-orange-400 hover:text-orange-300'
                  : 'text-white/40 hover:text-white/70'
              }`}
              style={isActive ? { background: needsAttention ? 'rgba(255,165,0,0.15)' : 'rgba(255,255,255,0.08)' } : {}}>
              <TIcon size={15} />
              {tab.label}
              {needsAttention && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" style={{ background: '#FFA500' }} />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>

          {activeTab === 'posts' && (
            <div>
              <div className="flex gap-2 mb-5 flex-wrap">
                {['all','draft','scheduled','published','failed'].map(s => (
                  <button key={s} onClick={() => setStatusFilter(s)}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all"
                    style={statusFilter === s ? { background: STATUS_COLORS[s] ? `${STATUS_COLORS[s]}25` : 'rgba(255,255,255,0.1)', color: STATUS_COLORS[s] || '#fff' } : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}>
                    {s === 'all' ? `All (${posts.length})` : `${s.charAt(0).toUpperCase() + s.slice(1)} (${posts.filter(p => p.status === s).length})`}
                  </button>
                ))}
              </div>
              {filteredPosts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'rgba(123,95,255,0.1)' }}>
                    <Wand2 size={28} style={{ color: '#7B5FFF' }} />
                  </div>
                  <h3 className="text-white font-bold text-lg mb-2">No posts yet</h3>
                  <p className="text-white/40 text-sm mb-6">Create your first post and start building your social presence</p>
                  <button onClick={() => openComposer()} className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white" style={{ background: 'linear-gradient(135deg,#7B5FFF,#D63DF6)' }}>
                    <Plus size={16} /> Create First Post
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredPosts.map(post => (
                    <PostCard key={post.id} post={post}
                      onEdit={() => openComposer(post)}
                      onDelete={() => deletePost(post.id)}
                      onPublish={() => publishNow(post)} />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'calendar' && <CalendarView posts={posts} />}

          {activeTab === 'ai' && limits && usage && (
            <AIStudio token={token!} limits={limits} usage={usage} credits={credits} onRefreshCredits={loadData} />
          )}

          {activeTab === 'analytics' && limits && (
            <AnalyticsTab posts={posts} limits={limits} />
          )}

          {activeTab === 'accounts' && limits && (
            <AccountsTab token={token!} accounts={accounts} limits={limits} onRefresh={loadData} />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Composer modal */}
      <AnimatePresence>
        {composerOpen && limits && (
          <PostComposer
            token={token!}
            limits={limits}
            onClose={() => { setComposerOpen(false); setEditPost(undefined); }}
            onSaved={(post) => {
              setPosts(prev => {
                const idx = prev.findIndex(p => p.id === post.id);
                return idx >= 0 ? prev.map(p => p.id === post.id ? post : p) : [post, ...prev];
              });
            }}
            editPost={editPost}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
