// ─────────────────────────────────────────────────────────────────────────────
//  MIXXEA Admin — SEO Automation Dashboard
//  Full SEO monitoring & strategy panel: keywords, markets, technical, schemas
// ─────────────────────────────────────────────────────────────────────────────
import {
  TARGET_KEYWORDS, INTERNATIONAL_MARKETS, TECHNICAL_SEO_CHECKLIST,
  SEO_PAGES, SITE_URL, KeywordData,
} from './seoConfig';
import { SCHEMAS_PREVIEW } from './StructuredData';
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Globe, Search, CheckCircle, Clock, AlertCircle, XCircle,
  TrendingUp, Target, Code2, Map, BarChart3, ExternalLink,
  ChevronDown, ChevronRight, Copy, Check, Filter, Zap,
  FileText, Link, Shield, Star, ArrowUpRight, Eye,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const ACCENT = { cyan: '#00C4FF', purple: '#7B5FFF', magenta: '#D63DF6', coral: '#FF5252' };

const diffColor = (d: string) =>
  d === 'Low' ? '#10B981' : d === 'Medium' ? '#F59E0B' : '#FF5252';

const priorityColor = (p: string) =>
  p === 'Critical' ? '#FF5252' : p === 'High' ? '#D63DF6' : p === 'Medium' ? '#7B5FFF' : '#00C4FF';

const intentColor = (i: string) =>
  i === 'Transactional' ? '#10B981' : i === 'Commercial' ? '#D63DF6' : i === 'Informational' ? '#00C4FF' : '#F59E0B';

const serviceColor = (s: string) => ({
  Distribution: '#00C4FF', Promotions: '#D63DF6', Publishing: '#7B5FFF',
  Platform: '#10B981', Brand: '#F59E0B',
}[s] ?? '#fff');

function StatusIcon({ status }: { status: string }) {
  if (status === 'done')    return <CheckCircle size={14} className="text-[#10B981]" />;
  if (status === 'review')  return <Clock size={14} className="text-[#F59E0B]" />;
  if (status === 'planned') return <AlertCircle size={14} className="text-white/30" />;
  return <XCircle size={14} className="text-[#FF5252]" />;
}

function useCopy(text: string) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };
  return { copied, copy };
}

