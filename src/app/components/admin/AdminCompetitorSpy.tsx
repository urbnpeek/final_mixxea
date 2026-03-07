// ─────────────────────────────────────────────────────────────────────────────
//  MIXXEA — Feature 9: Competitor Keyword Spy Tool (Admin)
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../dashboard/AuthContext';
import * as api from '../dashboard/api';
import { Search, TrendingUp, AlertCircle, CheckCircle, ExternalLink, Zap, Globe, BarChart3 } from 'lucide-react';

export function AdminCompetitorSpy() {
  const { token } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeComp, setActiveComp] = useState(0);

  useEffect(() => {
    if (!token) return;
    api.getCompetitors(token).then((r: any) => setData(r)).catch(() => {}).finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div className="flex items-center justify-center py-16"><div className="w-8 h-8 rounded-full border-2 border-[#7B5FFF] border-t-transparent animate-spin" /></div>;

  const competitor = data?.competitors?.[activeComp];
  const opps = data?.opportunityKeywords || [];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white mb-1">Competitor Keyword Intelligence</h1>
        <p className="text-white/40 text-sm">What keywords do DistroKid, TuneCore, and CD Baby rank for that MIXXEA doesn't?</p>
      </div>

      {/* Opportunity alerts */}
      <div className="p-4 rounded-2xl border border-[#F59E0B]/25" style={{ background: 'rgba(245,158,11,0.07)' }}>
        <div className="flex items-center gap-2 mb-3">
          <Zap size={14} className="text-[#F59E0B]" />
          <span className="text-sm font-bold text-white">🎯 High-Value Keyword Gaps Found</span>
        </div>
        <p className="text-xs text-white/50">{opps.filter((o: any) => o.opportunity === 'Critical').length} critical and {opps.filter((o: any) => o.opportunity === 'High').length} high-opportunity keywords where MIXXEA has zero competition — easy wins for SEO content.</p>
      </div>

      {/* Competitors nav */}
      <div className="flex gap-2 overflow-x-auto scrollbar-none">
        {(data?.competitors || []).map((comp: any, i: number) => (
          <button key={comp.name} onClick={() => setActiveComp(i)}
            className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all ${activeComp === i ? 'text-white border-transparent' : 'text-white/50 bg-[#0D0D0D] border-white/[0.07] hover:text-white'}`}
            style={activeComp === i ? { background: 'linear-gradient(135deg,#7B5FFF,#D63DF6)', borderColor: 'transparent' } : {}}>
            {comp.name}
          </button>
        ))}
      </div>

      {/* Competitor detail */}
      {competitor && (
        <motion.div key={competitor.name} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="bg-[#0D0D0D] border border-white/[0.07] rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-white/[0.05] flex items-center justify-between">
            <div>
              <div className="text-base font-black text-white mb-0.5">{competitor.name}</div>
              <div className="flex items-center gap-3 text-xs text-white/40">
                <span className="flex items-center gap-1"><Globe size={10} /> {competitor.domain}</span>
                <span className="flex items-center gap-1"><TrendingUp size={10} /> ~{competitor.estimatedTraffic}/mo</span>
              </div>
            </div>
            <a href={`https://${competitor.domain}`} target="_blank" rel="noopener noreferrer"
              className="text-white/30 hover:text-white transition-colors">
              <ExternalLink size={14} />
            </a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.05]">
                  {['Keyword', 'Monthly Volume', 'Their Rank', 'Our Rank', 'Gap'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-[10px] font-semibold text-white/30 uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {competitor.topKeywords.map((kw: any, i: number) => (
                  <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3 font-semibold text-white">{kw.keyword}</td>
                    <td className="px-5 py-3 text-white/60">{kw.volume}</td>
                    <td className="px-5 py-3">
                      <span className="text-[#FF5252] font-bold">#{kw.theirRank}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-white/30 text-xs">Not ranking</span>
                    </td>
                    <td className="px-5 py-3">
                      {kw.gap ? (
                        <span className="flex items-center gap-1 text-[#F59E0B] text-xs font-semibold">
                          <AlertCircle size={11} /> Content Gap
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-white/30 text-xs">
                          <CheckCircle size={11} /> Branded only
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Opportunity keywords */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Zap size={14} className="text-[#D63DF6]" />
          <h2 className="text-base font-bold text-white">Quick-Win Keyword Opportunities</h2>
        </div>
        <div className="space-y-2">
          {opps.map((opp: any, i: number) => (
            <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
              className="flex items-center gap-4 p-4 bg-[#0D0D0D] border border-white/[0.07] rounded-xl hover:border-white/[0.12] transition-all">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-white mb-0.5">{opp.keyword}</div>
                <div className="flex items-center gap-3 text-xs text-white/40">
                  <span>{opp.volume}/mo</span>
                  <span>Difficulty: {opp.difficulty}</span>
                  <span className="text-white/25">{opp.competitors[0]}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${opp.opportunity === 'Critical' ? 'text-[#FF5252] bg-[#FF5252]/15' : 'text-[#F59E0B] bg-[#F59E0B]/15'}`}>
                  {opp.opportunity}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
        <div className="mt-4 p-4 bg-[#0D0D0D] border border-dashed border-[#7B5FFF]/30 rounded-xl text-center">
          <p className="text-xs text-white/40 mb-2">Generate SEO articles for these keywords automatically</p>
          <a href="/admin/seo/daily" className="text-sm font-semibold text-[#7B5FFF] hover:text-[#D63DF6] transition-colors">
            Go to Daily SEO Manager →
          </a>
        </div>
      </div>
    </div>
  );
}
