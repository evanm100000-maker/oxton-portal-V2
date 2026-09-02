'use client';

import React, { useEffect, useState } from 'react';
import { Flag, UserX, Bug, HelpCircle, PlusCircle, CheckCircle2, Clock } from 'lucide-react';

export default function ReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [type, setType] = useState<'USER' | 'BUG' | 'OTHER'>('USER');
  const [targetUsername, setTargetUsername] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const fetchReports = () => {
    fetch(`/api/reports?t=${Date.now()}`, { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (data.reports) {
          const uniqueMap = new Map();
          data.reports.forEach((r: any) => uniqueMap.set(String(r.id), r));
          setReports(Array.from(uniqueMap.values()));
        }
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMsg(null);

    if (type === 'USER' && !targetUsername.trim()) {
      setMsg('Error: Target Roblox username is required for user reports');
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          target_username: targetUsername,
          subject,
          description,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit report');

      setMsg('Report submitted successfully! High-rank management will review it shortly.');
      setSubject('');
      setDescription('');
      setTargetUsername('');
      setShowModal(false);
      fetchReports();
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
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Staff & Bug Reports</h1>
          <p className="text-slate-500 font-medium text-sm mt-0.5">
            File confidential reports regarding user misconduct, system bugs, or operational issues.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold rounded-2xl shadow-lg shadow-purple-600/20 text-sm transition-all"
        >
          <PlusCircle className="w-5 h-5" />
          File New Report
        </button>
      </div>

      {msg && (
        <div className="p-4 bg-purple-50 border border-purple-200 rounded-2xl text-purple-900 text-sm font-semibold">
          {msg}
        </div>
      )}

      {/* New Report Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-purple-100 space-y-4 text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-800">File a Report</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs font-medium">
              <div>
                <label className="block text-slate-700 font-bold mb-1.5">Report Category</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setType('USER')}
                    className={`py-2.5 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all ${
                      type === 'USER' ? 'bg-rose-600 text-white shadow-md' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <UserX className="w-4 h-4" /> User
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('BUG')}
                    className={`py-2.5 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all ${
                      type === 'BUG' ? 'bg-amber-600 text-white shadow-md' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <Bug className="w-4 h-4" /> Bug
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('OTHER')}
                    className={`py-2.5 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all ${
                      type === 'OTHER' ? 'bg-purple-600 text-white shadow-md' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <HelpCircle className="w-4 h-4" /> Other
                  </button>
                </div>
              </div>

              {type === 'USER' && (
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Target Roblox Username <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={targetUsername}
                    onChange={(e) => setTargetUsername(e.target.value)}
                    placeholder="Exact Roblox username of the individual"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-purple-600 text-slate-800"
                  />
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-bold mb-1">Subject / Summary</label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Brief summary of the issue..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-purple-600 text-slate-800"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Detailed Description</label>
                <textarea
                  required
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Include specific dates, flight codes, links to proof, or detailed steps to reproduce..."
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
                  {submitting ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reports History */}
      <div className="bg-white rounded-3xl p-6 shadow-md border border-purple-100 space-y-4">
        <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3">My Submitted Reports</h3>

        {loading ? (
          <p className="text-slate-400 text-xs text-center py-6">Loading submitted reports...</p>
        ) : reports.length === 0 ? (
          <p className="text-slate-400 text-xs text-center py-6">No reports submitted yet.</p>
        ) : (
          <div className="space-y-3">
            {reports.map((r) => (
              <div key={r.id} className="p-4 bg-purple-50/40 rounded-2xl border border-purple-100 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 bg-purple-100 text-purple-800 border border-purple-200 font-extrabold rounded">
                      {r.type} REPORT
                    </span>
                    {r.target_username && (
                      <span className="font-bold text-rose-800 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
                        Target: @{r.target_username}
                      </span>
                    )}
                  </div>
                  <span className={`px-2.5 py-0.5 font-bold rounded-full ${
                    r.status === 'RESOLVED'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : r.status === 'DISMISSED'
                      ? 'bg-slate-100 text-slate-600'
                      : 'bg-amber-100 text-amber-800 border border-amber-200'
                  }`}>
                    {r.status.replace('_', ' ')}
                  </span>
                </div>

                <h4 className="font-bold text-slate-800 text-sm">{r.subject}</h4>
                <p className="text-slate-600 leading-relaxed">{r.description}</p>

                {r.admin_notes && (
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200 mt-2 text-slate-500 italic">
                    Management Note: {r.admin_notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
