import { projectId, publicAnonKey } from '../../../../utils/supabase/info';
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router';
import { motion } from 'motion/react';
import {
  Music, Instagram, Youtube, Twitter, Radio, Globe, ExternalLink,
  Play, Calendar, Disc3, AlertCircle, Loader2, Share2, Heart
} from 'lucide-react';

const BASE = `https://${projectId}.supabase.co/functions/v1/make-server-f4d1ffe4`;

const THEME_STYLES: Record<string, { bg: string; card: string; text: string; accent: string }> = {
  dark:     { bg: 'bg-[#0A0A0A]',                              card: 'bg-white/[0.04] border border-white/[0.08]', text: 'text-white', accent: '#7B5FFF' },
  gradient: { bg: 'bg-gradient-to-br from-[#1A0533] to-[#0A0A1E]', card: 'bg-white/[0.06] border border-white/[0.1]', text: 'text-white', accent: '#D63DF6' },
  midnight: { bg: 'bg-gradient-to-br from-[#0D0D1A] to-[#1A0D2E]',  card: 'bg-white/[0.05] border border-purple-900/30', text: 'text-white', accent: '#00C4FF' },
  neon:     { bg: 'bg-gradient-to-br from-[#001A2C] to-[#003040]',   card: 'bg-white/[0.05] border border-cyan-900/30', text: 'text-white', accent: '#00C4FF' },
};

const SOCIAL_ICONS: Record<string, { icon: any; color: string; label: string }> = {
  spotify:    { icon: Music,     color: '#1DB954', label: 'Spotify'    },
  instagram:  { icon: Instagram, color: '#E1306C', label: 'Instagram'  },
  tiktok:     { icon: Radio,     color: '#FF0050', label: 'TikTok'     },
  youtube:    { icon: Youtube,   color: '#FF0000', label: 'YouTube'    },
  twitter:    { icon: Twitter,   color: '#1DA1F2', label: 'X / Twitter'},
  soundcloud: { icon: Music,     color: '#FF5500', label: 'SoundCloud' },
};