// ─────────────────────────────────────────────────────────────────────────────
//  STAT CARD
// ─────────────────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color, icon: Icon }: {
  label: string; value: string | number; sub?: string; color: string; icon: any;
}) {
  return (
    <div className="bg-[#0D0D0D] border border-white/[0.07] rounded-2xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${color}18` }}>
          <Icon size={16} style={{ color }} />
        </div>
        <ArrowUpRight size={14} className="text-white/20" />
      </div>
      <div className="text-2xl font-black text-white mb-0.5">{value}</div>
      <div className="text-xs font-semibold text-white/50">{label}</div>
      {sub && <div className="text-[11px] text-white/30 mt-1">{sub}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  TAB: KEYWORDS
// ─────────────────────────────────────────────────────────────────────────────
function KeywordsTab() {
  const [search, setSearch] = useState('');
  const [filterService, setFilterService] = useState('All');
  const [filterPriority, setFilterPriority] = useState('All');

  const services = ['All', 'Distribution', 'Promotions', 'Publishing', 'Platform', 'Brand'];
  const priorities = ['All', 'Critical', 'High', 'Medium', 'Low'];

  const filtered = useMemo(() => {
    return TARGET_KEYWORDS.filter(k => {
      const matchesSearch = !search || k.keyword.toLowerCase().includes(search.toLowerCase()) || k.market.toLowerCase().includes(search.toLowerCase());
      const matchesService  = filterService  === 'All' || k.service  === filterService;
      const matchesPriority = filterPriority === 'All' || k.priority === filterPriority;
      return matchesSearch && matchesService && matchesPriority;
    });
  }, [search, filterService, filterPriority]);

  const totalVolume = useMemo(() => {
    const num = (v: string) => parseInt(v.replace(/,/g, '')) || 0;
    return filtered.reduce((acc, k) => acc + num(k.volume), 0).toLocaleString();
  }, [filtered]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search keywords or market…"
            className="w-full bg-[#0D0D0D] border border-white/[0.07] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#7B5FFF]/50"
          />
        </div>
        <select value={filterService} onChange={e => setFilterService(e.target.value)}
          className="bg-[#0D0D0D] border border-white/[0.07] rounded-xl px-3 py-2.5 text-sm text-white/70 focus:outline-none">
          {services.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}
          className="bg-[#0D0D0D] border border-white/[0.07] rounded-xl px-3 py-2.5 text-sm text-white/70 focus:outline-none">
          {priorities.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* Summary */}
      <div className="flex items-center justify-between text-xs text-white/40 px-1">
        <span>{filtered.length} keywords · ~{totalVolume} total monthly searches</span>
        <span>{TARGET_KEYWORDS.filter(k => k.priority === 'Critical').length} critical priorities</span>
      </div>

      {/* Table */}
      <div className="bg-[#0D0D0D] border border-white/[0.07] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {['Keyword', 'Market', 'Volume/mo', 'Difficulty', 'Intent', 'Service', 'Priority'].map(h => (
                  <th key={h} className="text-left text-[11px] font-semibold text-white/40 uppercase tracking-wider px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filtered.map((kw, i) => (
                <motion.tr key={i}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.01 }}
                  className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3 text-white font-medium whitespace-nowrap max-w-[220px] truncate">{kw.keyword}</td>
                  <td className="px-4 py-3 text-white/50 whitespace-nowrap">{kw.market}</td>
                  <td className="px-4 py-3 text-white/70 font-mono text-xs">{kw.volume}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold"
                      style={{ color: diffColor(kw.difficulty), background: `${diffColor(kw.difficulty)}15` }}>
                      {kw.difficulty}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold"
                      style={{ color: intentColor(kw.intent), background: `${intentColor(kw.intent)}15` }}>
                      {kw.intent}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold"
                      style={{ color: serviceColor(kw.service), background: `${serviceColor(kw.service)}15` }}>
                      {kw.service}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ background: priorityColor(kw.priority) }} />
                      <span className="text-xs font-medium" style={{ color: priorityColor(kw.priority) }}>
                        {kw.priority}
                      </span>
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  TAB: INTERNATIONAL
// ─────────────────────────────────────────────────────────────────────────────
function InternationalTab() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {INTERNATIONAL_MARKETS.map((m, i) => (
          <motion.div key={m.code}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="bg-[#0D0D0D] border border-white/[0.07] rounded-2xl p-4 flex items-center gap-4">
            <div className="text-3xl flex-shrink-0">{m.flag}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold text-white">{m.region}</span>
                <span className="text-[10px] font-mono text-white/30 bg-white/[0.04] px-1.5 py-0.5 rounded">{m.code}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-white/50">
                <span>{m.keywords} keywords targeted</span>
                <span>·</span>
                <span style={{ color: m.priority === 'Primary' ? '#10B981' : m.priority === 'Secondary' ? '#00C4FF' : '#7B5FFF' }}>
                  {m.priority}
                </span>
              </div>
            </div>
            <div className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold ${
              m.status === 'Active' ? 'bg-[#10B981]/15 text-[#10B981]' : 'bg-white/[0.05] text-white/30'
            }`}>
              {m.status}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Hreflang info */}
      <div className="bg-[#7B5FFF]/10 border border-[#7B5FFF]/20 rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <Globe size={16} className="text-[#7B5FFF] mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-white mb-1.5">Hreflang tags — Auto-injected ✓</p>
            <p className="text-xs text-white/50 leading-relaxed mb-3">
              All 13 hreflang variants are automatically injected into the page <code className="text-[#7B5FFF] bg-[#7B5FFF]/10 px-1 rounded">&lt;head&gt;</code> on every route change via <code className="text-[#7B5FFF] bg-[#7B5FFF]/10 px-1 rounded">SEOProvider</code>. Google uses these to serve the correct language version to users in each market.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {['en', 'en-US', 'en-GB', 'es', 'es-419', 'pt', 'pt-BR', 'fr', 'de', 'ja', 'ko', 'ar', 'x-default'].map(lang => (
                <span key={lang} className="px-2 py-0.5 bg-[#7B5FFF]/15 text-[#7B5FFF] rounded text-[11px] font-mono">{lang}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  TAB: TECHNICAL
// ─────────────────────────────────────────────────────────────────────────────
function TechnicalTab() {
  const categories = [...new Set(TECHNICAL_SEO_CHECKLIST.map(i => i.category))];
  const done    = TECHNICAL_SEO_CHECKLIST.filter(i => i.status === 'done').length;
  const review  = TECHNICAL_SEO_CHECKLIST.filter(i => i.status === 'review').length;
  const planned = TECHNICAL_SEO_CHECKLIST.filter(i => i.status === 'planned').length;
  const score   = Math.round((done / TECHNICAL_SEO_CHECKLIST.length) * 100);

  return (
    <div className="space-y-6">
      {/* Score bar */}
      <div className="bg-[#0D0D0D] border border-white/[0.07] rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold text-white">Technical SEO Score</h3>
            <p className="text-xs text-white/40 mt-0.5">{done} done · {review} need review · {planned} planned</p>
          </div>
          <div className="text-3xl font-black" style={{
            background: score >= 80 ? 'linear-gradient(135deg, #10B981, #00C4FF)' : 'linear-gradient(135deg, #F59E0B, #FF5252)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>{score}%</div>
        </div>
        <div className="h-2 bg-white/[0.05] rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }} animate={{ width: `${score}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, #10B981, #00C4FF)' }}
          />
        </div>
      </div>

      {/* Checklist grouped by category */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {categories.map(cat => (
          <div key={cat} className="bg-[#0D0D0D] border border-white/[0.07] rounded-2xl p-4">
            <h4 className="text-xs font-bold text-white/50 uppercase tracking-wider mb-3">{cat}</h4>
            <div className="space-y-2">
              {TECHNICAL_SEO_CHECKLIST.filter(i => i.category === cat).map(item => (
                <div key={item.id} className="flex items-center gap-2.5">
                  <StatusIcon status={item.status} />
                  <span className={`text-sm ${item.status === 'done' ? 'text-white/80' : item.status === 'review' ? 'text-[#F59E0B]/80' : 'text-white/30'}`}>
                    {item.label}
                  </span>
                  {item.status === 'review' && (
                    <span className="ml-auto text-[10px] bg-[#F59E0B]/15 text-[#F59E0B] px-1.5 py-0.5 rounded font-semibold">Action needed</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Action items */}
      <div className="bg-[#FF5252]/10 border border-[#FF5252]/20 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <AlertCircle size={14} className="text-[#FF5252]" /> Immediate Action Items
        </h3>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <span className="w-5 h-5 rounded bg-[#F59E0B]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-[#F59E0B] text-[10px] font-bold">1</span>
            </span>
            <div>
              <p className="text-sm text-white font-medium">Create OG Image (1200×630px)</p>
              <p className="text-xs text-white/40 mt-0.5">Design a branded OG image for social sharing previews on Facebook, Twitter/X, LinkedIn, WhatsApp. Use MIXXEA branding + tagline.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="w-5 h-5 rounded bg-[#F59E0B]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-[#F59E0B] text-[10px] font-bold">2</span>
            </span>
            <div>
              <p className="text-sm text-white font-medium">Verify Google Search Console</p>
              <p className="text-xs text-white/40 mt-0.5">Go to <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer" className="text-[#00C4FF] underline">search.google.com/search-console</a> → Add property → verify mixxea.com → Submit sitemap.xml</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="w-5 h-5 rounded bg-[#F59E0B]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-[#F59E0B] text-[10px] font-bold">3</span>
            </span>
            <div>
              <p className="text-sm text-white font-medium">Audit Core Web Vitals</p>
              <p className="text-xs text-white/40 mt-0.5">Run <a href="https://pagespeed.web.dev/" target="_blank" rel="noopener noreferrer" className="text-[#00C4FF] underline">PageSpeed Insights</a> on mixxea.com. Target LCP &lt;2.5s, FID &lt;100ms, CLS &lt;0.1.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  TAB: SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────
function SchemasTab() {
  const [activeSchema, setActiveSchema] = useState('Organization');
  const schemaNames = Object.keys(SCHEMAS_PREVIEW);
  const { copied, copy } = useCopy(JSON.stringify((SCHEMAS_PREVIEW as any)[activeSchema], null, 2));

  return (
    <div className="space-y-4">
      <p className="text-sm text-white/50">
        All JSON-LD schemas below are auto-injected into your <code className="text-[#7B5FFF] bg-[#7B5FFF]/10 px-1 rounded">&lt;head&gt;</code>. Google uses these for rich results in search — FAQ dropdowns, service panels, business cards.
      </p>

      <div className="flex flex-wrap gap-2">
        {schemaNames.map(name => (
          <button key={name} onClick={() => setActiveSchema(name)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeSchema === name
                ? 'text-white border border-[#7B5FFF]/40'
                : 'bg-white/[0.04] text-white/50 hover:text-white border border-transparent'
            }`}
            style={activeSchema === name ? { background: 'linear-gradient(135deg, #7B5FFF22, #D63DF622)' } : {}}>
            {name}
          </button>
        ))}
      </div>

      <div className="bg-[#070707] border border-white/[0.07] rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Code2 size={14} className="text-[#7B5FFF]" />
            <span className="text-xs font-semibold text-white/60">{activeSchema} — JSON-LD</span>
          </div>
          <button onClick={copy}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-white/50 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] transition-all">
            {copied ? <Check size={11} className="text-[#10B981]" /> : <Copy size={11} />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <pre className="p-4 text-xs text-[#00C4FF] overflow-auto max-h-96 leading-relaxed font-mono">
          {JSON.stringify((SCHEMAS_PREVIEW as any)[activeSchema], null, 2)}
        </pre>
      </div>

      <div className="flex items-center gap-3 p-4 bg-[#10B981]/10 border border-[#10B981]/20 rounded-xl">
        <CheckCircle size={15} className="text-[#10B981] flex-shrink-0" />
        <p className="text-xs text-white/60">
          Validate your schemas at{' '}
          <a href="https://search.google.com/test/rich-results" target="_blank" rel="noopener noreferrer"
            className="text-[#00C4FF] underline">Google Rich Results Test</a>{' '}and{' '}
          <a href="https://validator.schema.org/" target="_blank" rel="noopener noreferrer"
            className="text-[#00C4FF] underline">Schema.org Validator</a>.
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  TAB: PAGES
// ─────────────────────────────────────────────────────────────────────────────
function PagesTab() {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {Object.entries(SEO_PAGES).map(([path, config]) => (
        <div key={path} className="bg-[#0D0D0D] border border-white/[0.07] rounded-2xl overflow-hidden">
          <button onClick={() => setExpanded(expanded === path ? null : path)}
            className="w-full flex items-center gap-4 p-4 hover:bg-white/[0.02] transition-colors text-left">
            <div className="w-8 h-8 rounded-xl bg-[#7B5FFF]/15 flex items-center justify-center flex-shrink-0">
              <FileText size={14} className="text-[#7B5FFF]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-sm font-semibold text-white font-mono">{path}</span>
                {config.noIndex && (
                  <span className="text-[10px] bg-[#FF5252]/15 text-[#FF5252] px-1.5 py-0.5 rounded font-semibold">noindex</span>
                )}
              </div>
              <p className="text-xs text-white/40 truncate">{config.title}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-[11px] text-white/30">{config.keywords.length} keywords</span>
              {expanded === path ? <ChevronDown size={14} className="text-white/40" /> : <ChevronRight size={14} className="text-white/30" />}
            </div>
          </button>

          <AnimatePresence>
            {expanded === path && (
              <motion.div
                initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                className="border-t border-white/[0.06] overflow-hidden">
                <div className="p-4 space-y-3">
                  <div>
                    <label className="text-[10px] font-bold text-white/30 uppercase tracking-wider">Title</label>
                    <p className="text-sm text-white mt-1">{config.title}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-white/30 uppercase tracking-wider">Description</label>
                    <p className="text-xs text-white/60 mt-1 leading-relaxed">{config.description}</p>
                  </div>
                  {config.canonical && (
                    <div>
                      <label className="text-[10px] font-bold text-white/30 uppercase tracking-wider">Canonical</label>
                      <a href={config.canonical} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-[#00C4FF] flex items-center gap-1 mt-1 hover:underline">
                        {config.canonical} <ExternalLink size={10} />
                      </a>
                    </div>
                  )}
                  {config.keywords.length > 0 && (
                    <div>
                      <label className="text-[10px] font-bold text-white/30 uppercase tracking-wider">Keywords ({config.keywords.length})</label>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {config.keywords.slice(0, 20).map(kw => (
                          <span key={kw} className="px-2 py-0.5 bg-[#7B5FFF]/10 text-[#7B5FFF] rounded text-[11px]">{kw}</span>
                        ))}
                        {config.keywords.length > 20 && (
                          <span className="px-2 py-0.5 bg-white/[0.04] text-white/30 rounded text-[11px]">+{config.keywords.length - 20} more</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  TAB: SITEMAP & ROBOTS
// ─────────────────────────────────────────────────────────────────────────────
function SitemapTab() {
  const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url>
    <loc>https://www.mixxea.com/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
    <xhtml:link rel="alternate" hreflang="en"      href="https://www.mixxea.com/"/>
    <xhtml:link rel="alternate" hreflang="es"      href="https://www.mixxea.com/"/>
    <xhtml:link rel="alternate" hreflang="pt-BR"   href="https://www.mixxea.com/"/>
    <xhtml:link rel="alternate" hreflang="fr"      href="https://www.mixxea.com/"/>
    <xhtml:link rel="alternate" hreflang="de"      href="https://www.mixxea.com/"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="https://www.mixxea.com/"/>
  </url>
  <url>
    <loc>https://www.mixxea.com/auth</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>`;

  const robotsContent = `User-agent: *
Allow: /
Disallow: /dashboard/
Disallow: /admin/
Disallow: /admin/bootstrap

Sitemap: https://www.mixxea.com/sitemap.xml`;

  const { copied: copiedSitemap, copy: copySitemap } = useCopy(sitemapContent);
  const { copied: copiedRobots,  copy: copyRobots  } = useCopy(robotsContent);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4">
        {/* Sitemap */}
        <div className="bg-[#0D0D0D] border border-white/[0.07] rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <Map size={14} className="text-[#00C4FF]" />
              <span className="text-xs font-semibold text-white">sitemap.xml</span>
              <span className="text-[10px] bg-[#10B981]/15 text-[#10B981] px-1.5 py-0.5 rounded font-semibold">Live</span>
            </div>
            <div className="flex items-center gap-2">
              <a href={`${SITE_URL}/sitemap.xml`} target="_blank" rel="noopener noreferrer"
                className="text-xs text-white/40 hover:text-white flex items-center gap-1 transition-colors">
                <ExternalLink size={11} /> View live
              </a>
              <button onClick={copySitemap}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-white/50 hover:text-white bg-white/[0.04] transition-all">
                {copiedSitemap ? <Check size={11} className="text-[#10B981]" /> : <Copy size={11} />}
                {copiedSitemap ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
          <pre className="p-4 text-xs text-[#10B981] overflow-auto max-h-72 leading-relaxed font-mono">{sitemapContent}</pre>
        </div>

        {/* Robots */}
        <div className="bg-[#0D0D0D] border border-white/[0.07] rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <Shield size={14} className="text-[#D63DF6]" />
              <span className="text-xs font-semibold text-white">robots.txt</span>
              <span className="text-[10px] bg-[#10B981]/15 text-[#10B981] px-1.5 py-0.5 rounded font-semibold">Live</span>
            </div>
            <div className="flex items-center gap-2">
              <a href={`${SITE_URL}/robots.txt`} target="_blank" rel="noopener noreferrer"
                className="text-xs text-white/40 hover:text-white flex items-center gap-1 transition-colors">
                <ExternalLink size={11} /> View live
              </a>
              <button onClick={copyRobots}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-white/50 hover:text-white bg-white/[0.04] transition-all">
                {copiedRobots ? <Check size={11} className="text-[#10B981]" /> : <Copy size={11} />}
                {copiedRobots ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
          <pre className="p-4 text-xs text-[#D63DF6] overflow-auto leading-relaxed font-mono">{robotsContent}</pre>
        </div>
      </div>

      {/* Submit sitemap instructions */}
      <div className="bg-[#00C4FF]/10 border border-[#00C4FF]/20 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <Search size={14} className="text-[#00C4FF]" /> Submit Sitemap to Search Engines
        </h3>
        <div className="space-y-2.5">
          {[
            { name: 'Google Search Console', url: 'https://search.google.com/search-console', color: '#00C4FF' },
            { name: 'Bing Webmaster Tools',  url: 'https://www.bing.com/webmasters',         color: '#7B5FFF' },
            { name: 'Yandex Webmaster',      url: 'https://webmaster.yandex.com',            color: '#FF5252' },
          ].map(se => (
            <a key={se.name} href={se.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-between p-3 bg-white/[0.03] hover:bg-white/[0.06] rounded-xl transition-colors group">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: se.color }} />
                <span className="text-sm text-white">{se.name}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-white/40 group-hover:text-white transition-colors">
                Submit <code className="text-[10px] bg-white/[0.05] px-1 rounded">https://www.mixxea.com/sitemap.xml</code>
                <ExternalLink size={10} />
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  MAIN DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'overview',       label: 'Overview',       icon: BarChart3 },
  { id: 'keywords',       label: 'Keywords',        icon: Search    },
  { id: 'international',  label: 'International',   icon: Globe     },
  { id: 'technical',      label: 'Technical',       icon: CheckCircle },
  { id: 'schemas',        label: 'Schemas',         icon: Code2     },
  { id: 'pages',          label: 'Pages',           icon: FileText  },
  { id: 'sitemap',        label: 'Sitemap & Robots',icon: Map       },
];

export function SEODashboard() {
  const [activeTab, setActiveTab] = useState('overview');

  const totalKw      = TARGET_KEYWORDS.length;
  const criticalKw   = TARGET_KEYWORDS.filter(k => k.priority === 'Critical').length;
  const totalMarkets = INTERNATIONAL_MARKETS.length;
  const activeMarkets= INTERNATIONAL_MARKETS.filter(m => m.status === 'Active').length;
  const techScore    = Math.round((TECHNICAL_SEO_CHECKLIST.filter(i => i.status === 'done').length / TECHNICAL_SEO_CHECKLIST.length) * 100);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span>SEO Automation</span>
            <span className="text-sm font-semibold px-2.5 py-0.5 rounded-full text-[#10B981] bg-[#10B981]/15">Live</span>
          </h1>
          <p className="text-sm text-white/40 mt-1">
            International keyword targeting · Structured data · Technical SEO · {totalKw} keywords across {totalMarkets} markets
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white/60 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-all">
            <ExternalLink size={13} /> Search Console
          </a>
          <a href={`${SITE_URL}/sitemap.xml`} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #7B5FFF, #D63DF6)' }}>
            <Map size={13} /> View Sitemap
          </a>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Keywords Tracked"    value={totalKw}          sub={`${criticalKw} critical priority`}   color={ACCENT.cyan}    icon={Target}     />
        <StatCard label="Markets Targeted"    value={totalMarkets}     sub={`${activeMarkets} active now`}        color={ACCENT.purple}  icon={Globe}      />
        <StatCard label="Technical SEO Score" value={`${techScore}%`}  sub="23 item checklist"                    color={ACCENT.magenta} icon={CheckCircle}/>
        <StatCard label="JSON-LD Schemas"     value={6}                sub="Auto-injected on every page"          color={ACCENT.coral}   icon={Code2}      />
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-[#0D0D0D] border border-white/[0.06] rounded-2xl overflow-x-auto">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
              activeTab === tab.id ? 'text-white' : 'text-white/40 hover:text-white/70'
            }`}
            style={activeTab === tab.id ? { background: 'linear-gradient(135deg, #7B5FFF22, #D63DF622)', borderColor: '#7B5FFF40', border: '1px solid #7B5FFF40' } : {}}>
            <tab.icon size={13} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div key={activeTab}
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }}>
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Quick wins */}
              <div className="bg-[#0D0D0D] border border-white/[0.07] rounded-2xl p-5">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <Zap size={14} className="text-[#F59E0B]" /> Quick Wins (High impact, low difficulty)
                </h3>
                <div className="space-y-3">
                  {TARGET_KEYWORDS.filter(k => k.difficulty === 'Low' && (k.priority === 'Critical' || k.priority === 'High')).slice(0, 6).map((kw, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="w-5 h-5 rounded bg-[#10B981]/15 flex items-center justify-center flex-shrink-0">
                        <Star size={10} className="text-[#10B981]" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{kw.keyword}</p>
                        <p className="text-[11px] text-white/40">{kw.market} · {kw.volume}/mo</p>
                      </div>
                      <span className="text-[11px] font-semibold flex-shrink-0" style={{ color: serviceColor(kw.service) }}>
                        {kw.service}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Market breakdown */}
              <div className="bg-[#0D0D0D] border border-white/[0.07] rounded-2xl p-5">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <Globe size={14} className="text-[#7B5FFF]" /> Top Markets
                </h3>
                <div className="space-y-2.5">
                  {INTERNATIONAL_MARKETS.slice(0, 6).map(m => (
                    <div key={m.code} className="flex items-center gap-3">
                      <span className="text-xl">{m.flag}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-white">{m.region}</span>
                          <span className="text-xs text-white/40">{m.keywords} kw</span>
                        </div>
                        <div className="h-1.5 bg-white/[0.05] rounded-full">
                          <div className="h-full rounded-full" style={{
                            width: `${(m.keywords / 22) * 100}%`,
                            background: m.priority === 'Primary' ? 'linear-gradient(90deg, #7B5FFF, #D63DF6)' : m.priority === 'Secondary' ? '#00C4FF' : '#ffffff30',
                          }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Services keyword split */}
              <div className="bg-[#0D0D0D] border border-white/[0.07] rounded-2xl p-5">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <BarChart3 size={14} className="text-[#00C4FF]" /> Keywords by Service
                </h3>
                {['Distribution', 'Promotions', 'Publishing', 'Platform', 'Brand'].map(service => {
                  const count = TARGET_KEYWORDS.filter(k => k.service === service).length;
                  const pct   = Math.round((count / TARGET_KEYWORDS.length) * 100);
                  return (
                    <div key={service} className="mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium" style={{ color: serviceColor(service) }}>{service}</span>
                        <span className="text-xs text-white/40">{count} keywords ({pct}%)</span>
                      </div>
                      <div className="h-1.5 bg-white/[0.05] rounded-full">
                        <motion.div className="h-full rounded-full"
                          initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, delay: 0.1 }}
                          style={{ background: serviceColor(service) }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Priority breakdown */}
              <div className="bg-[#0D0D0D] border border-white/[0.07] rounded-2xl p-5">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <Target size={14} className="text-[#D63DF6]" /> Priority Breakdown
                </h3>
                {['Critical', 'High', 'Medium', 'Low'].map(p => {
                  const count = TARGET_KEYWORDS.filter(k => k.priority === p).length;
                  const pct   = Math.round((count / TARGET_KEYWORDS.length) * 100);
                  return (
                    <div key={p} className="mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ background: priorityColor(p) }} />
                          <span className="text-xs font-medium text-white">{p}</span>
                        </div>
                        <span className="text-xs text-white/40">{count} ({pct}%)</span>
                      </div>
                      <div className="h-1.5 bg-white/[0.05] rounded-full">
                        <motion.div className="h-full rounded-full"
                          initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, delay: 0.1 }}
                          style={{ background: priorityColor(p) }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {activeTab === 'keywords'      && <KeywordsTab />}
          {activeTab === 'international' && <InternationalTab />}
          {activeTab === 'technical'     && <TechnicalTab />}
          {activeTab === 'schemas'       && <SchemasTab />}
          {activeTab === 'pages'         && <PagesTab />}
          {activeTab === 'sitemap'       && <SitemapTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}