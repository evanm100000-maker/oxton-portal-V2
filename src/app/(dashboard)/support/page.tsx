'use client';

import React, { useEffect, useState } from 'react';
import { LifeBuoy, Send, PlusCircle, MessageSquare, AlertCircle, CheckCircle2, Shield } from 'lucide-react';

export default function SupportPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [activeTicketId, setActiveTicketId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [subject, setSubject] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
  const [initialMessage, setInitialMessage] = useState('');

  const [replyMessage, setReplyMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchTickets = () => {
    fetch('/api/tickets')
      .then((res) => res.json())
      .then((data) => {
        if (data.tickets) {
          setTickets(data.tickets);
          if (data.tickets.length > 0 && activeTicketId === null) {
            setActiveTicketId(data.tickets[0].id);
          }
        }
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchTickets();
    // Live Auto Refresh Polling every 2 seconds for ticket chat
    const interval = setInterval(fetchTickets, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          subject,
          priority,
          initial_message: initialMessage,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to open ticket');

      setSubject('');
      setInitialMessage('');
      setShowModal(false);
      fetchTickets();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTicketId || !replyMessage.trim()) return;

    const currentText = replyMessage;
    setReplyMessage('');

    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reply',
          ticket_id: activeTicketId,
          message: currentText,
        }),
      });

      if (res.ok) {
        fetchTickets();
      }
    } catch (err) {
      console.error('Ticket reply error:', err);
    }
  };

  const activeTicket = tickets.find((t) => Number(t.id) === Number(activeTicketId));

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">High-Rank Support Center</h1>
          <p className="text-slate-500 font-medium text-sm mt-0.5">
            Open a support ticket to get direct live assistance from executive and administrative staff.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold rounded-2xl shadow-lg shadow-purple-600/20 text-sm transition-all"
        >
          <PlusCircle className="w-5 h-5" />
          Open New Ticket
        </button>
      </div>

      {/* New Ticket Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-purple-100 space-y-4 text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-800">Open Support Ticket</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-4 text-xs font-medium">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Ticket Subject</label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Schedule Conflict / Role Rank Inquiry"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Priority Level</label>
                <select
                  value={priority}
                  onChange={(e: any) => setPriority(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-purple-600"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Message</label>
                <textarea
                  required
                  rows={4}
                  value={initialMessage}
                  onChange={(e) => setInitialMessage(e.target.value)}
                  placeholder="Explain your situation in detail..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-purple-600"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold rounded-xl shadow-md disabled:opacity-50"
                >
                  {submitting ? 'Opening...' : 'Create Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Ticket Interface */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Ticket Sidebar */}
        <div className="bg-white rounded-3xl p-4 shadow-md border border-purple-100 space-y-3 h-[520px] flex flex-col">
          <h3 className="font-bold text-slate-800 text-sm px-2 border-b border-slate-100 pb-2">Support Tickets</h3>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {loading ? (
              <p className="text-xs text-slate-400 text-center py-6">Loading tickets...</p>
            ) : tickets.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No support tickets found.</p>
            ) : (
              tickets.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTicketId(t.id)}
                  className={`w-full text-left p-3 rounded-2xl transition-all border ${
                    Number(activeTicketId) === Number(t.id)
                      ? 'bg-purple-50 border-purple-300 text-purple-900 shadow-sm font-bold'
                      : 'border-slate-100 hover:bg-purple-50/50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs truncate max-w-[140px]">{t.subject}</span>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
                      t.priority === 'URGENT' ? 'bg-rose-100 text-rose-800 border border-rose-200' : 'bg-blue-100 text-blue-800 border border-blue-200'
                    }`}>
                      {t.priority}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
                    <span>Status: {t.status}</span>
                    <span>{new Date(t.created_at).toLocaleDateString()}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Ticket Conversation View */}
        <div className="md:col-span-2 bg-white rounded-3xl p-6 shadow-md border border-purple-100 h-[520px] flex flex-col justify-between">
          {activeTicket ? (
            <>
              {/* Header */}
              <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
                    {activeTicket.subject}
                    <span className="text-xs font-bold px-2.5 py-0.5 bg-purple-100 text-purple-800 border border-purple-200 rounded-full">
                      {activeTicket.status}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Opened by @{activeTicket.roblox_username}</p>
                </div>
              </div>

              {/* Messages Thread */}
              <div className="flex-1 overflow-y-auto my-4 space-y-3 pr-2">
                {activeTicket.messages?.map((m: any) => {
                  const isStaff = m.sender_role === 'STAFF';
                  return (
                    <div key={m.id} className={`flex flex-col ${isStaff ? 'items-end' : 'items-start'}`}>
                      <div className="text-[11px] font-bold text-slate-500 mb-1 flex items-center gap-1">
                        {!isStaff && <Shield className="w-3 h-3 text-purple-600" />}
                        <span>{m.sender_name}</span>
                        <span className="text-slate-400 font-normal">({new Date(m.created_at).toLocaleTimeString()})</span>
                      </div>
                      <div className={`p-3.5 rounded-2xl max-w-md text-xs leading-relaxed ${
                        isStaff
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-tr-none shadow-md'
                          : 'bg-purple-50 text-slate-800 rounded-tl-none border border-purple-100'
                      }`}>
                        {m.message}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Reply Box */}
              {['CLOSED', 'DISMISSED'].includes(activeTicket.status) ? (
                <div className="p-3 bg-slate-50 rounded-2xl text-center text-xs text-slate-500 font-semibold border border-slate-200">
                  This ticket has been closed by management.
                </div>
              ) : (
                <form onSubmit={handleSendReply} className="flex gap-2 pt-2 border-t border-slate-100">
                  <input
                    type="text"
                    required
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    placeholder="Type your response here..."
                    className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-purple-600"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl flex items-center gap-1.5 text-xs shadow-md"
                  >
                    <Send className="w-3.5 h-3.5" /> Send
                  </button>
                </form>
              )}
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <LifeBuoy className="w-12 h-12 text-purple-300 mb-2 opacity-60" />
              <p className="text-sm font-semibold text-slate-600">Select a ticket on the left to view conversation.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
