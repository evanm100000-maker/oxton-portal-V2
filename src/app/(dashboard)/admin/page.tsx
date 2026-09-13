'use client';

import React, { useEffect, useState } from 'react';
import { 
  ShieldCheck, 
  UserCheck, 
  CalendarDays, 
  Clock, 
  AlertTriangle, 
  LifeBuoy, 
  Flag, 
  Megaphone, 
  Users, 
  PlusCircle, 
  CheckCircle2, 
  XCircle, 
  Crown,
  Sparkles,
  ClipboardCheck,
  Wrench,
  Power,
  Trash2,
  FileText,
  AlertOctagon,
  HelpCircle,
  ShieldAlert
} from 'lucide-react';
import { database } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';
import { parseFirebaseSnapshot, deduplicateConsequences } from '@/lib/realtime-sync';

const TIER_OPTIONS = [
  { value: 'C1', label: 'C1 - Warning' },
  { value: 'C2', label: 'C2 - Warning' },
  { value: 'C3', label: 'C3 - Informal Sanction' },
  { value: 'C4A', label: 'C4A - 20 Minute Detention' },
  { value: 'C4B', label: 'C4B - 30 Minute Detention' },
  { value: 'C5A', label: 'C5A - 2 Day Suspension' },
  { value: 'C5B', label: 'C5B - Indefinite Suspension' },
];

