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
  ChevronRight,
  Send,
  UserX,
  Bug,
  HelpCircle,
  Sparkles,
  ClipboardCheck,
  Wrench,
  AlertOctagon,
  Power
} from 'lucide-react';

export default function AdminPanelPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'SIGNUPS' | 'FLIGHTS' | 'LOA' | 'ROSTER' | 'CONSEQUENCES' | 'TICKETS' | 'REPORTS' | 'ANNOUNCEMENTS' | 'STAFF_ADMINS' | 'MAINTENANCE_ALERTS'>('SIGNUPS');

  const [users, setUsers] = useState<any[]>([]);
  const [flights, setFlights] = useState<any[]>([]);
  const [loaRequests, setLoaRequests] = useState<any[]>([]);
  const [roster, setRoster] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
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
  const [consType, setConsType] = useState<'INFORMAL_SANCTION' | 'INFRACTION' | 'SUSPENSION'>('INFORMAL_SANCTION');
  const [consReason, setConsReason] = useState('');
  const [consNotes, setConsNotes] = useState('');
  const [consDays, setConsDays] = useState('7');

  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');

  const [activeTicket, setActiveTicket] = useState<any>(null);
  const [adminTicketReply, setAdminTicketReply] = useState('');

  const [feedback, setFeedback] = useState<string | null>(null);

  const fetchAllAdminData = async () => {
    try {
      const meRes = await fetch('/api/auth/me');
      const meData = await meRes.json();
      if (meData.user) setCurrentUser(meData.user);

      const usersRes = await fetch('/api/admin/users');
      const usersData = await usersRes.json();
      if (usersData.users) setUsers(usersData.users);

      const flightsRes = await fetch('/api/flights');
      const flightsData = await flightsRes.json();
      if (flightsData.flights) setFlights(flightsData.flights);

      const loaRes = await fetch('/api/loa');
      const loaData = await loaRes.json();
      if (loaData.requests) setLoaRequests(loaData.requests);

      const rosterRes = await fetch('/api/admin/roster-infraction');
      const rosterData = await rosterRes.json();
      if (rosterData.roster) setRoster(rosterData.roster);

      const ticketsRes = await fetch('/api/tickets');
      const ticketsData = await ticketsRes.json();
      if (ticketsData.tickets) setTickets(ticketsData.tickets);

      const reportsRes = await fetch('/api/reports');
      const reportsData = await reportsRes.json();
      if (reportsData.reports) setReports(reportsData.reports);

      const annRes = await fetch('/api/announcements');
      const annData = await annRes.json();
      if (annData.announcements) setAnnouncements(annData.announcements);

      const alertsRes = await fetch('/api/system-alerts');
      const alertsData = await alertsRes.json();
      if (alertsData) {
        setMaintEnabled(alertsData.maintenance_mode);
        if (alertsData.maintenance_message) setMaintMessage(alertsData.maintenance_message);
        if (alertsData.alert) setCurrentAlert(alertsData.alert);
      }
    } catch (err) {
      console.error('Admin data fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllAdminData();
    // Live Auto Refresh Polling every 3 seconds for real-time admin sync
    const interval = setInterval(fetchAllAdminData, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleApproveSignup = async (userId: number, status: 'ACTIVE' | 'DECLINED') => {
    // Optimistic UI Removal
    setUsers((prev) => prev.filter((u) => u.id !== userId));

    const res = await fetch('/api/admin/users', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approval', target_user_id: userId, status }),
    });
    if (res.ok) {
      setFeedback(`Signup request ${status === 'ACTIVE' ? 'Accepted' : 'Declined'}.`);
      fetchAllAdminData();
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
      fetchAllAdminData();
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
      fetchAllAdminData();
    }
  };

  const openRegisterModal = (flight: any) => {
    setSelectedFlight(flight);
    const initialMap: Record<number, 'PRESENT' | 'LATE' | 'ABSENT'> = {};
    activeStaff.forEach((s) => {
      const existingAlloc = flight.allocations?.find((a: any) => Number(a.user_id) === Number(s.id));
      if (existingAlloc && existingAlloc.attendance_status && existingAlloc.attendance_status !== 'NONE') {
        initialMap[s.id] = existingAlloc.attendance_status;
      } else if (existingAlloc && existingAlloc.status === 'ATTENDING') {
        initialMap[s.id] = 'PRESENT';
      } else {
        initialMap[s.id] = 'ABSENT';
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
      fetchAllAdminData();
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
      fetchAllAdminData();
    }
  };

  const handleIssueRosterInfraction = async (targetUserId: number) => {
    const res = await fetch('/api/admin/roster-infraction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_user_id: targetUserId }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(`Error: ${data.error}`);
    } else {
      setFeedback('Infraction issued for missed weekly quota!');
      fetchAllAdminData();
    }
  };

  const handleIssueConsequence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consUserId) return;

    let expiresAt: string | null = null;
    if (consType === 'SUSPENSION' && consDays) {
      const days = parseInt(consDays);
      const exp = new Date();
      exp.setDate(exp.getDate() + days);
      expiresAt = exp.toISOString();
    }

    const res = await fetch('/api/consequences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: consUserId,
        type: consType,
        reason: consReason,
        notes: consNotes,
        expires_at: expiresAt,
      }),
    });
    if (res.ok) {
      setFeedback('Consequence successfully issued.');
      setConsReason('');
      setConsNotes('');
      setConsUserId('');
      fetchAllAdminData();
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
      fetchAllAdminData();
    }
  };

  const handleToggleMaintenance = async () => {
    const nextState = !maintEnabled;
    setMaintEnabled(nextState); // Immediate state update

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
      fetchAllAdminData();
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
      fetchAllAdminData();
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
      fetchAllAdminData();
    }
  };

  const pendingSignups = users.filter((u) => u.status === 'PENDING');
  const activeStaff = users.filter((u) => u.status === 'ACTIVE');
  const nonCompliantRoster = roster.filter((item) => !item.isCompliant && item.quota.statusBadge === 'ACTIVE');

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
                  High-Rank operations, signups, flight registers, LOAs, staff management, and real-time alerts.
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

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-purple-100 bg-white p-2 rounded-2xl shadow-md overflow-x-auto text-xs font-bold">
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
          onClick={() => setActiveTab('STAFF_ADMINS')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'STAFF_ADMINS' ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md' : 'text-slate-600 hover:bg-purple-50'
          }`}
        >
          <Users className="w-4 h-4" />
          Staff Directory & Admins
        </button>

        <button
          onClick={() => setActiveTab('FLIGHTS')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'FLIGHTS' ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md' : 'text-slate-600 hover:bg-purple-50'
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          Flight Registers
        </button>

        <button
          onClick={() => setActiveTab('LOA')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'LOA' ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md' : 'text-slate-600 hover:bg-purple-50'
          }`}
        >
          <Clock className="w-4 h-4" />
          LOA Applications
        </button>

        <button
          onClick={() => setActiveTab('ROSTER')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'ROSTER' ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md' : 'text-slate-600 hover:bg-purple-50'
          }`}
        >
          <Users className="w-4 h-4" />
          Quota Deficit ({nonCompliantRoster.length})
        </button>

        <button
          onClick={() => setActiveTab('CONSEQUENCES')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'CONSEQUENCES' ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md' : 'text-slate-600 hover:bg-purple-50'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          Consequences
        </button>

        <button
          onClick={() => setActiveTab('MAINTENANCE_ALERTS')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'MAINTENANCE_ALERTS' ? 'bg-gradient-to-r from-rose-600 to-purple-600 text-white shadow-md' : 'text-slate-600 hover:bg-purple-50'
          }`}
        >
          <Wrench className="w-4 h-4" />
          Maintenance & Warning Banners
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

        <button
          onClick={() => setActiveTab('TICKETS')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'TICKETS' ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md' : 'text-slate-600 hover:bg-purple-50'
          }`}
        >
          <LifeBuoy className="w-4 h-4" />
          Support Tickets
        </button>
      </div>

      {/* TAB 1: PENDING SIGNUPS */}
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

      {/* TAB 2: ALL STAFF & ADMIN MANAGEMENT */}
      {activeTab === 'STAFF_ADMINS' && (
        <div className="bg-white rounded-3xl p-6 shadow-md border border-purple-100 space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" /> Staff Directory & Admin Management
              </h3>
              <p className="text-xs text-slate-500">Manage staff account roles. Admins and Founder can promote or demote admin team members.</p>
            </div>
          </div>

          <div className="space-y-3">
            {activeStaff.map((u) => (
              <div key={u.id} className="p-4 bg-purple-50/40 rounded-2xl border border-purple-100 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                <div className="space-y-0.5">
                  <div className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                    {u.preferred_name} (@{u.roblox_username})
                    <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                      u.role === 'FOUNDER' ? 'bg-purple-200 text-purple-900' : u.role === 'ADMIN' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {u.role}
                    </span>
                  </div>
                  <div className="text-slate-500">Email: {u.email} | Discord: {u.discord_username}</div>
                </div>

                {u.role !== 'FOUNDER' && (
                  <div>
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
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: FLIGHT SCHEDULES & REGISTER */}
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
            <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3">Scheduled Flights & Registers</h3>
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
                  <button
                    onClick={() => openRegisterModal(f)}
                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-md flex items-center gap-1.5"
                  >
                    <ClipboardCheck className="w-4 h-4" /> Attendance Register
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* REGISTER MODAL */}
      {selectedFlight && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-xl w-full shadow-2xl border border-purple-100 space-y-4 text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Attendance Register: {selectedFlight.flight_code}</h3>
                <p className="text-xs text-slate-500">Select Present, Late, or Absent for each active staff member.</p>
              </div>
              <button onClick={() => setSelectedFlight(null)} className="text-slate-400 font-bold text-lg">✕</button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {activeStaff.map((u) => {
                const currentStatus = attendanceMap[u.id] || 'ABSENT';
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
              })}
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

      {/* TAB 4: LOA REQUESTS */}
      {activeTab === 'LOA' && (
        <div className="bg-white rounded-3xl p-6 shadow-md border border-purple-100 space-y-4">
          <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3">LOA & Reduced Activity Applications</h3>
          <div className="space-y-3">
            {loaRequests.map((r) => (
              <div key={r.id} className="p-4 bg-purple-50/40 rounded-2xl border border-purple-100 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800">{r.preferred_name} (@{r.roblox_username})</span>
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

      {/* TAB 5: QUOTA NON-COMPLIANCE ONLY */}
      {activeTab === 'ROSTER' && (
        <div className="bg-white rounded-3xl p-6 shadow-md border border-purple-100 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-lg font-bold text-slate-800">Weekly Quota Deficit List (BST)</h3>
            <p className="text-xs text-slate-500">
              Only displays active staff who have <strong>NOT</strong> completed their 3-flight quota by Sunday midnight BST. Compliant and LOA staff are automatically filtered out.
            </p>
          </div>

          {nonCompliantRoster.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 mb-2 opacity-60" />
              <p className="text-sm font-semibold text-slate-800">100% Quota Compliance</p>
              <p className="text-xs text-slate-500 mt-1">All active staff have completed their required weekly quota!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {nonCompliantRoster.map((item) => {
                const u = item.user;
                const q = item.quota;
                return (
                  <div key={u.id} className="p-4 bg-rose-50/50 rounded-2xl border border-rose-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 text-sm">{u.preferred_name}</span>
                        <span className="text-slate-500">(@{u.roblox_username})</span>
                        <span className="px-2 py-0.5 bg-rose-100 text-rose-800 font-extrabold rounded text-[10px]">
                          NON-COMPLIANT
                        </span>
                      </div>
                      <p className="text-slate-600">
                        Flights Completed: <strong className="text-rose-700">{q.completedThisWeek} / {q.requiredQuota}</strong>
                      </p>
                    </div>

                    <div>
                      <button
                        onClick={() => handleIssueRosterInfraction(u.id)}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-md text-xs"
                      >
                        Issue Quota Infraction
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 6: CONSEQUENCES & SUSPENSION DURATION */}
      {activeTab === 'CONSEQUENCES' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 shadow-md border border-purple-100 space-y-4">
            <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3">Issue Disciplinary Consequence</h3>
            <form onSubmit={handleIssueConsequence} className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-medium">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Target Staff Member</label>
                <select
                  required
                  value={consUserId}
                  onChange={(e) => setConsUserId(Number(e.target.value))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                >
                  <option value="">Select staff member...</option>
                  {activeStaff.map((s) => (
                    <option key={s.id} value={s.id}>{s.preferred_name} (@{s.roblox_username})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Consequence Type</label>
                <select
                  value={consType}
                  onChange={(e: any) => setConsType(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                >
                  <option value="INFORMAL_SANCTION">Informal Sanction</option>
                  <option value="INFRACTION">Formal Infraction</option>
                  <option value="SUSPENSION">Staff Suspension</option>
                </select>
              </div>

              {consType === 'SUSPENSION' ? (
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Suspension Duration (Days)</label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={consDays}
                    onChange={(e) => setConsDays(e.target.value)}
                    placeholder="e.g. 7"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Reason</label>
                  <input
                    type="text"
                    required
                    value={consReason}
                    onChange={(e) => setConsReason(e.target.value)}
                    placeholder="e.g. Unprofessional demeanor / Missed quota"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  />
                </div>
              )}

              {consType === 'SUSPENSION' && (
                <div className="md:col-span-3">
                  <label className="block text-slate-700 font-bold mb-1">Suspension Reason</label>
                  <input
                    type="text"
                    required
                    value={consReason}
                    onChange={(e) => setConsReason(e.target.value)}
                    placeholder="e.g. Repeated quota non-compliance"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  />
                </div>
              )}

              <div className="md:col-span-3">
                <label className="block text-slate-700 font-bold mb-1">Additional Notes (Optional)</label>
                <textarea
                  rows={2}
                  value={consNotes}
                  onChange={(e) => setConsNotes(e.target.value)}
                  placeholder="Internal administrative notes..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                ></textarea>
              </div>

              <div className="md:col-span-3 flex justify-end">
                <button type="submit" className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-md">
                  Issue Disciplinary
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 7: MAINTENANCE MODE & FORTNITE WARNING BANNERS */}
      {activeTab === 'MAINTENANCE_ALERTS' && (
        <div className="space-y-6">
          {/* Maintenance Lockout Manager */}
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

          {/* Fortnite Style Warning Banner Publisher */}
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
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
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
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold uppercase"
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

      {/* TAB 8: REPORTS */}
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
                    <span className="text-slate-500">Reporter: {r.reporter_name}</span>
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
