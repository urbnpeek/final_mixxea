// MIXXEA - Public Blog Index (/blog)
import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { motion } from 'motion/react';
import { useSEOPage } from '../seo/useSEO';
import * as api from '../dashboard/api';
import { BookOpen, Clock, ArrowRight, Search, Tag, ChevronRight, Zap } from 'lucide-react';

const CATEGORIES = [
  'All',
  'Music Distribution',
  'Spotify Growth',
  'TikTok & Social Promotion',
  'Publishing & Royalties',
  'Music Marketing Agency',
  'Playlist Pitching',
  'Independent Artist Business',
];

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  } catch {
    return iso;
  }
}

function readTime(words: number) {
  const mins = Math.max(1, Math.round(words / 200));
  return `${mins} min read`;
}

export function BlogIndex() {
  useSEOPage({
    title: 'Music Industry Blog - MIXXEA | Distribution, Promotion & Publishing Guides',
    description:
      'Expert guides for independent artists and labels. Learn music distribution, Spotify growth, TikTok promotion, playlist pitching, publishing administration, and more.',
    keywords: [
      'music industry blog',
      'music distribution guide',
      'spotify growth tips',
      'music marketing blog',
      'independent artist tips',
      'playlist pitching guide',
    ],
    canonical: 'https://www.mixxea.com/blog',
  });

  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');

  useEffect(() => {
    api
      .blogGetPosts()
      .then((res: any) => setPosts(res.posts || []))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = posts.filter((p) => {
    const matchCat = category === 'All' || p.category === category;
    const matchQ =
      !search ||
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.targetKeyword?.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchQ;
  });

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Nav */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06] backdrop-blur-xl"
        style={{ background: 'rgba(0,0,0,0.85)' }}
      >
        <div className="max-w-7xl mx-auto px-5 py-4 flex items-center justify-between">
          <Link
            to="/"
            className="text-xl font-black tracking-tighter"
            style={{
              background: 'linear-gradient(135deg,#00C4FF,#7B5FFF)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            MIXXEA
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/blog" className="text-sm font-semibold text-white">
              Blog
            </Link>
            <Link
              to="/auth"
              className="px-4 py-2 rounded-xl text-sm font-bold text-white"
              style={{ background: 'linear-gradient(135deg,#7B5FFF,#D63DF6)' }}
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="pt-32 pb-16 px-5">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#7B5FFF]/30 bg-[#7B5FFF]/10 mb-6">
            <BookOpen size={13} className="text-[#7B5FFF]" />
            <span className="text-xs font-semibold text-[#7B5FFF] uppercase tracking-widest">
              Music Industry Blog
            </span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tighter mb-4 leading-none">
            Grow Your Music Career
          </h1>
          <p className="text-white/50 text-lg max-w-xl mx-auto mb-10">
            Expert guides on distribution, promotion, playlist pitching, publishing admin, and
            everything else you need to build a sustainable music business.
          </p>
          <div className="relative max-w-lg mx-auto">
            <Search
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search articles..."
              className="w-full pl-11 pr-4 py-3.5 bg-[#0D0D0D] border border-white/[0.08] rounded-2xl text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#7B5FFF]/50"
            />
          </div>
        </div>
      </div>

      {/* Category filter */}
      <div className="px-5 mb-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-semibold transition-all border ${
                  category === cat
                    ? 'text-white border-transparent'
                    : 'border-white/[0.07] text-white/50 hover:text-white bg-[#0D0D0D]'
                }`}
                style={
                  category === cat
                    ? { background: 'linear-gradient(135deg,#7B5FFF,#D63DF6)', borderColor: 'transparent' }
                    : {}
                }
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-5 pb-24 max-w-7xl mx-auto">
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="w-10 h-10 rounded-full border-2 border-[#7B5FFF] border-t-transparent animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState search={search} category={category} totalPosts={posts.length} />
        ) : (
          <>
            {filtered.length > 0 && !search && category === 'All' && (
              <FeaturedPost post={filtered[0]} />
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-8">
              {(search || category !== 'All' ? filtered : filtered.slice(1)).map((post, i) => (
                <PostCard key={post.slug} post={post} index={i} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-white/[0.05] px-5 py-10">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-white/30">2026 MIXXEA. All rights reserved.</div>
          <div className="flex items-center gap-6 text-sm text-white/30">
            <Link to="/" className="hover:text-white transition-colors">
              Platform
            </Link>
            <Link to="/auth" className="hover:text-white transition-colors">
              Sign Up
            </Link>
            <a href="mailto:onboarding@mixxea.com" className="hover:text-white transition-colors">
              Contact
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeaturedPost({ post }: { post: any }) {
  return (
    <Link to={`/blog/${post.slug}`} className="group block">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border border-white/[0.08] p-8 md:p-10"
        style={{
          background:
            'linear-gradient(135deg,rgba(0,196,255,0.06),rgba(123,95,255,0.08),rgba(214,61,246,0.06))',
        }}
      >
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{
            background:
              'linear-gradient(135deg,rgba(0,196,255,0.04),rgba(123,95,255,0.06),rgba(214,61,246,0.04))',
          }}
        />
        <div className="relative">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-[10px] font-black text-[#7B5FFF] bg-[#7B5FFF]/15 px-3 py-1.5 rounded-full uppercase tracking-widest">
              Featured
            </span>
            <span className="text-[10px] text-white/30 uppercase tracking-wider">
              {post.category}
            </span>
          </div>
          <h2 className="text-2xl md:text-4xl font-black text-white mb-4 leading-tight">
            {post.title}
          </h2>
          <p className="text-white/50 text-base mb-6 max-w-2xl leading-relaxed line-clamp-2">
            {post.metaDescription}
          </p>
          <div className="flex items-center gap-4 text-xs text-white/30">
            <span className="flex items-center gap-1.5">
              <Clock size={11} /> {readTime(post.wordCount)}
            </span>
            <span className="flex items-center gap-1.5">
              <Tag size={11} /> {post.targetKeyword}
            </span>
            <span>{formatDate(post.publishedAt)}</span>
            <span className="ml-auto flex items-center gap-1.5 text-[#7B5FFF] font-semibold group-hover:gap-3 transition-all">
              Read article <ArrowRight size={13} />
            </span>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

function PostCard({ post, index }: { post: any; index: number }) {
  const categoryColor = (cat: string) => {
    if (cat?.includes('Distribution')) return '#00C4FF';
    if (cat?.includes('Spotify')) return '#1DB954';
    if (cat?.includes('TikTok')) return '#FF0050';
    if (cat?.includes('Publishing')) return '#D63DF6';
    if (cat?.includes('Marketing') || cat?.includes('Agency')) return '#FF5252';
    if (cat?.includes('Playlist')) return '#7B5FFF';
    return '#F59E0B';
  };

  return (
    <Link to={`/blog/${post.slug}`} className="group block">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        className="h-full bg-[#0D0D0D] border border-white/[0.07] rounded-2xl p-5 flex flex-col hover:border-white/[0.15] transition-all duration-300 hover:-translate-y-0.5"
      >
        <div className="flex items-center justify-between mb-4">
          <span
            className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider"
            style={{
              color: categoryColor(post.category),
              background: `${categoryColor(post.category)}15`,
            }}
          >
            {post.category || 'Music Industry'}
          </span>
          <span className="text-[10px] text-white/25">{formatDate(post.publishedAt)}</span>
        </div>
        <h3 className="text-sm font-bold text-white leading-snug mb-3 group-hover:text-[#00C4FF] transition-colors line-clamp-3 flex-1">
          {post.title}
        </h3>
        <p className="text-xs text-white/40 leading-relaxed mb-4 line-clamp-2">
          {post.metaDescription}
        </p>
        <div className="flex items-center justify-between pt-3 border-t border-white/[0.05]">
          <div className="flex items-center gap-3 text-[10px] text-white/30">
            <span className="flex items-center gap-1">
              <Clock size={10} /> {readTime(post.wordCount)}
            </span>
          </div>
          <span className="flex items-center gap-1 text-[10px] font-semibold text-[#7B5FFF] group-hover:gap-2 transition-all">
            Read <ChevronRight size={11} />
          </span>
        </div>
      </motion.div>
    </Link>
  );
}

function EmptyState({
  search,
  category,
  totalPosts,
}: {
  search: string;
  category: string;
  totalPosts: number;
}) {
  if (totalPosts === 0) {
    return (
      <div className="text-center py-32 px-4">
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6"
          style={{
            background: 'linear-gradient(135deg,rgba(0,196,255,0.1),rgba(123,95,255,0.1))',
          }}
        >
          <BookOpen size={32} className="text-white/20" />
        </div>
        <h3 className="text-2xl font-black text-white mb-3">Articles Coming Soon</h3>
        <p className="text-white/40 max-w-md mx-auto mb-6 text-sm leading-relaxed">
          Our team is crafting in-depth guides for independent artists and labels. Check back soon,
          or sign up to get notified when new articles drop.
        </p>
        <Link
          to="/auth"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white"
          style={{ background: 'linear-gradient(135deg,#7B5FFF,#D63DF6)' }}
        >
          <Zap size={14} /> Get Started Free
        </Link>
      </div>
    );
  }
  return (
    <div className="text-center py-20">
      <p className="text-white/40 text-sm">
        No articles found for "{search || category}".
      </p>
    </div>
  );
}
