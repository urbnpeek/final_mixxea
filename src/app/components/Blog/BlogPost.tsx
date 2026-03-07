// MIXXEA - Public Blog Post (/blog/:slug)
import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router';
import { motion } from 'motion/react';
import { useSEO } from '../seo/useSEO';
import * as api from '../dashboard/api';
import {
  Clock,
  ArrowLeft,
  Tag,
  Copy,
  Check,
  ChevronRight,
  ExternalLink,
  BookOpen,
  Zap,
} from 'lucide-react';

const SITE_URL = 'https://www.mixxea.com';

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

function readTime(words: number) {
  const mins = Math.max(1, Math.round(words / 200));
  return `${mins} min read`;
}

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
  if (!el) {
    el = document.createElement('script');
    el.id = 'ld-article';
    el.type = 'application/ld+json';
    document.head.appendChild(el);
  }
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
    if (!faqEl) {
      faqEl = document.createElement('script');
      faqEl.id = 'ld-blog-faq';
      faqEl.type = 'application/ld+json';
      document.head.appendChild(faqEl);
    }
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

  useSEO({
    title: post?.metaTitle || 'MIXXEA Blog - Music Industry Guides',
    description:
      post?.metaDescription ||
      'Expert guides for independent artists and labels on music distribution, promotion, and publishing.',
    keywords: post ? [post.targetKeyword, ...(post.secondaryKeywords || [])].filter(Boolean) : [],
    canonical: `${SITE_URL}/blog/${slug}`,
  });

  useEffect(() => {
    if (!slug) return;
    api
      .blogGetPost(slug)
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

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-[#7B5FFF] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (notFound || !post) return <NotFoundState slug={slug!} />;

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
            <Link
              to="/blog"
              className="text-sm text-white/60 hover:text-white flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft size={13} /> Blog
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

      {/* Article */}
      <main className="pt-28 pb-24 px-5">
        <div className="max-w-3xl mx-auto">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-white/30 mb-8">
            <Link to="/" className="hover:text-white transition-colors">
              Home
            </Link>
            <ChevronRight size={10} />
            <Link to="/blog" className="hover:text-white transition-colors">
              Blog
            </Link>
            <ChevronRight size={10} />
            <span className="text-white/50 truncate max-w-[200px]">{post.title}</span>
          </div>

          {/* Category + meta */}
          <div className="flex items-center gap-3 mb-5">
            <span
              className="text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-widest"
              style={{ color: '#7B5FFF', background: 'rgba(123,95,255,0.12)' }}
            >
              {post.category || 'Music Industry'}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-white/30">
              <Clock size={11} /> {readTime(post.wordCount)}
            </span>
            <span className="text-xs text-white/30">{formatDate(post.publishedAt)}</span>
          </div>

          {/* Title */}
          <h1 className="text-3xl sm:text-5xl font-black text-white leading-tight mb-5">
            {post.title}
          </h1>

          {/* Description */}
          <p className="text-white/50 text-lg leading-relaxed mb-8">{post.metaDescription}</p>

          {/* Target keyword pill */}
          {post.targetKeyword && (
            <div className="flex items-center gap-2 mb-10">
              <Tag size={12} className="text-white/20" />
              <span className="text-xs text-white/30">{post.targetKeyword}</span>
            </div>
          )}

          {/* Divider */}
          <div
            className="h-px w-full mb-10"
            style={{
              background: 'linear-gradient(90deg,#7B5FFF30,#D63DF620,transparent)',
            }}
          />

          {/* Body content */}
          {post.body && (
            <div
              className="prose prose-invert prose-sm max-w-none mb-12"
              style={{ color: 'rgba(255,255,255,0.75)', lineHeight: '1.85' }}
              dangerouslySetInnerHTML={{ __html: post.body }}
            />
          )}

          {/* FAQ */}
          {post.faqSchema?.length > 0 && (
            <div className="mb-12">
              <h2 className="text-xl font-black text-white mb-5">Frequently Asked Questions</h2>
              <div className="space-y-3">
                {post.faqSchema.map((faq: any, i: number) => (
                  <div
                    key={i}
                    className="border border-white/[0.07] rounded-2xl overflow-hidden"
                  >
                    <button
                      onClick={() => setOpenFaq(openFaq === i ? null : i)}
                      className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/[0.02] transition-colors"
                    >
                      <span className="text-sm font-semibold text-white pr-4">{faq.question}</span>
                      <ChevronRight
                        size={14}
                        className={`flex-shrink-0 text-[#7B5FFF] transition-transform ${openFaq === i ? 'rotate-90' : ''}`}
                      />
                    </button>
                    {openFaq === i && (
                      <div className="px-5 pb-4 text-sm text-white/50 leading-relaxed">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Internal links */}
          {post.internalLinks?.length > 0 && (
            <div className="mb-12">
              <h3 className="text-sm font-bold text-white/40 uppercase tracking-widest mb-4">
                Related Reading
              </h3>
              <div className="space-y-2">
                {post.internalLinks.map((link: any, i: number) => (
                  <Link
                    key={i}
                    to={link.url}
                    className="flex items-center gap-3 p-4 bg-[#0D0D0D] border border-white/[0.07] rounded-xl hover:border-[#7B5FFF]/40 transition-all group"
                  >
                    <ExternalLink size={13} className="text-[#7B5FFF] flex-shrink-0" />
                    <span className="text-sm text-white/70 group-hover:text-white transition-colors">
                      {link.anchor}
                    </span>
                    <ChevronRight
                      size={12}
                      className="text-white/20 ml-auto group-hover:text-[#7B5FFF] transition-colors"
                    />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Share */}
          <div className="flex items-center gap-3 mb-12">
            <span className="text-xs text-white/30 uppercase tracking-widest">Share</span>
            <button
              onClick={copyLink}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-[#0D0D0D] border border-white/[0.07] text-white/60 hover:text-white transition-colors"
            >
              {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
              {copied ? 'Copied!' : 'Copy link'}
            </button>
          </div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-3xl p-8 text-center"
            style={{
              background:
                'linear-gradient(135deg,rgba(0,196,255,0.08),rgba(123,95,255,0.10),rgba(214,61,246,0.08))',
              border: '1px solid rgba(123,95,255,0.2)',
            }}
          >
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: 'linear-gradient(135deg,#7B5FFF,#D63DF6)' }}
            >
              <Zap size={20} className="text-white" />
            </div>
            <h3 className="text-2xl font-black text-white mb-2">Ready to Grow Your Music?</h3>
            <p className="text-white/50 text-sm mb-6 max-w-md mx-auto">
              Distribute to 70+ platforms, launch Spotify & TikTok campaigns, pitch playlists, and
              manage your publishing — all from one dashboard.
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Link
                to="/auth"
                className="px-6 py-3 rounded-xl text-sm font-bold text-white"
                style={{ background: 'linear-gradient(135deg,#7B5FFF,#D63DF6)' }}
              >
                Start Free Today
              </Link>
              <Link
                to="/blog"
                className="px-6 py-3 rounded-xl text-sm font-semibold text-white/60 bg-[#0D0D0D] border border-white/[0.07] hover:text-white transition-colors"
              >
                More Articles
              </Link>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}

function NotFoundState({ slug }: { slug: string }) {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-5">
      <div className="text-center max-w-lg">
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6"
          style={{
            background: 'linear-gradient(135deg,rgba(255,82,82,0.15),rgba(123,95,255,0.1))',
          }}
        >
          <BookOpen size={32} className="text-white/20" />
        </div>
        <h1 className="text-3xl font-black text-white mb-3">Article Not Found</h1>
        <p className="text-white/40 text-sm mb-6">
          The article{' '}
          <code className="text-[#7B5FFF]">/blog/{slug}</code> doesn't exist or hasn't been
          published yet.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            to="/blog"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg,#7B5FFF,#D63DF6)' }}
          >
            <ArrowLeft size={13} /> Back to Blog
          </Link>
          <Link
            to="/"
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white/60 bg-[#0D0D0D] border border-white/[0.07] hover:text-white transition-colors"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
