// ─────────────────────────────────────────────────────────────────────────────
//  MIXXEA — Daily SEO Automation Manager
//  10-Step workflow: Keyword Discovery → Content Gap → Strategy → Article →
//  On-Page → Internal Links → Distribution → Backlinks → Tracking → Loop
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../dashboard/AuthContext';
import * as api from '../dashboard/api';
import { toast } from 'sonner';
import {
  Play, RefreshCw, Clock, ChevronRight, ChevronDown, ChevronUp,
  Search, TrendingUp, Target, FileText, CheckCircle, Link2,
  Share2, ExternalLink, BarChart3, RotateCcw, Copy, Check,
  AlertCircle, Star, Zap, Globe, Megaphone, BookOpen,
  ArrowUpRight, Calendar, Hash, Layers, Radio,
} from 'lucide-react';

// ── colour helpers ─────────────────────────────────────────────────────────────
const DIFF_COLOR = (d: string) =>
  d === 'Low' ? '#10B981' : d === 'Medium' ? '#F59E0B' : '#FF5252';
const TRAFFIC_COLOR = (t: string) =>
  t === 'Very High' ? '#00C4FF' : t === 'High' ? '#7B5FFF' : t === 'Medium' ? '#F59E0B' : '#6B7280';
const OPP_COLOR = (o: string) =>
  o === 'Quick Win' ? '#10B981' : o === 'Medium Term' ? '#F59E0B' : '#6B7280';

// ── Step config ────────────────────────────────────────────────────────────────
const STEPS = [
  { n: 1,  label: 'Keyword Discovery',     icon: Search,      color: '#00C4FF' },
  { n: 2,  label: 'Content Gap Analysis',  icon: Target,      color: '#7B5FFF' },
  { n: 3,  label: 'Content Strategy',      icon: Layers,      color: '#D63DF6' },
  { n: 4,  label: 'SEO Article',           icon: FileText,    color: '#FF5252' },
  { n: 5,  label: 'On-Page Checklist',     icon: CheckCircle, color: '#10B981' },
  { n: 6,  label: 'Internal Links',        icon: Link2,       color: '#F59E0B' },
  { n: 7,  label: 'Content Distribution',  icon: Share2,      color: '#E1306C' },
  { n: 8,  label: 'Backlink Strategy',     icon: ExternalLink, color: '#00C4FF' },
  { n: 9,  label: 'Performance Tracking',  icon: BarChart3,   color: '#7B5FFF' },
  { n: 10, label: 'Improvement Loop',      icon: RotateCcw,   color: '#D63DF6' },
];

const CLUSTERS = [
  'Music Distribution', 'Spotify Growth', 'TikTok & Social Promotion', 'Publishing & Royalties',
  'Independent Artist Business', 'Music Marketing Agency', 'Playlist Pitching',
];

function useCopy(text: string) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800); });
  };
  return { copied, copy };
}

