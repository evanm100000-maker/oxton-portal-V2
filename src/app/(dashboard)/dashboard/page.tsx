'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plane, Calendar, Megaphone, CheckCircle, Clock, ShieldAlert, ChevronRight, AlertOctagon } from 'lucide-react';
import { formatDateLocal } from '@/lib/utils';
import { database } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';
import { parseFirebaseSnapshot } from '@/lib/realtime-sync';

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [rawFlights, setRawFlights] = useState<any[]>([]);
  const [rawAllocations, setRawAllocations] = useState<any[]>([]);
  const [rawLogs, setRawLogs] = useState<any[]>([]);
  const [rawLoa, setRawLoa] = useState<any[]>([]);
  const [rawConsequences, setRawConsequences] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setUser(data.user);
      });

    // Real-Time Firebase WebSockets Listeners
    const unsubFlights = onValue(ref(database, 'flights'), (snap) => setRawFlights(parseFirebaseSnapshot(snap)));
    const unsubAlloc = onValue(ref(database, 'allocations'), (snap) => {
      const val = snap.val();
      setRawAllocations(val ? Object.values(val).filter(Boolean) : []);
    });
    const unsubLogs = onValue(ref(database, 'flight_logs'), (snap) => setRawLogs(parseFirebaseSnapshot(snap)));
    const unsubLoa = onValue(ref(database, 'loa_requests'), (snap) => setRawLoa(parseFirebaseSnapshot(snap)));
    const unsubCons = onValue(ref(database, 'consequences'), (snap) => setRawConsequences(parseFirebaseSnapshot(snap)));
    const unsubAnn = onValue(ref(database, 'announcements'), (snap) => {
      const list = parseFirebaseSnapshot(snap);
      list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setAnnouncements(list);
      setLoading(false);
    });

    return () => {
      unsubFlights();
      unsubAlloc();
      unsubLogs();
      unsubLoa();
      unsubCons();
      unsubAnn();
    };
  }, []);

  // Compute Next Flight in Realtime
  const upcomingFlights = rawFlights
    .filter((f) => f.status === 'UPCOMING')
    .sort((a, b) => new Date(a.datetime_utc).getTime() - new Date(b.datetime_utc).getTime());

  let nextFlight = upcomingFlights.length > 0 ? upcomingFlights[0] : null;
  if (nextFlight && user) {
    const myAlloc = rawAllocations.find((a) => Number(a.flight_id) === Number(nextFlight.id) && Number(a.user_id) === Number(user.id));
    nextFlight = {
      ...nextFlight,
      my_status: myAlloc ? myAlloc.status : 'UNALLOCATED',
    };
  }

  // Compute Real-Time Quota for Current User
  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  const distToMon = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const mon = new Date(now);
  mon.setUTCDate(now.getUTCDate() - distToMon);
  mon.setUTCHours(0, 0, 0, 0);
  const startOfWeekIso = mon.toISOString();

  let completedThisWeek = 0;
  if (user) {
    const userAllocations = rawAllocations.filter(
      (a: any) => Number(a.user_id) === Number(user.id) && (a.attended === 1 || ['PRESENT', 'LATE'].includes(a.attendance_status))
    );

    for (const alloc of userAllocations) {
      const flight = rawFlights.find((f: any) => Number(f.id) === Number(alloc.flight_id));
      if (flight && flight.datetime_utc >= startOfWeekIso) {
        completedThisWeek++;
      }
    }

    const userAcceptedLogs = rawLogs.filter(
      (l: any) => Number(l.user_id) === Number(user.id) && l.status === 'ACCEPTED' && l.created_at >= startOfWeekIso
    );
    completedThisWeek += userAcceptedLogs.length;
  }

  // Check LOA
  const todayStr = now.toISOString().split('T')[0];
  const activeLoa = user ? rawLoa.find(
    (r: any) => Number(r.user_id) === Number(user.id) && r.status === 'APPROVED' && r.start_date <= todayStr && r.end_date >= todayStr
  ) : null;

  let requiredQuota = 3;
  let statusBadge = 'ACTIVE';

  if (activeLoa) {
    if (activeLoa.type === 'LOA') {
      requiredQuota = 0;
      statusBadge = 'LOA';
    } else if (activeLoa.type === 'REDUCED_ACTIVITY') {
      requiredQuota = 0;
      statusBadge = 'REDUCED_ACTIVITY';
    }
  }

  const remaining = Math.max(0, requiredQuota - completedThisWeek);
  const percentage = requiredQuota > 0 ? Math.min(100, Math.round((completedThisWeek / requiredQuota) * 100)) : 100;

  // Active Sanctions / Detentions for current user
  const myUpcomingSanctions = user ? rawConsequences.filter(
    (c: any) => Number(c.user_id) === Number(user.id) && (c.status === 'ACTIVE' || !c.status) && ['C4A', 'C4B', 'C5A', 'C5B', 'SUSPENSION', 'DETENTION'].includes(c.tier || c.type)
  ) : [];

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Title & Greeting */}
      <div>
        <h1 className="text-3xl font-black text-slate-800 tracking-tight">Dashboard</h1>
        <p className="text-slate-500 font-medium text-sm mt-0.5">
          Welcome back, <span className="font-bold text-purple-700">{user?.preferred_name || user?.roblox_username}</span>. Realtime WebSockets active.
        </p>
      </div>

      {/* Upcoming Sanctions Alert Banner on Dashboard if any */}
      {myUpcomingSanctions.length > 0 && (
        <div className="p-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-3xl shadow-lg border border-amber-400 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <AlertOctagon className="w-8 h-8 shrink-0 text-amber-100 animate-pulse" />
            <div>
              <h4 className="font-black text-sm">Action Required: You Have Pending Sanctions / Detentions</h4>
              <p className="text-xs text-amber-100 mt-0.5">
                You have {myUpcomingSanctions.length} active sanction(s) to sit before the deadline. Please check your consequences page.
              </p>
            </div>
          </div>
          <Link
            href="/consequences"
            className="px-4 py-2 bg-white text-slate-900 font-extrabold text-xs rounded-xl hover:bg-slate-100 transition-all shadow-md shrink-0"
          >
            View Sanctions
          </Link>
        </div>
      )}

      {/* Top 2 Cards: Next Flight & Weekly Quota */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Next Flight Card */}
        <div className="bg-white rounded-3xl p-6 shadow-md border border-purple-100 flex flex-col justify-between">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-4">
            <div className="p-2.5 bg-purple-50 text-purple-700 rounded-xl border border-purple-100">
              <Plane className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-800 text-lg">Next Flight</h3>
          </div>

          {nextFlight ? (
            <div className="space-y-3 my-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold px-3 py-1 bg-purple-100 text-purple-800 border border-purple-200 rounded-full">
                  {nextFlight.flight_code}
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  {formatDateLocal(nextFlight.datetime_utc)}
                </span>
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-base">{nextFlight.aircraft}</h4>
                <p className="text-xs text-slate-500">Host: <span className="font-semibold text-slate-700">{nextFlight.host_name}</span></p>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                  nextFlight.my_status === 'ATTENDING'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : nextFlight.my_status === 'UNSURE'
                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}>
                  Status: {nextFlight.my_status || 'Unallocated'}
                </span>
                <Link
                  href="/allocations"
                  className="text-xs font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1"
                >
                  Manage RSVP <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="text-center py-10 text-slate-400">
              <Plane className="w-10 h-10 mx-auto text-purple-200 mb-2 opacity-50" />
              <p className="text-sm font-medium">No upcoming flight is assigned.</p>
            </div>
          )}
        </div>

        {/* Weekly Quota Card */}
        <div className="bg-white rounded-3xl p-6 shadow-md border border-purple-100 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 text-blue-700 rounded-xl border border-blue-100">
                  <Clock className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-800 text-lg">Weekly Quota</h3>
              </div>
              <span className={`px-3 py-1 text-xs font-extrabold rounded-full ${
                statusBadge === 'LOA'
                  ? 'bg-purple-100 text-purple-800 border border-purple-200'
                  : statusBadge === 'REDUCED_ACTIVITY'
                  ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                  : remaining === 0
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : 'bg-amber-100 text-amber-800 border border-amber-200'
              }`}>
                {statusBadge === 'LOA'
                  ? 'LOA Active'
                  : statusBadge === 'REDUCED_ACTIVITY'
                  ? 'Reduced Activity'
                  : `${remaining} remaining`}
              </span>
            </div>

            <div className="my-4">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-slate-800">{completedThisWeek}</span>
                <span className="text-xl font-bold text-slate-400">/ {requiredQuota}</span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1">qualifying flights & accepted logs this week</p>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden mt-4 border border-slate-200">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  statusBadge !== 'ACTIVE'
                    ? 'bg-purple-600'
                    : percentage >= 100
                    ? 'bg-emerald-500'
                    : 'bg-blue-600'
                }`}
                style={{ width: `${percentage}%` }}
              ></div>
            </div>
          </div>

          <div className="text-xs text-slate-400 pt-4 flex items-center justify-between">
            <span>Roster cycle: Mon - Sun</span>
            <div className="flex items-center gap-3">
              <Link href="/flight-logs" className="text-blue-700 font-bold hover:underline">
                Submit Flight Log
              </Link>
              <Link href="/loa" className="text-purple-700 font-semibold hover:underline">
                Request LOA
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Announcements Panel */}
      <div className="bg-white rounded-3xl p-6 shadow-md border border-purple-100">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-6">
          <div className="p-2.5 bg-purple-50 text-purple-700 rounded-xl border border-purple-100">
            <Megaphone className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-800 text-lg">Announcements</h3>
        </div>

        <div className="space-y-6">
          {announcements.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No announcements posted yet.</p>
          ) : (
            announcements.map((ann) => (
              <div key={ann.id} className="p-5 bg-purple-50/40 rounded-2xl border border-purple-100 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 text-base">{ann.title}</h4>
                  <span className="text-xs font-semibold text-slate-400">
                    {new Date(ann.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="text-xs text-slate-500 font-medium">
                  Posted by <span className="font-bold text-purple-800">{ann.author_name || 'Executive Staff'}</span>
                </div>
                <p className="text-sm text-slate-700 whitespace-pre-line pt-2 leading-relaxed">
                  {ann.content}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
