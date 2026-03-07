// ─────────────────────────────────────────────────────────────────────────────
//  MIXXEA — Feature 11: Artist Community Feed
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from './AuthContext';
import * as api from './api';
import { toast } from 'sonner';
import { Heart, MessageCircle, Trash2, Send, Users, Music, TrendingUp, Star, Zap, Award } from 'lucide-react';

const POST_TYPES = [
  { id: 'update', label: '📢 Update', placeholder: 'Share a release update, career milestone, or big news…' },
  { id: 'milestone', label: '🏆 Milestone', placeholder: 'Celebrate a milestone — streams, shows, licensing deals…' },
  { id: 'tip', label: '💡 Tip', placeholder: 'Share a music industry tip with the community…' },
  { id: 'collab', label: '🤝 Collab', placeholder: 'Looking for collaborators? Describe what you need…' },
];

const typeColors: Record<string, string> = {
  update: '#7B5FFF', milestone: '#F59E0B', tip: '#00C4FF', collab: '#10B981',
};
const typeIcons: Record<string, string> = {
  update: '📢', milestone: '🏆', tip: '💡', collab: '🤝',
};

function formatTime(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (days > 0) return `${days}d ago`;
  if (hrs > 0) return `${hrs}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return 'Just now';
}

// Seed posts for a fresh community
const SEED_POSTS = [
  { id: 'seed1', authorName: 'Marcus Bell', authorRole: 'artist', type: 'milestone', content: '🎉 Just hit 10K streams on Spotify with my latest single "Neon Pulse"! MIXXEA playlist pitching is insane — 23 placements in 2 weeks. If you\'re sleeping on this platform, wake up!', likes: 47, likedByMe: false, createdAt: new Date(Date.now() - 2 * 3600000).toISOString() },
  { id: 'seed2', authorName: 'Luna Drift', authorRole: 'label', type: 'tip', content: '💡 Pro tip: Upload your release at least 3 weeks before release date. Spotify editorial pitch window closes 7 days before, so give yourself time to submit properly. This doubled our editorial placements! #MusicDistribution', likes: 31, likedByMe: false, createdAt: new Date(Date.now() - 5 * 3600000).toISOString() },
  { id: 'seed3', authorName: 'DJ Soulfire', authorRole: 'artist', type: 'collab', content: 'Looking for a vocalist for a House / Afrobeats fusion project dropping this summer. Based in Lagos but open to remote. DM me if you\'re interested — let\'s build something 🔥', likes: 18, likedByMe: false, createdAt: new Date(Date.now() - 12 * 3600000).toISOString() },
  { id: 'seed4', authorName: 'Aria Waves', authorRole: 'artist', type: 'milestone', content: 'First TikTok UGC campaign just wrapped. 14 creators seeded my track "Glass Heart" — it hit the For You page twice! 2.1M views combined. Best investment I\'ve made for my music 🚀', likes: 62, likedByMe: false, createdAt: new Date(Date.now() - 24 * 3600000).toISOString() },
  { id: 'seed5', authorName: 'ThirdEye Records', authorRole: 'label', type: 'update', content: 'We just released 3 new artists this month through MIXXEA. The distribution pipeline is fast — tracks go live within 24 hours now. Excited for what Q2 looks like for our roster!', likes: 24, likedByMe: false, createdAt: new Date(Date.now() - 2 * 86400000).toISOString() },
];

export function CommunityPage() {
  const { token, user } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [type, setType] = useState('update');
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState('all');
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!token) return;
    api.getCommunityPosts(token)
      .then((r: any) => { const serverPosts = r.posts || []; setPosts(serverPosts.length > 0 ? serverPosts : SEED_POSTS); })
      .catch(() => setPosts(SEED_POSTS))
      .finally(() => setLoading(false));
  }, [token]);

  const handlePost = async () => {
    if (!content.trim() || content.length < 5) { toast.error('Write something first!'); return; }
    setSubmitting(true);
    try {
      const r = await api.createCommunityPost(token!, { content, type }) as any;
      setPosts(prev => [r.post, ...prev]);
      setContent('');
      toast.success('Posted to community!');
    } catch (err: any) { toast.error(err.message); }
    finally { setSubmitting(false); }
  };

  const handleLike = async (post: any) => {
    setPosts(prev => prev.map(p => p.id === post.id ? { ...p, likes: p.likedByMe ? p.likes - 1 : p.likes + 1, likedByMe: !p.likedByMe } : p));
    if (post.id.startsWith('seed')) return; // Skip API for seed posts
    try { await api.likePost(token!, post.id); } catch { /* revert */ }
  };

  const handleDelete = async (postId: string) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
    try { await api.deletePost(token!, postId); } catch { }
  };

  const filtered = filter === 'all' ? posts : posts.filter(p => p.type === filter);
  const currentType = POST_TYPES.find(t => t.id === type) || POST_TYPES[0];

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white mb-1">Community</h1>
          <p className="text-white/40 text-sm">Connect with artists, share wins, and find collaborators</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-white/30">
          <div className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
          <span>{posts.length} posts</span>
        </div>
      </div>

      {/* Compose box */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="bg-[#0D0D0D] border border-white/[0.07] rounded-2xl p-4">
        {/* Type selector */}
        <div className="flex gap-2 mb-3 overflow-x-auto scrollbar-none">
          {POST_TYPES.map(t => (
            <button key={t.id} onClick={() => setType(t.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${type === t.id ? 'text-white' : 'text-white/40 bg-[#050505] border-white/[0.06] hover:text-white'}`}
              style={type === t.id ? { background: `${typeColors[t.id]}25`, borderColor: `${typeColors[t.id]}50`, color: typeColors[t.id] } : {}}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#7B5FFF] to-[#D63DF6] flex items-center justify-center flex-shrink-0 text-white text-sm font-bold">
            {user?.name?.charAt(0).toUpperCase() || '?'}
          </div>
          <div className="flex-1">
            <textarea ref={textRef} value={content} onChange={e => setContent(e.target.value)}
              placeholder={currentType.placeholder}
              rows={3}
              className="w-full bg-transparent text-sm text-white placeholder:text-white/25 resize-none focus:outline-none leading-relaxed" />
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-white/25">{content.length}/500</span>
              <button onClick={handlePost} disabled={submitting || content.length < 5}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#7B5FFF,#D63DF6)' }}>
                {submitting ? 'Posting…' : <><Send size={11} /> Post</>}
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Filter */}
      <div className="flex gap-2 overflow-x-auto scrollbar-none">
        {['all', 'update', 'milestone', 'tip', 'collab'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all capitalize ${filter === f ? 'text-white border-transparent' : 'text-white/40 bg-[#0D0D0D] border-white/[0.06] hover:text-white'}`}
            style={filter === f ? { background: f === 'all' ? 'linear-gradient(135deg,#7B5FFF,#D63DF6)' : `${typeColors[f]}25`, borderColor: f === 'all' ? 'transparent' : `${typeColors[f]}50`, color: f === 'all' ? '#fff' : typeColors[f] } : {}}>
            {f === 'all' ? 'All Posts' : POST_TYPES.find(t => t.id === f)?.label || f}
          </button>
        ))}
      </div>

      {/* Feed */}
      {loading ? (
        <div className="flex items-center justify-center py-16"><div className="w-8 h-8 rounded-full border-2 border-[#7B5FFF] border-t-transparent animate-spin" /></div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {filtered.map((post, i) => (
              <motion.div key={post.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ delay: i * 0.03 }}
                className="bg-[#0D0D0D] border border-white/[0.07] rounded-2xl p-4 hover:border-white/[0.12] transition-all">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm text-white"
                    style={{ background: `linear-gradient(135deg,${typeColors[post.type] || '#7B5FFF'},${typeColors[post.type] === '#7B5FFF' ? '#D63DF6' : typeColors[post.type]})` }}>
                    {post.authorName?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-bold text-white">{post.authorName}</span>
                      <span className="text-[10px] text-white/30 capitalize">{post.authorRole}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                        style={{ color: typeColors[post.type] || '#7B5FFF', background: (typeColors[post.type] || '#7B5FFF') + '20' }}>
                        {typeIcons[post.type] || ''} {post.type}
                      </span>
                      <span className="text-[10px] text-white/25 ml-auto">{formatTime(post.createdAt)}</span>
                    </div>
                    <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">{post.content}</p>
                    <div className="flex items-center gap-4 mt-3">
                      <button onClick={() => handleLike(post)}
                        className={`flex items-center gap-1.5 text-xs transition-all ${post.likedByMe ? 'text-[#FF5252]' : 'text-white/30 hover:text-[#FF5252]'}`}>
                        <Heart size={13} className={post.likedByMe ? 'fill-current' : ''} /> {post.likes}
                      </button>
                      {post.userId === (user as any)?.id && !post.id.startsWith('seed') && (
                        <button onClick={() => handleDelete(post.id)}
                          className="text-white/20 hover:text-[#FF5252] transition-colors ml-auto">
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