// ─────────────────────────────────────────────────────────────────────────────
//  STEP 1: Keyword Discovery
// ─────────────────────────────────────────────────────────────────────────────
function Step1({ data }: { data: any }) {
  const [tab, setTab] = useState<'trending' | 'longtail' | 'questions'>('trending');
  const kwList =
    tab === 'trending'  ? data?.trendingKeywords :
    tab === 'longtail'  ? data?.longTailKeywords :
    data?.questionKeywords;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3 mb-2">
        {[
          { id: 'trending',  label: 'Trending Keywords', count: data?.trendingKeywords?.length || 0, color: '#00C4FF' },
          { id: 'longtail',  label: 'Long-Tail',         count: data?.longTailKeywords?.length || 0, color: '#7B5FFF' },
          { id: 'questions', label: 'Questions',          count: data?.questionKeywords?.length || 0, color: '#D63DF6' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className={`p-3 rounded-xl border text-left transition-all ${tab === t.id ? 'border-transparent' : 'border-white/[0.07] bg-[#0D0D0D]'}`}
            style={tab === t.id ? { background: `${t.color}18`, borderColor: `${t.color}35` } : {}}>
            <div className="text-lg font-black text-white">{t.count}</div>
            <div className="text-[11px] text-white/50 mt-0.5">{t.label}</div>
          </button>
        ))}
      </div>

      <div className="bg-[#0D0D0D] border border-white/[0.07] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {['Keyword', 'Intent', 'Difficulty', 'Traffic', 'Score', 'Searches/mo', 'Trend'].map(h => (
                  <th key={h} className="text-left text-[10px] font-semibold text-white/40 uppercase tracking-wider px-3 py-2.5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {(kwList || []).map((kw: any, i: number) => (
                <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-3 py-2.5 text-white font-medium max-w-[280px]">
                    <div className="truncate">{kw.keyword}</div>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
                      style={{ color: kw.intent === 'Transactional' ? '#10B981' : kw.intent === 'Commercial' ? '#D63DF6' : '#00C4FF', background: kw.intent === 'Transactional' ? '#10B98115' : kw.intent === 'Commercial' ? '#D63DF615' : '#00C4FF15' }}>
                      {kw.intent}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
                      style={{ color: DIFF_COLOR(kw.difficulty), background: `${DIFF_COLOR(kw.difficulty)}15` }}>
                      {kw.difficulty}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
                      style={{ color: TRAFFIC_COLOR(kw.trafficPotential), background: `${TRAFFIC_COLOR(kw.trafficPotential)}15` }}>
                      {kw.trafficPotential}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <div className="w-12 h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
                        <div className="h-full rounded-full bg-[#7B5FFF]" style={{ width: `${(kw.relevanceScore / 10) * 100}%` }} />
                      </div>
                      <span className="text-[11px] text-white/60 font-mono">{kw.relevanceScore}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-white/60 font-mono text-xs">{kw.monthlySearches}</td>
                  <td className="px-3 py-2.5">
                    <span className={`text-[10px] font-semibold ${kw.trend === 'Rising' ? 'text-[#10B981]' : kw.trend === 'Seasonal' ? 'text-[#F59E0B]' : 'text-white/40'}`}>
                      {kw.trend === 'Rising' ? '↑ Rising' : kw.trend === 'Seasonal' ? '◈ Seasonal' : '→ Stable'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  STEP 2: Content Gap Analysis
// ─────────────────────────────────────────────────────────────────────────────
function Step2({ data }: { data: any }) {
  return (
    <div className="space-y-3">
      {(data?.gaps || []).map((gap: any, i: number) => (
        <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
          className="bg-[#0D0D0D] border border-white/[0.07] rounded-2xl p-4">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider">#{i + 1}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                  style={{ color: OPP_COLOR(gap.opportunity), background: `${OPP_COLOR(gap.opportunity)}18` }}>
                  {gap.opportunity}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded font-semibold"
                  style={{ color: DIFF_COLOR(gap.difficulty), background: `${DIFF_COLOR(gap.difficulty)}15` }}>
                  {gap.difficulty} difficulty
                </span>
              </div>
              <h4 className="text-sm font-bold text-white leading-snug">{gap.topic}</h4>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-sm font-bold text-white">{gap.estimatedTraffic}</div>
              <div className="text-[10px] text-white/30">est. monthly</div>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3 text-xs">
            <div className="p-2.5 bg-[#FF5252]/10 border border-[#FF5252]/20 rounded-xl">
              <div className="text-[10px] text-[#FF5252]/70 font-bold uppercase tracking-wider mb-1">Competitor Ranking</div>
              <div className="text-white/70">{gap.competitorRanking}</div>
            </div>
            <div className="p-2.5 bg-[#10B981]/10 border border-[#10B981]/20 rounded-xl">
              <div className="text-[10px] text-[#10B981]/70 font-bold uppercase tracking-wider mb-1">Recommended Action</div>
              <div className="text-white/70">{gap.action}</div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  STEP 3: Content Strategy
// ─────────────────────────────────────────────────────────────────────────────
function Step3({ data }: { data: any }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="space-y-3">
      {(data?.briefs || []).map((brief: any, i: number) => {
        const { copied, copy } = useCopy(brief.metaTitle + '\n' + brief.metaDescription + '\n' + brief.slug);
        return (
          <div key={i} className="bg-[#0D0D0D] border border-white/[0.07] rounded-2xl overflow-hidden">
            <button onClick={() => setOpen(open === i ? null : i)}
              className="w-full flex items-center gap-3 p-4 hover:bg-white/[0.02] transition-colors text-left">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-sm text-white"
                style={{ background: 'linear-gradient(135deg,#7B5FFF,#D63DF6)' }}>
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-white truncate">{brief.title}</div>
                <div className="flex items-center gap-3 mt-0.5 text-[11px] text-white/40">
                  <span>{brief.wordCount.toLocaleString()} words</span>
                  <span>·</span>
                  <span className="truncate">{brief.targetKeyword}</span>
                </div>
              </div>
              {open === i ? <ChevronUp size={14} className="text-white/30 flex-shrink-0" /> : <ChevronDown size={14} className="text-white/30 flex-shrink-0" />}
            </button>
            <AnimatePresence>
              {open === i && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  className="border-t border-white/[0.06] overflow-hidden">
                  <div className="p-4 space-y-4">
                    <div className="p-3 bg-[#7B5FFF]/10 border border-[#7B5FFF]/20 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">SEO Meta</span>
                        <button onClick={copy} className="flex items-center gap-1 text-[10px] text-white/40 hover:text-white transition-colors">
                          {copied ? <Check size={10} className="text-[#10B981]" /> : <Copy size={10} />} {copied ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                      <div><div className="text-[10px] text-[#7B5FFF] mb-0.5">Title</div><div className="text-xs text-white">{brief.metaTitle}</div></div>
                      <div><div className="text-[10px] text-[#7B5FFF] mb-0.5">Description</div><div className="text-xs text-white/70">{brief.metaDescription}</div></div>
                      <div><div className="text-[10px] text-[#7B5FFF] mb-0.5">Slug</div><div className="text-xs font-mono text-[#00C4FF]">/{brief.slug}</div></div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-2">Content Structure</div>
                      <div className="space-y-1">
                        {brief.h2s?.map((h: string) => (
                          <div key={h} className="flex items-center gap-2 text-xs text-white/60">
                            <span className="text-[#7B5FFF] font-mono text-[10px]">H2</span> {h}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-2">Secondary Keywords</div>
                      <div className="flex flex-wrap gap-1.5">
                        {brief.secondaryKeywords?.map((kw: string) => (
                          <span key={kw} className="px-2 py-0.5 bg-[#00C4FF]/10 text-[#00C4FF] rounded text-[11px]">{kw}</span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-2">Internal Linking Opportunities</div>
                      <div className="space-y-1">
                        {brief.internalLinks?.map((l: any) => (
                          <div key={l.anchor} className="flex items-center gap-2 text-xs">
                            <Link2 size={10} className="text-[#7B5FFF] flex-shrink-0" />
                            <span className="text-white/60">Anchor: <span className="text-[#7B5FFF]">"{l.anchor}"</span></span>
                            <span className="text-white/30">→ {l.page}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  STEP 4: SEO Article
// ─────────────────────────────────────────────────────────────────────────────
function Step4({ data }: { data: any }) {
  const [tab, setTab] = useState<'meta' | 'outline' | 'faq' | 'full'>('meta');
  const { copied, copy } = useCopy(
    tab === 'full' ? data?.fullOutlineMarkdown || '' :
    tab === 'faq'  ? JSON.stringify(data?.faqBlock, null, 2) :
    `${data?.metaTitle}\n${data?.metaDescription}\n${data?.slug}`
  );
  if (!data) return <div className="text-white/40 text-sm">No article generated.</div>;

  return (
    <div className="space-y-4">
      <div className="p-4 bg-[#10B981]/10 border border-[#10B981]/25 rounded-2xl">
        <div className="flex items-center gap-2 mb-2">
          <Star size={12} className="text-[#10B981]" />
          <span className="text-[10px] font-bold text-[#10B981] uppercase tracking-wider">Featured Snippet Target</span>
        </div>
        <p className="text-sm text-white/80 leading-relaxed">{data.featuredSnippet}</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {(['meta','outline','faq','full'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all capitalize ${tab === t ? 'text-white' : 'bg-[#0D0D0D] text-white/50 hover:text-white border border-white/[0.07]'}`}
            style={tab === t ? { background: 'linear-gradient(135deg,#7B5FFF,#D63DF6)' } : {}}>
            {t === 'full' ? 'Full Outline (MD)' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div className="bg-[#070707] border border-white/[0.07] rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-white/50 font-mono">{data.slug} · {data.estimatedWordCount?.toLocaleString()} words</span>
          </div>
          <button onClick={copy} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-white/50 hover:text-white bg-white/[0.04] transition-all">
            {copied ? <Check size={11} className="text-[#10B981]" /> : <Copy size={11} />} {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>

        {tab === 'meta' && (
          <div className="p-4 space-y-3">
            {[
              { label: 'Meta Title', value: data.metaTitle, color: '#00C4FF' },
              { label: 'Meta Description', value: data.metaDescription, color: '#7B5FFF' },
              { label: 'SEO Slug', value: `/${data.slug}`, color: '#10B981' },
              { label: 'Keyword Density Target', value: data.keywordDensityTarget, color: '#F59E0B' },
            ].map(({ label, value, color }) => (
              <div key={label}>
                <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color }}>{label}</div>
                <div className="text-sm text-white/80 font-mono bg-white/[0.03] px-3 py-2 rounded-lg">{value}</div>
              </div>
            ))}
          </div>
        )}

        {tab === 'outline' && (
          <div className="p-4 space-y-1">
            {data.outline?.map((line: string, i: number) => {
              const isH1 = line.startsWith('H1:');
              const isH2 = line.startsWith('H2:');
              return (
                <div key={i} className={`text-sm py-0.5 ${isH1 ? 'text-white font-bold' : isH2 ? 'text-white/80 font-semibold pl-3' : 'text-white/50 pl-7 text-xs'}`}
                  style={{ color: isH1 ? '#FFFFFF' : isH2 ? '#D63DF6' : '#7B5FFF' }}>
                  {line}
                </div>
              );
            })}
          </div>
        )}

        {tab === 'faq' && (
          <div className="p-4 space-y-4">
            {data.faqBlock?.map((faq: any, i: number) => (
              <div key={i} className="border-b border-white/[0.05] pb-4 last:border-0 last:pb-0">
                <div className="flex items-start gap-2 mb-2">
                  <span className="text-[10px] font-bold text-[#D63DF6] bg-[#D63DF6]/15 px-1.5 py-0.5 rounded flex-shrink-0">Q</span>
                  <p className="text-sm font-semibold text-white">{faq.question}</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[10px] font-bold text-[#10B981] bg-[#10B981]/15 px-1.5 py-0.5 rounded flex-shrink-0">A</span>
                  <p className="text-xs text-white/60 leading-relaxed">{faq.answer}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'full' && (
          <pre className="p-4 text-xs text-[#00C4FF] overflow-auto max-h-96 leading-relaxed font-mono whitespace-pre-wrap">
            {data.fullOutlineMarkdown}
          </pre>
        )}
      </div>

      <div>
        <div className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-2">Internal Link Suggestions</div>
        <div className="flex flex-wrap gap-2">
          {data.internalLinks?.map((l: any) => (
            <span key={l.anchor} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#7B5FFF]/10 border border-[#7B5FFF]/20 rounded-xl text-xs">
              <Link2 size={10} className="text-[#7B5FFF]" />
              <span className="text-[#7B5FFF] font-semibold">"{l.anchor}"</span>
              <span className="text-white/40">→ {l.url}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  STEP 5: On-Page Checklist
// ─────────────────────────────────────────────────────────────────────────────
function Step5({ data }: { data: any }) {
  const items = data?.checklist || [];
  const cats = [...new Set(items.map((i: any) => i.category))];
  const done   = items.filter((i: any) => i.status === 'done').length;
  const action = items.filter((i: any) => i.status === 'action').length;
  const score  = Math.round((done / Math.max(items.length, 1)) * 100);

  return (
    <div className="space-y-5">
      <div className="bg-[#0D0D0D] border border-white/[0.07] rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold text-white">On-Page Optimization Score</h3>
            <p className="text-xs text-white/40 mt-0.5">{done} complete · {action} need action · {items.length - done - action} planned</p>
          </div>
          <div className="text-3xl font-black"
            style={{ background: score >= 70 ? 'linear-gradient(135deg,#10B981,#00C4FF)' : 'linear-gradient(135deg,#F59E0B,#FF5252)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {score}%
          </div>
        </div>
        <div className="h-2 bg-white/[0.05] rounded-full overflow-hidden">
          <motion.div initial={{ width: 0 }} animate={{ width: `${score}%` }} transition={{ duration: 0.8, ease: 'easeOut' }}
            className="h-full rounded-full" style={{ background: 'linear-gradient(90deg,#10B981,#00C4FF)' }} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {cats.map((cat: any) => (
          <div key={cat} className="bg-[#0D0D0D] border border-white/[0.07] rounded-2xl p-4">
            <h4 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3">{cat}</h4>
            <div className="space-y-2.5">
              {items.filter((i: any) => i.category === cat).map((item: any) => (
                <div key={item.id}>
                  <div className="flex items-start gap-2.5">
                    {item.status === 'done'    && <CheckCircle size={14} className="text-[#10B981] flex-shrink-0 mt-0.5" />}
                    {item.status === 'action'  && <AlertCircle size={14} className="text-[#F59E0B] flex-shrink-0 mt-0.5" />}
                    {item.status === 'planned' && <div className="w-3.5 h-3.5 rounded-full border border-white/20 flex-shrink-0 mt-0.5" />}
                    <div className="flex-1">
                      <span className={`text-sm ${item.status === 'done' ? 'text-white/80' : item.status === 'action' ? 'text-[#F59E0B]/90' : 'text-white/30'}`}>
                        {item.item}
                      </span>
                      {item.status === 'action' && item.note && (
                        <p className="text-[11px] text-white/40 mt-0.5">{item.note}</p>
                      )}
                    </div>
                    {item.status === 'action' && (
                      <span className="text-[10px] bg-[#F59E0B]/15 text-[#F59E0B] px-1.5 py-0.5 rounded font-bold flex-shrink-0">Action</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  STEP 6: Internal Link Map
// ─────────────���───────────────────────────────────────────────────────────────
function Step6({ data }: { data: any }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-white/50">Internal link map for topical authority clustering — connect related pages to strengthen MIXXEA's topical signals across distribution, promotion, publishing, and artist tools.</p>
      <div className="bg-[#0D0D0D] border border-white/[0.07] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {['From Page', 'To Page / Section', 'Anchor Text', 'Reason'].map(h => (
                  <th key={h} className="text-left text-[10px] font-bold text-white/40 uppercase tracking-wider px-4 py-2.5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {(data?.linkMap || []).map((link: any, i: number) => (
                <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3 font-mono text-[#00C4FF] text-xs">{link.from}</td>
                  <td className="px-4 py-3 font-mono text-[#7B5FFF] text-xs">{link.to}</td>
                  <td className="px-4 py-3 text-white text-xs">"{link.anchor}"</td>
                  <td className="px-4 py-3 text-white/50 text-xs">{link.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  STEP 7: Content Distribution
// ─────────────────────────────────────────────────────────────────────────────
function Step7({ data }: { data: any }) {
  const [channel, setChannel] = useState<'twitter' | 'linkedin' | 'reddit' | 'newsletter'>('twitter');
  const content =
    channel === 'twitter'    ? (data?.tweetThread || []).join('\n\n') :
    channel === 'linkedin'   ? data?.linkedInPost || '' :
    channel === 'reddit'     ? `r/${data?.redditPost?.subreddit}\nTitle: ${data?.redditPost?.title}\n\n${data?.redditPost?.body}` :
    data?.newsletter || '';
  const { copied, copy } = useCopy(content);

  const channels = [
    { id: 'twitter',    label: 'X / Twitter', icon: '𝕏',  color: '#FFFFFF' },
    { id: 'linkedin',   label: 'LinkedIn',     icon: 'in', color: '#0077B5' },
    { id: 'reddit',     label: 'Reddit',       icon: 'r/', color: '#FF6314' },
    { id: 'newsletter', label: 'Newsletter',   icon: '✉',  color: '#D63DF6' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {channels.map(ch => (
          <button key={ch.id} onClick={() => setChannel(ch.id as any)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all border ${channel === ch.id ? 'text-white border-transparent' : 'border-white/[0.07] text-white/50 hover:text-white bg-[#0D0D0D]'}`}
            style={channel === ch.id ? { background: `${ch.color}25`, borderColor: `${ch.color}40`, color: ch.id === 'twitter' ? '#fff' : ch.color } : {}}>
            <span className="font-bold">{ch.icon}</span> {ch.label}
          </button>
        ))}
      </div>

      <div className="bg-[#070707] border border-white/[0.07] rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06]">
          <span className="text-xs text-white/50">Ready to publish — copy and paste</span>
          <button onClick={copy} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-white/50 hover:text-white bg-white/[0.04] transition-all">
            {copied ? <Check size={11} className="text-[#10B981]" /> : <Copy size={11} />} {copied ? 'Copied!' : 'Copy All'}
          </button>
        </div>
        <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
          {channel === 'twitter' && (data?.tweetThread || []).map((tweet: string, i: number) => (
            <div key={i} className="p-3 bg-white/[0.03] border border-white/[0.05] rounded-xl">
              <div className="text-[10px] text-white/30 mb-1.5">Tweet {i + 1}/{data.tweetThread.length}</div>
              <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">{tweet}</p>
            </div>
          ))}
          {channel !== 'twitter' && (
            <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">{content}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  STEP 8: Backlink Strategy
// ─────────────────────────────────────────────────────────────────────────────
function Step8({ data }: { data: any }) {
  const [showTemplate, setShowTemplate] = useState(false);
  const { copied, copy } = useCopy(data?.outreachTemplate || '');
  return (
    <div className="space-y-5">
      <div>
        <div className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-3">High-Value Link Targets</div>
        <div className="grid gap-3">
          {(data?.targets || []).map((t: any, i: number) => (
            <div key={i} className="flex items-center gap-4 p-3.5 bg-[#0D0D0D] border border-white/[0.07] rounded-xl">
              <div className="w-8 h-8 rounded-xl bg-[#7B5FFF]/15 flex items-center justify-center flex-shrink-0">
                <span className="text-[#7B5FFF] text-xs font-black">{i + 1}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-white">{t.site}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#00C4FF]/15 text-[#00C4FF] font-semibold">{t.type}</span>
                  <span className="text-[10px] text-white/30">DA {t.da}</span>
                </div>
                <p className="text-xs text-white/50 mt-0.5">{t.angle}</p>
              </div>
              <ArrowUpRight size={14} className="text-white/20 flex-shrink-0" />
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-3">Guest Post Ideas</div>
        <div className="space-y-2">
          {(data?.guestPostIdeas || []).map((idea: string, i: number) => (
            <div key={i} className="flex items-center gap-2.5 p-2.5 bg-[#0D0D0D] border border-white/[0.06] rounded-xl text-sm text-white/70">
              <Star size={12} className="text-[#D63DF6] flex-shrink-0" />
              {idea}
            </div>
          ))}
        </div>
      </div>

      <div>
        <button onClick={() => setShowTemplate(v => !v)}
          className="flex items-center gap-2 text-sm font-semibold text-[#7B5FFF] hover:text-[#D63DF6] transition-colors mb-3">
          <FileText size={14} /> Outreach Email Template {showTemplate ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
        <AnimatePresence>
          {showTemplate && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="bg-[#070707] border border-white/[0.07] rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06]">
                <span className="text-xs text-white/50">Copy and personalise before sending</span>
                <button onClick={copy} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-white/50 hover:text-white bg-white/[0.04] transition-all">
                  {copied ? <Check size={11} className="text-[#10B981]" /> : <Copy size={11} />} {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <pre className="p-4 text-xs text-white/70 whitespace-pre-wrap leading-relaxed font-sans">{data?.outreachTemplate}</pre>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  STEP 9: Performance Tracking
// ─────────────────────────────────────────────────────────────────────────────
function Step9({ data }: { data: any }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {(data?.kpis || []).map((kpi: any, i: number) => (
          <div key={i} className="p-4 bg-[#0D0D0D] border border-white/[0.07] rounded-2xl">
            <div className="flex items-start justify-between mb-3">
              <span className="text-sm font-semibold text-white">{kpi.metric}</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-white/[0.05] text-white/40 font-medium">{kpi.timeframe}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 bg-white/[0.03] rounded-lg">
                <div className="text-white/30 mb-0.5">Current</div>
                <div className="text-white/70">{kpi.current}</div>
              </div>
              <div className="p-2 rounded-lg" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
                <div className="text-[#10B981]/60 mb-0.5">Target</div>
                <div className="text-[#10B981] font-semibold">{kpi.target}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div>
        <div className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-3">Weekly Monitoring Actions</div>
        <div className="space-y-2">
          {(data?.weeklyActions || []).map((action: string, i: number) => (
            <div key={i} className="flex items-start gap-3 p-3 bg-[#0D0D0D] border border-white/[0.06] rounded-xl">
              <div className="w-5 h-5 rounded-lg bg-[#7B5FFF]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-[9px] font-black text-[#7B5FFF]">{i + 1}</span>
              </div>
              <p className="text-sm text-white/70 leading-relaxed">{action}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  STEP 10: Improvement Loop
// ─────────────────────────────────────────────────────────────────────────────
function Step10({ data }: { data: any }) {
  const priColor = (p: string) => p === 'High' ? '#FF5252' : p === 'Medium' ? '#F59E0B' : '#6B7280';
  return (
    <div className="space-y-5">
      <div>
        <div className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-3">Page Improvement Actions</div>
        <div className="space-y-3">
          {(data?.improvements || []).map((item: any, i: number) => (
            <div key={i} className="p-4 bg-[#0D0D0D] border border-white/[0.07] rounded-xl">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="font-mono text-xs text-[#00C4FF]">{item.page}</span>
                <span className="text-[10px] px-2 py-0.5 rounded font-bold"
                  style={{ color: priColor(item.priority), background: `${priColor(item.priority)}18` }}>
                  {item.priority} Priority
                </span>
              </div>
              <p className="text-sm text-white/60 mb-2"><span className="text-[#FF5252] font-semibold">Issue:</span> {item.issue}</p>
              <p className="text-sm text-white/70"><span className="text-[#10B981] font-semibold">Action:</span> {item.action}</p>
            </div>
          ))}
        </div>
      </div>
      <div>
        <div className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-3">Content Refresh Schedule</div>
        <div className="space-y-2">
          {(data?.contentRefreshes || []).map((r: string, i: number) => (
            <div key={i} className="flex items-center gap-2.5 p-3 bg-[#7B5FFF]/10 border border-[#7B5FFF]/20 rounded-xl text-sm text-white/70">
              <RotateCcw size={12} className="text-[#7B5FFF] flex-shrink-0" />
              {r}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  MAIN: Daily SEO Manager
// ─────────────────────────────────────────────────────────────────────────────
export function DailySEOManager() {
  const { token } = useAuth();
  const [cycle, setCycle] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [activeStep, setActiveStep] = useState(1);
  const [selectedFocus, setSelectedFocus] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  const loadLatest = useCallback(async () => {
    if (!token) return;
    try {
      const [latestRes, historyRes] = await Promise.all([
        api.seoGetLatest(token).catch(() => ({ cycle: null })),
        api.seoGetCycles(token).catch(() => ({ cycles: [] })),
      ]);
      setCycle(latestRes.cycle);
      setHistory(historyRes.cycles || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { loadLatest(); }, [loadLatest]);

  const handleRun = async () => {
    setRunning(true);
    try {
      const res = await api.seoRunCycle(token!, selectedFocus || undefined);
      setCycle(res.cycle);
      setHistory(prev => [{ id: res.cycle.id, date: res.cycle.date, generatedAt: res.cycle.generatedAt, focus: res.cycle.focus }, ...prev.slice(0, 29)]);
      setActiveStep(1);
      toast.success(`✅ SEO Cycle generated — Focus: ${res.cycle.focus}`);
    } catch (err: any) {
      toast.error(`SEO cycle error: ${err.message}`);
    } finally { setRunning(false); }
  };

  const loadCycle = async (id: string) => {
    try {
      const res = await api.seoGetCycle(token!, id);
      setCycle(res.cycle);
      setShowHistory(false);
      setActiveStep(1);
    } catch (err: any) {
      toast.error(`Failed to load cycle: ${err.message}`);
    }
  };

  const stepData: Record<number, any> = cycle ? {
    1: cycle.step1, 2: cycle.step2, 3: cycle.step3, 4: cycle.step4,
    5: cycle.step5, 6: cycle.step6, 7: cycle.step7, 8: cycle.step8,
    9: cycle.step9, 10: cycle.step10,
  } : {};

  return (
    <div className="p-5 lg:p-6 max-w-7xl mx-auto space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#00C4FF,#7B5FFF,#D63DF6)' }}>
              <TrendingUp size={16} className="text-white" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">Daily SEO Manager</h1>
          </div>
          <p className="text-white/40 text-sm ml-12">10-step automated SEO workflow · Keyword discovery → Rankings → Growth</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setShowHistory(v => !v)}
            className="flex items-center gap-2 px-3 py-2.5 bg-[#0D0D0D] border border-white/[0.07] rounded-xl text-sm text-white/60 hover:text-white transition-all">
            <Calendar size={14} /> History ({history.length})
          </button>
          <select value={selectedFocus} onChange={e => setSelectedFocus(e.target.value)}
            className="bg-[#0D0D0D] border border-white/[0.07] rounded-xl px-3 py-2.5 text-sm text-white/70 focus:outline-none max-w-[200px]">
            <option value="">Auto-select focus</option>
            {CLUSTERS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button onClick={handleRun} disabled={running}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg,#7B5FFF,#D63DF6)' }}>
            {running ? <><RefreshCw size={14} className="animate-spin" /> Running…</> : <><Play size={14} /> Run Daily Cycle</>}
          </button>
        </div>
      </div>

      {/* ── History panel ── */}
      <AnimatePresence>
        {showHistory && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="bg-[#0D0D0D] border border-white/[0.07] rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
              <span className="text-sm font-bold text-white">Cycle History</span>
              <span className="text-xs text-white/40">{history.length} cycles generated</span>
            </div>
            <div className="divide-y divide-white/[0.04] max-h-64 overflow-y-auto">
              {history.length === 0 ? (
                <div className="px-4 py-6 text-center text-white/30 text-sm">No cycles yet — run your first cycle above</div>
              ) : history.map((h: any) => (
                <button key={h.id} onClick={() => loadCycle(h.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors text-left ${cycle?.id === h.id ? 'bg-[#7B5FFF]/10' : ''}`}>
                  <div className="w-2 h-2 rounded-full bg-[#10B981] flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white font-medium">{h.date}</div>
                    <div className="text-xs text-white/40 truncate">{h.focus}</div>
                  </div>
                  <div className="text-[10px] text-white/30">{new Date(h.generatedAt).toLocaleTimeString()}</div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 rounded-full border-2 border-[#7B5FFF] border-t-transparent animate-spin" />
            <span className="text-white/40 text-sm">Loading SEO data…</span>
          </div>
        </div>
      ) : !cycle ? (
        /* Empty state */
        <div className="text-center py-24 px-4">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{ background: 'linear-gradient(135deg,rgba(0,196,255,0.15),rgba(123,95,255,0.15),rgba(214,61,246,0.15))' }}>
            <TrendingUp size={32} className="text-white/40" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No SEO Cycle Generated Yet</h3>
          <p className="text-white/40 text-sm max-w-md mx-auto mb-8 leading-relaxed">
            Run your first daily SEO cycle to get keyword reports, content strategy, article briefs, backlink strategy, and your full 10-step optimization plan for mixxea.com.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 max-w-2xl mx-auto mb-8">
            {STEPS.slice(0, 5).map(s => (
              <div key={s.n} className="p-3 bg-[#0D0D0D] border border-white/[0.07] rounded-xl text-center">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center mx-auto mb-2" style={{ background: `${s.color}18` }}>
                  <s.icon size={13} style={{ color: s.color }} />
                </div>
                <div className="text-[10px] text-white/50">{s.label}</div>
              </div>
            ))}
          </div>
          <button onClick={handleRun} disabled={running}
            className="px-8 py-4 rounded-2xl text-base font-bold text-white transition-all hover:opacity-90 disabled:opacity-50 flex items-center gap-3 mx-auto"
            style={{ background: 'linear-gradient(135deg,#7B5FFF,#D63DF6)' }}>
            {running ? <><RefreshCw size={18} className="animate-spin" /> Generating cycle…</> : <><Zap size={18} /> Run First Daily SEO Cycle</>}
          </button>
        </div>
      ) : (
        /* Cycle loaded */
        <div>
          {/* Cycle meta banner */}
          <div className="flex items-center gap-4 p-4 mb-5 rounded-2xl border"
            style={{ background: 'linear-gradient(135deg,rgba(0,196,255,0.08),rgba(123,95,255,0.08))', borderColor: 'rgba(123,95,255,0.2)' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg,#00C4FF,#7B5FFF)' }}>
              <Calendar size={16} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-white">{cycle.date} — Daily SEO Cycle</div>
              <div className="text-xs text-white/50 mt-0.5">Focus: <span className="text-[#00C4FF] font-semibold">{cycle.focus}</span> · Generated {new Date(cycle.generatedAt).toLocaleString()}</div>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#10B981]/15 border border-[#10B981]/30">
              <div className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
              <span className="text-[#10B981] text-xs font-semibold">Complete</span>
            </div>
          </div>

          {/* Step navigation */}
          <div className="flex gap-2 flex-wrap mb-5">
            {STEPS.map(s => (
              <button key={s.n} onClick={() => setActiveStep(s.n)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all border ${activeStep === s.n ? 'text-white border-transparent' : 'border-white/[0.07] text-white/50 hover:text-white bg-[#0D0D0D]'}`}
                style={activeStep === s.n ? { background: `${s.color}25`, borderColor: `${s.color}45`, color: s.color } : {}}>
                <div className="w-4 h-4 rounded flex items-center justify-center text-[9px] font-black"
                  style={{ background: activeStep === s.n ? `${s.color}40` : 'rgba(255,255,255,0.06)' }}>
                  {s.n}
                </div>
                <s.icon size={11} />
                <span className="hidden sm:inline">{s.label}</span>
              </button>
            ))}
          </div>

          {/* Active step content */}
          <AnimatePresence mode="wait">
            <motion.div key={activeStep} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }} className="bg-[#0B0B0B] border border-white/[0.07] rounded-2xl overflow-hidden">
              {/* Step header */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.06]"
                style={{ background: `linear-gradient(135deg,${STEPS[activeStep-1].color}10,transparent)` }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${STEPS[activeStep-1].color}20` }}>
                  {(() => { const S = STEPS[activeStep-1]; return <S.icon size={16} style={{ color: S.color }} />; })()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: STEPS[activeStep-1].color }}>
                      Step {activeStep}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-white">{STEPS[activeStep-1].label}</h3>
                </div>
                {/* Prev / Next */}
                <div className="ml-auto flex items-center gap-2">
                  <button onClick={() => setActiveStep(s => Math.max(1, s - 1))} disabled={activeStep === 1}
                    className="p-1.5 rounded-lg bg-white/[0.05] text-white/40 hover:text-white disabled:opacity-30 transition-all">
                    <ChevronDown size={13} className="rotate-90" />
                  </button>
                  <button onClick={() => setActiveStep(s => Math.min(10, s + 1))} disabled={activeStep === 10}
                    className="p-1.5 rounded-lg bg-white/[0.05] text-white/40 hover:text-white disabled:opacity-30 transition-all">
                    <ChevronRight size={13} />
                  </button>
                </div>
              </div>

              <div className="p-5">
                {activeStep === 1  && <Step1  data={stepData[1]}  />}
                {activeStep === 2  && <Step2  data={stepData[2]}  />}
                {activeStep === 3  && <Step3  data={stepData[3]}  />}
                {activeStep === 4  && <Step4  data={stepData[4]}  />}
                {activeStep === 5  && <Step5  data={stepData[5]}  />}
                {activeStep === 6  && <Step6  data={stepData[6]}  />}
                {activeStep === 7  && <Step7  data={stepData[7]}  />}
                {activeStep === 8  && <Step8  data={stepData[8]}  />}
                {activeStep === 9  && <Step9  data={stepData[9]}  />}
                {activeStep === 10 && <Step10 data={stepData[10]} />}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Step progress dots */}
          <div className="flex items-center justify-center gap-2 mt-4">
            {STEPS.map(s => (
              <button key={s.n} onClick={() => setActiveStep(s.n)}
                className={`w-2 h-2 rounded-full transition-all ${activeStep === s.n ? 'w-6' : 'bg-white/[0.12] hover:bg-white/25'}`}
                style={activeStep === s.n ? { background: STEPS[s.n-1].color } : {}} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
