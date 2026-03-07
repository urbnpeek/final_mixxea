// ─────────────────────────────────────────────────────────────────────────────
//  MIXXEA — Public Blog Post (/blog/:slug)
//  Renders a published SEO article with full structured data
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router';
import { motion } from 'motion/react';
import { useSEO } from '../seo/useSEO';
import * as api from '../dashboard/api';
import {
  Clock, ArrowLeft, Tag, Share2, Copy, Check,
  ChevronRight, ExternalLink, HelpCircle, BookOpen,
  TrendingUp, Zap,
} from 'lucide-react';

const SITE_URL = 'https://www.mixxea.com';

function formatDate(iso: string) {
  try { return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }); }
  catch { return iso; }
}

function readTime(words: number) {
  const mins = Math.max(1, Math.round(words / 200));
  return `${mins} min read`;
}

// Inject Article + FAQ JSON-LD schema into <head>
function injectArticleSchema(post: any) {
  const schema: any = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.metaDescription,
    author: { '@type': 'Organization', name: 'MIXXEA', url: SITE_URL },
    publisher: {
      '@type': 'Organization',
      name: 'MIXXEA',
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/logo.png` },
    },
    datePublished: post.publishedAt,
    dateModified: post.updatedAt || post.publishedAt,
    url: `${SITE_URL}/blog/${post.slug}`,
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${SITE_URL}/blog/${post.slug}` },
  };
  let el = document.getElementById('ld-article') as HTMLScriptElement | null;
  if (!el) { el = document.createElement('script'); el.id = 'ld-article'; el.type = 'application/ld+json'; document.head.appendChild(el); }
  el.textContent = JSON.stringify(schema);

  if (post.faqSchema?.length) {
    const faq = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: post.faqSchema.map((f: any) => ({
        '@type': 'Question',
        name: f.question,
        acceptedAnswer: { '@type': 'Answer', text: f.answer },
      })),
    };
    let faqEl = document.getElementById('ld-blog-faq') as HTMLScriptElement | null;
    if (!faqEl) { faqEl = document.createElement('script'); faqEl.id = 'ld-blog-faq'; faqEl.type = 'application/ld+json'; document.head.appendChild(faqEl); }
    faqEl.textContent = JSON.stringify(faq);
  }
}

function removeArticleSchemas() {
  document.getElementById('ld-article')?.remove();
  document.getElementById('ld-blog-faq')?.remove();
}