export function PublicSmartPage() {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [liked, setLiked] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!slug) return;
    fetch(`${BASE}/smart-page/public/${slug}`, {
      headers: { Authorization: `Bearer ${publicAnonKey}` },
    })
      .then(async res => {
        const d = await res.json();
        if (!res.ok) throw new Error(d.error || 'Page not found');
        setData(d);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [slug]);

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: data?.smartPage?.artistName, url });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {}
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={32} className="text-[#7B5FFF] animate-spin" />
          <p className="text-white/40 text-sm">Loading artist page...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-center max-w-sm px-6">
          <AlertCircle size={48} className="text-white/20 mx-auto mb-4" />
          <h1 className="text-white text-xl font-bold mb-2">Page Not Found</h1>
          <p className="text-white/40 text-sm mb-6">
            {error === 'Page is private' ? 'This artist page is currently private.' : "This artist page doesn't exist yet."}
          </p>
          <Link to="/" className="text-[#7B5FFF] text-sm hover:text-[#D63DF6] transition-colors">← Back to MIXXEA</Link>
        </div>
      </div>
    );
  }

  const { smartPage, releases = [], pageViews = 0 } = data || {};
  const theme = THEME_STYLES[smartPage?.theme || 'dark'];
  const socialLinks = smartPage?.socialLinks || {};
  const activeSocials = Object.entries(socialLinks).filter(([_, v]) => v);

  return (
    <div className={`min-h-screen ${theme.bg} relative`}>
      {/* Ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full blur-[120px] pointer-events-none opacity-30"
        style={{ background: `radial-gradient(ellipse, ${theme.accent}40, transparent)` }} />

      {/* Navbar */}
      <div className="sticky top-0 z-50 backdrop-blur-xl border-b border-white/[0.06] px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-white/50 text-xs font-bold tracking-widest uppercase">MIXXEA</span>
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLiked(!liked)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${liked ? 'bg-[#FF5252]/10 border-[#FF5252]/30 text-[#FF5252]' : 'border-white/10 text-white/40 hover:text-white'}`}
            >
              <Heart size={12} className={liked ? 'fill-current' : ''} /> {liked ? 'Liked' : 'Like'}
            </button>
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-white/10 text-white/40 hover:text-white transition-all"
            >
              <Share2 size={12} /> {copied ? 'Copied!' : 'Share'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-10 relative z-10">

        {/* Artist Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          {/* Avatar */}
          <div className="relative inline-block mb-5">
            <div className="w-28 h-28 rounded-full flex items-center justify-center text-white text-4xl font-black shadow-2xl mx-auto"
              style={{ background: `linear-gradient(135deg, ${theme.accent}, #D63DF6)` }}>
              {smartPage?.profileImage ? (
                <img src={smartPage.profileImage} alt={smartPage.artistName} className="w-full h-full object-cover rounded-full" />
              ) : (
                (smartPage?.artistName || 'A').charAt(0).toUpperCase()
              )}
            </div>
            <div className="absolute bottom-1 right-1 w-6 h-6 rounded-full border-2 border-[#0A0A0A] flex items-center justify-center"
              style={{ background: theme.accent }}>
              <Music size={10} className="text-white" />
            </div>
          </div>

          <h1 className="text-white text-3xl font-black mb-1">{smartPage?.artistName}</h1>
          {(smartPage?.genre || smartPage?.location) && (
            <p className="text-white/40 text-sm">
              {[smartPage.genre, smartPage.location].filter(Boolean).join(' · ')}
            </p>
          )}
          {smartPage?.bio && (
            <p className="text-white/60 text-sm mt-3 max-w-md mx-auto leading-relaxed">{smartPage.bio}</p>
          )}

          {/* Stats row */}
          <div className="flex items-center justify-center gap-6 mt-4">
            <div className="text-center">
              <div className="text-white font-bold text-lg">{pageViews.toLocaleString()}</div>
              <div className="text-white/30 text-xs">Page Views</div>
            </div>
            {activeSocials.length > 0 && (
              <div className="text-center">
                <div className="text-white font-bold text-lg">{activeSocials.length}</div>
                <div className="text-white/30 text-xs">Platforms</div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Social Links */}
        {activeSocials.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-3 mb-8"
          >
            {activeSocials.map(([platform, url]) => {
              const social = SOCIAL_ICONS[platform];
              if (!social) return null;
              const Icon = social.icon;
              return (
                <a
                  key={platform}
                  href={url as string}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center justify-between px-5 py-4 rounded-2xl ${theme.card} hover:scale-[1.01] transition-all group`}
                  onClick={() => {
                    fetch(`${BASE}/smart-page/track/${smartPage?.userId || ''}`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` },
                      body: JSON.stringify({ type: 'click', platform }),
                    }).catch(() => {});
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${social.color}20` }}>
                      <Icon size={16} style={{ color: social.color }} />
                    </div>
                    <span className="text-white font-semibold text-sm">{social.label}</span>
                  </div>
                  <ExternalLink size={14} className="text-white/30 group-hover:text-white/60 transition-colors" />
                </a>
              );
            })}
          </motion.div>
        )}

        {/* Releases */}
        {releases.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <h2 className="text-white/50 text-xs font-bold uppercase tracking-widest mb-4">Latest Releases</h2>
            <div className="space-y-3">
              {releases.map((release: any) => (
                <div key={release.id} className={`flex items-center gap-4 p-4 rounded-2xl ${theme.card}`}>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `linear-gradient(135deg, ${theme.accent}30, #D63DF630)` }}>
                    {release.coverArt ? (
                      <img src={release.coverArt} alt={release.title} className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      <Disc3 size={20} style={{ color: theme.accent }} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-semibold text-sm truncate">{release.title}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-white/30 text-xs capitalize">{release.type}</span>
                      {release.releaseDate && (
                        <>
                          <span className="text-white/20">·</span>
                          <span className="text-white/30 text-xs flex items-center gap-1">
                            <Calendar size={10} />
                            {new Date(release.releaseDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <button className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-105"
                    style={{ background: theme.accent }}>
                    <Play size={14} className="text-white ml-0.5" />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* DSP Streaming Badge */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className={`${theme.card} rounded-2xl p-5 text-center mb-8`}
        >
          <p className="text-white/30 text-[11px] uppercase tracking-widest mb-2 font-bold">Available on all platforms</p>
          <div className="flex flex-wrap justify-center gap-3">
            {['🟢 Spotify','🍎 Apple Music','🔴 YouTube Music','🔵 TIDAL','🟠 Amazon','🟣 Deezer'].map(s => (
              <span key={s} className="text-white/50 text-xs font-medium px-2 py-1 rounded-full bg-white/[0.04]">{s}</span>
            ))}
          </div>
          <p className="text-white/20 text-[11px] mt-2">+ 140 more stores worldwide</p>
        </motion.div>

        {/* Website link */}
        {smartPage?.website && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} className="mb-6">
            <a href={smartPage.website} target="_blank" rel="noopener noreferrer"
              className={`flex items-center justify-between px-5 py-4 rounded-2xl ${theme.card} hover:scale-[1.01] transition-all group`}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/[0.08]">
                  <Globe size={16} className="text-white/60" />
                </div>
                <span className="text-white font-semibold text-sm">Official Website</span>
              </div>
              <ExternalLink size={14} className="text-white/30 group-hover:text-white/60 transition-colors" />
            </a>
          </motion.div>
        )}

        {/* Footer */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="text-center pt-4">
          <p className="text-white/20 text-xs">Powered by</p>
          <Link to="/" className="text-white/30 text-sm font-bold tracking-widest uppercase hover:text-white/50 transition-colors">
            MIXXEA
          </Link>
          <p className="text-white/15 text-xs mt-1">Music Distribution & Marketing</p>
        </motion.div>
      </div>
    </div>
  );
}