import { useState, useEffect } from 'react';
import { CheckCircle, AlertTriangle, XCircle, RefreshCw, Zap, Music, Globe, Shield, BarChart2, Mail } from 'lucide-react';

type StatusLevel = 'operational' | 'degraded' | 'outage';

interface Service {
  name: string;
  description: string;
  status: StatusLevel;
  uptime: string;
  icon: React.ReactNode;
}

interface Incident {
  id: string;
  title: string;
  status: 'resolved' | 'monitoring' | 'investigating';
  date: string;
  message: string;
}

const SERVICES: Service[] = [
  {
    name: 'Music Distribution',
    description: 'Delivery to DSPs (Spotify, Apple Music, Tidal, etc.)',
    status: 'operational',
    uptime: '99.98%',
    icon: <Music className="w-5 h-5" />,
  },
  {
    name: 'Smart Pages',
    description: 'Artist landing pages and link-in-bio',
    status: 'operational',
    uptime: '99.99%',
    icon: <Globe className="w-5 h-5" />,
  },
  {
    name: 'Analytics & Reporting',
    description: 'Streaming data, revenue dashboards, demographics',
    status: 'operational',
    uptime: '99.95%',
    icon: <BarChart2 className="w-5 h-5" />,
  },
  {
    name: 'Promotions Engine',
    description: 'Playlist pitching, campaign delivery',
    status: 'operational',
    uptime: '99.97%',
    icon: <Zap className="w-5 h-5" />,
  },
  {
    name: 'Publishing Administration',
    description: 'Royalty collection, PRO registration, splits',
    status: 'operational',
    uptime: '99.96%',
    icon: <Shield className="w-5 h-5" />,
  },
  {
    name: 'Email & Notifications',
    description: 'Transactional emails and in-app alerts',
    status: 'operational',
    uptime: '99.93%',
    icon: <Mail className="w-5 h-5" />,
  },
];

const INCIDENTS: Incident[] = [
  {
    id: '1',
    title: 'Analytics data delay — resolved',
    status: 'resolved',
    date: 'Feb 28, 2026',
    message:
      'A brief delay in streaming data ingestion caused analytics dashboards to lag by ~45 minutes. The pipeline was restarted and all data has been backfilled.',
  },
  {
    id: '2',
    title: 'Smart Pages intermittent 504 errors — resolved',
    status: 'resolved',
    date: 'Feb 14, 2026',
    message:
      'An edge node misconfiguration caused sporadic 504 errors on custom Smart Page domains. The configuration was corrected and service restored.',
  },
];

const statusConfig: Record<StatusLevel, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  operational: {
    label: 'Operational',
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/10 border-emerald-400/20',
    icon: <CheckCircle className="w-4 h-4 text-emerald-400" />,
  },
  degraded: {
    label: 'Degraded Performance',
    color: 'text-yellow-400',
    bg: 'bg-yellow-400/10 border-yellow-400/20',
    icon: <AlertTriangle className="w-4 h-4 text-yellow-400" />,
  },
  outage: {
    label: 'Outage',
    color: 'text-red-400',
    bg: 'bg-red-400/10 border-red-400/20',
    icon: <XCircle className="w-4 h-4 text-red-400" />,
  },
};

const incidentStatusConfig: Record<Incident['status'], { label: string; color: string }> = {
  resolved: { label: 'Resolved', color: 'text-emerald-400' },
  monitoring: { label: 'Monitoring', color: 'text-yellow-400' },
  investigating: { label: 'Investigating', color: 'text-red-400' },
};

function overallStatus(services: Service[]): StatusLevel {
  if (services.some((s) => s.status === 'outage')) return 'outage';
  if (services.some((s) => s.status === 'degraded')) return 'degraded';
  return 'operational';
}