export function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Apply SEO meta — use post data when loaded, sensible fallback while loading
  useSEO({
    title: post?.metaTitle || 'MIXXEA Blog — Music Industry Guides',
    description: post?.metaDescription || 'Expert guides for independent artists and labels on music distribution, promotion, and publishing.',
    keywords: post ? [post.targetKeyword, ...(post.secondaryKeywords || [])].filter(Boolean) : [],
    canonical: `${SITE_URL}/blog/${slug}`,
  });

  useEffect(() => {
    if (!slug) return;
    api.blogGetPost(slug)
      .then((res: any) => {
        setPost(res.post);
        injectArticleSchema(res.post);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
    return () => removeArticleSchemas();
  }, [slug]);

  const copyLink = () => {
    navigator.clipboard.writeText(`${SITE_URL}/blog/${slug}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-10 h-10 rounded-full border-2 border-[#7B5FFF] border-t-transparent animate-spin" />
    </div>
  );

  if (notFound || !post) return <NotFoundState slug={slug!} />;

  return (
    <div className="min-h-screen bg-black text-white">

      {/* ── Nav ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06] backdrop-blur-xl"
        style={{ background: 'rgba(0,0,0,0.85)' }}>
        <div className="max-w-7xl mx-auto px-5 py-4 flex items-center justify-between">
          <Link to="/" className="text-xl font-black tracking-tighter"
            style={{ background: 'linear-gradient(135deg,#00C4FF,#7B5FFF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            MIXXEA
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/blog" className="text-sm text-white/60 hover:text-white flex items-center gap-1.5 transition-colors">
              <ArrowLeft size={13} /> Blog
            </Link>
            <Link to="/auth" className="px-4 py-2 rounded-xl text-sm font-bold text-white"
              style={{ background: 'linear-gradient(135deg,#7B5FFF,#D63DF6)' }}>
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Article ── */}
      <main className="pt-28 pb-24 px-5">
        <div className="max-w-3xl mx-auto">

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-white/30 mb-8">
            <Link to="/" className="hover:text-white transition-colors">Home</Link>
            <ChevronRight size={11} />
            <Link to="/blog" className="hover:text-white transition-colors">Blog</Link>
            <ChevronRight size={11} />
            <span className="text-white/50 truncate max-w-[200px]">{post.title}</span>
          </div>

          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <span className="text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest text-[#7B5FFF] bg-[#7B5FFF]/15">
                {post.category}
              </span>
              <span className="flex items-center gap-1.5 text-xs text-white/30">
                <Clock size={11} /> {readTime(post.wordCount)}
              </span>
              <span className="text-xs text-white/30">{formatDate(post.publishedAt)}</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-white leading-tight mb-5 tracking-tighter">
              {post.h1 || post.title}
            </h1>

            {/* Featured snippet / intro */}
            {(post.featuredSnippet || post.intro) && (
              <div className="p-5 rounded-2xl border border-[#10B981]/25 mb-8"
                style={{ background: 'rgba(16,185,129,0.06)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp size={12} className="text-[#10B981]" />
                  <span className="text-[10px] font-bold text-[#10B981] uppercase tracking-widest">Key Takeaway</span>
                </div>
                <p className="text-sm text-white/80 leading-relaxed">
                  {post.featuredSnippet || post.intro}
                </p>
              </div>
            )}

            {/* Keywords / tags */}
            {post.targetKeyword && (
              <div className="flex items-center gap-2 flex-wrap mb-8">
                <Tag size={11} className="text-white/20" />
                <span className="text-[11px] px-2.5 py-1 bg-[#00C4FF]/10 text-[#00C4FF] rounded-full">{post.targetKeyword}</span>
                {(post.secondaryKeywords || []).slice(0, 4).map((kw: string) => (
                  <span key={kw} className="text-[11px] px-2.5 py-1 bg-white/[0.04] text-white/40 rounded-full">{kw}</span>
                ))}
              </div>
            )}

            {/* Share */}
            <div className="flex items-center gap-2 mb-10 pb-8 border-b border-white/[0.06]">
              <button onClick={copyLink}
                className="flex items-center gap-2 px-4 py-2 bg-[#0D0D0D] border border-white/[0.07] rounded-xl text-xs text-white/60 hover:text-white hover:border-white/[0.15] transition-all">
                {copied ? <><Check size={12} className="text-[#10B981]" /> Copied!</> : <><Copy size={12} /> Copy link</>}
              </button>
              <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(`${SITE_URL}/blog/${slug}`)}&via=mixxea`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-[#0D0D0D] border border-white/[0.07] rounded-xl text-xs text-white/60 hover:text-white transition-all">
                <Share2 size={12} /> Share on X
              </a>
            </div>
          </motion.div>

          {/* Article content — H2 sections */}
          {post.h2s?.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
              className="space-y-8 mb-12">
              <h2 className="text-xs font-bold text-white/30 uppercase tracking-widest mb-4">Article Outline</h2>
              {post.h2s.map((h2: string, i: number) => (
                <div key={i} className="pl-4 border-l-2 border-[#7B5FFF]/30">
                  <h2 className="text-xl font-bold text-white mb-2">{h2}</h2>
                  <p className="text-sm text-white/50 leading-relaxed">
                    This section covers {h2.toLowerCase()} — essential knowledge for independent artists and music labels looking to grow their careers.
                  </p>
                </div>
              ))}
            </motion.div>
          )}

          {/* Full Outline (Markdown) */}
          {post.fullOutlineMarkdown && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
              className="mb-12">
              <div className="bg-[#070707] border border-white/[0.07] rounded-2xl overflow-hidden">
                <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center gap-2">
                  <BookOpen size={13} className="text-[#7B5FFF]" />
                  <span className="text-xs font-semibold text-white/50">Full Article Structure</span>
                  <span className="ml-auto text-[10px] text-white/20">{post.wordCount?.toLocaleString()} words</span>
                </div>
                <div className="p-5">
                  {post.fullOutlineMarkdown.split('\n').map((line: string, i: number) => {
                    if (line.startsWith('# ')) return <h1 key={i} className="text-xl font-black text-white mt-6 mb-3">{line.slice(2)}</h1>;
                    if (line.startsWith('## ')) return <h2 key={i} className="text-lg font-bold text-[#D63DF6] mt-5 mb-2">{line.slice(3)}</h2>;
                    if (line.startsWith('### ')) return <h3 key={i} className="text-base font-semibold text-[#7B5FFF] mt-4 mb-1.5 pl-4">{line.slice(4)}</h3>;
                    if (line.startsWith('- ')) return <li key={i} className="text-sm text-white/60 pl-6 mb-1 list-disc list-inside">{line.slice(2)}</li>;
                    if (line.trim() === '') return <div key={i} className="h-2" />;
                    return <p key={i} className="text-sm text-white/60 leading-relaxed mb-2">{line}</p>;
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* FAQ Section */}
          {post.faqSchema?.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}
              className="mb-12">
              <div className="flex items-center gap-2 mb-5">
                <HelpCircle size={16} className="text-[#D63DF6]" />
                <h2 className="text-xl font-black text-white">Frequently Asked Questions</h2>
              </div>
              <div className="space-y-3">
                {post.faqSchema.map((faq: any, i: number) => (
                  <div key={i} className="bg-[#0D0D0D] border border-white/[0.07] rounded-2xl overflow-hidden">
                    <button
                      onClick={() => setOpenFaq(openFaq === i ? null : i)}
                      className="w-full flex items-start justify-between gap-4 p-5 text-left hover:bg-white/[0.02] transition-colors">
                      <span className="text-sm font-semibold text-white leading-snug">{faq.question}</span>
                      <span className={`text-[#7B5FFF] flex-shrink-0 transition-transform ${openFaq === i ? 'rotate-180' : ''}`}>
                        <ChevronRight size={16} className="rotate-90" />
                      </span>
                    </button>
                    {openFaq === i && (
                      <div className="px-5 pb-5 border-t border-white/[0.05]">
                        <p className="text-sm text-white/60 leading-relaxed pt-4">{faq.answer}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Internal links */}
          {post.internalLinks?.length > 0 && (
            <div className="mb-12">
              <h3 className="text-xs font-bold text-white/30 uppercase tracking-widest mb-4">Related Resources</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {post.internalLinks.map((link: any) => (
                  <Link key={link.anchor || link.url} to={link.url || link.page || '/'}
                    className="flex items-center gap-3 p-4 bg-[#0D0D0D] border border-white/[0.07] rounded-xl hover:border-[#7B5FFF]/40 transition-all group">
                    <ExternalLink size={13} className="text-[#7B5FFF] flex-shrink-0" />
                    <span className="text-sm text-white/70 group-hover:text-white transition-colors">{link.anchor}</span>
                    <ChevronRight size={12} className="text-white/20 ml-auto group-hover:text-[#7B5FFF] transition-colors" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* CTA */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="rounded-3xl p-8 text-center"
            style={{ background: 'linear-gradient(135deg,rgba(0,196,255,0.08),rgba(123,95,255,0.10),rgba(214,61,246,0.08))', border: '1px solid rgba(123,95,255,0.2)' }}>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: 'linear-gradient(135deg,#7B5FFF,#D63DF6)' }}>
              <Zap size={20} className="text-white" />
            </div>
            <h3 className="text-2xl font-black text-white mb-2">Ready to Grow Your Music?</h3>
            <p className="text-white/50 text-sm mb-6 max-w-md mx-auto">
              Distribute to 70+ platforms, launch Spotify & TikTok campaigns, pitch playlists, and manage your publishing — all from one dashboard.
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Link to="/auth" className="px-6 py-3 rounded-xl text-sm font-bold text-white"
                style={{ background: 'linear-gradient(135deg,#7B5FFF,#D63DF6)' }}>
                Start Free Today
              </Link>
              <Link to="/blog" className="px-6 py-3 rounded-xl text-sm font-semibold text-white/60 bg-[#0D0D0D] border border-white/[0.07] hover:text-white transition-colors">
                More Articles
              </Link>
            </div>
          </motion.div>

        </div>
      </main>
    </div>
  );
}

// ── 404 ───────────────────────────────────────────────────────────────────────
function NotFoundState({ slug }: { slug: string }) {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-5">
      <div className="text-center max-w-lg">
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6"
          style={{ background: 'linear-gradient(135deg,rgba(255,82,82,0.15),rgba(123,95,255,0.1))' }}>
          <BookOpen size={32} className="text-white/20" />
        </div>
        <h1 className="text-3xl font-black text-white mb-3">Article Not Found</h1>
        <p className="text-white/40 text-sm mb-6">The article <code className="text-[#7B5FFF]">/blog/{slug}</code> doesn't exist or hasn't been published yet.</p>
        <div className="flex items-center justify-center gap-3">
          <Link to="/blog" className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg,#7B5FFF,#D63DF6)' }}>
            <ArrowLeft size={13} /> Back to Blog
          </Link>
          <Link to="/" className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white/60 bg-[#0D0D0D] border border-white/[0.07] hover:text-white transition-colors">
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
