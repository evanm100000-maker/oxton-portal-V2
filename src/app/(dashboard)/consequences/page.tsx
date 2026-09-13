'use client';

import React, { useEffect, useState } from 'react';
import { Shield, CheckCircle, AlertTriangle, Clock, Calendar, CheckCircle2, AlertOctagon } from 'lucide-react';
import { database } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';
import { parseFirebaseSnapshot, deduplicateConsequences } from '@/lib/realtime-sync';

const TIER_DESCRIPTIONS: Record<string, { label: string; badgeClass: string }> = {
  C1: { label: 'C1 - Warning', badgeClass: 'bg-amber-100 text-amber-800 border-amber-200' },
  C2: { label: 'C2 - Warning', badgeClass: 'bg-amber-100 text-amber-800 border-amber-200' },
  C3: { label: 'C3 - Informal Sanction', badgeClass: 'bg-orange-100 text-orange-800 border-orange-200' },
  C4A: { label: 'C4A - 20 Minute Detention', badgeClass: 'bg-purple-100 text-purple-800 border-purple-200' },
  C4B: { label: 'C4B - 30 Minute Detention', badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  C5A: { label: 'C5A - 2 Day Suspension', badgeClass: 'bg-rose-100 text-rose-800 border-rose-200' },
  C5B: { label: 'C5B - Indefinite Suspension', badgeClass: 'bg-red-200 text-red-950 border-red-300' },
};

export default function ConsequencesPage() {
  const [consequences, setConsequences] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/auth/me?t=${Date.now()}`, { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setCurrentUser(data.user);
      });

    // 1. Direct Firebase WebSocket listener for Users
    const unsubUsers = onValue(ref(database, 'users'), (snapshot) => {
      setUsers(parseFirebaseSnapshot(snapshot));
    });

    // 2. Direct Firebase WebSocket listener for Consequences
    const unsubCons = onValue(ref(database, 'consequences'), (snapshot) => {
      const parsed = parseFirebaseSnapshot(snapshot);
      setConsequences(deduplicateConsequences(parsed));
      setLoading(false);
    });

    return () => {
      unsubUsers();
      unsubCons();
    };
  }, []);

  const myConsequences = consequences
    .filter((c) => Number(c.user_id) === Number(currentUser?.id))
    .map((c) => {
      const issuer = users.find((usr) => Number(usr.id) === Number(c.issuer_id));
      const tier = c.tier || (c.type === 'SUSPENSION' ? 'C5A' : c.type === 'INFRACTION' ? 'C3' : 'C1');
      return {
        ...c,
        tier,
        tierInfo: TIER_DESCRIPTIONS[tier] || { label: tier, badgeClass: 'bg-slate-100 text-slate-700' },
        issuer_name: issuer?.preferred_name || 'Executive Admin',
      };
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Upcoming Active Sanctions (Active C4 Detentions & C5 Suspensions)
  const upcomingSanctions = myConsequences.filter(
    (c) => (c.status === 'ACTIVE' || !c.status) && ['C4A', 'C4B', 'C5A', 'C5B', 'SUSPENSION', 'DETENTION'].includes(c.tier || c.type)
  );

  const totalActions = myConsequences.length;
  const warningsCount = myConsequences.filter((c) => ['C1', 'C2', 'WARNING'].includes(c.tier || c.type)).length;
  const informalSanctionsCount = myConsequences.filter((c) => ['C3', 'INFORMAL_SANCTION', 'INFRACTION'].includes(c.tier || c.type)).length;
  const detentionsCount = myConsequences.filter((c) => ['C4A', 'C4B', 'DETENTION'].includes(c.tier || c.type)).length;
  const suspensionsCount = myConsequences.filter((c) => ['C5A', 'C5B', 'SUSPENSION'].includes(c.tier || c.type)).length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2.5 text-slate-800">
          <Shield className="w-6 h-6 text-purple-700" />
          <h1 className="text-2xl font-extrabold tracking-tight">My Disciplinary Record & Profile Log</h1>
        </div>
        <p className="text-slate-500 text-xs mt-1 font-medium">
          Reworked consequence system (C1-C2 Warnings, C3 Informal Sanctions, C4A/C4B Detentions, C5A/C5B Suspensions). Realtime WebSocket sync active.
        </p>
      </div>

      {/* 5 Summary Stat Cards across top */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white rounded-2xl p-4 shadow-md border border-purple-100 text-center flex flex-col items-center justify-center">
          <span className="text-2xl font-black text-slate-800">{totalActions}</span>
          <span className="text-[11px] font-bold text-slate-500 mt-0.5">Total Actions</span>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-md border border-purple-100 text-center flex flex-col items-center justify-center">
          <span className="text-2xl font-black text-amber-500">{warningsCount}</span>
          <span className="text-[11px] font-bold text-slate-500 mt-0.5">C1-C2 Warnings</span>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-md border border-purple-100 text-center flex flex-col items-center justify-center">
          <span className="text-2xl font-black text-orange-600">{informalSanctionsCount}</span>
          <span className="text-[11px] font-bold text-slate-500 mt-0.5">C3 Sanctions</span>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-md border border-purple-100 text-center flex flex-col items-center justify-center">
          <span className="text-2xl font-black text-purple-600">{detentionsCount}</span>
          <span className="text-[11px] font-bold text-slate-500 mt-0.5">C4 Detentions</span>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-md border border-purple-100 text-center flex flex-col items-center justify-center">
          <span className="text-2xl font-black text-rose-700">{suspensionsCount}</span>
          <span className="text-[11px] font-bold text-slate-500 mt-0.5">C5 Suspensions</span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-3xl p-6 shadow-md border border-purple-100 space-y-6">
        {loading ? (
          <p className="text-slate-400 text-xs text-center py-8">Loading disciplinary records...</p>
        ) : myConsequences.length === 0 ? (
          <div className="text-center py-10 space-y-3">
            <div className="w-14 h-14 bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center mx-auto text-emerald-600">
              <CheckCircle className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Clean Disciplinary Record</h3>
              <p className="text-xs text-slate-500 mt-1 font-medium">You have no active or historical disciplinary consequences on file.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 1. Profile Disciplinary History Log */}
            <div>
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3 mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4 text-purple-600" />
                Profile Disciplinary Action Log ({myConsequences.length})
              </h3>
              <div className="space-y-3">
                {myConsequences.map((c) => (
                  <div key={c.id} className="p-4 bg-purple-50/30 rounded-2xl border border-purple-100 space-y-2 text-xs">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 font-black rounded-full border text-xs ${c.tierInfo.badgeClass}`}>
                          {c.tierInfo.label}
                        </span>
                        <span className={`px-2.5 py-0.5 font-bold rounded-md text-[10px] uppercase ${
                          c.status === 'SERVED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}>
                          Status: {c.status || 'ACTIVE'}
                        </span>
                      </div>
                      <span className="text-slate-400 font-semibold">
                        Issued: {new Date(c.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">{c.reason}</h4>
                      <p className="text-slate-500 mt-0.5">Issued by Admin: <strong className="text-slate-700">{c.issuer_name}</strong></p>
                    </div>

                    {c.timeframe_deadline && (
                      <p className="text-purple-800 font-bold bg-purple-100/70 p-2 rounded-xl border border-purple-200">
                        Sanction Sitting Deadline: {new Date(c.timeframe_deadline).toLocaleString()}
                      </p>
                    )}

                    {c.notes && (
                      <p className="p-2.5 bg-white rounded-xl border border-slate-200 text-slate-600 italic">
                        Notes: {c.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Upcoming Sanctions Panel (Below Consequences) */}
            <div className="border-t border-purple-100 pt-6">
              <div className="flex items-center gap-2 mb-3">
                <AlertOctagon className="w-5 h-5 text-amber-500" />
                <h3 className="text-sm font-bold text-slate-800">Upcoming Active Sanctions & Detentions</h3>
              </div>

              {upcomingSanctions.length === 0 ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  No upcoming sanctions or pending detentions to sit!
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingSanctions.map((c) => (
                    <div key={c.id} className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl space-y-2 text-xs">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className={`px-3 py-1 font-black rounded-full border text-xs ${c.tierInfo.badgeClass}`}>
                          {c.tierInfo.label} (Upcoming)
                        </span>
                        {c.timeframe_deadline ? (
                          <span className="px-3 py-1 bg-amber-500 text-white font-bold rounded-xl flex items-center gap-1 shadow-sm">
                            <Clock className="w-3.5 h-3.5" /> Sit Deadline: {new Date(c.timeframe_deadline).toLocaleString()}
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-amber-200 text-amber-900 font-bold rounded-xl">
                            Deadline: Pending Admin Schedule
                          </span>
                        )}
                      </div>

                      <div>
                        <h4 className="font-bold text-slate-800 text-sm">{c.reason}</h4>
                        <p className="text-slate-600 mt-1">
                          You must request Executive Management to sit this detention before the deadline. If missed or failed, a C4A automatically escalates to a C4B.
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
