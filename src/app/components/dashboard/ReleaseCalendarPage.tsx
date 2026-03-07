// ─────────────────────────────────────────────────────────────────────────────
//  MIXXEA — Feature 5: Release Calendar
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useAuth } from './AuthContext';
import * as api from './api';
import { Link } from 'react-router';
import { CalendarDays, Music, ChevronLeft, ChevronRight, Plus, Clock, CheckCircle, AlertCircle } from 'lucide-react';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const statusColors: Record<string, string> = {
  live: '#10B981', distributed: '#10B981', approved: '#00C4FF',
  pending: '#F59E0B', submitted: '#F59E0B', rejected: '#FF5252',
  draft: '#555',
};

export function ReleaseCalendarPage() {
  const { token } = useAuth();
  const [releases, setReleases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [today] = useState(new Date());
  const [view, setView] = useState({ year: new Date().getFullYear(), month: new Date().getMonth() });
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    api.getReleases(token).then((r: any) => setReleases(r.releases || [])).catch(() => {}).finally(() => setLoading(false));
  }, [token]);

  const prevMonth = () => setView(v => v.month === 0 ? { year: v.year - 1, month: 11 } : { ...v, month: v.month - 1 });
  const nextMonth = () => setView(v => v.month === 11 ? { year: v.year + 1, month: 0 } : { ...v, month: v.month + 1 });

  const firstDay = new Date(view.year, view.month, 1).getDay();
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();

  // Map releases to calendar days
  const releasesByDay: Record<number, any[]> = {};
  releases.forEach(r => {
    const d = r.releaseDate || r.createdAt;
    if (!d) return;
    const rDate = new Date(d);
    if (rDate.getFullYear() === view.year && rDate.getMonth() === view.month) {
      const day = rDate.getDate();
      if (!releasesByDay[day]) releasesByDay[day] = [];
      releasesByDay[day].push(r);
    }
  });

  const upcomingReleases = releases
    .filter(r => r.releaseDate && new Date(r.releaseDate) >= today)
    .sort((a, b) => new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime())
    .slice(0, 5);

  const selectedDayReleases = selected ? (releasesByDay[parseInt(selected)] || []) : [];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white mb-1">Release Calendar</h1>
          <p className="text-white/40 text-sm">Track all your scheduled releases and deadlines</p>
        </div>
        <Link to="/dashboard/distribution"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white"
          style={{ background: 'linear-gradient(135deg,#7B5FFF,#D63DF6)' }}>
          <Plus size={14} /> New Release
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2">
          <div className="bg-[#0D0D0D] border border-white/[0.07] rounded-2xl overflow-hidden">
            {/* Calendar header */}
            <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
              <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/[0.05] text-white/60 hover:text-white transition-all">
                <ChevronLeft size={16} />
              </button>
              <span className="text-base font-bold text-white">{MONTHS[view.month]} {view.year}</span>
              <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/[0.05] text-white/60 hover:text-white transition-all">
                <ChevronRight size={16} />
              </button>
            </div>
            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-white/[0.04]">
              {DAYS.map(d => (
                <div key={d} className="py-2 text-center text-[10px] font-semibold text-white/30 uppercase tracking-wider">{d}</div>
              ))}
            </div>
            {/* Days grid */}
            <div className="grid grid-cols-7">
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} className="h-16 border-b border-r border-white/[0.03]" />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const isToday = today.getDate() === day && today.getMonth() === view.month && today.getFullYear() === view.year;
                const hasReleases = !!releasesByDay[day];
                const isSelected = selected === String(day);
                return (
                  <motion.button key={day} whileHover={{ scale: 1.02 }}
                    onClick={() => setSelected(isSelected ? null : String(day))}
                    className={`h-16 flex flex-col items-center justify-start pt-2 border-b border-r border-white/[0.03] relative transition-all ${isSelected ? 'bg-[#7B5FFF]/15' : hasReleases ? 'hover:bg-white/[0.02]' : 'hover:bg-white/[0.02]'}`}>
                    <span className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full transition-all ${isToday ? 'text-black font-bold' : isSelected ? 'text-[#7B5FFF]' : 'text-white/60'}`}
                      style={isToday ? { background: 'linear-gradient(135deg,#7B5FFF,#D63DF6)' } : {}}>
                      {day}
                    </span>
                    {hasReleases && (
                      <div className="flex gap-0.5 mt-1">
                        {releasesByDay[day].slice(0, 3).map((r: any, ri: number) => (
                          <div key={ri} className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: statusColors[r.status] || '#7B5FFF' }} />
                        ))}
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Selected day panel */}
          {selected && selectedDayReleases.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="mt-4 bg-[#0D0D0D] border border-white/[0.07] rounded-2xl p-4">
              <div className="text-sm font-bold text-white mb-3">{MONTHS[view.month]} {selected}, {view.year}</div>
              <div className="space-y-2">
                {selectedDayReleases.map((r: any) => (
                  <div key={r.id} className="flex items-center gap-3 p-3 bg-[#050505] rounded-xl">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(123,95,255,0.2)' }}>
                      <Music size={14} className="text-[#7B5FFF]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-white truncate">{r.title}</div>
                      <div className="text-xs text-white/40">{r.artistName} · {r.type}</div>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full capitalize"
                      style={{ color: statusColors[r.status] || '#555', background: `${statusColors[r.status] || '#555'}20` }}>
                      {r.status}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Legend */}
          <div className="bg-[#0D0D0D] border border-white/[0.07] rounded-2xl p-4">
            <div className="text-xs font-bold text-white/50 uppercase tracking-widest mb-3">Status Legend</div>
            <div className="space-y-2">
              {[
                { status: 'live', label: 'Live / Distributed' },
                { status: 'approved', label: 'Approved' },
                { status: 'pending', label: 'Pending Review' },
                { status: 'rejected', label: 'Rejected' },
                { status: 'draft', label: 'Draft' },
              ].map(({ status, label }) => (
                <div key={status} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: statusColors[status] }} />
                  <span className="text-xs text-white/60">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming releases */}
          <div className="bg-[#0D0D0D] border border-white/[0.07] rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock size={13} className="text-[#00C4FF]" />
              <span className="text-sm font-bold text-white">Upcoming Releases</span>
            </div>
            {loading ? (
              <div className="text-xs text-white/30 py-4 text-center">Loading…</div>
            ) : upcomingReleases.length === 0 ? (
              <div className="text-xs text-white/30 py-4 text-center">No upcoming releases</div>
            ) : (
              <div className="space-y-2">
                {upcomingReleases.map(r => {
                  const d = new Date(r.releaseDate);
                  const daysUntil = Math.max(0, Math.ceil((d.getTime() - today.getTime()) / 86400000));
                  return (
                    <div key={r.id} className="p-3 bg-[#050505] rounded-xl">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-white truncate max-w-[140px]">{r.title}</span>
                        <span className="text-[10px] text-[#00C4FF] font-bold flex-shrink-0">{daysUntil === 0 ? 'Today' : `${daysUntil}d`}</span>
                      </div>
                      <div className="text-[10px] text-white/30">{d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="bg-[#0D0D0D] border border-white/[0.07] rounded-2xl p-4">
            <div className="text-xs font-bold text-white/50 uppercase tracking-widest mb-3">Release Stats</div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Total', value: releases.length, icon: CalendarDays },
                { label: 'Live', value: releases.filter(r => r.status === 'live' || r.status === 'distributed').length, icon: CheckCircle },
                { label: 'Pending', value: releases.filter(r => r.status === 'pending' || r.status === 'submitted').length, icon: Clock },
                { label: 'Rejected', value: releases.filter(r => r.status === 'rejected').length, icon: AlertCircle },
              ].map(s => (
                <div key={s.label} className="p-3 bg-[#050505] rounded-xl text-center">
                  <div className="text-xl font-black text-white">{s.value}</div>
                  <div className="text-[10px] text-white/40 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