export default function AdminPanelPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<
    'STAFF_ADMINS' | 'SIGNUPS' | 'FLIGHTS' | 'FLIGHT_LOGS' | 'DETENTIONS' | 'CONSEQUENCES' | 'LOA' | 'MAINTENANCE_ALERTS' | 'ANNOUNCEMENTS' | 'REPORTS' | 'TICKETS'
  >('STAFF_ADMINS');

  const [users, setUsers] = useState<any[]>([]);
  const [flights, setFlights] = useState<any[]>([]);
  const [flightLogs, setFlightLogs] = useState<any[]>([]);
  const [detentions, setDetentions] = useState<any[]>([]);
  const [loaRequests, setLoaRequests] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [consequences, setConsequences] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Maintenance & System Alert State
  const [maintEnabled, setMaintEnabled] = useState(false);
  const [maintMessage, setMaintMessage] = useState('Luma Airways portal is currently under scheduled maintenance.');
  const [alertTitle, setAlertTitle] = useState('V8.10 SERVICE ISSUE');
  const [alertMessage, setAlertMessage] = useState('Some staff members may experience latency. We are investigating.');
  const [alertSeverity, setAlertSeverity] = useState<'WARNING' | 'SEVERE' | 'RESOLVED'>('WARNING');
  const [currentAlert, setCurrentAlert] = useState<any>(null);

  // Form states
  const [flightCode, setFlightCode] = useState('');
  const [hostName, setHostName] = useState('');
  const [aircraft, setAircraft] = useState('');
  const [flightDateTime, setFlightDateTime] = useState('');

  // Register Modal State
  const [selectedFlight, setSelectedFlight] = useState<any>(null);
  const [attendanceMap, setAttendanceMap] = useState<Record<number, 'PRESENT' | 'LATE' | 'ABSENT'>>({});

  // Consequence state
  const [consUserId, setConsUserId] = useState<number | ''>('');
  const [consTier, setConsTier] = useState<string>('C1');
  const [consReason, setConsReason] = useState('');
  const [consNotes, setConsNotes] = useState('');
  const [consDeadline, setConsDeadline] = useState('');
  const [consDays, setConsDays] = useState('2');
  const [isSubmittingCons, setIsSubmittingCons] = useState(false);

  // Detention session creation state
  const [detentionDate, setDetentionDate] = useState(new Date().toISOString().split('T')[0]);
  const [detentionNotes, setDetentionNotes] = useState('');
  const [detentionRegisterMap, setDetentionRegisterMap] = useState<Record<number, 'PASSED' | 'FAILED'>>({});
  const [detentionSubmitting, setDetentionSubmitting] = useState(false);

  // Flight Log Review Modal State
  const [reviewingLog, setReviewingLog] = useState<any>(null);
  const [reviewAdminNotes, setReviewAdminNotes] = useState('');

  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');

  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/auth/me?t=${Date.now()}`, { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setCurrentUser(data.user);
      });

    // Attach direct Firebase WebSockets listeners for instant real-time sync across all devices
    const unsubUsers = onValue(ref(database, 'users'), (snap) => setUsers(parseFirebaseSnapshot(snap)));
    const unsubFlights = onValue(ref(database, 'flights'), (snap) => setFlights(parseFirebaseSnapshot(snap)));
    const unsubLogs = onValue(ref(database, 'flight_logs'), (snap) => setFlightLogs(parseFirebaseSnapshot(snap)));
    const unsubDetentions = onValue(ref(database, 'detentions'), (snap) => setDetentions(parseFirebaseSnapshot(snap)));
    const unsubLoa = onValue(ref(database, 'loa_requests'), (snap) => setLoaRequests(parseFirebaseSnapshot(snap)));
    const unsubTickets = onValue(ref(database, 'tickets'), (snap) => setTickets(parseFirebaseSnapshot(snap)));
    const unsubReports = onValue(ref(database, 'reports'), (snap) => setReports(parseFirebaseSnapshot(snap)));
    const unsubCons = onValue(ref(database, 'consequences'), (snap) => setConsequences(deduplicateConsequences(parseFirebaseSnapshot(snap))));
    const unsubAnn = onValue(ref(database, 'announcements'), (snap) => setAnnouncements(parseFirebaseSnapshot(snap)));

    const unsubSettings = onValue(ref(database, 'settings'), (snap) => {
      const val = snap.val();
      if (val) {
        setMaintEnabled(val.maintenance_mode === '1');
        if (val.maintenance_message) setMaintMessage(val.maintenance_message);
      }
    });

    const unsubAlerts = onValue(ref(database, 'alerts'), (snap) => {
      const val = snap.val();
      if (val) {
        const list = Object.values(val).filter(Boolean) as any[];
        const active = list.filter((a) => a.is_active === 1).sort((a, b) => b.id - a.id);
        setCurrentAlert(active.length > 0 ? active[0] : null);
      } else {
        setCurrentAlert(null);
      }
    });

    setLoading(false);

    return () => {
      unsubUsers();
      unsubFlights();
      unsubLogs();
      unsubDetentions();
      unsubLoa();
      unsubTickets();
      unsubReports();
      unsubCons();
      unsubAnn();
      unsubSettings();
      unsubAlerts();
    };
  }, []);

  const handleApproveSignup = async (userId: number, status: 'ACTIVE' | 'DECLINED') => {
    const res = await fetch('/api/admin/users', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approval', target_user_id: userId, status }),
    });
    if (res.ok) {
      setFeedback(`Signup request ${status === 'ACTIVE' ? 'Accepted' : 'Declined'}.`);
    }
  };

  const handleUpdateRole = async (userId: number, role: 'ADMIN' | 'STAFF') => {
    const res = await fetch('/api/admin/users', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_role', target_user_id: userId, role }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(`Error: ${data.error}`);
    } else {
      setFeedback(`User role updated to ${role}.`);
    }
  };

  const handleRemoveConsequence = async (consId: number) => {
    if (!confirm('Are you sure you want to remove/revoke this consequence?')) return;
    const res = await fetch('/api/consequences', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: consId }),
    });
    if (res.ok) {
      setFeedback('Consequence removed.');
    }
  };

  const handleCreateFlight = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/flights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        flight_code: flightCode,
        host_name: hostName,
        aircraft,
        datetime_utc: new Date(flightDateTime).toISOString(),
      }),
    });
    if (res.ok) {
      setFeedback('Flight created successfully!');
      setFlightCode('');
      setHostName('');
      setAircraft('');
      setFlightDateTime('');
    }
  };

  const handleDeleteFlight = async (flightId: number) => {
    if (!confirm('Are you sure you want to permanently delete this flight?')) return;
    const res = await fetch('/api/flights', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: flightId }),
    });
    if (res.ok) {
      setFeedback('Flight permanently deleted.');
    }
  };

  const handleDeleteAnnouncement = async (annId: number) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;
    const res = await fetch('/api/announcements', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: annId }),
    });
    if (res.ok) {
      setFeedback('Announcement deleted.');
    }
  };

  // Open Flight Attendance Register Modal (ONLY staff members who marked ATTENDING appear)
  const openRegisterModal = (flight: any) => {
    setSelectedFlight(flight);
    const initialMap: Record<number, 'PRESENT' | 'LATE' | 'ABSENT'> = {};

    const registerStaff = activeStaff.filter((s) => {
      const existingAlloc = flight.allocations?.find((a: any) => Number(a.user_id) === Number(s.id));
      return existingAlloc && (existingAlloc.status === 'ATTENDING' || (existingAlloc.attendance_status && existingAlloc.attendance_status !== 'NONE'));
    });

    registerStaff.forEach((s) => {
      const existingAlloc = flight.allocations?.find((a: any) => Number(a.user_id) === Number(s.id));
      if (existingAlloc && existingAlloc.attendance_status && existingAlloc.attendance_status !== 'NONE') {
        initialMap[s.id] = existingAlloc.attendance_status;
      } else {
        initialMap[s.id] = 'PRESENT';
      }
    });

    setAttendanceMap(initialMap);
  };

  const handleCompleteRegister = async () => {
    if (!selectedFlight) return;
    const res = await fetch('/api/admin/register-flight', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        flight_id: selectedFlight.id,
        attendance_map: attendanceMap,
      }),
    });
    if (res.ok) {
      setFeedback(`Flight attendance register saved for ${selectedFlight.flight_code}!`);
      setSelectedFlight(null);
    }
  };

  const handleLoaAction = async (id: number, status: 'APPROVED' | 'DECLINED') => {
    const res = await fetch('/api/loa', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    if (res.ok) {
      setFeedback(`LOA request ${status.toLowerCase()}.`);
    }
  };

  // Issue Consequence Handler
  const handleIssueConsequence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consUserId || isSubmittingCons) return;

    setIsSubmittingCons(true);
    try {
      let expiresAt: string | null = null;
      if (consTier === 'C5A' && consDays) {
        const days = parseInt(consDays);
        const exp = new Date();
        exp.setDate(exp.getDate() + days);
        expiresAt = exp.toISOString();
      }

      let deadlineIso: string | null = null;
      if ((consTier === 'C4A' || consTier === 'C4B') && consDeadline) {
        deadlineIso = new Date(consDeadline).toISOString();
      }

      const res = await fetch('/api/consequences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: consUserId,
          tier: consTier,
          reason: consReason,
          notes: consNotes,
          timeframe_deadline: deadlineIso,
          expires_at: expiresAt,
        }),
      });

      if (res.ok) {
        setFeedback(`Disciplinary consequence (${consTier}) successfully issued!`);
        setConsReason('');
        setConsNotes('');
        setConsUserId('');
        setConsDeadline('');
      } else {
        const data = await res.json();
        alert(`Failed to issue consequence: ${data.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      alert(`Error issuing consequence: ${err.message}`);
    } finally {
      setIsSubmittingCons(false);
    }
  };

  // Detention Register Submit Handler
  const handleCompleteDetentionRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setDetentionSubmitting(true);

    const pendingC4s = consequences.filter(
      (c) => (c.tier === 'C4A' || c.tier === 'C4B' || c.type === 'C4A' || c.type === 'C4B') && (c.status === 'ACTIVE' || !c.status)
    );

    const entries = pendingC4s.map((c) => ({
      user_id: c.user_id,
      consequence_id: c.id,
      status: detentionRegisterMap[c.id] || 'PASSED',
    }));

    try {
      const res = await fetch('/api/detentions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_date: detentionDate,
          notes: detentionNotes,
          entries,
        }),
      });

      if (res.ok) {
        setFeedback('Daily detention session register submitted! Passed detentions cleared, failed C4As escalated to C4B.');
        setDetentionNotes('');
      }
    } catch (err: any) {
      alert(`Detention submit error: ${err.message}`);
    } finally {
      setDetentionSubmitting(false);
    }
  };

  // Review Flight Log (Accept / Reject)
  const handleReviewFlightLog = async (action: 'ACCEPT' | 'REJECT') => {
    if (!reviewingLog) return;

    const res = await fetch('/api/flight-logs', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        log_id: reviewingLog.id,
        action,
        admin_notes: reviewAdminNotes,
      }),
    });

    if (res.ok) {
      setFeedback(`Flight log ${action === 'ACCEPT' ? 'ACCEPTED (+1 Quota)' : 'REJECTED'}.`);
      setReviewingLog(null);
      setReviewAdminNotes('');
    }
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/announcements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: annTitle, content: annContent }),
    });
    if (res.ok) {
      setFeedback('Announcement published to main dashboard!');
      setAnnTitle('');
      setAnnContent('');
    }
  };

  const handleToggleMaintenance = async () => {
    const nextState = !maintEnabled;
    const res = await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'toggle_maintenance',
        enabled: nextState,
        message: maintMessage,
      }),
    });
    if (res.ok) {
      setFeedback(`Website Maintenance Mode turned ${nextState ? 'ON (Locked)' : 'OFF (Open)'}.`);
    }
  };

  const handleCreateSystemAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create_alert',
        title: alertTitle,
        message: alertMessage,
        severity: alertSeverity,
      }),
    });
    if (res.ok) {
      setFeedback(`System Warning Banner published (${alertSeverity})!`);
    }
  };

  const handleResolveAlert = async () => {
    const res = await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'resolve_alert',
        alert_id: currentAlert?.id,
      }),
    });
    if (res.ok) {
      setFeedback('System Warning Banner resolved/cleared.');
    }
  };

  const pendingSignups = users.filter((u) => u.status === 'PENDING');
  const activeStaff = users.filter((u) => u.status === 'ACTIVE');
  const pendingLogs = flightLogs.filter((l) => l.status === 'PENDING');
  const pendingC4s = consequences.filter(
    (c) => (c.tier === 'C4A' || c.tier === 'C4B' || c.type === 'C4A' || c.type === 'C4B') && (c.status === 'ACTIVE' || !c.status)
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Banner */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 rounded-3xl p-6 shadow-xl text-white relative overflow-hidden">
        <div className="absolute right-4 top-2 opacity-10">
          <ShieldCheck className="w-48 h-48" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 text-white">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight">Executive Admin Portal</h1>
                <p className="text-purple-100 text-xs font-medium mt-0.5">
                  Full control center: Staff management, flight logs, detention registers, C1-C5B consequences, LOAs, maintenance, and alerts. Realtime WebSockets active.
                </p>
              </div>
            </div>
          </div>
          {currentUser?.role === 'FOUNDER' && (
            <div className="px-4 py-2 bg-white/15 backdrop-blur-md border border-white/20 rounded-2xl flex items-center gap-2 text-xs font-extrabold text-white shadow-md">
              <Crown className="w-4 h-4 text-amber-300" />
              Founder Control Active
            </div>
          )}
        </div>
      </div>

      {feedback && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-sm font-semibold flex items-center justify-between shadow-sm">
          <span className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            {feedback}
          </span>
          <button onClick={() => setFeedback(null)} className="text-emerald-600 font-bold">✕</button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-purple-100 bg-white p-2 rounded-2xl shadow-md overflow-x-auto text-xs font-bold">
        <button
          onClick={() => setActiveTab('STAFF_ADMINS')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'STAFF_ADMINS' ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md' : 'text-slate-600 hover:bg-purple-50'
          }`}
        >
          <Users className="w-4 h-4" />
          Staff & Admins ({activeStaff.length})
        </button>

        <button
          onClick={() => setActiveTab('FLIGHT_LOGS')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'FLIGHT_LOGS' ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md' : 'text-slate-600 hover:bg-purple-50'
          }`}
        >
          <FileText className="w-4 h-4" />
          Flight Logs ({pendingLogs.length} Pending)
        </button>

        <button
          onClick={() => setActiveTab('DETENTIONS')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'DETENTIONS' ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md' : 'text-slate-600 hover:bg-purple-50'
          }`}
        >
          <Clock className="w-4 h-4" />
          Detention Register ({pendingC4s.length} C4s)
        </button>

        <button
          onClick={() => setActiveTab('CONSEQUENCES')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'CONSEQUENCES' ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md' : 'text-slate-600 hover:bg-purple-50'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          Issue Consequence ({consequences.length})
        </button>

        <button
          onClick={() => setActiveTab('SIGNUPS')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'SIGNUPS' ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md' : 'text-slate-600 hover:bg-purple-50'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          Pending Signups
          {pendingSignups.length > 0 && (
            <span className="px-2 py-0.5 bg-amber-500 text-white text-[10px] font-black rounded-full">
              {pendingSignups.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('FLIGHTS')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'FLIGHTS' ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md' : 'text-slate-600 hover:bg-purple-50'
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          Flights & Registers ({flights.length})
        </button>

        <button
          onClick={() => setActiveTab('LOA')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'LOA' ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md' : 'text-slate-600 hover:bg-purple-50'
          }`}
        >
          <Clock className="w-4 h-4" />
          LOA Applications ({loaRequests.length})
        </button>

        <button
          onClick={() => setActiveTab('MAINTENANCE_ALERTS')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'MAINTENANCE_ALERTS' ? 'bg-gradient-to-r from-rose-600 to-purple-600 text-white shadow-md' : 'text-slate-600 hover:bg-purple-50'
          }`}
        >
          <Wrench className="w-4 h-4" />
          Maintenance & Alerts
        </button>

        <button
          onClick={() => setActiveTab('ANNOUNCEMENTS')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'ANNOUNCEMENTS' ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md' : 'text-slate-600 hover:bg-purple-50'
          }`}
        >
          <Megaphone className="w-4 h-4" />
          Announcements
        </button>

        <button
          onClick={() => setActiveTab('REPORTS')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'REPORTS' ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md' : 'text-slate-600 hover:bg-purple-50'
          }`}
        >
          <Flag className="w-4 h-4" />
          Reports
        </button>
      </div>

      {/* TAB 1: STAFF DIRECTORY & ROLES */}
      {activeTab === 'STAFF_ADMINS' && (
        <div className="bg-white rounded-3xl p-6 shadow-md border border-purple-100 space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" /> Staff Directory & Consequences Overview
              </h3>
              <p className="text-xs text-slate-500">
                Manage roles and view disciplinary records logged directly on staff profiles.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {activeStaff.map((u) => {
              const userCons = consequences.filter((c) => Number(c.user_id) === Number(u.id));
              return (
                <div key={u.id} className="p-5 bg-purple-50/40 rounded-3xl border border-purple-100 space-y-3 text-xs">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-tr from-blue-600 to-purple-600 text-white font-bold rounded-2xl flex items-center justify-center text-base shadow-md">
                        {u.preferred_name.charAt(0)}
                      </div>

                      <div className="space-y-0.5">
                        <div className="font-extrabold text-slate-800 text-sm flex items-center gap-2 flex-wrap">
                          <span>{u.preferred_name}</span>
                          <span className={`px-2 py-0.5 rounded font-extrabold text-[10px] uppercase tracking-wider ${
                            u.role === 'FOUNDER'
                              ? 'bg-purple-200 text-purple-900 border border-purple-300'
                              : u.role === 'ADMIN'
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}>
                            {u.role}
                          </span>
                        </div>
                        <div className="text-slate-500 font-medium">Roblox: @{u.roblox_username} | Discord: {u.discord_username}</div>
                      </div>
                    </div>

                    {u.role !== 'FOUNDER' && (
                      <div className="flex items-center gap-2">
                        {u.role === 'ADMIN' ? (
                          <button
                            onClick={() => handleUpdateRole(u.id, 'STAFF')}
                            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-md text-xs"
                          >
                            Remove from Admin Team
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUpdateRole(u.id, 'ADMIN')}
                            className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl shadow-md text-xs"
                          >
                            Promote to Admin Team
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="border-t border-purple-100/80 pt-3">
                    <div className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                      Logged Consequences ({userCons.length})
                    </div>

                    {userCons.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic">No disciplinary consequences on record for this staff member.</p>
                    ) : (
                      <div className="space-y-2">
                        {userCons.map((c) => (
                          <div key={c.id} className="p-3 bg-white rounded-2xl border border-purple-100 flex items-center justify-between gap-3">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 bg-purple-100 text-purple-800 font-extrabold text-[10px] rounded border border-purple-200">
                                  {c.tier || c.type}
                                </span>
                                <span className="font-bold text-slate-800 text-xs">{c.reason}</span>
                              </div>
                              <p className="text-slate-500 text-[11px]">Issued: {new Date(c.created_at).toLocaleDateString()} | Status: {c.status || 'ACTIVE'}</p>
                            </div>

                            <button
                              onClick={() => handleRemoveConsequence(c.id)}
                              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-[11px] flex items-center gap-1 shadow-sm"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: FLIGHT LOGS APPROVAL */}
      {activeTab === 'FLIGHT_LOGS' && (
        <div className="bg-white rounded-3xl p-6 shadow-md border border-purple-100 space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-600" /> Flight Log Approval Queue ({flightLogs.length})
              </h3>
              <p className="text-xs text-slate-500">
                Staff members submit flight logs for flights conducted on that day. Accepting a log adds +1 to their weekly quota.
              </p>
            </div>
          </div>

          {flightLogs.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">No flight logs submitted yet.</p>
          ) : (
            <div className="space-y-3">
              {flightLogs.map((log) => (
                <div key={log.id} className="p-4 bg-purple-50/40 rounded-2xl border border-purple-100 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-slate-800 text-sm">{log.user_name} (@{log.roblox_username})</span>
                      <span className="px-2.5 py-0.5 bg-purple-100 text-purple-800 font-extrabold rounded">
                        {log.flight_code}
                      </span>
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-800 font-bold rounded">
                        Role: {log.role_flown}
                      </span>
                      <span className={`px-2 py-0.5 font-bold rounded text-[10px] ${
                        log.status === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-800' : log.status === 'REJECTED' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {log.status}
                      </span>
                    </div>
                    <p className="text-slate-600">Submitted: {new Date(log.created_at).toLocaleString()}</p>
                    {log.proof_notes && <p className="text-slate-700 bg-white p-2 rounded-xl border border-slate-200">Proof: {log.proof_notes}</p>}
                  </div>

                  {log.status === 'PENDING' ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setReviewingLog(log)}
                        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold rounded-xl shadow-md"
                      >
                        Review Log
                      </button>
                    </div>
                  ) : (
                    <span className="text-slate-400 font-semibold italic">Reviewed</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: DETENTION LOG & REGISTER */}
      {activeTab === 'DETENTIONS' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 shadow-md border border-purple-100 space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-purple-600" /> Daily Detention Session & Register Log
                </h3>
                <p className="text-xs text-slate-500">
                  Admins can run a detention register for users with active C4s. Marking **PASS** clears the C4 from upcoming sanctions. Marking **FAIL** automatically escalates C4A to C4B (30 min detention).
                </p>
              </div>
            </div>

            <form onSubmit={handleCompleteDetentionRegister} className="space-y-4 text-xs font-medium">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Detention Session Date</label>
                  <input
                    type="date"
                    required
                    value={detentionDate}
                    onChange={(e) => setDetentionDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Session Notes (Optional)</label>
                  <input
                    type="text"
                    value={detentionNotes}
                    onChange={(e) => setDetentionNotes(e.target.value)}
                    placeholder="e.g. Conducted by Capt. Alex"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 text-sm mb-2">Staff Members with Active C4 Detentions ({pendingC4s.length})</h4>
                {pendingC4s.length === 0 ? (
                  <p className="text-slate-400 italic py-4">No staff members currently have pending C4 detentions.</p>
                ) : (
                  <div className="space-y-2">
                    {pendingC4s.map((c) => {
                      const u = activeStaff.find((usr) => Number(usr.id) === Number(c.user_id));
                      const currentRes = detentionRegisterMap[c.id] || 'PASSED';
                      return (
                        <div key={c.id} className="p-3.5 bg-purple-50/50 rounded-2xl border border-purple-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <div className="font-bold text-slate-800 text-xs">
                              {u?.preferred_name || 'Staff'} (@{u?.roblox_username || 'Staff'})
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="px-2 py-0.5 bg-purple-100 text-purple-800 font-black rounded text-[10px]">
                                {c.tier || c.type}
                              </span>
                              <span className="text-slate-600 text-[11px]">{c.reason}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setDetentionRegisterMap({ ...detentionRegisterMap, [c.id]: 'PASSED' })}
                              className={`px-4 py-2 rounded-xl font-bold text-xs transition-all ${
                                currentRes === 'PASSED' ? 'bg-emerald-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200'
                              }`}
                            >
                              ✓ PASS (Clear C4)
                            </button>

                            <button
                              type="button"
                              onClick={() => setDetentionRegisterMap({ ...detentionRegisterMap, [c.id]: 'FAILED' })}
                              className={`px-4 py-2 rounded-xl font-bold text-xs transition-all ${
                                currentRes === 'FAILED' ? 'bg-rose-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200'
                              }`}
                            >
                              ✕ FAIL (Escalate C4A to C4B)
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {pendingC4s.length > 0 && (
                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={detentionSubmitting}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold rounded-xl shadow-md disabled:opacity-50"
                  >
                    {detentionSubmitting ? 'Saving...' : 'Submit Detention Register'}
                  </button>
                </div>
              )}
            </form>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-md border border-purple-100 space-y-4">
            <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3">Historical Detention Sessions ({detentions.length})</h3>
            {detentions.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No detention sessions recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {detentions.map((s) => (
                  <div key={s.id} className="p-4 bg-purple-50/40 rounded-2xl border border-purple-100 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-slate-800">Session Date: {s.session_date}</span>
                      <span className="text-slate-500">Conducted by: {s.created_by_name || 'Admin'}</span>
                    </div>
                    {s.notes && <p className="text-slate-600">Notes: {s.notes}</p>}
                    <div className="pt-2 flex flex-wrap gap-2">
                      {s.entries?.map((e: any, idx: number) => (
                        <span key={idx} className={`px-2.5 py-1 rounded-md font-bold text-[10px] ${
                          e.status === 'PASSED' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          User #{e.user_id}: {e.status}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: ISSUE CONSEQUENCES */}
      {activeTab === 'CONSEQUENCES' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 shadow-md border border-purple-100 space-y-4">
            <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3">Issue Disciplinary Consequence (Reworked System)</h3>
            <form onSubmit={handleIssueConsequence} className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-medium">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Target Staff Member</label>
                <select
                  required
                  value={consUserId}
                  onChange={(e) => setConsUserId(Number(e.target.value))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800"
                >
                  <option value="">Select staff member...</option>
                  {activeStaff.map((s) => (
                    <option key={s.id} value={s.id}>{s.preferred_name} (@{s.roblox_username})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Consequence Tier</label>
                <select
                  value={consTier}
                  onChange={(e) => setConsTier(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                >
                  {TIER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {(consTier === 'C4A' || consTier === 'C4B') ? (
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Detention Sitting Timeframe / Deadline</label>
                  <input
                    type="datetime-local"
                    required
                    value={consDeadline}
                    onChange={(e) => setConsDeadline(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800"
                  />
                </div>
              ) : consTier === 'C5A' ? (
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Suspension Duration (Days)</label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={consDays}
                    onChange={(e) => setConsDays(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Sanction Scope</label>
                  <div className="p-2.5 bg-slate-100 rounded-xl font-semibold text-slate-600">Standard Disciplinary Log</div>
                </div>
              )}

              <div className="md:col-span-3">
                <label className="block text-slate-700 font-bold mb-1">Reason for Consequence</label>
                <input
                  type="text"
                  required
                  value={consReason}
                  onChange={(e) => setConsReason(e.target.value)}
                  placeholder="e.g. Unprofessional demeanor / Missed weekly quota"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-slate-700 font-bold mb-1">Additional Internal Notes (Optional)</label>
                <textarea
                  rows={2}
                  value={consNotes}
                  onChange={(e) => setConsNotes(e.target.value)}
                  placeholder="Internal administrative details..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                ></textarea>
              </div>

              <div className="md:col-span-3 flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmittingCons}
                  className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-md"
                >
                  {isSubmittingCons ? 'Issuing Consequence...' : 'Issue Disciplinary Consequence'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 5: SIGNUPS */}
      {activeTab === 'SIGNUPS' && (
        <div className="bg-white rounded-3xl p-6 shadow-md border border-purple-100 space-y-4">
          <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3">Pending Registration Requests</h3>
          {pendingSignups.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">No pending signup requests at this time.</p>
          ) : (
            <div className="space-y-3">
              {pendingSignups.map((u) => (
                <div key={u.id} className="p-4 bg-purple-50/40 rounded-2xl border border-purple-100 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                  <div className="space-y-1">
                    <div className="font-extrabold text-slate-800 text-sm">{u.preferred_name}</div>
                    <div className="text-slate-600">Roblox: <strong className="text-purple-700">@{u.roblox_username}</strong> | Discord: <strong className="text-purple-700">{u.discord_username}</strong></div>
                    <div className="text-slate-500">Email: {u.email}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleApproveSignup(u.id, 'ACTIVE')}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Accept
                    </button>
                    <button
                      onClick={() => handleApproveSignup(u.id, 'DECLINED')}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-md flex items-center gap-1"
                    >
                      <XCircle className="w-4 h-4" /> Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 6: FLIGHT SCHEDULES & REGISTERS */}
      {activeTab === 'FLIGHTS' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 shadow-md border border-purple-100 space-y-4">
            <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-purple-600" /> Create New Flight Schedule
            </h3>
            <form onSubmit={handleCreateFlight} className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-medium">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Flight Code</label>
                <input
                  type="text"
                  required
                  value={flightCode}
                  onChange={(e) => setFlightCode(e.target.value)}
                  placeholder="e.g. LM-204"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Flight Host</label>
                <input
                  type="text"
                  required
                  value={hostName}
                  onChange={(e) => setHostName(e.target.value)}
                  placeholder="e.g. Capt. Alex"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Aircraft</label>
                <input
                  type="text"
                  required
                  value={aircraft}
                  onChange={(e) => setAircraft(e.target.value)}
                  placeholder="e.g. Boeing 787-9"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Date & Local Time</label>
                <input
                  type="datetime-local"
                  required
                  value={flightDateTime}
                  onChange={(e) => setFlightDateTime(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                />
              </div>

              <div className="md:col-span-4 flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold rounded-xl shadow-md"
                >
                  Schedule Flight
                </button>
              </div>
            </form>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-md border border-purple-100 space-y-4">
            <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3">Scheduled Flights ({flights.length})</h3>
            {flights.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No scheduled flights found.</p>
            ) : (
              <div className="space-y-3">
                {flights.map((f) => (
                  <div key={f.id} className="p-4 bg-purple-50/40 rounded-2xl border border-purple-100 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold px-2.5 py-0.5 bg-purple-100 text-purple-800 rounded-full border border-purple-200">{f.flight_code}</span>
                        <span className="font-bold text-slate-800">{f.aircraft}</span>
                        <span className="text-slate-500">({f.status})</span>
                      </div>
                      <p className="text-slate-600 mt-1">Host: {f.host_name} | Date: {new Date(f.datetime_utc).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openRegisterModal(f)}
                        className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-md flex items-center gap-1.5"
                      >
                        <ClipboardCheck className="w-4 h-4" /> Attendance Register
                      </button>
                      <button
                        onClick={() => handleDeleteFlight(f.id)}
                        className="p-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-md"
                        title="Delete Flight Permanently"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* REGISTER MODAL FOR FLIGHT */}
      {selectedFlight && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-xl w-full shadow-2xl border border-purple-100 space-y-4 text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Attendance Register: {selectedFlight.flight_code}</h3>
                <p className="text-xs text-slate-500">Only staff members who marked "ATTENDING" (coming) on this flight appear in the register.</p>
              </div>
              <button onClick={() => setSelectedFlight(null)} className="text-slate-400 font-bold text-lg">✕</button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {(() => {
                const attendingStaff = activeStaff.filter((s) => {
                  const existingAlloc = selectedFlight?.allocations?.find((a: any) => Number(a.user_id) === Number(s.id));
                  return existingAlloc && (existingAlloc.status === 'ATTENDING' || (existingAlloc.attendance_status && existingAlloc.attendance_status !== 'NONE'));
                });

                if (attendingStaff.length === 0) {
                  return (
                    <div className="p-8 text-center text-slate-400 space-y-1">
                      <p className="font-bold text-slate-700 text-sm">No Staff Members Marked Attending</p>
                      <p className="text-xs">Only staff members who mark "ATTENDING" (coming) on this flight are populated into the register.</p>
                    </div>
                  );
                }

                return attendingStaff.map((u) => {
                  const currentStatus = attendanceMap[u.id] || 'PRESENT';
                  return (
                    <div key={u.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-purple-50/40 rounded-xl border border-purple-100 gap-2">
                      <div>
                        <div className="font-bold text-slate-800 text-xs">{u.preferred_name} (@{u.roblox_username})</div>
                        <div className="text-slate-500 text-[10px]">{u.role}</div>
                      </div>

                      <div className="flex items-center gap-1 text-xs">
                        <button
                          type="button"
                          onClick={() => setAttendanceMap({ ...attendanceMap, [u.id]: 'PRESENT' })}
                          className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all ${
                            currentStatus === 'PRESENT'
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'bg-white text-slate-600 hover:bg-emerald-50 border border-slate-200'
                          }`}
                        >
                          Present
                        </button>

                        <button
                          type="button"
                          onClick={() => setAttendanceMap({ ...attendanceMap, [u.id]: 'LATE' })}
                          className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all ${
                            currentStatus === 'LATE'
                              ? 'bg-amber-500 text-white shadow-sm'
                              : 'bg-white text-slate-600 hover:bg-amber-50 border border-slate-200'
                          }`}
                        >
                          Late
                        </button>

                        <button
                          type="button"
                          onClick={() => setAttendanceMap({ ...attendanceMap, [u.id]: 'ABSENT' })}
                          className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all ${
                            currentStatus === 'ABSENT'
                              ? 'bg-rose-600 text-white shadow-sm'
                              : 'bg-white text-slate-600 hover:bg-rose-50 border border-slate-200'
                          }`}
                        >
                          Absent
                        </button>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
              <button onClick={() => setSelectedFlight(null)} className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs">
                Cancel
              </button>
              <button
                onClick={handleCompleteRegister}
                className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold rounded-xl text-xs shadow-md"
              >
                Save Attendance Register
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REVIEW FLIGHT LOG MODAL */}
      {reviewingLog && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-purple-100 space-y-4 text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-800">Review Flight Log</h3>
              <button onClick={() => setReviewingLog(null)} className="text-slate-400 font-bold">✕</button>
            </div>

            <div className="space-y-2 text-xs bg-purple-50/50 p-3.5 rounded-2xl border border-purple-100">
              <div>Staff Member: <strong className="text-slate-800">{reviewingLog.user_name} (@{reviewingLog.roblox_username})</strong></div>
              <div>Flight: <strong className="text-purple-700">{reviewingLog.flight_code}</strong></div>
              <div>Role Flown: <strong>{reviewingLog.role_flown}</strong></div>
              {reviewingLog.proof_notes && <div className="mt-1 pt-1 border-t border-purple-100 italic">Proof: {reviewingLog.proof_notes}</div>}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Management Note (Optional)</label>
              <input
                type="text"
                value={reviewAdminNotes}
                onChange={(e) => setReviewAdminNotes(e.target.value)}
                placeholder="Reason for approval / rejection..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => handleReviewFlightLog('REJECT')}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-md"
              >
                Reject Log
              </button>

              <button
                type="button"
                onClick={() => handleReviewFlightLog('ACCEPT')}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md"
              >
                Accept Log (+1 Quota)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: LOA REQUESTS */}
      {activeTab === 'LOA' && (
        <div className="bg-white rounded-3xl p-6 shadow-md border border-purple-100 space-y-4">
          <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3">LOA & Reduced Activity Applications</h3>
          <div className="space-y-3">
            {loaRequests.map((r) => (
              <div key={r.id} className="p-4 bg-purple-50/40 rounded-2xl border border-purple-100 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800">{r.preferred_name || 'Staff Member'} (@{r.roblox_username || 'Staff'})</span>
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-800 border border-purple-200 font-extrabold rounded">{r.type}</span>
                    <span className="text-slate-500 font-medium">{r.start_date} to {r.end_date}</span>
                  </div>
                  <p className="text-slate-700">Reason: {r.reason}</p>
                </div>
                {r.status === 'PENDING' ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleLoaAction(r.id, 'APPROVED')}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleLoaAction(r.id, 'DECLINED')}
                      className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-md"
                    >
                      Decline
                    </button>
                  </div>
                ) : (
                  <span className={`px-3 py-1 font-bold rounded-full text-xs ${
                    r.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {r.status}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 8: MAINTENANCE MODE & FORTNITE WARNING BANNERS */}
      {activeTab === 'MAINTENANCE_ALERTS' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 shadow-md border border-purple-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-purple-600" /> Website Maintenance Mode
                </h3>
                <p className="text-xs text-slate-500">Lock non-admin staff out of the website during maintenance windows.</p>
              </div>

              <button
                onClick={handleToggleMaintenance}
                className={`px-5 py-2.5 font-bold rounded-xl text-xs flex items-center gap-2 shadow-md transition-all ${
                  maintEnabled ? 'bg-rose-600 hover:bg-rose-700 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                <Power className="w-4 h-4" />
                {maintEnabled ? 'Turn Maintenance OFF' : 'Turn Maintenance ON'}
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Maintenance Message Displayed to Staff</label>
              <input
                type="text"
                value={maintMessage}
                onChange={(e) => setMaintMessage(e.target.value)}
                placeholder="Write maintenance reason..."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium"
              />
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-md border border-purple-100 space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500" /> System Warning Banner (Fortnite Style)
                </h3>
                <p className="text-xs text-slate-500">Publish active warning banners across the top of the portal for all users.</p>
              </div>

              {currentAlert && currentAlert.is_active === 1 && (
                <button
                  onClick={handleResolveAlert}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md"
                >
                  Mark Alert Resolved
                </button>
              )}
            </div>

            <form onSubmit={handleCreateSystemAlert} className="space-y-4 text-xs font-medium">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Alert Severity</label>
                  <select
                    value={alertSeverity}
                    onChange={(e: any) => setAlertSeverity(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                  >
                    <option value="WARNING">Warning (Yellow Banner)</option>
                    <option value="SEVERE">Severe Warning (Red Banner)</option>
                    <option value="RESOLVED">Resolved (Green Banner)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Banner Header Title</label>
                  <input
                    type="text"
                    required
                    value={alertTitle}
                    onChange={(e) => setAlertTitle(e.target.value)}
                    placeholder="e.g. V8.10 PING ISSUE"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 uppercase"
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="block text-slate-700 font-bold mb-1">Warning Message Description</label>
                  <textarea
                    required
                    rows={2}
                    value={alertMessage}
                    onChange={(e) => setAlertMessage(e.target.value)}
                    placeholder="Some players may experience higher ping. We are investigating..."
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                  ></textarea>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold rounded-xl shadow-md"
                >
                  Publish Warning Banner
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 9: ANNOUNCEMENTS */}
      {activeTab === 'ANNOUNCEMENTS' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 shadow-md border border-purple-100 space-y-4">
            <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3">Post Portal Announcement</h3>
            <form onSubmit={handleCreateAnnouncement} className="space-y-4 text-xs font-medium">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Announcement Title</label>
                <input
                  type="text"
                  required
                  value={annTitle}
                  onChange={(e) => setAnnTitle(e.target.value)}
                  placeholder="Title..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-bold mb-1">Content</label>
                <textarea
                  required
                  rows={4}
                  value={annContent}
                  onChange={(e) => setAnnContent(e.target.value)}
                  placeholder="Write your announcement..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                ></textarea>
              </div>
              <div className="flex justify-end">
                <button type="submit" className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold rounded-xl shadow-md">
                  Publish Announcement
                </button>
              </div>
            </form>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-md border border-purple-100 space-y-4">
            <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3">Existing Announcements ({announcements.length})</h3>
            {announcements.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No announcements posted yet.</p>
            ) : (
              <div className="space-y-3">
                {announcements.map((a) => (
                  <div key={a.id} className="p-4 bg-purple-50/40 rounded-2xl border border-purple-100 flex items-center justify-between text-xs">
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">{a.title}</h4>
                      <p className="text-slate-600 mt-1 truncate max-w-xl">{a.content}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteAnnouncement(a.id)}
                      className="p-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-md"
                      title="Delete Announcement"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 10: REPORTS */}
      {activeTab === 'REPORTS' && (
        <div className="bg-white rounded-3xl p-6 shadow-md border border-purple-100 space-y-4">
          <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3">User & Bug Reports Desk</h3>
          <div className="space-y-3">
            {reports.map((r) => (
              <div key={r.id} className="p-4 bg-purple-50/40 rounded-2xl border border-purple-100 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 bg-purple-100 text-purple-800 font-extrabold rounded">
                      {r.type} REPORT
                    </span>
                    <span className="text-slate-500">Reporter: {r.reporter_name || 'Staff'}</span>
                    {r.target_username && (
                      <span className="font-bold text-rose-800 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
                        Target: @{r.target_username}
                      </span>
                    )}
                  </div>
                </div>

                <h4 className="font-bold text-slate-800 text-sm">{r.subject}</h4>
                <p className="text-slate-700">{r.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
