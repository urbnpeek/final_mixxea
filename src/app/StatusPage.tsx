// ─────────────────────────────────────────────────────────────────────────────
//  MIXXEA — Feature 14: Public Status Page (/status)
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router';
import * as api from "./dashboard/api";
import { CheckCircle, AlertCircle, XCircle, RefreshCw, Clock, Activity, Zap } from 'lucide-react';
import { useSEOPage } from "./seo/useSEO";

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  operational: { label: 'Operational', color: '#10B981', icon: CheckCircle },
  degraded:    { label: 'Degraded',    color: '#F59E0B', icon: AlertCircle },
  outage:      { label: 'Outage',      color: '#FF5252', icon: XCircle },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status] || statusConfig.operational;
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.color }} />
      <span className="text-xs font-semibold" style={{ color: cfg.color }}>{cfg.label}</span>
    </div>
  );
}

export function StatusPage() {
  useSEOPage({ title: 'System Status — MIXXEA', description: 'Real-time status of all MIXXEA platform services.', keywords: ['mixxea status', 'mixxea uptime'] });
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const load = () => {
    api.getStatus().then((r: any) => setStatus(r)).catch(() => {}).finally(() => { setLoading(false); setLastRefresh(new Date()); });
  };

  useEffect(() => { load(); const i = setInterval(load, 60000); return () => clearInterval(i); }, []);

  const overallOk = status?.overallStatus === 'operational';
  const overallColor = overallOk ? '#10B981' : '#F59E0B';

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06] backdrop-blur-xl" style={{ background: 'rgba(0,0,0,0.85)' }}>
        <div className="max-w-5xl mx-auto px-5 py-4 flex items-center justify-between">
          <Link to="/" className="text-xl font-black tracking-tighter"
            style={{ background: 'linear-gradient(135deg,#00C4FF,#7B5FFF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            MIXXEA
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/blog" className="text-sm text-white/50 hover:text-white transition-colors">Blog</Link>
            <Link to="/auth" className="px-4 py-2 rounded-xl text-sm font-bold text-white" style={{ background: 'linear-gradient(135deg,#7B5FFF,#D63DF6)' }}>Get Started</Link>
          </div>
        </div>
      </nav>

      <div className="pt-28 pb-20 px-5 max-w-4xl mx-auto">
        {/* Overall status hero */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12">
          <div className={`inline-flex w-20 h-20 rounded-2xl items-center justify-center mb-6`}
            style={{ background: `${overallColor}15`, border: `1px solid ${overallColor}30` }}>
            {overallOk
              ? <CheckCircle size={36} style={{ color: overallColor }} />
              : <AlertCircle size={36} style={{ color: overallColor }} />}
          </div>
          <h1 className="text-4xl font-black text-white mb-2">
            {loading ? 'Checking…' : overallOk ? 'All Systems Operational' : 'Service Degradation Detected'}
          </h1>
          <p className="text-white/40 text-sm">
            Last updated: {lastRefresh.toLocaleTimeString()}
            <button onClick={load} className="ml-3 text-[#7B5FFF] hover:text-[#D63DF6] transition-colors">
              <RefreshCw size={12} className="inline" />
            </button>
          </p>
        </motion.div>

        {/* Services grid */}
        {status?.services && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-[#0D0D0D] border border-white/[0.07] rounded-2xl overflow-hidden mb-6">
            <div className="px-5 py-4 border-b border-white/[0.05] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity size={14} className="text-[#7B5FFF]" />
                <span className="text-sm font-bold text-white">Service Status</span>
              </div>
              <StatusBadge status={status.overallStatus} />
            </div>
            <div className="divide-y divide-white/[0.03]">
              {status.services.map((svc: any, i: number) => {
                const cfg = statusConfig[svc.status] || statusConfig.operational;
                return (
                  <motion.div key={svc.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                    className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full flex-shrink-0 animate-pulse" style={{ backgroundColor: cfg.color }} />
                      <div>
                        <div className="text-sm font-semibold text-white">{svc.name}</div>
                        <div className="text-xs text-white/30">Response: {svc.responseMs}ms · Uptime: {svc.uptimePct}%</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <div className="hidden sm:block">
                        <div className="h-1.5 w-24 bg-white/[0.05] rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${svc.uptimePct}%`, backgroundColor: cfg.color }} />
                        </div>
                      </div>
                      <StatusBadge status={svc.status} />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Incidents */}
        {status?.incidents?.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="bg-[#0D0D0D] border border-white/[0.07] rounded-2xl overflow-hidden mb-6">
            <div className="px-5 py-4 border-b border-white/[0.05]">
              <span className="text-sm font-bold text-white">Past Incidents</span>
            </div>
            {status.incidents.map((inc: any) => (
              <div key={inc.id} className="px-5 py-4 border-b border-white/[0.03] last:border-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize"
                        style={{ color: inc.status === 'resolved' ? '#10B981' : '#F59E0B', background: (inc.status === 'resolved' ? '#10B981' : '#F59E0B') + '20' }}>
                        {inc.status}
                      </span>
                      <span className="text-xs font-semibold text-white">{inc.title}</span>
                    </div>
                    <div className="text-xs text-white/30">
                      Affected: {inc.affectedServices.join(', ')} · Impact: {inc.impact}
                      {inc.resolvedAt && ` · Resolved ${new Date(inc.resolvedAt).toLocaleDateString()}`}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {/* Uptime summary */}
        {status?.services && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="grid grid-cols-3 gap-4">
            {[
              { label: '30-Day Uptime', value: `${(status.services.reduce((s: number, sv: any) => s + sv.uptimePct, 0) / status.services.length).toFixed(2)}%`, color: '#10B981' },
              { label: 'Avg Response', value: `${Math.round(status.services.reduce((s: number, sv: any) => s + sv.responseMs, 0) / status.services.length)}ms`, color: '#00C4FF' },
              { label: 'Active Services', value: `${status.services.filter((sv: any) => sv.status === 'operational').length}/${status.services.length}`, color: '#7B5FFF' },
            ].map(s => (
              <div key={s.label} className="bg-[#0D0D0D] border border-white/[0.07] rounded-2xl p-4 text-center">
                <div className="text-2xl font-black" style={{ color: s.color }}>{s.value}</div>
                <div className="text-xs text-white/40 mt-1">{s.label}</div>
              </div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}