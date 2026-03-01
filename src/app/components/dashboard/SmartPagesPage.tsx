import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useAuth } from './AuthContext';
import * as api from './api';
import { toast } from 'sonner';
import { Globe, ExternalLink, Eye, EyeOff, Instagram, Youtube, Music, Twitter, CheckCircle, Edit3, Save, Radio } from 'lucide-react';

const THEMES = [
  { id: 'dark', label: 'Dark', preview: 'bg-[#0A0A0A]' },
  { id: 'gradient', label: 'Gradient', preview: 'bg-gradient-to-br from-[#7B5FFF] to-[#D63DF6]' },
  { id: 'midnight', label: 'Midnight', preview: 'bg-gradient-to-br from-[#0D0D1A] to-[#1A0D2E]' },
  { id: 'neon', label: 'Neon', preview: 'bg-gradient-to-br from-[#001A2C] to-[#003040]' },
];

export function SmartPagesPage() {
  const { token, user } = useAuth();
  const [page, setPage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<any>({});
  const [stats, setStats] = useState({ pageViews: 0, linkClicks: 0, saves: 0 });

  useEffect(() => {
    if (!token) return;
    api.getSmartPage(token).then(d => {
      setPage(d.smartPage);
      setForm(d.smartPage);
    }).catch(() => {}).finally(() => setLoading(false));
    api.getSmartPageStats(token).then(d => setStats(d)).catch(() => {});
  }, [token]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { smartPage } = await api.updateSmartPage(token!, form);
      setPage(smartPage);
      setForm(smartPage);
      setEditing(false);
      toast.success('Smart Page updated!');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async () => {
    try {
      const { smartPage } = await api.updateSmartPage(token!, { ...form, isPublic: !page.isPublic });
      setPage(smartPage);
      setForm(smartPage);
      toast.success(smartPage.isPublic ? '🌐 Smart Page is now public!' : 'Smart Page is now private');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const updateSocial = (platform: string, value: string) => {
    setForm((f: any) => ({ ...f, socialLinks: { ...f.socialLinks, [platform]: value } }));
  };

  if (loading) {
    return <div className="p-4 lg:p-6"><div className="h-8 w-48 bg-white/[0.05] rounded-xl animate-pulse mb-6" /><div className="h-96 bg-white/[0.03] rounded-2xl animate-pulse" /></div>;
  }

  const pageUrl = `https://mixxea.com/p/${page?.slug || user?.name?.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Smart Pages</h1>
          <p className="text-white/40 text-sm mt-1">Your public artist profile & bio link page</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleTogglePublish}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border ${page?.isPublic ? 'border-[#10B981]/30 bg-[#10B981]/10 text-[#10B981]' : 'border-white/[0.08] bg-white/[0.05] text-white/50 hover:text-white'}`}>
            {page?.isPublic ? <Eye size={14} /> : <EyeOff size={14} />}
            {page?.isPublic ? 'Published' : 'Unpublished'}
          </button>
          {!editing ? (
            <button onClick={() => setEditing(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-white text-sm transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #7B5FFF, #D63DF6)' }}>
              <Edit3 size={14} /> Edit Page
            </button>
          ) : (
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-white text-sm transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #10B981, #00C4FF)' }}>
              <Save size={14} /> {saving ? 'Saving...' : 'Save Changes'}
            </button>
          )}
        </div>
      </div>

      {/* URL Bar */}
      <div className="flex items-center gap-3 p-4 bg-[#111111] border border-white/[0.06] rounded-xl mb-6">
        <Globe size={16} className="text-[#7B5FFF] flex-shrink-0" />
        <span className="text-sm text-white/60 flex-1 truncate">{pageUrl}</span>
        {page?.isPublic && (
          <a href={pageUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-[#7B5FFF] hover:text-[#D63DF6] transition-colors flex-shrink-0">
            <ExternalLink size={13} /> Visit
          </a>
        )}
        <div className="flex items-center gap-1.5 text-xs flex-shrink-0">
          {page?.isPublic ? <><CheckCircle size={13} className="text-[#10B981]" /><span className="text-[#10B981]">Live</span></> : <span className="text-white/30">Private</span>}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Edit Form */}
        <div className="space-y-5">
          <div className="bg-[#111111] border border-white/[0.06] rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-white mb-4">Profile Info</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">Artist Name</label>
                <input value={form.artistName || ''} onChange={e => setForm((f: any) => ({ ...f, artistName: e.target.value }))} disabled={!editing}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white disabled:opacity-50 focus:outline-none focus:border-[#7B5FFF]/50" />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">Bio</label>
                <textarea value={form.bio || ''} onChange={e => setForm((f: any) => ({ ...f, bio: e.target.value }))} disabled={!editing} rows={4}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white disabled:opacity-50 focus:outline-none focus:border-[#7B5FFF]/50 resize-none"
                  placeholder="Write something about yourself or your music..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">Genre</label>
                  <input value={form.genre || ''} onChange={e => setForm((f: any) => ({ ...f, genre: e.target.value }))} disabled={!editing}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white disabled:opacity-50 focus:outline-none focus:border-[#7B5FFF]/50"
                    placeholder="Afrobeats, Hip-Hop..." />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">Location</label>
                  <input value={form.location || ''} onChange={e => setForm((f: any) => ({ ...f, location: e.target.value }))} disabled={!editing}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white disabled:opacity-50 focus:outline-none focus:border-[#7B5FFF]/50"
                    placeholder="Lagos, Nigeria" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">Page Slug (URL)</label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/30 flex-shrink-0">mixxea.com/p/</span>
                  <input value={form.slug || ''} onChange={e => setForm((f: any) => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))} disabled={!editing}
                    className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white disabled:opacity-50 focus:outline-none focus:border-[#7B5FFF]/50" />
                </div>
              </div>
            </div>
          </div>

          {/* Social Links */}
          <div className="bg-[#111111] border border-white/[0.06] rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-white mb-4">Social Links</h2>
            <div className="space-y-3">
              {[
                { key: 'spotify', icon: Music, label: 'Spotify', color: '#1DB954', placeholder: 'https://open.spotify.com/artist/...' },
                { key: 'instagram', icon: Instagram, label: 'Instagram', color: '#E1306C', placeholder: 'https://instagram.com/yourusername' },
                { key: 'tiktok', icon: Radio, label: 'TikTok', color: '#FF0050', placeholder: 'https://tiktok.com/@yourusername' },
                { key: 'youtube', icon: Youtube, label: 'YouTube', color: '#FF0000', placeholder: 'https://youtube.com/@yourchannel' },
                { key: 'twitter', icon: Twitter, label: 'Twitter / X', color: '#1DA1F2', placeholder: 'https://x.com/yourusername' },
                { key: 'soundcloud', icon: Music, label: 'SoundCloud', color: '#FF5500', placeholder: 'https://soundcloud.com/yourusername' },
              ].map(({ key, icon: Icon, label, color, placeholder }) => (
                <div key={key} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}20` }}>
                    <Icon size={14} style={{ color }} />
                  </div>
                  <input
                    value={form.socialLinks?.[key] || ''} onChange={e => updateSocial(key, e.target.value)} disabled={!editing}
                    className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white disabled:opacity-50 focus:outline-none focus:border-[#7B5FFF]/50 placeholder-white/20"
                    placeholder={placeholder}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Theme */}
          <div className="bg-[#111111] border border-white/[0.06] rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-white mb-4">Page Theme</h2>
            <div className="grid grid-cols-4 gap-3">
              {THEMES.map(t => (
                <button key={t.id} onClick={() => editing && setForm((f: any) => ({ ...f, theme: t.id }))} disabled={!editing}
                  className={`relative aspect-video rounded-xl overflow-hidden border-2 transition-all ${form.theme === t.id ? 'border-[#7B5FFF]' : 'border-transparent hover:border-white/20'} ${!editing ? 'cursor-default' : 'cursor-pointer'}`}>
                  <div className={`w-full h-full ${t.preview}`} />
                  {form.theme === t.id && <div className="absolute inset-0 flex items-center justify-center"><CheckCircle size={14} className="text-[#7B5FFF]" /></div>}
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-center py-0.5"><span className="text-[9px] text-white/70">{t.label}</span></div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="lg:sticky lg:top-24">
          <div className="bg-[#111111] border border-white/[0.06] rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
              <div className="flex gap-1.5">{['#FF5252','#F59E0B','#10B981'].map(c => <div key={c} className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />)}</div>
              <div className="flex-1 bg-white/[0.06] rounded-md px-3 py-1 text-center"><span className="text-[10px] text-white/30 truncate">{pageUrl}</span></div>
            </div>
            <div className={`${THEMES.find(t => t.id === (form.theme || 'dark'))?.preview || 'bg-[#0A0A0A]'} p-6 min-h-[400px]`}>
              {/* Profile */}
              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#7B5FFF] to-[#D63DF6] flex items-center justify-center mb-3 text-white text-2xl font-bold shadow-2xl">
                  {(form.artistName || user?.name || 'A').charAt(0).toUpperCase()}
                </div>
                <h2 className="text-white font-bold text-lg">{form.artistName || user?.name}</h2>
                {form.genre && <p className="text-white/50 text-xs mt-0.5">{form.genre}{form.location && ` · ${form.location}`}</p>}
                {form.bio && <p className="text-white/60 text-xs mt-2 max-w-xs leading-relaxed">{form.bio.slice(0, 120)}{form.bio.length > 120 ? '...' : ''}</p>}
              </div>
              {/* Social links preview */}
              <div className="flex flex-wrap justify-center gap-2 mb-4">
                {Object.entries(form.socialLinks || {}).filter(([_, v]) => v).slice(0, 4).map(([platform]) => (
                  <div key={platform} className="px-3 py-1.5 bg-white/10 rounded-full text-xs text-white/70 capitalize">{platform}</div>
                ))}
              </div>
              {/* Streaming badge */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                <p className="text-white/30 text-[10px] mb-1">AVAILABLE ON</p>
                <p className="text-white/60 text-xs">Spotify · Apple Music · YouTube · Tidal + 140 more</p>
              </div>
            </div>
          </div>

          {/* Smart Page Stats */}
          <div className="mt-4 grid grid-cols-3 gap-3">
            {[{ label: 'Page Views', value: stats.pageViews > 0 ? stats.pageViews.toLocaleString() : '—' }, { label: 'Link Clicks', value: stats.linkClicks > 0 ? stats.linkClicks.toLocaleString() : '—' }, { label: 'Saves', value: stats.saves > 0 ? stats.saves.toLocaleString() : '—' }].map(s => (
              <div key={s.label} className="bg-[#111111] border border-white/[0.06] rounded-xl p-3 text-center">
                <div className="text-lg font-bold text-white">{s.value}</div>
                <div className="text-[10px] text-white/30 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}