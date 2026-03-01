import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../dashboard/AuthContext';
import * as api from '../dashboard/api';
import { toast } from 'sonner';
import {
  Ticket, Send, Clock, CheckCircle, Circle, ChevronRight,
  Search, Filter, X, MessageSquare, User, Tag, RefreshCw,
  ArrowLeft, Inbox, Shield
} from 'lucide-react';

const STATUS_OPTIONS = [
  { id: 'all', label: 'All' },
  { id: 'open', label: 'Open', color: '#10B981' },
  { id: 'in_progress', label: 'In Progress', color: '#7B5FFF' },
  { id: 'resolved', label: 'Resolved', color: '#6B7280' },
  { id: 'closed', label: 'Closed', color: '#4B5563' },
];

const PRIORITY_OPTIONS = [
  { id: 'all', label: 'All Priorities' },
  { id: 'high', label: 'High', color: '#EF4444' },
  { id: 'medium', label: 'Medium', color: '#F59E0B' },
  { id: 'low', label: 'Low', color: '#6B7280' },
];

const statusConfig: Record<string, any> = {
  open: { label: 'Open', color: '#10B981', bg: '#10B98115', icon: Circle },
  in_progress: { label: 'In Progress', color: '#7B5FFF', bg: '#7B5FFF15', icon: Clock },
  resolved: { label: 'Resolved', color: '#6B7280', bg: '#6B728015', icon: CheckCircle },
  closed: { label: 'Closed', color: '#4B5563', bg: '#4B556315', icon: CheckCircle },
};

const priorityColors: Record<string, string> = {
  high: '#EF4444', medium: '#F59E0B', low: '#6B7280',
};