export function StatusPage() {
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);

  const overall = overallStatus(SERVICES);
  const cfg = statusConfig[overall];

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setLastUpdated(new Date());
      setRefreshing(false);
    }, 800);
  };

  useEffect(() => {
    const interval = setInterval(() => setLastUpdated(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <span
              className="text-xl font-black tracking-widest"
              style={{ background: 'linear-gradient(90deg,#00C4FF,#7B5FFF,#D63DF6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
            >
              MIXXEA
            </span>
            <span className="text-white/40 text-sm font-medium ml-1">/ Status</span>
          </a>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 text-sm text-white/50 hover:text-white/80 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-14 space-y-12">
        {/* Overall status banner */}
        <div className={`rounded-2xl border p-6 flex items-center gap-4 ${cfg.bg}`}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-black/30">
            {overall === 'operational'
              ? <CheckCircle className="w-6 h-6 text-emerald-400" />
              : overall === 'degraded'
              ? <AlertTriangle className="w-6 h-6 text-yellow-400" />
              : <XCircle className="w-6 h-6 text-red-400" />}
          </div>
          <div>
            <h1 className="text-lg font-bold">
              {overall === 'operational'
                ? 'All Systems Operational'
                : overall === 'degraded'
                ? 'Partial Service Degradation'
                : 'Service Outage Detected'}
            </h1>
            <p className="text-sm text-white/50 mt-0.5">
              Last updated: {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ·{' '}
              {lastUpdated.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Services */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-white/40 mb-4">Services</h2>
          <div className="rounded-2xl border border-white/10 overflow-hidden divide-y divide-white/10">
            {SERVICES.map((service) => {
              const s = statusConfig[service.status];
              return (
                <div key={service.name} className="flex items-center justify-between px-6 py-4 hover:bg-white/[0.03] transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-white/40">{service.icon}</span>
                    <div>
                      <p className="text-sm font-semibold text-white">{service.name}</p>
                      <p className="text-xs text-white/40 mt-0.5">{service.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0 ml-4">
                    <span className="text-xs text-white/30 hidden sm:block">{service.uptime} uptime</span>
                    <span className={`flex items-center gap-1.5 text-xs font-medium ${s.color}`}>
                      {s.icon}
                      {s.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Uptime bar (decorative) */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-white/40 mb-4">90-Day Uptime</h2>
          <div className="rounded-2xl border border-white/10 p-6">
            <div className="flex gap-0.5">
              {Array.from({ length: 90 }).map((_, i) => {
                const isBlip = i === 42 || i === 61;
                return (
                  <div
                    key={i}
                    title={`Day ${90 - i}`}
                    className={`flex-1 h-8 rounded-sm ${isBlip ? 'bg-yellow-400/60' : 'bg-emerald-400/70'}`}
                  />
                );
              })}
            </div>
            <div className="flex justify-between mt-3 text-xs text-white/30">
              <span>90 days ago</span>
              <span className="text-emerald-400 font-medium">99.97% avg uptime</span>
              <span>Today</span>
            </div>
          </div>
        </section>

        {/* Incident history */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-white/40 mb-4">Incident History</h2>
          {INCIDENTS.length === 0 ? (
            <p className="text-white/40 text-sm">No incidents reported in the last 90 days.</p>
          ) : (
            <div className="space-y-4">
              {INCIDENTS.map((incident) => {
                const ic = incidentStatusConfig[incident.status];
                return (
                  <div key={incident.id} className="rounded-2xl border border-white/10 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-white">{incident.title}</p>
                        <p className="text-xs text-white/40 mt-1">{incident.date}</p>
                      </div>
                      <span className={`text-xs font-semibold shrink-0 ${ic.color}`}>{ic.label}</span>
                    </div>
                    <p className="text-sm text-white/50 mt-3 leading-relaxed">{incident.message}</p>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Footer CTA */}
        <section className="border-t border-white/10 pt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-sm text-white/40">
            Need help? Contact support at{' '}
            <a href="mailto:onboarding@mixxea.com" className="text-[#00C4FF] hover:underline">
              onboarding@mixxea.com
            </a>
          </p>
          <a
            href="/"
            className="text-sm font-semibold text-white/60 hover:text-white transition-colors"
          >
            ← Back to MIXXEA
          </a>
        </section>
      </main>
    </div>
  );
}
