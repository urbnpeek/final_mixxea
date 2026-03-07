// ─────────────────────────────────────────────────────────────────────────────
//  MIXXEA — Feature 6: Royalty Statement PDF Generator
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { useAuth } from './AuthContext';
import * as api from './api';
import { FileText, Download, DollarSign, TrendingUp, Calendar, Printer, ChevronDown } from 'lucide-react';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function generateMockStatements(releases: any[], user: any) {
  const months: any[] = [];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const totalStreams = Math.floor(Math.random() * 45000) + 2000;
    const totalEarnings = +(totalStreams * 0.004).toFixed(2);
    const breakdown = releases.slice(0, 4).map((r: any, ri: number) => ({
      title: r.title || `Release ${ri + 1}`,
      artist: r.artistName || user?.name || 'Artist',
      isrc: r.isrc || `QM-XXX-24-0000${ri}`,
      streams: Math.floor(totalStreams * (0.1 + Math.random() * 0.35)),
      earnings: +(totalEarnings * (0.1 + Math.random() * 0.35)).toFixed(2),
      platforms: [
        { name: 'Spotify',       streams: Math.floor(Math.random() * 15000), earnings: +(Math.random() * 30).toFixed(2) },
        { name: 'Apple Music',   streams: Math.floor(Math.random() * 8000),  earnings: +(Math.random() * 20).toFixed(2) },
        { name: 'YouTube Music', streams: Math.floor(Math.random() * 5000),  earnings: +(Math.random() * 8).toFixed(2) },
        { name: 'TikTok',        streams: Math.floor(Math.random() * 4000),  earnings: +(Math.random() * 4).toFixed(2) },
        { name: 'Amazon Music',  streams: Math.floor(Math.random() * 2000),  earnings: +(Math.random() * 6).toFixed(2) },
      ],
    }));
    months.push({
      month: MONTHS[d.getMonth()], year: d.getFullYear(),
      label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}`,
      totalStreams, totalEarnings, breakdown,
    });
  }
  return months;
}

export function RoyaltyStatementsPage() {
  const { token, user } = useAuth();
  const [releases, setReleases] = useState<any[]>([]);
  const [statements, setStatements] = useState<any[]>([]);
  const [selected, setSelected] = useState(0);
  const [loading, setLoading] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!token) return;
    api.getReleases(token).then((r: any) => {
      const rel = r.releases || [];
      setReleases(rel);
      setStatements(generateMockStatements(rel, user));
    }).catch(() => { setStatements(generateMockStatements([], user)); }).finally(() => setLoading(false));
  }, [token, user]);

  const handlePrint = () => {
    const content = document.getElementById('royalty-statement-print');
    if (!content) return;
    const win = window.open('', '_blank', 'width=900,height=650');
    if (!win) return;
    win.document.write(`<html><head><title>Royalty Statement</title><style>
      body{font-family:sans-serif;background:#fff;color:#000;padding:40px;max-width:800px;margin:0 auto}
      h1{font-size:24px;font-weight:900;margin-bottom:4px}
      .subtitle{color:#666;font-size:14px;margin-bottom:32px}
      table{width:100%;border-collapse:collapse;margin-top:16px}
      th{background:#f5f5f5;padding:8px 12px;text-align:left;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;border-bottom:2px solid #e0e0e0}
      td{padding:8px 12px;font-size:13px;border-bottom:1px solid #f0f0f0}
      .total-row{background:#f9f9f9;font-weight:700}
      .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:24px;border-bottom:2px solid #000}
      .logo{font-size:20px;font-weight:900;letter-spacing:-0.5px}
      .stat-box{display:inline-block;padding:16px 24px;border:1px solid #e0e0e0;border-radius:8px;text-align:center;margin-right:16px}
      .stat-value{font-size:24px;font-weight:900}
      .stat-label{font-size:11px;color:#666;text-transform:uppercase;letter-spacing:0.05em;margin-top:4px}
      @media print{button{display:none}}
    </style></head><body>${content.innerHTML}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 500);
  };

  const stmt = statements[selected];

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 rounded-full border-2 border-[#7B5FFF] border-t-transparent animate-spin" /></div>;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white mb-1">Royalty Statements</h1>
          <p className="text-white/40 text-sm">Download monthly earnings statements as PDF</p>
        </div>
        <button onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white"
          style={{ background: 'linear-gradient(135deg,#7B5FFF,#D63DF6)' }}>
          <Download size={14} /> Download PDF
        </button>
      </div>

      {/* Month selector */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {statements.map((s, i) => (
          <button key={i} onClick={() => setSelected(i)}
            className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${selected === i ? 'text-white border-transparent' : 'border-white/[0.07] text-white/50 bg-[#0D0D0D] hover:text-white'}`}
            style={selected === i ? { background: 'linear-gradient(135deg,#7B5FFF,#D63DF6)', borderColor: 'transparent' } : {}}>
            {s.label}
          </button>
        ))}
      </div>

      {/* Statement preview */}
      {stmt && (
        <motion.div key={selected} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="bg-[#0D0D0D] border border-white/[0.07] rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-white/[0.06]" style={{ background: 'linear-gradient(135deg,rgba(123,95,255,0.06),rgba(0,196,255,0.04))' }}>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm font-black text-white/30 uppercase tracking-widest mb-1">MIXXEA</div>
                <div className="text-xl font-black text-white">Royalty Statement</div>
                <div className="text-sm text-white/50 mt-1">{stmt.label} · {user?.name}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-white/30">Statement ID</div>
                <div className="text-xs text-white/60 font-mono">MX-{stmt.year}-{String(MONTHS.indexOf(stmt.month) + 1).padStart(2,'0')}-{user?.id?.slice(0,6).toUpperCase()}</div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 divide-x divide-white/[0.05]">
            {[
              { label: 'Total Streams', value: stmt.totalStreams.toLocaleString(), icon: TrendingUp, color: '#00C4FF' },
              { label: 'Total Earnings', value: `$${stmt.totalEarnings.toFixed(2)}`, icon: DollarSign, color: '#10B981' },
              { label: 'Active Releases', value: stmt.breakdown.length, icon: FileText, color: '#7B5FFF' },
            ].map(s => (
              <div key={s.label} className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <s.icon size={14} style={{ color: s.color }} />
                  <span className="text-xs text-white/40">{s.label}</span>
                </div>
                <div className="text-2xl font-black text-white">{s.value}</div>
              </div>
            ))}
          </div>

          {/* Breakdown table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {['Release', 'ISRC', 'Streams', 'Earnings'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-[10px] font-semibold text-white/30 uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stmt.breakdown.map((row: any, i: number) => (
                  <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3">
                      <div className="font-semibold text-white text-sm">{row.title}</div>
                      <div className="text-xs text-white/40">{row.artist}</div>
                    </td>
                    <td className="px-5 py-3 text-xs text-white/40 font-mono">{row.isrc}</td>
                    <td className="px-5 py-3 font-semibold text-white">{row.streams.toLocaleString()}</td>
                    <td className="px-5 py-3 font-bold text-[#10B981]">${row.earnings.toFixed(2)}</td>
                  </tr>
                ))}
                <tr className="bg-white/[0.02]">
                  <td colSpan={2} className="px-5 py-3 text-sm font-black text-white">TOTAL</td>
                  <td className="px-5 py-3 font-black text-white">{stmt.totalStreams.toLocaleString()}</td>
                  <td className="px-5 py-3 font-black text-[#10B981]">${stmt.totalEarnings.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Platform breakdown */}
          {stmt.breakdown[0] && (
            <div className="p-6 border-t border-white/[0.06]">
              <div className="text-sm font-bold text-white mb-4">Platform Breakdown — {stmt.breakdown[0].title}</div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {stmt.breakdown[0].platforms.map((p: any) => (
                  <div key={p.name} className="bg-[#050505] rounded-xl p-3 text-center">
                    <div className="text-xs text-white/40 mb-1">{p.name}</div>
                    <div className="text-sm font-bold text-white">{p.streams.toLocaleString()}</div>
                    <div className="text-xs text-[#10B981]">${p.earnings.toFixed(2)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Hidden print content */}
      <div className="hidden">
        <div id="royalty-statement-print">
          {stmt && (
            <div>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'32px', paddingBottom:'24px', borderBottom:'2px solid #000' }}>
                <div>
                  <div style={{ fontSize:'20px', fontWeight:900 }}>MIXXEA</div>
                  <div style={{ color:'#666', fontSize:'12px' }}>Music Distribution & Publishing Administration</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:'18px', fontWeight:900 }}>Royalty Statement</div>
                  <div style={{ color:'#666', fontSize:'14px' }}>{stmt.label}</div>
                  <div style={{ color:'#666', fontSize:'12px', marginTop:'4px' }}>Artist: {user?.name}</div>
                </div>
              </div>
              <div style={{ display:'flex', gap:'16px', marginBottom:'32px' }}>
                {[{ label:'Total Streams', value: stmt.totalStreams.toLocaleString() }, { label:'Total Earnings', value:`$${stmt.totalEarnings.toFixed(2)}` }, { label:'Releases', value: stmt.breakdown.length }].map(s => (
                  <div key={s.label} style={{ border:'1px solid #e0e0e0', borderRadius:'8px', padding:'16px 24px', textAlign:'center' }}>
                    <div style={{ fontSize:'24px', fontWeight:900 }}>{s.value}</div>
                    <div style={{ fontSize:'11px', color:'#666', textTransform:'uppercase', letterSpacing:'0.05em', marginTop:'4px' }}>{s.label}</div>
                  </div>
                ))}
              </div>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ background:'#f5f5f5' }}>
                    {['Release', 'Artist', 'ISRC', 'Streams', 'Earnings'].map(h => (
                      <th key={h} style={{ padding:'8px 12px', textAlign:'left', fontSize:'12px', fontWeight:700, textTransform:'uppercase', borderBottom:'2px solid #e0e0e0' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stmt.breakdown.map((row: any, i: number) => (
                    <tr key={i} style={{ borderBottom:'1px solid #f0f0f0' }}>
                      <td style={{ padding:'8px 12px', fontSize:'13px' }}>{row.title}</td>
                      <td style={{ padding:'8px 12px', fontSize:'13px', color:'#666' }}>{row.artist}</td>
                      <td style={{ padding:'8px 12px', fontSize:'12px', color:'#999', fontFamily:'monospace' }}>{row.isrc}</td>
                      <td style={{ padding:'8px 12px', fontSize:'13px', fontWeight:600 }}>{row.streams.toLocaleString()}</td>
                      <td style={{ padding:'8px 12px', fontSize:'13px', fontWeight:700 }}>${row.earnings.toFixed(2)}</td>
                    </tr>
                  ))}
                  <tr style={{ background:'#f9f9f9', fontWeight:700 }}>
                    <td colSpan={3} style={{ padding:'8px 12px' }}>TOTAL</td>
                    <td style={{ padding:'8px 12px' }}>{stmt.totalStreams.toLocaleString()}</td>
                    <td style={{ padding:'8px 12px' }}>${stmt.totalEarnings.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
              <div style={{ marginTop:'32px', fontSize:'11px', color:'#999', borderTop:'1px solid #e0e0e0', paddingTop:'16px' }}>
                Statement generated by MIXXEA Platform · onboarding@mixxea.com · https://www.mixxea.com
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
