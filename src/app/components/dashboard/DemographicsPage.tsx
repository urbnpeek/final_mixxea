// ─────────────────────────────────────────────────────────────────────────────
//  MIXXEA — Feature 8: Audience Demographics Dashboard
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useAuth } from './AuthContext';
import * as api from './api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis } from 'recharts';
import { Globe, Users, Clock, Music, TrendingUp } from 'lucide-react';

const ACCENT = ['#7B5FFF','#D63DF6','#00C4FF','#FF5252','#10B981','#F59E0B','#FF5252','#7B5FFF','#D63DF6'];

export function DemographicsPage() {
  const { token } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'geo'|'age'|'platforms'|'time'>('geo');

  useEffect(() => {
    if (!token) return;
    api.getDemographics(token).then((r: any) => setData(r.demographics)).catch(() => {}).finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 rounded-full border-2 border-[#7B5FFF] border-t-transparent animate-spin" /></div>;
  if (!data) return null;

  const totalListeners = data.countries.reduce((s: number, c: any) => s + c.listeners, 0);

  const TABS = [
    { id: 'geo', label: 'Geography', icon: Globe },
    { id: 'age', label: 'Age & Gender', icon: Users },
    { id: 'platforms', label: 'Platforms', icon: Music },
    { id: 'time', label: 'Peak Hours', icon: Clock },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white mb-1">Audience Demographics</h1>
        <p className="text-white/40 text-sm">Understand who listens to your music and where</p>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Listeners', value: totalListeners.toLocaleString(), icon: Users, color: '#7B5FFF' },
          { label: 'Top Country', value: data.countries[0]?.country || '—', icon: Globe, color: '#00C4FF' },
          { label: 'Primary Age', value: data.ageGroups?.sort((a: any, b: any) => b.pct - a.pct)[0]?.range || '—', icon: TrendingUp, color: '#D63DF6' },
          { label: 'Top Platform', value: data.platforms[0]?.platform || '—', icon: Music, color: '#10B981' },
        ].map(s => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="bg-[#0D0D0D] border border-white/[0.07] rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-white/40">{s.label}</span>
              <s.icon size={14} style={{ color: s.color }} />
            </div>
            <div className="text-lg font-black text-white">{s.value}</div>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/[0.06] pb-0">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all -mb-px ${tab === t.id ? 'text-[#7B5FFF] border-[#7B5FFF]' : 'text-white/40 border-transparent hover:text-white'}`}>
            <t.icon size={13} /> {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        {tab === 'geo' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-[#0D0D0D] border border-white/[0.07] rounded-2xl p-5">
              <div className="text-sm font-bold text-white mb-4">Listeners by Country</div>
              <div className="space-y-3">
                {data.countries.map((c: any, i: number) => (
                  <div key={c.code}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-white">{c.country}</span>
                      <div className="flex items-center gap-2 text-xs text-white/40">
                        <span>{c.listeners.toLocaleString()}</span>
                        <span className="font-bold" style={{ color: ACCENT[i % ACCENT.length] }}>{c.pct}%</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${c.pct}%` }} transition={{ delay: i * 0.05, duration: 0.6 }}
                        className="h-full rounded-full" style={{ backgroundColor: ACCENT[i % ACCENT.length] }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-[#0D0D0D] border border-white/[0.07] rounded-2xl p-5">
              <div className="text-sm font-bold text-white mb-4">Geographic Distribution</div>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={data.countries.slice(0, 6)} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="listeners">
                    {data.countries.slice(0, 6).map((_: any, i: number) => <Cell key={i} fill={ACCENT[i % ACCENT.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }} formatter={(v: any) => [v.toLocaleString(), 'Listeners']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-2 mt-2 justify-center">
                {data.countries.slice(0, 6).map((c: any, i: number) => (
                  <div key={c.code} className="flex items-center gap-1.5 text-xs text-white/50">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ACCENT[i % ACCENT.length] }} />
                    {c.country}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'age' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-[#0D0D0D] border border-white/[0.07] rounded-2xl p-5">
              <div className="text-sm font-bold text-white mb-4">Age Distribution</div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data.ageGroups} barSize={32}>
                  <XAxis dataKey="range" tick={{ fill: '#555', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#555', fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
                  <Tooltip contentStyle={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }} formatter={(v: any) => [`${v}%`, 'Listeners']} />
                  <Bar dataKey="pct" radius={[6,6,0,0]} fill="url(#ageGrad)" />
                  <defs>
                    <linearGradient id="ageGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#7B5FFF" />
                      <stop offset="100%" stopColor="#D63DF6" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-[#0D0D0D] border border-white/[0.07] rounded-2xl p-5">
              <div className="text-sm font-bold text-white mb-4">Gender Breakdown</div>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={data.gender} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={4} dataKey="pct">
                    {data.gender.map((_: any, i: number) => <Cell key={i} fill={['#7B5FFF','#D63DF6','#00C4FF'][i]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }} formatter={(v: any) => [`${v}%`, 'Listeners']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-6 mt-2">
                {data.gender.map((g: any, i: number) => (
                  <div key={g.label} className="text-center">
                    <div className="text-lg font-black" style={{ color: ['#7B5FFF','#D63DF6','#00C4FF'][i] }}>{g.pct}%</div>
                    <div className="text-xs text-white/40">{g.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'platforms' && (
          <div className="bg-[#0D0D0D] border border-white/[0.07] rounded-2xl p-5">
            <div className="text-sm font-bold text-white mb-5">Listeners by Streaming Platform</div>
            <div className="space-y-4">
              {data.platforms.map((p: any, i: number) => (
                <div key={p.platform}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-semibold text-white">{p.platform}</span>
                    <div className="flex items-center gap-3 text-xs text-white/40">
                      <span>{p.listeners.toLocaleString()} listeners</span>
                      <span className="font-bold" style={{ color: ACCENT[i % ACCENT.length] }}>{p.pct}%</span>
                    </div>
                  </div>
                  <div className="h-2 bg-white/[0.05] rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${p.pct}%` }} transition={{ delay: i * 0.07, duration: 0.7 }}
                      className="h-full rounded-full" style={{ backgroundColor: ACCENT[i % ACCENT.length] }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'time' && (
          <div className="bg-[#0D0D0D] border border-white/[0.07] rounded-2xl p-5">
            <div className="text-sm font-bold text-white mb-5">Peak Listening Hours (your timezone)</div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.peakHours} barSize={24}>
                <XAxis dataKey="hour" tick={{ fill: '#555', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#555', fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 110]} />
                <Tooltip contentStyle={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }} formatter={(v: any) => [`${v}`, 'Activity Index']} />
                <Bar dataKey="index" radius={[4,4,0,0]} fill="url(#timeGrad)" />
                <defs>
                  <linearGradient id="timeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00C4FF" />
                    <stop offset="100%" stopColor="#7B5FFF" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
            <p className="text-xs text-white/30 mt-3 text-center">Schedule social posts and release campaigns during peak listening hours for maximum impact</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
