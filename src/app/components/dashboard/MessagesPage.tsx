import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from './AuthContext';
import * as api from './api';
import { toast } from 'sonner';
import {
  MessageSquare, Plus, Send, X, Circle, Clock, CheckCircle, AlertCircle, Inbox, ChevronRight
} from 'lucide-react';

const CATEGORIES = ['General', 'Distribution', 'Promotions', 'Publishing', 'Billing / Credits', 'Technical', 'Other'];
const PRIORITIES = [
  { id: 'low', label: 'Low', color: '#6B7280' },
  { id: 'medium', label: 'Medium', color: '#F59E0B' },
  { id: 'high', label: 'High', color: '#EF4444' },
];

const statusConfig: Record<string, any> = {
  open: { label: 'Open', color: '#10B981', bg: '#10B98115', icon: Circle },
  in_progress: { label: 'In Progress', color: '#7B5FFF', bg: '#7B5FFF15', icon: Clock },
  resolved: { label: 'Resolved', color: '#6B7280', bg: '#6B728015', icon: CheckCircle },
  closed: { label: 'Closed', color: '#4B5563', bg: '#4B556315', icon: CheckCircle },
};

export function MessagesPage() {
  const { token, user } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [creating, setCreating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [newTicket, setNewTicket] = useState({
    subject: '', type: 'support', category: 'General', priority: 'medium', message: '',
  });

  useEffect(() => {
    if (!token) return;
    api.getTickets(token).then(d => setTickets(d.tickets || [])).catch(() => {}).finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (selectedTicket && token) {
      setMessagesLoading(true);
      api.getMessages(token, selectedTicket.id).then(d => setMessages(d.messages || [])).finally(() => setMessagesLoading(false));
    }
  }, [selectedTicket, token]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicket.subject.trim() || !newTicket.message.trim()) { toast.error('Subject and message required'); return; }
    setCreating(true);
    try {
      const { ticket } = await api.createTicket(token!, newTicket);
      setTickets(prev => [ticket, ...prev]);
      setShowNewTicket(false);
      setSelectedTicket(ticket);
      setNewTicket({ subject: '', type: 'support', category: 'General', priority: 'medium', message: '' });
      toast.success('Ticket created! We\'ll respond within 24 hours.');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !selectedTicket) return;
    setSending(true);
    const content = messageText;
    setMessageText('');
    try {
      const { message } = await api.sendMessage(token!, selectedTicket.id, { content });
      setMessages(prev => [...prev, message]);
    } catch (err: any) {
      toast.error(err.message);
      setMessageText(content);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMins > 0) return `${diffMins}m ago`;
    return 'Just now';
  };

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Messages & Support</h1>
          <p className="text-white/40 text-sm mt-1">Communicate with the MIXXEA team</p>
        </div>
        <button onClick={() => setShowNewTicket(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white text-sm hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #D63DF6, #FF5252)' }}>
          <Plus size={16} /> New Ticket
        </button>
      </div>

      <div className="flex gap-4 h-[calc(100vh-220px)] min-h-[500px]">
        {/* Tickets Sidebar */}
        <div className={`${selectedTicket ? 'hidden lg:flex' : 'flex'} flex-col w-full lg:w-80 flex-shrink-0 bg-[#111111] border border-white/[0.06] rounded-2xl overflow-hidden`}>
          <div className="p-4 border-b border-white/[0.06]">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-white">Inbox</span>
              <span className="text-xs text-white/40">{tickets.length} tickets</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-white/[0.03] rounded-xl animate-pulse" />)}</div>
            ) : tickets.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                <Inbox size={28} className="text-white/20 mb-3" />
                <p className="text-white/40 text-sm">No tickets yet</p>
                <p className="text-white/25 text-xs mt-1">Create a ticket to get help from our team</p>
              </div>
            ) : (
              tickets.map(t => {
                const sc = statusConfig[t.status] || statusConfig.open;
                const StatusIcon = sc.icon;
                const isSelected = selectedTicket?.id === t.id;
                return (
                  <button key={t.id} onClick={() => setSelectedTicket(t)}
                    className={`w-full text-left px-4 py-3.5 border-b border-white/[0.04] hover:bg-white/[0.03] transition-all ${isSelected ? 'bg-white/[0.05] border-l-2 border-l-[#D63DF6]' : ''}`}>
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-white truncate">{t.subject}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs px-1.5 py-0.5 rounded-md font-medium" style={{ background: sc.bg, color: sc.color }}>
                            {sc.label}
                          </span>
                          <span className="text-[11px] text-white/30">{t.category}</span>
                          <span className="text-[11px] text-white/30">{formatTime(t.createdAt)}</span>
                        </div>
                        <div className="flex items-center gap-1 mt-1.5">
                          <MessageSquare size={11} className="text-white/30" />
                          <span className="text-[11px] text-white/30">{t.messageCount || 0} messages</span>
                        </div>
                      </div>
                      <ChevronRight size={14} className={`text-white/20 flex-shrink-0 mt-1 ${isSelected ? 'text-[#D63DF6]' : ''}`} />
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Chat Area */}
        {selectedTicket ? (
          <div className="flex-1 flex flex-col bg-[#111111] border border-white/[0.06] rounded-2xl overflow-hidden min-w-0">
            {/* Chat header */}
            <div className="flex items-center gap-3 p-4 border-b border-white/[0.06]">
              <button onClick={() => setSelectedTicket(null)} className="lg:hidden text-white/50 hover:text-white">
                <X size={18} />
              </button>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-white truncate">{selectedTicket.subject}</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[11px] px-1.5 py-0.5 rounded-md font-medium" style={{ background: statusConfig[selectedTicket.status]?.bg, color: statusConfig[selectedTicket.status]?.color }}>
                    {statusConfig[selectedTicket.status]?.label}
                  </span>
                  <span className="text-[11px] text-white/30">#{selectedTicket.id?.slice(0,8).toUpperCase()}</span>
                  <span className="text-[11px] text-white/30">{selectedTicket.category}</span>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messagesLoading ? (
                <div className="flex items-center justify-center h-full"><div className="w-6 h-6 rounded-full border-2 border-[#7B5FFF] border-t-transparent animate-spin" /></div>
              ) : messages.map(msg => {
                const isUser = msg.senderRole === 'user';
                return (
                  <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                      <div className="flex items-center gap-2">
                        {!isUser && (
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#D63DF6] to-[#FF5252] flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-[9px] font-bold">MX</span>
                          </div>
                        )}
                        <span className="text-[11px] text-white/30">{msg.senderName}</span>
                      </div>
                      <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${isUser ? 'bg-gradient-to-br from-[#7B5FFF] to-[#D63DF6] text-white rounded-tr-sm' : 'bg-white/[0.06] text-white/80 rounded-tl-sm'}`}>
                        {msg.content}
                      </div>
                      <span className="text-[11px] text-white/25 px-1">{formatTime(msg.createdAt)}</span>
                    </div>
                  </motion.div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-white/[0.06]">
              <div className="flex items-end gap-3">
                <textarea
                  value={messageText} onChange={e => setMessageText(e.target.value)} placeholder="Type your message..."
                  rows={2} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(e as any); } }}
                  className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#D63DF6]/50 resize-none"
                />
                <button type="submit" disabled={sending || !messageText.trim()}
                  className="p-3 rounded-xl text-white disabled:opacity-50 transition-all hover:opacity-90 flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #D63DF6, #FF5252)' }}>
                  <Send size={16} />
                </button>
              </div>
              <p className="text-[11px] text-white/20 mt-1.5">Press Enter to send · Shift+Enter for new line</p>
            </form>
          </div>
        ) : (
          <div className="hidden lg:flex flex-1 items-center justify-center bg-[#111111] border border-white/[0.06] rounded-2xl">
            <div className="text-center">
              <MessageSquare size={32} className="text-white/15 mx-auto mb-3" />
              <p className="text-white/30 text-sm">Select a ticket to view messages</p>
              <p className="text-white/20 text-xs mt-1">or create a new support ticket</p>
            </div>
          </div>
        )}
      </div>

      {/* New Ticket Modal */}
      <AnimatePresence>
        {showNewTicket && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, y: 20, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}
              className="bg-[#111111] border border-white/[0.08] rounded-2xl w-full max-w-lg"
            >
              <div className="flex items-center justify-between p-6 border-b border-white/[0.06]">
                <h2 className="text-base font-bold text-white">New Support Ticket</h2>
                <button onClick={() => setShowNewTicket(false)} className="text-white/40 hover:text-white"><X size={20} /></button>
              </div>

              <form onSubmit={handleCreateTicket} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">Subject *</label>
                  <input value={newTicket.subject} onChange={e => setNewTicket(t => ({ ...t, subject: e.target.value }))} required
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#D63DF6]/50"
                    placeholder="Brief description of your issue" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">Category</label>
                    <select value={newTicket.category} onChange={e => setNewTicket(t => ({ ...t, category: e.target.value }))}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#D63DF6]/50">
                      {CATEGORIES.map(c => <option key={c} value={c} className="bg-[#111111]">{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">Priority</label>
                    <div className="flex gap-2">
                      {PRIORITIES.map(p => (
                        <button key={p.id} type="button" onClick={() => setNewTicket(t => ({ ...t, priority: p.id }))}
                          className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all border ${newTicket.priority === p.id ? 'text-white border-transparent' : 'border-white/[0.08] text-white/40 hover:border-white/20 bg-transparent'}`}
                          style={newTicket.priority === p.id ? { background: `${p.color}30`, color: p.color, borderColor: `${p.color}40` } : {}}>
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">Message *</label>
                  <textarea value={newTicket.message} onChange={e => setNewTicket(t => ({ ...t, message: e.target.value }))} required rows={5}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#D63DF6]/50 resize-none"
                    placeholder="Describe your issue in detail. Include any relevant release titles, campaign names, or other specifics..." />
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowNewTicket(false)} className="flex-1 py-3 rounded-xl text-sm font-medium text-white/60 bg-white/[0.05] hover:bg-white/[0.08] transition-all">Cancel</button>
                  <button type="submit" disabled={creating} className="flex-1 py-3 rounded-xl text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #D63DF6, #FF5252)' }}>
                    {creating ? 'Creating...' : 'Create Ticket'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}