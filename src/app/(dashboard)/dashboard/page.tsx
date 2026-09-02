'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plane, Calendar, Megaphone, CheckCircle, Clock, ShieldAlert, ChevronRight } from 'lucide-react';
import { formatDateLocal } from '@/lib/utils';

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [nextFlight, setNextFlight] = useState<any>(null);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setUser(data.user);
      });

    fetch('/api/flights')
      .then((res) => res.json())
      .then((data) => {
        if (data.flights && data.flights.length > 0) {
          const upcoming = data.flights.filter((f: any) => f.status === 'UPCOMING');
          if (upcoming.length > 0) {
            setNextFlight(upcoming[upcoming.length - 1]);
          }
        }
      });

    fetch('/api/announcements')
      .then((res) => res.json())
      .then((data) => {
        if (data.announcements) setAnnouncements(data.announcements);
        setLoading(false);
      });
  }, []);

  const quota = user?.quota || { requiredQuota: 3, completedThisWeek: 0, remaining: 3, statusBadge: 'ACTIVE' };
  const percentage = quota.requiredQuota > 0 ? Math.min(100, Math.round((quota.completedThisWeek / quota.requiredQuota) * 100)) : 100;

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Title & Greeting */}
      <div>
        <h1 className="text-3xl font-black text-slate-800 tracking-tight">Dashboard</h1>
        <p className="text-slate-500 font-medium text-sm mt-0.5">
          Welcome back, <span className="font-bold text-purple-700">{user?.preferred_name || user?.roblox_username}</span>.
        </p>
      </div>

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
                  Status: {nextFlight.my_status}
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
                quota.statusBadge === 'LOA'
                  ? 'bg-purple-100 text-purple-800 border border-purple-200'
                  : quota.statusBadge === 'REDUCED_ACTIVITY'
                  ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                  : quota.remaining === 0
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : 'bg-amber-100 text-amber-800 border border-amber-200'
              }`}>
                {quota.statusBadge === 'LOA'
                  ? 'LOA Active'
                  : quota.statusBadge === 'REDUCED_ACTIVITY'
                  ? 'Reduced Activity'
                  : `${quota.remaining} remaining`}
              </span>
            </div>

            <div className="my-4">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-slate-800">{quota.completedThisWeek}</span>
                <span className="text-xl font-bold text-slate-400">/ {quota.requiredQuota}</span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1">qualifying flights this week</p>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden mt-4 border border-slate-200">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  quota.statusBadge !== 'ACTIVE'
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
            <Link href="/loa" className="text-purple-700 font-semibold hover:underline">
              Request LOA
            </Link>
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
                  Posted by <span className="font-bold text-purple-800">{ann.author_name} ({ann.author_role})</span>
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
