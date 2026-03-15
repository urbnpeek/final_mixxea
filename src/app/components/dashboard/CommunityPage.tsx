// ─────────────────────────────────────────────────────────────────────────────
//  MIXXEA — Community Feed v2
//  Features: Posts · Comments · Notifications · Profile Cards · Pinned Posts
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from './AuthContext';
import * as api from './api';
import { toast } from 'sonner';
import {
  Heart, MessageCircle, Trash2, Send, Pin, Bell, X, ChevronDown, ChevronUp,
  Users, Music2, Loader2, RefreshCw, CheckCheck,
  MapPin, Calendar, ExternalLink,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────
interface Post {
  id: string; userId: string; authorName: string; authorRole: string;
  content: string; type: string; likes: number; comments: number;
  likedByMe: boolean; pinned?: boolean; createdAt: string;
}
interface Comment {
  id: string; postId: string; userId: string; authorName: string;
  authorRole: string; content: string; createdAt: string;
}
interface UserProfile {
  id: string; name: string; role: string; bio: string; genre: string;
  location: string; plan: string; isAdmin: boolean; joinedAt: string;
  postCount: number; totalLikes: number; socialLinks: Record<string, string>;
}
interface Notification {
  id: string; type: string; title: string; message: string;
  read: boolean; link: string; actorName?: string; postId?: string;
  createdAt: string;
}

// ── Config ───────────────────────────────────────────────────────────────────
const POST_TYPES = [
  { id: 'update',    label: '📢 Update',    placeholder: 'Share a release update, career milestone, or big news…',    color: '#7B5FFF' },
  { id: 'milestone', label: '🏆 Milestone', placeholder: 'Celebrate a milestone — streams, shows, licensing deals…', color: '#F59E0B' },
  { id: 'tip',       label: '💡 Tip',       placeholder: 'Share a music industry tip with the community…',           color: '#00C4FF' },
  { id: 'collab',    label: '🤝 Collab',    placeholder: 'Looking for collaborators? Describe what you need…',       color: '#10B981' },
];
const TYPE_COLOR: Record<string, string> = { update: '#7B5FFF', milestone: '#F59E0B', tip: '#00C4FF', collab: '#10B981' };
const TYPE_ICON:  Record<string, string> = { update: '📢', milestone: '🏆', tip: '💡', collab: '🤝' };

const SEED_POSTS: Post[] = [
  { id: 'seed1', userId: 's1', authorName: 'Marcus Bell',     authorRole: 'artist', type: 'milestone', content: '🎉 Just hit 10K streams on Spotify with my latest single "Neon Pulse"! MIXXEA playlist pitching is insane — 23 placements in 2 weeks. If you\'re sleeping on this platform, wake up!', likes: 47, comments: 5, likedByMe: false, createdAt: new Date(Date.now() - 2 * 3600000).toISOString() },
  { id: 'seed2', userId: 's2', authorName: 'Luna Drift',      authorRole: 'label',  type: 'tip',       content: '💡 Pro tip: Upload your release at least 3 weeks before release date. Spotify editorial pitch window closes 7 days before, so give yourself time to submit properly. This doubled our editorial placements!', likes: 31, comments: 3, likedByMe: false, createdAt: new Date(Date.now() - 5 * 3600000).toISOString() },
  { id: 'seed3', userId: 's3', authorName: 'DJ Soulfire',     authorRole: 'artist', type: 'collab',    content: 'Looking for a vocalist for a House / Afrobeats fusion project dropping this summer. Based in Lagos but open to remote. DM me if you\'re interested — let\'s build something 🔥', likes: 18, comments: 8, likedByMe: false, createdAt: new Date(Date.now() - 12 * 3600000).toISOString() },
  { id: 'seed4', userId: 's4', authorName: 'Aria Waves',      authorRole: 'artist', type: 'milestone', content: 'First TikTok UGC campaign just wrapped. 14 creators seeded my track "Glass Heart" — it hit the For You page twice! 2.1M views combined. Best investment I\'ve made for my music 🚀', likes: 62, comments: 12, likedByMe: false, pinned: true, createdAt: new Date(Date.now() - 24 * 3600000).toISOString() },
  { id: 'seed5', userId: 's5', authorName: 'ThirdEye Records', authorRole: 'label', type: 'update',    content: 'We just released 3 new artists this month through MIXXEA. The distribution pipeline is fast — tracks go live within 24 hours now. Excited for what Q2 looks like for our roster!', likes: 24, comments: 2, likedByMe: false, createdAt: new Date(Date.now() - 2 * 86400000).toISOString() },
];

function formatTime(iso: string) {
  const d = Date.now() - new Date(iso).getTime();
  const m = Math.floor(d / 60000), h = Math.floor(m / 60), days = Math.floor(h / 24);
  if (days > 0) return `${days}d ago`; if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`; return 'Just now';
}

function planBadge(plan: string) {
  const map: Record<string, { label: string; color: string }> = {
    free: { label: 'Free', color: '#6B7280' }, starter: { label: 'Starter', color: '#00C4FF' },
    growth: { label: 'Growth', color: '#7B5FFF' }, pro: { label: 'Pro', color: '#D63DF6' },
    label: { label: 'Label', color: '#F59E0B' },
  };
  return map[plan] || map.free;
}

// ── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ name, role, size = 36, onClick }: { name: string; role: string; size?: number; onClick?: () => void }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const colors: Record<string, string> = {
    artist: 'linear-gradient(135deg,#7B5FFF,#D63DF6)',
    label:  'linear-gradient(135deg,#F59E0B,#FF5252)',
    admin:  'linear-gradient(135deg,#00C4FF,#7B5FFF)',
  };
  return (
    <div onClick={onClick}
      className={`flex items-center justify-center font-bold text-white flex-shrink-0 ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
      style={{ width: size, height: size, borderRadius: size * 0.3, background: colors[role] || colors.artist, fontSize: size * 0.35 }}>
      {initials}
    </div>
  );
}

