'use client';

import React, { useEffect, useState } from 'react';
import { Clock, Calendar, ShieldCheck, AlertCircle, PlusCircle, CheckCircle2, XCircle } from 'lucide-react';

export default function LoaPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [type, setType] = useState<'LOA' | 'REDUCED_ACTIVITY'>('LOA');
  const [reason, setReason] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const fetchRequests = () => {
    fetch('/api/loa')
      .then((res) => res.json())
      .then((data) => {
        if (data.requests) setRequests(data.requests);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMsg(null);

    try {
      const res = await fetch('/api/loa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, reason, start_date: startDate, end_date: endDate }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit LOA request');

      setMsg('Request submitted successfully for Admin review!');
      setReason('');
      setStartDate('');
      setEndDate('');
      setShowModal(false);
      fetchRequests();
    } catch (err: any) {
      setMsg(`Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Leave of Absence & Reduced Activity</h1>
          <p className="text-slate-500 font-medium text-sm mt-0.5">
            Submit LOA or Reduced Activity requests. Approved requests automatically waive minimum roster quotas during specified dates.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold rounded-2xl shadow-lg shadow-purple-600/20 text-sm transition-all"
        >
          <PlusCircle className="w-5 h-5" />
          New Request
        </button>
      </div>

      {msg && (
        <div className="p-4 bg-purple-50 border border-purple-200 rounded-2xl text-purple-900 text-sm font-semibold">
          {msg}
        </div>
      )}

      {/* Info Boxes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-purple-50/70 border border-purple-200 p-5 rounded-2xl">
          <h4 className="font-bold text-purple-900 text-sm mb-1">🌴 Leave of Absence (LOA)</h4>
          <p className="text-xs text-purple-800 leading-relaxed">
            Completely pauses your required flight quota (0 flights required). Your name will show as on LOA and will be excluded from weekly quota non-compliance infraction lists.
          </p>
        </div>
        <div className="bg-indigo-50/70 border border-indigo-200 p-5 rounded-2xl">
          <h4 className="font-bold text-indigo-900 text-sm mb-1">⚡ Reduced Activity</h4>
          <p className="text-xs text-indigo-800 leading-relaxed">
            Removes minimum roster quotas while allowing you to attend flights whenever available without penalty.
          </p>
        </div>
      </div>

      {/* Request Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-purple-100 space-y-4 text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-800">Submit Absence / Reduced Activity Request</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs font-medium">
              <div>
                <label className="block text-slate-700 font-bold mb-1.5">Request Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setType('LOA')}
                    className={`py-2.5 rounded-xl font-bold transition-all ${
                      type === 'LOA' ? 'bg-purple-600 text-white shadow-md' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    Leave of Absence (LOA)
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('REDUCED_ACTIVITY')}
                    className={`py-2.5 rounded-xl font-bold transition-all ${
                      type === 'REDUCED_ACTIVITY' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    Reduced Activity
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-purple-600"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-purple-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Reason for Request</label>
                <textarea
                  required
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Provide details regarding your upcoming absence or reduced activity..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-600 text-slate-800"
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
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Requests History List */}
      <div className="bg-white rounded-3xl p-6 shadow-md border border-purple-100 space-y-4">
        <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3">My Request History</h3>

        {loading ? (
          <p className="text-slate-400 text-xs text-center py-6">Loading requests...</p>
        ) : requests.length === 0 ? (
          <p className="text-slate-400 text-xs text-center py-6">No previous LOA or Reduced Activity requests found.</p>
        ) : (
          <div className="space-y-3">
            {requests.map((r) => (
              <div key={r.id} className="p-4 bg-purple-50/40 rounded-2xl border border-purple-100 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`font-extrabold px-2.5 py-0.5 rounded-full ${
                      r.type === 'LOA' ? 'bg-purple-100 text-purple-800 border border-purple-200' : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                    }`}>
                      {r.type}
                    </span>
                    <span className="text-slate-500 font-semibold">
                      {r.start_date} to {r.end_date}
                    </span>
                  </div>
                  <p className="text-slate-700 font-medium">{r.reason}</p>
                  {r.admin_notes && (
                    <p className="text-slate-500 italic">Admin Note: {r.admin_notes}</p>
                  )}
                </div>

                <div className="shrink-0">
                  <span className={`px-3 py-1 font-bold rounded-full flex items-center gap-1.5 ${
                    r.status === 'APPROVED'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : r.status === 'DECLINED'
                      ? 'bg-rose-100 text-rose-800 border border-rose-200'
                      : 'bg-amber-100 text-amber-800 border border-amber-200'
                  }`}>
                    {r.status === 'APPROVED' && <CheckCircle2 className="w-3.5 h-3.5" />}
                    {r.status === 'DECLINED' && <XCircle className="w-3.5 h-3.5" />}
                    {r.status === 'PENDING' && <Clock className="w-3.5 h-3.5" />}
                    {r.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
