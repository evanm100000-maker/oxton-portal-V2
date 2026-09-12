'use client';

import React, { useEffect, useState } from 'react';
import { FileText, PlusCircle, CheckCircle2, XCircle, Clock, Plane, ShieldCheck, Sparkles, HelpCircle } from 'lucide-react';
import { formatDateLocal } from '@/lib/utils';
import { database } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';
import { parseFirebaseSnapshot } from '@/lib/realtime-sync';

export default function FlightLogsPage() {
  const [user, setUser] = useState<any>(null);
  const [flights, setFlights] = useState<any[]>([]);
  const [rawLogs, setRawLogs] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [showModal, setShowModal] = useState(false);
  const [selectedFlightId, setSelectedFlightId] = useState<number | ''>('');
  const [roleFlown, setRoleFlown] = useState('Captain');
  const [proofNotes, setProofNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Admin Review Modal
  const [reviewLog, setReviewLog] = useState<any>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [reviewing, setReviewing] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setUser(data.user);
      });

    // Real-Time Firebase WebSockets Listeners
    const unsubFlights = onValue(ref(database, 'flights'), (snap) => {
      setFlights(parseFirebaseSnapshot(snap));
      setLoading(false);
    });

    const unsubLogs = onValue(ref(database, 'flight_logs'), (snap) => {
      setRawLogs(parseFirebaseSnapshot(snap));
    });

    const unsubUsers = onValue(ref(database, 'users'), (snap) => {
      setUsers(parseFirebaseSnapshot(snap));
    });

    return () => {
      unsubFlights();
      unsubLogs();
      unsubUsers();
    };
  }, []);

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'FOUNDER';

  // Filter flights scheduled for TODAY ONLY
  const todayStr = new Date().toISOString().split('T')[0];
  const todaysFlights = flights.filter((f) => {
    const flightDateStr = new Date(f.datetime_utc).toISOString().split('T')[0];
    return flightDateStr === todayStr;
  });

  // Enrich logs with user details
  const enrichedLogs = rawLogs.map((log) => {
    const u = users.find((usr) => Number(usr.id) === Number(log.user_id));
    return {
      ...log,
      user_name: u?.preferred_name || log.user_name || 'Staff Member',
      roblox_username: u?.roblox_username || log.roblox_username || 'Unknown',
    };
  }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const myLogs = enrichedLogs.filter((l) => Number(l.user_id) === Number(user?.id));
  const pendingLogs = enrichedLogs.filter((l) => l.status === 'PENDING');

  const handleSubmitLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFlightId) return;

    setSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/flight-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flight_id: Number(selectedFlightId),
          role_flown: roleFlown,
          proof_notes: proofNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit log');

      setFeedback('Flight log submitted successfully! Sent to admins for approval.');
      setShowModal(false);
      setSelectedFlightId('');
      setProofNotes('');
    } catch (err: any) {
      setFeedback(`Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReviewAction = async (action: 'ACCEPT' | 'REJECT') => {
    if (!reviewLog) return;
    setReviewing(true);

    try {
      const res = await fetch('/api/flight-logs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          log_id: reviewLog.id,
          action,
          admin_notes: adminNotes,
        }),
      });

      if (res.ok) {
        setFeedback(`Flight log ${action === 'ACCEPT' ? 'ACCEPTED' : 'REJECTED'}.`);
        setReviewLog(null);
        setAdminNotes('');
      }
    } catch (err: any) {
      setFeedback(`Review Error: ${err.message}`);
    } finally {
      setReviewing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <FileText className="w-8 h-8 text-purple-600" />
            Flight Logs & Quota Verification
          </h1>
          <p className="text-slate-500 font-medium text-sm mt-0.5">
            Submit your flight logs for flights conducted today. Approved logs automatically add +1 to your weekly quota. Realtime WebSockets active.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold rounded-2xl shadow-lg shadow-purple-600/20 text-sm transition-all shrink-0"
        >
          <PlusCircle className="w-5 h-5" />
          Submit Flight Log
        </button>
      </div>

      {feedback && (
        <div className="p-4 bg-purple-50 border border-purple-200 rounded-2xl text-purple-900 text-sm font-semibold flex items-center justify-between shadow-sm">
          <span className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-600" />
            {feedback}
          </span>
          <button onClick={() => setFeedback(null)} className="text-purple-600 font-bold">✕</button>
        </div>
      )}

      {/* ADMIN REVIEW QUEUE */}
      {isAdmin && (
        <div className="bg-white rounded-3xl p-6 shadow-md border border-purple-100 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-purple-600" />
              <h3 className="text-lg font-bold text-slate-800">Admin Approvals Queue</h3>
              {pendingLogs.length > 0 && (
                <span className="px-2.5 py-0.5 bg-amber-500 text-white font-black text-xs rounded-full shadow-sm">
                  {pendingLogs.length} Pending
                </span>
              )}
            </div>
            <span className="text-xs font-semibold text-slate-400">Executive Verification Desk</span>
          </div>

          {pendingLogs.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">No pending flight logs awaiting review.</p>
          ) : (
            <div className="space-y-3">
              {pendingLogs.map((log) => (
                <div key={log.id} className="p-4 bg-purple-50/40 rounded-2xl border border-purple-100 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-slate-800 text-sm">{log.user_name} (@{log.roblox_username})</span>
                      <span className="px-2.5 py-0.5 bg-purple-100 text-purple-800 border border-purple-200 font-extrabold rounded-md">
                        {log.flight_code}
                      </span>
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-800 font-bold rounded">
                        Role: {log.role_flown}
                      </span>
                    </div>
                    <p className="text-slate-600">Submitted: {new Date(log.created_at).toLocaleString()}</p>
                    {log.proof_notes && (
                      <p className="p-2 bg-white rounded-xl border border-slate-200 text-slate-700 italic">
                        Proof / Notes: {log.proof_notes}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setReviewLog(log)}
                      className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold rounded-xl shadow-md text-xs"
                    >
                      Review Log
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MY SUBMITTED LOGS HISTORY */}
      <div className="bg-white rounded-3xl p-6 shadow-md border border-purple-100 space-y-4">
        <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3">My Submitted Flight Logs</h3>

        {loading ? (
          <p className="text-slate-400 text-xs text-center py-6">Loading flight logs...</p>
        ) : myLogs.length === 0 ? (
          <div className="text-center py-8 space-y-2 text-slate-400">
            <Plane className="w-10 h-10 mx-auto text-purple-200 opacity-60" />
            <p className="text-sm font-semibold text-slate-700">No flight logs submitted yet.</p>
            <p className="text-xs text-slate-400">Complete a flight today and click "Submit Flight Log" to add to your quota.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {myLogs.map((log) => (
              <div key={log.id} className="p-4 bg-purple-50/30 rounded-2xl border border-purple-100 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold px-2.5 py-0.5 bg-purple-100 text-purple-800 border border-purple-200 rounded-md">
                      {log.flight_code}
                    </span>
                    <span className="font-bold text-slate-800">Role: {log.role_flown}</span>
                  </div>
                  <span className={`px-3 py-1 font-extrabold rounded-full text-xs ${
                    log.status === 'ACCEPTED'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : log.status === 'REJECTED'
                      ? 'bg-rose-100 text-rose-800 border border-rose-200'
                      : 'bg-amber-100 text-amber-800 border border-amber-200'
                  }`}>
                    {log.status === 'ACCEPTED' ? '✓ ACCEPTED (+1 Quota)' : log.status === 'REJECTED' ? '✕ REJECTED' : '⏳ PENDING REVIEW'}
                  </span>
                </div>

                <p className="text-slate-500 font-medium">Submitted: {new Date(log.created_at).toLocaleString()}</p>
                {log.proof_notes && <p className="text-slate-700 bg-white p-2 rounded-xl border border-slate-200">Proof / Details: {log.proof_notes}</p>}

                {log.admin_notes && (
                  <div className="p-2.5 bg-purple-100/60 rounded-xl text-purple-900 border border-purple-200 italic font-medium">
                    Admin Note: {log.admin_notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SUBMIT FLIGHT LOG MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-purple-100 space-y-4 text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Submit Flight Log</h3>
                <p className="text-xs text-slate-500">Select a flight taking place today and enter your role flown.</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 font-bold text-lg">✕</button>
            </div>

            <form onSubmit={handleSubmitLog} className="space-y-4 text-xs font-medium">
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Select Today's Flight <span className="text-rose-500">*</span>
                </label>
                {todaysFlights.length === 0 ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 font-semibold text-xs">
                    No flights scheduled for today ({todayStr}). You can only submit flight logs on the day of the flight!
                  </div>
                ) : (
                  <select
                    required
                    value={selectedFlightId}
                    onChange={(e) => setSelectedFlightId(Number(e.target.value))}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                  >
                    <option value="">-- Choose flight scheduled today --</option>
                    {todaysFlights.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.flight_code} | {f.aircraft} (Host: {f.host_name}) - {new Date(f.datetime_utc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Role Flown <span className="text-rose-500">*</span>
                </label>
                <select
                  value={roleFlown}
                  onChange={(e) => setRoleFlown(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                >
                  <option value="Captain">Captain</option>
                  <option value="First Officer">First Officer</option>
                  <option value="Senior Flight Attendant">Senior Flight Attendant</option>
                  <option value="Cabin Crew">Cabin Crew</option>
                  <option value="Ground Handling Staff">Ground Handling Staff</option>
                  <option value="Security / Marshaller">Security / Marshaller</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Proof Link / Verification Notes</label>
                <textarea
                  rows={3}
                  value={proofNotes}
                  onChange={(e) => setProofNotes(e.target.value)}
                  placeholder="Paste Roblox screenshot link, Discord message link, or flight notes..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium"
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
                  disabled={submitting || todaysFlights.length === 0}
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold rounded-xl shadow-md disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Log'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADMIN REVIEW LOG MODAL */}
      {reviewLog && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-purple-100 space-y-4 text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-800">Review Flight Log</h3>
              <button onClick={() => setReviewLog(null)} className="text-slate-400 font-bold">✕</button>
            </div>

            <div className="space-y-2 text-xs bg-purple-50/50 p-3.5 rounded-2xl border border-purple-100">
              <div>Staff Member: <strong className="text-slate-800">{reviewLog.user_name} (@{reviewLog.roblox_username})</strong></div>
              <div>Flight: <strong className="text-purple-700">{reviewLog.flight_code}</strong></div>
              <div>Role Flown: <strong>{reviewLog.role_flown}</strong></div>
              {reviewLog.proof_notes && <div className="mt-1 pt-1 border-t border-purple-100 italic">Proof: {reviewLog.proof_notes}</div>}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Management Note (Optional)</label>
              <input
                type="text"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Reason for decision..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                disabled={reviewing}
                onClick={() => handleReviewAction('REJECT')}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-md"
              >
                Reject Log
              </button>

              <button
                type="button"
                disabled={reviewing}
                onClick={() => handleReviewAction('ACCEPT')}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md"
              >
                Accept Log (+1 Quota)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
