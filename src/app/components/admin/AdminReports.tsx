// ─────────────────────────────────────────────────────────────────────────────
//  MIXXEA — Admin Client Reports
//  Build branded campaign reports → preview → send to client via email
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../dashboard/AuthContext';
import * as api from '../dashboard/api';
import { toast } from 'sonner';
import {
  FileText, Plus, Send, Eye, Copy, Check, RefreshCw, X,
  BarChart2, Music, Radio, TrendingUp, Globe, Mic, DollarSign,
  Users, Zap, ExternalLink, Save, Trash2, Share2,
} from 'lucide-react';

const SERVICE_LABELS: Record<string, string> = {
  spotify_growth:    'Spotify Growth',
  playlist_pitching: 'Playlist Pitching',
  tiktok_ugc:        'TikTok UGC Campaign',
  ig_ugc:            'Instagram UGC',
  youtube_ads:       'YouTube Ads',
  meta_ads:          'Meta / Google Ads',
  pr_press:          'PR & Press',
  sync_licensing:    'Sync Licensing',
};

const METRIC_FIELDS = ['Streams / Plays', 'Total Reach', 'Saves / Follows', 'Playlist Adds', 'Clicks', 'Conversions', 'Ad Spend ($)', 'ROAS'];

// ── Report Preview ────────────────────────────────────────────────────────────
function ReportPreview({ report }: { report: any }) {
  return (
    <div className="bg-black border border-white/[0.08] rounded-2xl p-6 space-y-5 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-2xl font-black tracking-widest" style={{ background: 'linear-gradient(90deg,#00C4FF,#7B5FFF,#D63DF6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            MIXXEA
          </div>
          <p className="text-xs text-white/40 mt-0.5">Music Marketing Agency</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-white/40">Campaign Report</p>
          <p className="text-xs text-[#7B5FFF] font-semibold mt-0.5">{report.serviceName}</p>
        </div>
      </div>

      {/* Client info */}
      <div className="p-4 bg-[#0D0D0D] border border-white/[0.07] rounded-xl">
        <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Prepared for</p>
        <p className="text-base font-bold text-white">{report.clientName || '—'}</p>
        {report.period && <p className="text-xs text-white/50 mt-1">Period: {report.period}</p>}
      </div>

      {/* Metrics Grid */}
      {Object.keys(report.metrics || {}).length > 0 && (
        <div>
          <p className="text-xs text-white/40 uppercase tracking-wider mb-3">Campaign Metrics</p>
          <div className="grid grid-cols-3 gap-3">
            {Object.entries(report.metrics || {}).map(([k, v]) => (
              <div key={k} className="bg-[#0D0D0D] border border-white/[0.07] rounded-xl p-3 text-center">
                <p className="text-lg font-black" style={{ color: '#00C4FF' }}>{v as string}</p>
                <p className="text-[10px] text-white/40 mt-1">{k}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Playlist Placements */}
      {(report.placements || []).length > 0 && (
        <div>
          <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Playlist Placements</p>
          <div className="space-y-2">
            {report.placements.map((p: string, i: number) => (
              <div key={i} className="flex items-center gap-2 p-2.5 bg-[#0D0D0D] border border-white/[0.06] rounded-lg">
                <Radio size={11} className="text-[#7B5FFF] flex-shrink-0" />
                <span className="text-xs text-white/70">{p}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Content Links */}
      {(report.contentLinks || []).length > 0 && (
        <div>
          <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Content Links</p>
          <div className="space-y-1.5">
            {report.contentLinks.map((l: string, i: number) => (
              <a key={i} href={l} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs text-[#00C4FF] hover:underline">
                <ExternalLink size={10} />{l}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Highlights */}
      {(report.highlights || []).length > 0 && (
        <div className="p-4 bg-[#7B5FFF]/10 border border-[#7B5FFF]/20 rounded-xl">
          <p className="text-xs font-bold text-[#D63DF6] mb-2 uppercase tracking-wider">Campaign Highlights</p>
          <ul className="space-y-1.5">
            {report.highlights.map((h: string, i: number) => (
              <li key={i} className="flex items-start gap-2 text-xs text-white/70">
                <Zap size={10} className="text-[#7B5FFF] mt-0.5 flex-shrink-0" />{h}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Notes */}
      {report.notes && (
        <p className="text-xs text-white/50 leading-relaxed italic">{report.notes}</p>
      )}

      {/* Footer */}
      <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between">
        <div>
          <p className="text-[10px] text-white/30">MIXXEA Agency · onboarding@mixxea.com</p>
          <p className="text-[10px] text-white/20">www.mixxea.com</p>
        </div>
        {report.shareToken && (
          <a href={`https://www.mixxea.com/report/${report.shareToken}`} target="_blank" rel="noopener noreferrer"
            className="text-[10px] text-[#7B5FFF] hover:underline flex items-center gap-1">
            <Share2 size={9} /> Share Link
          </a>
        )}
      </div>
    </div>
  );
}

// ── Create / Edit Report Form ─────────────────────────────────────────────────
function ReportForm({ campaigns, onSave, onClose }: any) {
  const [form, setForm] = useState({
    campaignId: '', campaignName: '', clientName: '', clientEmail: '',
    serviceName: '', period: '',
    metrics: {} as Record<string, string>,
    placements: [''],
    contentLinks: [''],
    highlights: [''],
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const [metricKey, setMetricKey] = useState('Streams / Plays');
  const [metricVal, setMetricVal] = useState('');

  const selectCampaign = (id: string) => {
    const c = campaigns.find((x: any) => x.id === id);
    if (!c) return;
    setForm(f => ({
      ...f, campaignId: id, campaignName: c.name || '',
      clientName: c.userName || '', clientEmail: c.userEmail || '',
      serviceName: SERVICE_LABELS[c.type] || c.type || '',
      period: c.startDate ? `${c.startDate} – ${c.endDate || 'Ongoing'}` : '',
      metrics: {
        'Streams / Plays': (c.results?.streams || 0).toLocaleString(),
        'Total Reach': (c.results?.reach || 0).toLocaleString(),
        'Saves / Follows': (c.results?.saves || 0).toLocaleString(),
        'Playlist Adds': (c.results?.playlists || 0).toLocaleString(),
      },
    }));
  };

  const addMetric = () => {
    if (!metricKey || !metricVal) return;
    setForm(f => ({ ...f, metrics: { ...f.metrics, [metricKey]: metricVal } }));
    setMetricVal('');
  };

  const removeMetric = (k: string) => setForm(f => { const m = { ...f.metrics }; delete m[k]; return { ...f, metrics: m }; });

  const handle = async () => {
    if (!form.clientName) { toast.error('Client name required'); return; }
    setSaving(true);
    try {
      const clean = {
        ...form,
        placements: form.placements.filter(Boolean),
        contentLinks: form.contentLinks.filter(Boolean),
        highlights: form.highlights.filter(Boolean),
      };
      await onSave(clean);
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const addListItem = (key: 'placements' | 'contentLinks' | 'highlights') => {
    setForm(f => ({ ...f, [key]: [...f[key], ''] }));
  };

  const updateListItem = (key: 'placements' | 'contentLinks' | 'highlights', i: number, val: string) => {
    setForm(f => { const arr = [...f[key]]; arr[i] = val; return { ...f, [key]: arr }; });
  };

  const removeListItem = (key: 'placements' | 'contentLinks' | 'highlights', i: number) => {
    setForm(f => ({ ...f, [key]: f[key].filter((_: any, idx: number) => idx !== i) }));
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
        className="bg-[#0D0D0D] border border-white/[0.08] rounded-2xl w-full max-w-2xl my-4">
        <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
          <h2 className="text-sm font-bold text-white">Create Client Report</h2>
          <div className="flex items-center gap-2">
            <button onClick={() => setPreview(!preview)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${preview ? 'text-white border-[#7B5FFF]/40 bg-[#7B5FFF]/10' : 'text-white/40 border-white/[0.08]'}`}>
              <Eye size={11} />{preview ? 'Edit' : 'Preview'}
            </button>
            <button onClick={onClose} className="text-white/40 hover:text-white"><X size={18} /></button>
          </div>
        </div>

        <div className="p-5 max-h-[70vh] overflow-y-auto">
          {preview ? (
            <ReportPreview report={form} />
          ) : (
            <div className="space-y-5">
              {/* Link to existing campaign */}
              {campaigns.length > 0 && (
                <div>
                  <label className="block text-[11px] text-white/40 mb-1.5 uppercase tracking-wider font-semibold">Link to Campaign (auto-fill)</label>
                  <select value={form.campaignId} onChange={e => selectCampaign(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none">
                    <option value="">— Select campaign (optional) —</option>
                    {campaigns.map((c: any) => <option key={c.id} value={c.id} className="bg-[#111]">{c.name} — {c.userName}</option>)}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'clientName', label: 'Client Name *', placeholder: 'Artist / Label name' },
                  { key: 'clientEmail', label: 'Client Email', placeholder: 'client@email.com' },
                  { key: 'serviceName', label: 'Service Name', placeholder: 'Playlist Pitching' },
                  { key: 'period', label: 'Campaign Period', placeholder: 'Feb 1 – Feb 28, 2026' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-[11px] text-white/40 mb-1.5 uppercase tracking-wider font-semibold">{f.label}</label>
                    <input value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#7B5FFF]/40" />
                  </div>
                ))}
              </div>

              {/* Metrics */}
              <div>
                <label className="block text-[11px] text-white/40 mb-2 uppercase tracking-wider font-semibold">Metrics</label>
                <div className="space-y-2 mb-2">
                  {Object.entries(form.metrics).map(([k, v]) => (
                    <div key={k} className="flex items-center gap-2">
                      <span className="flex-1 text-xs text-white/60 bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2">{k}</span>
                      <span className="w-24 text-xs font-bold text-white bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2">{v}</span>
                      <button onClick={() => removeMetric(k)} className="text-white/30 hover:text-[#FF5252]"><X size={12} /></button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <select value={metricKey} onChange={e => setMetricKey(e.target.value)}
                    className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white focus:outline-none">
                    {METRIC_FIELDS.map(m => <option key={m} value={m} className="bg-[#111]">{m}</option>)}
                  </select>
                  <input value={metricVal} onChange={e => setMetricVal(e.target.value)} placeholder="Value"
                    className="w-28 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none" />
                  <button onClick={addMetric} className="px-3 py-2 rounded-xl bg-[#7B5FFF]/20 text-[#7B5FFF] text-xs font-bold hover:bg-[#7B5FFF]/30">
                    <Plus size={13} />
                  </button>
                </div>
              </div>

              {/* Placements, Links, Highlights */}
              {(['placements', 'contentLinks', 'highlights'] as const).map(section => {
                const labels: Record<string, { title: string; placeholder: string }> = {
                  placements:   { title: 'Playlist Placements', placeholder: 'LoFi Dreams Playlist (15K followers)' },
                  contentLinks: { title: 'Content Links',       placeholder: 'https://tiktok.com/@creator/video/…' },
                  highlights:   { title: 'Campaign Highlights', placeholder: 'Reached 500K people in 14 days' },
                };
                const cfg = labels[section];
                return (
                  <div key={section}>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[11px] text-white/40 uppercase tracking-wider font-semibold">{cfg.title}</label>
                      <button onClick={() => addListItem(section)} className="text-[11px] text-[#7B5FFF] flex items-center gap-1">
                        <Plus size={10} /> Add
                      </button>
                    </div>
                    <div className="space-y-2">
                      {form[section].map((item: string, i: number) => (
                        <div key={i} className="flex gap-2">
                          <input value={item} onChange={e => updateListItem(section, i, e.target.value)} placeholder={cfg.placeholder}
                            className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#7B5FFF]/40" />
                          <button onClick={() => removeListItem(section, i)} className="text-white/30 hover:text-[#FF5252]"><X size={13} /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Notes */}
              <div>
                <label className="block text-[11px] text-white/40 mb-1.5 uppercase tracking-wider font-semibold">Summary Notes</label>
                <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  rows={3} placeholder="Any additional notes or commentary for the client…"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#7B5FFF]/40 resize-none" />
              </div>
            </div>
          )}
        </div>

        <div className="p-5 border-t border-white/[0.06] flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl text-sm font-medium text-white/60 bg-white/[0.05]">Cancel</button>
          <button onClick={handle} disabled={saving}
            className="flex-1 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg,#7B5FFF,#D63DF6)' }}>
            <Save size={13} />{saving ? 'Creating…' : 'Create Report'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function AdminReports() {
  const { token } = useAuth();
  const [reports, setReports] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [previewReport, setPreviewReport] = useState<any>(null);
  const [sending, setSending] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      api.adminGetReports(token).then(d => setReports(d.reports || [])),
      api.adminGetCampaigns(token).then(d => setCampaigns(d.campaigns || [])),
    ]).finally(() => setLoading(false));
  }, [token]);

  const handleCreate = async (data: any) => {
    const r = await api.adminCreateReport(token!, data);
    setReports(prev => [r.report, ...prev]);
    setShowCreate(false);
    toast.success('✅ Report created!');
  };

  const handleSend = async (reportId: string) => {
    setSending(reportId);
    try {
      const r = await api.adminSendReport(token!, reportId);
      setReports(prev => prev.map(rp => rp.id === reportId ? r.report : rp));
      toast.success('📧 Report emailed to client!');
    } catch (err: any) { toast.error(err.message); }
    finally { setSending(null); }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Client Reports</h1>
          <p className="text-white/40 text-sm mt-1">Build branded campaign reports and send them directly to clients.</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white"
          style={{ background: 'linear-gradient(135deg,#7B5FFF,#D63DF6)' }}>
          <Plus size={14} /> Create Report
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32"><div className="w-8 h-8 rounded-full border-2 border-[#7B5FFF] border-t-transparent animate-spin" /></div>
      ) : reports.length === 0 ? (
        <div className="text-center py-16 bg-[#0D0D0D] border border-white/[0.06] rounded-2xl">
          <FileText size={32} className="text-white/15 mx-auto mb-4" />
          <p className="text-white/40 text-sm mb-4">No reports yet</p>
          <button onClick={() => setShowCreate(true)}
            className="px-6 py-3 rounded-xl text-sm font-bold text-white"
            style={{ background: 'linear-gradient(135deg,#7B5FFF,#D63DF6)' }}>
            Create Your First Report
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map(report => (
            <div key={report.id} className="bg-[#0D0D0D] border border-white/[0.07] rounded-2xl p-4 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#7B5FFF]/15 flex items-center justify-center flex-shrink-0">
                <BarChart2 size={18} className="text-[#7B5FFF]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <p className="font-bold text-white text-sm">{report.clientName} — {report.serviceName || 'Campaign'}</p>
                  {report.sentAt && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold text-[#10B981] bg-[#10B981]/15">Sent</span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-white/40 flex-wrap">
                  {report.clientEmail && <span>{report.clientEmail}</span>}
                  {report.period && <><span className="text-white/20">·</span><span>{report.period}</span></>}
                  <span className="text-white/20">·</span>
                  <span>{new Date(report.createdAt).toLocaleDateString()}</span>
                </div>
                {Object.keys(report.metrics || {}).length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {Object.entries(report.metrics).slice(0, 4).map(([k, v]) => (
                      <span key={k} className="text-[10px] px-2 py-0.5 bg-white/[0.04] border border-white/[0.06] rounded-lg text-white/60">
                        {k}: <span className="text-[#00C4FF] font-bold">{v as string}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => setPreviewReport(report)}
                  className="p-2 text-white/40 hover:text-white rounded-xl hover:bg-white/[0.06] transition-all">
                  <Eye size={14} />
                </button>
                <a href={`https://www.mixxea.com/report/${report.shareToken}`} target="_blank" rel="noopener noreferrer"
                  className="p-2 text-white/40 hover:text-[#7B5FFF] rounded-xl hover:bg-[#7B5FFF]/10 transition-all">
                  <Share2 size={14} />
                </a>
                {report.clientEmail && (
                  <button onClick={() => handleSend(report.id)} disabled={!!sending}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg,#00C4FF,#7B5FFF)' }}>
                    {sending === report.id ? <RefreshCw size={11} className="animate-spin" /> : <Send size={11} />}
                    {sending === report.id ? 'Sending…' : report.sentAt ? 'Re-send' : 'Send'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <AnimatePresence>
        {showCreate && (
          <ReportForm campaigns={campaigns} onSave={handleCreate} onClose={() => setShowCreate(false)} />
        )}
      </AnimatePresence>

      {/* Preview Modal */}
      <AnimatePresence>
        {previewReport && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
              className="w-full max-w-xl my-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold text-white">Report Preview</p>
                <button onClick={() => setPreviewReport(null)} className="text-white/40 hover:text-white"><X size={18} /></button>
              </div>
              <ReportPreview report={previewReport} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
