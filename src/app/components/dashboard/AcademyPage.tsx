// ─────────────────────────────────────────────────────────────────────────────
//  MIXXEA — Feature 13: MIXXEA Academy (Educational Hub)
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from './AuthContext';
import * as api from './api';
import { toast } from 'sonner';
import { BookOpen, CheckCircle, Lock, Play, ChevronRight, Zap, Award, TrendingUp, Clock, Star, X } from 'lucide-react';

const TRACKS = [
  {
    id: 'distribution', title: 'Music Distribution Mastery', color: '#00C4FF', icon: '🎵', requiredPlan: 'starter',
    lessons: [
      { id: 'dist-1', title: 'How Music Distribution Works in 2025', duration: '8 min', xp: 10, content: `Music distribution is the process of delivering your recorded music to digital streaming platforms (DSPs) like Spotify, Apple Music, YouTube Music, TikTok, and 70+ others worldwide.\n\n**How it works:**\nYou upload your track + artwork → MIXXEA encodes and packages your release → We deliver to all DSPs via direct integration partnerships → Your music goes live within 24–72 hours.\n\n**Key terms:**\n- **ISRC Code** — International Standard Recording Code, unique ID for each recording\n- **UPC/EAN** — Barcode for your release as a product\n- **Metadata** — Title, artist name, genre, release date — everything DSPs display\n\n**Pro tip:** Always set your release date 2–3 weeks ahead to allow for editorial pitching windows.` },
      { id: 'dist-2', title: 'Mastering Metadata for Maximum Discoverability', duration: '12 min', xp: 15, content: `Metadata is the invisible backbone of music discovery. Incorrect or incomplete metadata can prevent your music from being found, reduce royalty payments, and even cause takedowns.\n\n**Critical metadata fields:**\n- **Primary Artist Name** — Must exactly match across all platforms\n- **Featuring Artists** — Separate from primary, affects credit splits\n- **Composer / Songwriter** — Required for publishing royalties\n- **Label Name** — Your artist name or label\n- **Genre & Sub-genre** — Determines which algorithmic playlists you appear in\n- **Language** — Affects international playlist eligibility\n\n**Common mistakes to avoid:**\n1. Inconsistent artist name capitalization\n2. Missing featuring artist credits\n3. Wrong release year (affects chart eligibility)\n4. Incorrect language tag (blocks regional editorial consideration)` },
      { id: 'dist-3', title: 'Understanding Streaming Royalties & How to Maximize Them', duration: '15 min', xp: 20, content: `Streaming royalties are calculated differently on every platform. Here's the real breakdown:\n\n**Per-stream rates (approximate 2025):**\n- Spotify: $0.003–$0.005\n- Apple Music: $0.007–$0.010\n- YouTube Music: $0.002–$0.004\n- TikTok: $0.002–$0.003 (per creation, not stream)\n- Amazon Music: $0.004–$0.007\n\n**Two types of royalties:**\n1. **Master/Sound Recording Royalties** — Paid to whoever owns the recording (you, if you're indie)\n2. **Publishing/Composition Royalties** — Paid to songwriters/composers via PROs (ASCAP, BMI, SESAC)\n\n**How to maximize:**\n- Register with a PRO (ASCAP or BMI)\n- Register every song with SoundExchange for digital radio\n- Set up publishing splits correctly before distribution\n- Use MIXXEA's publishing admin to track sync licensing opportunities` },
      { id: 'dist-4', title: 'Pre-Save Campaigns: Build Hype Before Release Day', duration: '10 min', xp: 15, content: `Pre-save campaigns collect Spotify/Apple Music saves from fans BEFORE your release date. When you release, those saves convert to instant library adds — boosting your day-1 numbers dramatically.\n\n**Why it matters:**\nSpotify's algorithm weights new release performance heavily. Strong day-1 save and stream numbers signal popularity and push your track to Discover Weekly, Release Radar, and editorial consideration.\n\n**How to run an effective pre-save:**\n1. Create your pre-save link via MIXXEA Smart Pages\n2. Start promoting 2–3 weeks before release\n3. Incentivize: "Pre-save and enter to win signed merch"\n4. Use your email list, Instagram, TikTok, and YouTube community tab\n5. Post daily countdown content the week before release\n\n**Target:** 500+ pre-saves minimum for algorithm boost. Top artists aim for 10,000+.` },
    ]
  },
  {
    id: 'promotion', title: 'Music Promotion Playbook', color: '#D63DF6', icon: '🚀', requiredPlan: 'starter',
    lessons: [
      { id: 'promo-1', title: 'The Spotify Algorithm Decoded', duration: '14 min', xp: 20, content: `Spotify's algorithm uses behavioral data to decide who hears your music. Here's what moves the needle:\n\n**The key signals Spotify tracks:**\n1. **Save rate** — % of listeners who save your track (aim: >10%)\n2. **Completion rate** — % who listen past 30 seconds (aim: >70%)\n3. **Share rate** — % who share via link or add to playlists\n4. **Skip rate** — % who skip within 5 seconds (below 10% is ideal)\n5. **Playlist adds** — Particularly important in first 48 hours\n\n**Editorial vs. Algorithmic playlists:**\n- **Editorial** (Spotify curated): Submit via Spotify for Artists, 1 song per 7 days, 2–3 weeks before release\n- **Algorithmic** (Discover Weekly, Release Radar, Daily Mix): Driven by listener behavior data — earn it through strong engagement\n- **Third-party/Independent**: Submit via MIXXEA's curator marketplace\n\n**The release week blueprint:**\nDay -14: Submit editorial pitch → Day -7: Pre-save live → Day 0: Release + push all channels → Day 1–3: Monitor skip rate, share to maximize saves` },
      { id: 'promo-2', title: 'TikTok Music Strategy: Virality Framework', duration: '18 min', xp: 25, content: `TikTok is the most powerful music discovery platform in 2025. Artists with zero prior following have gone to millions of streams via one viral TikTok moment.\n\n**The virality formula:**\nHookable clip + Perfect timing in track + Trend angle = Viral potential\n\n**Identifying your "TikTok moment" in your song:**\n- A distinctive sound effect in the first 3 seconds\n- An emotionally charged lyric that resonates broadly\n- An unexpected genre switch or bass drop\n- A lyric that maps to a relatable situation ("POV: you just…")\n\n**UGC seeding strategy:**\n1. Use MIXXEA's TikTok UGC campaign to seed 15–30 creators\n2. Let creators interpret the trend (don't over-direct)\n3. Creators in 10K–200K follower range often outperform mega-influencers for music\n4. Post your own creator content daily in the first 7 days\n5. Engage with every comment on your TikTok post within the first 2 hours\n\n**Track selection:** Use only the most hooky 15–30 seconds. Start at the best lyric/drop, not the intro.` },
      { id: 'promo-3', title: 'Playlist Pitching: The Inside Game', duration: '12 min', xp: 15, content: `Getting on playlists is the fastest path to organic streams. Here's exactly how it works:\n\n**Types of playlists to target:**\n1. **Spotify Editorial** — Hardest to get, biggest impact. Submit 1 week before release via Spotify for Artists\n2. **Independent Curator** — More accessible, faster response. Submit via MIXXEA curator directory\n3. **Algorithmic** — Earned through engagement, not submitted directly\n4. **User playlists** — Often overlooked, millions of public playlists with real followers\n\n**How to write a perfect pitch:**\n- Keep it under 150 words\n- Name the specific playlist you're targeting (curators get 200+ pitches/week)\n- Explain WHY your track fits their playlist sound\n- Include streaming links, genre, BPM, release date\n- Add one genuine compliment about their curation\n\n**Red flags that get your pitch deleted:**\n- "This is the next #1 hit" — every pitch says this\n- Mass-email style copy-paste pitches\n- Not including streaming link\n- Pitching 5+ songs in one email` },
    ]
  },
  {
    id: 'publishing', title: 'Publishing & Royalties Deep Dive', color: '#10B981', icon: '📄', requiredPlan: 'growth',
    lessons: [
      { id: 'pub-1', title: 'Music Copyright 101: Own Your Catalog', duration: '16 min', xp: 25, content: `Music copyright is foundational. Without understanding it, you're leaving money on the table and at risk of losing rights to your own work.\n\n**Two copyrights in every song:**\n1. **Sound Recording (Master)** — The specific recorded performance. Owned by whoever paid for the recording (usually the artist or label)\n2. **Musical Composition (Publishing)** — The underlying melody and lyrics. Owned by the songwriter(s)\n\n**Key rule:** You can own both if you wrote and recorded the song yourself. Many independent artists do.\n\n**Copyright registration:**\n- US Copyright Office: $45–$65 per work\n- Protection lasts 70 years after death of author\n- Registration creates legal record needed for infringement lawsuits\n\n**Split agreements:**\nWhen you collaborate, define ownership splits BEFORE recording. MIXXEA's publishing split tool lets you:\n- Set % ownership for each collaborator\n- Automate royalty distribution\n- Generate legally clear split sheets` },
      { id: 'pub-2', title: 'Sync Licensing: Get Your Music in Film & TV', duration: '20 min', xp: 30, content: `Sync licensing is placing your music in films, TV shows, ads, games, and online content. A single sync can earn $5,000–$500,000+ depending on placement.\n\n**Types of sync placements:**\n- **Major film/TV** — Highest value ($25K–$500K+), hardest to get\n- **Indie film** — $1K–$25K, more accessible for indie artists\n- **Advertising** — $5K–$250K+ depending on brand size and campaign reach\n- **YouTube/streaming content** — $100–$5K, high volume, lower per-sync\n- **Video games** — $2K–$50K per track\n\n**How to break into sync:**\n1. Create a dedicated sync-ready catalog: clean mixes, stems available, 100% rights clearance\n2. Register with a music library (Musicbed, Artlist, Pond5)\n3. Submit to music supervisors directly — research who placed music in shows you love\n4. Create "mood demo" recordings: 30-sec, 60-sec, 90-sec versions\n5. Tag your music correctly: BPM, key, mood, instrumentation, era\n\n**MIXXEA sync tools:** Track sync inquiries, manage clearances, and automate royalty splits in the Publishing admin.` },
    ]
  },
  {
    id: 'business', title: 'Music Business Essentials', color: '#FF5252', icon: '💼', requiredPlan: 'growth',
    lessons: [
      { id: 'biz-1', title: 'Building Your Artist Brand & Online Presence', duration: '14 min', xp: 20, content: `Your artist brand is how the world perceives you before they hear your music. In 2025, a strong brand multiplies the reach of every song you release.\n\n**Core brand elements:**\n1. **Artist Name** — Simple, memorable, unique (Google-able), searchable on Spotify\n2. **Visual Identity** — Consistent color palette, fonts, photo style across all platforms\n3. **Bio** — 3 versions: 1-liner (for Instagram), 100 words (for press), 400 words (for Spotify/Apple)\n4. **Signature sound** — What makes your music instantly recognizable in 5 seconds?\n\n**Platform-by-platform strategy:**\n- **Spotify**: Optimize artist page, canvas videos, editorial playlists, bio\n- **Instagram**: Behind-the-scenes content, Reels for discovery, Stories for engagement\n- **TikTok**: Trend participation + original content, 1–3 posts/day during release week\n- **YouTube**: Long-form content (music videos, vlogs, studio sessions) — highest watch time = highest revenue\n- **X/Twitter**: Industry networking, music conversation, press links\n\n**Smart Link pages (MIXXEA feature):** One URL that routes fans to their preferred platform — essential for all marketing.` },
      { id: 'biz-2', title: 'Touring & Live Income: The Ultimate Revenue Stack', duration: '22 min', xp: 35, content: `Streaming alone won't pay the bills for most independent artists. Building multiple revenue streams is the sustainable path.\n\n**The 7 revenue streams for independent artists:**\n1. **Streaming royalties** — $0.003–$0.010 per stream\n2. **Publishing/sync royalties** — Often 10x more valuable than master royalties\n3. **Live performance** — Your highest per-hour earning potential\n4. **Merchandise** — 50–70% margin on apparel, prints, vinyl\n5. **Direct fan support** — Bandcamp, Patreon, Ko-fi\n6. **Brand partnerships** — Sponsored posts, brand ambassador deals\n7. **Music production/teaching** — Beat sales, production credits, lessons\n\n**Touring basics for indie artists:**\n- Start with support slots (opening for bigger acts)\n- Target 3–5 city regional run first\n- Break-even calculator: (Venue guarantee + merch estimate) must exceed (travel + accommodation + production costs)\n- PRO registration is critical for live shows — you earn performance royalties every time your songs are performed live\n\n**Revenue stack target:** Aim for no single stream exceeding 40% of total income — diversification is financial safety.` },
    ]
  },
];