export function AdminTickets() {
  const { token, user } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadTickets = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await api.adminGetTickets(token);
      setTickets(data.tickets || []);
    } catch (err: any) {
      toast.error('Failed to load tickets: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTickets(); }, [token]);

  useEffect(() => {
    if (selectedTicket && token) {
      setMessagesLoading(true);
      api.adminGetMessages(token, selectedTicket.id)
        .then(d => setMessages(d.messages || []))
        .catch(console.error)
        .finally(() => setMessagesLoading(false));
    }
  }, [selectedTicket, token]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const filtered = tickets.filter(t => {
    const matchSearch = !search || t.subject?.toLowerCase().includes(search.toLowerCase()) ||
      t.userName?.toLowerCase().includes(search.toLowerCase()) || t.userEmail?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchPriority = priorityFilter === 'all' || t.priority === priorityFilter;
    return matchSearch && matchStatus && matchPriority;
  });

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedTicket) return;
    setSending(true);
    const content = replyText;
    setReplyText('');
    try {
      const { message } = await api.adminReplyTicket(token!, selectedTicket.id, { content });
      setMessages(prev => [...prev, message]);
      // Update ticket status to in_progress if it was open
      if (selectedTicket.status === 'open') {
        const updated = { ...selectedTicket, status: 'in_progress' };
        setSelectedTicket(updated);
        setTickets(prev => prev.map(t => t.id === selectedTicket.id ? { ...t, status: 'in_progress' } : t));
      }
      toast.success('Reply sent');
    } catch (err: any) {
      toast.error(err.message);
      setReplyText(content);
    } finally {
      setSending(false);
    }
  };

  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    setUpdatingStatus(true);
    try {
      const { ticket } = await api.adminUpdateTicket(token!, ticketId, { status: newStatus });
      setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, ...ticket } : t));
      if (selectedTicket?.id === ticketId) setSelectedTicket((prev: any) => ({ ...prev, status: newStatus }));
      toast.success(`Ticket marked as ${newStatus.replace('_', ' ')}`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const formatTime = (iso: string) => {
    if (!iso) return '';
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

  const openCount = tickets.filter(t => t.status === 'open').length;
  const inProgressCount = tickets.filter(t => t.status === 'in_progress').length;

  return (
    <div className="h-[calc(100vh-65px)] flex flex-col">
      {/* Header */}
      <div className="p-5 border-b border-white/[0.05] flex-shrink-0">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-black text-white tracking-tight">Ticket Queue</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-[#10B981] font-medium">{openCount} open</span>
              <span className="text-white/20">·</span>
              <span className="text-xs text-[#7B5FFF] font-medium">{inProgressCount} in progress</span>
              <span className="text-white/20">·</span>
              <span className="text-xs text-white/30">{tickets.length} total</span>
            </div>
          </div>
          <button onClick={loadTickets} disabled={loading}
            className="flex items-center gap-2 px-3 py-2 bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.08] rounded-xl text-white/60 hover:text-white text-xs font-medium transition-all">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mt-4">
          <div className="flex items-center gap-2 bg-[#111111] border border-white/[0.06] rounded-xl px-3 py-2 flex-1 min-w-[200px]">
            <Search size={13} className="text-white/30 flex-shrink-0" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tickets, users..."
              className="bg-transparent text-sm text-white placeholder-white/30 focus:outline-none w-full" />
            {search && <button onClick={() => setSearch('')}><X size={13} className="text-white/30 hover:text-white" /></button>}
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="bg-[#111111] border border-white/[0.06] rounded-xl px-3 py-2 text-sm text-white/70 focus:outline-none">
            {STATUS_OPTIONS.map(o => <option key={o.id} value={o.id} className="bg-[#111111]">{o.label}</option>)}
          </select>
          <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}
            className="bg-[#111111] border border-white/[0.06] rounded-xl px-3 py-2 text-sm text-white/70 focus:outline-none">
            {PRIORITY_OPTIONS.map(o => <option key={o.id} value={o.id} className="bg-[#111111]">{o.label}</option>)}
          </select>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Ticket list */}
        <div className={`${selectedTicket ? 'hidden lg:flex' : 'flex'} flex-col w-full lg:w-80 xl:w-96 flex-shrink-0 border-r border-white/[0.05] overflow-y-auto`}>
          {loading ? (
            <div className="p-4 space-y-2">
              {[1,2,3,4,5].map(i => <div key={i} className="h-24 bg-white/[0.03] rounded-xl animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
              <Inbox size={28} className="text-white/20 mb-3" />
              <p className="text-white/40 text-sm">No tickets match your filters</p>
            </div>
          ) : (
            filtered.map(ticket => {
              const sc = statusConfig[ticket.status] || statusConfig.open;
              const isSelected = selectedTicket?.id === ticket.id;
              const pc = priorityColors[ticket.priority] || priorityColors.medium;
              return (
                <button key={ticket.id} onClick={() => setSelectedTicket(ticket)}
                  className={`w-full text-left px-4 py-4 border-b border-white/[0.04] hover:bg-white/[0.02] transition-all relative ${isSelected ? 'bg-white/[0.04] border-l-2 border-l-[#D63DF6]' : 'pl-4'}`}>
                  <div className="absolute left-0 top-0 bottom-0 w-0.5" style={{ background: pc, opacity: isSelected ? 0 : 0.7 }} />
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-white truncate">{ticket.subject}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-white/40 mb-2">
                        <User size={10} />
                        <span className="truncate">{ticket.userName} · {ticket.userRole}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] px-1.5 py-0.5 rounded font-medium" style={{ background: sc.bg, color: sc.color }}>{sc.label}</span>
                        <span className="text-[10px] text-white/30">{ticket.category}</span>
                        <span className="text-[10px] text-white/25">{formatTime(ticket.createdAt)}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <div className="flex items-center gap-1">
                        <MessageSquare size={10} className="text-white/25" />
                        <span className="text-[10px] text-white/25">{ticket.messageCount || 0}</span>
                      </div>
                      <ChevronRight size={13} className={`text-white/20 ${isSelected ? 'text-[#D63DF6]' : ''}`} />
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Ticket detail / chat */}
        {selectedTicket ? (
          <div className="flex-1 flex flex-col min-w-0">
            {/* Chat header */}
            <div className="flex-shrink-0 flex items-center gap-3 p-4 border-b border-white/[0.05] bg-[#080808]">
              <button onClick={() => setSelectedTicket(null)} className="lg:hidden text-white/50 hover:text-white">
                <ArrowLeft size={18} />
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-bold text-white truncate">{selectedTicket.subject}</h3>
                  <span className="text-[11px] text-white/30">#{selectedTicket.id?.slice(0,8).toUpperCase()}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-xs flex items-center gap-1 text-white/50">
                    <User size={10} /> {selectedTicket.userName} · {selectedTicket.userEmail}
                  </span>
                  <span className="text-[11px] text-white/30">·</span>
                  <span className="text-[11px] capitalize text-white/30">{selectedTicket.category}</span>
                </div>
              </div>
              {/* Status control */}
              <select
                value={selectedTicket.status}
                onChange={e => handleStatusChange(selectedTicket.id, e.target.value)}
                disabled={updatingStatus}
                className="text-xs rounded-xl px-3 py-1.5 border font-medium focus:outline-none disabled:opacity-50 bg-transparent cursor-pointer"
                style={{
                  color: statusConfig[selectedTicket.status]?.color || '#fff',
                  borderColor: `${statusConfig[selectedTicket.status]?.color || '#fff'}40`,
                  background: statusConfig[selectedTicket.status]?.bg || 'transparent',
                }}
              >
                <option value="open" className="bg-[#111111] text-white">Open</option>
                <option value="in_progress" className="bg-[#111111] text-white">In Progress</option>
                <option value="resolved" className="bg-[#111111] text-white">Resolved</option>
                <option value="closed" className="bg-[#111111] text-white">Closed</option>
              </select>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
              {messagesLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="w-6 h-6 rounded-full border-2 border-[#D63DF6] border-t-transparent animate-spin" />
                </div>
              ) : messages.map(msg => {
                const isAdmin = msg.senderRole === 'admin';
                return (
                  <motion.div key={msg.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] flex flex-col gap-1 ${isAdmin ? 'items-end' : 'items-start'}`}>
                      <div className="flex items-center gap-2">
                        {isAdmin && (
                          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#D63DF6] to-[#FF5252] flex items-center justify-center flex-shrink-0">
                            <Shield size={9} className="text-white" />
                          </div>
                        )}
                        <span className="text-[10px] text-white/30">{msg.senderName}</span>
                        {!isAdmin && (
                          <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                            <User size={9} className="text-white/60" />
                          </div>
                        )}
                      </div>
                      <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                        isAdmin
                          ? 'bg-gradient-to-br from-[#D63DF6]/80 to-[#7B5FFF]/80 text-white rounded-tr-sm border border-[#D63DF6]/20'
                          : 'bg-white/[0.06] text-white/80 rounded-tl-sm'
                      }`}>
                        {msg.content}
                      </div>
                      <span className="text-[10px] text-white/25 px-1">{formatTime(msg.createdAt)}</span>
                    </div>
                  </motion.div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply input */}
            {selectedTicket.status !== 'closed' && (
              <form onSubmit={handleSendReply} className="flex-shrink-0 p-4 border-t border-white/[0.05] bg-[#080808]">
                <div className="flex items-end gap-3">
                  <div className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl focus-within:border-[#D63DF6]/40 transition-colors">
                    <textarea
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      placeholder="Reply as MIXXEA Support..."
                      rows={2}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendReply(e as any); } }}
                      className="w-full bg-transparent px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none resize-none"
                    />
                  </div>
                  <button type="submit" disabled={sending || !replyText.trim()}
                    className="p-3 rounded-xl text-white disabled:opacity-50 transition-all hover:opacity-90 flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #D63DF6, #7B5FFF)' }}>
                    <Send size={16} />
                  </button>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-[10px] text-white/20">Enter to send · Shift+Enter for newline</p>
                  <div className="flex items-center gap-1">
                    <Shield size={10} className="text-[#D63DF6]/60" />
                    <span className="text-[10px] text-[#D63DF6]/60">Sending as MIXXEA Support</span>
                  </div>
                </div>
              </form>
            )}
          </div>
        ) : (
          <div className="hidden lg:flex flex-1 items-center justify-center">
            <div className="text-center">
              <Ticket size={32} className="text-white/15 mx-auto mb-3" />
              <p className="text-white/30 text-sm">Select a ticket to view</p>
              <p className="text-white/20 text-xs mt-1">Reply on behalf of MIXXEA Support</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