// ── Profile Card Modal ────────────────────────────────────────────────────────
function ProfileCardModal({ userId, token, onClose }: { userId: string; token: string; onClose: () => void }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId.startsWith('seed') || userId.startsWith('s')) {
      // Seed user — fake profile
      setProfile({ id: userId, name: 'Community Artist', role: 'artist', bio: 'Independent artist sharing their journey.', genre: 'Various', location: '', plan: 'growth', isAdmin: false, joinedAt: '', postCount: 3, totalLikes: 47, socialLinks: {} });
      setLoading(false); return;
    }
    api.getCommunityUserProfile(token, userId)
      .then((r: any) => setProfile(r.profile))
      .catch(() => toast.error('Could not load profile'))
      .finally(() => setLoading(false));
  }, [userId, token]);

  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}>
        <motion.div className="w-full max-w-sm rounded-3xl border overflow-hidden"
          style={{ background: '#0D0D0D', borderColor: 'rgba(255,255,255,0.1)' }}
          initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
          onClick={e => e.stopPropagation()}>
          {/* Banner */}
          <div className="h-20 relative" style={{ background: 'linear-gradient(135deg,#7B5FFF20,#D63DF620)' }}>
            <button onClick={onClose} className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center text-white/50 hover:text-white transition-colors" style={{ background: 'rgba(0,0,0,0.5)' }}>
              <X size={14} />
            </button>
          </div>

          {loading ? (
            <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-purple-400" size={28} /></div>
          ) : profile ? (
            <div className="px-5 pb-6">
              <div className="-mt-8 mb-4 flex items-end justify-between">
                <Avatar name={profile.name} role={profile.role} size={56} />
                {profile.isAdmin && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold" style={{ background: 'rgba(0,196,255,0.15)', color: '#00C4FF' }}>Admin</span>
                )}
              </div>
              <h3 className="text-white font-bold text-lg leading-tight">{profile.name}</h3>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-white/40 text-xs capitalize">{profile.role}</span>
                {profile.plan !== 'free' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: `${planBadge(profile.plan).color}20`, color: planBadge(profile.plan).color }}>
                    {planBadge(profile.plan).label}
                  </span>
                )}
              </div>
              {profile.bio && <p className="text-white/60 text-sm mt-3 leading-relaxed">{profile.bio}</p>}
              <div className="grid grid-cols-2 gap-3 mt-4">
                {profile.genre && (
                  <div className="flex items-center gap-2 text-white/50 text-xs"><Music2 size={12} />{profile.genre}</div>
                )}
                {profile.location && (
                  <div className="flex items-center gap-2 text-white/50 text-xs"><MapPin size={12} />{profile.location}</div>
                )}
                {profile.joinedAt && (
                  <div className="flex items-center gap-2 text-white/50 text-xs"><Calendar size={12} />Joined {new Date(profile.joinedAt).getFullYear()}</div>
                )}
              </div>
              <div className="flex gap-4 mt-4 pt-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                <div className="text-center">
                  <p className="text-white font-bold text-lg">{profile.postCount}</p>
                  <p className="text-white/30 text-xs">Posts</p>
                </div>
                <div className="text-center">
                  <p className="text-white font-bold text-lg">{profile.totalLikes}</p>
                  <p className="text-white/30 text-xs">Likes received</p>
                </div>
              </div>
              {Object.keys(profile.socialLinks || {}).length > 0 && (
                <div className="flex gap-2 mt-4 flex-wrap">
                  {Object.entries(profile.socialLinks).map(([platform, url]) => (
                    <a key={platform} href={url as string} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white/60 hover:text-white transition-colors"
                      style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <ExternalLink size={10} /> {platform}
                    </a>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 text-center text-white/40 text-sm">Profile not available</div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Notification Panel ────────────────────────────────────────────────────────
function NotificationPanel({ token, onClose }: { token: string; onClose: () => void }) {
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getNotifications(token)
      .then((r: any) => {
        const communityTypes = ['community_like', 'community_comment'];
        setNotifs((r.notifications || []).filter((n: Notification) => communityTypes.includes(n.type)));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const markAllRead = async () => {
    const unreadIds = notifs.filter(n => !n.read).map(n => n.id);
    if (!unreadIds.length) return;
    await api.readNotifications(token, unreadIds).catch(() => {});
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
  };

  const notifIcon = (type: string) => {
    if (type === 'community_like') return <Heart size={14} className="text-[#FF5252]" />;
    if (type === 'community_comment') return <MessageCircle size={14} style={{ color: '#00C4FF' }} />;
    return <Bell size={14} className="text-white/40" />;
  };

  return (
    <motion.div className="absolute top-full right-0 mt-2 w-80 rounded-2xl border shadow-2xl z-50 overflow-hidden"
      style={{ background: '#0D0D0D', borderColor: 'rgba(255,255,255,0.1)' }}
      initial={{ opacity: 0, y: -8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.97 }}>
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
        <span className="font-bold text-white text-sm">Community Notifications</span>
        <div className="flex items-center gap-2">
          <button onClick={markAllRead} className="text-white/30 hover:text-white/60 transition-colors" title="Mark all read">
            <CheckCheck size={14} />
          </button>
          <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors"><X size={14} /></button>
        </div>
      </div>
      <div className="max-h-80 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-purple-400" /></div>
        ) : notifs.length === 0 ? (
          <div className="py-12 text-center">
            <Bell size={28} className="text-white/10 mx-auto mb-2" />
            <p className="text-white/30 text-sm">No community notifications yet</p>
            <p className="text-white/20 text-xs mt-1">When someone likes or comments on your posts, you'll see it here.</p>
          </div>
        ) : (
          notifs.map(n => (
            <div key={n.id} className={`flex items-start gap-3 px-4 py-3 border-b transition-colors ${!n.read ? 'bg-white/[0.03]' : ''}`}
              style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: n.type === 'community_like' ? 'rgba(255,82,82,0.12)' : 'rgba(0,196,255,0.12)' }}>
                {notifIcon(n.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-xs font-semibold leading-snug">{n.title}</p>
                <p className="text-white/40 text-xs mt-0.5 leading-relaxed line-clamp-2">{n.message}</p>
                <p className="text-white/20 text-[10px] mt-1">{formatTime(n.createdAt)}</p>
              </div>
              {!n.read && <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: '#7B5FFF' }} />}
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}

// ── Comments Section ──────────────────────────────────────────────────────────
function CommentsSection({ post, token, currentUser }: { post: Post; token: string; currentUser: any }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (loaded || post.id.startsWith('seed')) { setLoaded(true); return; }
    setLoading(true);
    try {
      const r = await api.getPostComments(token, post.id) as any;
      setComments(r.comments || []);
    } catch { } finally { setLoading(false); setLoaded(true); }
  }, [post.id, token, loaded]);

  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!text.trim()) return;
    if (post.id.startsWith('seed')) { toast.info('Comments on example posts are disabled.'); return; }
    setSubmitting(true);
    try {
      const r = await api.createComment(token, post.id, text.trim()) as any;
      setComments(prev => [...prev, r.comment]);
      setText('');
    } catch (e: any) { toast.error(e.message); }
    finally { setSubmitting(false); }
  };

  const remove = async (commentId: string) => {
    if (post.id.startsWith('seed')) return;
    setComments(prev => prev.filter(c => c.id !== commentId));
    await api.deleteComment(token, commentId).catch(() => {});
  };

  return (
    <div className="border-t mt-3 pt-3" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
      {loading && <div className="flex justify-center py-2"><Loader2 size={14} className="animate-spin text-white/30" /></div>}
      {loaded && (
        <div className="space-y-2">
          {comments.length === 0 && !post.id.startsWith('seed') && (
            <p className="text-white/25 text-xs py-1">No comments yet — be the first!</p>
          )}
          {/* Seed-post placeholder comments */}
          {post.id.startsWith('seed') && (
            <p className="text-white/25 text-xs py-1 italic">Example post — sign in to comment on real posts.</p>
          )}
          <AnimatePresence initial={false}>
            {comments.map(c => (
              <motion.div key={c.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex items-start gap-2">
                <Avatar name={c.authorName} role={c.authorRole} size={26} />
                <div className="flex-1 rounded-xl px-3 py-2" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-white text-xs font-semibold">{c.authorName}</span>
                    <span className="text-white/25 text-[10px]">{formatTime(c.createdAt)}</span>
                  </div>
                  <p className="text-white/70 text-xs mt-0.5 leading-relaxed">{c.content}</p>
                </div>
                {c.userId === currentUser?.id && (
                  <button onClick={() => remove(c.id)} className="text-white/20 hover:text-red-400 transition-colors mt-1 flex-shrink-0">
                    <Trash2 size={11} />
                  </button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          {/* Input row */}
          <div className="flex items-center gap-2 mt-2">
            <Avatar name={currentUser?.name || '?'} role={currentUser?.role || 'artist'} size={26} />
            <div className="flex-1 flex items-center gap-2 rounded-xl px-3 py-1.5 border" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}>
              <input ref={inputRef} value={text} onChange={e => setText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }}
                placeholder="Write a comment…" maxLength={300}
                className="flex-1 bg-transparent text-xs text-white placeholder:text-white/25 focus:outline-none" />
              <button onClick={submit} disabled={submitting || !text.trim()}
                className="text-white/30 hover:text-white/70 disabled:opacity-30 transition-colors flex-shrink-0">
                {submitting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Post Card ─────────────────────────────────────────────────────────────────
function PostCard({ post, token, currentUser, isAdmin, onLike, onDelete, onPin, onProfileClick }: {
  post: Post; token: string; currentUser: any; isAdmin: boolean;
  onLike: (post: Post) => void; onDelete: (postId: string) => void;
  onPin: (postId: string) => void; onProfileClick: (userId: string, name: string) => void;
}) {
  const [showComments, setShowComments] = useState(false);
  const [commentCount, setCommentCount] = useState(post.comments || 0);

  return (
    <motion.div layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}
      className="rounded-2xl border p-4 transition-all hover:border-white/[0.12]"
      style={{ background: post.pinned ? 'rgba(123,95,255,0.06)' : '#0D0D0D', borderColor: post.pinned ? 'rgba(123,95,255,0.25)' : 'rgba(255,255,255,0.07)' }}>

      {/* Pinned badge */}
      {post.pinned && (
        <div className="flex items-center gap-1.5 mb-3">
          <Pin size={11} style={{ color: '#7B5FFF' }} />
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#7B5FFF' }}>Pinned by Admin</span>
        </div>
      )}

      <div className="flex items-start gap-3">
        <Avatar name={post.authorName} role={post.authorRole} size={36}
          onClick={() => onProfileClick(post.userId, post.authorName)} />
        <div className="flex-1 min-w-0">
          {/* Author row */}
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <button className="text-sm font-bold text-white hover:text-purple-300 transition-colors"
              onClick={() => onProfileClick(post.userId, post.authorName)}>
              {post.authorName}
            </button>
            <span className="text-[10px] text-white/30 capitalize">{post.authorRole}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
              style={{ color: TYPE_COLOR[post.type] || '#7B5FFF', background: (TYPE_COLOR[post.type] || '#7B5FFF') + '20' }}>
              {TYPE_ICON[post.type]} {post.type}
            </span>
            <span className="text-[10px] text-white/25 ml-auto">{formatTime(post.createdAt)}</span>
          </div>

          {/* Content */}
          <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">{post.content}</p>

          {/* Action bar */}
          <div className="flex items-center gap-4 mt-3">
            <button onClick={() => onLike(post)}
              className={`flex items-center gap-1.5 text-xs transition-all ${post.likedByMe ? 'text-[#FF5252]' : 'text-white/30 hover:text-[#FF5252]'}`}>
              <Heart size={13} className={post.likedByMe ? 'fill-current' : ''} />
              <span>{post.likes}</span>
            </button>
            <button onClick={() => setShowComments(v => !v)}
              className="flex items-center gap-1.5 text-xs text-white/30 hover:text-[#00C4FF] transition-colors">
              <MessageCircle size={13} />
              <span>{commentCount}</span>
              {showComments ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
            </button>
            <div className="ml-auto flex items-center gap-2">
              {isAdmin && (
                <button onClick={() => onPin(post.id)} title={post.pinned ? 'Unpin' : 'Pin post'}
                  className={`transition-colors ${post.pinned ? 'text-purple-400 hover:text-purple-300' : 'text-white/20 hover:text-purple-400'}`}>
                  <Pin size={12} />
                </button>
              )}
              {(post.userId === currentUser?.id || isAdmin) && !post.id.startsWith('seed') && (
                <button onClick={() => onDelete(post.id)} className="text-white/20 hover:text-[#FF5252] transition-colors">
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Comments */}
          {showComments && (
            <CommentsSection post={post} token={token} currentUser={currentUser} />
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function CommunityPage() {
  const { token, user } = useAuth();
  const [posts, setPosts]               = useState<Post[]>([]);
  const [loading, setLoading]           = useState(true);
  const [content, setContent]           = useState('');
  const [type, setType]                 = useState('update');
  const [submitting, setSubmitting]     = useState(false);
  const [filter, setFilter]             = useState('all');
  const [profileTarget, setProfileTarget] = useState<{ userId: string; name: string } | null>(null);
  const [showNotifs, setShowNotifs]     = useState(false);
  const [unreadCount, setUnreadCount]   = useState(0);
  const [refreshing, setRefreshing]     = useState(false);
  const notifRef                        = useRef<HTMLDivElement>(null);

  const isAdmin = !!(user as any)?.isAdmin;

  // Load posts
  const loadPosts = useCallback(async (silent = false) => {
    if (!token) return;
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const r = await api.getCommunityPosts(token) as any;
      const serverPosts: Post[] = r.posts || [];
      setPosts(serverPosts.length > 0 ? serverPosts : SEED_POSTS);
    } catch {
      setPosts(SEED_POSTS);
    } finally {
      if (!silent) setLoading(false); else setRefreshing(false);
    }
  }, [token]);

  // Load unread notification count
  const loadUnread = useCallback(async () => {
    if (!token) return;
    try {
      const r = await api.getNotifications(token) as any;
      const communityTypes = ['community_like', 'community_comment'];
      const count = (r.notifications || []).filter((n: Notification) => !n.read && communityTypes.includes(n.type)).length;
      setUnreadCount(count);
    } catch { }
  }, [token]);

  useEffect(() => { loadPosts(); loadUnread(); }, [loadPosts, loadUnread]);

  // Poll unread every 30s
  useEffect(() => {
    const interval = setInterval(loadUnread, 30000);
    return () => clearInterval(interval);
  }, [loadUnread]);

  // Close notif panel on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifs(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

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

  const handleLike = async (post: Post) => {
    setPosts(prev => prev.map(p => p.id === post.id ? { ...p, likes: p.likedByMe ? p.likes - 1 : p.likes + 1, likedByMe: !p.likedByMe } : p));
    if (post.id.startsWith('seed')) return;
    try { await api.likePost(token!, post.id); } catch { }
  };

  const handleDelete = async (postId: string) => {
    if (!confirm('Delete this post?')) return;
    setPosts(prev => prev.filter(p => p.id !== postId));
    if (!postId.startsWith('seed')) {
      await api.deletePost(token!, postId).catch(() => {});
    }
  };

  const handlePin = async (postId: string) => {
    try {
      const r = await api.pinCommunityPost(token!, postId) as any;
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, pinned: r.pinned } : p));
      toast.success(r.pinned ? 'Post pinned to top!' : 'Post unpinned');
    } catch (e: any) { toast.error(e.message); }
  };

  const handleNotifOpen = () => {
    setShowNotifs(v => !v);
    if (!showNotifs) {
      setUnreadCount(0);
      api.readNotifications(token!, []).catch(() => {}); // mark all community notifs read
    }
  };

  // Sort: pinned first, then newest
  const sortedPosts = [...posts].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const filtered = filter === 'all' ? sortedPosts : sortedPosts.filter(p => p.type === filter);
  const currentType = POST_TYPES.find(t => t.id === type) || POST_TYPES[0];
  const pinnedPosts  = sortedPosts.filter(p => p.pinned);

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#7B5FFF,#D63DF6)' }}>
              <Users size={18} className="text-white" />
            </div>
            <h1 className="text-2xl font-black text-white">Community</h1>
          </div>
          <p className="text-white/40 text-sm pl-12">Connect with artists, share wins, and find collaborators</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setRefreshing(true); loadPosts(true); }} disabled={refreshing}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white/30 hover:text-white/60 transition-colors disabled:opacity-40"
            style={{ background: 'rgba(255,255,255,0.05)' }}>
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          </button>
          {/* Notification Bell */}
          <div className="relative" ref={notifRef}>
            <button onClick={handleNotifOpen}
              className="relative w-9 h-9 rounded-xl flex items-center justify-center text-white/40 hover:text-white/80 transition-colors"
              style={{ background: showNotifs ? 'rgba(123,95,255,0.15)' : 'rgba(255,255,255,0.05)' }}>
              <Bell size={16} className={showNotifs ? 'text-purple-400' : ''} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4.5 h-4.5 min-w-[18px] px-1 rounded-full text-[10px] font-bold text-white flex items-center justify-center" style={{ background: '#D63DF6', fontSize: 9 }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            <AnimatePresence>
              {showNotifs && <NotificationPanel token={token!} onClose={() => setShowNotifs(false)} />}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-4 mb-5 text-xs text-white/30">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
          <span>{posts.length} posts</span>
        </div>
        {pinnedPosts.length > 0 && (
          <div className="flex items-center gap-1.5">
            <Pin size={10} style={{ color: '#7B5FFF' }} />
            <span>{pinnedPosts.length} pinned</span>
          </div>
        )}
      </div>

      {/* Compose box */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border p-4 mb-5"
        style={{ background: '#0D0D0D', borderColor: 'rgba(255,255,255,0.07)' }}>
        {/* Type selector */}
        <div className="flex gap-2 mb-3 overflow-x-auto">
          {POST_TYPES.map(t => (
            <button key={t.id} onClick={() => setType(t.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${type === t.id ? 'text-white' : 'text-white/40 bg-[#050505] border-white/[0.06] hover:text-white'}`}
              style={type === t.id ? { background: `${t.color}25`, borderColor: `${t.color}50`, color: t.color } : {}}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex gap-3">
          <Avatar name={(user as any)?.name || '?'} role={(user as any)?.role || 'artist'} size={36} />
          <div className="flex-1">
            <textarea value={content} onChange={e => setContent(e.target.value)}
              placeholder={currentType.placeholder} rows={3}
              className="w-full bg-transparent text-sm text-white placeholder:text-white/25 resize-none focus:outline-none leading-relaxed" />
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-white/25">{content.length}/500</span>
              <button onClick={handlePost} disabled={submitting || content.length < 5}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-50 transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg,#7B5FFF,#D63DF6)' }}>
                {submitting ? <><Loader2 size={11} className="animate-spin" /> Posting…</> : <><Send size={11} /> Post</>}
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto mb-5">
        {['all', 'update', 'milestone', 'tip', 'collab'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all capitalize ${filter === f ? 'text-white border-transparent' : 'text-white/40 bg-[#0D0D0D] border-white/[0.06] hover:text-white'}`}
            style={filter === f ? { background: f === 'all' ? 'linear-gradient(135deg,#7B5FFF,#D63DF6)' : `${TYPE_COLOR[f]}25`, borderColor: f === 'all' ? 'transparent' : `${TYPE_COLOR[f]}50`, color: f === 'all' ? '#fff' : TYPE_COLOR[f] } : {}}>
            {f === 'all' ? `All (${posts.length})` : POST_TYPES.find(t => t.id === f)?.label || f}
          </button>
        ))}
      </div>

      {/* Feed */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 rounded-full border-2 border-[#7B5FFF] border-t-transparent animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {filtered.length === 0 ? (
              <div className="py-20 text-center">
                <MessageCircle size={36} className="text-white/10 mx-auto mb-3" />
                <p className="text-white/40 text-sm">No {filter !== 'all' ? filter + ' ' : ''}posts yet</p>
              </div>
            ) : (
              filtered.map(post => (
                <PostCard key={post.id} post={post} token={token!} currentUser={user} isAdmin={isAdmin}
                  onLike={handleLike} onDelete={handleDelete} onPin={handlePin}
                  onProfileClick={(uid, name) => setProfileTarget({ userId: uid, name })} />
              ))
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Profile card modal */}
      <AnimatePresence>
        {profileTarget && (
          <ProfileCardModal userId={profileTarget.userId} token={token!} onClose={() => setProfileTarget(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}