export function AcademyPage() {
  const { token } = useAuth();
  const [progress, setProgress] = useState<any>({ completed: [], xp: 0, streak: 0 });
  const [openTrack, setOpenTrack] = useState<string | null>('distribution');
  const [activeLesson, setActiveLesson] = useState<any>(null);

  useEffect(() => {
    if (!token) return;
    api.getAcademyProgress(token).then((r: any) => setProgress(r.progress || { completed: [], xp: 0 })).catch(() => {});
  }, [token]);

  const completeLesson = async (lesson: any) => {
    if (progress.completed.includes(lesson.id)) return;
    try {
      const r = await api.completeLesson(token!, lesson.id, lesson.xp) as any;
      setProgress(r.progress);
      toast.success(`+${lesson.xp} XP! Lesson completed 🎉`);
    } catch { }
  };

  const totalLessons = TRACKS.reduce((s, t) => s + t.lessons.length, 0);
  const completedCount = progress.completed?.length || 0;
  const progressPct = Math.round((completedCount / totalLessons) * 100);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white mb-1">MIXXEA Academy</h1>
        <p className="text-white/40 text-sm">Master the music business — free guides for every stage of your career</p>
      </div>

      {/* XP + Progress */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total XP', value: progress.xp || 0, icon: Zap, color: '#F59E0B' },
          { label: 'Completed', value: `${completedCount}/${totalLessons}`, icon: CheckCircle, color: '#10B981' },
          { label: 'Progress', value: `${progressPct}%`, icon: TrendingUp, color: '#7B5FFF' },
          { label: 'Day Streak', value: progress.streak || 0, icon: Star, color: '#D63DF6' },
        ].map(s => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="bg-[#0D0D0D] border border-white/[0.07] rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-white/40">{s.label}</span>
              <s.icon size={14} style={{ color: s.color }} />
            </div>
            <div className="text-xl font-black text-white">{s.value}</div>
          </motion.div>
        ))}
      </div>

      {/* Overall progress bar */}
      <div className="bg-[#0D0D0D] border border-white/[0.07] rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-white">Overall Progress</span>
          <span className="text-sm font-bold text-[#7B5FFF]">{progressPct}%</span>
        </div>
        <div className="h-2 bg-white/[0.05] rounded-full overflow-hidden">
          <motion.div initial={{ width: 0 }} animate={{ width: `${progressPct}%` }} transition={{ duration: 1 }}
            className="h-full rounded-full" style={{ background: 'linear-gradient(90deg,#7B5FFF,#D63DF6)' }} />
        </div>
      </div>

      {/* Tracks */}
      <div className="space-y-3">
        {TRACKS.map(track => {
          const trackCompleted = track.lessons.filter(l => progress.completed?.includes(l.id)).length;
          const isOpen = openTrack === track.id;
          return (
            <div key={track.id} className="bg-[#0D0D0D] border border-white/[0.07] rounded-2xl overflow-hidden">
              <button onClick={() => setOpenTrack(isOpen ? null : track.id)}
                className="w-full flex items-center gap-4 p-5 hover:bg-white/[0.02] transition-colors text-left">
                <div className="text-2xl flex-shrink-0">{track.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-white mb-1">{track.title}</div>
                  <div className="flex items-center gap-3 text-xs text-white/40">
                    <span>{track.lessons.length} lessons</span>
                    <span>·</span>
                    <span style={{ color: track.color }}>{trackCompleted}/{track.lessons.length} completed</span>
                  </div>
                  <div className="mt-2 h-1 bg-white/[0.05] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${track.lessons.length > 0 ? (trackCompleted / track.lessons.length) * 100 : 0}%`, backgroundColor: track.color }} />
                  </div>
                </div>
                <ChevronRight size={14} className={`text-white/30 flex-shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
              </button>

              <AnimatePresence>
                {isOpen && (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                    className="overflow-hidden border-t border-white/[0.05]">
                    <div className="p-3 space-y-1">
                      {track.lessons.map((lesson, i) => {
                        const isCompleted = progress.completed?.includes(lesson.id);
                        return (
                          <button key={lesson.id} onClick={() => setActiveLesson({ ...lesson, trackColor: track.color })}
                            className="w-full flex items-center gap-3 p-3.5 rounded-xl hover:bg-white/[0.03] transition-all text-left">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={isCompleted ? { background: `${track.color}25`, color: track.color } : { background: '#1a1a1a', color: '#555' }}>
                              {isCompleted ? <CheckCircle size={15} /> : <Play size={13} />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className={`text-sm font-semibold ${isCompleted ? 'text-white/60 line-through' : 'text-white'}`}>{lesson.title}</div>
                              <div className="flex items-center gap-2 text-[11px] text-white/30 mt-0.5">
                                <Clock size={10} /> {lesson.duration}
                                <span className="font-semibold" style={{ color: track.color }}>+{lesson.xp} XP</span>
                              </div>
                            </div>
                            <ChevronRight size={12} className="text-white/20 flex-shrink-0" />
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Lesson Modal */}
      <AnimatePresence>
        {activeLesson && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-50 flex items-start justify-center p-4 overflow-y-auto">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="bg-[#0D0D0D] border border-white/[0.1] rounded-2xl w-full max-w-2xl my-8">
              <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                      style={{ color: activeLesson.trackColor, background: `${activeLesson.trackColor}20` }}>
                      +{activeLesson.xp} XP
                    </span>
                    <Clock size={11} className="text-white/30" />
                    <span className="text-xs text-white/30">{activeLesson.duration}</span>
                  </div>
                  <h3 className="text-base font-black text-white leading-snug">{activeLesson.title}</h3>
                </div>
                <button onClick={() => setActiveLesson(null)} className="text-white/30 hover:text-white ml-4 flex-shrink-0"><X size={18} /></button>
              </div>
              <div className="p-5">
                <div className="prose prose-invert max-w-none">
                  {activeLesson.content.split('\n\n').map((block: string, i: number) => {
                    if (block.startsWith('**') && block.endsWith('**') && !block.slice(2).includes('**')) {
                      return <h3 key={i} className="text-sm font-black text-white mt-5 mb-2 first:mt-0">{block.slice(2, -2)}</h3>;
                    }
                    return (
                      <p key={i} className="text-sm text-white/70 leading-relaxed mb-3" dangerouslySetInnerHTML={{
                        __html: block.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
                      }} />
                    );
                  })}
                </div>
              </div>
              <div className="p-5 border-t border-white/[0.06]">
                {progress.completed?.includes(activeLesson.id) ? (
                  <div className="flex items-center gap-2 text-[#10B981] text-sm font-semibold">
                    <CheckCircle size={15} /> Lesson completed
                  </div>
                ) : (
                  <button onClick={() => { completeLesson(activeLesson); setActiveLesson(null); }}
                    className="w-full py-3 rounded-xl text-sm font-bold text-white"
                    style={{ background: `linear-gradient(135deg,${activeLesson.trackColor},${activeLesson.trackColor}aa)` }}>
                    Mark Complete (+{activeLesson.xp} XP)
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
